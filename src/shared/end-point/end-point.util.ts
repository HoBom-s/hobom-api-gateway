export interface ResolvedTarget {
  url: string;
  serviceKey: string;
}

export class EndPointUtil {
  public static readonly PREFIX = "hobom-api-gateway";

  /**
   * 요청 URL에서 서비스 이름과 경로를 분리해 업스트림 타겟 URL을 조합한다.
   *
   * @param originalUrl - 클라이언트가 보낸 원본 요청 URL
   *   예) /hobom-api-gateway/hobom-system-backend/daily-todo
   * @param hostMap - 서비스명 → 업스트림 호스트 URL 맵
   * @returns 서비스 키와 타겟 URL이 담긴 {@link ResolvedTarget},
   *          서비스명을 찾을 수 없으면 `null`
   */
  public static buildTargetUrl(
    originalUrl: string,
    hostMap: Readonly<Record<string, string>>,
  ): ResolvedTarget | null {
    const segments = originalUrl
      .replaceAll(this.PREFIX, "")
      .split("/")
      .filter(Boolean);

    if (segments.length === 0) {
      return null;
    }

    const [serviceKey, ...pathParts] = segments;
    const targetHost = hostMap[serviceKey];

    if (targetHost == null) {
      return null;
    }

    const proxiedPath = "/" + pathParts.join("/");
    return { url: `${targetHost}${proxiedPath}`, serviceKey };
  }
}
