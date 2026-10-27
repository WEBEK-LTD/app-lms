import { getStore } from "@/lib/data";
import { encryptionKey, licenseRefreshTestUrl } from "@/lib/env";
import { readJson } from "@/lib/http";
import { handleAppleNotification } from "@/lib/store-billing/notifications";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 100.3 POST /api/v1/billing/notifications/apple/{app_id} (docs/api/platform.yaml: appleBillingNotification) */
export async function POST(request: Request, { params }: { params: Promise<{ appId: string }> }): Promise<Response> {
  const { appId } = await params;
  const store = await getStore();
  const app = UUID.test(appId) ? await store.getAppById(appId) : null;
  const result = await handleAppleNotification({ store, key: encryptionKey(), now: new Date(), site: { testSiteUrl: licenseRefreshTestUrl() } }, app, await readJson(request, 200_000));
  return result.body ? Response.json(result.body, { status: result.status }) : new Response(null, { status: result.status });
}
