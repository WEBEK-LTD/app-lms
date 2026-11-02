import { assetUrl } from "@/lib/assets";
import { handleCourierHub } from "@/lib/courier-hub/service";
import { hmacSha256 } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { sendTemplate } from "@/lib/email/send";
import { appUrl, encryptionKey, signingSecret } from "@/lib/env";
import { otpSenderFrom } from "@/lib/hosted/otp-sender";
import { errorResponse, ipFromHeaders, json, noContent } from "@/lib/http";
import { smtpConfigured } from "@/lib/mail";
import { resolvedOtpSenderConfig } from "@/lib/settings/platform";

/**
 * 104.8.2 The Yallapp Courier API (docs/api/courier.yaml, server
 * https://yallapp.com.tr/api/courier/v1): one courier app for the couriers of
 * every delivery company that picks it. Codes go out through Yallapp's own
 * sender and email server. Called by the native app only (no CORS).
 */
async function handle(request: Request, { params }: RouteContext<"/api/courier/v1/[...path]">): Promise<Response> {
  const { path } = await params;
  const raw = request.method === "GET" || request.method === "DELETE" ? "" : await request.text();
  if (raw.length > 16_384) return errorResponse(413, "invalid_request", "The request is too large.");
  let body: unknown;
  if (raw.trim() !== "") {
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      return errorResponse(400, "invalid_request", "The request body must be JSON.");
    }
  }
  const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "");
  const store = await getStore();
  const result = await handleCourierHub(
    {
      store,
      now: new Date(),
      ip: ipFromHeaders(request.headers),
      signingSecret: signingSecret(),
      // The company sessions are the hosted API's tokens (app/api/app/[appId]).
      hostedSecret: hmacSha256(signingSecret(), "hosted-api"),
      platformUrl: appUrl(),
      assetUrl,
      sender: otpSenderFrom(await resolvedOtpSenderConfig(store, encryptionKey())),
      sendEmailCode: async ({ to, code, appName, minutes }) => {
        // Without SMTP in production, sendMail drops the message: say the code couldn't be sent instead.
        if (!(await smtpConfigured(store))) throw new Error("No email server is set up.");
        await sendTemplate("sign_in_code", to, { app_name: appName, code, minutes: String(minutes) });
      },
    },
    { method: request.method, path, body, token: bearer?.[1]?.trim() ?? null, acceptLanguage: request.headers.get("accept-language") },
  );
  if (result.status === 204) return noContent();
  return json(result.body, result.status, result.headers);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
