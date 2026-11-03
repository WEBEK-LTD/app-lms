import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { ItemList, ItemRow, Stat, StatRow } from "@/components/page-kit";
import { ChipLinks, ListBar } from "@/components/page-kit-c";
import { EmptyState, PageHeader, btn, formatDateTime } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { MailCampaign, MailCampaignStatus } from "@/lib/mailing/types";
import { MailTabs, percent, StatusBadge } from "./shared";

export const metadata: Metadata = { title: "Email campaigns" };
export const dynamic = "force-dynamic";

const FILTERS: { id: string; label: string; statuses?: MailCampaignStatus[]; archived?: boolean }[] = [
  { id: "all", label: "All" },
  { id: "drafts", label: "Drafts", statuses: ["draft"] },
  { id: "scheduled", label: "Scheduled", statuses: ["scheduled"] },
  { id: "sending", label: "Sending", statuses: ["sending", "paused"] },
  { id: "sent", label: "Sent", statuses: ["sent", "cancelled"] },
  { id: "archived", label: "Archived", archived: true },
];

function when(c: MailCampaign): string {
  if (c.status === "scheduled" && c.scheduledAt) return `Goes ${formatDateTime(c.scheduledAt)}${c.timeZone ? ` (${c.timeZone})` : ""}`;
  if (c.finishedAt) return `${c.status === "cancelled" ? "Cancelled" : "Sent"} ${formatDateTime(c.finishedAt)}`;
  if (c.startedAt) return `Started ${formatDateTime(c.startedAt)}`;
  return `Edited ${formatDateTime(c.updatedAt)}`;
}

/** 114 Admin › Email campaigns: every campaign to the people on Yallapp, with its numbers. */
export default async function EmailCampaignsPage({ searchParams }: PageProps<"/admin/email-campaigns">) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const filter = FILTERS.find((f) => f.id === query.show) ?? FILTERS[0]!;
  const store = await getStore();
  const [active, archived, suppressions] = await Promise.all([store.listMailCampaigns(), store.listMailCampaigns({ archived: true }), store.listMailSuppressions({ offset: 0, limit: 1 })]);
  const all = [...active, ...archived];
  const shown = filter.archived ? archived : filter.statuses ? active.filter((c) => filter.statuses!.includes(c.status)) : active;
  const numbers = new Map(
    await Promise.all(
      shown.map(async (c) => {
        const [counts, stats] = await Promise.all([store.countMailRecipients(c.id), c.status === "draft" ? null : store.mailEventStats(c.id)]);
        return [c.id, { counts, stats }] as const;
      }),
    ),
  );
  const sent = await Promise.all(all.filter((c) => c.status !== "draft").map(async (c) => ({ counts: await store.countMailRecipients(c.id), stats: await store.mailEventStats(c.id) })));
  const delivered = sent.reduce((n, s) => n + s.counts.sent, 0);
  const opened = sent.reduce((n, s) => n + s.stats.uniqueOpens, 0);
  const clicked = sent.reduce((n, s) => n + s.stats.uniqueClicks, 0);
  const editable = can(admin.adminRole, "marketing.edit");
  return (
    <>
      <PageHeader
        title="Email campaigns"
        description="Emails to the people registered on Yallapp: news, offers and reminders, built from blocks or your own HTML, in their language."
        actions={
          editable ? (
            <Link href="/admin/email-campaigns/new" className={`${btn.main} h-11`} data-testid="new-campaign">
              <Icon name="add" size={20} />
              New campaign
            </Link>
          ) : null
        }
      />
      <MailTabs current="/admin/email-campaigns" />
      <StatRow label="All campaigns">
        <Stat label="Campaigns" value={all.length} icon="mail" />
        <Stat label="Emails sent" value={delivered.toLocaleString("en")} icon="send" tone="success" />
        <Stat label="Opened" value={percent(opened, delivered)} icon="visibility" tone="accent" hint="Unique opens of the emails sent" />
        <Stat label="Clicked" value={percent(clicked, delivered)} icon="touch_app" tone="accent" hint="Unique clicks of the emails sent" />
        <Stat label="Never mailed" value={suppressions.total} icon="block" tone="warn" href="/admin/email-campaigns/never-mailed" hint="Unsubscribed, bounced or kept out" />
      </StatRow>
      <section aria-label="Campaigns" className="overflow-hidden rounded-2xl border border-line bg-white">
        <ListBar>
          <ChipLinks
            label="Show"
            items={FILTERS.map((f) => ({
              href: f.id === "all" ? "/admin/email-campaigns" : `/admin/email-campaigns?show=${f.id}`,
              label: f.label,
              current: f.id === filter.id,
              count: f.archived ? archived.length : f.statuses ? active.filter((c) => f.statuses!.includes(c.status)).length : active.length,
            }))}
          />
        </ListBar>
        {shown.length === 0 ? (
          <div className="p-6">
            <EmptyState icon="mail" title={filter.id === "all" ? "No campaigns yet" : "Nothing here"} action={editable && filter.id === "all" ? <Link href="/admin/email-campaigns/new" className={`${btn.primary} h-11`}>Start from a template</Link> : undefined}>
              {filter.id === "all" ? "Pick one of the ready-made designs or start from a blank email." : "No campaign has this status."}
            </EmptyState>
          </div>
        ) : (
          <ItemList>
            {shown.map((c) => {
              const n = numbers.get(c.id)!;
              const href = c.status === "draft" || c.status === "scheduled" ? `/admin/email-campaigns/${c.id}` : `/admin/email-campaigns/${c.id}/report`;
              const langs = Object.keys(c.contents).map((l) => l.toUpperCase()).join(" · ");
              return (
                <ItemRow
                  key={c.id}
                  href={href}
                  data-campaign={c.id}
                  media={
                    <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-peach text-accent">
                      <Icon name={c.status === "scheduled" ? "schedule" : c.status === "sent" ? "task_alt" : c.status === "draft" ? "edit" : "send"} size={22} />
                    </span>
                  }
                  title={c.name}
                  badges={<StatusBadge status={c.status} />}
                  meta={`${c.contents[c.defaultLang]?.subject || "No subject yet"}`}
                  extra={
                    <>
                      <span>{when(c)}</span>
                      {langs ? <span>{langs}</span> : null}
                    </>
                  }
                  aside={
                    n.stats ? (
                      <span className="flex items-center gap-4 text-[13px] text-ink-3 tabular-nums">
                        <span title="Sent">
                          <b className="text-midnight">{n.counts.sent.toLocaleString("en")}</b> sent
                        </span>
                        <span title="Unique opens">
                          <b className="text-midnight">{percent(n.stats.uniqueOpens, n.counts.sent)}</b> opened
                        </span>
                        <span title="Unique clicks">
                          <b className="text-midnight">{percent(n.stats.uniqueClicks, n.counts.sent)}</b> clicked
                        </span>
                      </span>
                    ) : null
                  }
                />
              );
            })}
          </ItemList>
        )}
      </section>
    </>
  );
}
