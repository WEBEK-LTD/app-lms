import { hmacSha256 } from "../crypto/tokens";
import type { OtpSenderConfig } from "../env";

/** Sends a sign-in code to a phone number. Throws when the provider fails. */
export interface OtpSender {
  send(input: { phone: string; code: string; appName: string; expiresInSeconds: number }): Promise<void>;
  /**
   * For providers that make and check the code themselves (WABEK): `send`
   * ignores the code it's given, and this says whether the user's code is
   * right. Throws when the provider can't be reached.
   */
  verify?(input: { phone: string; code: string }): Promise<boolean>;
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
 * WABEK's OTP API (waabek.com): WABEK makes the code, sends it on WhatsApp with
 * its Meta-approved template, and checks it. Numbers go without the "+".
 */
export function waabekSender(config: Extract<OtpSenderConfig, { kind: "waabek" }>, fetcher: Fetch = fetch): OtpSender {
  const call = (path: string, body: Record<string, unknown>) =>
    fetcher(new URL(path, config.baseUrl).toString(), {
      method: "POST",
      headers: { "x-api-key": config.apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  const success = async (response: Response) => {
    const json = (await response.json().catch(() => null)) as { success?: unknown } | null;
    return json?.success === true;
  };
  return {
    async send({ phone }) {
      const response = await call("/api/otp/send", { phone: phone.replace(/^\+/, ""), code_length: 6 });
      if (!response.ok) throw new OtpSendError(`WABEK answered HTTP ${response.status}.`);
      if (!(await success(response))) throw new OtpSendError("WABEK didn't send the code.");
    },
    async verify({ phone, code }) {
      const response = await call("/api/otp/verify", { phone: phone.replace(/^\+/, ""), code });
      // A wrong or expired code is an answer; a bad key, a limit or a server error is a failure.
      if (response.status === 401 || response.status === 403 || response.status === 429 || response.status >= 500) {
        throw new OtpSendError(`WABEK answered HTTP ${response.status}.`);
      }
      return response.ok && (await success(response));
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
