import { getStore } from "@/lib/data";
import { appUrl, encryptionKey, googlePubSubPushEmail, licenseRefreshTestUrl } from "@/lib/env";
import { readJson } from "@/lib/http";
import { handleGoogleNotification } from "@/lib/store-billing/notifications";

/** 100.3 POST /api/v1/billing/notifications/google (docs/api/platform.yaml: googleBillingNotification) */
export async function POST(request: Request): Promise<Response> {
  const store = await getStore();
  const result = await handleGoogleNotification(
    {
      store,
      key: encryptionKey(),
      now: new Date(),
      site: { testSiteUrl: licenseRefreshTestUrl() },
      audience: `${appUrl()}/api/v1/billing/notifications/google`,
      pushEmail: googlePubSubPushEmail(),
      apps: () => store.listStoreBillingApps(),
    },
    request.headers.get("authorization"),
    await readJson(request, 65_536),
  );
  return result.body ? Response.json(result.body, { status: result.status }) : new Response(null, { status: result.status });
}
