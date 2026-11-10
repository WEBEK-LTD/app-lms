import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { en as studioEn } from "@/i18n/dashboard/studio";
import { activateClient } from "@/lib/admin/clients";
import { kindById } from "@/lib/app/kinds";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { makeFromAnswers } from "@/lib/bot/create";
import { encrypt } from "@/lib/crypto/encryption";
import { MemoryStore } from "@/lib/data/memory";
import { createPool, MysqlStore } from "@/lib/data/mysql";
import type { DataStore } from "@/lib/data/store";
import type { App } from "@/lib/data/types";
import { demoKind } from "@/lib/demo/constants";
import { encryptionKey } from "@/lib/env";
import type { Plan } from "@/lib/plans";
import { sampleTotal } from "@/lib/samples/lists";
import { clearPlatformSettingsCache } from "@/lib/settings/platform";
import { demoTemplateId } from "@/lib/studio/demo-templates";
import { makeStudioProject } from "@/lib/studio/new-project";
import { TEMPLATES, type SectionWord } from "@/lib/studio/sections";
import { days, NOW } from "./helpers";

/**
 * Admin › Clients › a client's page (/admin/clients/[id]), rendered as the
 * server renders it, for clients in the states a new account goes through:
 * pending, active without an app, a regular app, a Yallapp Studio
 * marketplace project from the Zad demo template with its sample entries,
 * one made by the app-builder bot, and both kinds of app on one account.
 * Each panel loads on its own: one whose read fails, or a license key that
 * can't be decrypted, says so in place and the rest of the page shows
 * (rather than the site's "This page couldn't load" for the whole client).
 *
 * Runs on the memory store, and on MySQL or MariaDB with
 * YALLAPP_TEST_DATABASE_URL (a database with the migrations applied).
 */

// The sample entries' pictures go to a folder of their own.
const BLOBS = mkdtempSync(join(tmpdir(), "admin-client-page-"));
process.env.YALLAPP_BLOBS_DIR = BLOBS;

const url = process.env.YALLAPP_TEST_DATABASE_URL;
const pool = url ? createPool({ url, ssl: "disabled" }) : null;
afterAll(async () => {
  await pool?.end();
  rmSync(BLOBS, { recursive: true, force: true });
});

const state: { store: DataStore } = { store: new MemoryStore() };

vi.mock("@/lib/data", () => ({ getStore: async () => state.store }));
vi.mock("@/lib/auth/session", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/auth/session")>();
  return { ...real, requireAdmin: async () => ({ id: "staff", email: "owner@yallapp.test", name: "Owner", adminRole: "owner" }) };
});
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined, has: () => false }),
  headers: async () => new Headers(),
}));

const { default: ClientPage } = await import("@/app/admin/clients/[id]/page");
const { renderToReadableStream } = await import("react-dom/server");

/** The page's HTML as the server renders it: its reads, then every panel. Throws what the page throws. */
async function render(clientId: string): Promise<string> {
  const element = await ClientPage({ params: Promise.resolve({ id: clientId }), searchParams: Promise.resolve({}) } as never);
  let failure: unknown = null;
  const stream = await renderToReadableStream(element, {
    onError: (error) => {
      failure ??= error;
    },
  });
  await stream.allReady;
  const html = await new Response(stream).text();
  if (failure) throw failure;
  return html;
}

/** The headings of the panels that said they couldn't load. */
function failedPanels(html: string): string[] {
  return [...html.matchAll(/<h[23] id="[^"]+"[^>]*>([^<]+)<\/h[23]><\/div><div[^>]*role="alert"[^>]*>.*?<\/div>/gs)]
    .filter((m) => m[0].includes("This part of the page couldn&#x27;t load"))
    .map((m) => m[1]!);
}

/** The account's panels, after the apps'. */
const PANELS = ["Profile and contact", "Account", "Payments", "Set-up requests", "The client&#x27;s team", "Errors", "Timeline", "Changes by the team"];

let logged: MockInstance<typeof console.error>;
beforeEach(() => {
  state.store = pool ? new MysqlStore(pool) : new MemoryStore();
  clearPlatformSettingsCache();
  logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  logged.mockRestore();
  clearPlatformSettingsCache();
});

let n = 0;
async function account(options: { activate?: boolean; plan?: Plan } = {}) {
  n += 1;
  const { client } = await registerClient(
    state.store,
    { name: "Nour Market", email: `nour-${Date.now().toString(36)}-${n}@market.test`, whatsapp: "+905446731942", siteUrl: "https://market.test", password: null },
    NOW,
  );
  if (options.activate !== false) {
    await activateClient(state.store, { clientId: client.id, plan: options.plan ?? "growth", activeUntil: days(30), paymentNote: "bank transfer" }, encryptionKey(), NOW);
  }
  return client;
}

const words = (name: string) => (word: SectionWord) => String(studioEn[`w_${word}`]).replaceAll("{app}", name);

/** A Studio marketplace project started from the Zad demo template, as /studio/new makes it: the demo's pages and its sample entries. */
async function zadProject(clientId: string, name = "Zad"): Promise<App> {
  const template = TEMPLATES.find((t) => t.id === demoTemplateId("marketplace"))!;
  return makeStudioProject(state.store, { clientId, name, kind: demoKind("marketplace"), source: "catalog", template, words: words(name), lang: "en" }, NOW);
}

/** The page with every panel, none failed, nothing logged. */
async function renderedWhole(clientId: string): Promise<string> {
  const html = await render(clientId);
  expect(failedPanels(html)).toEqual([]);
  for (const title of PANELS) expect(html).toContain(`>${title}`);
  expect(logged).not.toHaveBeenCalled();
  return html;
}

describe("admin › a client's page, in a new account's states", () => {
  it("a Studio marketplace project from the Zad demo template, with the demo's sample entries", async () => {
    const client = await account({ activate: false });
    const app = await zadProject(client.id);
    expect(await sampleTotal(state.store, app)).toBeGreaterThan(0);
    const html = await renderedWhole(client.id);
    expect(html).toContain("YALLAPP STUDIO");
    expect(html).toContain(">Zad<");
    // On the hosted API: its users and notifications.
    expect(html).toContain("App users (<!-- -->0<!-- -->)");
  });

  it.each(["studio_1", "studio_3"] as const)("an active Zad project on %s", async (plan) => {
    const client = await account({ activate: false });
    const app = await zadProject(client.id);
    const { licenseKey } = await activateClient(state.store, { clientId: client.id, appId: app.id, plan, activeUntil: days(30), paymentNote: "bank transfer" }, encryptionKey(), NOW);
    const html = await renderedWhole(client.id);
    expect(html).toContain(`data-app-id="">${app.id}`);
    expect(html).toContain(licenseKey);
  });

  it("a project made by the app-builder bot", async () => {
    const client = await account({ activate: false });
    const made = await makeFromAnswers(
      state.store,
      { clientId: client.id, plan: null, lang: "en", words: words("Souq") },
      { kind: "marketplace", university: false, name: "Souq", colour: null, logoAssetId: null, languages: ["en"], features: [], website: null },
      kindById("marketplace")!,
      NOW,
    );
    expect(made.app.section).toBe("studio");
    expect(await renderedWhole(client.id)).toContain(">Souq<");
  });

  it("a regular app", async () => {
    const client = await account();
    await state.store.createApp({ ...newApp(client.id, null, NOW, "lms"), appName: "Academy" });
    expect(await renderedWhole(client.id)).toContain(">Academy<");
  });

  it("an active account without an app", async () => {
    const client = await account();
    expect(await renderedWhole(client.id)).toContain("None yet: the client hasn&#x27;t chosen an app type.");
  });

  it("a pending (unpaid) account", async () => {
    const client = await account({ activate: false });
    const html = await renderedWhole(client.id);
    expect(html).toContain("No app yet");
    expect(html).toContain("Not activated");
  });

  it("a regular app and a Zad project on an account activated before either", async () => {
    const client = await account();
    await state.store.createApp({ ...newApp(client.id, null, NOW, "store"), appName: "Shop" });
    await zadProject(client.id);
    const html = await renderedWhole(client.id);
    expect(html).toContain(">Shop<");
    expect(html).toContain(">Zad<");
  });

  it("a client that doesn't exist is still not found", async () => {
    await expect(render("00000000-0000-4000-8000-000000000000")).rejects.toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });
});

describe("admin › a client's page: a panel that fails doesn't take the page down", () => {
  it("a license key encrypted with a key this server doesn't have: the key says so, the page shows", async () => {
    const client = await account({ activate: false });
    const app = await zadProject(client.id);
    const { license } = await activateClient(state.store, { clientId: client.id, appId: app.id, plan: "studio_1", activeUntil: days(30), paymentNote: "" }, encryptionKey(), NOW);
    // Encrypted with another key (no ENCRYPTION_KEY_OLD for it): the page threw "Encrypted with a key that isn't set".
    await state.store.updateLicense(license.id, { keyEncrypted: encrypt("YA-OTHER-KEY", Buffer.alloc(32, 9), `license-key:${license.id}`) }, NOW);
    const html = await render(client.id);
    expect(html).toContain("Can&#x27;t be shown: make a new license key to replace it.");
    expect(failedPanels(html)).toEqual([]);
    for (const title of PANELS) expect(html).toContain(`>${title}`);
    expect(String(logged.mock.calls[0]?.[0])).toContain(`license ${license.id}`);
  });

  it.each([
    ["listAppErrors", "Errors"],
    ["listPlanPayments", "Payments"],
    ["listTeamMembers", "The client&#x27;s team"],
    ["listAuditEntries", "Changes by the team"],
    ["countHostedUsers", "Plan and license"],
    ["listHostedUsers", "App users and notifications"],
    ["listStoragePacks", "Media storage"],
    ["listAnalyticsDaily", "Analytics, last 30 days"],
    ["listBuildsByApp", "Builds"],
  ] as const)("%s fails: its panel says so, the others show", async (method, panel) => {
    const client = await account();
    await zadProject(client.id);
    vi.spyOn(state.store, method).mockRejectedValue(new Error(`${method} failed`));
    const html = await render(client.id);
    const failed = failedPanels(html);
    expect(failed).toContain(panel);
    // The timeline reads the payments, the errors, the builds and the team's changes too, and the app users' count is on two panels; nothing else fails.
    const alsoReads = method === "countHostedUsers" ? ["App users and notifications"] : [];
    expect(failed.filter((f) => f !== panel && f !== "Timeline" && !alsoReads.includes(f))).toEqual([]);
    expect(html).toContain(">Zad<");
    for (const title of PANELS.filter((t) => t !== panel && t !== "Timeline")) expect(html).toContain(`>${title}`);
    expect(logged.mock.calls.some((call) => String(call[0]).startsWith("[admin/client]") && call[1] instanceof Error && call[1].message === `${method} failed`)).toBe(true);
  });

  it("the platform settings can't be read: the built-in plans and switches, the client's page shows", async () => {
    const client = await account();
    await zadProject(client.id);
    vi.spyOn(state.store, "listPlatformSettings").mockRejectedValue(new Error("settings failed"));
    // Read again, not from the copy kept for 30 seconds.
    clearPlatformSettingsCache();
    const html = await render(client.id);
    expect(html).toContain(">Zad<");
    for (const title of PANELS) expect(html).toContain(`>${title}`);
    // The panels that read a setting of their own say so.
    expect(failedPanels(html)).toEqual(expect.arrayContaining(["Plan and license", "Media storage"]));
    expect(failedPanels(html)).not.toContain("Profile and contact");
  });
});
