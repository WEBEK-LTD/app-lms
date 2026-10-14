import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Notice } from "@/components/ui";
import { appsByType, appsByWebsite, buildStats, clientsByState, hostedUsage, revenue, revenueWindowStart, signUpsSince } from "@/lib/admin/overview";
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

function Stat({ label, value, href, hint }: { label: string; value: string | number; href?: string; hint?: string }) {
  const body = (
    <>
      <span className="text-sm text-muted">{label}</span>
      <span className="text-[28px] leading-tight font-extrabold">{value}</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </>
  );
  const box = "flex min-w-0 flex-col gap-1 rounded-2xl border border-line bg-white p-5";
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

const grid = "grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr))]";

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
  const [rows, apps, builds, payments, orders, usersByApp] = await Promise.all([
    store.listClients({ filter: "all", now }),
    store.listApps(),
    store.listBuildsSince(new Date(now.getTime() - 7 * 86_400_000)),
    store.listPaidPlanPaymentsSince(revenueWindowStart(now)),
    store.listMarketplaceOrdersSince(revenueWindowStart(now)),
    store.countHostedUsersByApp(),
  ]);
  const states = clientsByState(rows, now);
  const money12 = revenue(payments, orders, now);
  const buildsWeek = buildStats(builds, now, 7);
  const hosted = hostedUsage(apps, usersByApp);
  const typeNames = new Map(APP_TYPE_SWITCHES.map((t) => [t.id, t.label]));
  const websiteNames = new Map(switchGroups().find((g) => g.kind === "website")!.items.map((i) => [i.id, i.label]));
  websiteNames.set("hosted", "Hosted API, nothing connected");

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Overview</h1>
        <span className="text-[15px] text-muted">Counted from the data now. Amounts are per currency; nothing is converted.</span>
      </div>

      {denied ? (
        <Notice tone="warn" icon="lock" role="alert">
          Your role can&apos;t do that. Ask an owner of the team if you need it.
        </Notice>
      ) : null}

      <Section id="h-clients" title="Clients">
        <div className={grid}>
          <Stat label={ACCOUNT_STATE_LABEL.pending} value={states.pending} href="/admin/clients?filter=pending" />
          <Stat label={ACCOUNT_STATE_LABEL.active} value={states.active} href="/admin/clients?filter=active" />
          <Stat label={ACCOUNT_STATE_LABEL.expired} value={states.expired} href="/admin/clients?filter=expired" />
          <Stat label={ACCOUNT_STATE_LABEL.suspended} value={states.suspended} />
          <Stat label="New in 7 days" value={signUpsSince(rows, now, 7)} />
          <Stat label="New in 30 days" value={signUpsSince(rows, now, 30)} />
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
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
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
        <div className={grid}>
          <Stat label="Queued" value={buildsWeek.queued} href="/admin/builds?status=queued" />
          <Stat label="Building" value={buildsWeek.running} href="/admin/builds?status=building" />
          <Stat label="Failed" value={buildsWeek.failed} href="/admin/builds?status=failed" />
          <Stat label="Ready" value={buildsWeek.ready} href="/admin/builds?status=ready" />
          <Stat
            label="Success rate"
            value={buildsWeek.successRate === null ? "None finished" : `${buildsWeek.successRate}%`}
            hint={`${buildsWeek.total} ${buildsWeek.total === 1 ? "build" : "builds"} queued`}
          />
        </div>
      </Section>

      <Section id="h-apps" title="Apps">
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
          <Breakdown title="By type" rows={appsByType(apps).map((r) => ({ label: typeNames.get(r.key) ?? r.key, count: r.count }))} />
          <Breakdown
            title="By website or platform"
            rows={appsByWebsite(apps).map((r) => ({ label: websiteNames.get(r.key) ?? r.key, count: r.count }))}
          />
          <div className="flex flex-col gap-3">
            <Stat label="Apps on the hosted API" value={hosted.apps} />
            <Stat label="Their app users" value={hosted.users} />
          </div>
        </div>
      </Section>
    </>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
      <h3 className="m-0 text-[15px] font-bold">{title}</h3>
      {rows.length === 0 ? (
        <p className="m-0 text-sm text-muted">No apps yet.</p>
      ) : (
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 text-sm">
          {rows.map((r) => (
            <div key={r.label} className="contents">
              <dt>{r.label}</dt>
              <dd className="m-0 text-right font-semibold tabular-nums">{r.count}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
