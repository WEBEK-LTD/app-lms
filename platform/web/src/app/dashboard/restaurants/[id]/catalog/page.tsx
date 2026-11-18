import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ownerDeleteProductAction,
  ownerDeleteShelfAction,
  ownerOrderShelfAction,
  ownerSaveProductAction,
  ownerSaveShelfAction,
  ownerUndoChangeAction,
  ownerUndoStockAction,
} from "@/app/actions/market-catalog";
import { ProductEditor, ShelvesSection } from "@/components/partner-catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, formatDateTime, Notice, PageHeader, Section } from "@/components/ui";
import { Thumb } from "@/components/page-kit";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { MarketCatalogChange } from "@/lib/data/types";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { sellsProducts } from "@/lib/market/catalog-edit";
import { formatMinor } from "@/lib/market/currency";
import { productEditor, shelfList } from "@/lib/market/panel-pages";
import { PANEL_WORDS, type PanelLang } from "@/lib/market/panel-words";
import { marketCurrency } from "@/lib/market/settings";
import { stockAmount } from "@/lib/market/stock";
import { readCursorParam } from "@/lib/market/product-paging";
import { isFood } from "../../../shipments/parts";
import { NotFood } from "../../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("food.catalogTitle") };
}

/**
 * 115.24 The owner's view of a grocery's or shop's catalog: its products
 * (searched, paged by cursor), one product's sheet with its stock history,
 * the departments and aisles in their order, and what the place changed
 * itself (D10) with Undo.
 */
export default async function PlaceCatalogPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { app } = await requireClient("catalog");
  const { t, lang } = await dashboardText();
  if (!isFood(app)) return <NotFood title={t("food.restaurants")} t={t} />;
  const id = Number((await params).id);
  const store = await getStore();
  const vendor = Number.isSafeInteger(id) ? await store.getRestaurant(app.id, id) : null;
  if (!vendor) notFound();
  if (!sellsProducts(vendor)) redirect(`/dashboard/restaurants/${vendor.id}`);
  const query = await searchParams;
  const w = PANEL_WORDS[(["en", "ar", "tr"].includes(lang) ? lang : "en") as PanelLang];
  const currency = marketCurrency(deliverySettingsOf(await store.getDeliverySettings(app.id)));
  const self = `/dashboard/restaurants/${vendor.id}/catalog`;
  const bind = <T,>(action: (restaurantId: number, f: FormData) => Promise<T>) => action.bind(null, vendor.id);
  const error = query.error ? String(query.error).slice(0, 200) : null;

  const header = <PageHeader back={{ href: `/dashboard/restaurants/${vendor.id}`, label: vendor.name }} title={t("food.catalogTitle")} description={t("food.catalogPageIntro")} />;

  if (query.view === "shelves") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ShelvesSection
          w={w}
          shelves={await shelfList(store, app.id, vendor.id)}
          closeHref={self}
          error={error}
          save={bind(ownerSaveShelfAction)}
          remove={bind(ownerDeleteShelfAction)}
          move={bind(ownerOrderShelfAction)}
          order={bind(ownerOrderShelfAction)}
        />
      </div>
    );
  }

  const q = (query.q ?? "").slice(0, 80);
  const cursor = readCursorParam(query.cursor ?? "") ?? "";
  const [found, changes, editing] = await Promise.all([
    store.listMarketProducts({ appId: app.id, vendorId: vendor.id, ...(q ? { q } : {}), page: 1, perPage: 30, cursor }),
    store.listMarketCatalogChanges(app.id, { vendorId: vendor.id, by: "vendor", limit: 30 }),
    query.edit ? productEditor(store, app.id, vendor.id, currency, query.edit === "new" ? null : Number(query.edit) || -1) : Promise.resolve(null),
  ]);
  // A barcode or SKU typed in the search finds its product too.
  const byCode = q && !found.items.length ? await store.listMarketProducts({ appId: app.id, vendorId: vendor.id, code: q, page: 1, perPage: 5, cursor: "" }) : null;
  const items = byCode?.items.length ? byCode.items : found.items;
  const departments = new Map((await store.listMarketDepartments(app.id, vendor.id)).map((d) => [d.id, d.name]));
  const link = (extra: Record<string, string>) => `${self}?${new URLSearchParams({ ...(q ? { q } : {}), ...extra }).toString()}`;

  return (
    <div className="flex flex-col gap-6">
      {header}
      {query.undone === "1" ? (
        <Notice tone="success" icon="check_circle" role="status">
          <span className="font-semibold">{t("food.catalogUndone")}</span>
        </Notice>
      ) : null}
      {error && !editing ? (
        <Notice tone="danger" icon="error">
          <span className="font-semibold">{error}</span>
        </Notice>
      ) : null}

      <PlaceChanges changes={changes} t={t} lang={lang} undo={bind(ownerUndoChangeAction)} />

      {editing ? (
        <ProductEditor
          w={w}
          lang={lang as PanelLang}
          values={editing.values}
          shelves={editing.shelves}
          moves={editing.moves}
          productId={editing.product?.id ?? null}
          currency={currency}
          closeHref={link({})}
          error={error}
          saved={query.saved === "1"}
          save={bind(ownerSaveProductAction)}
          remove={bind(ownerDeleteProductAction)}
          undoMove={bind(ownerUndoStockAction)}
          ownerNote={false}
        />
      ) : null}

      <Section
        titleId="h-products"
        title={t("food.catalogTitle")}
        actions={
          <>
            <Link href={link({ edit: "new" })} className={`${btn.primary} h-10`} data-testid="add-product">
              <Icon name="add" size={18} />
              {w.addProduct}
            </Link>
            <Link href={`${self}?view=shelves`} className={`${btn.secondary} h-10`}>
              <Icon name="category" size={18} />
              {w.shelves}
            </Link>
          </>
        }
        flush
      >
        <form action={self} className="flex flex-wrap items-center gap-2 border-b border-line-soft px-5 py-3 sm:px-6">
          <input name="q" defaultValue={q} placeholder={t("food.catalogSearch")} aria-label={t("food.catalogSearch")} className="input h-10 min-w-0 flex-[1_1_240px]" />
          <button className={`${btn.secondary} h-10`}>
            <Icon name="search" size={18} />
            {t("food.catalogFind")}
          </button>
        </form>
        {items.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="inventory_2" title={t("food.catalogEmpty")} />
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {items.map((p, i) => {
              const soldOut = p.stock !== null && p.stock <= 0;
              return (
                <li key={p.id} className="flex flex-wrap items-center gap-3 border-b border-line-soft px-5 py-3 last:border-b-0 sm:px-6">
                  <Thumb src={p.imageAssetId ? assetUrl(p.imageAssetId) : null} icon="inventory_2" shape="square" tint={i} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{p.name}</span>
                    <span className="text-[13px] text-muted">
                      {[p.departmentId ? departments.get(p.departmentId) : null, p.sku, p.barcode].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span dir="ltr" className="text-[15px] font-semibold">
                    {formatMinor(p.price, currency)}
                    {p.unit !== "item" ? ` / ${p.unit}` : ""}
                  </span>
                  {!p.inStock && !soldOut ? (
                    <Badge tone="neutral">{t("food.catalogOff")}</Badge>
                  ) : soldOut ? (
                    <Badge tone="warn">{t("food.catalogSoldOut")}</Badge>
                  ) : p.stock === null ? (
                    <span className="text-[13px] text-muted">{t("food.catalogNotCounted")}</span>
                  ) : (
                    <Badge tone="success">{t("food.catalogInStock", { amount: `${stockAmount(p, p.stock)}${p.unit === "item" ? "" : ` ${p.unit}`}` })}</Badge>
                  )}
                  <Link href={link({ edit: String(p.id) })} className={`${btn.secondary} h-9 px-3.5 text-sm`} data-testid={`edit-${p.id}`}>
                    <Icon name="edit" size={16} />
                    {w.editProduct}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3 sm:px-6">
          {cursor ? (
            <Link href={link({})} className={`${btn.ghost} h-9`}>
              {t("food.catalogFirst")}
            </Link>
          ) : null}
          {found.nextCursor && !byCode?.items.length ? (
            <Link href={link({ cursor: found.nextCursor })} className={`${btn.secondary} h-9`}>
              {t("food.catalogMore")}
              <Icon name="arrow_forward" size={16} />
            </Link>
          ) : null}
        </div>
      </Section>
    </div>
  );
}

type T = Awaited<ReturnType<typeof dashboardText>>["t"];

function PlaceChanges({ changes, t, lang, undo }: { changes: MarketCatalogChange[]; t: T; lang: "en" | "ar" | "tr"; undo: (f: FormData) => Promise<void> }) {
  const name = (c: MarketCatalogChange) => String((c.after ?? c.before ?? {}).name ?? "");
  const words = (c: MarketCatalogChange) => {
    if (c.fields.includes("order")) return t("food.catalogChangeOrder");
    const what = t(`food.catalogEntity_${c.entity}`, { name: name(c) });
    return t(c.action === "create" ? "food.catalogChangeCreate" : c.action === "delete" ? "food.catalogChangeDelete" : "food.catalogChangeUpdate", { what });
  };
  return (
    <Section titleId="h-place-changes" title={t("food.catalogChanges")} description={t("food.catalogChangesIntro")}>
      {changes.length === 0 ? (
        <p className="m-0 text-[15px] text-muted">{t("food.catalogNoChanges")}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="place-changes">
          {changes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line-soft bg-sand/40 px-4 py-2.5">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{words(c)}</span>
                <span className="text-[13px] text-muted">
                  {t("food.catalogBy", { name: c.byName ?? "", date: formatDateTime(c.createdAt, lang) })}
                  {c.action === "update" && c.fields.length && !c.fields.includes("order") ? ` · ${t("food.catalogFields", { fields: c.fields.join(", ") })}` : ""}
                </span>
              </span>
              {c.undoneAt ? (
                <Badge tone="neutral">{t("food.catalogUndone")}</Badge>
              ) : (
                <form action={undo}>
                  <input type="hidden" name="change" value={c.id} />
                  <SubmitButton variant="secondary" className="h-9">
                    <Icon name="undo" size={18} />
                    {t("food.catalogUndo")}
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
