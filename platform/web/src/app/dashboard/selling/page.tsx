import type { Metadata } from "next";
import Link from "next/link";
import { changeFlashSaleAction } from "@/app/actions/selling";
import { SubmitButton } from "@/components/form";
import { formatDate } from "@/components/ui";
import { KitCallout, KitEmpty, KitHeader, KitHero, KitList, KitMore, KitNext, KitPage, KitRow, KitSection, KitStat, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { Icon } from "@/components/icon";
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
      <KitPage>
        <KitHeader icon="local_shipping" title={t("selling.title")} description={t("selling.notStore")} />
      </KitPage>
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
    !s.active ? <KitStatus tone="neutral">{t("selling.turnOff")}</KitStatus> : unitsLeft(s) === 0 ? <KitStatus tone="warn">{t("selling.soldOut")}</KitStatus> : saleOn(s, now) ? <KitStatus tone="success">{t("selling.live")}</KitStatus> : s.endsAt <= now ? <KitStatus tone="neutral">{t("selling.ended")}</KitStatus> : <KitStatus tone="info">{t("selling.scheduled", { date: formatDate(s.startsAt, lang) })}</KitStatus>;
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

  const live = sales.filter((s) => s.active && saleOn(s, now) && unitsLeft(s) !== 0).length;
  // Where each part applies, honestly, per source: a platform's in sight, the others behind "?".
  const sourceNote =
    source.kind === "catalog" ? t("selling.srcCatalog") : source.kind === "wordpress" ? t("selling.srcWordpress") : source.kind === "own_api" ? richText(t("selling.srcOwnApi"), { link: (chunk) => <Link href={`${localePath(lang, "/developers")}#store`}>{chunk}</Link> }) : null;
  const statValue = (text: string) => <span className="text-[19px] leading-snug tracking-normal">{text}</span>;

  // 132.135 The premium kit: the header with its one main action, what the shop does now in one hero card with the next step, then each part in its tab.
  return (
    <KitPage data-selling-page={source.kind}>
      <KitHeader
          icon="local_shipping"
          title={t("selling.title")}
          description={t("studioPage.sellingLine")}
          help={
            <span className="flex flex-col gap-2">
              <span>{t("selling.intro")}</span>
              {sourceNote ? <span>{sourceNote}</span> : null}
            </span>
          }
          helpLabel={t("studioPage.help")}
          actions={
            hosted ? (
              <SheetButton target="new-flash" variant="main" className="h-11">
                {t("selling.addFlash")}
              </SheetButton>
            ) : null
          }
        />
      {platform ? (
        <KitCallout tone="warn" icon="warning">
          {t("selling.srcPlatform", { platform })} {platformCarriesDetails(app) ? t("selling.srcCarries", { platform }) : t("selling.srcRecords", { platform })}
        </KitCallout>
      ) : null}

      {hosted ? (
        <KitHero
          label={t("selling.title")}
          stats={
            <>
              <KitStat icon={mode === "gift" ? "redeem" : "shopping_cart"} label={t("selling.checkoutTitle")} value={statValue(mode === "gift" ? t("selling.modeGift") : t("selling.modeStandard"))} />
              <KitStat icon="schedule" tone={delivery.enabled ? "success" : "neutral"} label={t("studioPage.deliveryDays")} value={statValue(delivery.enabled ? t("common.on") : t("common.off"))} />
              <KitStat icon="bolt" tone="accent" label={t("selling.flashTitle")} value={num(live)} hint={t("selling.live")} />
              <KitStat icon="edit_note" label={t("selling.messagesTitle")} value={num(templatesCount)} hint={t("studioPage.occasions", { count: occasions.length })} href="/dashboard/selling/messages" />
            </>
          }
          next={
            delivery.enabled ? undefined : (
              <KitNext
                icon="schedule"
                action={
                  <button type="button" aria-controls="h-delivery" className={kit.quiet}>
                    {t("studioPage.sellingSetDelivery")}
                  </button>
                }
              >
                {t("studioPage.sellingNoDelivery")}
              </KitNext>
            )
          }
        />
      ) : null}

      {/* 132.25 Each part in its tab (those the source uses): the checkout, delivery times, where it goes and its fees, gifts and card messages, add-ons, flash sales and codes, and the deliveries a platform's shop gets. */}
      <PageTabs label={t("selling.title")} initial={tab} tabs={tabs}>
        {hosted || titled ? (
          <TabPanel tab="checkout">
            {hosted ? (
              <KitSection titleId="h-checkout" title={t("selling.checkoutTitle")} description={t("selling.checkoutIntro")}>
                {look?.mode === "gift" ? <KitCallout icon="info">{t("selling.lookGift")}</KitCallout> : null}
                <CheckoutModeForm mode={gifts.checkout === "gift" ? "gift" : "standard"} />
              </KitSection>
            ) : null}
            {titled ? (
              <KitSection titleId="h-titles" title={t("selling.titlesTitle")} description={t("selling.titlesIntro")}>
                <TitlesForm values={titleValues} languages={langs} />
              </KitSection>
            ) : null}
          </TabPanel>
        ) : null}
        {hosted ? (
          <TabPanel tab="delivery">
            <KitSection titleId="h-delivery" title={t("selling.deliveryTitle")} description={t("selling.deliveryIntro")}>
              {mode === "gift" ? <p className="m-0 text-[13px] text-(--sp-muted)">{t("selling.giftForces")}</p> : null}
              <DeliveryForm values={deliveryValues} currency={currency} timezones={TIMEZONES.includes(delivery.timezone) ? TIMEZONES : [delivery.timezone, ...TIMEZONES]} weekdays={weekdays} feesNote={platform ? t("selling.feesPlatform", { platform }) : null} />
            </KitSection>
          </TabPanel>
        ) : null}
        {hosted ? (
          <TabPanel tab="areas">
            <KitSection titleId="h-areas" title={t("selling.areasTitle")} description={t("selling.areasIntro")}>
              {platform ? (
                <KitCallout tone="warn" icon="warning">
                  {t("selling.shippingPlatform", { platform })}
                </KitCallout>
              ) : null}
              {settings.freeShippingOverCents !== null ? <p className="m-0 text-[13px] text-(--sp-muted)">{t("selling.freeOver", { amount: money(settings.freeShippingOverCents) })}</p> : null}
              {noWeight > 0 ? (
                <KitCallout tone="warn" icon="warning">
                  {t("selling.needsWeights", { count: noWeight })}
                </KitCallout>
              ) : null}
              <AreasForm values={areaValues} currency={currency} countries={Object.keys(SHIPPING_COUNTRIES).map((code) => ({ code, name: nameOf(code) }))} starters={startersOf} />
            </KitSection>
          </TabPanel>
        ) : null}
        <TabPanel tab="gifts">
          {hosted ? (
            <KitSection titleId="h-gifts" title={t("selling.giftsTitle")} description={t("selling.giftsIntro")}>
              <GiftsForm
                values={{ message: gifts.message ? "on" : "", maxLength: String(gifts.maxLength), starters: gifts.starters.join("\n"), recipient: gifts.recipient ? "on" : "", anonymous: gifts.anonymous ? "on" : "" }}
              />
            </KitSection>
          ) : null}
          <KitSection titleId="h-messages" title={t("selling.messagesTitle")} help={t("selling.messagesIntro")} helpLabel={t("studioPage.helpSection")} flush>
            <KitList>
              <KitRow
                href="/dashboard/selling/messages"
                media={<KitThumb icon="edit_note" />}
                title={t("selling.messagesOpen")}
                meta={
                  <span data-messages-count="">
                    {t("selling.messagesCount", { occasions: occasions.length, messages: templatesCount })}
                  </span>
                }
              />
            </KitList>
          </KitSection>
        </TabPanel>
        {titled ? (
          <TabPanel tab="addons">
            {/* 131 Gift add-ons: "Add a little more" with the products they go with. */}
            <KitSection titleId="h-addons" title={t("selling.addonsTitle")} description={t("selling.addonsIntro")}>
              {source.kind === "catalog" ? (
                <>
                  <KitCallout icon="info">{richText(t("selling.addonsCatalog"), { link: (chunk) => <Link href="/dashboard/catalog">{chunk}</Link> })}</KitCallout>
                  <p className="m-0 text-[15px]" data-addons-count="">
                    {ownAddons.length ? t("selling.addonsCount", { count: ownAddons.length, names: ownAddons.slice(0, 5).map((p) => p.name).join(", ") }) : t("selling.addonsNone")}
                  </p>
                </>
              ) : null}
              {source.kind === "wordpress" ? <KitCallout icon="info">{t("selling.addonsWordpress")}</KitCallout> : null}
              {platform ? (
                <>
                  <KitCallout tone="warn" icon="warning">
                    {t("selling.addonsPlatform", { platform })}
                  </KitCallout>
                  <AddonsForm values={addonValues} tags={app.connector?.kind === "shopify"} platform={platform} />
                </>
              ) : null}
            </KitSection>
          </TabPanel>
        ) : null}
        {offers ? (
          <TabPanel tab="flash">
            {hosted ? (
              <>
                <KitSection
                  titleId="h-flash"
                  title={t("selling.flashTitle")}
                  description={t("selling.flashIntro")}
                  actions={
                    sales.length ? (
                      <SheetButton target="new-flash" variant="pill" className="h-9">
                        {t("selling.addFlash")}
                      </SheetButton>
                    ) : null
                  }
                  flush
                >
                  {sales.length ? (
                    <KitList>
                      {sales.map((s) => (
                        <KitRow
                          key={s.id}
                          data-flash-sale={s.id}
                          media={<KitThumb icon="bolt" />}
                          title={s.title}
                          meta={[
                            s.discount.kind === "percent" ? `−${num(s.discount.percent)}%` : money(s.discount.cents),
                            `${formatDate(s.startsAt, lang)} – ${formatDate(s.endsAt, lang)}`,
                            s.limit !== null ? t("selling.soldOf", { sold: num(s.sold), limit: num(s.limit) }) : t("selling.soldCount", { sold: num(s.sold) }),
                          ].join(" · ")}
                          aside={
                            <>
                              {saleState(s)}
                              {platform && !s.platformCode ? <KitStatus tone="warn">{t("selling.platformCode", { platform })}</KitStatus> : null}
                            </>
                          }
                          actions={
                            <>
                              <SheetButton target={`flash-${s.id}`} variant="pill" className="h-9" icon="edit">
                                {t("shop.couponEdit")}
                              </SheetButton>
                              <KitMore label={t("studioPage.more")}>
                                <form action={changeFlashSaleAction} className="flex">
                                  <input type="hidden" name="id" value={s.id} />
                                  <input type="hidden" name="change" value={s.active ? "off" : "on"} />
                                  <SubmitButton variant="menu" className="h-10">
                                    <Icon name={s.active ? "pause_circle" : "play_circle"} size={18} />
                                    {s.active ? t("selling.turnOff") : t("selling.turnOn")}
                                  </SubmitButton>
                                </form>
                                <form action={changeFlashSaleAction} className="flex">
                                  <input type="hidden" name="id" value={s.id} />
                                  <input type="hidden" name="change" value="delete" />
                                  <SubmitButton variant="menu" className="h-10 text-danger hover:text-danger">
                                    <Icon name="delete" size={18} />
                                    {t("common.delete")}
                                  </SubmitButton>
                                </form>
                              </KitMore>
                            </>
                          }
                        />
                      ))}
                    </KitList>
                  ) : (
                    <KitEmpty icon="bolt" title={t("selling.noFlash")} />
                  )}
                </KitSection>
                {platform && sales.some((s) => !s.platformCode) ? (
                  <KitCallout tone="warn" icon="warning">
                    {t("selling.platformNoCode", { platform })}
                  </KitCallout>
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
              <KitCallout icon="info">{t("selling.flashWordpress")}</KitCallout>
            ) : null}
            <KitSection titleId="h-codes" title={t("selling.couponsTitle")}>
              {source.kind === "catalog" ? <KitCallout icon="local_offer">{richText(t("selling.couponsCatalog"), { link: (chunk) => <Link href="/dashboard/catalog/coupons">{chunk}</Link> })}</KitCallout> : null}
              {source.kind === "wordpress" ? <KitCallout icon="local_offer">{t("selling.couponsWordpress")}</KitCallout> : null}
              {platform ? (
                <>
                  <KitCallout tone="warn" icon="warning">
                    {t("selling.couponsPlatform", { platform })}
                  </KitCallout>
                  <CouponsPanel coupons={coupons} currency={currency} />
                </>
              ) : null}
            </KitSection>
          </TabPanel>
        ) : null}
        {platform ? (
          <TabPanel tab="deliveries">
            <KitSection titleId="h-deliveries" title={t("selling.deliveriesTitle")} description={t("selling.deliveriesIntro", { platform })} flush>
              {deliveries.length ? (
                <KitList>
                  {deliveries.map((d) => (
                    <KitRow
                      key={d.id}
                      data-store-delivery={d.id}
                      media={<KitThumb icon="local_shipping" />}
                      title={d.delivery.recipient ? `${t("selling.recipientLabel")}: ${d.delivery.recipient.name} · ${d.delivery.recipient.phone}` : (d.buyer.name ?? d.buyer.phone ?? "—")}
                      aside={d.passed ? <KitStatus tone="success">{t("selling.passed", { platform })}</KitStatus> : <KitStatus tone="neutral">{t("selling.notPassed")}</KitStatus>}
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
                </KitList>
              ) : (
                <KitEmpty icon="local_shipping" title={t("selling.noDeliveries")} />
              )}
            </KitSection>
          </TabPanel>
        ) : null}
      </PageTabs>
    </KitPage>
  );
}
