import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { Notice } from "@/components/ui";
import { openPublishingCount } from "@/lib/publishing/steps";
import {
  appsByState,
  appsByType,
  appsByWebsite,
  buildStats,
  clientsByState,
  hostedUsage,
  revenue,
  revenueWindowStart,
  signUpsSince,
  withoutDemo,
} from "@/lib/admin/overview";
import { demoClientId } from "@/lib/demo/apps";
import { requireAdmin } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { CatalogCurrency } from "@/lib/data/types";
import { ACCOUNT_STATE_LABEL } from "@/lib/license/status";
import { APP_TYPE_SWITCHES, switchGroups } from "@/lib/switches";

export const metadata: Metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

/** Links from before the client list had its own page. */
const CLIENT_LIST_PARAMS = ["q", "client", "filter", "add", "done"];

function Stat({ label, value, href, hint, icon, tone = "neutral" }: { label: string; value: string | number; href?: string; hint?: string; icon?: IconName; tone?: Tone }) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-muted">{label}</span>
        {icon ? (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
            <Icon name={icon} size={18} />
          </span>
        ) : null}
      </span>
      <span className="text-[26px] leading-tight font-extrabold tabular-nums">{value}</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </>
  );
  const box = "flex min-w-0 flex-col gap-1.5 rounded-2xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(16,14,40,0.04)]";
  return href ? (
    <Link href={href} className={`${box} text-midnight no-underline hover:border-midnight hover:text-midnight`}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="m-0 text-[19px] font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

const grid = "grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr))]";
/** Rows that fill: so many cards a row on wide screens, fewer on narrow ones. */
const cols = { 3: "grid grid-cols-1 gap-3 sm:grid-cols-3", 4: "grid grid-cols-2 gap-3 lg:grid-cols-4", 5: "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5", 6: "grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" } as const;

type Tone = "neutral" | "warn" | "danger" | "success" | "info";
const TONES: Record<Tone, string> = {
  neutral: "bg-sand text-ink-3",
  warn: "bg-peach-soft text-ember",
  danger: "bg-danger-bg text-danger",
  success: "bg-success-bg text-success",
  info: "bg-sand text-midnight",
};

/** Something waiting for the team: its count and where to handle it. */
function Waiting({ items }: { items: { label: string; count: number; href: string; icon: IconName }[] }) {
  const open = items.filter((i) => i.count > 0);
  return (
    <section aria-labelledby="h-waiting" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
      <h2 id="h-waiting" className="m-0 flex items-center gap-2 text-[17px] font-bold">
        <Icon name="task_alt" size={20} />
        Needs attention
      </h2>
      {open.length === 0 ? (
        <p className="m-0 flex items-center gap-2 text-[15px] text-success">
          <Icon name="check_circle" size={20} filled />
          Nothing is waiting for the team.
        </p>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(240px,100%),1fr))]">
          {open.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-2.5 text-ink no-underline hover:border-midnight hover:text-midnight">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-peach-soft text-ember">
                  <Icon name={i.icon} size={19} />
                </span>
                <span className="min-w-0 flex-1 text-[14px] font-semibold">{i.label}</span>
                <span className="rounded-full bg-ember px-2 py-0.5 text-[12px] font-bold text-white tabular-nums">{i.count}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function money(cents: number | undefined, currency: CatalogCurrency): string {
  return formatCents(cents ?? 0, currency);
}

/** The admin's first page (roadmap 11.1): clients, revenue, builds and apps, counted from the data. */
export default async function OverviewPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const params = await searchParams;
  if (CLIENT_LIST_PARAMS.some((name) => typeof params[name] === "string")) {
    const search = new URLSearchParams();
    for (const name of CLIENT_LIST_PARAMS) if (typeof params[name] === "string") search.set(name, params[name] as string);
    redirect(`/admin/clients?${search}`);
  }
  const denied = typeof params.denied === "string";

  const store = await getStore();
  const now = new Date();
  const [allRows, allApps, builds, payments, orders, usersByApp, demoId, publishing, deletions, deletedApps, alerts] = await Promise.all([
    store.listClients({ filter: "all", now }),
    store.listApps(),
    store.listBuildsSince(new Date(now.getTime() - 7 * 86_400_000)),
    store.listPaidPlanPaymentsSince(revenueWindowStart(now)),
    store.listMarketplaceOrdersSince(revenueWindowStart(now)),
    store.countHostedUsersByApp(),
    demoClientId(store),
    store.listManagedPublishingRequests(),
    store.listAccountDeletionRequests(["pending"], 200),
    store.listAppDeletions({ statuses: ["waiting"], limit: 200 }),
    store.countOpenTeamAlerts(),
  ]);
  // 16 The demo apps (Admin › Demo apps) aren't clients' apps.
  const { rows, apps } = withoutDemo(allRows, allApps, demoId);
  const states = clientsByState(rows, now);
  // 12: an account can have several apps, each on its own plan.
  const appStates = appsByState(rows, now);
  const money12 = revenue(payments, orders, now);
  const buildsWeek = buildStats(builds, now, 7);
  const hosted = hostedUsage(apps, usersByApp);
  const typeNames = new Map(APP_TYPE_SWITCHES.map((t) => [t.id, t.label]));
  const websiteNames = new Map(switchGroups().find((g) => g.kind === "website")!.items.map((i) => [i.id, i.label]));
  websiteNames.set("hosted", "Hosted API, nothing connected");
  // 103R Regular apps and Yallapp Studio projects apart.
  const studio = apps.filter((a) => a.section === "studio").length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[28px] font-extrabold">Overview</h1>
          <span className="text-[15px] text-muted">Counted from the data now. Amounts are per currency; nothing is converted.</span>
        </div>
        <span className="text-sm font-semibold text-muted">{now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
      </div>

      {denied ? (
        <Notice tone="warn" icon="lock" role="alert">
          Your role can&apos;t do that. Ask an owner of the team if you need it.
        </Notice>
      ) : null}

      <Waiting
        items={[
          { label: "Clients waiting for activation", count: states.pending, href: "/admin/clients?filter=pending", icon: "pending" },
          { label: "Open alerts", count: alerts, href: "/admin/watching", icon: "monitoring" },
          { label: "Publishing requests", count: openPublishingCount(publishing), href: "/admin/publishing", icon: "publish" },
          { label: "Failed builds this week", count: buildsWeek.failed, href: "/admin/builds?status=failed", icon: "error" },
          { label: "Account deletion requests", count: deletions.length, href: "/admin/account-deletion", icon: "delete_forever" },
          { label: "Deleted apps to restore or delete", count: deletedApps.length, href: "/admin/deleted-apps", icon: "restore_from_trash" },
        ]}
      />

      <Section id="h-clients" title="Clients">
        <div className={cols[6]}>
          <Stat label={ACCOUNT_STATE_LABEL.pending} value={states.pending} href="/admin/clients?filter=pending" icon="pending" tone={states.pending ? "warn" : "neutral"} />
          <Stat label={ACCOUNT_STATE_LABEL.active} value={states.active} href="/admin/clients?filter=active" icon="check_circle" tone="success" />
          <Stat label={ACCOUNT_STATE_LABEL.expired} value={states.expired} href="/admin/clients?filter=expired" icon="hourglass_top" />
          <Stat label={ACCOUNT_STATE_LABEL.suspended} value={states.suspended} icon="block" tone={states.suspended ? "danger" : "neutral"} />
          <Stat label="New in 7 days" value={signUpsSince(rows, now, 7)} icon="person" tone="info" />
          <Stat label="New in 30 days" value={signUpsSince(rows, now, 30)} icon="groups" tone="info" />
        </div>
      </Section>

      <Section id="h-revenue" title="Revenue">
        {money12.currencies.length === 0 ? (
          <p className="m-0 rounded-2xl border border-line bg-white p-5 text-[15px] text-muted">No plan payments or commission in the last 12 months.</p>
        ) : (
          <>
            <div className={grid}>
              {money12.currencies.map((c) => (
                <Stat
                  key={c}
                  label={`This month, ${c}`}
                  value={money((money12.thisMonth[c]?.plans ?? 0) + (money12.thisMonth[c]?.commission ?? 0), c)}
                  hint={`Plans ${money(money12.thisMonth[c]?.plans, c)} · commission ${money(money12.thisMonth[c]?.commission, c)}`}
                />
              ))}
              {money12.currencies.map((c) => (
                <Stat
                  key={`y-${c}`}
                  label={`Last 12 months, ${c}`}
                  value={money((money12.last12Months[c]?.plans ?? 0) + (money12.last12Months[c]?.commission ?? 0), c)}
                  hint={`Plans ${money(money12.last12Months[c]?.plans, c)} · commission ${money(money12.last12Months[c]?.commission, c)}`}
                />
              ))}
            </div>
            <div className="relative overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <caption className="sr-only">Revenue per month</caption>
                <thead>
                  <tr className="bg-sand text-left text-muted">
                    <th scope="col" className="px-4 py-3 font-semibold">Month</th>
                    {money12.currencies.map((c) => (
                      <th key={c} scope="col" className="px-4 py-3 text-right font-semibold">
                        Plans {c}
                      </th>
                    ))}
                    {money12.currencies.map((c) => (
                      <th key={`c-${c}`} scope="col" className="px-4 py-3 text-right font-semibold">
                        Commission {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...money12.months].reverse().map((m) => (
                    <tr key={m.month} className="border-t border-line-soft">
                      <th scope="row" className="px-4 py-2.5 text-left font-semibold">
                        {new Date(`${m.month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })}
                      </th>
                      {money12.currencies.map((c) => (
                        <td key={c} className="px-4 py-2.5 text-right tabular-nums">
                          {money(m.byCurrency[c]?.plans, c)}
                        </td>
                      ))}
                      {money12.currencies.map((c) => (
                        <td key={`c-${c}`} className="px-4 py-2.5 text-right tabular-nums">
                          {money(m.byCurrency[c]?.commission, c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Section>

      <Section id="h-builds" title="Builds in the last 7 days">
        <div className={cols[5]}>
          <Stat label="Queued" value={buildsWeek.queued} href="/admin/builds?status=queued" icon="schedule" />
          <Stat label="Building" value={buildsWeek.running} href="/admin/builds?status=building" icon="progress_activity" tone="info" />
          <Stat label="Failed" value={buildsWeek.failed} href="/admin/builds?status=failed" icon="error" tone={buildsWeek.failed ? "danger" : "neutral"} />
          <Stat label="Ready" value={buildsWeek.ready} href="/admin/builds?status=ready" icon="task_alt" tone="success" />
          <Stat
            label="Success rate"
            icon="monitoring"
            value={buildsWeek.successRate === null ? "–" : `${buildsWeek.successRate}%`}
            hint={`${buildsWeek.total} ${buildsWeek.total === 1 ? "build" : "builds"} queued`}
          />
        </div>
      </Section>

      <Section id="h-apps" title="Apps">
        <div className={cols[3]}>
          <Stat label="Apps" value={apps.length} hint={`${rows.length} ${rows.length === 1 ? "account" : "accounts"}`} icon="apps" />
          <Stat label="Regular apps" value={apps.length - studio} icon="smartphone" />
          <Stat label="Yallapp Studio projects" value={studio} icon="draw" tone="info" />
        </div>
        <div className={cols[4]}>
          <Stat label="With an active plan" value={appStates.active} icon="check_circle" tone="success" />
          <Stat label="Waiting for activation" value={appStates.pending} icon="pending" tone={appStates.pending ? "warn" : "neutral"} />
          <Stat label="Plan ended" value={appStates.expired} icon="hourglass_top" />
          <Stat label="In suspended accounts" value={appStates.suspended} icon="block" />
        </div>
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
          <Breakdown title="By type" rows={appsByType(apps).map((r) => ({ label: typeNames.get(r.key) ?? r.key, count: r.count }))} />
          <Breakdown
            title="By website or platform"
            rows={appsByWebsite(apps).map((r) => ({ label: websiteNames.get(r.key) ?? r.key, count: r.count }))}
          />
          <div className="flex flex-col gap-3">
            <Stat label="Apps on the hosted API" value={hosted.apps} icon="hub" />
            <Stat label="Their app users" value={hosted.users} icon="group" />
          </div>
        </div>
      </Section>
    </>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  const most = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
      <h3 className="m-0 text-[15px] font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="m-0 text-sm text-muted">No apps yet.</p>
      ) : (
        <dl className="m-0 flex flex-col gap-2.5 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="min-w-0">{r.label}</dt>
                <dd className="m-0 font-semibold tabular-nums">{r.count}</dd>
              </div>
              {/* The count against the largest one. */}
              <span aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-sand">
                <span className="block h-full rounded-full bg-midnight" style={{ width: `${(r.count / most) * 100}%` }} />
              </span>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
