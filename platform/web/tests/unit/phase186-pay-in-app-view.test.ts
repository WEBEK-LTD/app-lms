import { describe, expect, it } from "vitest";
import { GET as inApp } from "@/app/pay/[token]/in-app/route";
import { payUrlFor } from "@/lib/delivery/payment";
import { payUrl } from "@/lib/hosted/connectors/catalog";
import { IN_APP_VIEW, payLinkForApps } from "@/lib/payments/pay-link";
import { payToken } from "./pay-token";

/**
 * 186 The payment page back inside the app: the apps are handed
 * /pay/<token>/in-app, which goes straight on to the payment page. Release
 * 10's apps (170) open only the payment page itself (/pay/<token>, two parts)
 * in the phone's browser sheet, so this link stays in the app's own view,
 * with no new build.
 */

const params = (token: string) => ({ params: Promise.resolve({ token }) }) as never;
const TOKEN = "tok_InAppView0123456789";

/** What release 10's app opens in the browser sheet (mobile/lib/core/web/pay_sheet.dart `payPageToken`). */
function sheetOpens(link: string): boolean {
  const url = new URL(link);
  const segments = url.pathname.split("/").filter((s) => s.length > 0);
  return url.protocol === "https:" && segments.length === 2 && segments[0] === "pay" && /^[A-Za-z0-9_-]{16,128}$/.test(segments[1]!);
}

describe("186 the link the apps are handed", () => {
  it("is the payment page's /in-app, from every checkout's builder", () => {
    expect(IN_APP_VIEW).toBe("in-app");
    for (const base of ["https://yallapp.test", "https://yallapp.test/"]) {
      expect(payLinkForApps(base, TOKEN)).toBe(`https://yallapp.test/pay/${TOKEN}/in-app`);
      expect(payUrl(base, TOKEN)).toBe(`https://yallapp.test/pay/${TOKEN}/in-app`);
      expect(payUrlFor(base, TOKEN)).toBe(`https://yallapp.test/pay/${TOKEN}/in-app`);
    }
    expect(payToken(payLinkForApps("https://yallapp.test", TOKEN))).toBe(TOKEN);
  });

  it("stays in the app's own view in release 10's apps; the page itself would open the sheet", () => {
    expect(sheetOpens(payLinkForApps("https://yallapp.test", TOKEN))).toBe(false);
    expect(sheetOpens(`https://yallapp.test/pay/${TOKEN}`)).toBe(true);
  });
});

describe("186 /pay/<token>/in-app", () => {
  it("goes straight on to the payment page, marking nothing", async () => {
    const response = await inApp(new Request(`http://localhost:3000/pay/${TOKEN}/in-app`), params(TOKEN));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`http://localhost:3000/pay/${TOKEN}`);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("keeps the page's own query (a gateway's way back)", async () => {
    const response = await inApp(new Request(`http://localhost:3000/pay/${TOKEN}/in-app?payment=failed`), params(TOKEN));
    expect(response.headers.get("location")).toBe(`http://localhost:3000/pay/${TOKEN}?payment=failed`);
  });

  it("refuses what isn't a payment link's token", async () => {
    for (const token of ["short", "../dashboard", "a".repeat(200), "tok with space 0123456"]) {
      const response = await inApp(new Request("http://localhost:3000/pay/x/in-app"), params(token));
      expect(response.status, token).toBe(404);
      expect(response.headers.get("location"), token).toBeNull();
    }
  });
});
