export class EndPointUtil {
  public static PREFIX = "hobom-api-gateway";

  /**
   * 요청 URL에서 서비스 이름과 경로를 분리해서 타겟 URL을 조합해 반환.
   *
   * @param originalUrl - 클라이언트가 보낸 원본 요청 URL (ex: /hobom-system-backend/daily-todo)
   * @param hostMap - 서비스 이름별 타겟 호스트 맵
   * @returns 타겟 URL 또는 null (서비스 이름 미발견 시)
   */
  public static buildTargetUrl(
    originalUrl: string,
    hostMap: Record<string, string>,
  ): string | null {
    const segments = originalUrl
      .replaceAll(this.PREFIX, "")
      .split("/")
      .filter(Boolean);
    if (segments.length === 0) {
      return null;
    }

    const [serviceName, ...pathParts] = segments;
    const targetHost = hostMap[serviceName];

    if (targetHost == null) {
      return null;
    }

    const proxiedPath = "/" + pathParts.join("/");

    return `${targetHost}${proxiedPath}`;
  }
}
