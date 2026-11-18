/**
 * 153 What the payment page reads from Kashier's card form in its frame
 * (Kashier's payment sessions, embedded: developers.kashier.io, Payment
 * sessions). Kashier's checkout posts messages to the page around it:
 * `contentLoaded` (or `iframeLoaded`), `paymentSuccess`, `closeIframe`, and
 * `urlRedirection` with `params.redirectUrl`, the address it would send the
 * customer to (our return address). None of it proves a payment: the page
 * only goes on to our return address, which reads the payment back from
 * Kashier, as when Kashier's own page sends the customer back.
 */

export type KashierMessageKind = "loaded" | "paymentSuccess" | "urlRedirection" | "closeIframe";

export interface KashierMessage {
  kind: KashierMessageKind;
  /** urlRedirection: where Kashier would send the customer. */
  redirectUrl: string | null;
}

const KINDS: Record<string, KashierMessageKind> = {
  contentLoaded: "loaded",
  iframeLoaded: "loaded",
  paymentSuccess: "paymentSuccess",
  urlRedirection: "urlRedirection",
  closeIframe: "closeIframe",
};

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

/** One of Kashier's messages (an object, or the same as JSON text); null for anything else. */
export function kashierMessage(data: unknown): KashierMessage | null {
  let value = data;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      value = { message: value };
    }
  }
  const message = record(value);
  if (!message) return null;
  const name = [message.message, message.event, message.type].find((v): v is string => typeof v === "string");
  const kind = name && Object.hasOwn(KINDS, name) ? KINDS[name] : undefined;
  if (!kind) return null;
  const params = record(message.params) ?? record(message.data) ?? message;
  return { kind, redirectUrl: typeof params.redirectUrl === "string" ? params.redirectUrl : null };
}

/**
 * Where the page goes once Kashier is done: Kashier's address when it is our
 * own return address (with Kashier's details, which we don't trust anyway),
 * else our return address itself. Never anywhere else a message names.
 */
export function kashierDestination(redirectUrl: string | null, returnUrl: string): string {
  if (!redirectUrl) return returnUrl;
  try {
    const to = new URL(redirectUrl);
    const ours = new URL(returnUrl);
    return to.origin === ours.origin && to.pathname === ours.pathname ? to.toString() : returnUrl;
  } catch {
    return returnUrl;
  }
}
