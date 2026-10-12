import { pluginDownloadUrl } from "@/lib/api";
import { getClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { errorResponse } from "@/lib/http";
import { latestRelease } from "@/lib/license/service";

/** Dashboard "Download plugin": checks the session, then redirects to a 10-minute signed link. */
export async function GET(): Promise<Response> {
  const context = await getClientContext();
  if (!context || context.state !== "active") {
    return errorResponse(403, "forbidden", "Sign in with an active Yallapp account to download the plugin.");
  }
  const release = latestRelease(await (await getStore()).listReleases());
  if (!release) return errorResponse(404, "not_found", "No plugin release is available yet.");
  return new Response(null, { status: 303, headers: { location: pluginDownloadUrl(release, 10 * 60), "cache-control": "no-store" } });
}
