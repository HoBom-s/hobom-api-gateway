import { Injectable, Logger } from "@nestjs/common";
import CircuitBreaker from "opossum";

const BREAKER_OPTIONS: CircuitBreaker.Options = {
  timeout: 5000,
  errorThresholdPercentage: 50,
  resetTimeout: 30_000,
};

/**
 * 다운스트림 서비스별 Opossum 서킷 브레이커를 관리한다.
 *
 * - 실패율 50% 초과 → OPEN (즉시 거절)
 * - OPEN 후 30초 → HALF-OPEN (소수 요청으로 복구 탐색)
 * - 성공 확인 → CLOSED (정상 동작 재개)
 *
 * 서킷 상태 변화는 로그로 출력된다.
 */
@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly breakers = new Map<string, CircuitBreaker<any, any>>();

  /**
   * 지정된 서비스의 서킷 브레이커를 통해 액션을 실행한다.
   *
   * @param serviceKey - 서비스 식별자 (예: "hobom-system-backend")
   * @param action - 실행할 비동기 함수
   * @throws 서킷이 OPEN 상태일 때 오류를 던진다 → 호출부에서 503으로 처리
   */
  async fire<T>(serviceKey: string, action: () => Promise<T>): Promise<T> {
    const breaker = this.getOrCreate(serviceKey);
    return breaker.fire(action) as Promise<T>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getOrCreate(key: string): CircuitBreaker<any, any> {
    if (!this.breakers.has(key)) {
      const breaker = new CircuitBreaker(
        (fn: () => Promise<unknown>) => fn(),
        BREAKER_OPTIONS,
      );
      breaker.on("open", () =>
        this.logger.warn(`[CircuitBreaker] OPEN — ${key}`),
      );
      breaker.on("halfOpen", () =>
        this.logger.log(`[CircuitBreaker] HALF-OPEN — ${key}`),
      );
      breaker.on("close", () =>
        this.logger.log(`[CircuitBreaker] CLOSED — ${key}`),
      );
      this.breakers.set(key, breaker);
    }
    return this.breakers.get(key)!;
  }
}
