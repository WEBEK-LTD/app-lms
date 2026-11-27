import { appTenant, serveCommunity } from "@/lib/community/api/route";
import { errorResponse } from "@/lib/http";

/**
 * 235 A client app's own community (Studio's "Community" app type): the
 * same Community API, the tenant being the app (docs/api/community.yaml,
 * server https://yallapp.com.tr/api/app/{app_id}/community/v1). Its members
 * are the app's customers; nothing here reaches Yallapp Community or
 * another app's community.
 */
async function handle(request: Request, { params }: RouteContext<"/api/app/[appId]/community/v1/[...path]">): Promise<Response> {
  const { appId, path } = await params;
  const tenant = await appTenant(appId);
  if (!tenant) return errorResponse(404, "not_found", "We couldn't find that.");
  return serveCommunity(request, path, tenant);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
