import { hmacSha256 } from "../crypto/tokens";
import type { OtpSenderConfig } from "../env";

/** Sends a sign-in code to a phone number. Throws when the provider fails. */
export interface OtpSender {
  send(input: { phone: string; code: string; appName: string; expiresInSeconds: number }): Promise<void>;
}

export class OtpSendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OtpSendError";
  }
}

type Fetch = typeof fetch;

/** WhatsApp Cloud API: an authentication template with the code and its copy-code button. */
export function whatsappSender(config: Extract<OtpSenderConfig, { kind: "whatsapp" }>, fetcher: Fetch = fetch): OtpSender {
  return {
    async send({ phone, code }) {
      const response = await fetcher(`https://graph.facebook.com/v21.0/${encodeURIComponent(config.phoneNumberId)}/messages`, {
        method: "POST",
        headers: { authorization: `Bearer ${config.accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone.replace(/^\+/, ""),
          type: "template",
          template: {
            name: config.template,
            language: { code: config.language },
            components: [
              { type: "body", parameters: [{ type: "text", text: code }] },
              { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
            ],
          },
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new OtpSendError(`WhatsApp answered HTTP ${response.status}.`);
    },
  };
}

/** POSTs the code as JSON, signed in `X-Yallapp-Signature: sha256=<base64url HMAC of the body>`. */
export function webhookSender(config: Extract<OtpSenderConfig, { kind: "webhook" }>, fetcher: Fetch = fetch): OtpSender {
  return {
    async send({ phone, code, appName, expiresInSeconds }) {
      const body = JSON.stringify({ phone, code, app_name: appName, expires_in_seconds: expiresInSeconds });
      const response = await fetcher(config.url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-yallapp-signature": `sha256=${hmacSha256(config.secret, body)}` },
        body,
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new OtpSendError(`The code gateway answered HTTP ${response.status}.`);
    },
  };
}

/**
 * WABEK (waabek.com): `POST /api/v1/send` with the account's key in X-API-Key,
 * from one of its numbers (`instance_id`; WABEK picks one when it's empty).
 * The send is marked as a sign-in code (`type: "otp"` and `code`), so WABEK
 * uses its approved Authentication template, which WhatsApp delivers whether
 * or not the person wrote to the number in the last 24 hours (plain text
 * outside that window fails with error 131047). Numbers go without "+".
 */
export function waabekSender(config: Extract<OtpSenderConfig, { kind: "waabek" }>, fetcher: Fetch = fetch): OtpSender {
  return {
    async send({ phone, code, appName, expiresInSeconds }) {
      const response = await fetcher(new URL("/api/v1/send", config.baseUrl).toString(), {
        method: "POST",
        headers: { "x-api-key": config.apiKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          to: phone.replace(/^\+/, ""),
          message: `${code} is your ${appName} code. It expires in ${Math.round(expiresInSeconds / 60)} minutes. Don't share it.`,
          // A sign-in code: WABEK sends it through its approved Authentication template, inside or outside the 24-hour window.
          type: "otp",
          code,
          ...(config.instanceId ? { instance_id: config.instanceId } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await response.json().catch(() => null)) as { success?: unknown; error?: unknown; detail?: unknown } | null;
      if (response.ok && json?.success === true) return;
      // WABEK says why: a bad key, no connected number (404), or its OTP template failing (422).
      const reason = [json?.error, json?.detail].filter((t): t is string => typeof t === "string" && t.length > 0).join(": ").slice(0, 300);
      throw new OtpSendError(`WABEK answered HTTP ${response.status}${reason ? ` (${reason})` : ""}.`);
    },
  };
}

/** Keeps the last code per number, for local runs and tests. */
export class LogSender implements OtpSender {
  readonly sent = new Map<string, string>();

  async send({ phone, code }: { phone: string; code: string }): Promise<void> {
    this.sent.set(phone, code);
    if (process.env.NODE_ENV !== "test") console.info(`[hosted api] sign-in code for ${phone}: ${code}`);
  }
}

const logSender = new LogSender();

export function otpSenderFrom(config: OtpSenderConfig | null): OtpSender | null {
  if (!config) return null;
  if (config.kind === "whatsapp") return whatsappSender(config);
  if (config.kind === "webhook") return webhookSender(config);
  if (config.kind === "waabek") return waabekSender(config);
  return logSender;
}

/** The process-wide log sender, so local runs and e2e tests can read codes. */
export function devLogSender(): LogSender {
  return logSender;
}
