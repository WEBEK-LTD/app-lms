"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { bulkProductsAction } from "@/app/actions/catalog";
import { FieldError, FormMessage } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { useDashT } from "@/components/dashboard-i18n";
import { useViewChoice, ViewToggle } from "@/components/manage-kit-client";
import { Badge, btn } from "@/components/ui";
import { KitEmpty, KitSearch, KitStatus, KitToolbar, kit } from "@/components/studio-page";
import { initialFormState } from "@/lib/forms";
import type { DashKey } from "@/i18n/dashboard";
import { SORTS, type ProductFilters, type Sort } from "./product-filters";

/** 132.11 One product as the list shows it (prices already written in the shop's currency). */
export interface ProductRowData {
  id: number;
  name: string;
  sku: string | null;
  image: string | null;
  /** What it sells for now (the sale price while on sale). */
  price: string;
  /** The price crossed out while on sale. */
  was: string | null;
  salePercent: number | null;
  /** For sorting: what it sells for now, in cents. */
  cents: number;
  stock: number | null;
  active: boolean;
  featured: boolean;
  addon: boolean;
  digital: boolean;
  categoryIds: number[];
  created: number;
  sales: number;
  variants: number;
  optionGroups: number;
  /** A sample entry's badge ("Sample", or the demo it came from). */
  sample: { label: string; demo: string | null } | null;
}

const SORT_WORDS: Record<Sort, DashKey> = {
  newest: "manage.sortNewest",
  oldest: "manage.sortOldest",
  name: "manage.sortName",
  priceLow: "manage.sortPriceLow",
  priceHigh: "manage.sortPriceHigh",
  stock: "manage.sortStock",
  sales: "manage.sortSales",
};

const TINTS = ["bg-tile-1", "bg-tile-2", "bg-tile-3", "bg-tile-4", "bg-tile-5"];

function Picture({ src, icon, tint, className }: { src: string | null; icon: "restaurant_menu" | "shopping_bag"; tint: number; className: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- An uploaded picture, already sized by the platform.
    <img src={src} alt="" loading="lazy" className={`${className} object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${className} flex items-center justify-center text-ink-3 ${TINTS[tint % TINTS.length]}`}>
      <Icon name={icon} size={24} />
    </span>
  );
}

/**
 * 132.11 The Products list: a search, filters (category, shown or hidden,
 * on sale, out of stock, add-ons), a sort, a list or a grid, and the chosen
 * products shown, hidden, put in a category, their prices changed or
 * deleted at once. Filters are kept in the address, so a link opens them.
 */
export function ProductsBrowser({ products, categories, restaurant, initial }: { products: ProductRowData[]; categories: { id: number; name: string }[]; restaurant: boolean; initial: ProductFilters }) {
  const t = useDashT();
  const kind = restaurant ? "restaurant" : "shop";
  const [f, setF] = useState<ProductFilters>(initial);
  const [view, setView] = useViewChoice("products");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [state, dispatch, pending] = useActionState(bulkProductsAction, initialFormState);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const first = useRef(true);
  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  // A number's link (Hidden, Out of stock) opens the list with its filter.
  const initialKey = JSON.stringify(initial);
  const [lastInitial, setLastInitial] = useState(initialKey);
  if (lastInitial !== initialKey) {
    setLastInitial(initialKey);
    setF(JSON.parse(initialKey) as ProductFilters);
  }
  // A bulk action done: a new choice starts.
  const [seen, setSeen] = useState(state);
  if (seen !== state) {
    setSeen(state);
    if (state.ok) {
      setSelected(new Set());
      setConfirmDelete(false);
    }
  }
  const done = state.ok && state.values && !pending ? t("manage.bulkDone", { op: state.values.done ?? "", count: Number(state.values.count ?? 0) }) : null;

  // The filters in the address (the page's own words, like ?samples=, stay).
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const put = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
    put("q", f.q.trim() || null);
    put("category", f.category === "all" ? null : f.category);
    put("status", f.status === "all" ? null : f.status);
    put("sale", f.sale ? "1" : null);
    put("out", f.out ? "1" : null);
    put("addon", f.addon ? "1" : null);
    put("sort", f.sort === "newest" ? null : f.sort);
    params.delete("saved");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }, [f]);


  const q = f.q.trim().toLocaleLowerCase();
  const shown = products
    .filter((p) => {
      if (f.category === "none" ? p.categoryIds.length > 0 : f.category !== "all" && !p.categoryIds.includes(Number(f.category))) return false;
      if (f.status === "shown" && !p.active) return false;
      if (f.status === "hidden" && p.active) return false;
      if (f.sale && p.was === null) return false;
      if (f.out && p.stock !== 0) return false;
      if (f.addon && !p.addon) return false;
      if (q && ![p.name, p.sku ?? "", ...p.categoryIds.map((c) => categoryName.get(c) ?? "")].join(" ").toLocaleLowerCase().includes(q)) return false;
      return true;
    })
    .sort((a, b) => {
      switch (f.sort) {
        case "oldest":
          return a.created - b.created || a.id - b.id;
        case "name":
          return a.name.localeCompare(b.name);
        case "priceLow":
          return a.cents - b.cents;
        case "priceHigh":
          return b.cents - a.cents;
        case "stock":
          return (a.stock ?? Number.MAX_SAFE_INTEGER) - (b.stock ?? Number.MAX_SAFE_INTEGER);
        case "sales":
          return b.sales - a.sales;
        default:
          return b.created - a.created || b.id - a.id;
      }
    });
  const filtered = f.q.trim() !== "" || f.category !== "all" || f.status !== "all" || f.sale || f.out || f.addon;
  const counts = { sale: products.filter((p) => p.was !== null).length, out: products.filter((p) => p.stock === 0).length, addon: products.filter((p) => p.addon).length };
  const allShownSelected = shown.length > 0 && shown.every((p) => selected.has(p.id));
  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const run = (op: string, ids: number[], value?: string) => {
    const data = new FormData();
    data.set("op", op);
    for (const id of ids) data.append("ids", String(id));
    if (value !== undefined) data.set("value", value);
    startTransition(() => dispatch(data));
  };
  const chosen = [...selected].filter((id) => products.some((p) => p.id === id));
  const chipsOf: { key: "sale" | "out" | "addon"; label: string; count: number; chipIcon: IconName }[] = [
    { key: "sale", label: t("manage.onSale"), count: counts.sale, chipIcon: "sell" },
    { key: "out", label: t("shop.outOfStock"), count: counts.out, chipIcon: "warning" },
    ...(restaurant ? [] : [{ key: "addon" as const, label: t("manage.addons"), count: counts.addon, chipIcon: "redeem" as const }]),
  ];
  const icon = restaurant ? "restaurant_menu" : "shopping_bag";
  const status = (p: ProductRowData) =>
    !p.active ? <KitStatus tone="neutral">{t("common.hidden")}</KitStatus> : p.stock === 0 ? <KitStatus tone="warn">{t("shop.outOfStock")}</KitStatus> : <KitStatus tone="success">{t("manage.shown")}</KitStatus>;
  const badges = (p: ProductRowData) => (
    <>
      {p.sample ? (
        <span data-from-demo={p.sample.demo ?? undefined}>
          <Badge tone="info">{p.sample.label}</Badge>
        </span>
      ) : null}
      {p.featured ? <Badge tone="info">{t("shop.featured")}</Badge> : null}
      {p.addon ? <Badge tone="info">{t("shop.addonBadge")}</Badge> : null}
    </>
  );
  const metaOf = (p: ProductRowData) =>
    [
      ...p.categoryIds.map((c) => categoryName.get(c)),
      p.variants ? t("manage.variantsCount", { count: p.variants }) : null,
      p.optionGroups ? t("shop.optionGroups", { count: p.optionGroups }) : null,
      p.sku ? `${t("shop.sku")} ${p.sku}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  const priceOf = (p: ProductRowData) => (
    <span className="flex flex-wrap items-baseline gap-x-1.5" dir="auto">
      <span className="font-bold text-(--sp-ink) tabular-nums">{p.price}</span>
      {p.was ? <s className="text-[13px] text-(--sp-muted) tabular-nums">{p.was}</s> : null}
    </span>
  );
  const stockOf = (p: ProductRowData) =>
    p.stock === null ? <span className="text-(--sp-muted)">{t("manage.stockNotCounted")}</span> : p.stock === 0 ? <span className="font-semibold text-warn">{t("shop.outOfStock")}</span> : <span className="tabular-nums">{t("shop.inStock", { count: p.stock })}</span>;
  const quick = (p: ProductRowData) => (
    <button
      type="button"
      disabled={pending}
      onClick={() => run(p.active ? "hide" : "publish", [p.id])}
      aria-label={p.active ? t("manage.rowHide", { name: p.name }) : t("manage.rowShow", { name: p.name })}
      title={p.active ? t("manage.rowHide", { name: p.name }) : t("manage.rowShow", { name: p.name })}
      className={kit.icon}
    >
      <Icon name={p.active ? "visibility" : "visibility_off"} size={20} />
    </button>
  );
  const check = (p: ProductRowData, className = "") => (
    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={t("manage.selectItem", { name: p.name })} className={`h-[18px] w-[18px] shrink-0 cursor-pointer accent-midnight ${className}`} />
  );
  const clear = () => setF({ ...initialFilters, sort: f.sort });

  return (
    // 132.131 The premium kit: one card, the search and filters on top, then quiet rows.
    <section aria-labelledby="h-products" className={`${kit.card} flex min-w-0 flex-col`} data-products-browser="">
      <h2 id="h-products" className="sr-only">
        {t("shop.count", { kind, count: products.length })}
      </h2>
      {/* The bar: search, filters, sort and view; the quick filters and the count under them. */}
      <KitToolbar
        footer={
          <>
            {chipsOf.map(({ key, label, count, chipIcon }) => {
              const on = f[key];
              return (
                <button key={key} type="button" aria-pressed={on} onClick={() => setF({ ...f, [key]: !on })} className={kit.chip(on)}>
                  <Icon name={chipIcon} size={16} />
                  {label}
                  <span className={kit.chipCount(on)}>{count}</span>
                </button>
              );
            })}
            <span className="ms-auto flex items-center gap-3 text-[13px] text-(--sp-muted)">
              <span role="status" aria-live="polite">
                {t("manage.showing", { shown: shown.length, count: products.length })}
              </span>
              {filtered ? (
                <button type="button" onClick={clear} className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-accent underline">
                  {t("manage.clearFilters")}
                </button>
              ) : null}
            </span>
          </>
        }
      >
        <KitSearch label={t("shop.search", { kind })} value={f.q} onChange={(q) => setF({ ...f, q })} />
        {categories.length ? (
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} aria-label={t("manage.filterCategory")} className={`${kit.field} flex-[0_1_190px]`}>
            <option value="all">{t("manage.allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
            <option value="none">{t("manage.noCategory")}</option>
          </select>
        ) : null}
        <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProductFilters["status"] })} aria-label={t("manage.filterStatus")} className={`${kit.field} flex-[0_1_170px]`}>
          <option value="all">{t("manage.anyStatus")}</option>
          <option value="shown">{t("shop.statShown")}</option>
          <option value="hidden">{t("common.hidden")}</option>
        </select>
        <select value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value as Sort })} aria-label={t("manage.sort")} className={`${kit.field} flex-[0_1_180px]`}>
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t(SORT_WORDS[s])}
            </option>
          ))}
        </select>
        <ViewToggle view={view} onChange={setView} words={{ label: t("manage.view"), list: t("manage.viewList"), grid: t("manage.viewGrid") }} />
      </KitToolbar>

      {done ? (
        <div className="px-4 pt-4 sm:px-7">
          <FormMessage message={done} ok />
        </div>
      ) : null}
      {!state.ok && state.message ? (
        <div className="px-4 pt-4 sm:px-7">
          <FormMessage message={state.message} />
        </div>
      ) : null}

      {shown.length === 0 ? (
        <KitEmpty
          icon="search"
          title={<span role="status">{t("shop.noMatch", { kind })}</span>}
          action={
            <button type="button" onClick={clear} className={kit.quiet}>
              {t("manage.clearFilters")}
            </button>
          }
        />
      ) : view === "grid" ? (
        <>
          <label className="flex items-center gap-2.5 border-b border-(--sp-line-soft) px-4 py-3 text-[13px] font-semibold text-(--sp-muted) sm:px-7">
            <input type="checkbox" checked={allShownSelected} onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.map((p) => p.id)))} className="h-[18px] w-[18px] cursor-pointer accent-midnight" />
            {t("manage.selectAll")}
          </label>
          <ul className="m-0 grid list-none gap-4 p-4 sm:gap-5 sm:p-7" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(210px, 100%), 1fr))" }}>
            {shown.map((p, i) => (
              <li key={p.id} data-product={p.name} className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-(--sp-surface) transition-shadow hover:shadow-[0_8px_28px_-12px_rgba(14,13,36,0.25)] ${selected.has(p.id) ? "border-(--sp-ink)" : "border-(--sp-line)"}`}>
                <Link href={`/dashboard/catalog/${p.id}`} className="flex flex-1 flex-col text-(--sp-ink) no-underline hover:text-(--sp-ink)">
                  <span className="relative block">
                    <Picture src={p.image} icon={icon} tint={i} className={`aspect-[4/3] w-full ${p.active ? "" : "opacity-60"}`} />
                    {p.salePercent ? <span className="absolute end-2.5 top-2.5 rounded-full bg-ember px-2 py-0.5 text-xs font-extrabold text-[#0e0d24]">{t("manage.percentOff", { percent: p.salePercent })}</span> : null}
                  </span>
                  <span className="flex flex-1 flex-col gap-2 px-4 pt-3.5 pb-4">
                    <span className="text-[15px] leading-snug font-semibold break-words">{p.name}</span>
                    {priceOf(p)}
                    <span className="flex flex-wrap items-center gap-1.5 text-[13px]">
                      {status(p)}
                      {badges(p)}
                    </span>
                    <span className="text-[13px] text-(--sp-muted)">{stockOf(p)}</span>
                  </span>
                </Link>
                <span className="absolute start-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 shadow-sm">{check(p)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          {/* The columns' names, beside "select all" (wide screens). */}
          <div className="flex items-center gap-x-4 border-b border-(--sp-line-soft) bg-(--sp-soft) px-4 py-2.5 text-[13px] font-semibold text-(--sp-muted) sm:px-7">
            <input type="checkbox" checked={allShownSelected} onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.map((p) => p.id)))} aria-label={t("manage.selectAll")} className="h-[18px] w-[18px] cursor-pointer accent-midnight" />
            <span className="flex-1 max-md:hidden">{t("shop.itemLabel", { kind })}</span>
            <span className="flex-1 md:hidden">{t("manage.selectAll")}</span>
            <span className="w-[130px] max-md:hidden">{t("manage.colPrice")}</span>
            <span className="w-[110px] max-md:hidden">{t("shop.stock")}</span>
            <span className="w-[120px] max-md:hidden">{t("manage.colStatus")}</span>
            <span className="w-9 max-md:hidden" />
          </div>
          <ul className="m-0 flex list-none flex-col p-0">
            {shown.map((p, i) => (
              <li key={p.id} data-product={p.name} className={`flex flex-wrap items-center gap-x-4 gap-y-2.5 border-t border-(--sp-line-soft) px-4 py-3.5 transition-colors first:border-t-0 sm:px-7 ${selected.has(p.id) ? "bg-(--sp-soft)" : "hover:bg-(--sp-soft)"}`}>
                {check(p)}
                <Link href={`/dashboard/catalog/${p.id}`} className="group flex min-w-0 flex-[1_1_220px] items-center gap-3.5 rounded-xl text-(--sp-ink) no-underline hover:text-(--sp-ink)">
                  <span className="relative shrink-0">
                    <Picture src={p.image} icon={icon} tint={i} className={`h-[52px] w-[52px] rounded-xl border border-(--sp-line-soft) ${p.active ? "" : "opacity-60"}`} />
                    {p.salePercent ? <span className="absolute -end-1.5 -top-1.5 rounded-full bg-ember px-1.5 text-[11px] leading-[18px] font-extrabold text-[#0e0d24]">%</span> : null}
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[15px] font-semibold break-words group-hover:underline">{p.name}</span>
                      {badges(p)}
                    </span>
                    {metaOf(p) ? (
                      <span className="text-[13px] text-(--sp-muted)" dir="auto">
                        {metaOf(p)}
                      </span>
                    ) : null}
                  </span>
                </Link>
                {/* On a phone the price, stock and state go under the name. */}
                <span className="flex items-center gap-x-4 gap-y-1 max-md:basis-full max-md:flex-wrap max-md:ps-[34px] max-md:text-[13px]">
                  <span className="flex flex-col md:w-[130px]">
                    {priceOf(p)}
                    {p.salePercent ? <span className="text-xs font-bold text-accent">{t("manage.percentOff", { percent: p.salePercent })}</span> : null}
                  </span>
                  <span className="text-sm text-(--sp-ink) md:w-[110px]">{stockOf(p)}</span>
                  <span className="md:w-[120px]">{status(p)}</span>
                  {quick(p)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* What to do with the chosen products, at the foot of the screen while the list scrolls. */}
      {chosen.length ? (
        <div role="region" aria-label={t("manage.bulkLabel")} data-bulk-bar="" className="sticky bottom-3 z-20 mx-3 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-midnight px-3 py-2.5 text-ivory shadow-[0_10px_34px_rgba(14,13,36,0.28)] sm:mx-4">
          <span className="flex items-center gap-2 px-1.5 text-sm font-bold">
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-ember px-1.5 text-xs text-[#0e0d24] tabular-nums">{chosen.length}</span>
            {t("manage.selected", { count: chosen.length })}
          </span>
          {confirmDelete ? (
            <>
              <span className="text-sm">{t("manage.bulkDeleteConfirm", { kind, count: chosen.length })}</span>
              <button type="button" disabled={pending} onClick={() => run("delete", chosen)} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border-0 bg-danger px-3.5 text-sm font-bold text-white disabled:opacity-60">
                <Icon name="delete" size={18} />
                {t("common.delete")}
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-9 cursor-pointer rounded-[10px] border-0 bg-white/10 px-3.5 text-sm font-semibold text-ivory hover:bg-white/20">
                {t("common.cancel")}
              </button>
            </>
          ) : (
            <>
              <BarButton icon="visibility" disabled={pending} onClick={() => run("publish", chosen)}>
                {t("manage.bulkShow")}
              </BarButton>
              <BarButton icon="visibility_off" disabled={pending} onClick={() => run("hide", chosen)}>
                {t("manage.bulkHide")}
              </BarButton>
              {categories.length ? (
                <BarMenu icon="category" label={t("manage.bulkCategory")}>
                  <CategoryChoice categories={categories} pending={pending} onApply={(value) => run("category", chosen, value)} />
                </BarMenu>
              ) : null}
              <BarMenu icon="percent" label={t("manage.bulkPrice")}>
                <PriceChoice pending={pending} error={state.errors?.value} onApply={(value) => run("price", chosen, value)} />
              </BarMenu>
              <BarButton icon="delete" disabled={pending} onClick={() => setConfirmDelete(true)}>
                {t("common.delete")}
              </BarButton>
            </>
          )}
          <button type="button" onClick={() => setSelected(new Set())} aria-label={t("manage.clearSelection")} title={t("manage.clearSelection")} className="ms-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent text-ivory hover:bg-white/10">
            {pending ? <Icon name="progress_activity" size={20} className="animate-spin" /> : <Icon name="close" size={20} />}
          </button>
        </div>
      ) : null}
    </section>
  );
}

const initialFilters: ProductFilters = { q: "", category: "all", status: "all", sale: false, out: false, addon: false, sort: "newest" };

function BarButton({ icon, onClick, disabled, children }: { icon: "visibility" | "visibility_off" | "delete"; onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border-0 bg-white/10 px-3 text-sm font-semibold text-ivory hover:bg-white/20 disabled:opacity-50">
      <Icon name={icon} size={18} />
      {children}
    </button>
  );
}

/** A small panel above the bar (a category to choose, a percent to type). */
function BarMenu({ icon, label, children }: { icon: "category" | "percent"; label: string; children: React.ReactNode }) {
  return (
    <details className="group relative">
      <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-1.5 rounded-[10px] bg-white/10 px-3 text-sm font-semibold text-ivory hover:bg-white/20 [&::-webkit-details-marker]:hidden">
        <Icon name={icon} size={18} />
        {label}
        <Icon name="expand_less" size={18} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute bottom-[calc(100%+10px)] start-0 z-30 w-[min(300px,80vw)] rounded-xl border border-line bg-white p-3.5 text-midnight shadow-[0_10px_34px_rgba(14,13,36,0.2)]">{children}</div>
    </details>
  );
}

function CategoryChoice({ categories, pending, onApply }: { categories: { id: number; name: string }[]; pending: boolean; onApply: (value: string) => void }) {
  const t = useDashT();
  const [value, setValue] = useState(String(categories[0]?.id ?? "none"));
  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor="f-bulk-category" className="text-sm font-semibold">
        {t("manage.bulkCategory")}
      </label>
      <select id="f-bulk-category" value={value} onChange={(e) => setValue(e.target.value)} className="input input-sm">
        {categories.map((c) => (
          <option key={c.id} value={String(c.id)}>
            {c.name}
          </option>
        ))}
        <option value="none">{t("manage.noCategory")}</option>
      </select>
      <span className="text-xs text-muted">{t("manage.bulkCategoryHint")}</span>
      <button type="button" disabled={pending} onClick={() => onApply(value)} className={`${btn.primary} h-10`}>
        {t("manage.apply")}
      </button>
    </div>
  );
}

function PriceChoice({ pending, error, onApply }: { pending: boolean; error?: string; onApply: (value: string) => void }) {
  const t = useDashT();
  const [value, setValue] = useState("");
  return (
    <div className="flex flex-col gap-2.5">
      <label htmlFor="f-bulk-price" className="text-sm font-semibold">
        {t("manage.bulkPricePercent")}
      </label>
      <div className="flex items-center gap-2">
        <input
          id="f-bulk-price"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="10"
          aria-invalid={error ? true : undefined}
          aria-describedby="f-bulk-price-hint"
          className="input input-sm w-24"
          dir="ltr"
        />
        <span className="text-sm font-bold text-muted">%</span>
      </div>
      <span id="f-bulk-price-hint" className="text-xs text-muted">
        {t("manage.bulkPriceHint")}
      </span>
      <FieldError id="f-bulk-price-error" error={error} />
      <button type="button" disabled={pending || !value.trim()} onClick={() => onApply(value)} className={`${btn.primary} h-10`}>
        {t("manage.apply")}
      </button>
    </div>
  );
}
