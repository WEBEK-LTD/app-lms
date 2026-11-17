import type { DataStore } from "../data/store";
import type { App, PublishingAccount, PublishingAccountsSetting } from "../data/types";
import { newId } from "../crypto/tokens";
import { platformSetting } from "../settings/platform";
import { closeAlerts, raiseAlert, type TeamMail } from "../watch/alerts";

/**
 * 138 Yallapp's pool of publishing accounts (Admin › Settings › Publishing
 * accounts). Every app gets one account, the first time it's needed (the
 * Publishing step, a build's notice): the active account with the fewest
 * apps under its own limit. The app keeps it for life; the team can move
 * it (Admin › Publishing). Its owner only ever sees that one email, in the
 * steps that invite it as admin to Play Console and App Store Connect, and
 * the app's publishing notices go to it as well as to the team.
 *
 * The assignment is kept in the app's `rollout` JSON (`publishingAccount`)
 * and written once, atomically (DataStore.claimPublishingAccount): two
 * requests at once never give an app two accounts. When every account is
 * full (or there are none), the app shows the publishing team email
 * (`publishingTeamEmail`) and the team gets one alert, closed again once an
 * account has room.
 *
 * The real emails are only ever typed in the admin: none are in the code.
 */

/** Apps an account takes unless the team sets another limit. */
export const DEFAULT_ACCOUNT_LIMIT = 50;
/** The most an account may be given. */
export const MAX_ACCOUNT_LIMIT = 10_000;

/** The alert's key: one open alert while every account is full. */
export const ACCOUNTS_FULL_ALERT = "publishing_full";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The accounts as saved, checked: known shapes only, ids and emails unique. */
export function accountsOf(setting: PublishingAccountsSetting | null | undefined): PublishingAccount[] {
  const list = Array.isArray(setting?.accounts) ? setting.accounts : [];
  const out: PublishingAccount[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const id = typeof raw.id === "string" ? raw.id : "";
    const email = typeof raw.email === "string" ? raw.email.trim().toLowerCase() : "";
    if (!id || !EMAIL.test(email) || out.some((a) => a.id === id || a.email === email)) continue;
    const limit = typeof raw.limit === "number" && Number.isInteger(raw.limit) && raw.limit >= 0 ? Math.min(raw.limit, MAX_ACCOUNT_LIMIT) : DEFAULT_ACCOUNT_LIMIT;
    out.push({ id, email, limit, active: raw.active !== false, addedAt: typeof raw.addedAt === "string" ? raw.addedAt : new Date(0).toISOString() });
  }
  return out;
}

/** A new account for the pool. */
export function newAccount(email: string, now: Date, limit = DEFAULT_ACCOUNT_LIMIT): PublishingAccount {
  return { id: newId(), email: email.trim().toLowerCase(), limit, active: true, addedAt: now.toISOString() };
}

/** Whether an email can be an account. */
export function isAccountEmail(email: string): boolean {
  return EMAIL.test(email.trim()) && email.trim().length <= 191;
}

/** The account id an app was given; null without one. */
export function appAccountId(app: Pick<App, "rollout">): string | null {
  return app.rollout?.publishingAccount?.id ?? null;
}

/** How many live apps each account has. */
export function accountCounts(apps: readonly Pick<App, "rollout" | "deletedAt">[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const app of apps) {
    const id = app.deletedAt ? null : appAccountId(app);
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** The account a new app gets: active, under its limit, with the fewest apps (the first listed on a tie); null when every one is full. */
export function pickAccount(accounts: readonly PublishingAccount[], counts: ReadonlyMap<string, number>): PublishingAccount | null {
  let best: PublishingAccount | null = null;
  for (const account of accounts) {
    const used = counts.get(account.id) ?? 0;
    if (!account.active || used >= account.limit) continue;
    if (!best || used < (counts.get(best.id) ?? 0)) best = account;
  }
  return best;
}

export async function readAccounts(store: DataStore, fresh = false): Promise<PublishingAccount[]> {
  return accountsOf((await platformSetting(store, "publishingAccounts", fresh ? { fresh: true } : undefined))?.value);
}

export interface AccountDeps {
  store: DataStore;
  now: Date;
  /** The publishing team email, the fallback (lib/publishing/service.ts `publishingTeamEmail`). */
  teamEmail: () => Promise<string>;
  /** Emails a new team alert (lib/watch/env.ts `teamMail`); without it the alert is only in the admin's bell. */
  mail?: TeamMail | null;
  /** False: only read the account an app has, never give one. */
  assign?: boolean;
  /** An app was just given to an account: its email gets the app and its one-time steps (lib/publishing/service.ts). */
  assigned?: (app: App, account: PublishingAccount) => Promise<unknown>;
}

/** The email an app's owner invites, and the account it is (null: the team email, while no account has room). */
export async function publishingEmailFor(deps: AccountDeps, app: Pick<App, "id">): Promise<{ email: string; account: PublishingAccount | null }> {
  const { store, now } = deps;
  const accounts = await readAccounts(store);
  const fresh = (await store.getAppById(app.id)) ?? null;
  const fallback = async () => ({ email: await deps.teamEmail(), account: null });
  if (!fresh) return fallback();
  const current = accounts.find((a) => a.id === appAccountId(fresh));
  if (current) return { email: current.email, account: current };
  if (deps.assign === false || accounts.length === 0) return fallback();
  const pick = pickAccount(accounts, accountCounts(await store.listApps()));
  if (!pick) {
    // Every account is full: one alert for the team, and the team email meanwhile.
    await raiseAlert(
      store,
      {
        kind: "publishing_full",
        key: ACCOUNTS_FULL_ALERT,
        title: "Every publishing account is full",
        detail: "New apps show the publishing team email until an account has room. Add an account or raise a limit in Admin › Settings › Publishing accounts.",
        link: "/admin/settings/publishing-accounts",
      },
      now,
      deps.mail,
    );
    return fallback();
  }
  const claim = await store.claimPublishingAccount(fresh.id, pick.id, now);
  await closeAlerts(store, [ACCOUNTS_FULL_ALERT], now);
  const account = accounts.find((a) => a.id === claim.id) ?? pick;
  // Only the call that gave it tells the account.
  if (claim.claimed && deps.assigned) await deps.assigned(fresh, account).catch(() => undefined);
  return { email: account.email, account };
}

/** The team moves an app to another account (null: back to none, given again when next needed). */
export async function moveAppAccount(store: DataStore, appId: string, accountId: string | null, now: Date): Promise<boolean> {
  const app = await store.getAppById(appId);
  if (!app) return false;
  const { publishingAccount: _old, ...rest } = app.rollout ?? {};
  void _old;
  await store.updateApp(appId, { rollout: accountId ? { ...rest, publishingAccount: { id: accountId, at: now.toISOString() } } : rest }, now);
  return true;
}

/** Where an app's publishing notices go: its account's email and the team email, each once. */
export async function noticeEmailsFor(deps: AccountDeps, app: Pick<App, "id">): Promise<string[]> {
  const team = await deps.teamEmail();
  const { email } = await publishingEmailFor(deps, app);
  return [...new Set([email, team].map((e) => e.toLowerCase()))];
}
