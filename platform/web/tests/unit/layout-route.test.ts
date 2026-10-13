import { beforeAll, describe, expect, it } from "vitest";
import { POST } from "@/app/api/v1/apps/layout/route";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { getStore } from "@/lib/data";
import type { DataStore } from "@/lib/data/store";
import type { App } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { defaultLayout, BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import { publishLayout } from "@/lib/pages/layout";
import { activateLicense, parseSiteInfo } from "@/lib/license/service";
import { expectPlatformContract } from "./platform-contract";

let store: DataStore;
let licenseKey: string;
let app: App;
const SITE = "https://route-academy.test";

const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("https://yallapp.test/api/v1/apps/layout", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.40", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

async function result(response: Response) {
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as unknown) : undefined };
}

beforeAll(async () => {
  store = await getStore();
  const now = new Date();
  const { client } = await registerClient(
    store,
    { name: "Route Academy", email: "route@academy.test", whatsapp: "+905446731900", siteUrl: SITE, password: null },
    now,
  );
  const outcome = await activateClient(store, { clientId: client.id, plan: "starter", activeUntil: new Date(now.getTime() + 30 * 86_400_000), paymentNote: "test" }, encryptionKey(), now);
  licenseKey = outcome.licenseKey!;
  const site = parseSiteInfo({ license_key: licenseKey, site_url: SITE, plugin_version: "0.3.0" });
  if (!site.ok) throw new Error("bad site");
  await activateLicense(store, site.value, now);
  app = newApp(client.id, SITE, now, "lms");
  await store.createApp(app);
});

describe("POST /api/v1/apps/layout", () => {
  const site = () => ({ license_key: licenseKey, site_url: SITE, plugin_version: "0.3.0", wp_version: "6.8", lms: "tutor" });

  it("answers 400 for a bad request and 204 before the first publish", async () => {
    const bad = await result(await post("{"));
    expect(bad.status).toBe(400);
    expectPlatformContract("POST", "/apps/layout", bad);
    const none = await post(site());
    expect(none.status).toBe(204);
  });

  it("returns the published layout with its version as ETag, then 304", async () => {
    const now = new Date();
    const published = await publishLayout(store, app, defaultLayout(app, BUILT_IN_APP_DEFAULTS, now), "route@academy.test", now);
    expect(published.ok).toBe(true);
    const response = await post(site());
    const ok = await result(response);
    expect(ok.status).toBe(200);
    expectPlatformContract("POST", "/apps/layout", ok);
    const version = (ok.body as { version: string }).version;
    expect(response.headers.get("etag")).toBe(`"${version}"`);
    expect((await post(site(), { "if-none-match": `"${version}"` })).status).toBe(304);
    expect((await post(site(), { "if-none-match": version })).status).toBe(304);
  });

  it("answers 403 for another site", async () => {
    const other = await result(await post({ ...site(), site_url: "https://elsewhere.test" }));
    expect(other).toMatchObject({ status: 403, body: { code: "license_inactive" } });
    expectPlatformContract("POST", "/apps/layout", other);
  });
});
