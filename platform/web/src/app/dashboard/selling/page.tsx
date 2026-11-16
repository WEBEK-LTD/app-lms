import type { Metadata } from "next";
import Link from "next/link";
import { changeFlashSaleAction } from "@/app/actions/selling";
import { SubmitButton } from "@/components/form";
import { Badge, EmptyState, Notice, PageHeader, Section, btn, formatDate } from "@/components/ui";
import { ItemList, ItemRow, Thumb } from "@/components/page-kit";
import { PageTabs, TabPanel } from "@/components/page-tabs";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import { catalogSettings } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import type { App, StoreFlashSale } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { localePath } from "@/i18n/paths";
import { platformDefinition } from "@/lib/hosted/connectors/platforms";
import { DEFAULT_DELIVERY, slotLabel } from "@/lib/selling/delivery";
import { saleOn, unitsLeft } from "@/lib/selling/flash-sales";
import { giftOccasionsOf } from "@/lib/selling/gift-messages";
import { checkoutModeOf, giftsOf } from "@/lib/selling/gifts";
import { SHIPPING_COUNTRIES, STARTER_CITIES } from "@/lib/selling/shipping";
import { appLanguagesOf, platformCarriesDetails } from "@/lib/selling/store";
import { localInput, shopZone } from "@/lib/selling/zone";
import { checkoutLookOf } from "@/lib/studio/checkout-look";
import { CouponsPanel } from "../catalog/coupons-panel";
import { AddonsForm, AreasForm, CheckoutModeForm, DeliveryForm, FlashSaleForm, GiftsForm, TitlesForm } from "./forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("selling.title") };
}

const TIMEZONES = ["Europe/Istanbul", "Africa/Cairo", "Asia/Riyadh", "Asia/Dubai", "Asia/Kuwait", "Asia/Qatar", "Asia/Bahrain", "Asia/Muscat", "Europe/London", "Europe/Berlin", "America/New_York"];

type Source = { kind: "catalog" } | { kind: "platform"; name: string } | { kind: "wordpress" } | { kind: "own_api" } | { kind: "none" };

function sourceOf(app: App): Source {
  if (app.connector?.kind === "catalog") return { kind: "catalog" };
  if (app.connector?.kind === "shopify") return { kind: "platform", name: "Shopify" };
  if (app.connector?.kind === "platform") return { kind: "platform", name: platformDefinition(app.connector.platform)?.name ?? app.connector.platform };
  if (app.backend === "wordpress") return { kind: "wordpress" };
  if (app.backend === "custom_api") return { kind: "own_api" };
  return { kind: "none" };
}

/** 131 Store › Delivery & offers, for every store app whatever its source. */
export default async function SellingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { app } = await requireClient("catalog");
  const { t, lang, num } = await dashboardText();
  if (!app || app.appType !== "store") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("selling.title")} description={t("selling.notStore")} />
      </div>
    );
  }
  const store = await getStore();
  const asked = (await searchParams).tab ?? "";
  const source = sourceOf(app);
  const hosted = source.kind === "catalog" || source.kind === "platform";
  const platform = source.kind === "platform" ? source.name : null;
  const settings = catalogSettings(app);
  const currency = settings.currency;
  const money = (cents: number) => formatCents(cents, currency);
  const now = new Date();
  const zone = shopZone(app);
  const gifts = giftsOf(app);
  const look = checkoutLookOf(app);
  const mode = checkoutModeOf(gifts, look);
  const [sales, products, categories, coupons, deliveries, occasions, languages] = await Promise.all([
    store.listFlashSales(app.id),
    source.kind === "catalog" ? store.listCatalogProducts(app.id) : Promise.resolve([]),
    source.kind === "catalog" ? store.listCatalogCategories(app.id) : Promise.resolve([]),
    source.kind === "platform" ? store.listCatalogCoupons(app.id) : Promise.resolve([]),
    source.kind === "platform" ? store.listStoreDeliveries(app.id, 50) : Promise.resolve([]),
    giftOccasionsOf(store, app, now),
    appLanguagesOf(store, app),
  ]);
  // 131 The titles the owner words, in each of the app's languages.
  const langs = languages.available.map((code) => ({ code, name: code.toUpperCase() }));
  const titleValues: Record<string, string> = {};
  for (const [key, text] of Object.entries(settings.titles ?? {})) for (const [code, words] of Object.entries((text ?? {}) as Record<string, string>)) titleValues[`${key}_${code}`] = words;
  const addonSettings = settings.addons;
  const addonValues: Record<string, string> = {
    addonProductIds: (addonSettings?.productIds ?? []).join(", "),
    addonCategoryId: addonSettings?.categoryId != null ? String(addonSettings.categoryId) : "",
    addonTag: addonSettings?.tag ?? "",
    offerWith: addonSettings?.offerWith.offerWith ?? "all",
    offerCategoryIds: (addonSettings?.offerWith.categoryIds ?? []).join(", "),
    offerProductIds: (addonSettings?.offerWith.productIds ?? []).join(", "),
  };
  const ownAddons = source.kind === "catalog" ? products.filter((p) => p.addon) : [];
  const weekdays = Array.from({ length: 7 }, (_, d) => new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : lang, { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 10, 15 + d))));
  const nameOf = (code: string) => (SHIPPING_COUNTRIES[code] as Record<string, string> | undefined)?.[lang] ?? code;
  const delivery = settings.delivery ?? DEFAULT_DELIVERY;
  const deliveryValues: Record<string, string> = {
    enabled: delivery.enabled ? "on" : "",
    required: delivery.required ? "on" : "",
    sameDay: delivery.sameDay ? "on" : "",
    cutoff: delivery.cutoff ?? "",
    nextDay: delivery.nextDay ? "on" : "",
    maxDays: String(delivery.maxDays),
    timezone: delivery.timezone,
    ...Object.fromEntries(delivery.closedWeekdays.map((d) => [`closed${d}`, "on"])),
  };
  delivery.slots.forEach((s, i) => {
    deliveryValues[`slotId${i}`] = s.id;
    deliveryValues[`slotStart${i}`] = s.start;
    deliveryValues[`slotEnd${i}`] = s.end;
    deliveryValues[`slotCapacity${i}`] = s.capacity !== null ? String(s.capacity) : "";
    deliveryValues[`slotFee${i}`] = s.feeCents ? centsToDecimal(s.feeCents) : "";
  });
  const areaValues: Record<string, string> = {
    shippingMode: settings.shippingMode ?? "flat",
    cityPrices: (settings.cityPrices ?? []).map((p) => `${p.city}: ${centsToDecimal(p.cents)}`).join("\n"),
    otherCity: settings.otherCityCents != null ? centsToDecimal(settings.otherCityCents) : "",
    originLat: settings.distancePricing ? String(settings.distancePricing.origin.lat) : "",
    originLng: settings.distancePricing ? String(settings.distancePricing.origin.lng) : "",
    baseFee: settings.distancePricing?.baseCents ? centsToDecimal(settings.distancePricing.baseCents) : "",
    perKm: settings.distancePricing ? centsToDecimal(settings.distancePricing.perKmCents) : "",
    maxKm: settings.distancePricing?.maxKm != null ? String(settings.distancePricing.maxKm) : "",
    byWeight: settings.weightPricing ? "on" : "",
    perKg: settings.weightPricing ? centsToDecimal(settings.weightPricing.perKgCents) : "",
    includedKg: settings.weightPricing ? String(settings.weightPricing.includedKg) : "",
    minFee: settings.shippingMinCents != null ? centsToDecimal(settings.shippingMinCents) : "",
  };
  (settings.areas ?? []).forEach((a, i) => {
    areaValues[`country${i}`] = a.country;
    areaValues[`cities${i}`] = (a.cities ?? []).join("\n");
  });
  const startersOf = Object.fromEntries(Object.entries(STARTER_CITIES).map(([code, cities]) => [code, cities.map((c) => (c as Record<string, string>)[lang] ?? c.en).join(", ")]));
  const noWeight = source.kind === "catalog" && settings.weightPricing ? products.filter((p) => p.active && !p.digital && !p.weightGrams).length : 0;
  const saleState = (s: StoreFlashSale) =>
    !s.active ? <Badge tone="neutral">{t("selling.turnOff")}</Badge> : unitsLeft(s) === 0 ? <Badge tone="warn">{t("selling.soldOut")}</Badge> : saleOn(s, now) ? <Badge tone="success">{t("selling.live")}</Badge> : s.endsAt <= now ? <Badge tone="neutral">{t("selling.ended")}</Badge> : <Badge tone="info">{t("selling.scheduled", { date: formatDate(s.startsAt, lang) })}</Badge>;
  const saleValues = (s: StoreFlashSale): Record<string, string> => ({
    title: s.title,
    productIds: s.productIds.join(","),
    categoryId: s.categoryId !== null ? String(s.categoryId) : "",
    kind: s.discount.kind,
    value: s.discount.kind === "percent" ? String(s.discount.percent) : centsToDecimal(s.discount.cents),
    startsAt: localInput(s.startsAt, zone),
    endsAt: localInput(s.endsAt, zone),
    limit: s.limit !== null ? String(s.limit) : "",
    platformCode: s.platformCode ?? "",
    ...Object.fromEntries(Object.entries(s.titles ?? {}).map(([code, text]) => [`title_${code}`, text])),
  });
  const otherLangs = langs.filter((l) => l.code !== languages.default);
  // 131 A flash sale's list never has a gift add-on.
  const flashProducts = source.kind === "catalog" ? products.filter((p) => p.active && !p.addon).map((p) => ({ id: p.id, name: p.name })) : null;
  const flashCategories = categories.map((c) => ({ id: c.id, name: c.name }));
  const templatesCount = occasions.reduce((n, o) => n + o.templates.length, 0);
  // 132.25 The tabs the source uses; `?tab=` opens one (an old link to a part, `#h-flash`, too).
  const titled = source.kind !== "own_api" && source.kind !== "none";
  const offers = hosted || source.kind === "wordpress";
  const tabs = [
    ...(hosted || titled ? [{ id: "checkout", label: t("selling.checkoutTitle"), icon: "shopping_cart" as const }] : []),
    ...(hosted ? [{ id: "delivery", label: t("manage.deliveryTab"), icon: "schedule" as const }] : []),
    ...(hosted ? [{ id: "areas", label: t("manage.areasTab"), icon: "pin_drop" as const }] : []),
    { id: "gifts", label: t("manage.giftsTab"), icon: "redeem" as const },
    ...(titled ? [{ id: "addons", label: t("selling.addonsTitle"), icon: "add_circle" as const }] : []),
    ...(offers ? [{ id: "flash", label: t("manage.offersTab"), icon: "bolt" as const, count: sales.length }] : []),
    ...(platform ? [{ id: "deliveries", label: t("selling.deliveriesTitle"), icon: "local_shipping" as const, count: deliveries.length }] : []),
  ];
  const tab = tabs.some((x) => x.id === asked) ? asked : tabs[0]!.id;

  return (
    <div className="flex flex-col gap-6" data-selling-page={source.kind}>
      <PageHeader title={t("selling.title")} description={t("selling.intro")} />

      {/* Where each part applies, honestly, per source. */}
      {source.kind === "catalog" ? <Notice tone="info">{t("selling.srcCatalog")}</Notice> : null}
      {platform ? (
        <Notice tone="warn" icon="warning">
          {t("selling.srcPlatform", { platform })} {platformCarriesDetails(app) ? t("selling.srcCarries", { platform }) : t("selling.srcRecords", { platform })}
        </Notice>
      ) : null}
      {source.kind === "wordpress" ? <Notice tone="info">{t("selling.srcWordpress")}</Notice> : null}
      {source.kind === "own_api" ? (
        <Notice tone="info">{richText(t("selling.srcOwnApi"), { link: (chunk) => <Link href={`${localePath(lang, "/developers")}#store`}>{chunk}</Link> })}</Notice>
      ) : null}

      {/* 132.25 Each part in its tab (those the source uses): the checkout, delivery times, where it goes and its fees, gifts and card messages, add-ons, flash sales and codes, and the deliveries a platform's shop gets. */}
      <PageTabs label={t("selling.title")} initial={tab} tabs={tabs}>
        {hosted || titled ? (
          <TabPanel tab="checkout">
            {hosted ? (
                <Section titleId="h-checkout" title={t("selling.checkoutTitle")} description={t("selling.checkoutIntro")}>
                  {look?.mode === "gift" ? <Notice tone="info">{t("selling.lookGift")}</Notice> : null}
                  <CheckoutModeForm mode={gifts.checkout === "gift" ? "gift" : "standard"} />
                </Section>
            ) : null}
            {source.kind !== "own_api" && source.kind !== "none" ? (
              <Section titleId="h-titles" title={t("selling.titlesTitle")} description={t("selling.titlesIntro")}>
                <TitlesForm values={titleValues} languages={langs} />
              </Section>
            ) : null}
          </TabPanel>
        ) : null}
        {hosted ? (
          <TabPanel tab="delivery">
            <Section titleId="h-delivery" title={t("selling.deliveryTitle")} description={t("selling.deliveryIntro")}>
              {mode === "gift" ? <p className="m-0 text-[13px] text-muted">{t("selling.giftForces")}</p> : null}
              <DeliveryForm values={deliveryValues} currency={currency} timezones={TIMEZONES.includes(delivery.timezone) ? TIMEZONES : [delivery.timezone, ...TIMEZONES]} weekdays={weekdays} feesNote={platform ? t("selling.feesPlatform", { platform }) : null} />
            </Section>
          </TabPanel>
        ) : null}
        {hosted ? (
          <TabPanel tab="areas">
            <Section titleId="h-areas" title={t("selling.areasTitle")} description={t("selling.areasIntro")}>
              {platform ? <Notice tone="warn" icon="warning">{t("selling.shippingPlatform", { platform })}</Notice> : null}
              {settings.freeShippingOverCents !== null ? <p className="m-0 text-[13px] text-muted">{t("selling.freeOver", { amount: money(settings.freeShippingOverCents) })}</p> : null}
              {noWeight > 0 ? <Notice tone="warn" icon="warning">{t("selling.needsWeights", { count: noWeight })}</Notice> : null}
              <AreasForm values={areaValues} currency={currency} countries={Object.keys(SHIPPING_COUNTRIES).map((code) => ({ code, name: nameOf(code) }))} starters={startersOf} />
            </Section>
          </TabPanel>
        ) : null}
        <TabPanel tab="gifts">
          {hosted ? (
              <Section titleId="h-gifts" title={t("selling.giftsTitle")} description={t("selling.giftsIntro")}>
                <GiftsForm
                  values={{ message: gifts.message ? "on" : "", maxLength: String(gifts.maxLength), starters: gifts.starters.join("\n"), recipient: gifts.recipient ? "on" : "", anonymous: gifts.anonymous ? "on" : "" }}
                />
              </Section>
          ) : null}
          <Section
            titleId="h-messages"
            title={t("selling.messagesTitle")}
            description={t("selling.messagesIntro")}
            actions={
              <Link href="/dashboard/selling/messages" className={`${btn.secondary} h-10`}>
                {t("selling.messagesOpen")}
              </Link>
            }
          >
            <p className="m-0 text-[15px]" data-messages-count="">
              {t("selling.messagesCount", { occasions: occasions.length, messages: templatesCount })}
            </p>
          </Section>
        </TabPanel>
        {titled ? (
          <TabPanel tab="addons">
            {/* 131 Gift add-ons: "Add a little more" with the products they go with. */}
            {source.kind !== "own_api" && source.kind !== "none" ? (
              <Section titleId="h-addons" title={t("selling.addonsTitle")} description={t("selling.addonsIntro")}>
                {source.kind === "catalog" ? (
                  <>
                    <Notice tone="info">{richText(t("selling.addonsCatalog"), { link: (chunk) => <Link href="/dashboard/catalog">{chunk}</Link> })}</Notice>
                    <p className="m-0 text-[15px]" data-addons-count="">
                      {ownAddons.length ? t("selling.addonsCount", { count: ownAddons.length, names: ownAddons.slice(0, 5).map((p) => p.name).join(", ") }) : t("selling.addonsNone")}
                    </p>
                  </>
                ) : null}
                {source.kind === "wordpress" ? <Notice tone="info">{t("selling.addonsWordpress")}</Notice> : null}
                {platform ? (
                  <>
                    <Notice tone="warn" icon="warning">
                      {t("selling.addonsPlatform", { platform })}
                    </Notice>
                    <AddonsForm values={addonValues} tags={app.connector?.kind === "shopify"} platform={platform} />
                  </>
                ) : null}
              </Section>
            ) : null}
          </TabPanel>
        ) : null}
        {offers ? (
          <TabPanel tab="flash">
            {hosted ? (
              <>
                <Section
                  titleId="h-flash"
                  title={t("selling.flashTitle")}
                  description={t("selling.flashIntro")}
                  actions={
                    sales.length ? (
                      <SheetButton target="new-flash" variant="secondary" className="h-10">
                        {t("selling.addFlash")}
                      </SheetButton>
                    ) : null
                  }
                  flush
                >
                  {sales.length ? (
                    <ItemList>
                      {sales.map((s, i) => (
                        <ItemRow
                          key={s.id}
                          data-flash-sale={s.id}
                          media={<Thumb icon="bolt" shape="square" tint={i + 2} />}
                          title={s.title}
                          badges={
                            <>
                              {saleState(s)}
                              {platform && !s.platformCode ? <Badge tone="warn">{t("selling.platformCode", { platform })}</Badge> : null}
                            </>
                          }
                          meta={[
                            s.discount.kind === "percent" ? `−${num(s.discount.percent)}%` : money(s.discount.cents),
                            `${formatDate(s.startsAt, lang)} – ${formatDate(s.endsAt, lang)}`,
                            s.limit !== null ? t("selling.soldOf", { sold: num(s.sold), limit: num(s.limit) }) : t("selling.soldCount", { sold: num(s.sold) }),
                          ].join(" · ")}
                          actions={
                            <>
                              <SheetButton target={`flash-${s.id}`} variant="secondary" className="h-9 px-3.5 text-sm">
                                {t("shop.couponEdit")}
                              </SheetButton>
                              <form action={changeFlashSaleAction}>
                                <input type="hidden" name="id" value={s.id} />
                                <input type="hidden" name="change" value={s.active ? "off" : "on"} />
                                <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm">
                                  {s.active ? t("selling.turnOff") : t("selling.turnOn")}
                                </SubmitButton>
                              </form>
                              <form action={changeFlashSaleAction}>
                                <input type="hidden" name="id" value={s.id} />
                                <input type="hidden" name="change" value="delete" />
                                <SubmitButton variant="danger" className="h-9 px-3.5 text-sm">
                                  {t("common.delete")}
                                </SubmitButton>
                              </form>
                            </>
                          }
                        />
                      ))}
                    </ItemList>
                  ) : (
                    <div className="p-5 sm:p-6">
                      <EmptyState icon="bolt" title={t("selling.noFlash")} />
                    </div>
                  )}
                </Section>
                {platform && sales.some((s) => !s.platformCode) ? (
                  <Notice tone="warn" icon="warning">
                    {t("selling.platformNoCode", { platform })}
                  </Notice>
                ) : null}
                <Sheet id="new-flash" inline={!sales.length} title={t("selling.addFlash")}>
                  <FlashSaleForm currency={currency} zone={zone} products={flashProducts} categories={flashCategories} platform={platform} languages={otherLangs} />
                </Sheet>
                {sales.map((s) => (
                  <Sheet key={s.id} id={`flash-${s.id}`} title={s.title}>
                    <FlashSaleForm sale={{ id: s.id, values: saleValues(s) }} currency={currency} zone={zone} products={flashProducts} categories={flashCategories} platform={platform} languages={otherLangs} />
                  </Sheet>
                ))}
              </>
            ) : source.kind === "wordpress" ? (
              <Notice tone="info">{t("selling.flashWordpress")}</Notice>
            ) : null}
            <section aria-labelledby="h-codes" className="flex flex-col gap-4">
              <h2 id="h-codes" className="m-0 text-lg font-bold">
                {t("selling.couponsTitle")}
              </h2>
              {source.kind === "catalog" ? <Notice tone="info">{richText(t("selling.couponsCatalog"), { link: (chunk) => <Link href="/dashboard/catalog/coupons">{chunk}</Link> })}</Notice> : null}
              {source.kind === "wordpress" ? <Notice tone="info">{t("selling.couponsWordpress")}</Notice> : null}
              {platform ? (
                <>
                  <Notice tone="warn" icon="warning">
                    {t("selling.couponsPlatform", { platform })}
                  </Notice>
                  <CouponsPanel coupons={coupons} currency={currency} />
                </>
              ) : null}
            </section>
          </TabPanel>
        ) : null}
        {platform ? (
          <TabPanel tab="deliveries">
            {platform ? (
              <Section titleId="h-deliveries" title={t("selling.deliveriesTitle")} description={t("selling.deliveriesIntro", { platform })} flush>
                {deliveries.length ? (
                  <ItemList>
                    {deliveries.map((d, i) => (
                      <ItemRow
                        key={d.id}
                        data-store-delivery={d.id}
                        media={<Thumb icon="local_shipping" shape="square" tint={i} />}
                        title={d.delivery.recipient ? `${t("selling.recipientLabel")}: ${d.delivery.recipient.name} · ${d.delivery.recipient.phone}` : (d.buyer.name ?? d.buyer.phone ?? "—")}
                        badges={d.passed ? <Badge tone="success">{t("selling.passed", { platform })}</Badge> : <Badge tone="neutral">{t("selling.notPassed")}</Badge>}
                        meta={[
                          d.delivery.date ? `${t("selling.when")}: ${d.delivery.date}${d.delivery.slot ? ` ${slotLabel(d.delivery.slot)}` : ""}` : null,
                          d.delivery.sender ? `${t("selling.sender")}: ${d.delivery.sender.name} · ${d.delivery.sender.phone} · ${d.delivery.sender.email}` : null,
                          d.delivery.recipient?.address ?? null,
                          d.delivery.message ? `${t("selling.card")}: ${d.delivery.message}` : null,
                          d.delivery.anonymous ? t("selling.anonymousYes") : null,
                          d.lines.join(", "),
                          formatDate(d.createdAt, lang),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      />
                    ))}
                  </ItemList>
                ) : (
                  <div className="p-5 sm:p-6">
                    <EmptyState icon="local_shipping" title={t("selling.noDeliveries")} />
                  </div>
                )}
              </Section>
            ) : null}
          </TabPanel>
        ) : null}
      </PageTabs>
    </div>
  );
}
