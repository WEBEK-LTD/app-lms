import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { EmptyState, Notice, PageHeader, btn } from "@/components/ui";
import { Stat, StatRow } from "@/components/page-kit";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { fulfilmentOf } from "@/lib/catalog/fulfilment";
import { catalogSettings, paymentsSetUp } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import { priceOf } from "@/lib/hosted/connectors/catalog";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { SampleEntries } from "@/components/samples";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { startedFromDemo } from "@/lib/demo/start";
import { CatalogAnchors, CatalogTabs } from "./tabs";
import { ProductsBrowser, type ProductRowData } from "./products-browser";
import { isSort, type ProductFilters } from "./product-filters";

export async function generateMetadata(): Promise<Metadata> {
  const { app } = await requireClient("catalog");
  return { title: (await dashboardText()).t("shop.page", { kind: app?.vertical === "restaurant" ? "restaurant" : "shop" }) };
}

type Query = { saved?: string; samples?: string; samplesRemoved?: string; q?: string; category?: string; status?: string; sale?: string; out?: string; addon?: string; sort?: string };

/**
 * Products (26 a restaurant's menu) for apps without a website. 132.11 Only
 * the products here, found, filtered, sorted and changed in bulk; their
 * categories, coupons, pickup and delivery, payments and the shop's
 * settings each have their own page (the tabs).
 */
export default async function CatalogPage({ searchParams }: { searchParams: Promise<Query> }) {
  const { app } = await requireClient("catalog");
  const { t, num } = await dashboardText();
  const kind = app?.vertical === "restaurant" ? "restaurant" : "shop";
  const pageTitle = t("shop.page", { kind });
  if (!app || app.connector?.kind !== "catalog") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={pageTitle} description={richText(t("shop.fromSite", { kind }), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })} />
      </div>
    );
  }
  const query = await searchParams;
  const { saved } = query;
  const store = await getStore();
  const [products, categories] = await Promise.all([store.listCatalogProducts(app.id), store.listCatalogCategories(app.id)]);
  const settings = catalogSettings(app);
  const money = (cents: number) => formatCents(cents, settings.currency);
  const fulfilment = fulfilmentOf(app);
  const restaurant = kind === "restaurant";
  const demo = startedFromDemo(app);
  const sampleLabel = demo ? { label: t("start.first.from", { demo: DEMO_BRANDS[demo].appName }), demo } : { label: t("samples.badge"), demo: null };

  const has = products.length > 0;
  const shown = products.filter((p) => p.active && p.stock !== 0).length;
  const addLink = (
    <Link href="/dashboard/catalog/new" className={`${btn.main} h-11`}>
      <Icon name="add" size={20} />
      {t("shop.add", { kind })}
    </Link>
  );
  const rows: ProductRowData[] = products.map((p) => {
    const now = priceOf(p);
    const onSale = p.salePriceCents !== null && p.salePriceCents < p.priceCents;
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      image: p.imageAssetIds[0] ? assetUrl(p.imageAssetIds[0]) : null,
      price: money(now),
      was: onSale ? money(p.priceCents) : null,
      salePercent: onSale && p.priceCents > 0 ? Math.round((1 - now / p.priceCents) * 100) : null,
      cents: now,
      stock: p.stock,
      active: p.active,
      featured: p.featured,
      addon: Boolean(p.addon),
      digital: p.digital,
      categoryIds: p.categoryIds,
      created: p.createdAt.getTime(),
      sales: p.salesCount,
      variants: p.variants?.items.length ?? 0,
      optionGroups: p.optionGroups?.length ?? 0,
      sample: p.sample ? sampleLabel : null,
    };
  });
  const status = query.status === "shown" || query.status === "hidden" ? query.status : "all";
  const initial: ProductFilters = {
    q: query.q ?? "",
    category: query.category === "none" || categories.some((c) => String(c.id) === query.category) ? query.category! : "all",
    status,
    sale: query.sale === "1",
    out: query.out === "1",
    addon: query.addon === "1",
    sort: isSort(query.sort) ? query.sort : "newest",
  };

  return (
    <div className="flex flex-col gap-5">
      <CatalogAnchors />
      <PageHeader
        title={pageTitle}
        description={t("shop.intro", { kind })}
        actions={
          <>
            {/* 81.4 */}
            <Link href="/dashboard/catalog/import" className={`${btn.secondary} h-11`}>
              <Icon name="upload" size={20} />
              {t("imports.title")}
            </Link>
            {has ? addLink : null}
          </>
        }
      />
      <CatalogTabs app={app} />

      {saved ? (
        <p role="status" className="m-0 flex items-center gap-2 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          <Icon name="check_circle" size={20} filled />
          {t("shop.savedName", { name: saved })}
        </p>
      ) : null}
      {/* 110.2 */}
      <SampleEntries app={app} list="products" query={query} />
      {!paymentsSetUp(app) ? (
        <Notice tone="warn" icon="warning">
          {richText(t("manage.noPayments", { kind }), { link: (chunk) => <Link href="/dashboard/catalog/payments">{chunk}</Link> })}
        </Notice>
      ) : null}

      {has ? (
        <>
          <StatRow label={pageTitle}>
            <Stat icon={fulfilment ? "restaurant_menu" : "inventory_2"} label={t("shop.statItems", { kind })} value={num(products.length)} hint={categories.length ? `${t("shop.categories")}: ${num(categories.length)}` : undefined} />
            <Stat icon="check_circle" tone="success" label={t("shop.statShown")} value={num(shown)} href="/dashboard/catalog?status=shown" />
            <Stat icon="visibility_off" tone="neutral" label={t("common.hidden")} value={num(products.filter((p) => !p.active).length)} href="/dashboard/catalog?status=hidden" />
            <Stat icon="warning" tone="warn" label={t("shop.outOfStock")} value={num(products.filter((p) => p.stock === 0).length)} href="/dashboard/catalog?out=1" />
          </StatRow>
          <ProductsBrowser products={rows} categories={categories.map((c) => ({ id: c.id, name: c.name }))} restaurant={restaurant} initial={initial} />
        </>
      ) : (
        <section aria-labelledby="h-products" className="rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-products" className="sr-only">
            {t("shop.count", { kind, count: 0 })}
          </h2>
          <EmptyState icon={fulfilment ? "restaurant_menu" : "inventory_2"} title={t("shop.none", { kind })} action={addLink}>
            {t("shop.noneText", { kind })}
          </EmptyState>
          <p className="m-0 mt-4 text-center text-sm text-muted">
            {richText(t("manage.orImport", { kind }), { link: (chunk) => <Link href="/dashboard/catalog/import">{chunk}</Link> })}
          </p>
        </section>
      )}
    </div>
  );
}
