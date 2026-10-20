import type { Metadata } from "next";
import Link from "next/link";
import { deleteCategoryAction, renameCategoryAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, Notice, btn } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { CATALOG_CURRENCIES, centsToDecimal, formatCents } from "@/lib/catalog/money";
import { DEFAULT_FULFILMENT, fulfilmentOf } from "@/lib/catalog/fulfilment";
import { catalogSettings, paymentsSetUp } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import { priceOf } from "@/lib/hosted/connectors/catalog";
import type { FulfilmentSettings } from "@/lib/data/types";
import { AddCategoryForm, FulfilmentForm, ShopSettingsForm } from "./forms";
import { CardPayments } from "./payments";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";

export async function generateMetadata(): Promise<Metadata> {
  const { app } = await requireClient("catalog");
  return { title: (await dashboardText()).t("shop.page", { kind: app?.vertical === "restaurant" ? "restaurant" : "shop" }) };
}

const TIMEZONES = ["Europe/Istanbul", "Europe/London", "Europe/Berlin", "Europe/Paris", "Asia/Dubai", "Asia/Riyadh", "Africa/Cairo", "America/New_York"];

/** 26 The Pickup and delivery form's values. */
function fulfilmentValues(f: FulfilmentSettings): Record<string, string> {
  const on = (b: boolean) => (b ? "on" : "");
  const values: Record<string, string> = {
    pickup: on(f.pickup),
    delivery: on(f.delivery),
    pickupAddress: f.pickupAddress ?? "",
    deliveryFee: f.deliveryFeeCents ? centsToDecimal(f.deliveryFeeCents) : "",
    minOrder: f.minOrderCents !== null ? centsToDecimal(f.minOrderCents) : "",
    deliveryAreas: f.deliveryAreas.join("\n"),
    deliveryNote: f.deliveryNote ?? "",
    prepMinutes: String(f.prepMinutes),
    timezone: f.timezone,
    asap: on(f.asap),
    scheduled: on(f.scheduled),
    slotStep: String(f.slotStepMinutes),
    maxDaysAhead: String(f.maxDaysAhead),
  };
  f.hours.forEach((ranges, d) => {
    values[`open${d}`] = on(ranges.length > 0);
    values[`start${d}`] = ranges[0]?.start ?? DEFAULT_FULFILMENT.hours[d]![0]!.start;
    values[`end${d}`] = ranges[0]?.end ?? DEFAULT_FULFILMENT.hours[d]![0]!.end;
  });
  return values;
}

/** Products (26 a restaurant's menu), categories and shop settings for apps without a website. */
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { app } = await requireClient("catalog");
  const { t, num } = await dashboardText();
  const kind = app?.vertical === "restaurant" ? "restaurant" : "shop";
  const pageTitle = t("shop.page", { kind });
  if (!app || app.connector?.kind !== "catalog") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{pageTitle}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          {richText(t("shop.fromSite", { kind }), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })}
        </p>
      </div>
    );
  }
  const { saved } = await searchParams;
  const store = await getStore();
  const [products, categories] = await Promise.all([store.listCatalogProducts(app.id), store.listCatalogCategories(app.id)]);
  const settings = catalogSettings(app);
  const money = (cents: number) => formatCents(cents, settings.currency);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const fulfilment = fulfilmentOf(app);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-[620px] flex-col gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{pageTitle}</h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("shop.intro", { kind })}</p>
        </div>
        <Link href="/dashboard/catalog/new" className={`${btn.primary} h-11`}>
          <Icon name="add" size={20} />
          {t("shop.add", { kind })}
        </Link>
      </div>

      {saved ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {t("shop.savedName", { name: saved })}
        </p>
      ) : null}
      {!paymentsSetUp(app) ? (
        <Notice tone="warn" icon="warning">
          {richText(t("shop.noPayments", { kind }), { link: (chunk) => <a href="#h-payments">{chunk}</a> })}
        </Notice>
      ) : null}

      <section aria-labelledby="h-products" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-products" className="m-0 text-lg font-bold">
          {t("shop.count", { kind, count: products.length })}
        </h2>
        {products.length === 0 ? (
          <EmptyState icon={fulfilment ? "restaurant_menu" : "inventory_2"} title={t("shop.none", { kind })}>
            {t("shop.noneText", { kind })}
          </EmptyState>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {products.map((p) => (
              <li key={p.id} className="border-t border-line-soft first:border-t-0">
                <Link href={`/dashboard/catalog/${p.id}`} className="flex items-center gap-3 py-3 text-midnight no-underline hover:bg-sand">
                  {p.imageAssetIds[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(p.imageAssetIds[0])} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sand text-muted">
                      <Icon name={fulfilment ? "restaurant_menu" : "shopping_bag"} size={22} />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-bold">{p.name}</span>
                    <span className="truncate text-[13px] text-muted">
                      {[
                        money(priceOf(p)),
                        p.stock === null ? null : t("shop.inStock", { count: num(p.stock) }),
                        p.optionGroups?.length ? t("shop.optionGroups", { count: p.optionGroups.length }) : null,
                        ...p.categoryIds.map((c) => categoryName.get(c)),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {!p.active ? <Badge tone="neutral">{t("common.hidden")}</Badge> : p.stock === 0 ? <Badge tone="warn">{t("shop.outOfStock")}</Badge> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="h-categories" className="flex min-w-0 flex-[1_1_380px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-categories" className="m-0 text-lg font-bold">
            {t("shop.categories")}
          </h2>
          {categories.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("shop.categoriesHint", { kind })}</p> : null}
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <form action={renameCategoryAction} className="flex flex-1 items-center gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <label htmlFor={`cat-${c.id}`} className="sr-only">
                    {t("shop.categoryName")}
                  </label>
                  <input id={`cat-${c.id}`} name="name" defaultValue={c.name} maxLength={80} className="input input-sm flex-1" />
                  <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                    {t("shop.rename")}
                  </SubmitButton>
                </form>
                <form action={deleteCategoryAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                    {t("common.delete")}
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
          <AddCategoryForm />
        </section>

        <section aria-labelledby="h-shop" className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-shop" className="m-0 text-lg font-bold">
            {fulfilment ? t("shop.currency") : t("shop.shopSettings")}
          </h2>
          <ShopSettingsForm
            currency={settings.currency}
            currencies={CATALOG_CURRENCIES}
            shipping={settings.shippingCents ? centsToDecimal(settings.shippingCents) : ""}
            freeOver={settings.freeShippingOverCents !== null ? centsToDecimal(settings.freeShippingOverCents) : ""}
            shippingFields={!fulfilment}
          />
        </section>
      </div>

      {fulfilment ? (
        <section aria-labelledby="h-fulfilment" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h2 id="h-fulfilment" className="m-0 text-lg font-bold">
              {t("shop.pickupDelivery")}
            </h2>
            <p className="m-0 text-[15px] text-ink-4">{t("shop.pickupDeliveryText")}</p>
          </div>
          <FulfilmentForm
            current={fulfilmentValues(fulfilment)}
            timezones={TIMEZONES.includes(fulfilment.timezone) ? TIMEZONES : [fulfilment.timezone, ...TIMEZONES]}
            currency={settings.currency}
          />
        </section>
      ) : null}

      <CardPayments app={app} />
    </div>
  );
}
