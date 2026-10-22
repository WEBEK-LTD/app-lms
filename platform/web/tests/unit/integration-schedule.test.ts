import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { activateClient } from "@/lib/admin/clients";
import { newApp } from "@/lib/app/setup";
import { registerClient } from "@/lib/auth/accounts";
import { encryptOwnPayment } from "@/lib/catalog/settings";
import { encrypt } from "@/lib/crypto/encryption";
import { MemoryStore } from "@/lib/data/memory";
import { DEFAULT_CATALOG_SETTINGS, type App, type IntegrationKey, type TeamAlert } from "@/lib/data/types";
import { SERVICE_ACCOUNT_CONTEXT } from "@/lib/hosted/notify";
import { runIntegrationChecks, scheduledChecks, SILENT_DAYS, type IntegrationMailer } from "@/lib/integrations/schedule";
import { KEY, NOW } from "./helpers";

const DAY = 86_400_000;
const at = (d: number) => new Date(NOW.getTime() + d * DAY);

const serviceAccount = JSON.stringify({
  type: "service_account",
  project_id: "rose-shop",
  private_key: generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  client_email: "push@rose-shop.iam.gserviceaccount.com",
});

/** iyzico answers `iyzico`; Google's token endpoint answers 200. */
function provider(iyzico: "success" | "failure" | "down") {
  return (async (url: string) => {
    if (String(url).includes("googleapis.com")) return new Response(JSON.stringify({ access_token: "t" }), { status: 200 });
    if (iyzico === "down") throw new Error("ECONNREFUSED");
    return new Response(JSON.stringify({ status: iyzico }), { status: 200, headers: { "content-type": "application/json" } });
  }) as unknown as typeof fetch;
}

async function shop(options: { activeUntil?: Date; language?: string } = {}) {
  const store = new MemoryStore();
  const { user, client } = await registerClient(store, { name: "Rose Owner", email: "rose@shop.test", whatsapp: "+905446731950", siteUrl: "", password: null }, NOW);
  if (options.language) await store.updateUser(user.id, { language: options.language }, NOW);
  const base = newApp(client.id, null, NOW, "store");
  const app: App = {
    ...base,
    backend: "hosted",
    appName: "Rose Shop",
    connector: { kind: "catalog" },
    catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: encryptOwnPayment(base.id, { provider: "iyzico", apiKey: "api", secretKey: "secret", sandbox: false }, KEY) },
    firebaseServiceAccountEncrypted: encrypt(serviceAccount, KEY, `${SERVICE_ACCOUNT_CONTEXT}:${base.id}`),
  };
  await store.createApp(app);
  await activateClient(store, { clientId: client.id, appId: app.id, plan: "growth", activeUntil: options.activeUntil ?? at(60), paymentNote: "" }, KEY, NOW);
  const mails: { key: string; to: string; values: Record<string, unknown>; lang?: string }[] = [];
  const mail: IntegrationMailer = async (key, to, values, opts) => {
    mails.push({ key, to, values, lang: opts?.lang });
  };
  const teamMails: TeamAlert[] = [];
  const run = (now: Date, iyzico: "success" | "failure" | "down") =>
    runIntegrationChecks({ store, encryptionKey: KEY, now, baseUrl: "https://yallapp.test", mail, teamMail: async (a) => void teamMails.push(a), fetcher: provider(iyzico) });
  const notices = async () => (await store.listOwnerNotices({ clientId: client.id, appId: app.id, limit: 20 })).filter((n) => n.kind === "integration_failed");
  const alerts = async () => (await store.listTeamAlerts({ open: true, limit: 20 })).filter((a) => a.kind === "integration");
  return { store, client, user, app, mails, teamMails, run, notices, alerts };
}

describe("80.2 connections checked every day", () => {
  it("tells the owner and the team once when payment keys stop working, and closes both when they work again", async () => {
    const s = await shop();
    expect(await s.run(NOW, "failure")).toEqual({ apps: 1, checks: 2, failed: 1, told: 1 });
    const saved = (await s.store.getAppById(s.app.id))!;
    expect(saved.integrationsCheckedAt).toEqual(NOW);
    expect(saved.integrationChecks?.payments).toMatchObject({ ok: false, code: "payments_refused", subject: "iyzico" });
    expect(saved.integrationChecks?.push).toMatchObject({ ok: true, code: "push_accepted" });

    const [notice] = await s.notices();
    expect(notice).toMatchObject({
      dedupeKey: "integration_failed:payments:1",
      title: "Rose Shop: your payment keys need attention",
      body: "iyzico didn't accept your payment keys, so your app can't take card payments. Check the keys in your iyzico panel.",
      linkUrl: `https://yallapp.test/dashboard/open/${s.app.id}?to=integrations`,
      linkLabel: "Open Integrations",
      tone: "warn",
      emailedAt: NOW,
      resolvedAt: null,
    });
    expect(s.mails).toEqual([
      {
        key: "integration_failed",
        to: "rose@shop.test",
        lang: undefined,
        values: expect.objectContaining({ name: "Rose Owner", app_name: "Rose Shop", title: notice!.title, problem: notice!.body, integrations_url: notice!.linkUrl }),
      },
    ]);
    expect(await s.alerts()).toEqual([expect.objectContaining({ key: `integration:${s.app.id}:payments`, title: "Rose Shop (Rose Owner): Payment provider failed its daily check", link: `/admin/clients/${s.client.id}`, count: 1 })]);
    expect(s.teamMails).toHaveLength(1);

    // Checked already today: nothing to do.
    expect(await s.run(at(0.5), "failure")).toMatchObject({ apps: 0 });
    // Still failing the next day: nobody is told again; the team's alert counts it.
    expect(await s.run(at(1), "failure")).toEqual({ apps: 1, checks: 2, failed: 1, told: 0 });
    expect(await s.notices()).toHaveLength(1);
    expect(s.mails).toHaveLength(1);
    expect(s.teamMails).toHaveLength(1);
    expect((await s.alerts())[0]?.count).toBe(2);

    // Working again: both close.
    expect(await s.run(at(2), "success")).toEqual({ apps: 1, checks: 2, failed: 0, told: 0 });
    expect((await s.notices())[0]?.resolvedAt).toEqual(at(2));
    expect(await s.alerts()).toEqual([]);

    // Failing once more: told again, with a new notice.
    await s.run(at(3), "failure");
    expect((await s.notices()).map((n) => [n.dedupeKey, n.resolvedAt])).toEqual(
      expect.arrayContaining([
        ["integration_failed:payments:1", at(2)],
        ["integration_failed:payments:2", null],
      ]),
    );
    expect(s.mails).toHaveLength(2);
  });

  it("tells no one when the provider can't be reached", async () => {
    const s = await shop();
    expect(await s.run(NOW, "down")).toEqual({ apps: 1, checks: 2, failed: 1, told: 0 });
    expect((await s.store.getAppById(s.app.id))?.integrationChecks?.payments?.code).toBe("payments_unreachable");
    expect(await s.notices()).toEqual([]);
    expect(await s.alerts()).toEqual([]);
  });

  it("writes to the owner in the dashboard's language", async () => {
    const s = await shop({ language: "ar" });
    await s.run(NOW, "failure");
    expect(s.mails[0]).toMatchObject({
      lang: "ar",
      values: expect.objectContaining({
        title: "Rose Shop: مفاتيح الدفع تحتاج إلى انتباهك",
        problem: "لم تقبل iyzico مفاتيح الدفع الخاصة بك، لذا لا يستطيع تطبيقك قبول الدفع بالبطاقة. تحقّق من المفاتيح في لوحة iyzico.",
      }),
    });
    // The notice is saved in English; the dashboard words it.
    expect((await s.notices())[0]?.title).toBe("Rose Shop: your payment keys need attention");
  });

  it("leaves apps whose plan isn't running, and goes on with them later", async () => {
    const s = await shop({ activeUntil: at(-1) });
    expect(await s.run(NOW, "failure")).toEqual({ apps: 1, checks: 0, failed: 0, told: 0 });
    expect((await s.store.getAppById(s.app.id))?.integrationsCheckedAt).toEqual(NOW);
    expect(await s.notices()).toEqual([]);
  });

  it("closes what it told about a connection the app no longer has", async () => {
    const s = await shop();
    await s.run(NOW, "failure");
    await s.store.updateApp(s.app.id, { catalogSettings: { ...DEFAULT_CATALOG_SETTINGS, payment: null } }, NOW);
    expect(await s.run(at(1), "failure")).toEqual({ apps: 1, checks: 1, failed: 0, told: 0 });
    expect((await s.notices())[0]?.resolvedAt).toEqual(at(1));
    expect(await s.alerts()).toEqual([]);
  });

  it("stops after its time budget, the apps never checked first", async () => {
    const s = await shop();
    const other = { ...newApp(s.client.id, null, NOW, "store"), backend: "hosted" as const };
    await s.store.createApp(other);
    let clock = NOW.getTime();
    const report = await runIntegrationChecks({
      store: s.store,
      encryptionKey: KEY,
      now: NOW,
      baseUrl: "https://yallapp.test",
      mail: async () => undefined,
      fetcher: provider("success"),
      budgetMs: 1000,
      clock: () => new Date((clock += 2000)),
    });
    expect(report.apps).toBe(1);
    // The other one is still due.
    expect(await s.store.listAppsToCheck(new Date(NOW.getTime() - 1), 10)).toHaveLength(1);
  });
});

describe("80.2 a WordPress site whose plugin stopped checking in", () => {
  const wordpress = (): App => ({ ...newApp("c1", "https://academy.test", NOW, "lms"), backend: "wordpress", siteUrl: "https://academy.test" });
  const answers = (ok: boolean) => async (key: IntegrationKey) => (key === "website" ? { at: NOW.toISOString(), ok, code: ok ? "website_answers" : "website_fails", subject: "https://academy.test", problems: [] } : null);

  it("needs attention after SILENT_DAYS, even when the site answers", async () => {
    const store = new MemoryStore();
    const seen = (d: number) => ({ siteUrl: "academy.test", lastCheckedAt: at(-d) }) as never;
    const deps = { store, encryptionKey: KEY, now: NOW, test: answers(true) };
    expect(await scheduledChecks(wordpress(), seen(1), deps)).toEqual({ website: expect.objectContaining({ ok: true, code: "website_answers" }) });
    expect(await scheduledChecks(wordpress(), seen(SILENT_DAYS + 1), deps)).toEqual({
      website: expect.objectContaining({ ok: false, code: "website_silent", subject: "academy.test" }),
    });
    // Not active yet: nothing broke.
    expect(await scheduledChecks(wordpress(), null, deps)).toEqual({});
  });

  it("tries the website twice before it counts as down", async () => {
    const store = new MemoryStore();
    let calls = 0;
    const flaky = async (key: IntegrationKey) => {
      calls++;
      return key === "website" ? { at: NOW.toISOString(), ok: calls > 1, code: calls > 1 ? "website_answers" : "website_fails", subject: null, problems: [] } : null;
    };
    const result = await scheduledChecks(wordpress(), { siteUrl: "academy.test", lastCheckedAt: NOW } as never, { store, encryptionKey: KEY, now: NOW, test: flaky });
    expect(result.website?.ok).toBe(true);
    expect(calls).toBe(2);
  });
});
