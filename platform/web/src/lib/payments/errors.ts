/**
 * 37 A payment provider (iyzico, Kashier, Fawaterk) couldn't be reached, or
 * refused a request. Its message is safe to show: it names the provider and
 * what it said, never a key.
 */
export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentError";
  }
}

/** "450.00" or 450 (major units) as cents; null when it isn't an amount. */
export function decimalToCents(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  const cents = Math.round(Number(text) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}
