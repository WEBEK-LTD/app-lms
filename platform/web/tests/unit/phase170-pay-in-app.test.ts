import { describe, expect, it } from "vitest";
import { GET as entry } from "@/app/pay/[token]/app/route";
import { GET as status } from "@/app/pay/[token]/status/route";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { CatalogOrder } from "@/lib/data/types";
import { APP_RETURN_COOKIE, APP_RETURN_MAX_AGE, appReturnCookie, appReturnLink, appReturnScheme, fromAppSheet, payStatusOf } from "@/lib/payments/app-return";
import { NOW } from "./helpers";

/**
 * 170 Paying in the app in the phone's browser sheet: the app opens
 * /pay/<token>/app (a cookie kept to this payment's pages marks it as the
 * app's), the done, failed and pending pages lead back with the app's own
 * address, and the app reads how it ended at /pay/<token>/status.
 */

const APP_ID = "3f2a9c1e-7b4d-4e8a-9c0f-1a2b3c4d5e6f";
const SCHEME = "yallapp-3f2a9c1e7b4d4e8a9c0f1a2b3c4d5e6f";

const params = (token: string) => ({ params: Promise.resolve({ token }) }) as never;

async function order(token: string, fields: Partial<CatalogOrder> = {}): Promise<CatalogOrder> {
  const store = await getStore();
  return store.createCatalogOrder({
    appId: APP_ID,
    tokenHash: sha256Hex(token),
    userId: null,
    status: "pending",
    lines: [{ productId: 1, name: "Tulip vase", quantity: 1, unitCents: 40000, imageAssetId: null, digital: false }],
    subtotalCents: 40000,
    shippingCents: 0,
    totalCents: 40000,
    currency: "TRY",
    customer: null,
    paymentId: null,
    createdAt: NOW,
    paidAt: null,
    updatedAt: NOW,
    commissionCents: null,
    itemTransactionIds: null,
    payoutApprovedAt: null,
    ...fields,
  } as never);
}

describe("170 the app's return link", () => {
  it("is the app's own scheme, the same the app's build registers", () => {
    expect(appReturnScheme(APP_ID)).toBe(SCHEME);
    expect(appReturnScheme(APP_ID.toUpperCase())).toBe(SCHEME);
  });

  it("carries only the order's ID and how it ended: never the payment's token", () => {
    expect(appReturnLink(APP_ID, 42, "paid")).toBe(`${SCHEME}://app/pay-return?order=42&result=paid`);
    expect(appReturnLink(APP_ID, 42, "failed")).toBe(`${SCHEME}://app/pay-return?order=42&result=failed`);
    expect(appReturnLink(APP_ID, null, "closed")).toBe(`${SCHEME}://app/pay-return?result=closed`);
  });

  it("the cookie holds no secret, is kept to this payment's pages, and lasts as long as the link", () => {
    const cookie = appReturnCookie("tok_ABCdef0123456789", true);
    expect(cookie).toBe(`${APP_RETURN_COOKIE}=1; Path=/pay/tok_ABCdef0123456789; Max-Age=${APP_RETURN_MAX_AGE}; HttpOnly; SameSite=Lax; Secure`);
    expect(APP_RETURN_MAX_AGE).toBe(90 * 60);
    expect(appReturnCookie("tok_ABCdef0123456789", false)).not.toContain("Secure");
    const jar = (value?: string) => ({ get: (name: string) => (name === APP_RETURN_COOKIE && value ? { value } : undefined) });
    expect(fromAppSheet(jar("1"))).toBe(true);
    expect(fromAppSheet(jar())).toBe(false);
    expect(fromAppSheet(jar("yes"))).toBe(false);
  });
});

describe("170 /pay/<token>/app", () => {
  it("marks the payment as the app's and goes on to its payment page", async () => {
    const token = "tok_EntryToken0123456789";
    const response = await entry(new Request(`http://localhost:3000/pay/${token}/app`), params(token));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`http://localhost:3000/pay/${token}`);
    expect(response.headers.get("set-cookie")).toBe(appReturnCookie(token, false));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("refuses what isn't a payment link's token (no cookie on another path)", async () => {
    for (const token of ["short", "../dashboard", "a".repeat(200), "tok with space 0123456"]) {
      const response = await entry(new Request("http://localhost:3000/pay/x/app"), params(token));
      expect(response.status, token).toBe(404);
      expect(response.headers.get("set-cookie"), token).toBeNull();
    }
  });
});

describe("170 /pay/<token>/status", () => {
  const read = async (token: string) => {
    const response = await status(new Request(`http://localhost:3000/pay/${token}/status`), params(token));
    return { code: response.status, cache: response.headers.get("cache-control"), body: (await response.json()) as Record<string, unknown> };
  };

  it("says how the payment stands, and nothing of the order's contents", async () => {
    await order("tok_StatusOpen0123456789");
    await order("tok_StatusStarted012345", { paymentProvider: "stripe", providerRef: "cs_test_1" });
    await order("tok_StatusPaid012345678", { status: "processing", paidAt: NOW, paymentId: "pi_1" });
    await order("tok_StatusClosed0123456", { status: "cancelled" });
    await order("tok_StatusManual0123456", { manualPayment: { method: "bank_transfer", name: "Bank transfer", instructions: "IBAN", dueAt: NOW.toISOString() } as never });
    expect(await read("tok_StatusOpen0123456789")).toEqual({ code: 200, cache: "no-store", body: { state: "open" } });
    expect((await read("tok_StatusStarted012345")).body).toEqual({ state: "started" });
    expect((await read("tok_StatusPaid012345678")).body).toEqual({ state: "paid" });
    expect((await read("tok_StatusClosed0123456")).body).toEqual({ state: "closed" });
    expect((await read("tok_StatusManual0123456")).body).toEqual({ state: "awaiting_payment" });
    expect(await read("tok_NoSuchOrder01234567")).toEqual({ code: 404, cache: "no-store", body: { state: "not_found" } });
    expect((await read("bad")).body).toEqual({ state: "not_found" });
  });

  it("never reads a started payment as failed, nor a refunded one as paid", () => {
    expect(payStatusOf({ status: "pending", manualPayment: null, paymentProvider: "kashier", providerRef: "s-1" })).toBe("started");
    expect(payStatusOf({ status: "pending", manualPayment: null, paymentProvider: null, providerRef: null })).toBe("open");
    expect(payStatusOf({ status: "completed", manualPayment: null })).toBe("paid");
    expect(payStatusOf({ status: "refunded", manualPayment: null })).toBe("closed");
    expect(payStatusOf(null)).toBe("not_found");
  });
});
