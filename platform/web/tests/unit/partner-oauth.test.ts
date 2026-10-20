import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { OWNER_ACCESS, type TeamAccess } from "@/lib/team/permissions";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { MemoryStore } from "@/lib/data/memory";
import { clearTokenMemory } from "@/lib/hosted/connectors/oauth-tokens";
import { signOAuthState } from "@/lib/hosted/connectors/partner-apps";
import { platformValues } from "@/lib/hosted/connectors/platforms";
import { clearSallaCache } from "@/lib/hosted/connectors/salla";
import { clearPlatformSettingsCache, encryptSetting } from "@/lib/settings/platform";

// 25 The OAuth callback of the Salla and Zid partner apps: the signed state, the signed-in owner, the partner app,
// the code swap, the store check, and what is saved.

const session = vi.hoisted(() => ({ context: null as null | { staff: null; client: { id: string; status: string }; apps: App[]; app: App | null; access: TeamAccess } }));
vi.mock("@/lib/auth/session", () => ({
  getClientContext: async () => session.context,
  mayUseDashboard: () => true,
  chooseApp: async () => undefined,
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

const { partnerOAuthCallback } = await import("@/app/oauth/partner-callback");

const SECRET = "test-session-secret-0123456789abcdef0123456789";
const KEY = Buffer.from("0".repeat(64), "hex");
const NOW = new Date();

function fakeSalla(options: { productsStatus?: number } = {}) {
  const requests: string[] = [];
  const fetcher = (async (input: string, init: RequestInit = {}) => {
    requests.push(input);
    const json = (body: unknown, status = 200) => Response.json(body, { status });
    if (input === "https://accounts.salla.sa/oauth2/token") {
      const form = new URLSearchParams(String(init.body));
      if (form.get("code") !== "good-code" || form.get("redirect_uri") !== "https://yallapp.test/oauth/salla" || form.get("client_secret") !== "salla-secret") {
        return json({ error: "invalid_grant" }, 400);
      }
      return json({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 1209600 });
    }
    if (new Headers(init.headers).get("authorization") !== "Bearer access-1") return json({}, 401);
    if (input === "https://accounts.salla.sa/oauth2/user/info") return json({ data: { merchant: { id: 123456, name: "Oud House", domain: "https://oud.example" } } });
    if (input === "https://api.salla.dev/admin/v2/store/info") return json({ data: { name: "Oud House", currency: "SAR" } });
    if (input.startsWith("https://api.salla.dev/admin/v2/products")) return options.productsStatus ? json({}, options.productsStatus) : json({ data: [], pagination: { total: 0 } });
    throw new Error(`Unexpected request: ${input}`);
  }) as unknown as typeof fetch;
  return { fetcher, requests };
}

const previousAppUrl = process.env.APP_URL;
afterAll(() => {
  if (previousAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = previousAppUrl;
  (globalThis as unknown as { __yallappStore?: unknown }).__yallappStore = undefined;
});

describe("partner OAuth callback", () => {
  let store: MemoryStore;
  let app: App;

  async function savePartnerApp() {
    await store.setPlatformSetting(
      "sallaApp",
      { clientId: "salla-client", clientSecretEncrypted: encryptSetting("sallaApp", "salla-secret", KEY), webhookSecretEncrypted: null },
      "team@yallapp.test",
      NOW,
    );
    clearPlatformSettingsCache();
  }

  beforeEach(async () => {
    process.env.APP_URL = "https://yallapp.test";
    clearPlatformSettingsCache();
    clearSallaCache();
    clearTokenMemory();
    store = new MemoryStore();
    (globalThis as unknown as { __yallappStore?: Promise<MemoryStore> }).__yallappStore = Promise.resolve(store);
    app = newApp("client-1", null, NOW, "store");
    await store.createApp(app);
    session.context = { staff: null, client: { id: "client-1", status: "active" }, apps: [app], app, access: OWNER_ACCESS };
    await savePartnerApp();
  });

  const callback = (query: string, fetcher = fakeSalla().fetcher, platform: "salla" | "zid" = "salla") =>
    partnerOAuthCallback(new Request(`https://yallapp.test/oauth/${platform}?${query}`), platform, fetcher);
  const state = (appId = app.id, platform = "salla") => encodeURIComponent(signOAuthState({ platform, appId }, SECRET, new Date()));

  it("saves the store with its tokens and opens the Website step again", async () => {
    const salla = fakeSalla();
    const response = await callback(`code=good-code&state=${state()}`, salla.fetcher);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://yallapp.test/dashboard/setup?step=website&connected=salla");
    const saved = (await store.getAppById(app.id))!;
    expect(saved.backend).toBe("hosted");
    expect(saved.websiteDoneAt).not.toBeNull();
    expect(saved.connector).toMatchObject({ kind: "platform", platform: "salla", settings: {} });
    // Tokens are stored encrypted.
    expect(JSON.stringify(saved.connector)).not.toContain("refresh-1");
    expect(platformValues(saved, KEY)).toMatchObject({ merchantId: "123456", storeName: "Oud House", accessToken: "access-1", refreshToken: "refresh-1" });
    // The check read the store and one product.
    expect(salla.requests).toContain("https://api.salla.dev/admin/v2/store/info");
    expect(salla.requests.some((r) => r.startsWith("https://api.salla.dev/admin/v2/products"))).toBe(true);
  });

  it("refuses a state that isn't ours, has expired, or is for another platform", async () => {
    for (const query of ["code=good-code", "code=good-code&state=forged.state", `code=good-code&state=${state(app.id, "zid")}`]) {
      const response = await callback(query);
      expect(response.status).toBe(400);
      expect(await response.text()).toContain("This link has expired");
    }
    const old = encodeURIComponent(signOAuthState({ platform: "salla", appId: app.id }, SECRET, new Date(Date.now() - 30 * 60_000)));
    expect((await callback(`code=good-code&state=${old}`)).status).toBe(400);
    expect((await store.getAppById(app.id))!.connector).toBeNull();
  });

  it("connects only an app of the signed-in owner", async () => {
    session.context = null;
    expect((await callback(`code=good-code&state=${state()}`)).status).toBe(401);
    const other = newApp("client-2", null, NOW, "store");
    session.context = { staff: null, client: { id: "client-1", status: "active" }, apps: [app], app, access: OWNER_ACCESS };
    const response = await callback(`code=good-code&state=${state(other.id)}`);
    expect(response.status).toBe(403);
    expect(await response.text()).toContain("Not your app");
  });

  it("60 refuses someone on the team who isn't the owner", async () => {
    session.context = { staff: null, client: { id: "client-1", status: "active" }, apps: [app], app, access: { role: "manager", areas: [], appIds: null } };
    const response = await callback(`code=good-code&state=${state()}`);
    expect(response.status).toBe(403);
    expect(await response.text()).toContain("Ask the owner");
  });

  it("says when access wasn't given, the code was refused, the app isn't set up, or the store can't be read", async () => {
    const denied = await callback(`error=access_denied&state=${state()}`);
    expect(denied.status).toBe(400);
    expect(await denied.text()).toContain("Access wasn&#39;t given");

    const refused = await callback(`code=old-code&state=${state()}`);
    expect(refused.status).toBe(400);
    expect(await refused.text()).toContain("Salla didn&#39;t accept this approval");

    const blocked = await callback(`code=good-code&state=${state()}`, fakeSalla({ productsStatus: 403 }).fetcher);
    expect(blocked.status).toBe(400);
    expect(await blocked.text()).toContain("read this store&#39;s products");

    await store.setPlatformSetting("sallaApp", null, "team@yallapp.test", NOW);
    clearPlatformSettingsCache();
    const unset = await callback(`code=good-code&state=${state()}`);
    expect(unset.status).toBe(503);
    expect(await unset.text()).toContain("isn&#39;t available yet");
    expect((await store.getAppById(app.id))!.connector).toBeNull();
  });

  it("refuses an app that isn't a Store app", async () => {
    const academy = newApp("client-1", null, NOW, "lms");
    session.context = { staff: null, client: { id: "client-1", status: "active" }, apps: [app, academy], app, access: OWNER_ACCESS };
    const response = await callback(`code=good-code&state=${state(academy.id)}`);
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Choose Store first");
  });
});
