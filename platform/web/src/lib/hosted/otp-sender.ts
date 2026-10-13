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
  return logSender;
}

/** The process-wide log sender, so local runs and e2e tests can read codes. */
export function devLogSender(): LogSender {
  return logSender;
}
