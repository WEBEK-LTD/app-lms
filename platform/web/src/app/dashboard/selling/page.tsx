import type { Metadata } from "next";
import Link from "next/link";
import { changeFlashSaleAction } from "@/app/actions/selling";
import { SubmitButton } from "@/components/form";
import { Badge, EmptyState, Notice, PageHeader, Section, btn, formatDate } from "@/components/ui";
import { ItemList, ItemRow, PageGroup, Thumb } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import { catalogSettings } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import type { App, StoreFlashSale } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { platformDefinition } from "@/lib/hosted/connectors/platforms";
import { DEFAULT_DELIVERY, slotLabel } from "@/lib/selling/delivery";
import { saleOn, unitsLeft } from "@/lib/selling/flash-sales";
import { giftOccasionsOf } from "@/lib/selling/gift-messages";
import { checkoutModeOf, giftsOf } from "@/lib/selling/gifts";
import { SHIPPING_COUNTRIES, STARTER_CITIES } from "@/lib/selling/shipping";
import { platformCarriesDetails } from "@/lib/selling/store";
import { localInput, shopZone } from "@/lib/selling/zone";
import { checkoutLookOf } from "@/lib/studio/checkout-look";
import { CouponsPanel } from "../catalog/coupons-panel";
import { AreasForm, CheckoutModeForm, DeliveryForm, FlashSaleForm, GiftsForm } from "./forms";

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
export default async function SellingPage() {
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
  const [sales, products, categories, coupons, deliveries, occasions] = await Promise.all([
    store.listFlashSales(app.id),
    source.kind === "catalog" ? store.listCatalogProducts(app.id) : Promise.resolve([]),
    source.kind === "catalog" ? store.listCatalogCategories(app.id) : Promise.resolve([]),
    source.kind === "platform" ? store.listCatalogCoupons(app.id) : Promise.resolve([]),
    source.kind === "platform" ? store.listStoreDeliveries(app.id, 50) : Promise.resolve([]),
    giftOccasionsOf(store, app, now),
  ]);
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
  });
  const flashProducts = source.kind === "catalog" ? products.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name })) : null;
  const flashCategories = categories.map((c) => ({ id: c.id, name: c.name }));
  const templatesCount = occasions.reduce((n, o) => n + o.templates.length, 0);

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
      {source.kind === "own_api" ? <Notice tone="info">{t("selling.srcOwnApi")}</Notice> : null}

      {hosted ? (
        <PageGroup title={t("selling.checkoutTitle")}>
          <Section titleId="h-checkout" title={t("selling.checkoutTitle")} description={t("selling.checkoutIntro")}>
            {look?.mode === "gift" ? <Notice tone="info">{t("selling.lookGift")}</Notice> : null}
            <CheckoutModeForm mode={gifts.checkout === "gift" ? "gift" : "standard"} />
          </Section>
          <Section titleId="h-delivery" title={t("selling.deliveryTitle")} description={t("selling.deliveryIntro")}>
            {mode === "gift" ? <p className="m-0 text-[13px] text-muted">{t("selling.giftForces")}</p> : null}
            <DeliveryForm values={deliveryValues} currency={currency} timezones={TIMEZONES.includes(delivery.timezone) ? TIMEZONES : [delivery.timezone, ...TIMEZONES]} weekdays={weekdays} feesNote={platform ? t("selling.feesPlatform", { platform }) : null} />
          </Section>
          <Section titleId="h-areas" title={t("selling.areasTitle")} description={t("selling.areasIntro")}>
            {platform ? <Notice tone="warn" icon="warning">{t("selling.shippingPlatform", { platform })}</Notice> : null}
            {settings.freeShippingOverCents !== null ? <p className="m-0 text-[13px] text-muted">{t("selling.freeOver", { amount: money(settings.freeShippingOverCents) })}</p> : null}
            {noWeight > 0 ? <Notice tone="warn" icon="warning">{t("selling.needsWeights", { count: noWeight })}</Notice> : null}
            <AreasForm values={areaValues} currency={currency} countries={Object.keys(SHIPPING_COUNTRIES).map((code) => ({ code, name: nameOf(code) }))} starters={startersOf} />
          </Section>
          <Section titleId="h-gifts" title={t("selling.giftsTitle")} description={t("selling.giftsIntro")}>
            <GiftsForm
              values={{ message: gifts.message ? "on" : "", maxLength: String(gifts.maxLength), starters: gifts.starters.join("\n"), recipient: gifts.recipient ? "on" : "", anonymous: gifts.anonymous ? "on" : "" }}
            />
          </Section>
        </PageGroup>
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
            <FlashSaleForm currency={currency} zone={zone} products={flashProducts} categories={flashCategories} platform={platform} />
          </Sheet>
          {sales.map((s) => (
            <Sheet key={s.id} id={`flash-${s.id}`} title={s.title}>
              <FlashSaleForm sale={{ id: s.id, values: saleValues(s) }} currency={currency} zone={zone} products={flashProducts} categories={flashCategories} platform={platform} />
            </Sheet>
          ))}
        </>
      ) : source.kind === "wordpress" ? (
        <Notice tone="info">{t("selling.flashWordpress")}</Notice>
      ) : null}

      <PageGroup title={t("selling.couponsTitle")}>
        {source.kind === "catalog" ? <Notice tone="info">{richText(t("selling.couponsCatalog"), { link: (chunk) => <Link href="/dashboard/catalog#h-coupons">{chunk}</Link> })}</Notice> : null}
        {source.kind === "wordpress" ? <Notice tone="info">{t("selling.couponsWordpress")}</Notice> : null}
        {platform ? (
          <>
            <Notice tone="warn" icon="warning">
              {t("selling.couponsPlatform", { platform })}
            </Notice>
            <CouponsPanel coupons={coupons} currency={currency} />
          </>
        ) : null}
      </PageGroup>

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
    </div>
  );
}
