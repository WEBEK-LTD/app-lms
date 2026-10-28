import type { Metadata } from "next";
import { buildsByMonth, cohorts, FUNNEL, FUNNEL_LABEL, plansByMonth, signUpSources, timesToSteps, type FunnelStep } from "@/lib/admin/product";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { demoClientId } from "@/lib/demo/apps";

export const metadata: Metadata = { title: "Product" };
export const dynamic = "force-dynamic";

const DAY_MS = 86_400_000;

function Section({ id, title, text, children }: { id: string; title: string; text?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className="m-0 text-[19px] font-bold">
          {title}
        </h2>
        {text ? <p className="m-0 text-sm text-muted">{text}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-line bg-white p-5">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-[28px] leading-tight font-extrabold">{value}</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="m-0 rounded-2xl border border-line bg-white p-5 text-[15px] text-muted">{children}</p>;
}

function Table({ caption, head, width, children }: { caption: string; head: string[]; width: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-x-auto rounded-2xl border border-line bg-white">
      <table className={`w-full border-collapse text-sm ${width}`}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-sand text-muted">
            {head.map((h, i) => (
              <th key={h} scope="col" className={`px-4 py-3 font-semibold ${i === 0 ? "text-left" : "text-right"}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const cell = "px-4 py-2.5 text-right tabular-nums";
const rowHead = "px-4 py-2.5 text-left font-semibold";

function monthName(month: string): string {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
}

function share(count: number, of: number): string {
  return of ? `${count} (${Math.round((count / of) * 100)}%)` : String(count);
}

function days(value: number | null): string {
  if (value === null) return "None yet";
  return value === 1 ? "1 day" : `${value} days`;
}

/**
 * 78.2 Admin › Product: how clients get from signing up to a published,
 * paid app, by the month they signed up (their milestones, 78.1), how long
 * each step takes, where sign-ups come from, how builds go, and how many
 * clients keep a plan running (the daily snapshots). Read only.
 */
export default async function ProductPage() {
  await requireAdmin();
  const store = await getStore();
  const now = new Date();
  const yearAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const [milestones, builds, productDays, demoId] = await Promise.all([
    store.listMilestones({}),
    store.listBuildsSince(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1))),
    store.listProductDays(yearAgo.toISOString().slice(0, 10)),
    demoClientId(store),
  ]);
  const funnel = [...cohorts(milestones, now, 12)].reverse();
  const times = timesToSteps(milestones, yearAgo);
  const sources = signUpSources(milestones, new Date(now.getTime() - 90 * DAY_MS));
  // 16 The demo apps' builds aren't clients'.
  const buildMonths = [...buildsByMonth(builds.filter((b) => b.clientId !== demoId), now, 6)].reverse();
  const plans = [...plansByMonth(productDays, now, 12)].reverse();
  const timed: { step: keyof typeof times; label: string }[] = [
    { step: "setup_done", label: "To finish the setup" },
    { step: "build_ready", label: "To a build that worked" },
    { step: "store_live", label: "To live in a store" },
    { step: "paid", label: "To the first payment" },
  ];

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Product</h1>
        <span className="text-[15px] text-muted">
          How clients get from signing up to a published, paid app, and where they stop. Months are UTC; the demo apps aren&apos;t counted.
        </span>
      </div>

      <Section id="h-funnel" title="From sign-up to paid" text="Clients by the month they signed up, and how many of them have reached each step by now.">
        <Table caption="Sign-ups by month and the steps they reached" head={["Signed up", "Sign-ups", ...FUNNEL.map((s) => FUNNEL_LABEL[s])]} width="min-w-[760px]">
          {funnel.map((row) => (
            <tr key={row.month} className="border-t border-line-soft">
              <th scope="row" className={rowHead}>
                {monthName(row.month)}
              </th>
              <td className={cell}>{row.signUps}</td>
              {FUNNEL.map((step: FunnelStep) => (
                <td key={step} className={cell}>
                  {share(row.reached[step], row.signUps)}
                </td>
              ))}
            </tr>
          ))}
        </Table>
      </Section>

      <Section id="h-times" title="How long it takes" text="From the sign-up, the median over the clients who signed up in the last 12 months and got there.">
        <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr))]">
          {timed.map(({ step, label }) => (
            <Stat key={step} label={label} value={days(times[step].days)} hint={`${times[step].clients} ${times[step].clients === 1 ? "client" : "clients"}`} />
          ))}
        </div>
      </Section>

      <Section id="h-sources" title="Where sign-ups come from" text="The last 90 days, from the campaign link, our page or the website that sent them.">
        {sources.length === 0 ? (
          <Empty>No sign-ups in the last 90 days.</Empty>
        ) : (
          <Table caption="Sign-ups by source" head={["Source", "Sign-ups", "Paid"]} width="min-w-[420px]">
            {sources.map((s) => (
              <tr key={s.source} className="border-t border-line-soft">
                <th scope="row" className={rowHead}>
                  {s.source}
                </th>
                <td className={cell}>{s.signUps}</td>
                <td className={cell}>{share(s.paid, s.signUps)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section id="h-builds" title="Builds" text="Finished builds by the month they were queued: how many worked, how long one took, each platform, and where the failed ones stopped.">
        <Table caption="Builds by month" head={["Month", "Finished", "Worked", "Median time", "Android", "iOS", "Failed at"]} width="min-w-[820px]">
          {buildMonths.map((m) => (
            <tr key={m.month} className="border-t border-line-soft">
              <th scope="row" className={rowHead}>
                {monthName(m.month)}
              </th>
              <td className={cell}>{m.finished}</td>
              <td className={cell}>{m.successRate === null ? "–" : `${m.ready} (${m.successRate}%)`}</td>
              <td className={cell}>{m.medianMinutes === null ? "–" : `${m.medianMinutes} min`}</td>
              <td className={cell}>{m.android.done + m.android.failed ? `${m.android.done} worked, ${m.android.failed} failed` : "–"}</td>
              <td className={cell}>{m.ios.done + m.ios.failed ? `${m.ios.done} worked, ${m.ios.failed} failed` : "–"}</td>
              <td className={cell}>{m.failedAt.length ? m.failedAt.slice(0, 3).map((f) => `${f.stage} (${f.count})`).join(", ") : "–"}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section id="h-plans" title="Clients with a plan running" text="From the daily job's snapshots: who had a plan running at the start and at the end of each month.">
        {plans.length === 0 ? (
          <Empty>The daily job keeps a snapshot each day from now on; the months show here as they pass.</Empty>
        ) : (
          <Table caption="Clients with a plan running by month" head={["Month", "At the start", "New", "Lost", "At the end", "Churn"]} width="min-w-[560px]">
            {plans.map((m) => (
              <tr key={m.month} className="border-t border-line-soft">
                <th scope="row" className={rowHead}>
                  {monthName(m.month)}
                </th>
                <td className={cell}>{m.atStart}</td>
                <td className={cell}>{m.gained}</td>
                <td className={cell}>{m.lost}</td>
                <td className={cell}>{m.atEnd}</td>
                <td className={cell}>{m.churn === null ? "–" : `${m.churn}%`}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}
