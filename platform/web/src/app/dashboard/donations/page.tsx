import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Fragment } from "react";
import { Badge, btn, EmptyState, formatDateTime } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import type { DonationStatus } from "@/lib/data/types";
import { donationReference } from "@/lib/donations/service";
import { encryptionKey } from "@/lib/env";
import { donationRefundOptions, refundedLine } from "@/lib/refunds/service";
import { RefundSection } from "../orders/refunds-view";
import { DonationTabs } from "./tabs";
import { dashboardText } from "@/lib/dashboard-lang";
import type { DashKey } from "@/i18n/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("donations.donations") };
}

const PER_PAGE = 25;
const STATUS_LABELS: Record<DonationStatus, DashKey> = {
  paid: "donations.known.paid",
  pending: "donations.known.notPaid",
  failed: "donations.known.failed",
  refunded: "donations.known.refunded",
};
const TONES = { paid: "success", pending: "neutral", failed: "danger", refunded: "neutral" } as const;

/** 29 Every donation made from the app: paid ones by default, by campaign, with an export. */
export default async function DonationsPage({ searchParams }: { searchParams: Promise<{ page?: string; campaign?: string; status?: string }> }) {
  const { app } = await requireClient();
  const { t, k, lang } = await dashboardText();
  if (!app || app.connector?.kind !== "campaigns") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("donations.donations")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("donations.donationsNotHere")}</p>
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
      statuses: status === "all" ? undefined : ["paid", "refunded"],
      offset: (page - 1) * PER_PAGE,
      limit: PER_PAGE,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  // 47 Each donation's refunds and its Refund form.
  const key = encryptionKey();
  const [refunds, options] = await Promise.all([
    store.listRefunds(app.id, "donation", items.map((d) => d.id)),
    Promise.all(items.map((d) => donationRefundOptions({ key }, app, d))),
  ]);
  const filter = new URLSearchParams({ ...(campaignId ? { campaign: String(campaignId) } : {}), ...(status === "all" ? { status } : {}) });
  const pageLink = (p: number) => `/dashboard/donations?${new URLSearchParams({ ...Object.fromEntries(filter), page: String(p) })}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[620px] flex-col gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("donations.donations")}</h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("donations.donationsIntro")}</p>
        </div>
        <a href={`/api/dashboard/donations?${filter}`} className={`${btn.secondary} h-11`} download>
          <Icon name="download" size={20} />
          {t("donations.exportCsv")}
        </a>
      </div>
      <DonationTabs current="donations" t={t} />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-[200px] flex-col gap-1.5">
          <label htmlFor="f-campaign" className="text-sm font-semibold">
            {t("donations.campaignFilter")}
          </label>
          <select id="f-campaign" name="campaign" defaultValue={campaignId ? String(campaignId) : ""} className="input input-sm">
            <option value="">{t("donations.allCampaigns")}</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="f-status" className="text-sm font-semibold">
            {t("donations.show")}
          </label>
          <select id="f-status" name="status" defaultValue={status} className="input input-sm">
            <option value="paid">{t("donations.paidRefunded")}</option>
            <option value="all">{t("donations.alsoUnpaid")}</option>
          </select>
        </div>
        <button type="submit" className={`${btn.secondary} h-10`}>
          {t("donations.show")}
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState icon="payments" title={t("donations.noDonations")}>
          {t("donations.noDonationsText")}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[720px] border-collapse text-start text-[15px]">
            <thead>
              <tr className="border-b border-line text-[13px] text-muted">
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  {t("donations.reference")}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  {t("donations.donor")}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  {t("donations.campaignFilter")}
                </th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">
                  {t("donations.amount")}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  {t("common.date")}
                </th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">
                  {t("common.status")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((d, index) => (
                <Fragment key={d.id}>
                <tr className="border-b border-line-soft align-top last:border-b-0">
                  <td className="px-4 py-3 font-semibold whitespace-nowrap">{donationReference(d)}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-col gap-0.5">
                      <span>
                        {d.donorName ?? t("donations.notGiven")} {d.anonymous ? <Badge tone="neutral">{t("donations.anonymous")}</Badge> : null}
                      </span>
                      {d.donorEmail ? <span className="text-[13px] text-muted">{d.donorEmail}</span> : null}
                      {d.message ? <span className="text-[13px] text-ink-4">“{d.message}”</span> : null}
                    </span>
                  </td>
                  <td className="px-4 py-3">{d.campaignTitle}</td>
                  <td className="px-4 py-3 text-end whitespace-nowrap">{formatCents(d.amountCents, d.currency)}</td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap text-muted">{formatDateTime(d.paidAt ?? d.createdAt, lang)}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-col items-start gap-1">
                      <Badge tone={TONES[d.status]}>{t(STATUS_LABELS[d.status])}</Badge>
                      {d.status === "paid" && d.refundedCents ? (
                        <span className="text-[13px] text-muted">{k(refundedLine(d.refundedCents, d.amountCents, d.currency) ?? "")}</span>
                      ) : null}
                    </span>
                  </td>
                </tr>
                {options[index]!.refundable || refunds.some((r) => r.targetId === d.id) ? (
                  <tr className="border-b border-line-soft">
                    <td colSpan={6} className="px-4 pb-4">
                      <div className="flex flex-col gap-2">
                        <RefundSection
                          kind="donation"
                          id={d.id}
                          label={t("donations.donationLabel", { reference: donationReference(d) })}
                          currency={d.currency}
                          refunds={refunds.filter((r) => r.targetId === d.id)}
                          options={options[index]!}
                        />
                      </div>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 ? (
        <nav aria-label={t("orders.pages")} className="flex items-center justify-between gap-3">
          {page > 1 ? <Link href={pageLink(page - 1)}>{t("donations.newer")}</Link> : <span />}
          <span className="text-sm text-muted">{t("common.page", { page, pages })}</span>
          {page < pages ? <Link href={pageLink(page + 1)}>{t("donations.older")}</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
