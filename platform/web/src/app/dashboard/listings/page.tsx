import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, btn } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { ListingStatus } from "@/lib/data/types";
import { formatListingPrice } from "@/lib/listings/json";
import { fold } from "@/lib/listings/search";
import { AREA_UNITS, LISTING_CURRENCIES, listingSettingsFor, propertyTypeLabel } from "@/lib/listings/types";
import { OfficeForm } from "./forms";
import { StatusBadge } from "./listing-page";

export const metadata: Metadata = { title: "Listings" };

const STATUS_FILTERS: { value: ListingStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];

/** The properties of a Real estate app, and the office's settings. */
export default async function ListingsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; saved?: string }> }) {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "listings") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Listings</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Listings are for Real estate apps. Choose Real estate on <Link href="/dashboard/app-type">App type</Link>, then Listings managed in
          Yallapp on the Website step.
        </p>
      </div>
    );
  }
  const { q = "", status = "all", saved } = await searchParams;
  const store = await getStore();
  const [all, savedSettings, unread] = await Promise.all([
    store.listListings(app.id),
    store.getListingSettings(app.id),
    store.countUnreadListingInquiries(app.id),
  ]);
  const settings = listingSettingsFor(app, savedSettings);
  const words = fold(q.trim()).split(/\s+/).filter(Boolean);
  const listings = all.filter(
    (l) =>
      (status === "all" || l.status === status) &&
      words.every((w) => fold([l.title, l.reference, l.city, l.district].filter(Boolean).join(" ")).includes(w)),
  );
  const unit = AREA_UNITS.find((u) => u.key === settings.areaUnit)?.symbol ?? "m²";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[620px] flex-col gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Listings</h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">Your properties. Published ones show in the app right away.</p>
        </div>
        <Link href="/dashboard/listings/new" className={`${btn.primary} h-11`}>
          <Icon name="add" size={20} />
          Add listing
        </Link>
      </div>

      {saved ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          Saved “{saved}”.
        </p>
      ) : null}
      {unread > 0 ? (
        <p className="m-0 flex items-start gap-2 rounded-xl bg-peach px-4 py-3 text-[15px] text-ink-2">
          <Icon name="chat" size={20} className="text-accent" />
          <span>
            {unread === 1 ? "1 conversation has" : `${unread} conversations have`} new messages. <Link href="/dashboard/inquiries">Open Inquiries</Link>
          </span>
        </p>
      ) : null}

      <section aria-labelledby="h-listings" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-listings" className="m-0 text-lg font-bold">
          {all.length} {all.length === 1 ? "listing" : "listings"}
        </h2>
        <form method="get" className="flex flex-wrap items-end gap-3" role="search">
          <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
            <label htmlFor="f-q" className="text-sm font-semibold">
              Search listings
            </label>
            <input id="f-q" name="q" type="search" defaultValue={q} placeholder="Title, reference or place" className="input input-sm" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-status" className="text-sm font-semibold">
              Status
            </label>
            <select id="f-status" name="status" defaultValue={status} className="input input-sm">
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className={`${btn.secondary} h-10`}>
            <Icon name="search" size={20} />
            Search
          </button>
        </form>
        {all.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">No listings yet. Set up your office below, then add your first property.</p>
        ) : listings.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">No listings match.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {listings.map((l) => (
              <li key={l.id} className="border-t border-line-soft first:border-t-0">
                <Link href={`/dashboard/listings/${l.id}`} className="flex items-center gap-3 py-3 text-midnight no-underline hover:bg-sand">
                  {l.imageAssetIds[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(l.imageAssetIds[0])} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sand text-muted">
                      <Icon name="apartment" size={22} />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-bold">{l.title}</span>
                    <span className="truncate text-[13px] text-muted">
                      {[
                        formatListingPrice(l.priceCents, l.currency) + (l.purpose === "rent" && l.pricePeriod ? ` / ${l.pricePeriod}` : ""),
                        propertyTypeLabel(l.type),
                        [l.district, l.city].filter(Boolean).join(", "),
                        l.area !== null ? `${l.area} ${unit}` : null,
                        l.reference,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {l.featured ? <Badge tone="info">Featured</Badge> : null}
                  <StatusBadge status={l.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-office" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 id="h-office" className="m-0 text-lg font-bold">
            Your office
          </h2>
          <p className="m-0 text-[15px] text-ink-4">How people reach you from the app, and how prices and areas are shown.</p>
        </div>
        <OfficeForm
          office={{
            currency: settings.currency,
            areaUnit: settings.areaUnit,
            contactName: settings.contactName,
            contactPhone: settings.contactPhone ?? "",
            contactWhatsapp: settings.contactWhatsapp ?? "",
            contactEmail: settings.contactEmail ?? "",
            messages: settings.messages,
          }}
          currencies={LISTING_CURRENCIES}
          units={AREA_UNITS}
        />
      </section>
    </div>
  );
}
