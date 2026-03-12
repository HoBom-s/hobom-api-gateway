import { Injectable, Logger } from "@nestjs/common";

/** 서킷 브레이커 상태 */
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface BreakerConfig {
  /** 실패율 임계값 (%) — 초과 시 OPEN */
  failureThresholdPercent: number;
  /** 실패율 계산 기준 최소 요청 수 */
  minRequestCount: number;
  /** OPEN → HALF_OPEN 전환 대기 시간 (ms) */
  resetTimeoutMs: number;
  /** 요청당 최대 대기 시간 (ms) */
  timeoutMs: number;
}

const DEFAULT_CONFIG: BreakerConfig = {
  failureThresholdPercent: 50,
  minRequestCount: 5,
  resetTimeoutMs: 30_000,
  timeoutMs: 60_000,
};

/** 서비스별 서킷 브레이커 상태를 관리한다. */
interface BreakerState {
  state: CircuitState;
  failures: number;
  successes: number;
  openedAt: number | null;
}

/** 서킷이 OPEN 상태일 때 던지는 에러 */
export class CircuitOpenError extends Error {
  constructor(serviceKey: string) {
    super(`Circuit is OPEN for service: ${serviceKey}`);
    this.name = "CircuitOpenError";
  }
}

/**
 * 다운스트림 서비스별 서킷 브레이커를 관리한다.
 *
 * - 실패율 50% 초과 (최소 5건 이후) → OPEN (즉시 거절)
 * - OPEN 후 30초 → HALF_OPEN (다음 요청 한 건으로 복구 탐색)
 * - 성공 확인 → CLOSED (정상 동작 재개)
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly states = new Map<string, BreakerState>();

  /**
   * 지정된 서비스의 서킷 브레이커를 통해 액션을 실행한다.
   *
   * @param serviceKey - 서비스 식별자 (예: "hobom-system-backend")
   * @param action - 실행할 비동기 함수
   * @throws {@link CircuitOpenError} 서킷이 OPEN 상태일 때
   */
  async fire<T>(serviceKey: string, action: () => Promise<T>): Promise<T> {
    const state = this.getOrCreate(serviceKey);

    if (state.state === "OPEN") {
      const elapsed = Date.now() - (state.openedAt ?? 0);
      if (elapsed < DEFAULT_CONFIG.resetTimeoutMs) {
        throw new CircuitOpenError(serviceKey);
      }
      this.transition(serviceKey, state, "HALF_OPEN");
    }

    try {
      const result = await this.withTimeout(action, DEFAULT_CONFIG.timeoutMs);
      this.onSuccess(serviceKey, state);
      return result;
    } catch (err) {
      this.onFailure(serviceKey, state);
      throw err;
    }
  }

  private onSuccess(key: string, state: BreakerState): void {
    if (state.state === "HALF_OPEN") {
      state.failures = 0;
      state.successes = 0;
      this.transition(key, state, "CLOSED");
      return;
    }
    state.successes++;
  }

  private onFailure(key: string, state: BreakerState): void {
    state.failures++;
    const total = state.failures + state.successes;

    if (
      total >= DEFAULT_CONFIG.minRequestCount &&
      (state.failures / total) * 100 >= DEFAULT_CONFIG.failureThresholdPercent
    ) {
      this.transition(key, state, "OPEN");
    } else if (state.state === "HALF_OPEN") {
      this.transition(key, state, "OPEN");
    }
  }

  private transition(
    key: string,
    state: BreakerState,
    next: CircuitState,
  ): void {
    state.state = next;
    state.openedAt = next === "OPEN" ? Date.now() : null;

    if (next === "OPEN") {
      this.logger.warn(`[CircuitBreaker] OPEN — ${key}`);
    } else if (next === "HALF_OPEN") {
      this.logger.log(`[CircuitBreaker] HALF-OPEN — ${key}`);
    } else {
      this.logger.log(`[CircuitBreaker] CLOSED — ${key}`);
    }
  }

  /**
   * 응답 상태 코드 기반으로 수동 실패를 기록한다.
   *
   * 프록시는 모든 HTTP 응답을 스트리밍하므로 5xx도 Axios 에러로 잡히지 않는다.
   * 응답 전달 후 이 메서드를 호출해 서킷 브레이커에 실패를 반영한다.
   */
  recordFailure(serviceKey: string): void {
    const state = this.getOrCreate(serviceKey);
    this.onFailure(serviceKey, state);
  }

  private getOrCreate(key: string): BreakerState {
    if (!this.states.has(key)) {
      this.states.set(key, {
        state: "CLOSED",
        failures: 0,
        successes: 0,
        openedAt: null,
      });
    }
    return this.states.get(key)!;
  }

  private withTimeout<T>(action: () => Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Upstream timeout after ${ms}ms`)),
        ms,
      );
      action().then(
        (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        (e) => {
          clearTimeout(timer);
          reject(e);
        },
      );
    });
  }
}
