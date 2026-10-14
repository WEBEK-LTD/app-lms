import type { Metadata } from "next";
import { EmptyState, formatDateTime } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { donorsOf, donorTotal } from "@/lib/donations/forms";
import { donationSettingsOf } from "@/lib/donations/service";
import { DonationTabs } from "../tabs";

export const metadata: Metadata = { title: "Donors" };

/** The most donations read for the list; a charity with more exports them instead. */
const DONATIONS_READ = 10_000;

/** 29 The people who gave, by email address: how much, how often and to what. */
export default async function DonorsPage() {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "campaigns") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Donors</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">Donors are for Charity &amp; donations apps.</p>
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
  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Donors</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Everyone who gave, by email address, the most generous first. People who gave anonymously are here too: only the app hides their name.
        </p>
      </div>
      <DonationTabs current="donors" />
      {total > DONATIONS_READ ? (
        <p className="m-0 text-[15px] text-muted">This list counts your latest {DONATIONS_READ.toLocaleString("en-GB")} donations. Export them for the full list.</p>
      ) : null}
      {donors.length === 0 ? (
        <EmptyState icon="groups" title="No donors yet.">
          People show here after their first donation is paid.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
            <thead>
              <tr className="border-b border-line text-[13px] text-muted">
                <th scope="col" className="px-4 py-3 font-semibold">
                  Donor
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Given
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Campaigns
                </th>
                <th scope="col" className="px-4 py-3 font-semibold">
                  Last donation
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
                  <td className="px-4 py-3 whitespace-nowrap">{donorTotal(d, currency)}</td>
                  <td className="px-4 py-3">{d.campaigns.join(", ")}</td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap text-muted">{formatDateTime(d.lastAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
