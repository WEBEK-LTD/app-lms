import type { DataStore } from "../data/store";
import type { Activation, App, Client, IntegrationCheck, IntegrationChecks, IntegrationKey, OwnerNotice } from "../data/types";
import type { EmailTemplateKey, TemplateValue } from "../email/templates";
import type { Lang } from "@/i18n/config";
import { knownTranslator } from "@/i18n/dashboard";
import { appLabel } from "../app/label";
import { mailOptions } from "../email/mail-lang";
import { appState } from "../license/status";
import { pushNotice } from "../owner/push";
import { pushOwnerSafely } from "../owner/push-env";
import type { ProviderUrls } from "../payments/provider";
import { closeAlerts, raiseAlert, type TeamMail } from "../watch/alerts";
import { integrationsOf, testIntegration } from "./index";

/**
 * 80.2 The connections checked on a schedule: every app's website or
 * platform, payment keys and push keys (what Dashboard › Integrations can
 * test, 80.1) once a day, a few apps at each run of the frequent job, the
 * apps least recently checked first (`apps.integrations_checked_at`). A
 * WordPress site whose plugin hasn't checked in for SILENT_DAYS needs
 * attention too. When a connection that worked (or was never tested) fails,
 * the owner is told once (a notice on the overview, an email and their
 * phone) and the team gets an alert; when it works again, both close.
 * A provider that can't be reached tells no one: it's checked again the
 * next day.
 */

/** Each app's connections are checked again after this long. */
export const INTEGRATION_CHECK_HOURS = 24;
/** The plugin checks in twice a day: a site not seen for this long has stopped. */
export const SILENT_DAYS = 3;
/** The keys the daily checks test. */
export const SCHEDULED_KEYS: IntegrationKey[] = ["website", "payments", "push", "huawei_push"];

const DAY = 86_400_000;

/** Failures nobody is told about: the other side couldn't be reached, not refused. */
const QUIET_CODES = new Set(["payments_unreachable"]);

/** What the owner reads, in English (the dashboard words it in their language: i18n/dashboard/integrations.ts `known.notices`). */
const NOTICE_TITLE: Partial<Record<IntegrationKey, string>> = {
  website: "{app}: your website needs attention",
  payments: "{app}: your payment keys need attention",
  push: "{app}: your Firebase notifications need attention",
  huawei_push: "{app}: your Huawei notifications need attention",
};

const NOTICE_BODY: Record<string, string> = {
  website_fails: "Your app couldn't load its content from {subject}. See what failed on Integrations and test it again.",
  website_silent: "The Yallapp plugin on {subject} hasn't checked in since {date}. Make sure the plugin is active and the site is up.",
  payments_refused: "{subject} didn't accept your payment keys, so your app can't take card payments. Check the keys in your {subject2} panel.",
  payments_unreadable: "Your saved payment keys can't be read. Save them again.",
  push_refused: "Google didn't accept your Firebase key (project {subject}), so your app's notifications can't be sent. Add a new key from Firebase.",
  push_unreadable: "Your saved Firebase key can't be read. Add it again.",
  huawei_refused: "Huawei didn't accept your Push Kit app ID and secret ({subject}), so notifications to Huawei phones can't be sent.",
};

/** The team's name for each connection. */
const NAME: Record<IntegrationKey, string> = {
  website: "Website or platform",
  payments: "Payment provider",
  whatsapp: "WhatsApp codes",
  mail: "Email codes",
  push: "Firebase notifications",
  huawei_push: "Huawei notifications",
  google_play: "Google Play",
  app_store: "App Store",
  galaxy: "Samsung Galaxy Store",
  appgallery: "Huawei AppGallery",
  xiaomi: "Xiaomi GetApps",
};

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? "");

function formatDay(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Sends one of the platform emails (lib/email/send.ts `sendTemplate`). */
export type IntegrationMailer = (key: EmailTemplateKey, to: string, values: Record<string, TemplateValue>, options?: { lang?: Lang }) => Promise<unknown>;

export interface ScheduleDeps {
  store: DataStore;
  encryptionKey: Buffer;
  now: Date;
  /** The platform's address, for links. */
  baseUrl: string;
  mail: IntegrationMailer;
  teamMail?: TeamMail | null;
  fetcher?: typeof fetch;
  paymentUrls?: ProviderUrls;
  /** Stops taking new apps after this long (the frequent job runs every 5 minutes). */
  budgetMs?: number;
  /** Apps looked at in one run, at most. */
  limit?: number;
  clock?: () => Date;
  /** How one connection is tested (tests: a stand-in). */
  test?: typeof testIntegration;
}

export interface ScheduleReport {
  apps: number;
  checks: number;
  failed: number;
  told: number;
}

const teamKey = (appId: string, key: IntegrationKey) => `integration:${appId}:${key}`;
const noticeKey = (key: IntegrationKey) => `integration_failed:${key}:`;

/** The daily checks of one app: the scheduled keys that can be tested, and a WordPress plugin that stopped checking in. */
export async function scheduledChecks(
  app: App,
  activation: Activation | null,
  deps: Pick<ScheduleDeps, "store" | "encryptionKey" | "now" | "fetcher" | "paymentUrls" | "test">,
): Promise<Partial<Record<IntegrationKey, IntegrationCheck>>> {
  const test = deps.test ?? testIntegration;
  const rows = integrationsOf({ app, activation, errors: [] });
  const out: Partial<Record<IntegrationKey, IntegrationCheck>> = {};
  for (const row of rows) {
    if (!row.testable || !SCHEDULED_KEYS.includes(row.key)) continue;
    // A plugin not yet active: nothing broke.
    if (row.key === "website" && row.state === "waiting") continue;
    let check = await test(row.key, app, deps);
    // The website once more before it counts: a site that is slow for a moment isn't broken.
    if (check && !check.ok && row.key === "website") check = (await test(row.key, app, deps)) ?? check;
    if (check?.ok && row.key === "website" && app.backend === "wordpress" && activation && deps.now.getTime() - activation.lastCheckedAt.getTime() > SILENT_DAYS * DAY) {
      check = { ...check, ok: false, code: "website_silent", subject: activation.siteUrl, problems: [`Last check-in: ${activation.lastCheckedAt.toISOString().slice(0, 16).replace("T", " ")} UTC.`] };
    }
    if (check) out[row.key] = check;
  }
  return out;
}

/** Closes what the owner and the team were told about this connection: it works again, or the app no longer has it. */
export async function settleIntegration(store: DataStore, app: Pick<App, "id" | "clientId">, key: IntegrationKey, now: Date): Promise<void> {
  const open = await store.listOwnerNotices({ clientId: app.clientId, appId: app.id, open: true, limit: 50 });
  for (const notice of open) {
    if (notice.kind === "integration_failed" && notice.dedupeKey.startsWith(noticeKey(key))) await store.updateOwnerNotice(app.clientId, notice.id, { resolvedAt: now });
  }
  await closeAlerts(store, [teamKey(app.id, key)], now);
}

async function tellOwner(deps: ScheduleDeps, app: App, client: Client, key: IntegrationKey, check: IntegrationCheck, activation: Activation | null): Promise<OwnerNotice | null> {
  const { store, now } = deps;
  const name = appLabel(app);
  const values = { app: name, subject: check.subject ?? "", subject2: check.subject ?? "", date: activation ? formatDay(activation.lastCheckedAt) : "" };
  const title = fill(NOTICE_TITLE[key] ?? "{app}: a connection needs attention", values);
  const body = fill(NOTICE_BODY[check.code] ?? "See what failed on Integrations and test it again.", values);
  const crossing = (await store.countOwnerNotices(app.id, "integration_failed")) + 1;
  const link = `${deps.baseUrl.replace(/\/+$/, "")}/dashboard/open/${app.id}?to=integrations`;
  const notice = await store.createOwnerNotice({
    clientId: client.id,
    appId: app.id,
    kind: "integration_failed",
    dedupeKey: `${noticeKey(key)}${crossing}`,
    title,
    body,
    linkUrl: link,
    linkLabel: "Open Integrations",
    tone: "warn",
    createdAt: now,
    emailedAt: null,
    dismissedAt: null,
    resolvedAt: null,
  });
  if (!notice) return null;
  // 58 The owner's phone too (Yallapp Business).
  await pushOwnerSafely((d) => pushNotice(d, notice), store);
  const owner = await store.getUserById(client.userId);
  if (owner) {
    try {
      // 56 In the language the owner chose for the dashboard.
      const options = mailOptions(owner);
      const words = knownTranslator(options[0]?.lang ?? "en");
      await deps.mail(
        "integration_failed",
        owner.email,
        { name: owner.name, app_name: name, title: words(title), problem: words(body), details: check.problems.join("\n"), integrations_url: link },
        ...options,
      );
      await store.updateOwnerNotice(client.id, notice.id, { emailedAt: now });
    } catch (error) {
      // The notice stays; the email isn't tried again.
      console.error("[integrations] email failed", error instanceof Error ? error.message : String(error));
    }
  }
  return notice;
}

async function tellTeam(deps: ScheduleDeps, app: App, client: Client, key: IntegrationKey, check: IntegrationCheck): Promise<void> {
  const owner = await deps.store.getUserById(client.userId);
  await raiseAlert(
    deps.store,
    {
      kind: "integration",
      key: teamKey(app.id, key),
      title: `${appLabel(app)}${owner ? ` (${owner.name})` : ""}: ${NAME[key]} failed its daily check`,
      detail: [`${check.code}${check.subject ? ` · ${check.subject}` : ""}`, ...check.problems].join("\n"),
      link: `/admin/clients/${client.id}`,
    },
    deps.now,
    deps.teamMail,
  );
}

/** One run: the apps due, as many as the budget allows. */
export async function runIntegrationChecks(deps: ScheduleDeps): Promise<ScheduleReport> {
  const { store, now } = deps;
  const clock = deps.clock ?? (() => new Date());
  const started = clock().getTime();
  const report: ScheduleReport = { apps: 0, checks: 0, failed: 0, told: 0 };
  const due = await store.listAppsToCheck(new Date(now.getTime() - INTEGRATION_CHECK_HOURS * 3_600_000), deps.limit ?? 20);
  for (const app of due) {
    if (report.apps > 0 && deps.budgetMs !== undefined && clock().getTime() - started >= deps.budgetMs) break;
    report.apps++;
    const [client, license] = [await store.getClientById(app.clientId), await store.getLicenseForApp(app.clientId, app.id)];
    // Only apps that run: a paused or ended plan has nothing to keep working.
    if (!client || !license || appState(client, license, now) !== "active") {
      await store.updateApp(app.id, { integrationsCheckedAt: now }, now);
      continue;
    }
    const activation = await store.getActivation(license.id);
    let checks: Partial<Record<IntegrationKey, IntegrationCheck>>;
    try {
      checks = await scheduledChecks(app, activation, deps);
    } catch (error) {
      console.error("[integrations] checks", app.id, error instanceof Error ? error.message : String(error));
      await store.updateApp(app.id, { integrationsCheckedAt: now }, now);
      continue;
    }
    const previous = app.integrationChecks ?? {};
    const next: IntegrationChecks = { ...previous, ...checks };
    await store.updateApp(app.id, { integrationChecks: next, integrationsCheckedAt: now }, now);
    for (const [key, check] of Object.entries(checks) as [IntegrationKey, IntegrationCheck][]) {
      report.checks++;
      if (check.ok) {
        await settleIntegration(store, app, key, now);
        continue;
      }
      report.failed++;
      if (QUIET_CODES.has(check.code)) continue;
      const before = previous[key];
      // Told once: when it worked before (or was never tested). Still failing: the team's alert counts it.
      if (!before || before.ok) {
        if (await tellOwner(deps, app, client, key, check, activation)) report.told++;
      }
      await tellTeam(deps, app, client, key, check);
    }
    // A connection the app no longer has (or whose plugin isn't active yet) isn't broken.
    for (const key of SCHEDULED_KEYS) {
      if (!checks[key] && previous[key] && !previous[key].ok) await settleIntegration(store, app, key, now);
    }
  }
  return report;
}
