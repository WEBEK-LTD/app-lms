import type { Metadata } from "next";
import { AddSuppression, AllowAgain } from "@/components/mailing/list-actions";
import { kitTable } from "@/components/page-kit-b";
import { ListBar, Pager, SearchForm } from "@/components/page-kit-c";
import { Badge, PageHeader, formatDateTime } from "@/components/ui";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { MailSuppressionReason } from "@/lib/mailing/types";
import { MailTabs } from "../shared";

export const metadata: Metadata = { title: "Never mailed" };
export const dynamic = "force-dynamic";

const PAGE = 50;
const REASON: Record<MailSuppressionReason, { label: string; tone: "warn" | "danger" | "neutral" | "info" }> = {
  unsubscribed: { label: "Unsubscribed", tone: "warn" },
  bounced: { label: "Bounced", tone: "danger" },
  complained: { label: "Marked as spam", tone: "danger" },
  admin: { label: "Kept out by the team", tone: "neutral" },
};

/** 114 The addresses no campaign goes to, from any account they belong to. */
export default async function NeverMailedPage({ searchParams }: PageProps<"/admin/email-campaigns/never-mailed">) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.slice(0, 100) : "";
  const page = Math.max(1, Number(query.page) || 1);
  const list = await (await getStore()).listMailSuppressions({ query: q || undefined, offset: (page - 1) * PAGE, limit: PAGE });
  const canSend = can(admin.adminRole, "marketing.send");
  const link = (p: number) => `/admin/email-campaigns/never-mailed?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;
  return (
    <>
      <PageHeader title="Never mailed" description="Addresses that get no campaign: they unsubscribed (by the link, the inbox's button or their account's settings), the server refused them, or the team kept them out. Emails about their account still go." />
      <MailTabs current="/admin/email-campaigns/never-mailed" />
      {canSend ? <AddSuppression /> : null}
      <section aria-label="Addresses" className="overflow-hidden rounded-2xl border border-line bg-white">
        <ListBar>
          <span className="text-[14px] font-semibold text-midnight tabular-nums">{list.total.toLocaleString("en")} addresses</span>
          <SearchForm label="Find an address" placeholder="Email" defaultValue={q} button="Find" />
        </ListBar>
        {list.items.length === 0 ? (
          <p className="m-0 px-6 py-5 text-[14px] text-muted">{q ? "No address matches." : "None yet."}</p>
        ) : (
          <div className={kitTable.wrap}>
            <table className={kitTable.table}>
              <thead className={kitTable.head}>
                <tr>
                  <th className={`${kitTable.th} ${kitTable.start}`}>Address</th>
                  <th className={`${kitTable.th} ${kitTable.start}`}>Why</th>
                  <th className={`${kitTable.th} ${kitTable.start}`}>Since</th>
                  <th className={kitTable.th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((s) => (
                  <tr key={s.email} className={kitTable.row}>
                    <td className={kitTable.td} dir="ltr">
                      {s.email}
                    </td>
                    <td className={kitTable.td}>
                      <Badge tone={REASON[s.reason].tone}>{REASON[s.reason].label}</Badge>
                    </td>
                    <td className={`${kitTable.td} text-[13px] text-muted`}>{formatDateTime(s.createdAt)}</td>
                    <td className={`${kitTable.td} text-end`}>{canSend && s.reason !== "unsubscribed" ? <AllowAgain email={s.email} force={s.reason !== "admin"} /> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.total > PAGE ? <Pager label="Pages" prev={page > 1 ? { href: link(page - 1), label: "Earlier" } : null} next={page * PAGE < list.total ? { href: link(page + 1), label: "More" } : null} text={`${(page - 1) * PAGE + 1}–${Math.min(page * PAGE, list.total)} of ${list.total}`} /> : null}
      </section>
    </>
  );
}
