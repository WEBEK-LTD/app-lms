import { describe, expect, it } from "vitest";
import { createStripeSession, StripeError } from "@/lib/payments/stripe";

/**
 * 148 Kech Flora's live test of MAD 1.00 (about USD 0.10): Stripe refuses an
 * amount under the least it charges once converted to the account's currency
 * (0.50 USD), and the payment page said only "couldn't start". The refusal is
 * marked, so the page says why.
 */
describe("148 an amount under Stripe's least", () => {
  const keys = { secretKey: "sk_test_51Fake", sandbox: true };
  const request = { reference: "order-1018", amountCents: 100, currency: "MAD", description: "Order 1018", customerEmail: null, returnUrl: "https://yallapp.test/back", now: new Date("2026-11-17T23:30:00Z") };
  const refusing = (async () =>
    Response.json(
      { error: { type: "invalid_request_error", code: "amount_too_small", message: "Amount must convert to at least 50 cents. MAD 1.00 converts to approximately $0.10." } },
      { status: 400 },
    )) as unknown as typeof fetch;

  it("is marked too small, with Stripe's own words", async () => {
    const error = await createStripeSession(keys, request, { fetcher: refusing }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StripeError);
    expect((error as StripeError).tooSmall).toBe(true);
    expect((error as StripeError).message).toBe("Amount must convert to at least 50 cents. MAD 1.00 converts to approximately $0.10.");
  });

  it("our own check of a currency's least is marked too", async () => {
    const error = await createStripeSession(keys, { ...request, currency: "USD", amountCents: 49 }, { fetcher: refusing }).catch((e: unknown) => e);
    expect((error as StripeError).tooSmall).toBe(true);
  });

  it("another refusal isn't", async () => {
    const other = (async () => Response.json({ error: { type: "invalid_request_error", message: "Invalid API Key provided: sk_test_****Fake" } }, { status: 401 })) as unknown as typeof fetch;
    const error = await createStripeSession(keys, request, { fetcher: other }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(StripeError);
    expect((error as StripeError).tooSmall).toBe(false);
  });
});
