import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * 인증을 건너뛸 라우트에 붙이는 데코레이터.
 *
 * `ApiKeyAuthGuard`는 이 메타데이터를 확인해 인증 검사를 생략한다.
 * 예) 헬스체크 엔드포인트
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
