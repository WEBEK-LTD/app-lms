import { chatPushes } from "@/lib/chat/push-env";
import { getStore } from "@/lib/data";
import { sendTemplate } from "@/lib/email/send";
import { appUrl, encryptionKey, paymentApiUrls, signingSecret } from "@/lib/env";
import { errorResponse, ipFromHeaders, json, noContent } from "@/lib/http";
import { refreshSitesSoon } from "@/lib/license/refresh-soon";
import { getMediaStorage } from "@/lib/media/storage";
import { handleOwner } from "@/lib/owner/service";

/** A lesson's text can be 20,000 characters; nothing else the API takes comes near. */
const MAX_BODY = 131_072;

/**
 * 58 The Owner API (docs/api/owner.yaml, server
 * https://yallapp.com.tr/api/owner/v1): Yallapp Business, the phone app for
 * the owners of apps on Yallapp. Same accounts, same database and the same
 * lib functions as the dashboard. Called by the native app only (no CORS).
 */
async function handle(request: Request, { params }: RouteContext<"/api/owner/v1/[...path]">): Promise<Response> {
  const { path } = await params;
  const raw = request.method === "GET" || request.method === "DELETE" ? "" : await request.text();
  if (raw.length > MAX_BODY) return errorResponse(413, "invalid_request", "The request is too large.");
  let body: unknown;
  if (raw.trim() !== "") {
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      return errorResponse(400, "invalid_request", "The request body must be JSON.");
    }
  }
  const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "");
  const result = await handleOwner(
    {
      store: await getStore(),
      now: new Date(),
      ip: ipFromHeaders(request.headers),
      signingSecret: signingSecret(),
      encryptionKey: encryptionKey(),
      baseUrl: appUrl(),
      paymentUrls: paymentApiUrls(),
      media: getMediaStorage(),
      mail: (key, to, values, app) => sendTemplate(key, to, values, { app }),
      teamMail: (to, values, lang) => sendTemplate("team_invitation", to, values, { lang }),
      chatPushes,
      refreshSites: refreshSitesSoon,
    },
    {
      method: request.method,
      path,
      query: new URL(request.url).searchParams,
      body,
      token: bearer?.[1]?.trim() ?? null,
      acceptLanguage: request.headers.get("accept-language"),
    },
  );
  if (result.status === 204) return noContent();
  return json(result.body, result.status, result.headers);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
