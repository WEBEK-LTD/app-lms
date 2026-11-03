import type { Metadata } from "next";
import { EmptyState, Notice, PageHeader, Section, formatDateTime } from "@/components/ui";
import { Stat, StatRow } from "@/components/page-kit";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { donorsOf } from "@/lib/donations/forms";
import { donationSettingsOf } from "@/lib/donations/service";
import { DonationTabs } from "../tabs";
import { dashboardText } from "@/lib/dashboard-lang";
import { formatCents } from "@/lib/catalog/money";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("donations.donorsTitle") };
}

/** The most donations read for the list; a charity with more exports them instead. */
const DONATIONS_READ = 10_000;

/** 29 The people who gave, by email address: how much, how often and to what. */
export default async function DonorsPage() {
  const { app } = await requireClient("donations");
  const { t, lang, num } = await dashboardText();
  if (!app || app.connector?.kind !== "campaigns") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("donations.donorsTitle")} description={t("donations.donorsNotHere")} />
      </div>
    );
  }
  const store = await getStore();
  const [{ items, total }, settingsRow] = await Promise.all([
    store.listDonations({ appId: app.id, statuses: ["paid"], offset: 0, limit: DONATIONS_READ }),
    store.getDonationSettings(app.id),
  ]);
  const { currency } = donationSettingsOf(settingsRow);
  const donors = donorsOf(items);
  const given = donors.reduce((sum, d) => sum + d.totalCents, 0);
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the two pages, the numbers, then the donors in a Section. */}
      <PageHeader title={t("donations.donorsTitle")} description={t("donations.donorsIntro")} />
      <DonationTabs current="donors" t={t} />
      {total > DONATIONS_READ ? (
        <Notice tone="neutral" icon="info">
          {t("donations.latestOnly", { count: num(DONATIONS_READ) })}
        </Notice>
      ) : null}
      {donors.length ? (
        <StatRow label={t("donations.donorsTitle")}>
          <Stat icon="groups" label={t("donations.donorsTitle")} value={num(donors.length)} />
          <Stat icon="volunteer_activism" tone="success" label={t("donations.given")} value={formatCents(given, currency)} />
          <Stat icon="favorite" tone="accent" label={t("donations.donations")} value={num(donors.reduce((sum, d) => sum + d.donations, 0))} />
        </StatRow>
      ) : null}
      <Section titleId="h-donors" title={`${t("donations.donorsTitle")} · ${num(donors.length)}`} flush>
        {donors.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="groups" title={t("donations.noDonors")}>
              {t("donations.noDonorsText")}
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-start text-[15px]">
              <thead>
                <tr className="border-b border-line-soft bg-sand text-[13px] text-muted">
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    {t("donations.donor")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    {t("donations.given")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    {t("donations.campaigns")}
                  </th>
                  <th scope="col" className="px-4 py-3 text-start font-semibold">
                    {t("donations.lastDonation")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {donors.map((d) => (
                  <tr key={d.email} className="border-b border-line-soft align-top last:border-b-0">
                    <td className="px-4 py-3">
                      <span className="flex flex-col gap-0.5">
                        <span className="font-semibold">{d.name ?? d.email}</span>
                        <span className="text-[13px] text-muted">{[d.email, d.phone].filter(Boolean).join(" · ")}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{t("donations.givenTotal", { count: d.donations, amount: formatCents(d.totalCents, currency) })}</td>
                    <td className="px-4 py-3">{d.campaigns.join(", ")}</td>
                    <td className="px-4 py-3 text-[13px] whitespace-nowrap text-muted">{formatDateTime(d.lastAt, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
