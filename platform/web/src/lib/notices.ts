import { appLabel } from "./app/label";
import { applyDuePlanChanges, currentPlanId } from "./billing/plan-change";
import type { DataStore } from "./data/store";
import type { App, Client, License, OwnerNotice, OwnerNoticeKind, User } from "./data/types";
import type { EmailTemplateKey, TemplateValue } from "./email/templates";
import { effectivePlans } from "./entitlements";
import { appState } from "./license/status";
import { formatLimit, lowestPlanWith, type Plan, type PlanInfo } from "./plans";
import { cleanDemoActivity, type DemoCleanupReport } from "./demo/cleanup";

/**
 * Owner notices (roadmap 13.2 and 13.4): what the dashboard and email tell
 * an app's owner. Each notice is saved once per app and dedupe key (a
 * crossing of a usage threshold, or a license period), and its email goes
 * out only when the notice was new, so nobody gets the same email twice.
 *
 * - App users (hosted API only): at 80% and at 100% of the plan's limit.
 *   When the number goes back below a threshold (users deleted, a bigger
 *   plan) the open notice is resolved, and a later crossing sends again.
 * - Plan ending: 7 days before, 1 day before and on the day a license ends,
 *   each once per license period (the end date is part of the key, so a
 *   renewal starts a new period).
 */

export type Mailer = (key: EmailTemplateKey, to: string, values: Record<string, TemplateValue>) => Promise<unknown>;

export interface NoticeDeps {
  store: DataStore;
  /** The platform's address, for links. */
  baseUrl: string;
  mail: Mailer;
  now: Date;
}

const USAGE_KINDS: OwnerNoticeKind[] = ["app_users_80", "app_users_100"];
const DAY = 86_400_000;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** The link that opens the dashboard on this app's License & plugin page. */
export function openAppUrl(baseUrl: string, appId: string, to: "renew" | "change-plan", plan?: Plan | null): string {
  const query = new URLSearchParams({ app: appId, to });
  if (plan) query.set("plan", plan);
  return `${baseUrl.replace(/\/+$/, "")}/dashboard/open?${query.toString()}`;
}

/** Calendar days (UTC) from today until the license's last day: 0 on that day, negative after. */
export function daysLeft(expiresAt: Date, now: Date): number {
  const day = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((day(expiresAt) - day(now)) / DAY);
}

/**
 * The reminder due for a license today: 7 days (2 to 7 days left, so a
 * missed run still sends it), tomorrow, or today (0 to 2 days after, in case
 * the job didn't run that day). Null otherwise.
 */
export function reminderFor(expiresAt: Date, now: Date): "plan_ends_7" | "plan_ends_1" | "plan_ends_0" | null {
  const days = daysLeft(expiresAt, now);
  if (days >= 2 && days <= 7) return "plan_ends_7";
  if (days === 1) return "plan_ends_1";
  if (days <= 0 && days >= -2) return "plan_ends_0";
  return null;
}

async function ownerOf(store: DataStore, client: Client): Promise<User | null> {
  return store.getUserById(client.userId);
}

async function createAndMail(
  deps: NoticeDeps,
  owner: User | null,
  notice: Omit<OwnerNotice, "id" | "createdAt" | "emailedAt" | "dismissedAt" | "resolvedAt">,
  email: { key: EmailTemplateKey; values: Record<string, TemplateValue> },
): Promise<OwnerNotice | null> {
  const saved = await deps.store.createOwnerNotice({ ...notice, createdAt: deps.now, emailedAt: null, dismissedAt: null, resolvedAt: null });
  if (!saved) return null;
  if (owner) {
    try {
      await deps.mail(email.key, owner.email, { name: owner.name, ...email.values });
      await deps.store.updateOwnerNotice(saved.clientId, saved.id, { emailedAt: deps.now });
    } catch (error) {
      // The dashboard notice stays; the email isn't tried again.
      console.error("[notices] email failed", error);
    }
  }
  return saved;
}

/**
 * 13.2 After an app's users changed (a sign-up, or a refused one): notices
 * at 80% and 100% of the plan's limit, and resolving them below it.
 */
export async function checkAppUserNotices(
  deps: NoticeDeps,
  input: { app: App; client: Client; plan: PlanInfo | null; plans: Record<Plan, PlanInfo>; count: number },
): Promise<OwnerNotice[]> {
  const { app, client, plan, count } = input;
  const limit = plan?.limits.appUsers ?? null;
  if (limit === null || limit <= 0) {
    await deps.store.resolveOwnerNotices(app.id, USAGE_KINDS, deps.now);
    return [];
  }
  const share = count / limit;
  if (share < 1) await deps.store.resolveOwnerNotices(app.id, ["app_users_100"], deps.now);
  if (share < 0.8) await deps.store.resolveOwnerNotices(app.id, ["app_users_80"], deps.now);
  const due: OwnerNoticeKind[] = share >= 1 ? ["app_users_100"] : share >= 0.8 ? ["app_users_80"] : [];
  if (!due.length) return [];
  const open = await deps.store.listOwnerNotices({ clientId: client.id, appId: app.id, open: false, limit: 20 });
  const owner = await ownerOf(deps.store, client);
  const name = appLabel(app);
  const bigger = lowestPlanWith(input.plans, (p) => p.limits.appUsers === null || p.limits.appUsers > limit, plan?.id ?? null);
  const upgradeUrl = openAppUrl(deps.baseUrl, app.id, "change-plan", bigger?.id ?? null);
  const created: OwnerNotice[] = [];
  for (const kind of due) {
    // One per crossing: an unresolved notice of this kind (even dismissed) means this crossing was told already.
    if (open.some((n) => n.kind === kind && n.resolvedAt === null)) continue;
    const crossing = (await deps.store.countOwnerNotices(app.id, kind)) + 1;
    const at100 = kind === "app_users_100";
    const saved = await createAndMail(
      deps,
      owner,
      {
        clientId: client.id,
        appId: app.id,
        kind,
        dedupeKey: `${kind}:${crossing}`,
        title: at100 ? `${name} reached its app users limit` : `${name} has used 80% of its app users`,
        body: at100
          ? `${formatLimit(count)} of ${formatLimit(limit)} app users. New people can't sign up in the app until you upgrade; everyone with an account keeps using it.`
          : `${formatLimit(count)} of ${formatLimit(limit)} app users. At ${formatLimit(limit)}, new people can't sign up in the app; everyone with an account keeps using it.`,
        linkUrl: upgradeUrl,
        linkLabel: bigger ? `Upgrade to ${bigger.name}` : "See plans",
        tone: at100 ? "warn" : "info",
      },
      {
        key: at100 ? "app_users_100" : "app_users_80",
        values: { app_name: name, plan: plan?.name ?? "", app_users: formatLimit(count), app_user_limit: formatLimit(limit), upgrade_url: upgradeUrl },
      },
    );
    if (saved) created.push(saved);
  }
  return created;
}

const REMINDER_EMAIL: Record<"plan_ends_7" | "plan_ends_1" | "plan_ends_0", EmailTemplateKey> = {
  plan_ends_7: "plan_ends_in_7_days",
  plan_ends_1: "plan_ends_tomorrow",
  plan_ends_0: "plan_ends_today",
};

/** 13.4 The reminder due for one app's license, if any (once per license period). */
export async function remindLicense(
  deps: NoticeDeps,
  input: { app: App; client: Client; license: License; plans: Record<Plan, PlanInfo> },
): Promise<OwnerNotice | null> {
  const { app, client, license } = input;
  if (client.status !== "active") return null;
  const kind = reminderFor(license.expiresAt, deps.now);
  if (!kind) return null;
  const name = appLabel(app);
  const plan = input.plans[currentPlanId(license, deps.now)];
  const end = formatDate(license.expiresAt);
  const renewUrl = openAppUrl(deps.baseUrl, app.id, "renew");
  const days = daysLeft(license.expiresAt, deps.now);
  const saved = await createAndMail(
    deps,
    await ownerOf(deps.store, client),
    {
      clientId: client.id,
      appId: app.id,
      kind,
      dedupeKey: `${kind}:${license.expiresAt.toISOString()}`,
      title:
        kind === "plan_ends_7"
          ? `${name}'s plan ends in ${days} days`
          : kind === "plan_ends_1"
            ? `${name}'s plan ends tomorrow`
            : days === 0
              ? `${name}'s plan ends today`
              : `${name}'s plan has ended`,
      body:
        kind === "plan_ends_0"
          ? `The ${plan?.name ?? ""} plan ${days === 0 ? "ends today" : "ended"} (${end}). The app pauses when it ends and comes back as soon as you renew.`
          : `The ${plan?.name ?? ""} plan ends on ${end}. When it ends, the app pauses until the plan is renewed.`,
      linkUrl: renewUrl,
      linkLabel: "Renew by card",
      tone: kind === "plan_ends_7" ? "info" : "warn",
    },
    { key: REMINDER_EMAIL[kind], values: { app_name: name, plan: plan?.name ?? "", end_date: end, renew_url: renewUrl } },
  );
  // The earlier reminders of this period are no longer news.
  if (saved && kind !== "plan_ends_7") await deps.store.resolveOwnerNotices(app.id, kind === "plan_ends_1" ? ["plan_ends_7"] : ["plan_ends_7", "plan_ends_1"], deps.now);
  return saved;
}

export interface DailyReport {
  planChanges: number;
  reminders: number;
  usageNotices: number;
  /** Reminders of periods that were renewed since, now hidden. */
  resolved: number;
  /** 16 What visitors added to the demo apps more than a day ago, deleted. */
  demo: DemoCleanupReport;
}

/**
 * The daily job (Netlify scheduled function → POST /api/internal/daily):
 * scheduled downgrades whose date came, expiry reminders, and app users
 * notices for every hosted app (after a downgrade lowered a limit, or users
 * were deleted). Safe to run more than once a day.
 */
export async function runDailyNotices(deps: NoticeDeps): Promise<DailyReport> {
  const { store, now } = deps;
  const report: DailyReport = {
    planChanges: await applyDuePlanChanges(store, now),
    reminders: 0,
    usageNotices: 0,
    resolved: 0,
    demo: await cleanDemoActivity(store, now),
  };
  const plans = await effectivePlans(store);
  const licenses = await store.listLicenses();
  const clients = new Map<string, Client | null>();
  const clientOf = async (id: string) => {
    if (!clients.has(id)) clients.set(id, await store.getClientById(id));
    return clients.get(id) ?? null;
  };
  const counts = await store.countHostedUsersByApp();
  for (const license of licenses) {
    if (!license.appId) continue;
    const [client, app] = [await clientOf(license.clientId), await store.getAppById(license.appId)];
    // 16 Demo apps have no owner to remind (and their license doesn't end).
    if (!client || !app || app.clientId !== client.id || app.demo) continue;
    // A renewed license: reminders of the old period are no longer true.
    const open = await store.listOwnerNotices({ clientId: client.id, appId: app.id, open: true, limit: 20 });
    const stale = open.filter((n) => n.kind.startsWith("plan_ends_") && !n.dedupeKey.endsWith(`:${license.expiresAt.toISOString()}`));
    if (stale.length) {
      await store.resolveOwnerNotices(app.id, ["plan_ends_7", "plan_ends_1", "plan_ends_0"], now);
      report.resolved += stale.length;
    }
    if (await remindLicense(deps, { app, client, license, plans })) report.reminders++;
    if (app.backend === "hosted" && appState(client, license, now) === "active") {
      const created = await checkAppUserNotices(deps, { app, client, plan: plans[currentPlanId(license, now)] ?? null, plans, count: counts[app.id] ?? 0 });
      report.usageNotices += created.length;
    }
  }
  return report;
}
