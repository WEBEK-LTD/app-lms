import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, btn, ProgressBar } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { CATALOG_CURRENCIES } from "@/lib/catalog/money";
import { getStore } from "@/lib/data";
import { CampaignStatusBadge } from "./campaign-page";
import { raisedLine } from "@/lib/donations/page-items";
import { donationSettingsOf, donationsSetUp } from "@/lib/donations/service";
import { DonationSettingsForm } from "./forms";
import { DonationPayments } from "./payments";

export const metadata: Metadata = { title: "Campaigns" };

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });

/** 29 A charity's campaigns, its card payments and how the app takes donations. */
export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ saved?: string; published?: string; deleted?: string }> }) {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "campaigns") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Campaigns</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Campaigns are for Charity &amp; donations apps. Choose Charity &amp; donations on <Link href="/dashboard/app-type">App type</Link>, then Campaigns
          managed in Yallapp on the Website step.
        </p>
      </div>
    );
  }
  const { saved, published, deleted } = await searchParams;
  const store = await getStore();
  const now = new Date();
  const [campaigns, settingsRow, given] = await Promise.all([
    store.listCampaigns(app.id),
    store.getDonationSettings(app.id),
    store.listDonations({ appId: app.id, statuses: ["paid", "refunded"], offset: 0, limit: 1 }),
  ]);
  const settings = donationSettingsOf(settingsRow);
  const ready = donationsSetUp(app);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[620px] flex-col gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Campaigns</h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">
            What you&apos;re raising money for. Open campaigns show in the app with their progress; totals count confirmed donations only.
          </p>
        </div>
        <Link href="/dashboard/campaigns/new" className={`${btn.primary} h-11`}>
          <Icon name="add" size={20} />
          Add a campaign
        </Link>
      </div>

      {saved ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {published ? `Published “${saved}”.` : `Saved “${saved}”.`}
        </p>
      ) : null}
      {deleted ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          Deleted “{deleted}”.
        </p>
      ) : null}

      {!ready ? <DonationPayments app={app} currency={settings.currency} /> : null}

      <section aria-labelledby="h-campaigns" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-campaigns" className="m-0 text-lg font-bold">
          {campaigns.length} {campaigns.length === 1 ? "campaign" : "campaigns"}
        </h2>
        {campaigns.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">No campaigns yet. Add your first one: a title, its story, a goal and the amounts people can choose.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {campaigns.map((c) => (
              <li key={c.id} className="border-t border-line-soft first:border-t-0">
                <Link href={`/dashboard/campaigns/${c.id}`} className="flex items-center gap-3 py-3 text-midnight no-underline hover:bg-sand">
                  {c.imageAssetIds[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(c.imageAssetIds[0])} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-12 w-16 shrink-0 items-center justify-center rounded-lg bg-sand text-muted">
                      <Icon name="volunteer_activism" size={22} />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-[15px] font-bold">{c.title}</span>
                    <span className="truncate text-[13px] text-muted">
                      {[raisedLine(c, settings.currency), `${c.donorCount} ${c.donorCount === 1 ? "donor" : "donors"}`, c.endsAt ? `ends ${DATE.format(c.endsAt)}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {c.goalCents ? <ProgressBar value={c.raisedCents} max={c.goalCents} label={`${c.title}: raised so far`} tone="success" /> : null}
                  </span>
                  {c.featured ? <Badge tone="info">Featured</Badge> : null}
                  <CampaignStatusBadge campaign={c} now={now} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {ready ? <DonationPayments app={app} currency={settings.currency} /> : null}

      <section aria-labelledby="h-donation-settings" className="flex max-w-[640px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-donation-settings" className="m-0 text-lg font-bold">
            Donations in the app
          </h2>
          <p className="m-0 text-[15px] text-ink-4">
            Apple doesn&apos;t let iPhone apps take donations themselves, unless the charity is approved by Apple and uses Apple Pay. So on iPhone, the donate
            button opens your donation page in the browser. On Android it opens in the app.
          </p>
        </div>
        <DonationSettingsForm settings={settings} currencies={CATALOG_CURRENCIES} currencyLocked={given.total > 0} />
      </section>
    </div>
  );
}
