import { storeAndLimit } from "@/lib/api";
import { hmacSha256 } from "@/lib/crypto/tokens";
import { encryptionKey, signingSecret, waabekApiUrl } from "@/lib/env";
import { appOtpSender } from "@/lib/hosted/app-sender";
import { otpSenderFrom } from "@/lib/hosted/otp-sender";
import { json, noContent, readJson } from "@/lib/http";
import { parseSignInCodeRequest, sendSignInCode } from "@/lib/license/sign-in-codes";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { resolvedOtpSenderConfig } from "@/lib/settings/platform";

/** POST /api/v1/sign-in-codes/send (docs/api/platform.yaml: sendSignInCode) */
export async function POST(request: Request): Promise<Response> {
  const { store, limited } = await storeAndLimit(request, RATE_LIMITS.signInCodeIp);
  if (limited) return limited;
  const parsed = parseSignInCodeRequest(await readJson(request));
  if (!parsed.ok) return json(parsed.result.body, parsed.result.status);
  const result = await sendSignInCode(store, parsed.value, {
    sender: otpSenderFrom(await resolvedOtpSenderConfig(store, encryptionKey())),
    appSender: (app) => appOtpSender(app, encryptionKey(), waabekApiUrl()),
    secret: hmacSha256(signingSecret(), "sign-in-codes"),
    now: new Date(),
  });
  if (result.status === 204) return noContent();
  const retry = result.body.retry_after_seconds;
  return json(result.body, result.status, retry ? { "retry-after": String(retry) } : {});
}
