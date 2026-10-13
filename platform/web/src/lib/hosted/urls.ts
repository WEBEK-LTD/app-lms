/** The hosted API's base URL for an app: what goes in its build config as `api_base_url`. */
export function hostedApiUrl(platformUrl: string, appId: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/api/app/${appId}`;
}
