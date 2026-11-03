import type { Metadata } from "next";
import Link from "next/link";
import { deleteCategoryAction, renameCategoryAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, Notice, PageHeader, Section, btn } from "@/components/ui";
import { ItemRow, LinkCards, PageGroup, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList } from "@/components/page-kit-client";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { CATALOG_CURRENCIES, centsToDecimal, formatCents } from "@/lib/catalog/money";
import { DEFAULT_FULFILMENT, fulfilmentOf } from "@/lib/catalog/fulfilment";
import { catalogSettings, paymentsSetUp } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import { priceOf } from "@/lib/hosted/connectors/catalog";
import type { FulfilmentSettings } from "@/lib/data/types";
import { AddCategoryForm, FulfilmentForm, LoyaltyForm, ShopSettingsForm } from "./forms";
import { plansIn } from "@/lib/marketing-lang";
import { hasFeature, lowestPlanWith } from "@/lib/plans";
import { UpgradeHint } from "@/components/upgrade";
import { currentPlanId } from "@/lib/billing/plan-change";
import { effectivePlans } from "@/lib/entitlements";
import { CouponsPanel } from "./coupons-panel";
import { CardPayments, OtherPayments } from "./payments";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { SampleBadge, SampleEntries } from "@/components/samples";

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
export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ saved?: string; samples?: string; samplesRemoved?: string }> }) {
  const { app, license } = await requireClient("catalog");
  const { t, num, lang } = await dashboardText();
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
  const [products, categories, coupons] = await Promise.all([store.listCatalogProducts(app.id), store.listCatalogCategories(app.id), store.listCatalogCoupons(app.id)]);
  const settings = catalogSettings(app);
  const money = (cents: number) => formatCents(cents, settings.currency);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const fulfilment = fulfilmentOf(app);
  // 91.4 Loyalty points: every plan but Starter.
  const plans = plansIn(lang, await effectivePlans(store));
  const planId = license ? currentPlanId(license, new Date()) : null;
  const loyaltyInPlan = planId ? hasFeature(plans[planId], "loyalty") : false;
  const loyaltyTo = lowestPlanWith(plans, (p) => hasFeature(p, "loyalty"), planId);
  const loyalty = settings.loyalty;

  const has = products.length > 0;
  const groupOf = (p: (typeof products)[number]) => (!p.active ? "hidden" : p.stock === 0 ? "out" : "shown");
  const shown = products.filter((p) => groupOf(p) === "shown").length;
  const addLink = (
    <Link href="/dashboard/catalog/new" className={`${btn.main} h-11`}>
      <Icon name="add" size={20} />
      {t("shop.add", { kind })}
    </Link>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its one main action, the numbers, import, the list, then the settings and payments. */}
      <PageHeader title={pageTitle} description={t("shop.intro", { kind })} actions={has ? addLink : null} />

      {saved ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {t("shop.savedName", { name: saved })}
        </p>
      ) : null}
      {/* 110.2 */}
      <SampleEntries app={app} list="products" query={query} />
      {!paymentsSetUp(app) ? (
        <Notice tone="warn" icon="warning">
          {richText(t("shop.noPayments", { kind }), { link: (chunk) => <a href="#h-payments">{chunk}</a> })}
        </Notice>
      ) : null}

      {has ? (
        <StatRow label={pageTitle}>
          <Stat icon={fulfilment ? "restaurant_menu" : "inventory_2"} label={t("shop.statItems", { kind })} value={num(products.length)} hint={categories.length ? `${t("shop.categories")}: ${num(categories.length)}` : undefined} />
          <Stat icon="check_circle" tone="success" label={t("shop.statShown")} value={num(shown)} />
          <Stat icon="visibility_off" tone="neutral" label={t("common.hidden")} value={num(products.filter((p) => !p.active).length)} />
          <Stat icon="warning" tone="warn" label={t("shop.outOfStock")} value={num(products.filter((p) => groupOf(p) === "out").length)} />
        </StatRow>
      ) : null}

      <LinkCards
        label={t("shop.toolsLabel", { kind })}
        items={[
          // 81.4
          { href: "/dashboard/catalog/import", icon: "upload", label: t("imports.open"), hint: t("shop.importHint") },
        ]}
      />

      <Section titleId="h-products" title={t("shop.count", { kind, count: products.length })} flush>
        {has ? (
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("shop.search", { kind })}
            noMatch={t("shop.noMatch", { kind })}
            filters={[
              { value: "shown", label: t("shop.statShown") },
              { value: "out", label: t("shop.outOfStock") },
              { value: "hidden", label: t("common.hidden") },
            ]}
            items={products.map((p, i) => ({
              id: p.id,
              text: [p.name, p.sku, ...p.categoryIds.map((c) => categoryName.get(c))].filter(Boolean).join(" "),
              group: groupOf(p),
              node: (
                <ItemRow
                  href={`/dashboard/catalog/${p.id}`}
                  media={<Thumb src={p.imageAssetIds[0] ? assetUrl(p.imageAssetIds[0]) : null} icon={fulfilment ? "restaurant_menu" : "shopping_bag"} shape="square" tint={i} />}
                  title={p.name}
                  badges={
                    <>
                      <SampleBadge sample={p.sample} />
                      {p.featured ? <Badge tone="info">{t("shop.featured")}</Badge> : null}
                    </>
                  }
                  meta={[
                    money(priceOf(p)),
                    p.stock === null ? null : t("shop.inStock", { count: num(p.stock) }),
                    p.optionGroups?.length ? t("shop.optionGroups", { count: p.optionGroups.length }) : null,
                    ...p.categoryIds.map((c) => categoryName.get(c)),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  aside={!p.active ? <Badge tone="neutral">{t("common.hidden")}</Badge> : p.stock === 0 ? <Badge tone="warn">{t("shop.outOfStock")}</Badge> : null}
                />
              ),
            }))}
          />
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyState icon={fulfilment ? "restaurant_menu" : "inventory_2"} title={t("shop.none", { kind })} action={addLink}>
              {t("shop.noneText", { kind })}
            </EmptyState>
          </div>
        )}
      </Section>

      <PageGroup title={t("shop.groupSettings")}>
        <div className="flex flex-wrap items-start gap-5">
          <Section titleId="h-categories" title={t("shop.categories")} description={t("shop.categoriesHint", { kind })} className="flex-[1_1_380px]">
            {categories.length ? (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {categories.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-2">
                    <form action={renameCategoryAction} className="flex min-w-0 flex-[1_1_220px] items-center gap-2">
                      <input type="hidden" name="id" value={c.id} />
                      <label htmlFor={`cat-${c.id}`} className="sr-only">
                        {t("shop.categoryName")}
                      </label>
                      <input id={`cat-${c.id}`} name="name" defaultValue={c.name} maxLength={80} className="input input-sm min-w-0 flex-1" />
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
            ) : null}
            <AddCategoryForm />
          </Section>

          <Section titleId="h-shop" title={fulfilment ? t("shop.currency") : t("shop.shopSettings")} className="flex-[1_1_320px]">
            <ShopSettingsForm
              currency={settings.currency}
              currencies={CATALOG_CURRENCIES}
              shipping={settings.shippingCents ? centsToDecimal(settings.shippingCents) : ""}
              freeOver={settings.freeShippingOverCents !== null ? centsToDecimal(settings.freeShippingOverCents) : ""}
              returnDays={settings.returnDays ? String(settings.returnDays) : ""}
              tax={settings.tax ? { label: settings.tax.label, rate: String(settings.tax.rateBps / 100), included: settings.tax.included } : { label: "", rate: "", included: true }}
              shippingFields={!fulfilment}
            />
          </Section>
        </div>

        {fulfilment ? (
          <Section titleId="h-fulfilment" title={t("shop.pickupDelivery")} description={t("shop.pickupDeliveryText")}>
            <FulfilmentForm
              current={fulfilmentValues(fulfilment)}
              timezones={TIMEZONES.includes(fulfilment.timezone) ? TIMEZONES : [fulfilment.timezone, ...TIMEZONES]}
              currency={settings.currency}
            />
          </Section>
        ) : null}
      </PageGroup>

      <PageGroup title={t("shop.groupSelling")}>
        <CardPayments app={app} />
        <OtherPayments app={app} />
        {/* 91.1 Coupons. */}
        <CouponsPanel coupons={coupons} currency={settings.currency} />
        {/* 91.4 Loyalty points. */}
        {loyaltyInPlan ? (
          <Section titleId="h-loyalty" title={t("shop.loyalty")}>
            <LoyaltyForm
              currency={settings.currency}
              values={{
                on: loyalty ? "on" : "",
                spend: centsToDecimal(loyalty?.spendPerPointCents ?? 1000),
                value: centsToDecimal(loyalty?.pointValueCents ?? 10),
                minPoints: String(loyalty?.minPoints ?? 100),
              }}
            />
          </Section>
        ) : planId ? (
          <UpgradeHint title={t("shop.loyalty")} to={loyaltyTo} cta={loyaltyTo ? t("overview.upgradeTo", { plan: loyaltyTo.name }) : undefined}>
            {t("shop.loyaltyUpgradeText")}
          </UpgradeHint>
        ) : null}
      </PageGroup>
    </div>
  );
}
