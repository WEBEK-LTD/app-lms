import { storeAndLimit } from "@/lib/api";
import { hmacSha256 } from "@/lib/crypto/tokens";
import { appMailDelivered, sendTemplate } from "@/lib/email/send";
import { appUrl, encryptionKey, signingSecret, waabekApiUrl } from "@/lib/env";
import { appOtpSender, recordOwnWhatsappFailure } from "@/lib/hosted/app-sender";
import { otpSenderFrom } from "@/lib/hosted/otp-sender";
import { json, noContent, readJson } from "@/lib/http";
import { mailDelivered } from "@/lib/mail";
import { parseSignInCodeRequest, sendSignInCode } from "@/lib/license/sign-in-codes";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { resolvedOtpSenderConfig } from "@/lib/settings/platform";

/** POST /api/v1/sign-in-codes/send (docs/api/platform.yaml: sendSignInCode) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.signInCodeIp);
  if (limited) return limited;
  const parsed = parseSignInCodeRequest(await readJson(request));
  if (!parsed.ok) return json(parsed.result.body, parsed.result.status);
  const now = new Date();
  const result = await sendSignInCode(store, parsed.value, {
    sender: otpSenderFrom(await resolvedOtpSenderConfig(store, encryptionKey())),
    appSender: (app) => appOtpSender(app, encryptionKey(), waabekApiUrl()),
    onAppSenderFailed: (app) => recordOwnWhatsappFailure({ store, now, baseUrl: appUrl(), mail: sendTemplate }, app.id),
    // 24 Email codes: through the app's own email server when its owner set one, else Yallapp's.
    mailer: async (app, { to, code, appName, minutes }) => {
      if (!(app ? await appMailDelivered(store, app) : await mailDelivered(store))) throw new Error("No email server is set up.");
      await sendTemplate("sign_in_code", to, { app_name: appName, code, minutes: String(minutes) }, app ? { app } : {});
    },
    secret: hmacSha256(signingSecret(), "sign-in-codes"),
    now,
  });
  if (result.status === 204) return noContent();
  const retry = result.body.retry_after_seconds;
  return json(result.body, result.status, retry ? { "retry-after": String(retry) } : {});
}
