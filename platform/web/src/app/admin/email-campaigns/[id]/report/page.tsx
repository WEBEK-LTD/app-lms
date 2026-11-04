import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CampaignActions, LiveRefresh } from "@/components/mailing/report-actions";
import { kitTable } from "@/components/page-kit-b";
import { ChipLinks, ListBar, Pager, SearchForm } from "@/components/page-kit-c";
import { Stat, StatRow } from "@/components/page-kit";
import { Badge, PageHeader, ProgressBar, formatDateTime } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { MailRecipientStatus } from "@/lib/mailing/types";
import { percent, StatusBadge } from "../../shared";

export const metadata: Metadata = { title: "Campaign report" };
export const dynamic = "force-dynamic";

const PAGE = 50;
const RECIPIENT: Record<MailRecipientStatus, { label: string; tone: "success" | "warn" | "danger" | "neutral" | "info" }> = {
  queued: { label: "Waiting", tone: "neutral" },
  sending: { label: "Sending", tone: "info" },
  sent: { label: "Sent", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  skipped: { label: "Skipped", tone: "warn" },
};

/** 114 How a campaign went: sent, failed, opens, clicks and unsubscribes, each link, and each person. */
export default async function ReportPage({ params, searchParams }: PageProps<"/admin/email-campaigns/[id]/report">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const query = await searchParams;
  const store = await getStore();
  const campaign = await store.getMailCampaign(id);
  if (!campaign) notFound();
  const status = (["queued", "sending", "sent", "failed", "skipped"] as const).find((s) => s === query.status);
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const page = Math.max(1, Number(query.page) || 1);
  const [counts, stats, list] = await Promise.all([store.countMailRecipients(id), store.mailEventStats(id), store.listMailRecipients(id, { status, query: q || undefined, offset: (page - 1) * PAGE, limit: PAGE })]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const done = counts.sent + counts.failed + counts.skipped;
  const live = campaign.status === "sending";
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const next = { status, q: q || undefined, page: undefined as string | undefined, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/email-campaigns/${id}/report${s ? `?${s}` : ""}`;
  };
  return (
    <>
      <PageHeader
        back={{ href: "/admin/email-campaigns", label: "Email campaigns" }}
        title={campaign.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={campaign.status} />
            <span>{campaign.contents[campaign.defaultLang]?.subject}</span>
            {campaign.startedAt ? <span className="text-muted">· started {formatDateTime(campaign.startedAt)}</span> : null}
            {campaign.finishedAt ? <span className="text-muted">· finished {formatDateTime(campaign.finishedAt)}</span> : null}
          </span>
        }
        actions={<CampaignActions id={id} status={campaign.status} archived={campaign.archived} canSend={can(admin.adminRole, "marketing.send")} canEdit={can(admin.adminRole, "marketing.edit")} />}
      />
      {live ? <LiveRefresh /> : null}
      {total > 0 && (campaign.status === "sending" || campaign.status === "paused") ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-5">
          <div className="flex justify-between text-[14px] font-semibold text-midnight">
            <span>{live ? `Sending, ${campaign.perMinute} a minute` : "Paused"}</span>
            <span className="tabular-nums">
              {done.toLocaleString("en")} of {total.toLocaleString("en")}
            </span>
          </div>
          <ProgressBar value={done} max={total} label="Emails done" tone={live ? "accent" : "warn"} />
        </div>
      ) : null}
      <StatRow label="Results">
        <Stat label="People" value={total.toLocaleString("en")} icon="groups" />
        <Stat label="Sent" value={counts.sent.toLocaleString("en")} icon="send" tone="success" hint={counts.queued ? `${counts.queued} waiting` : undefined} />
        <Stat label="Opened" value={percent(stats.uniqueOpens, counts.sent)} icon="visibility" tone="accent" hint={`${stats.uniqueOpens} people · ${stats.opens} opens`} />
        <Stat label="Clicked" value={percent(stats.uniqueClicks, counts.sent)} icon="touch_app" tone="accent" hint={`${stats.uniqueClicks} people · ${stats.clicks} clicks`} />
        <Stat label="Unsubscribed" value={stats.unsubscribes} icon="block" tone="warn" hint={percent(stats.unsubscribes, counts.sent)} />
        <Stat label="Failed" value={counts.failed} icon="error" tone="warn" hint={stats.bounces ? `${stats.bounces} bounced` : counts.skipped ? `${counts.skipped} skipped` : undefined} />
      </StatRow>
      {!campaign.track ? <p className="m-0 text-[13px] text-muted">Opens and clicks weren&apos;t counted for this campaign.</p> : null}
      <section aria-labelledby="h-links" className="overflow-hidden rounded-2xl border border-line bg-white">
        <h2 id="h-links" className="m-0 border-b border-line-soft px-6 py-4 text-[17px] font-extrabold">
          Links clicked
        </h2>
        {stats.links.length === 0 ? (
          <p className="m-0 px-6 py-5 text-[14px] text-muted">No clicks yet.</p>
        ) : (
          <div className={kitTable.wrap}>
            <table className={kitTable.table}>
              <thead className={kitTable.head}>
                <tr>
                  <th className={`${kitTable.th} ${kitTable.start}`}>Link</th>
                  <th className={`${kitTable.th} ${kitTable.num}`}>Clicks</th>
                  <th className={`${kitTable.th} ${kitTable.num}`}>People</th>
                  <th className={`${kitTable.th} ${kitTable.num}`}>Of those sent</th>
                </tr>
              </thead>
              <tbody>
                {stats.links.map((l) => (
                  <tr key={l.url} className={kitTable.row}>
                    <td className={`${kitTable.td} max-w-[520px] break-all`}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer" dir="ltr">
                        {l.url}
                      </a>
                    </td>
                    <td className={`${kitTable.td} ${kitTable.num}`}>{l.clicks}</td>
                    <td className={`${kitTable.td} ${kitTable.num}`}>{l.unique}</td>
                    <td className={`${kitTable.td} ${kitTable.num}`}>{percent(l.unique, counts.sent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section aria-labelledby="h-people" className="overflow-hidden rounded-2xl border border-line bg-white">
        <h2 id="h-people" className="m-0 px-6 pt-4 text-[17px] font-extrabold">
          People
        </h2>
        <ListBar>
          <ChipLinks label="Status" items={[{ href: href({ status: undefined }), label: "All", count: total, current: !status }, ...(Object.keys(RECIPIENT) as MailRecipientStatus[]).map((s) => ({ href: href({ status: s }), label: RECIPIENT[s].label, count: counts[s], current: status === s }))]} />
          <SearchForm label="Find a person" placeholder="Email or name" defaultValue={q} keep={status ? { status } : {}} button="Find" />
        </ListBar>
        {list.items.length === 0 ? (
          <p className="m-0 px-6 py-5 text-[14px] text-muted">{total ? "Nobody here." : "The list is made when it starts sending."}</p>
        ) : (
          <div className={kitTable.wrap}>
            <table className={kitTable.table} data-testid="recipients">
              <thead className={kitTable.head}>
                <tr>
                  <th className={`${kitTable.th} ${kitTable.start}`}>Person</th>
                  <th className={`${kitTable.th} ${kitTable.start}`}>Language</th>
                  <th className={`${kitTable.th} ${kitTable.start}`}>Status</th>
                  <th className={`${kitTable.th} ${kitTable.start}`}>When</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((r) => (
                  <tr key={r.id} className={kitTable.row}>
                    <td className={kitTable.td}>
                      <span className="flex flex-col">
                        <b className="text-midnight" dir="auto">
                          {r.name}
                        </b>
                        <span className="text-[13px] text-muted" dir="ltr">
                          {r.email}
                          {r.team ? " · team member" : ""}
                        </span>
                      </span>
                    </td>
                    <td className={kitTable.td}>{r.lang.toUpperCase()}</td>
                    <td className={kitTable.td}>
                      <span className="flex flex-col gap-1">
                        <span>
                          <Badge tone={RECIPIENT[r.status].tone}>{RECIPIENT[r.status].label}</Badge>
                        </span>
                        {r.error ? <span className="max-w-[360px] text-[12.5px] text-muted">{r.error === "interrupted" ? "The sending run stopped before it knew; not sent again, so it never arrives twice." : r.error}</span> : null}
                      </span>
                    </td>
                    <td className={`${kitTable.td} whitespace-nowrap text-[13px] text-muted`}>{r.sentAt ? formatDateTime(r.sentAt) : r.nextAttemptAt ? `Again ${formatDateTime(r.nextAttemptAt)}` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.total > PAGE ? (
          <Pager
            label="Pages"
            prev={page > 1 ? { href: href({ page: String(page - 1) }), label: "Earlier" } : null}
            next={page * PAGE < list.total ? { href: href({ page: String(page + 1) }), label: "More" } : null}
            text={`${(page - 1) * PAGE + 1}–${Math.min(page * PAGE, list.total)} of ${list.total}`}
          />
        ) : null}
      </section>
      <p className="m-0 text-[13px] text-muted">
        <Link href={`/admin/email-campaigns/templates/preview/campaign:${id}`}>See the email</Link> as it went.
      </p>
    </>
  );
}
