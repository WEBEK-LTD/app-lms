import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";
import { BulkPhotos, PhotoDrop } from "./partner-photo";
import { DeliveryAreaFields } from "./delivery-area-fields";
import { LEGACY_VENDOR_KM } from "@/lib/market/areas";
import type { BulkPhotoOutcome } from "@/lib/market/photos";
import type { MarketCoupon, RestaurantStaff } from "@/lib/data/types";
import { formatMinor, fromMinor, currencyDecimals } from "@/lib/market/currency";
import type { CatalogItem, ImportResult, PanelTab } from "@/lib/market/panel-pages";
import { fill, type PanelLang, type PanelWords } from "@/lib/market/panel-words";
import type { Statement } from "@/lib/market/statement";

/**
 * 115.7 The vendors' web panel's pages around the live board, in its look:
 * the night header with the place's name and the sections, then the page.
 */

const TAB_ICONS: Record<PanelTab, IconName> = {
  orders: "notifications",
  catalog: "inventory_2",
  import: "package_2",
  offers: "local_offer",
  delivery: "delivery_dining",
  hours: "schedule",
  staff: "person",
  statements: "receipt_long",
  complaints: "block",
};

export function PanelTabs({ tabs, current, base, lang, w }: { tabs: PanelTab[]; current: PanelTab; base: string; lang: PanelLang; w: PanelWords }) {
  const label: Record<PanelTab, string> = { orders: w.tabOrders, catalog: w.tabCatalog, import: w.tabImport, delivery: w.tabDelivery, hours: w.tabHours, offers: w.tabOffers, staff: w.tabStaff, statements: w.tabStatements, complaints: w.tabComplaints };
  return (
    <nav aria-label={w.title} className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <Link
          key={t}
          href={`${base}?tab=${t}&lang=${lang}`}
          aria-current={t === current ? "page" : undefined}
          className={`inline-flex flex-none items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold no-underline transition-colors ${t === current ? "bg-white text-midnight shadow-[0_10px_24px_-14px_rgba(0,0,0,0.8)]" : "text-night-text hover:bg-white/10 hover:text-white"}`}
        >
          <Icon name={TAB_ICONS[t]} size={18} />
          {label[t]}
        </Link>
      ))}
    </nav>
  );
}

export function PartnerFrame({ name, kind, lang, w, tabs, signOut, children }: { name: string; kind: string; lang: PanelLang; w: PanelWords; tabs: ReactNode; signOut: () => void; children: ReactNode }) {
  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-ivory">
      <div className="relative overflow-hidden bg-midnight text-white">
        <div className="pointer-events-none absolute -top-40 end-[-10%] h-96 w-96 rounded-full bg-ember/25 blur-3xl" />
        <div className="relative mx-auto flex max-w-[1440px] flex-col gap-5 px-6 pt-6 pb-5 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <Icon name={kind === "restaurant" ? "restaurant" : "storefront"} size={24} />
              </span>
              <div>
                <p className="m-0 text-xs font-bold tracking-[1.2px] text-night-muted uppercase">{w.title}</p>
                <h1 className="m-0 text-xl font-extrabold tracking-[-0.4px]">{name}</h1>
              </div>
            </div>
            <form action={signOut}>
              <button className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold text-night-muted hover:text-white">
                <Icon name="logout" size={18} />
                {w.signOut}
              </button>
            </form>
          </div>
          {tabs}
        </div>
      </div>
      <main className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}

function Card({ title, text, children, aside }: { title: string; text?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-line bg-white p-6 shadow-[0_24px_50px_-40px_rgba(14,13,36,0.6)] lg:p-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h2 className="m-0 text-2xl font-extrabold tracking-[-0.5px] text-midnight">{title}</h2>
          {text ? <p className="mt-2 mb-0 text-[15px] leading-relaxed text-muted">{text}</p> : null}
        </div>
        {aside}
      </header>
      {children}
    </section>
  );
}

const field = "h-11 rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink";
const primary = "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-midnight px-5 text-sm font-bold text-white hover:bg-ink-3";
const quiet = "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line px-4 text-sm font-bold text-ink-2 hover:border-midnight";

// Menu & stock

export function CatalogSection({ w, lang, base, items, total, perPage, page, q, outOnly, noPhotoOnly, withoutPhoto, photosRequired, multiPhoto, photoError, currency, assetUrl, saveStock, savePhoto, dropPhoto }: {
  w: PanelWords; lang: PanelLang; base: string; items: CatalogItem[]; total: number; perPage: number; page: number; q: string; outOnly: boolean; noPhotoOnly: boolean; withoutPhoto: number; photosRequired: boolean; multiPhoto: boolean;
  photoError: { id: number; error: string } | null; currency: string; assetUrl: (id: string) => string; saveStock: (f: FormData) => Promise<void>; savePhoto: (f: FormData) => Promise<void>; dropPhoto: (f: FormData) => Promise<void>;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  const link = (p: number) => `${base}?tab=catalog&lang=${lang}&page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}${outOnly ? "&out=1" : ""}${noPhotoOnly ? "&nophoto=1" : ""}`;
  const out = items.filter((i) => !i.inStock).length;
  return (
    <Card
      title={w.tabCatalog}
      text={fill(w.itemsCount, { n: total.toLocaleString(lang === "ar" ? "ar-EG" : lang) })}
      aside={
        <form className="flex flex-wrap items-center gap-2" action={base}>
          <input type="hidden" name="tab" value="catalog" />
          <input type="hidden" name="lang" value={lang} />
          <span className="relative">
            <Icon name="search" size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" />
            <input name="q" defaultValue={q} placeholder={w.search} className={`${field} w-64 ps-10`} />
          </span>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink-2">
            <input type="checkbox" name="out" value="1" defaultChecked={outOnly} className="h-4 w-4 accent-[var(--color-ember)]" />
            {w.onlyOut}
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-semibold text-ink-2">
            <input type="checkbox" name="nophoto" value="1" defaultChecked={noPhotoOnly} className="h-4 w-4 accent-[var(--color-ember)]" />
            {w.noPhotoOnly}
            <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-bold">{withoutPhoto.toLocaleString(lang === "ar" ? "ar-EG" : lang)}</span>
          </label>
          <button className={quiet}>{w.search}</button>
        </form>
      }
    >
      {photosRequired && withoutPhoto > 0 ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl bg-peach px-4 py-3 text-sm font-semibold text-accent">
          <Icon name="photo_camera" size={18} />
          {fill(w.noPhotoCount, { n: withoutPhoto.toLocaleString(lang === "ar" ? "ar-EG" : lang) })} · {w.photoRequiredNote}
        </p>
      ) : null}
      {items.length === 0 ? (
        <p className="m-0 rounded-2xl border-2 border-dashed border-line px-5 py-12 text-center text-sm font-semibold text-faint">{w.noItems}</p>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <li key={it.id} className={`flex flex-col gap-3 rounded-[20px] border p-4 ${it.inStock ? "border-line-soft bg-sand" : "border-danger/25 bg-danger-bg/40"}`}>
              <div className="flex items-start gap-3">
                <span className={`flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-2xl bg-white shadow-sm ${it.image ? "" : "border-2 border-dashed border-line-strong"}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.image ? <img src={assetUrl(it.image)} alt="" className="h-full w-full object-cover" /> : <Icon name="photo_camera" size={24} className="text-faint" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="m-0 truncate text-[15px] font-extrabold text-ink">{it.name}</p>
                  <p className="m-0 truncate text-[13px] text-muted">
                    {it.section}
                    {it.sku ? ` · ${it.sku}` : ""}
                  </p>
                  <p className="mt-1 mb-0 text-sm font-bold text-midnight" dir="ltr">
                    {formatMinor(it.price, currency)}
                    {it.unit !== "item" ? ` / ${it.unit}` : ""}
                  </p>
                </div>
                <span className="flex flex-none flex-col items-end gap-1">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${it.inStock ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>{it.inStock ? w.inStock : w.outOfStock}</span>
                  {!it.image ? <span className="rounded-full bg-peach px-2.5 py-1 text-xs font-bold text-accent">{photosRequired ? w.needsPhoto : w.noPhoto}</span> : null}
                </span>
              </div>
              {photoError && photoError.id === it.id ? <p className="m-0 rounded-xl bg-danger-bg px-3 py-2 text-[13px] font-semibold text-danger">{photoError.error}</p> : null}
              {!it.image && it.photoNote && it.photoNote !== "waiting" ? <p className="m-0 text-[12px] text-danger">{it.photoNote}</p> : null}
              <details className="group rounded-2xl bg-white/70 px-3 py-2" open={!it.image && photosRequired && (photoError?.id === it.id || undefined)}>
                <summary className="flex cursor-pointer list-none items-center gap-2 text-[13px] font-bold text-ink-2">
                  <Icon name="photo_library" size={17} className="text-accent" />
                  {it.image ? `${w.photo} · ${it.photos.length}` : w.addPhoto}
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  {it.photos.length ? (
                    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                      {it.photos.map((assetId, n) => (
                        <li key={assetId} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={assetUrl(assetId)} alt="" className={`h-14 w-14 rounded-xl object-cover ${n === 0 ? "ring-2 ring-ember" : ""}`} />
                          <form action={dropPhoto} className="absolute -end-2 -top-2">
                            <input type="hidden" name="id" value={it.id} />
                            <input type="hidden" name="asset" value={assetId} />
                            <input type="hidden" name="page" value={page} />
                            <button aria-label={w.removePhoto} title={w.removePhoto} className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-danger shadow">
                              <Icon name="delete" size={14} />
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <PhotoDrop action={savePhoto} id={it.id} page={page} as="main" w={w} label={it.image ? w.changePhoto : w.dropPhoto} />
                  {it.image && multiPhoto ? <PhotoDrop action={savePhoto} id={it.id} page={page} as="extra" w={w} label={w.morePhoto} /> : null}
                </div>
              </details>
              <form action={saveStock} className="flex items-center gap-2">
                <input type="hidden" name="id" value={it.id} />
                <input type="hidden" name="in_stock" value={it.inStock ? "0" : "1"} />
                {it.stock !== null || it.unit !== "item" || it.sku ? (
                  <input name="stock" type="number" min={0} defaultValue={it.stock ?? ""} placeholder={w.stockCount} className={`${field} h-10 w-24`} aria-label={w.stockCount} />
                ) : null}
                <button name="toggle" value="1" className={`${quiet} flex-1 ${it.inStock ? "hover:border-danger hover:text-danger" : "hover:border-success hover:text-success"}`}>
                  <Icon name={it.inStock ? "block" : "check"} size={17} />
                  {it.inStock ? w.outOfStock : w.inStock}
                </button>
                <button name="toggle" value="0" className={quiet}>
                  {w.save}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
      <footer className="mt-6 flex items-center justify-between text-sm font-semibold text-muted">
        <span>{out ? `${out} · ${w.outOfStock}` : ""}</span>
        <span className="flex items-center gap-2">
          {page > 1 ? (
            <Link className={quiet} href={link(page - 1)}>
              {w.prev}
            </Link>
          ) : null}
          <span>
            {page} / {pages}
          </span>
          {page < pages ? (
            <Link className={quiet} href={link(page + 1)}>
              {w.next}
            </Link>
          ) : null}
        </span>
      </footer>
    </Card>
  );
}

// Import

export function ImportSection({ w, restaurant, result, check, photos }: {
  w: PanelWords; restaurant: boolean; result: ImportResult | null; check: (f: FormData) => Promise<void>;
  photos: { upload: (f: FormData) => Promise<BulkPhotoOutcome[] | { error: string }>; fetchLinks: () => Promise<{ fetched: number; failed: number; left: number } | { error: string }>; waiting: number };
}) {
  if (restaurant) return <Card title={w.importTitle} text={w.restaurantsMenu}>{null}</Card>;
  return (
    <div className="flex flex-col gap-6">
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <Card title={w.importTitle} text={w.importText}>
        <form action={check} className="flex flex-col gap-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[20px] border-2 border-dashed border-line-strong bg-sand px-6 py-10 text-center hover:border-ember">
            <Icon name="package_2" size={32} className="text-accent" />
            <span className="text-sm font-bold text-ink-2">{w.file}</span>
            <input type="file" name="file" required accept=".xlsx,.xls,.csv,.tsv,.json,.txt" className="text-sm" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button name="apply" value="0" className={quiet}>
              {w.check}
            </button>
            <button name="apply" value="1" className={primary}>
              {w.importNow}
            </button>
          </div>
        </form>
      </Card>
      {result ? (
        <Card title={result.ok && result.applied && result.saved ? fill(w.imported, { c: result.saved.created, u: result.saved.updated }) : w.check}>
          {result.ok ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: w.toCreate, n: result.plan.counts.create, tone: "bg-success-bg text-success" },
                  { label: w.toUpdate, n: result.plan.counts.update, tone: "bg-peach text-accent" },
                  { label: w.toSkip, n: result.plan.counts.skip, tone: "bg-sand text-ink-2" },
                ].map((s) => (
                  <div key={s.label} className={`rounded-2xl px-4 py-4 ${s.tone}`}>
                    <p className="m-0 text-xs font-bold uppercase">{s.label}</p>
                    <p className="m-0 text-3xl font-extrabold">{s.n.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              {result.errors.length ? (
                <>
                  <h3 className="mt-6 mb-2 text-sm font-extrabold text-midnight">{w.rowErrors}</h3>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {result.errors.map((e) => (
                      <li key={e.line} className="rounded-xl bg-danger-bg px-3 py-2 text-[13px] text-danger">
                        <b>{fill(w.line, { n: e.line })}:</b> {e.errors.join(" · ")}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : (
            <p className="m-0 rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">{result.error}</p>
          )}
        </Card>
      ) : null}
    </div>
    <Card title={w.photosTitle} text={w.photosText}>
      <BulkPhotos upload={photos.upload} fetchLinks={photos.fetchLinks} waiting={photos.waiting} w={w} />
    </Card>
    </div>
  );
}

// 115.20 Hours, days off and preparation time

const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** Readable dates in the panel's language: "Thu 1 Jan 2026". */
function dayText(date: string, lang: PanelLang): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : lang, { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function HoursSection({
  w,
  lang,
  values,
  closed,
  today,
  error,
  saved,
  save,
  addDaysOff,
  removeDaysOff,
}: {
  w: PanelWords;
  lang: PanelLang;
  values: Record<string, string>;
  closed: { from: string; to: string }[];
  today: string;
  error: string | null;
  saved: boolean;
  save: (f: FormData) => Promise<void>;
  addDaysOff: (f: FormData) => Promise<void>;
  removeDaysOff: (f: FormData) => Promise<void>;
}) {
  const time = "h-10 w-[118px] rounded-xl border border-line bg-white px-2.5 text-[15px] text-ink";
  return (
    <div className="flex flex-col gap-6">
      <Card title={w.hoursTitle} text={w.hoursText}>
        {error ? <p className="mb-4 rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
        {saved ? <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-semibold text-success">{w.saved}</p> : null}
        <form action={save} className="flex flex-col gap-5">
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1 text-sm font-bold text-ink-2">{w.weekTitle}</legend>
            <p className="m-0 mb-2 text-[13px] text-muted">{w.weekHint}</p>
            {WEEK.map((day) => (
              <div key={day} className="flex flex-wrap items-center gap-2 border-t border-line-soft py-2 first-of-type:border-t-0">
                <span className="w-28 text-[15px] font-bold text-ink">{w[`day_${day}`]}</span>
                {(["", "2"] as const).map((n) => (
                  <span key={n} className="flex items-center gap-1.5">
                    {n ? <span className="text-sm text-muted">{w.andThen}</span> : null}
                    <input type="time" name={`${day}-opens${n}`} aria-label={`${w[`day_${day}`]} ${w.opens}`} defaultValue={values[`${day}-opens${n}`] ?? ""} className={time} dir="ltr" />
                    <span aria-hidden="true">–</span>
                    <input type="time" name={`${day}-closes${n}`} aria-label={`${w[`day_${day}`]} ${w.closes}`} defaultValue={values[`${day}-closes${n}`] ?? ""} className={time} dir="ltr" />
                  </span>
                ))}
              </div>
            ))}
          </fieldset>
          <label className="flex max-w-xs flex-col gap-1.5 text-sm font-bold text-ink-2">
            {w.prepTitle}
            <input name="prep" inputMode="numeric" defaultValue={values.prep} className={field} dir="ltr" />
            <span className="text-[13px] font-normal text-muted">{w.prepHint}</span>
          </label>
          <div>
            <button className={primary}>{w.saveHours}</button>
          </div>
        </form>
      </Card>
      <Card title={w.daysOffTitle} text={w.daysOffHint}>
        {closed.length ? (
          <ul className="m-0 mb-5 flex list-none flex-col gap-2 p-0">
            {closed.map((c) => (
              <li key={`${c.from}-${c.to}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-sand px-4 py-3">
                <span className="flex items-center gap-2 text-[15px] font-bold text-ink">
                  <Icon name="event_busy" size={20} />
                  {c.from === c.to ? dayText(c.from, lang) : `${dayText(c.from, lang)} – ${dayText(c.to, lang)}`}
                </span>
                <form action={removeDaysOff}>
                  <input type="hidden" name="from" value={c.from} />
                  <input type="hidden" name="to" value={c.to} />
                  <button className={quiet}>
                    <Icon name="delete" size={17} />
                    {w.dayOffRemove}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 mb-5 text-[15px] text-muted">{w.daysOffNone}</p>
        )}
        <form action={addDaysOff} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-bold text-ink-2">
            {w.dayOffFrom}
            <input type="date" name="from" min={today} required className={field} dir="ltr" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold text-ink-2">
            {w.dayOffTo}
            <input type="date" name="to" min={today} className={field} dir="ltr" />
          </label>
          <button className={primary}>
            <Icon name="add" size={18} />
            {w.dayOffAdd}
          </button>
        </form>
      </Card>
    </div>
  );
}

// Delivery

export function DeliverySection({
  w,
  values,
  currency,
  error,
  saved,
  save,
  areas = [],
  areaWarning = null,
}: {
  w: PanelWords;
  values: Record<string, string>;
  currency: string;
  error: string | null;
  saved: boolean;
  save: (f: FormData) => Promise<void>;
  /** 115 The app's named areas, and what to fix about where the place delivers. */
  areas?: { id: string; name: string; km: number }[];
  areaWarning?: "set_area" | "no_position" | null;
}) {
  const row = (label: string, child: ReactNode) => (
    <label className="flex flex-col gap-1.5 text-sm font-bold text-ink-2">
      {label}
      {child}
    </label>
  );
  return (
    <Card title={w.deliveryTitle} text={values.by === "app" ? w.appCouriersNote : undefined}>
      {error ? <p className="mb-4 rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      {saved ? <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-semibold text-success">{w.saved}</p> : null}
      <form action={save} className="grid gap-5 md:grid-cols-2">
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0 md:col-span-2">
          <legend className="mb-2 text-sm font-bold text-ink-2">{w.whoDelivers}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["app", "vendor"] as const).map((by) => (
              <label key={by} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-sand px-4 py-4 has-[:checked]:border-midnight has-[:checked]:bg-white">
                <input type="radio" name="by" value={by} defaultChecked={values.by === by} className="h-4 w-4 accent-[var(--color-ember)]" />
                <Icon name={by === "app" ? "delivery_dining" : "two_wheeler"} size={22} />
                <span className="text-[15px] font-bold text-ink">{by === "app" ? w.byApp : w.byVendor}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {row(
          w.feeKind,
          <select name="fee_kind" defaultValue={values.fee_kind} className={field}>
            <option value="fixed">{w.fixed}</option>
            <option value="per_km">{w.perKm}</option>
          </select>,
        )}
        {row(w.fee, <input name="fee" inputMode="decimal" defaultValue={values.fee} className={field} dir="ltr" placeholder={fromMinor(0, currencyDecimals(currency))} />)}
        {row(w.perKmFee, <input name="per_km" inputMode="decimal" defaultValue={values.per_km} className={field} dir="ltr" />)}
        {row(w.freeOver, <input name="free_over" inputMode="decimal" defaultValue={values.free_over} className={field} dir="ltr" />)}
        {row(w.minItems, <input name="min_items" inputMode="numeric" defaultValue={values.min_items} className={field} dir="ltr" />)}
        {row(w.maxItems, <input name="max_items" inputMode="numeric" defaultValue={values.max_items} className={field} dir="ltr" />)}
        {/* 115 Every place sets where it delivers. */}
        <div className="md:col-span-2">
          <DeliveryAreaFields
            idPrefix="p-area"
            words={{ title: w.areaTitle, hint: w.areaHint, byKm: w.areaByKm, km: w.areaKm, byAreas: w.areaByAreas, noAreas: w.areaNoAreas, setArea: fill(w.areaSetIt, { km: LEGACY_VENDOR_KM }), noPosition: w.areaNoPosition }}
            values={values}
            areas={areas}
            warning={areaWarning}
          />
        </div>
        <label className="flex items-center gap-3 text-[15px] font-semibold text-ink">
          <input type="checkbox" name="pickup" defaultChecked={values.pickup === "on"} className="h-5 w-5 accent-[var(--color-ember)]" />
          {w.allowPickup}
        </label>
        <label className="flex items-center gap-3 text-[15px] font-semibold text-ink">
          <input type="checkbox" name="scheduling" defaultChecked={values.scheduling === "on"} className="h-5 w-5 accent-[var(--color-ember)]" />
          {w.allowLater}
        </label>
        <div className="md:col-span-2">
          <button className={primary}>{w.save}</button>
        </div>
      </form>
    </Card>
  );
}

// Staff

export function StaffSection({ w, staff, me, error, add, toggle }: { w: PanelWords; staff: RestaurantStaff[]; me: number; error: string | null; add: (f: FormData) => Promise<void>; toggle: (f: FormData) => Promise<void> }) {
  const roleName = (r: string | undefined) => (w as unknown as Record<string, string>)[`role_${r ?? "manager"}`] ?? r;
  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card title={w.staffTitle}>
        <ul className="m-0 flex list-none flex-col divide-y divide-line-soft p-0">
          {staff.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 py-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-peach text-sm font-extrabold text-accent">{s.name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[15px] font-bold text-ink">
                  {s.name} {s.id === me ? <span className="text-xs font-semibold text-faint">· {w.you}</span> : null}
                </p>
                <p className="m-0 truncate text-[13px] text-muted" dir="ltr">
                  {s.email ?? s.phone ?? ""}
                </p>
              </div>
              <span className="rounded-full bg-sand px-3 py-1 text-xs font-bold text-ink-2">{roleName(s.role)}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${s.active ? "bg-success-bg text-success" : "bg-sand text-faint"}`}>{s.active ? w.active : w.off}</span>
              {s.id !== me ? (
                <form action={toggle}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={s.active ? "0" : "1"} />
                  <button className={quiet}>{s.active ? w.turnOff : w.turnOn}</button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
      <Card title={w.add}>
        {error ? <p className="mb-4 rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
        <form action={add} className="flex flex-col gap-3">
          <input name="name" required placeholder={w.name} className={field} />
          <input name="email" type="email" required placeholder={w.email} className={field} dir="ltr" />
          <select name="role" defaultValue="orders" className={field}>
            {["manager", "orders", "picker", "owner"].map((r) => (
              <option key={r} value={r}>
                {roleName(r)}
              </option>
            ))}
          </select>
          <button className={primary}>{w.add}</button>
        </form>
      </Card>
    </div>
  );
}

// Statements

export function StatementSection({ w, lang, base, month, statement, months }: { w: PanelWords; lang: PanelLang; base: string; month: string; statement: Statement; months: string[] }) {
  const t = statement.totals;
  const c = statement.currency;
  const due = t.net;
  const tiles: { label: string; value: string; big?: boolean }[] = [
    { label: w.st_orders, value: t.orders.toLocaleString() },
    { label: w.st_items, value: formatMinor(t.items, c) },
    { label: w.st_discounts, value: formatMinor(t.itemDiscounts + t.couponsByVendor, c) },
    { label: w.st_commission, value: formatMinor(t.commission + t.courierCharges, c) },
    { label: w.st_delivery, value: formatMinor(t.delivery, c) },
    { label: w.st_tax, value: formatMinor(t.tax, c) },
    { label: w.st_refunds, value: formatMinor(t.refundsByVendor + t.refundsByOwner, c) },
  ];
  const href = (format: string) => `/api/partner/${base.split("/").pop()}/statement?month=${month}&format=${format}&lang=${lang}`;
  return (
    <Card
      title={w.statementTitle}
      aside={
        <div className="flex flex-wrap items-center gap-2">
          <form action={base} className="flex items-center gap-2">
            <input type="hidden" name="tab" value="statements" />
            <input type="hidden" name="lang" value={lang} />
            <select name="month" defaultValue={month} className={field}>
              {months.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button className={quiet}>{w.month}</button>
          </form>
          {["csv", "xlsx", "pdf"].map((f) => (
            <a key={f} href={href(f)} className={`${quiet} no-underline`}>
              <Icon name="receipt_long" size={16} />
              {f.toUpperCase()}
            </a>
          ))}
        </div>
      }
    >
      <div className={`mb-6 flex items-center justify-between rounded-[20px] px-6 py-5 ${due >= 0 ? "bg-success-bg" : "bg-warn-bg"}`}>
        <span className={`text-sm font-bold ${due >= 0 ? "text-success" : "text-warn"}`}>{due >= 0 ? w.st_due : w.st_owes}</span>
        <span className={`text-3xl font-extrabold ${due >= 0 ? "text-success" : "text-warn"}`} dir="ltr">
          {formatMinor(Math.abs(due), c)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {tiles.map((s) => (
          <div key={s.label} className="rounded-2xl bg-sand px-4 py-3.5">
            <p className="m-0 text-xs font-semibold text-muted">{s.label}</p>
            <p className="m-0 mt-1 truncate text-lg font-extrabold text-midnight" dir="ltr">
              {s.value}
            </p>
          </div>
        ))}
      </div>
      {statement.orders.length === 0 ? <p className="mt-6 mb-0 text-center text-sm font-semibold text-faint">{w.noOrders}</p> : null}
    </Card>
  );
}

// Complaints

export function ComplaintsSection({ w, lang, items, currency }: { w: PanelWords; lang: PanelLang; items: { id: number; reference: string; reason: string; text: string; status: string; decision: { outcome: string; amount: number | null; funder: string; at: Date } | null; createdAt: Date }[]; currency: string }) {
  const words = w as unknown as Record<string, string>;
  return (
    <Card title={w.complaintsTitle} text={w.complaintsText}>
      {items.length === 0 ? (
        <p className="m-0 rounded-2xl border-2 border-dashed border-line px-5 py-12 text-center text-sm font-semibold text-faint">{w.noItems}</p>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
          {items.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 rounded-[20px] border border-line-soft bg-sand p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-base font-extrabold text-midnight">{c.reference}</span>
                <span className="text-xs font-semibold text-faint">{new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : lang, { dateStyle: "medium" }).format(c.createdAt)}</span>
              </div>
              <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-ink-2">
                {w.reason}: {c.reason.replace(/_/g, " ")}
              </span>
              <p className="m-0 text-[15px] leading-relaxed text-ink">{c.text}</p>
              {c.decision ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3">
                  <span className="text-sm font-bold text-midnight">
                    {w.decision}: {words[`outcome_${c.decision.outcome}`]}
                    {c.decision.amount ? <span dir="ltr"> · {formatMinor(c.decision.amount, currency)}</span> : null}
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${c.decision.funder === "vendor" ? "bg-warn-bg text-warn" : "bg-success-bg text-success"}`}>{words[`paidBy_${c.decision.funder}`]}</span>
                </div>
              ) : (
                <span className="w-fit rounded-full bg-peach px-3 py-1 text-xs font-bold text-accent">{w.waiting}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** 115.18 The place's own coupons and automatic offers: made here, paid by the place, for its own items only. */
export function OffersSection(props: {
  w: PanelWords;
  lang: PanelLang;
  currency: string;
  coupons: MarketCoupon[];
  catalog: { groups: { id: number; name: string }[]; products: { id: number; name: string }[] };
  rules: { enabled: boolean; maxPercent: number | null };
  ownDelivery: boolean;
  now: Date;
  error: string | null;
  saved: boolean;
  create: (f: FormData) => Promise<void>;
  act: (f: FormData) => Promise<void>;
}) {
  const { w, lang, currency, coupons, catalog, rules, ownDelivery, now } = props;
  const row = (label: string, child: ReactNode, hint?: string) => (
    <label className="flex flex-col gap-1.5 text-sm font-bold text-ink-2">
      {label}
      {child}
      {hint ? <span className="text-xs font-normal text-faint">{hint}</span> : null}
    </label>
  );
  const status = (c: MarketCoupon) => (c.ownerPaused ? w.offerOwnerPaused : c.endsAt && c.endsAt <= now ? w.offerEnded : c.active ? w.offerActive : w.offerPaused);
  const worth = (c: MarketCoupon) => (c.kind === "percent" ? `${c.value}%` : c.kind === "free_delivery" ? w.offerFree : formatMinor(c.value, currency, lang));
  return (
    <div className="flex flex-col gap-6">
      <Card title={w.offersTitle} text={w.offersText}>
        {props.error ? <p className="mb-4 rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger">{props.error}</p> : null}
        {props.saved ? <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-semibold text-success">{w.offerSaved}</p> : null}
        {coupons.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{w.offersNone}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {coupons.map((c) => {
              const ended = !!c.endsAt && c.endsAt <= now;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-sand px-4 py-3">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold text-ink">
                      {c.title} · {worth(c)}
                    </span>
                    <span className="text-[13px] text-muted" dir="auto">
                      {c.code ?? w.offerAuto} · {status(c)}
                    </span>
                  </span>
                  {ended ? null : (
                    <form action={props.act} className="flex gap-2">
                      <input type="hidden" name="id" value={c.id} />
                      {c.active && !c.ownerPaused ? (
                        <button name="action" value="pause" className="h-9 rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink">
                          {w.offerPause}
                        </button>
                      ) : !c.ownerPaused && rules.enabled ? (
                        <button name="action" value="resume" className="h-9 rounded-lg border border-line bg-white px-3 text-sm font-bold text-ink">
                          {w.offerResume}
                        </button>
                      ) : null}
                      <button name="action" value="end" className="h-9 rounded-lg border border-line bg-white px-3 text-sm font-bold text-danger">
                        {w.offerEnd}
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <Card title={w.offerNew} text={rules.enabled ? (rules.maxPercent !== null ? fill(w.offersMax, { max: String(rules.maxPercent) }) : undefined) : w.offersOff}>
        {rules.enabled ? (
          <form action={props.create} className="grid gap-5 md:grid-cols-2">
            {row(w.offerName, <input name="title" required maxLength={80} className={field} />)}
            {row(w.offerCode, <input name="code" maxLength={24} dir="ltr" className={`${field} uppercase`} />, w.offerCodeHint)}
            {row(
              w.offerKind,
              <select name="kind" defaultValue="percent" className={field}>
                <option value="percent">{w.offerPercent}</option>
                <option value="amount">{w.offerAmount}</option>
                {ownDelivery ? <option value="free_delivery">{w.offerFree}</option> : null}
              </select>,
              ownDelivery ? undefined : w.offerFreeNote,
            )}
            {row(w.offerValue, <input name="value" inputMode="decimal" dir="ltr" className={field} />)}
            {row(w.offerMaxDiscount, <input name="max_discount" inputMode="decimal" dir="ltr" className={field} />)}
            {row(w.offerMinOrder, <input name="min_order" inputMode="decimal" dir="ltr" className={field} />)}
            {row(w.offerUses, <input name="uses_limit" inputMode="numeric" dir="ltr" className={field} />)}
            {row(w.offerPerPerson, <input name="per_user_limit" inputMode="numeric" dir="ltr" className={field} />)}
            {row(w.offerStarts, <input name="starts" type="date" dir="ltr" className={field} />)}
            {row(w.offerEnds, <input name="ends" type="date" dir="ltr" className={field} />)}
            <label className="flex items-center gap-3 text-[15px] font-semibold text-ink md:col-span-2">
              <input type="checkbox" name="first_order" value="1" className="h-5 w-5 accent-[var(--color-ember)]" />
              {w.offerFirst}
            </label>
            {catalog.groups.length || catalog.products.length ? (
              <fieldset className="m-0 flex flex-col gap-3 border-0 p-0 md:col-span-2">
                <legend className="mb-1 text-sm font-bold text-ink-2">{w.offerOnly}</legend>
                {[
                  { title: w.offerGroups, prefix: "group_", items: catalog.groups },
                  { title: w.offerProducts, prefix: "product_", items: catalog.products },
                ].map((g) =>
                  g.items.length ? (
                    <details key={g.prefix} className="rounded-2xl border border-line bg-sand px-4 py-3">
                      <summary className="cursor-pointer text-sm font-bold text-ink">{g.title}</summary>
                      <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                        {g.items.map((item) => (
                          <label key={item.id} className="flex items-center gap-2 text-[14px] text-ink">
                            <input type="checkbox" name={`${g.prefix}${item.id}`} value="1" className="h-4 w-4 accent-[var(--color-ember)]" />
                            {item.name}
                          </label>
                        ))}
                      </div>
                    </details>
                  ) : null,
                )}
              </fieldset>
            ) : null}
            <div className="md:col-span-2">
              <button className={primary}>{w.offerCreate}</button>
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
