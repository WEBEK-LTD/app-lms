import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, formatDateTime } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { DonationStatus } from "@/lib/data/types";
import { donationReference } from "@/lib/donations/service";
import { DonationTabs } from "./tabs";

export const metadata: Metadata = { title: "Donations" };

const PER_PAGE = 25;
const STATUS_LABELS: Record<DonationStatus, string> = { paid: "Paid", pending: "Not paid", failed: "Failed", refunded: "Refunded" };
const TONES = { paid: "success", pending: "neutral", failed: "danger", refunded: "neutral" } as const;

/** 29 Every donation made from the app: paid ones by default, by campaign, with an export. */
export default async function DonationsPage({ searchParams }: { searchParams: Promise<{ page?: string; campaign?: string; status?: string }> }) {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "campaigns") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Donations</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">Donations are for Charity &amp; donations apps.</p>
      </div>
    );
  }
  const query = await searchParams;
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const campaignId = query.campaign && /^\d{1,15}$/.test(query.campaign) ? Number(query.campaign) : undefined;
  const status = query.status === "all" ? "all" : "paid";
  const store = await getStore();
  const [campaigns, { items, total }] = await Promise.all([
    store.listCampaigns(app.id),
    store.listDonations({
      appId: app.id,
      campaignId,
      statuses: status === "all" ? undefined : ["paid"],
      offset: (page - 1) * PER_PAGE,
      limit: PER_PAGE,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const filter = new URLSearchParams({ ...(campaignId ? { campaign: String(campaignId) } : {}), ...(status === "all" ? { status } : {}) });
  const pageLink = (p: number) => `/dashboard/donations?${new URLSearchParams({ ...Object.fromEntries(filter), page: String(p) })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[620px] flex-col gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Donations</h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">
            Donations from your app, newest first. Each donor gets a receipt by email. Refunds are made in your iyzico panel.
          </p>
        </div>
        <a href={`/api/dashboard/donations?${filter}`} className={`${btn.secondary} h-11`} download>
          <Icon name="download" size={20} />
          Export CSV
        </a>
      </div>
      <DonationTabs current="donations" />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[200px] flex-col gap-1.5">
          <label htmlFor="f-campaign" className="text-sm font-semibold">
            Campaign
          </label>
          <select id="f-campaign" name="campaign" defaultValue={campaignId ? String(campaignId) : ""} className="input input-sm">
            <option value="">All campaigns</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-status" className="text-sm font-semibold">
            Show
          </label>
          <select id="f-status" name="status" defaultValue={status} className="input input-sm">
            <option value="paid">Paid donations</option>
            <option value="all">Also started but not paid</option>
          </select>
        </div>
        <button type="submit" className={`${btn.secondary} h-10`}>
          Show
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState icon="payments" title="No donations yet.">
          Donations show here once they&apos;re paid, with the donor&apos;s name, email and message.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[720px] border-collapse text-left text-[15px]">
            <thead>
              <tr className="border-b border-line text-[13px] text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Reference
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Donor
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Campaign
                </th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">
                  Amount
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-b border-line-soft align-top last:border-b-0">
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{donationReference(d)}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-col gap-0.5">
                      <span>
                        {d.donorName ?? "Not given yet"} {d.anonymous ? <Badge tone="neutral">Anonymous</Badge> : null}
                      </span>
                      {d.donorEmail ? <span className="text-[13px] text-muted">{d.donorEmail}</span> : null}
                      {d.message ? <span className="text-[13px] text-ink-4">“{d.message}”</span> : null}
                    </span>
                  </td>
                  <td className="px-4 py-3">{d.campaignTitle}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{formatCents(d.amountCents, d.currency)}</td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap text-muted">{formatDateTime(d.paidAt ?? d.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={TONES[d.status]}>{STATUS_LABELS[d.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 ? (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3">
          {page > 1 ? <Link href={pageLink(page - 1)}>← Newer</Link> : <span />}
          <span className="text-sm text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? <Link href={pageLink(page + 1)}>Older →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
