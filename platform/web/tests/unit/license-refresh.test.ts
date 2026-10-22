import { readFileSync } from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { newApp } from "@/lib/app/setup";
import type { App } from "@/lib/data/types";
import { activateClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { MemoryStore } from "@/lib/data/memory";
import { PLAN_REFRESH, refreshPlanSites, refreshSignature, refreshSite, refreshSites, refreshUrl, REFRESH_TIMEOUT_MS } from "@/lib/license/refresh";
import type { Plan } from "@/lib/plans";
import { days, KEY, NOW, setupClient } from "./helpers";

// 31 Settings saved in the dashboard reach a WordPress site within seconds.

const PUBLIC = ["93.184.216.34"];

interface Sent {
  url: string;
  init: RequestInit;
}

function fakeFetch(status = 202, fail?: Error) {
  const sent: Sent[] = [];
  const fetcher = async (url: string, init?: RequestInit) => {
    sent.push({ url, init: init ?? {} });
    if (fail) throw fail;
    return new Response(status === 202 ? JSON.stringify({ status: "active" }) : "{}", { status });
  };
  return { sent, fetcher };
}

async function wordpressApp(patch: Partial<App> = {}, siteUrlRaw = "https://academy.test/") {
  const setup = await setupClient();
  const app: App = { ...newApp(setup.client.id, "https://academy.test", NOW, "store"), backend: "wordpress", ...patch };
  await setup.store.createApp(app);
  const license = await setup.store.getLicenseForApp(setup.client.id, app.id);
  if (!license) throw new Error("no license");
  await setup.store.claimActivation({
    licenseId: license.id,
    siteUrl: "academy.test",
    siteUrlRaw,
    pluginVersion: "0.3.8",
    wpVersion: "7.1.3",
    lms: "tutor",
    store: "woocommerce",
    bookings: "",
    activatedAt: NOW,
    lastCheckedAt: NOW,
  });
  return { ...setup, app };
}

describe("the refresh signature", () => {
  it("is the HMAC the plugin checks (wp-plugin/yallapp/tests/unit/RefreshSignatureTest.php)", () => {
    expect(refreshSignature("YALL-7K2D-9QWE-4MNB", 1792000000)).toBe("d256653e011bd48634dccbb90a523fae40e898ca4eb9377ef5d381d9787e69be");
    expect(refreshSignature(" yall-7k2d-9qwe-4mnb ", 1792000000)).toBe(refreshSignature("YALL-7K2D-9QWE-4MNB", 1792000000));
    expect(refreshSignature("YALL-7K2D-9QWE-4MNB", 1792000001)).not.toBe(refreshSignature("YALL-7K2D-9QWE-4MNB", 1792000000));
  });

  it("goes to the https address of the site the license is active on", () => {
    expect(refreshUrl("https://academy.test/")).toBe("https://academy.test/wp-json/yallapp/v1/license/refresh");
    expect(refreshUrl("http://Academy.test/learn/")).toBe("https://academy.test/learn/wp-json/yallapp/v1/license/refresh");
    expect(refreshUrl("ftp://academy.test")).toBeNull();
    expect(refreshUrl("https://user:pass@academy.test")).toBeNull();
  });
});

describe("asking a WordPress site to check its license", () => {
  it("posts a signed timestamp, with a 5-second limit and no redirects", async () => {
    const { store, app, licenseKey } = await wordpressApp();
    const { sent, fetcher } = fakeFetch();
    const outcome = await refreshSite({ store, key: KEY, now: NOW, fetcher, resolve: async () => PUBLIC }, app.id);
    expect(outcome).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0]!.url).toBe("https://academy.test/wp-json/yallapp/v1/license/refresh");
    expect(sent[0]!.init.method).toBe("POST");
    expect(sent[0]!.init.redirect).toBe("error");
    expect(sent[0]!.init.signal).toBeInstanceOf(AbortSignal);
    expect(REFRESH_TIMEOUT_MS).toBeLessThanOrEqual(5000);
    const body = JSON.parse(String(sent[0]!.init.body)) as { timestamp: number; signature: string };
    expect(body.timestamp).toBe(Math.floor(NOW.getTime() / 1000));
    expect(body.signature).toBe(createHmac("sha256", licenseKey!).update(`yallapp-license-refresh:${body.timestamp}`).digest("hex"));
    // Nothing else: the site pulls everything from the platform.
    expect(Object.keys(body).sort()).toEqual(["signature", "timestamp"]);
  });

  it("counts a site that checked moments ago (429) as told", async () => {
    const { store, app } = await wordpressApp();
    expect(await refreshSite({ store, key: KEY, now: NOW, fetcher: fakeFetch(429).fetcher, resolve: async () => PUBLIC }, app.id)).toBe("sent");
    expect(await refreshSite({ store, key: KEY, now: NOW, fetcher: fakeFetch(401).fetcher, resolve: async () => PUBLIC }, app.id)).toBe("failed");
  });

  it("never throws when the site doesn't answer", async () => {
    const { store, app } = await wordpressApp();
    const timeout = fakeFetch(202, new DOMException("The operation timed out.", "TimeoutError"));
    expect(await refreshSite({ store, key: KEY, now: NOW, fetcher: timeout.fetcher, resolve: async () => PUBLIC }, app.id)).toBe("failed");
    const noHost = fakeFetch();
    const outcome = await refreshSite(
      {
        store,
        key: KEY,
        now: NOW,
        fetcher: noHost.fetcher,
        resolve: async () => {
          throw new Error("ENOTFOUND");
        },
      },
      app.id,
    );
    expect(outcome).toBe("failed");
    expect(noHost.sent).toHaveLength(0);
  });

  it("never calls a private address", async () => {
    for (const address of ["127.0.0.1", "10.0.0.8", "192.168.1.2", "169.254.169.254", "::1", "fd00::1"]) {
      const { store, app } = await wordpressApp();
      const { sent, fetcher } = fakeFetch();
      expect(await refreshSite({ store, key: KEY, now: NOW, fetcher, resolve: async () => [address] }, app.id)).toBe("private_address");
      expect(sent).toHaveLength(0);
    }
  });

  it("only asks WordPress apps whose license is active on a site", async () => {
    const hosted = await wordpressApp({ backend: "hosted", connector: { kind: "catalog" } });
    const own = await wordpressApp({ backend: "custom_api", apiBaseUrl: "https://api.academy.test" });
    const { sent, fetcher } = fakeFetch();
    const deps = { key: KEY, now: NOW, fetcher, resolve: async () => PUBLIC };
    expect(await refreshSite({ ...deps, store: hosted.store }, hosted.app.id)).toBe("not_wordpress");
    expect(await refreshSite({ ...deps, store: own.store }, own.app.id)).toBe("not_wordpress");
    expect(await refreshSite({ ...deps, store: hosted.store }, "no-such-app")).toBe("not_wordpress");
    const unbound = await wordpressApp();
    const license = await unbound.store.getLicenseForApp(unbound.client.id, unbound.app.id);
    await unbound.store.deleteActivation(license!.id);
    expect(await refreshSite({ ...deps, store: unbound.store }, unbound.app.id)).toBe("no_site");
    expect(sent).toHaveLength(0);
  });

  it("asks each app's site once", async () => {
    const { store, app } = await wordpressApp();
    const { sent, fetcher } = fakeFetch();
    expect(await refreshSites({ store, key: KEY, now: NOW, fetcher, resolve: async () => PUBLIC }, [app.id, app.id])).toEqual(["sent"]);
    expect(sent).toHaveLength(1);
  });
});

describe("saves that change what the license status carries ask the site", () => {
  const source = (file: string) => readFileSync(path.resolve(__dirname, "../../src", file), "utf8");
  /** The body of an exported function, up to the next export. */
  const body = (file: string, name: string) => {
    const text = source(file);
    const start = text.indexOf(`export async function ${name}(`);
    expect(start, `${name} in ${file}`).toBeGreaterThanOrEqual(0);
    const next = text.indexOf("\nexport ", start + 1);
    return text.slice(start, next === -1 ? undefined : next);
  };

  it.each([
    ["app/actions/dashboard.ts", "chooseAppTypeAction"],
    ["app/actions/app-sign-in.ts", "saveSignInMethodsAction"],
    // 45 Offline downloads on or off.
    ["app/actions/courses.ts", "saveOfflineDownloadsAction"],
    ["app/actions/pages.ts", "publishLayoutAction"],
    ["app/actions/admin.ts", "activateClientAction"],
    ["app/actions/admin.ts", "suspendClientAction"],
    ["app/actions/admin.ts", "reinstateClientAction"],
    // 37 Every provider's plan payment settles here (iyzico, Kashier, Fawaterk).
    ["lib/payments/settle.ts", "settlePlanPayment"],
    // 46 The link files (fingerprint, Team ID) and the rating prompt and crash report switches.
    ["app/actions/app-links.ts", "saveAppLinksAction"],
    ["app/actions/app-links.ts", "saveAppHealthAction"],
    // 53 Screen protection.
    ["app/actions/screen-protection.ts", "saveScreenProtectionAction"],
    // 72 The video sites' own players, or their branding hidden.
    ["app/actions/screen-protection.ts", "saveVideoBrandingAction"],
  ])("%s %s", (file, name) => {
    expect(body(file, name)).toContain("refreshSitesSoon(");
  });

  it("the license status carries only what those saves change", () => {
    // A new field in the license status needs its saves to ask the site too.
    const status = source("lib/license/service.ts");
    const fields = /export interface LicenseStatusBody \{([\s\S]*?)\n\}/.exec(status)?.[1] ?? "";
    expect([...fields.matchAll(/^\s+([a-z_]+):/gm)].map((m) => m[1])).toEqual([
      "status",
      "plan",
      "features",
      "limits",
      "sign_in_methods",
      "email_sign_in",
      "offline_downloads",
      "screen_protection",
      "app_type",
      "vertical",
      "app_links",
      "review_prompt",
      "crash_reports",
      "hide_video_branding",
      // 77 The chat's switches (saved on the Chat page, 77.3).
      "chat",
      "expires_at",
      "checked_at",
      "message",
    ]);
  });
});

describe("47 the team's edits to a plan reach every WordPress site on it", () => {
  /** Accounts in one store, each with an app on `plan` (WordPress unless said), active on its own site. */
  async function accounts(list: { plan: Plan; backend?: App["backend"]; expired?: boolean }[]) {
    const store = new MemoryStore();
    const apps: App[] = [];
    for (const [i, item] of list.entries()) {
      const { client } = await registerClient(store, { name: `Site ${i}`, email: `site${i}@academy.test`, whatsapp: "+905446731942", siteUrl: `https://site${i}.test`, password: null }, NOW);
      await activateClient(store, { clientId: client.id, plan: item.plan, activeUntil: item.expired ? days(-1) : days(30), paymentNote: "bank transfer" }, KEY, item.expired ? days(-40) : NOW);
      const app: App = { ...newApp(client.id, `https://site${i}.test`, NOW, "store"), backend: item.backend ?? "wordpress" };
      await store.createApp(app);
      const license = await store.getLicenseForApp(client.id, app.id);
      await store.claimActivation({
        licenseId: license!.id,
        siteUrl: `site${i}.test`,
        siteUrlRaw: `https://site${i}.test/`,
        pluginVersion: "0.4.2",
        wpVersion: "7.1.3",
        lms: "",
        store: "woocommerce",
        bookings: "",
        activatedAt: NOW,
        lastCheckedAt: NOW,
      });
      apps.push(app);
    }
    return { store, apps };
  }

  it("asks only the plan's WordPress sites, signed, in batches with a pause between them", async () => {
    const { store, apps } = await accounts([
      { plan: "growth" },
      { plan: "growth" },
      { plan: "pro" },
      { plan: "growth", backend: "hosted" },
      { plan: "growth" },
      { plan: "growth", expired: true },
      { plan: "growth" },
    ]);
    const { sent, fetcher } = fakeFetch();
    const pauses: number[] = [];
    const result = await refreshPlanSites(
      { store, key: KEY, now: NOW, fetcher, resolve: async () => PUBLIC, sleep: async (ms) => void pauses.push(ms) },
      "growth",
      { ...PLAN_REFRESH, batchSize: 2 },
    );
    expect(result).toEqual({ apps: 4, sent: 4, left: 0 });
    expect(sent.map((s) => s.url).sort()).toEqual([0, 1, 4, 6].map((i) => `https://site${i}.test/wp-json/yallapp/v1/license/refresh`));
    // Two batches of two: one pause between them.
    expect(pauses).toEqual([PLAN_REFRESH.pauseMs]);
    for (const s of sent) {
      const body = JSON.parse(String(s.init.body)) as { timestamp: number; signature: string };
      expect(body.signature).toMatch(/^[0-9a-f]{64}$/);
    }
    expect(apps).toHaveLength(7);
  });

  it("stops at the time budget and the most sites; the rest check at their next check", async () => {
    const { store } = await accounts(Array.from({ length: 6 }, () => ({ plan: "growth" as Plan })));
    const { sent, fetcher } = fakeFetch();
    let now = 0;
    const result = await refreshPlanSites(
      { store, key: KEY, now: NOW, fetcher, resolve: async () => PUBLIC, sleep: async (ms) => void (now += ms), clock: () => now },
      "growth",
      { batchSize: 2, pauseMs: 1000, maxSites: 500, budgetMs: 1500 },
    );
    expect(result).toEqual({ apps: 6, sent: 4, left: 2 });
    expect(sent).toHaveLength(4);
    const capped = await refreshPlanSites({ store, key: KEY, now: NOW, fetcher, resolve: async () => PUBLIC, sleep: async () => undefined }, "growth", { ...PLAN_REFRESH, maxSites: 3 });
    expect(capped).toEqual({ apps: 6, sent: 3, left: 3 });
  });

  it("goes to the local tests' fake site when one is set", async () => {
    const { store } = await accounts([{ plan: "pro" }]);
    const { sent, fetcher } = fakeFetch();
    await refreshPlanSites({ store, key: KEY, now: NOW, fetcher, resolve: async () => [], testSiteUrl: "http://localhost:3294/" }, "pro");
    expect(sent.map((s) => s.url)).toEqual(["http://localhost:3294/wp-json/yallapp/v1/license/refresh"]);
  });

  it("savePlanLimitsAction and resetPlanAction ask the plan's sites", () => {
    const text = readFileSync(path.resolve(__dirname, "../../src/app/actions/admin-settings.ts"), "utf8");
    for (const name of ["savePlanLimitsAction", "resetPlanAction"]) {
      const start = text.indexOf(`export async function ${name}(`);
      const next = text.indexOf("\nexport ", start + 1);
      expect(text.slice(start, next)).toContain("refreshPlanSitesSoon(plan)");
    }
  });
});
