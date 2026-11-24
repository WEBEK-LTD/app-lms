import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/data/memory";
import { COMPUTERS_DEMO, ELECTRONICS_DEMO } from "@/lib/demo/constants";
import { COMPUTERS_PRODUCTS } from "@/lib/demo/computers";
import { ELECTRONICS_PRODUCTS } from "@/lib/demo/electronics";
import { COMPUTERS_PRODUCT_NAMES, ELECTRONICS_PRODUCT_NAMES } from "@/lib/demo/product-names";
import { setupDemoApps, type DemoSetupDeps } from "@/lib/demo/setup";
import { connectorFor } from "@/lib/hosted/connectors";
import { LogSender } from "@/lib/hosted/otp-sender";
import { handleHosted } from "@/lib/hosted/service";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { KEY, NOW } from "./helpers";

/**
 * 227 Madar's and Nawah's products named in Arabic and Turkish too
 * (lib/demo/product-names.ts, 224's), so the demo apps read in Arabic or
 * Turkish show their products in that language: every product has its
 * names, and the shop's list serves them in the customer's language.
 */

function deps(store: MemoryStore): DemoSetupDeps {
  return {
    store,
    encryptionKey: KEY,
    putBlob: async () => undefined,
    assetUrl: (id) => `https://yallapp.test/api/v1/assets/${id}`,
    platformUrl: "https://yallapp.test",
    contact: { whatsapp: "+90 544 673 19 42", email: "info@yallapp.test" },
    actorEmail: "admin@yallapp.test",
    now: NOW,
  };
}

const CASES = [
  { demo: ELECTRONICS_DEMO, products: ELECTRONICS_PRODUCTS, names: ELECTRONICS_PRODUCT_NAMES, sku: "EL-101" },
  { demo: COMPUTERS_DEMO, products: COMPUTERS_PRODUCTS, names: COMPUTERS_PRODUCT_NAMES, sku: "PC-431" },
] as const;

describe("227 Madar's and Nawah's products in Arabic and Turkish", () => {
  it.each(CASES)("$demo: every product has its Arabic and Turkish name, in Arabic letters", ({ products, names }) => {
    expect(products.filter((p) => !names[p.sku]).map((p) => p.sku)).toEqual([]);
    expect(Object.keys(names).filter((sku) => !products.some((p) => p.sku === sku))).toEqual([]);
    for (const [sku, n] of Object.entries(names)) {
      expect(n.ar, sku).toMatch(/[؀-ۿ]/);
      expect(n.tr.trim(), sku).not.toBe("");
    }
  });

  it.each(CASES)("$demo: the shop's list serves them in the customer's language", async ({ demo, names, sku }) => {
    clearPlatformSettingsCache();
    const store = new MemoryStore();
    const result = await setupDemoApps(deps(store), [demo]);
    const app = (await store.getAppById(result.apps[0]!.appId))!;
    const assetUrl = (id: string) => `https://yallapp.test/api/v1/assets/${id}`;
    const connector = connectorFor(app, KEY, { store, assetUrl, platformUrl: "https://yallapp.test" })!;
    const list = async (lang: string) => {
      const res = await handleHosted(
        { store, app, active: true, now: NOW, ip: "203.0.113.27", secret: "test-hosted-secret", sender: new LogSender(), push: false, assetUrl, platformUrl: "https://yallapp.test", connector },
        { method: "GET", path: ["store", "products"], query: new URLSearchParams({ platform: "android", per_page: "100" }), body: undefined, token: null, headers: new Headers({ "accept-language": lang }) },
      );
      expect(res.status).toBe(200);
      return (res.body as { items: { name: string }[] }).items.map((p) => p.name);
    };
    expect(await list("ar")).toContain(names[sku]!.ar);
    expect(await list("tr")).toContain(names[sku]!.tr);
    expect(await list("ar")).not.toContain(names[sku]!.tr);
  });
});
