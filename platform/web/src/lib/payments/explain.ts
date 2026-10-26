import type { PaymentProviderId } from "../data/types";
import { PaymentError } from "./errors";
import { PROVIDER_NAME } from "./provider";

/**
 * 62 A payment provider's refusal in plain words. iyzico, Kashier and
 * Fawaterk answer with their own short messages (often in Turkish or in
 * their API's terms: "Invalid signature", "api bilgileri bulunamadı"). The
 * dashboard shows what it means, a sentence its catalogs translate
 * (src/i18n/dashboard/providers.ts), and keeps the provider's own words
 * after "Details:" for whoever asks the provider about it. Our own messages
 * ("iyzico can't be reached.", "Kashier couldn't make the refund.") are
 * already plain and stay as they are.
 */

/** The sentences the provider modules write themselves (lib/payments/iyzico.ts, kashier.ts, fawaterk.ts, provider.ts). */
const OWN = [
  /^(?:iyzico|Kashier|Fawaterk|Stripe|PayPal) can't be reached\.$/,
  /^(?:iyzico|Kashier|Fawaterk|Stripe|PayPal) couldn't (?:start the payment|register the shop|approve the payout|find the payment|cancel the payment|make the refund)\.$/,
  /^Kashier didn't return the payment session\.$/,
  /^PayPal didn't accept the client ID and secret\.$/,
  /^(?:iyzico|Kashier|Fawaterk|Stripe|PayPal) answered HTTP \d{3}\.$/,
  /^(?:iyzico|Kashier|Fawaterk|Stripe|PayPal) doesn't take payments in [A-Z]{3}\.$/,
];

type Whose = "own" | "yallapp";

/** What a refusal is about, by the words providers use (English and Turkish), first match wins. */
const KINDS: { test: RegExp; text: (name: string, whose: Whose) => string }[] = [
  {
    test: /api ?key|secret|unauthori[sz]ed|unauthenticated|forbidden|invalid merchant|merchant not found|signature|imza|api bilgileri|authenticat|credential/i,
    text: (name, whose) =>
      whose === "own"
        ? `${name} didn't accept the API keys. Check them in your ${name} panel and enter them again.`
        : `${name} didn't accept Yallapp's request. Try again later, or message us on WhatsApp.`,
  },
  { test: /iban/i, text: (name) => `${name} didn't accept the IBAN. Check it and try again.` },
  { test: /identity|kimlik|tckn|tax ?(?:number|office)|vergi/i, text: (name) => `${name} didn't accept the ID or tax number. Check it and try again.` },
  { test: /exceed|greater than|more than|higher than|aşıyor|fazla/i, text: (name) => `${name} refused the amount: it's more than what's left of this payment.` },
  { test: /not found|bulunamad|does not exist|no such/i, text: (name) => `${name} couldn't find this payment. Check it in its panel.` },
  { test: /currency|para birimi/i, text: (name) => `${name} doesn't take this currency with these keys.` },
  { test: /already|zaten|duplicate|exists/i, text: (name) => `${name} already has this. Check it in its panel.` },
  { test: /gsm|phone|telefon/i, text: (name) => `${name} didn't accept the phone number. Check it and try again.` },
  { test: /e-?mail|e-posta/i, text: (name) => `${name} didn't accept the email address. Check it and try again.` },
  { test: /address|adres|city|şehir/i, text: (name) => `${name} didn't accept the address. Check it and try again.` },
];

/** The provider's own words, on one line and short. */
function detailsOf(raw: string): string {
  const line = raw.replace(/\s+/g, " ").trim();
  return line.length > 200 ? `${line.slice(0, 199)}…` : line;
}

/**
 * A provider's error for the person who sees it: our own sentence as it is;
 * a refusal in plain words with the provider's text after "Details:".
 * `whose` is whose keys were used: the client's own (they can fix them) or
 * Yallapp's (they can't). `fallback` is the plain words for a refusal of
 * an unknown kind.
 */
export function explainPaymentError(provider: PaymentProviderId, error: PaymentError, options: { whose?: Whose; fallback?: string } = {}): string {
  const raw = error.message.trim();
  if (error.unreachable || OWN.some((own) => own.test(raw))) return raw;
  const name = PROVIDER_NAME[provider];
  const whose = options.whose ?? "own";
  const kind = KINDS.find((k) => k.test.test(raw));
  const plain = kind ? kind.text(name, whose) : (options.fallback ?? `${name} refused the request.`);
  return raw ? `${plain} Details: ${detailsOf(raw)}` : plain;
}

export { PaymentError };
