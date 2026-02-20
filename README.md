# HoBom API Gateway

HoBom 마이크로서비스 생태계의 단일 진입점(Single Entry Point)입니다.
클라이언트 요청을 적절한 백엔드 서비스로 라우팅하고, 인증/인가, 분산 트레이싱, 에러 포워딩 등 공통 횡단 관심사(cross-cutting concerns)를 처리합니다.

---

## 목차

- [아키텍처 개요](#아키텍처-개요)
- [기술 스택](#기술-스택)
- [요청 흐름](#요청-흐름)
- [프로젝트 구조](#프로젝트-구조)
- [환경 변수](#환경-변수)
- [서비스 라우팅](#서비스-라우팅)
- [인증](#인증)
- [Rate Limiting](#rate-limiting)
- [Circuit Breaker](#circuit-breaker)
- [분산 트레이싱](#분산-트레이싱)
- [헬스체크](#헬스체크)
- [로컬 개발](#로컬-개발)
- [테스트](#테스트)
- [배포 (Jenkins)](#배포-jenkins)

---

## 아키텍처 개요

```
Client
  │
  ▼
[ThrottlerGuard]        ← Rate Limiting (IP당 요청 수 제한)
  │
[ApiKeyAuthGuard]       ← API Key 인증 (x-hobom-api-key)
  │
[TraceIdMiddleware]     ← Trace ID 주입 / 전파
  │
[ProxyController]       ← 서비스 이름 파싱 & 라우팅 결정
  │
[ProxyService]
  │
[CircuitBreakerService] ← 서킷 브레이커 (서비스별 독립 인스턴스)
  │
[HeaderBuilder]         ← 업스트림 헤더 조합 (쿠키 → Bearer 변환 포함)
  │
  ▼
Backend Microservice
  │
  ▼
[ResponseForwarderBuilder / ErrorForwarderBuilder]
  │
  ▼
Client Response
```

---

## 기술 스택

| 항목 | 기술 |
|---|---|
| 프레임워크 | NestJS 11 |
| 언어 | TypeScript 5.7 |
| HTTP 클라이언트 | Axios + @nestjs/axios |
| Rate Limiting | @nestjs/throttler |
| Circuit Breaker | opossum |
| 트레이싱 | AsyncLocalStorage |
| 런타임 | Node.js 20 (Alpine) |
| 테스트 | Jest + ts-jest |
| CI/CD | Jenkins + Docker Hub |

---

## 요청 흐름

1. 클라이언트가 `/hobom-api-gateway/{serviceName}/{path}` 형태로 요청
2. `ThrottlerGuard`가 IP당 Rate Limit 초과 여부 확인 (기본: 60초당 100회)
3. `ApiKeyAuthGuard`가 `x-hobom-api-key` 헤더 검증
4. `TraceIdMiddleware`가 `x-hobom-trace-id` 주입 (없으면 UUID 생성)
5. `ProxyController`가 `serviceName`으로 업스트림 호스트 결정
6. `CircuitBreakerService`가 서비스 상태 확인 (OPEN 상태면 즉시 503 반환)
7. `HeaderBuilder`가 업스트림 헤더 조합 (쿠키 → Authorization Bearer 변환 포함)
8. Axios로 백엔드 호출 (스트림 응답)
9. `ResponseForwarderBuilder` 또는 `ErrorForwarderBuilder`가 클라이언트에 응답

---

## 프로젝트 구조

```
src/
├── main.ts                          # 앱 부트스트랩 (SIGTERM graceful shutdown 포함)
├── app.module.ts                    # 루트 모듈 (ThrottlerModule, 글로벌 가드 등록)
├── proxy/
│   ├── controller/
│   │   └── proxy.controller.ts     # 모든 요청 수신 → ProxyService 위임
│   ├── service/
│   │   └── proxy.service.ts        # 서킷 브레이커로 감싼 HTTP 포워딩
│   ├── config/
│   │   └── proxy-route.config.ts   # 서비스명 → 호스트 매핑 (동적 라우팅 지원)
│   └── proxy.module.ts
├── health/
│   └── controller/
│       └── health.controller.ts    # GET /health (인증 제외, Public 엔드포인트)
└── shared/
    ├── circuit-breaker/
    │   └── circuit-breaker.service.ts  # 서비스별 Opossum 서킷 브레이커
    ├── decorators/
    │   └── public.decorator.ts     # @Public() — 인증 미적용 라우트 마킹
    ├── guards/
    │   └── api-key.guard.ts        # API Key 인증 가드 (@Public() 지원)
    ├── interceptors/
    │   └── trace.interceptors.ts   # 요청/응답 로깅 (메서드, URL, 소요시간)
    ├── middlewares/
    │   ├── trace-id.middleware.ts  # Trace ID 전파 (AsyncLocalStorage 연동)
    │   └── request-id.middleware.ts # X-Request-Id 생성
    ├── http/
    │   ├── header.builder.ts           # 업스트림 헤더 조합
    │   ├── response-forwarder.builder.ts # 업스트림 응답 클라이언트 전달
    │   └── error-forwarder.builder.ts   # HTTP 에러 처리 및 로깅
    ├── end-point/
    │   └── end-point.util.ts       # URL 파싱 → {serviceKey, url} 반환
    └── trace/
        ├── trace-context.ts        # AsyncLocalStorage 기반 Trace Context
        └── trace-header.constant.ts
```

---

## 환경 변수

`.env.example`을 복사해서 `.env`를 생성하세요.

```bash
cp .env.example .env
```

| 변수명 | 필수 | 설명 |
|---|---|---|
| `HOBOM_API_GATEWAY_PORT` | O | 게이트웨이 수신 포트 (기본: 9090) |
| `HOBOM_CLIENT_HOST` | O | CORS 허용 오리진 |
| `HOBOM_API_GATEWAY_KEY` | O | API Key 인증값 (강력한 랜덤 값 사용 권장) |
| `HOBOM_API_SERVER_HOST` | O | `hobom-system-backend` 서비스의 업스트림 URL |
| `HOBOM_INTERNAL_API_SERVER_HOST` | O | `hobom-internal` 서비스의 업스트림 URL |
| `PROXY_ROUTES` | X | 동적 라우트 추가 (하단 참조) |
| `THROTTLE_TTL_SECONDS` | X | Rate Limit 윈도우 (초, 기본: 60) |
| `THROTTLE_LIMIT` | X | Rate Limit 최대 요청 수 (기본: 100) |

---

## 서비스 라우팅

요청 URL 형식: `/hobom-api-gateway/{serviceName}/{...path}`

기본 제공 서비스 매핑:

| 서비스명 | 환경 변수 |
|---|---|
| `hobom-system-backend` | `HOBOM_API_SERVER_HOST` |
| `hobom-internal` | `HOBOM_INTERNAL_API_SERVER_HOST` |

### 동적 서비스 추가 (코드 변경 없음)

`PROXY_ROUTES` 환경 변수로 새 서비스를 런타임에 등록할 수 있습니다.

```env
PROXY_ROUTES=my-new-service=http://host:8080/my-new-service/api/v1,another=http://host2:9090/api/v1
```

- 기존 정적 매핑보다 `PROXY_ROUTES`가 우선 적용됩니다.
- 형식: `서비스명=URL` (쉼표로 구분)

---

## 인증

모든 요청은 `x-hobom-api-key` 헤더를 포함해야 합니다.

```http
GET /hobom-api-gateway/hobom-system-backend/daily-todo
x-hobom-api-key: <your-api-key>
```

키가 없거나 일치하지 않으면 `401 Unauthorized`를 반환합니다.

**예외**: `/health` 엔드포인트는 인증 없이 접근 가능합니다 (`@Public()` 데코레이터 적용).

---

## Rate Limiting

IP당 요청 수를 제한합니다 (기본: 60초 윈도우당 100회).

```env
THROTTLE_TTL_SECONDS=60
THROTTLE_LIMIT=100
```

제한 초과 시 `429 Too Many Requests`를 반환합니다.

---

## Circuit Breaker

서비스별로 독립적인 Opossum 서킷 브레이커가 동작합니다.

| 설정 | 값 |
|---|---|
| 타임아웃 | 5초 |
| 실패율 임계값 | 50% |
| OPEN → HALF-OPEN 복구 대기 | 30초 |

- **CLOSED**: 정상 동작
- **OPEN**: 즉시 `503 Service temporarily unavailable` 반환
- **HALF-OPEN**: 소수 요청으로 복구 여부 탐색

서킷 상태 변화는 로그로 출력됩니다.

---

## 분산 트레이싱

모든 요청에 두 가지 ID가 자동으로 주입됩니다.

| 헤더 | 설명 |
|---|---|
| `x-hobom-trace-id` | 서비스 간 전파용 Trace ID (없으면 UUID 생성) |
| `X-Request-Id` | 게이트웨이 레벨 요청 ID |

Trace ID는 `AsyncLocalStorage`로 전파되므로, async 경계를 넘어도 동일한 ID가 유지됩니다.

---

## 헬스체크

인증 없이 호출 가능한 공개 엔드포인트입니다.
로드 밸런서 또는 컨테이너 오케스트레이션(K8s liveness probe 등)에서 사용합니다.

```http
GET /health

HTTP/1.1 200 OK
{
  "status": "ok",
  "timestamp": "2026-02-20T12:00:00.000Z"
}
```

---

## 로컬 개발

```bash
# 의존성 설치
npm ci

# 환경 변수 설정
cp .env.example .env
# .env 파일을 실제 값으로 수정

# 개발 서버 실행 (watch 모드)
npm run start:dev
```

---

## 테스트

```bash
# 단위 테스트 실행
npm test

# Watch 모드
npm run test:watch
```

주요 테스트 대상:

- `EndPointUtil` — URL 파싱 및 라우팅 로직
- `HeaderBuilder` — 헤더 조합 및 쿠키 변환
- `ErrorForwarderBuilder` — 에러 응답 포워딩
- `ApiKeyAuthGuard` — 인증 로직 및 `@Public()` 우회
- `ProxyRouteConfig` — 정적/동적 서비스 매핑
