import type { Metadata } from "next";
import { describeAccess } from "@/lib/team/service";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  manageClientAction,
  regenerateKeyAction,
  reinstateClientAction,
  releaseClientSiteAction,
  setHostedApiAction,
  suspendClientAction,
} from "@/app/actions/admin";
import { deleteAppUserAction, rerunBuildAction, resendLicenseEmailAction, sendPasswordLinkAction, signOutAppUserAction } from "@/app/actions/admin-clients";
import { BuildBadge } from "@/components/build-status";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, Notice, btn, formatDate, formatDateTime } from "@/components/ui";
import { auditActionLabel } from "@/lib/admin/audit-actions";
import { revealLicenseKey } from "@/lib/admin/clients";
import { contentSource } from "@/lib/admin/labels";
import { can, type AdminPermission } from "@/lib/admin/permissions";
import { appLabel, usesPlugin } from "@/lib/app/label";
import { SETUP_STEPS, stepStatus } from "@/lib/app/setup";
import { requireAdmin } from "@/lib/auth/session";
import { formatAmount } from "@/lib/billing/prices";
import { paymentWhat } from "@/lib/billing/receipt";
import { getStore } from "@/lib/data";
import type { App, Client, License } from "@/lib/data/types";
import { encryptionKey } from "@/lib/env";
import { adminFileHref, artifactLinks, FILES_NOT_CONFIGURED } from "@/lib/files";
import { NOTIFICATION_BODY_MAX, NOTIFICATION_TITLE_MAX } from "@/lib/hosted/notify";
import { signInCodesSentToday } from "@/lib/license/sign-in-codes";
import { ACCOUNT_STATE_LABEL, appState, clientAccountState, type AccountState } from "@/lib/license/status";
import { formatLimit, planName, planNamesOf, type Plan, type PlanInfo } from "@/lib/plans";
import { currentPlanId, scheduledPlan } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { getPlans } from "@/lib/settings/platform";
import { getSwitches, websiteOf, websiteOn } from "@/lib/switches";
import { appTypeName, wordsOf } from "@/lib/app/kinds";
import { BarList, KpiTiles, RetentionTiles } from "@/components/analytics-report";
import { loadReport, rangeFrom } from "@/lib/analytics/report";
import { appZone } from "@/lib/analytics/zone";
import { siteMatch } from "@/lib/app/site-match";
import type { SwitchesSetting } from "@/lib/data/types";
import { ActivateForm, ClientDetailsForm } from "../../forms";
import { countryOptions } from "@/lib/account/country";
import { PAYMENT_STATUS, PAYMENT_TONE } from "../../payments/labels";
import { AppSwitchesForm, ClientNotificationForm, ConnectionCheckForm, WordpressReadyForm } from "./forms";
import { APP_SWITCHES, appSwitches, SWITCH_INFO } from "@/lib/app/switches";
import { connectorOfApp } from "@/lib/hosted/connectors/versions";
import { addStoragePackAction, removeStoragePackAction } from "@/app/actions/admin-clients";
import { packOffers } from "@/lib/media/packs";
import { formatBytes } from "@/lib/media/quota";
import { appStorage } from "@/lib/media/usage";
import { platformSetting } from "@/lib/settings/platform";
import { buildTimeline } from "@/lib/admin/timeline";
import { APP_ERROR_DAYS, APP_ERROR_SOURCE_LABEL } from "@/lib/watch/app-errors";

export const metadata: Metadata = { title: "Client" };
export const dynamic = "force-dynamic";

const DONE: Record<string, string> = {
  // 51 Storage packs added or removed by the team.
  "storage-added": "Storage pack added.",
  "storage-removed": "Storage pack removed.",
  "storage-refused": "The storage pack wasn't changed: check the pack and the date.",
  activated: "Activated. The license key was emailed to the client.",
  renewed: "Saved. The client was emailed the new date.",
  suspended: "Suspended. The plugin now reports the license as suspended.",
  reinstated: "Reinstated.",
  regenerated: "New license key created. The old key no longer works.",
  released: "The license was released from its website.",
  hosted: "The app now uses the hosted API. The client chooses where its content comes from on their Website step; its next build signs customers in through Yallapp.",
  "wordpress-ready": "The app now gets its content from the client's new WordPress site. The client was emailed and sees a notice on their dashboard.",
  unhosted: "The app no longer uses the hosted API. The client chooses a website on their Website step.",
  rerun: "The build is queued again.",
  "signed-out": "The app user was signed out of every device.",
  "user-deleted": "The app user was deleted with their devices and notifications.",
  "license-sent": "The activation email was sent again.",
  "password-sent": "A password link was emailed to the client.",
};

const RERUN_FAILED: Record<string, string> = {
  setup_incomplete: "The build can't run: the app setup isn't complete.",
  license_inactive: "The build can't run: the app's plan isn't active.",
  build_running: "The build can't run: another build is in progress.",
  version_too_low: "The build can't run: a newer version was built since.",
  invalid_config: "The build can't run: some app details aren't valid.",
};

const USERS_PER_PAGE = 10;

function stateTone(state: AccountState) {
  return state === "active" ? "success" : state === "pending" ? "warn" : "danger";
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function Card({
  id,
  title,
  children,
  aside,
  level = 2,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3.5 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading id={id} className="m-0 text-[19px] font-bold">
          {title}
        </Heading>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted">{label}</dt>
          <dd className="m-0 min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** One app of the client with its own license, or the license given before their first app (app null). */
interface Entry {
  key: string;
  app: App | null;
  license: License | null;
}

/** Everything about one client in one place (roadmap 11.2), with a section per app (12.4). */
export default async function ClientPage({ params, searchParams }: PageProps<"/admin/clients/[id]">) {
  const { adminRole } = await requireAdmin();
  const may = (permission: AdminPermission) => can(adminRole, permission);
  const { id } = await params;
  const query = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const store = await getStore();
  const client = await store.getClientById(id);
  const user = client ? await store.getUserById(client.userId) : null;
  if (!client || !user) notFound();
  const now = new Date();
  const [apps, licenses, payments, plans, switches, audit] = await Promise.all([
    store.listAppsByClient(client.id),
    store.listLicensesByClient(client.id),
    store.listPlanPayments({ clientId: client.id, limit: 50 }),
    getPlans(store),
    getSwitches(store),
    store.listAuditEntries({ clientId: client.id, offset: 0, limit: 20 }),
  ]);
  // 60 The people who work with the client, read-only.
  const [team, invitations] = await Promise.all([store.listTeamMembers(client.id), store.listOpenTeamInvitations(client.id)]);
  const account = clientAccountState(client, licenses, now);
  const entries: Entry[] = apps.map((app) => ({ key: app.id, app, license: licenses.find((l) => l.appId === app.id) ?? null }));
  const unassigned = licenses.find((l) => l.appId === null);
  // A license given before the account's first app, or nothing at all yet: one section without an app.
  if (unassigned || entries.length === 0) entries.push({ key: "account", app: null, license: unassigned ?? null });
  const done = typeof query.done === "string" ? DONE[query.done] : undefined;
  const rerunFailed = typeof query.rerun === "string" ? RERUN_FAILED[query.rerun] : undefined;
  const appNames = new Map(apps.map((a) => [a.id, appLabel(a)]));
  const usersApp = typeof query.app === "string" ? query.app : null;
  // 78.4 What went wrong for the client's apps, and everything in one timeline.
  const [errors, notices, milestones, builds, publishing] = await Promise.all([
    store.listAppErrors({ clientId: client.id, limit: 50 }),
    store.listOwnerNotices({ clientId: client.id, limit: 50 }),
    store.listClientMilestones(client.id),
    Promise.all(apps.map((a) => store.listBuildsByApp(a.id, 20))).then((lists) => lists.flat()),
    Promise.all(apps.map(async (a) => ({ appId: a.id, events: await store.listPublishingEvents(a.id) }))),
  ]);
  const timeline = buildTimeline({ appNames, builds, errors, notices, payments, milestones, publishing, audit: audit.items });

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/clients" className="flex items-center gap-1 text-sm font-semibold no-underline">
          <Icon name="arrow_back" size={18} />
          Clients
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-[28px] font-extrabold">{user.name}</h1>
          <Badge tone={stateTone(account)}>{ACCOUNT_STATE_LABEL[account]}</Badge>
        </div>
        <span className="text-[15px] text-muted">
          {apps.length === 0 ? "No app yet" : apps.length === 1 ? "1 app" : `${apps.length} apps, each with its own plan and license`}
        </span>
      </div>

      {done ? (
        <Notice tone="success" icon="check_circle" role="status">
          {done}
        </Notice>
      ) : null}
      {rerunFailed ? (
        <Notice tone="danger" icon="error" role="alert">
          {rerunFailed}
        </Notice>
      ) : null}

      <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
        <Card id="h-profile" title="Profile and contact">
          <Facts
            rows={[
              ["Email", <a key="e" href={`mailto:${user.email}`}>{user.email}</a>],
              ["WhatsApp", <a key="w" href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}`}>{client.whatsapp}</a>],
              ["Website", client.siteUrl],
              ["Signed up", formatDate(client.createdAt)],
              ["Last sign-in", formatDateTime(user.lastSignInAt)],
              ["Password", user.passwordHash ? "Set" : "Not set yet"],
            ]}
          />
          {may("clients.edit") ? (
            <details className="border-t border-line-soft pt-3.5">
              <summary className="cursor-pointer text-sm font-semibold">Edit details</summary>
              <div className="pt-3">
                <ClientDetailsForm clientId={client.id} name={user.name} whatsapp={client.whatsapp} siteUrl={client.siteUrl} country={client.country ?? null} countries={countryOptions("en")} />
              </div>
            </details>
          ) : null}
          {may("clients.email") ? (
            <div className="flex flex-wrap gap-2 border-t border-line-soft pt-3.5">
              <form action={sendPasswordLinkAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                  Email a password link
                </SubmitButton>
              </form>
            </div>
          ) : null}
        </Card>

        <Card id="h-account" title="Account">
          <Facts
            rows={[
              ["State", ACCOUNT_STATE_LABEL[account]],
              [
                "Apps",
                apps.length ? (
                  <ul key="a" className="m-0 flex list-none flex-col gap-1 p-0">
                    {entries
                      .filter((e) => e.app)
                      .map((e) => {
                        const state = appState(client, e.license, now);
                        return (
                          <li key={e.key} className="flex flex-wrap items-center gap-2">
                            <a href={`#app-${e.key}`} className="font-semibold">
                              {appLabel(e.app)}
                            </a>
                            <Badge tone={stateTone(state)}>{ACCOUNT_STATE_LABEL[state]}</Badge>
                            <span className="text-muted">{e.license ? `${planName(e.license.plan, plans)} until ${formatDate(e.license.expiresAt)}` : "No plan yet"}</span>
                          </li>
                        );
                      })}
                  </ul>
                ) : (
                  "None yet: the client hasn't chosen an app type."
                ),
              ],
            ]}
          />
          {client.paymentNote ? (
            <div className="flex flex-col gap-1 border-t border-line-soft pt-3.5">
              <span className="text-sm font-semibold">Payment notes</span>
              <p className="m-0 text-[13px] leading-relaxed whitespace-pre-wrap text-ink-4">{client.paymentNote}</p>
            </div>
          ) : null}
          {account !== "pending" && may("clients.suspend") ? (
            <div className="flex flex-col gap-1.5 border-t border-line-soft pt-3.5">
              <form action={client.status === "suspended" ? reinstateClientAction : suspendClientAction}>
                <input type="hidden" name="clientId" value={client.id} />
                <input type="hidden" name="from" value="client" />
                <SubmitButton variant={client.status === "suspended" ? "secondary" : "danger"} className="h-9 px-3 text-sm">
                  {client.status === "suspended" ? "Reinstate" : "Suspend"}
                </SubmitButton>
              </form>
              <span className="text-xs text-muted">Suspending pauses every app of the account and its plugin connections.</span>
            </div>
          ) : null}
        </Card>
      </div>

      {entries.map((entry) => (
        <AppEntry
          key={entry.key}
          client={client}
          entry={entry}
          several={apps.length > 1}
          now={now}
          plans={plans}
          switches={switches}
          usersQuery={usersApp === null || usersApp === entry.key ? (typeof query.users === "string" ? query.users.slice(0, 100) : "") : ""}
          usersPage={usersApp === null || usersApp === entry.key ? Math.max(1, Number(query.page) || 1) : 1}
          may={{ license: may("clients.license"), edit: may("clients.edit"), email: may("clients.email"), builds: may("builds.manage"), switches: may("switches.edit") }}
        />
      ))}

      <div className="grid items-start gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
        <Card id="h-payments" title="Payments">
          {payments.length === 0 ? (
            <p className="m-0 text-sm text-muted">No card payments.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[13px]">
              {payments.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge tone={PAYMENT_TONE[p.status]}>{PAYMENT_STATUS[p.status]}</Badge>
                  <span>
                    {formatAmount(p.amountCents, p.currency)} · {paymentWhat(p, planName(p.plan, plans))} ·{" "}
                    {formatDateTime(p.paidAt ?? p.createdAt)}
                    {apps.length > 1 ? ` · ${p.appId ? (appNames.get(p.appId) ?? "Deleted app") : "Before the first app"}` : ""}
                  </span>
                  {/* 71 The receipt the client got, as a PDF. */}
                  {p.status === "paid" ? (
                    <a href={`/admin/payments/${p.id}/pdf`} download className="inline-flex items-center gap-1 font-semibold">
                      <Icon name="download" size={16} />
                      Receipt PDF
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card id="h-setup-request" title="Set-up requests">
          {apps.some((a) => a.setupRequestedAt) ? (
            <div className="flex flex-col gap-3">
              {apps
                .filter((a) => a.setupRequestedAt)
                .map((a) => (
                  <Facts
                    key={a.id}
                    rows={[
                      ...(apps.length > 1 ? ([["App", appLabel(a)]] as [string, React.ReactNode][]) : []),
                      ["Asked", formatDate(a.setupRequestedAt)],
                      ["Waiting", a.backend === "setup_requested" ? "Yes: the client waits for their WordPress site" : "No: they chose a website since"],
                      ["Note", a.setupNote || "None"],
                    ]}
                  />
                ))}
            </div>
          ) : (
            <p className="m-0 text-sm text-muted">No WordPress set-up requests.</p>
          )}
        </Card>
      </div>

      <Card id="h-client-team" title="The client's team">
        {team.length === 0 && invitations.length === 0 ? (
          <p className="m-0 text-sm text-muted">Only the owner works on this account.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm" data-testid="client-team">
            {team.map(({ member, user: person }) => (
              <li key={person.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line-soft pb-2 last:border-b-0">
                <span className="font-semibold">{person.name}</span>
                <span className="text-muted">{person.email}</span>
                <span>{describeAccess(member, apps)}</span>
                <span className="text-muted">
                  joined {formatDate(member.createdAt)} · {person.lastSignInAt ? `last signed in ${formatDate(person.lastSignInAt)}` : "hasn't signed in"}
                </span>
              </li>
            ))}
            {invitations.map((i) => (
              <li key={i.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-line-soft pb-2 last:border-b-0">
                <span className="font-semibold">{i.name}</span>
                <span className="text-muted">{i.email}</span>
                <span>{describeAccess(i, apps)}</span>
                <span className="text-muted">
                  invited {formatDate(i.sentAt)} · {i.expiresAt.getTime() <= now.getTime() ? "expired" : `link works until ${formatDate(i.expiresAt)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card id="h-errors" title={errors.length ? `Errors (${errors.length})` : "Errors"}>
        {errors.length === 0 ? (
          <p className="m-0 text-sm text-muted">Nothing failed for this client&apos;s apps in the last {APP_ERROR_DAYS} days.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <caption className="sr-only">Errors of the client&apos;s apps</caption>
              <thead>
                <tr className="text-left text-muted">
                  <th scope="col" className="py-2 pe-3 font-semibold">What</th>
                  <th scope="col" className="py-2 pe-3 font-semibold">App</th>
                  <th scope="col" className="py-2 pe-3 text-right font-semibold">Times</th>
                  <th scope="col" className="py-2 font-semibold">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((e) => (
                  <tr key={e.id} className="border-t border-line-soft align-top">
                    <th scope="row" className="py-2 pe-3 text-left font-normal">
                      <span className="font-semibold">
                        {APP_ERROR_SOURCE_LABEL[e.source]}: {e.code}
                      </span>
                      <span className="block text-muted">{e.message}</span>
                    </th>
                    <td className="py-2 pe-3">{e.appId ? (appNames.get(e.appId) ?? "A deleted app") : "The account"}</td>
                    <td className="py-2 pe-3 text-right tabular-nums">{e.count}</td>
                    <td className="py-2 tabular-nums">{formatDateTime(e.lastAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card id="h-timeline" title="Timeline">
        {timeline.length === 0 ? (
          <p className="m-0 text-sm text-muted">Nothing yet.</p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {timeline.map((t, i) => (
              <li key={`${t.kind}-${t.at.getTime()}-${i}`} className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-line-soft pt-2 first:border-t-0 first:pt-0">
                <span className="text-muted tabular-nums">{formatDateTime(t.at)}</span>
                <span className={`font-semibold ${t.tone === "bad" ? "text-danger" : t.tone === "good" ? "text-success" : ""}`}>{t.title}</span>
                {t.app ? <span className="text-muted">{t.app}</span> : null}
                {t.detail ? <span className="basis-full">{t.detail}</span> : null}
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card
        id="h-audit"
        title="Changes by the team"
        aside={
          <Link href={`/admin/audit?client=${client.id}`} className="text-sm font-semibold">
            All of this client&apos;s changes
          </Link>
        }
      >
        {audit.items.length === 0 ? (
          <p className="m-0 text-sm text-muted">No changes logged yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {audit.items.map((e) => (
              <li key={e.id} className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-line-soft pt-2 first:border-t-0 first:pt-0">
                <span className="text-muted">{formatDateTime(e.at)}</span>
                <span className="font-semibold">{auditActionLabel(e.action)}</span>
                <span>{e.summary}</span>
                <span className="text-muted">by {e.actorEmail}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

/** One app of the client: its plan and license, the app, its builds and (on the hosted API) its users. */
async function AppEntry({
  client,
  entry,
  several,
  now,
  plans,
  switches,
  usersQuery,
  usersPage,
  may,
}: {
  client: Client;
  entry: Entry;
  several: boolean;
  now: Date;
  plans: Record<Plan, PlanInfo>;
  switches: SwitchesSetting | null;
  usersQuery: string;
  usersPage: number;
  may: { license: boolean; edit: boolean; email: boolean; builds: boolean; switches: boolean };
}) {
  const store = await getStore();
  const { app, license } = entry;
  const [activation, builds] = await Promise.all([
    license ? store.getActivation(license.id) : Promise.resolve(null),
    app ? store.listBuildsByApp(app.id, 20) : Promise.resolve([]),
  ]);
  const state = appState(client, license, now);
  // 13.2 App users against the plan's limit (hosted apps; WordPress sites keep their own users).
  const effective = await effectivePlans(store);
  const currentPlan = license ? effective[currentPlanId(license, now)] : null;
  const scheduled = scheduledPlan(license, now);
  const appUsers = app?.backend === "hosted" ? await store.countHostedUsers(app.id) : null;
  // 18 Sign-in codes the plugin had Yallapp send today: an aggregate count, nothing about who.
  const codesToday = license && activation ? await signInCodesSentToday(store, license.id, now) : null;
  // 30 What the site runs, when its plugin reports it, and whether the app's type fits it.
  const site = activation && app ? siteMatch(app, activation) : null;
  const userLimit = currentPlan?.limits.appUsers ?? null;
  const base = license && license.expiresAt > now ? license.expiresAt : now;
  const nextYear = new Date(base);
  nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);
  const steps = stepStatus(app, license?.plan ?? null);
  const headingId = `h-app-${entry.key}`;
  const appField = app ? <input type="hidden" name="appId" value={app.id} /> : null;
  const typeName = app ? appTypeName(app) : null;

  return (
    <section id={`app-${entry.key}`} aria-labelledby={headingId} className="flex flex-col gap-4 rounded-[20px] border border-line bg-sand/50 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3 px-1">
        <h2 id={headingId} className="m-0 text-[22px] font-extrabold">
          {app ? appLabel(app) : "No app yet"}
        </h2>
        <Badge tone={stateTone(state)}>{ACCOUNT_STATE_LABEL[state]}</Badge>
        {typeName ? <span className="text-sm text-muted">{typeName}</span> : null}
      </div>

      <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
        <Card id={`h-plan-${entry.key}`} title="Plan and license" level={3}>
          <Facts
            rows={[
              [
                "Plan",
                license
                  ? `${currentPlan?.name ?? planName(license.plan, plans)} until ${formatDate(license.expiresAt)}${scheduled ? `, then ${effective[scheduled.plan].name}` : ""}`
                  : "Not activated",
              ],
              [
                "App users",
                appUsers === null ? (
                  "On their website (no limit)"
                ) : (
                  <span key="u" data-usage="" className={userLimit !== null && appUsers >= userLimit ? "font-bold text-danger" : undefined}>
                    {formatLimit(appUsers)}
                    {userLimit === null ? " (no limit)" : ` / ${formatLimit(userLimit)}`}
                  </span>
                ),
              ],
              ...(codesToday === null ? [] : [["Sign-in codes sent today", `${codesToday} by Yallapp (UTC day)`] as [string, string]]),
              ["License", license ? <span key="k" className="font-mono text-[13px] break-all">{revealLicenseKey(license, encryptionKey())}</span> : "None yet"],
              [
                "Plugin",
                activation
                  ? `${activation.siteUrl} · plugin ${activation.pluginVersion} · checked ${formatDateTime(activation.lastCheckedAt)}`
                  : "Not activated on a website",
              ],
              // 83.4 The hosted API's connector and its version.
              ...(app && connectorOfApp(app)
                ? [["Connector", `${connectorOfApp(app)!.name} · connector ${connectorOfApp(app)!.version} · ${connectorOfApp(app)!.api}`] as [string, string]]
                : []),
              // 30 What the site runs beside the plugin, when the plugin reports it.
              ...(site?.reported
                ? [
                    [
                      "Website runs",
                      `${site.runs.join(", ") || "No course, shop or booking plugin"}${site.warning && app ? ` · doesn't fit the app type (${appTypeName(app)})` : ""}${adapterVersions(app)}`,
                    ] as [string, string],
                  ]
                : []),
            ]}
          />
          {state !== "suspended" && may.license ? (
            <div className="border-t border-line-soft pt-3.5">
              <ActivateForm
                clientId={client.id}
                appId={app?.id ?? null}
                plan={license?.plan ?? "pro"}
                activeUntil={isoDate(nextYear)}
                pending={!license}
                planNames={planNamesOf(plans)}
                from="client"
              />
            </div>
          ) : null}
          {(activation && may.license) || (license && (may.license || may.email)) ? (
            <div className="flex flex-wrap gap-2 border-t border-line-soft pt-3.5">
              {activation && may.license ? (
                <form action={releaseClientSiteAction}>
                  <input type="hidden" name="clientId" value={client.id} />
                  {appField}
                  <input type="hidden" name="from" value="client" />
                  <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                    Release website
                  </SubmitButton>
                </form>
              ) : null}
              {license && may.license ? (
                <form action={regenerateKeyAction}>
                  <input type="hidden" name="clientId" value={client.id} />
                  {appField}
                  <input type="hidden" name="from" value="client" />
                  <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                    New license key
                  </SubmitButton>
                </form>
              ) : null}
              {license && may.email ? (
                <form action={resendLicenseEmailAction}>
                  <input type="hidden" name="clientId" value={client.id} />
                  {appField}
                  <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                    {/* 75 An app without WordPress gets its activation email without the key. */}
                    {usesPlugin(app) ? "Email the license key again" : "Email the activation again"}
                  </SubmitButton>
                </form>
              ) : null}
            </div>
          ) : null}
        </Card>

        <AppCard
          clientId={client.id}
          app={app}
          cardId={`h-appinfo-${entry.key}`}
          stepsDone={SETUP_STEPS.filter((s) => steps[s]).length}
          websiteSwitchedOff={app ? !websiteOn(switches, websiteOf(app), license?.plan ?? null) : false}
          activatedSite={activation?.siteUrl ?? null}
          several={several}
          may={{ edit: may.edit }}
        />
      </div>

      {app ? (
        <Card id={`h-builds-${entry.key}`} title="Builds" level={3}>
          {builds.length === 0 ? (
            <p className="m-0 text-sm text-muted">No builds yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="bg-sand text-left text-muted">
                    <th scope="col" className="px-3 py-2.5 font-semibold">Build</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Queued</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Status</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Files</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {builds.map((build, i) => {
                    const links = artifactLinks(build.artifacts, now);
                    return (
                      <tr key={build.id} className="border-t border-line-soft">
                        <td className="px-3 py-2.5">
                          #{build.number} · {build.versionName} ({build.versionCode}){build.autoPublish ? " · auto-publish" : ""}
                        </td>
                        <td className="px-3 py-2.5">{formatDateTime(build.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <BuildBadge status={build.status} />
                          {build.message ? <span className="mt-1 block text-xs text-muted">{build.message}</span> : null}
                        </td>
                        <td className="px-3 py-2.5">
                          {links.length === 0 ? (
                            <span className="text-muted">None</span>
                          ) : (
                            <span className="flex flex-col gap-0.5">
                              {links.map((link, n) =>
                                link.href ? (
                                  <a key={`${link.kind}-${n}`} href={adminFileHref(build.id, link.kind)}>
                                    {link.label}
                                  </a>
                                ) : (
                                  <span key={`${link.kind}-${n}`} className="text-muted" title={FILES_NOT_CONFIGURED}>
                                    {link.label}
                                  </span>
                                ),
                              )}
                            </span>
                          )}
                          {build.logUrl ? (
                            <a href={build.logUrl} className="block text-xs">
                              Build log
                            </a>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5">
                          {i === 0 && (build.status === "failed" || build.status === "ready") && may.builds ? (
                            <form action={rerunBuildAction}>
                              <input type="hidden" name="clientId" value={client.id} />
                              {appField}
                              <input type="hidden" name="buildId" value={build.id} />
                              <SubmitButton variant="secondary" className="h-8 px-3 text-[13px]" pendingText="Queuing…">
                                Run again
                              </SubmitButton>
                            </form>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}

      {app ? <AnalyticsCard app={app} now={now} /> : null}
      {app ? (
        <Card id={`h-switches-${entry.key}`} title="App switches" level={3}>
          <p className="m-0 text-sm text-muted">Modules and new features for this app only, without a new build. Everything is on unless switched off here.</p>
          {may.switches ? (
            <AppSwitchesForm
              clientId={client.id}
              appId={app.id}
              switches={APP_SWITCHES.map((name) => ({ name, ...SWITCH_INFO[name], on: appSwitches(app)[name] }))}
            />
          ) : (
            <ul className="m-0 pl-5 text-sm">
              {APP_SWITCHES.map((name) => (
                <li key={name}>
                  {SWITCH_INFO[name].label}: {appSwitches(app)[name] ? "on" : "off"}
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}
      {app ? <StorageCard clientId={client.id} app={app} until={license?.expiresAt ?? null} now={now} may={{ edit: may.license }} /> : null}

      {app?.backend === "hosted" ? (
        <HostedSection clientId={client.id} app={app} q={usersQuery} page={usersPage} may={{ edit: may.edit }} />
      ) : null}
    </section>
  );
}

function AppCard({
  clientId,
  app,
  cardId,
  stepsDone,
  websiteSwitchedOff,
  activatedSite,
  several,
  may,
}: {
  clientId: string;
  app: App | null;
  cardId: string;
  stepsDone: number;
  websiteSwitchedOff: boolean;
  /** Where the app's license is active (normalized, without https). */
  activatedSite: string | null;
  several: boolean;
  may: { edit: boolean };
}) {
  const manage = may.edit ? (
    <form action={manageClientAction}>
      <input type="hidden" name="clientId" value={clientId} />
      {app ? <input type="hidden" name="appId" value={app.id} /> : null}
      <SubmitButton className="h-10 px-4 text-sm">
        <Icon name="edit" size={18} />
        <span>
          Edit their app settings{several && app ? <span className="sr-only"> for {appLabel(app)}</span> : null}
        </span>
      </SubmitButton>
    </form>
  ) : null;
  if (!app) {
    return (
      <Card id={cardId} title="App" aside={manage} level={3}>
        <p className="m-0 text-sm text-muted">No app yet: the client hasn&apos;t chosen an app type.</p>
      </Card>
    );
  }
  const typeName = appTypeName(app);
  return (
    <Card id={cardId} title="App" aside={manage} level={3}>
      {websiteSwitchedOff ? (
        <Notice tone="warn" icon="warning">
          This app&apos;s website or platform is switched off for new apps. The app keeps working with it.
        </Notice>
      ) : null}
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        <Facts
          rows={[
            ["Type", typeName],
            ["Name", app.appName ? `${app.appName}${app.shortName ? ` (${app.shortName})` : ""}` : "Not set"],
            ["Android package", app.androidPackage ?? "Not set"],
            ["iOS bundle ID", app.iosBundleId ?? "Not set"],
            ["Setup", `${stepsDone} of ${SETUP_STEPS.length} steps`],
            ["Added", formatDate(app.createdAt)],
          ]}
        />
        <Facts
          rows={[
            [
              "Look",
              <span key="l" className="flex flex-wrap items-center gap-2">
                <span className="inline-block h-4 w-4 rounded border border-line" style={{ background: app.primaryColor }} aria-hidden="true" />
                {app.primaryColor} · {app.template} template · {app.font}
              </span>,
            ],
            ["Content from", contentSource(app)],
            ["API address", app.backend === "custom_api" ? (app.apiBaseUrl ?? "Not set") : app.siteUrl ?? "None"],
          ]}
        />
      </div>
      <div className="flex flex-col gap-2 border-t border-line-soft pt-3.5">
        <span className="text-sm font-semibold">Connection</span>
        <ConnectionCheckForm clientId={clientId} appId={app.id} />
      </div>
      {app.backend === "setup_requested" && may.edit ? (
        <div className="flex flex-col gap-2 border-t border-line-soft pt-3.5">
          <span className="text-sm font-semibold">WordPress set-up</span>
          <WordpressReadyForm clientId={clientId} appId={app.id} siteUrl={activatedSite ? `https://${activatedSite}` : (app.siteUrl ?? "")} />
        </div>
      ) : null}
      {may.edit ? (
        <form action={setHostedApiAction} className="border-t border-line-soft pt-3.5">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="appId" value={app.id} />
          <input type="hidden" name="hosted" value={app.backend === "hosted" ? "0" : "1"} />
          <input type="hidden" name="from" value="client" />
          <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
            {app.backend === "hosted" ? "Stop the hosted API" : "Use the hosted API"}
          </SubmitButton>
        </form>
      ) : null}
    </Card>
  );
}

/** 51 The app's Media library: what it takes of its storage, and its storage packs (added here when paid another way). */
async function StorageCard({ clientId, app, until, now, may }: { clientId: string; app: App; until: Date | null; now: Date; may: { edit: boolean } }) {
  const store = await getStore();
  const [usage, setting] = await Promise.all([appStorage(store, app, await effectivePlans(store), now), platformSetting(store, "storagePacks")]);
  const offers = packOffers(setting?.value);
  return (
    <Card id={`h-storage-${app.id}`} title="Media storage" level={3}>
      <p className="m-0 text-sm" data-admin-storage="">
        {formatBytes(usage.usedBytes)} used of {usage.limitBytes === null ? "unlimited" : formatBytes(usage.limitBytes)}
        {usage.over ? " · over: uploads paused" : ""}
      </p>
      {usage.packs.length ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {usage.packs.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span>
                +{p.gb} GB until {formatDate(p.activeUntil)} {p.activeUntil.getTime() <= now.getTime() ? "(ended)" : ""} · {p.paymentId ? "paid by card" : "added by the team"}
              </span>
              {may.edit ? (
                <form action={removeStoragePackAction}>
                  <input type="hidden" name="clientId" value={clientId} />
                  <input type="hidden" name="appId" value={app.id} />
                  <input type="hidden" name="packId" value={p.id} />
                  <SubmitButton variant="secondary" className="h-8 px-3 text-sm">
                    Remove
                  </SubmitButton>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-muted">No storage packs.</p>
      )}
      {may.edit ? (
        <form action={addStoragePackAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="clientId" value={clientId} />
          <input type="hidden" name="appId" value={app.id} />
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Pack
            <select name="offer" className="input input-sm">
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  +{o.gb} GB
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Until
            <input type="date" name="until" defaultValue={until ? until.toISOString().slice(0, 10) : ""} className="input input-sm" />
          </label>
          <SubmitButton variant="secondary" className="h-10 px-3 text-sm">
            Add storage pack
          </SubmitButton>
        </form>
      ) : null}
    </Card>
  );
}

/** 44 The app's usage over the last 30 days, as its owner sees it on Analytics: totals only. */
async function AnalyticsCard({ app, now }: { app: App; now: Date }) {
  const store = await getStore();
  // 47 In the owner's time zone, as they see it.
  const zone = await appZone(store, app);
  const report = await loadReport(store, app.id, rangeFrom({ range: "30" }, now, zone), now, zone);
  const items = wordsOf(app).items;
  return (
    <Card id={`h-analytics-${app.id}`} title="Analytics, last 30 days" level={3}>
      {report.hasData ? (
        <>
          <KpiTiles report={report} />
          <RetentionTiles report={report} />
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(260px,100%),1fr))]">
            <div className="flex flex-col gap-2">
              <h4 className="m-0 text-sm font-bold">Platforms</h4>
              <BarList items={report.platforms} label="Platforms" />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="m-0 text-sm font-bold">Top {items}</h4>
              {report.items.length === 0 ? (
                <p className="m-0 text-sm text-muted">None opened yet.</p>
              ) : (
                <ol className="m-0 flex flex-col gap-1 pl-5 text-sm">
                  {report.items.slice(0, 5).map((item) => (
                    <li key={`${item.kind}:${item.id}`}>
                      {item.title} <span className="text-muted">· {item.views} views</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="m-0 text-sm text-muted">No usage yet. The app sends it from its first build made after Analytics arrived, once people open it.</p>
      )}
    </Card>
  );
}

async function HostedSection({ clientId, app, q, page, may }: { clientId: string; app: App; q: string; page: number; may: { edit: boolean } }) {
  const store = await getStore();
  const [total, users, sent] = await Promise.all([
    store.countHostedUsers(app.id),
    store.listHostedUsers({ appId: app.id, query: q, offset: (page - 1) * USERS_PER_PAGE, limit: USERS_PER_PAGE }),
    store.listHostedBroadcasts(app.id, 10),
  ]);
  const pages = Math.max(1, Math.ceil(users.total / USERS_PER_PAGE));
  const anchor = `app-users-${app.id}`;
  const pageUrl = (n: number) => `/admin/clients/${clientId}?${new URLSearchParams({ app: app.id, ...(q ? { users: q } : {}), page: String(n) })}#${anchor}`;
  return (
    <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(420px,100%),1fr))]">
      <section id={anchor} aria-labelledby={`h-${anchor}`} className="flex min-w-0 flex-col gap-3.5 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h3 id={`h-${anchor}`} className="m-0 text-[19px] font-bold">
          App users ({total})
        </h3>
        <form role="search" action={`/admin/clients/${clientId}#${anchor}`} className="flex gap-2">
          <input type="hidden" name="app" value={app.id} />
          <label className="flex-1">
            <span className="sr-only">Search app users</span>
            <input name="users" type="search" defaultValue={q} placeholder="Name, phone or email" className="input input-sm" />
          </label>
          <button type="submit" className={`${btn.secondary} h-11 px-3`} aria-label="Search app users">
            <Icon name="search" size={20} />
          </button>
        </form>
        {users.items.length === 0 ? (
          <p className="m-0 text-sm text-muted">{q ? `No app users match “${q}”.` : "No app users yet."}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0 text-sm">
            {users.items.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line-soft py-2.5 first:border-t-0">
                <span className="flex min-w-0 flex-[1_1_200px] flex-col">
                  <span className="font-semibold">{u.name}</span>
                  <span className="text-xs text-muted">
                    {u.phone}
                    {u.email ? ` · ${u.email}` : ""} · joined {formatDate(u.createdAt)}
                  </span>
                </span>
                {may.edit ? (
                  <span className="flex gap-2">
                    <form action={signOutAppUserAction}>
                      <input type="hidden" name="clientId" value={clientId} />
                      <input type="hidden" name="appId" value={app.id} />
                      <input type="hidden" name="userId" value={u.id} />
                      <SubmitButton variant="secondary" className="h-8 px-3 text-[13px]">
                        <span>
                          Sign out<span className="sr-only"> {u.name}</span>
                        </span>
                      </SubmitButton>
                    </form>
                    <form action={deleteAppUserAction}>
                      <input type="hidden" name="clientId" value={clientId} />
                      <input type="hidden" name="appId" value={app.id} />
                      <input type="hidden" name="userId" value={u.id} />
                      <SubmitButton variant="danger" className="h-8 px-3 text-[13px]">
                        <span>
                          Delete<span className="sr-only"> {u.name}</span>
                        </span>
                      </SubmitButton>
                    </form>
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {pages > 1 ? (
          <nav aria-label="App user pages" className="flex items-center gap-3 text-sm">
            {page > 1 ? <Link href={pageUrl(page - 1)}>Newer</Link> : null}
            <span className="text-muted">
              Page {page} of {pages}
            </span>
            {page < pages ? <Link href={pageUrl(page + 1)}>Older</Link> : null}
          </nav>
        ) : null}
      </section>

      <Card id={`h-notifications-${app.id}`} title="Notifications" level={3}>
        {sent.length === 0 ? (
          <p className="m-0 text-sm text-muted">None sent yet.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
            {sent.map((n) => (
              <li key={n.id} className="flex flex-col border-t border-line-soft pt-2 first:border-t-0 first:pt-0">
                <span className="font-semibold">{n.title}</span>
                <span className="text-ink-4">{n.body}</span>
                <span className="text-xs text-muted">{formatDateTime(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        {may.edit ? (
          <div className="border-t border-line-soft pt-3.5">
            <ClientNotificationForm clientId={clientId} appId={app.id} titleMax={NOTIFICATION_TITLE_MAX} bodyMax={NOTIFICATION_BODY_MAX} />
          </div>
        ) : null}
      </Card>
    </div>
  );
}

/** 83.4 The versions of the plugin's adapters the site uses, as the plugin last reported them. */
function adapterVersions(app: App | null): string {
  const adapters = app?.hostedSettings?.siteAdapters;
  if (!adapters) return "";
  const names = { lms: "courses", bookings: "bookings", store: "shop" } as const;
  const list = (Object.keys(names) as (keyof typeof names)[]).filter((k) => adapters[k]).map((k) => `${names[k]} adapter ${adapters[k]}`);
  return list.length ? ` · ${list.join(", ")}` : "";
}
