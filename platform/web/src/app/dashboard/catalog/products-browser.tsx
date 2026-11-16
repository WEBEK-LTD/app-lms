"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { bulkProductsAction, setProductFeaturedAction } from "@/app/actions/catalog";
import { FieldError, FormMessage } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { useDashT } from "@/components/dashboard-i18n";
import { useViewChoice, ViewToggle } from "@/components/manage-kit-client";
import { btn } from "@/components/ui";
import { KitEmpty, KitInspector, KitMore, KitSearch, KitSwitch, kit } from "@/components/studio-page";
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
 * 132.152 In the console's look: one table (its toolbar, its column heads,
 * a row of a picture and name, the price and the state), the filters and
 * the sort behind one button, and a product's details in the inspector
 * (docked beside the page on wide screens): its picture, badges, name,
 * price, category, stock and SKU, "Show in the app" and "Featured", and
 * "Edit product".
 */
export function ProductsBrowser({ products, categories, restaurant, initial }: { products: ProductRowData[]; categories: { id: number; name: string }[]; restaurant: boolean; initial: ProductFilters }) {
  const t = useDashT();
  const kind = restaurant ? "restaurant" : "shop";
  const [f, setF] = useState<ProductFilters>(initial);
  const [view, setView] = useViewChoice("products");
  // 132.131 The filters (and the sort) behind one button, open when the address asks for one.
  const [filtersOpen, setFiltersOpen] = useState(initial.category !== "all" || initial.status !== "all" || initial.sale || initial.out || initial.addon || initial.sort !== "newest");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [inspected, setInspected] = useState<number | null>(null);
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
  const open = products.find((p) => p.id === inspected) ?? null;
  // The row's state as a pill that shows or hides the product (out of stock: its state, the same action).
  const pill = (p: ProductRowData) => {
    const look = !p.active ? { tone: "bg-(--sp-soft) text-(--sp-muted)", icon: "visibility_off" as const, text: t("common.hidden") } : p.stock === 0 ? { tone: "bg-warn-bg text-warn", icon: "warning" as const, text: t("shop.outOfStock") } : { tone: "bg-success-bg text-success", icon: "visibility" as const, text: t("manage.shown") };
    const action = p.active ? t("manage.rowHide", { name: p.name }) : t("manage.rowShow", { name: p.name });
    return (
      <button type="button" disabled={pending} onClick={() => run(p.active ? "hide" : "publish", [p.id])} aria-label={action} title={action} className={`kit-tr-top inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-2.5 text-[12.5px] font-bold whitespace-nowrap transition-opacity hover:opacity-80 disabled:cursor-progress ${look.tone}`}>
        <Icon name={look.icon} size={16} />
        {look.text}
      </button>
    );
  };
  // 110.2 A sample entry stays marked in the list (and an add-on, never sold alone).
  const chips = (p: ProductRowData) => (
    <>
      {p.sample ? (
        <span data-from-demo={p.sample.demo ?? undefined} className="inline-flex h-5 shrink-0 items-center rounded-md bg-(--sp-soft) px-1.5 text-[11.5px] font-bold text-(--sp-ink-2)">
          {p.sample.label}
        </span>
      ) : null}
      {p.addon ? <span className="inline-flex h-5 shrink-0 items-center rounded-md bg-(--sp-soft) px-1.5 text-[11.5px] font-bold text-(--sp-ink-2)">{t("shop.addonBadge")}</span> : null}
    </>
  );
  const priceOf = (p: ProductRowData) => (
    <span className="kit-price flex flex-wrap items-baseline gap-x-2 font-sans text-[14.5px] font-semibold text-(--sp-ink) tabular-nums">
      <bdi dir="ltr">{p.price}</bdi>
      {p.was ? (
        <s dir="ltr" className="text-xs font-normal text-(--sp-faint)">
          {p.was}
        </s>
      ) : null}
    </span>
  );
  const check = (p: ProductRowData) => (
    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} aria-label={t("manage.selectItem", { name: p.name })} className="kit-check kit-tr-top" />
  );
  const clear = () => setF({ ...initialFilters, sort: f.sort });
  const activeFilters = [f.category !== "all", f.status !== "all", f.sale, f.out, f.addon].filter(Boolean).length;

  return (
    // 132.152 One table: the toolbar, the column heads, the rows; a product's details in the inspector.
    <section aria-labelledby="h-products" className={`${kit.card} kit-products flex min-w-0 flex-col`} data-products-browser="">
      <h2 id="h-products" className="sr-only">
        {t("shop.count", { kind, count: products.length })}
      </h2>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <KitSearch label={t("shop.search", { kind })} value={f.q} onChange={(q) => setF({ ...f, q })} />
        <button type="button" aria-expanded={filtersOpen} aria-controls="products-filters" onClick={() => setFiltersOpen((o) => !o)} className={`${kit.quiet} h-10 ${filtersOpen ? "bg-(--sp-soft)" : ""}`}>
          <Icon name="tune" size={18} />
          {t("studioPage.filters")}
          {activeFilters ? <span className="flex h-5 min-w-5 items-center justify-center rounded-md bg-ember px-1.5 font-sans text-xs font-extrabold text-[#0e0d24] tabular-nums">{activeFilters}</span> : null}
        </button>
        <span className="flex-1" />
        <span className="flex items-center gap-3 px-2 text-[13px] text-(--sp-muted)">
          <span role="status" aria-live="polite">
            {t("manage.showing", { shown: shown.length, count: products.length })}
          </span>
          {filtered ? (
            <button type="button" onClick={clear} className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-accent underline">
              {t("manage.clearFilters")}
            </button>
          ) : null}
        </span>
        <span className="max-sm:hidden">
          <ViewToggle view={view} onChange={setView} words={{ label: t("manage.view"), list: t("manage.viewList"), grid: t("manage.viewGrid") }} />
        </span>
      </div>
      <div id="products-filters" hidden={!filtersOpen} className="kit-reveal mx-3 mb-3 flex flex-wrap items-center gap-2 rounded-[14px] bg-(--sp-soft) p-2.5">
        {categories.length ? (
          <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} aria-label={t("manage.filterCategory")} className={`${kit.field} flex-[0_1_200px]`}>
            <option value="all">{t("manage.allCategories")}</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
            <option value="none">{t("manage.noCategory")}</option>
          </select>
        ) : null}
        <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProductFilters["status"] })} aria-label={t("manage.filterStatus")} className={`${kit.field} flex-[0_1_180px]`}>
          <option value="all">{t("manage.anyStatus")}</option>
          <option value="shown">{t("shop.statShown")}</option>
          <option value="hidden">{t("common.hidden")}</option>
        </select>
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
        <select value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value as Sort })} aria-label={t("manage.sort")} className={`${kit.field} ms-auto flex-[0_1_200px] max-sm:ms-0`}>
          {SORTS.map((s) => (
            <option key={s} value={s}>
              {t(SORT_WORDS[s])}
            </option>
          ))}
        </select>
      </div>

      {done ? (
        <div className="px-4 pb-3">
          <FormMessage message={done} ok />
        </div>
      ) : null}
      {!state.ok && state.message ? (
        <div className="px-4 pb-3">
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
        <ul className="m-0 grid list-none gap-3 border-t border-(--sp-line) p-3 sm:p-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(200px, 100%), 1fr))" }}>
          {shown.map((p, i) => (
            <li key={p.id} data-product={p.name} data-open={p.id === inspected ? "" : undefined} className={`group relative flex flex-col overflow-hidden rounded-[18px] bg-(--sp-cell) ring-1 transition-shadow hover:ring-(--sp-line) ${selected.has(p.id) || p.id === inspected ? "ring-(--sp-ink)" : "ring-transparent"}`}>
              <span className="relative block">
                <Picture src={p.image} icon={icon} tint={i} className={`aspect-[4/3] w-full ${p.active ? "" : "opacity-60"}`} />
                {p.salePercent ? <span className="absolute end-3 top-3 rounded-md bg-ember px-2 py-0.5 text-xs font-extrabold text-[#0e0d24]">{t("manage.percentOff", { percent: p.salePercent })}</span> : null}
              </span>
              <span className="flex flex-1 flex-col gap-2 px-4 pt-3.5 pb-4">
                <button type="button" onClick={() => setInspected(p.id)} aria-haspopup="dialog" className="kit-tr-open flex cursor-pointer flex-wrap items-center gap-1.5 border-0 bg-transparent p-0 text-start text-(--sp-ink)">
                  <span className="me-1 text-[14.5px] leading-snug font-bold break-words">{p.name}</span>
                  {chips(p)}
                </button>
                {priceOf(p)}
                <span className="mt-auto flex flex-wrap items-center gap-2">{pill(p)}</span>
              </span>
              <span className="absolute start-3 top-3 z-[1] flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 shadow-sm">{check(p)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <>
          {/* The column heads (on a phone: the box to choose them all). */}
          <div className="kit-th">
            <input type="checkbox" checked={allShownSelected} onChange={() => setSelected(allShownSelected ? new Set() : new Set(shown.map((p) => p.id)))} aria-label={t("manage.selectAll")} className="kit-check" />
            <span className="kit-col-name">
              <span className="sm:hidden">{t("manage.selectAll")}</span>
              <span className="max-sm:hidden">{t("shop.itemLabel", { kind })}</span>
            </span>
            <span className="kit-col-price">{t("common.price")}</span>
            <span className="kit-col-state">{t("common.status")}</span>
            <span className="kit-col-go" />
          </div>
          <ul className="m-0 list-none p-0">
            {shown.map((p, i) => (
              <li key={p.id} data-product={p.name} data-chosen={selected.has(p.id) ? "" : undefined} data-open={p.id === inspected ? "" : undefined} className="kit-tr last:rounded-b-[17px]">
                {check(p)}
                <Picture src={p.image} icon={icon} tint={i} className={`kit-col-pic h-11 w-11 rounded-xl ${p.active ? "" : "opacity-60"}`} />
                <span className="kit-col-name flex min-w-0">
                  <button type="button" onClick={() => setInspected(p.id)} aria-haspopup="dialog" aria-expanded={p.id === inspected} className="kit-tr-open flex min-w-0 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-start text-(--sp-ink) focus-visible:outline-offset-4">
                    <span className="min-w-0 truncate text-[14.5px] font-bold" dir="auto">
                      {p.name}
                    </span>
                    {chips(p)}
                  </button>
                </span>
                {/* On a phone, under the name (globals.css). */}
                <span className="kit-col-price">{priceOf(p)}</span>
                <span className="kit-col-state">{pill(p)}</span>
                <Icon name="chevron_right" size={20} className="kit-col-go text-(--sp-faint)" />
              </li>
            ))}
          </ul>
        </>
      )}

      {/* What to do with the chosen products, at the foot of the screen while the list scrolls. */}
      {chosen.length ? (
        <div role="region" aria-label={t("manage.bulkLabel")} data-bulk-bar="" className="sticky bottom-3 z-20 mx-3 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-[#0e0d24] px-3 py-2.5 text-[#f4efe6] shadow-[0_10px_34px_rgba(14,13,36,0.28)] sm:mx-4">
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
              <button type="button" onClick={() => setConfirmDelete(false)} className="h-9 cursor-pointer rounded-[10px] border-0 bg-white/10 px-3.5 text-sm font-semibold text-[#f4efe6] hover:bg-white/20">
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
          <button type="button" onClick={() => setSelected(new Set())} aria-label={t("manage.clearSelection")} title={t("manage.clearSelection")} className="ms-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-[10px] border-0 bg-transparent text-[#f4efe6] hover:bg-white/10">
            {pending ? <Icon name="progress_activity" size={20} className="animate-spin" /> : <Icon name="close" size={20} />}
          </button>
        </div>
      ) : null}

      <ProductInspector product={open} index={open ? products.indexOf(open) : 0} icon={icon} kind={kind} categoryName={categoryName} pending={pending} onClose={() => setInspected(null)} onActive={(p) => run(p.active ? "hide" : "publish", [p.id])} onDelete={(p) => run("delete", [p.id])} />
    </section>
  );
}

/**
 * 132.152 A product's details in the inspector: its picture, its badges
 * (a sample, on sale, an add-on), its name and price (the old one crossed
 * out), its category, stock and SKU, "Show in the app" and "Featured" as
 * switches, deleting it behind "⋯", and "Edit product" at its foot.
 */
function ProductInspector({
  product: p,
  index,
  icon,
  kind,
  categoryName,
  pending,
  onClose,
  onActive,
  onDelete,
}: {
  product: ProductRowData | null;
  index: number;
  icon: "restaurant_menu" | "shopping_bag";
  kind: "restaurant" | "shop";
  categoryName: Map<number, string>;
  pending: boolean;
  onClose: () => void;
  onActive: (p: ProductRowData) => void;
  onDelete: (p: ProductRowData) => void;
}) {
  const t = useDashT();
  const [featured, dispatchFeatured, featuring] = useActionState(setProductFeaturedAction, initialFormState);
  const [asking, setAsking] = useState(false);
  // What was asked for, while the server saves it.
  const [want, setWant] = useState<{ id: number; on: boolean } | null>(null);
  const [last, setLast] = useState<ProductRowData | null>(p);
  // The last one shown stays while the inspector closes; another product starts without the question.
  if (p && p !== last) {
    if (p.id !== last?.id) setAsking(false);
    setLast(p);
  }
  const shown = p ?? last;
  const setFeatured = (next: boolean) => {
    if (!shown) return;
    const data = new FormData();
    data.set("id", String(shown.id));
    data.set("featured", next ? "1" : "0");
    setWant({ id: shown.id, on: next });
    startTransition(() => dispatchFeatured(data));
  };
  const facts = shown
    ? ([
        [t("manage.filterCategory"), shown.categoryIds.length ? shown.categoryIds.map((c) => categoryName.get(c)).filter(Boolean).join(" · ") : t("manage.noCategory")],
        [t("shop.stock"), shown.stock === null ? t("manage.stockNotCounted") : shown.stock === 0 ? t("shop.outOfStock") : t("shop.inStock", { count: shown.stock })],
        ...(shown.sku ? [[t("shop.sku"), shown.sku]] : []),
        ...(shown.variants ? [[t("shop.variants"), t("manage.variantsCount", { count: shown.variants })]] : []),
        ...(shown.optionGroups ? [[t("shop.options"), t("shop.optionGroups", { count: shown.optionGroups })]] : []),
      ] as [string, string][])
    : [];
  return (
    <KitInspector
      open={p !== null}
      onClose={onClose}
      label={shown?.name ?? ""}
      title={t("shop.itemLabel", { kind })}
      closeLabel={t("common.close")}
      actions={
        <KitMore label={t("studioPage.more")} look="row">
          <button type="button" onClick={() => setAsking(true)} className={`${kit.menuItem} text-danger hover:text-danger`}>
            <Icon name="delete" size={18} />
            {t("shop.deleteItem", { kind })}
          </button>
        </KitMore>
      }
      footer={
        shown ? (
          <Link href={`/dashboard/catalog/${shown.id}`} className={`${kit.main} w-full`}>
            <Icon name="edit" size={18} />
            {t("shop.edit", { kind })}
          </Link>
        ) : null
      }
    >
      {shown ? (
        <div className="flex flex-col" data-inspector-product={shown.name}>
          <Picture src={shown.image} icon={icon} tint={index} className={`aspect-[16/10] w-full rounded-[14px] ${shown.active ? "" : "opacity-60"}`} />
          {shown.sample || shown.salePercent || shown.addon ? (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {shown.sample ? <span className="inline-flex h-6 items-center rounded-[7px] bg-(--sp-soft) px-2.5 text-xs font-bold text-(--sp-ink-2)">{shown.sample.label}</span> : null}
              {shown.salePercent ? <span className="inline-flex h-6 items-center rounded-[7px] bg-(--sp-peach) px-2.5 text-xs font-bold text-(--sp-peach-ink)">{t("manage.percentOff", { percent: shown.salePercent })}</span> : null}
              {shown.addon ? <span className="inline-flex h-6 items-center rounded-[7px] bg-(--sp-soft) px-2.5 text-xs font-bold text-(--sp-ink-2)">{t("shop.addonBadge")}</span> : null}
            </div>
          ) : null}
          <h2 className="m-0 mt-2.5 mb-0.5 text-[21px] leading-[1.25] font-bold break-words text-(--sp-ink)">
            <bdi>{shown.name}</bdi>
          </h2>
          <p className="m-0 flex flex-wrap items-baseline gap-2 font-sans text-lg font-semibold text-(--sp-ink) tabular-nums">
            <bdi dir="ltr">{shown.price}</bdi>
            {shown.was ? (
              <s dir="ltr" className="text-[13px] font-normal text-(--sp-faint)">
                {shown.was}
              </s>
            ) : null}
          </p>
          <dl className="m-0 mt-4 rounded-xl border border-(--sp-line)">
            {facts.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 border-b border-(--sp-line) px-3.5 py-2.5 text-[13.5px] last:border-b-0">
                <dt className="text-(--sp-muted)">{label}</dt>
                <dd className="m-0 min-w-0 text-end font-bold break-words" dir="auto">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex items-start gap-3 border-b border-(--sp-line) py-3.5">
            <span className="flex min-w-0 flex-1 flex-col">
              <span id="insp-show" className="text-sm font-bold">
                {t("shop.show")}
              </span>
              <span id="insp-show-hint" className="text-[12.5px] text-(--sp-muted)">
                {t("shop.showHint")}
              </span>
            </span>
            <KitSwitch checked={shown.active} onChange={() => onActive(shown)} labelledBy="insp-show" describedBy="insp-show-hint" disabled={pending} />
          </div>
          <div className="flex items-start gap-3 py-3.5">
            <span className="flex min-w-0 flex-1 flex-col">
              <span id="insp-featured" className="text-sm font-bold">
                {t("shop.featured")}
              </span>
              <span id="insp-featured-hint" className="text-[12.5px] text-(--sp-muted)">
                {t("shop.featuredHint")}
              </span>
            </span>
            <KitSwitch checked={featuring && want?.id === shown.id ? want.on : shown.featured} onChange={setFeatured} labelledBy="insp-featured" describedBy="insp-featured-hint" disabled={featuring} />
          </div>
          {!featured.ok && featured.message ? <FormMessage message={featured.message} /> : null}
          {asking ? (
            <div role="alert" className="mt-2 flex flex-col gap-3 rounded-[14px] bg-danger-bg p-3.5 text-sm text-danger">
              <span className="font-semibold">{t("manage.bulkDeleteConfirm", { kind, count: 1 })}</span>
              <span className="flex flex-wrap gap-2">
                <button type="button" disabled={pending} onClick={() => onDelete(shown)} className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border-0 bg-danger px-3.5 text-sm font-bold text-white disabled:opacity-60">
                  <Icon name="delete" size={18} />
                  {t("common.delete")}
                </button>
                <button type="button" onClick={() => setAsking(false)} className={kit.quiet}>
                  {t("common.cancel")}
                </button>
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </KitInspector>
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
