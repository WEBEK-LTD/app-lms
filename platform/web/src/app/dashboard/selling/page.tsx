import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { deleteCouponAction, setCouponActiveAction } from "@/app/actions/catalog";
import { changeFlashSaleAction } from "@/app/actions/selling";
import { formatDate } from "@/components/ui";
import { KitBar, KitCallout, KitDrawer, KitEmpty, KitHeader, KitHero, KitList, KitMore, KitNext, KitPage, KitRow, KitSection, KitStat, KitStatus, KitThumb, kit } from "@/components/studio-page";
import { KitBadge, KitInspectorBody, KitInspectorFacts, KitInspectorHead, KitInspectorPart } from "@/components/studio-page/parts";
import { KitTable, type KitTableRow } from "@/components/studio-page/table";
import { KitTabPanel, KitTabs } from "@/components/studio-page/tabs";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import { catalogSettings } from "@/lib/catalog/settings";
import { getStore } from "@/lib/data";
import type { App, CatalogCoupon, StoreFlashSale } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { localePath } from "@/i18n/paths";
import { assetUrl } from "@/lib/assets";
import { platformDefinition } from "@/lib/hosted/connectors/platforms";
import { DEFAULT_DELIVERY, DELIVERY_LIMITS, slotLabel } from "@/lib/selling/delivery";
import { saleOn, unitsLeft } from "@/lib/selling/flash-sales";
import { giftOccasionsOf } from "@/lib/selling/gift-messages";
import { checkoutModeOf, giftsOf } from "@/lib/selling/gifts";
import { countryChoices, countryNameIn } from "@/lib/selling/countries";
import { sameCity, STARTER_CITIES } from "@/lib/selling/shipping";
import { appLanguagesOf, platformCarriesDetails } from "@/lib/selling/store";
import { localInput, shopZone } from "@/lib/selling/zone";
import { checkoutLookOf } from "@/lib/studio/checkout-look";
import { CouponForm } from "../catalog/forms";
import { AddonsForm, AreasForm, CheckoutModeForm, DeliveryForm, FlashSaleForm, GiftsForm, TitlesForm } from "./forms";
import type { AreasStart } from "./pickers";
import { SellingTabs } from "./tabs";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("selling.title") };
}


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
  const { t, lang, num, date } = await dashboardText();
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
  // 132.186 Where it delivers as the editor starts: every country, or each chosen one with its cities and their own prices.
  const priced = settings.cityPrices ?? [];
  const placed = new Set<number>();
  const priceOf = (cents: number) => centsToDecimal(cents);
  const areasStart: AreasStart = {
    scope: (settings.areas ?? []).length ? "some" : "all",
    areas: (settings.areas ?? []).map((a) => {
      const cities = (a.cities ?? []).map((city) => {
        const k = priced.findIndex((p, n) => !placed.has(n) && (p.country === a.country || p.country === "") && sameCity(p.city, city));
        if (k < 0) return { name: city, price: "" };
        placed.add(k);
        return { name: city, price: priceOf(priced[k]!.cents) };
      });
      priced.forEach((p, n) => {
        if (placed.has(n) || p.country !== a.country) return;
        placed.add(n);
        cities.push({ name: p.city, price: priceOf(p.cents) });
      });
      return { country: a.country, allCities: a.cities === null, cities };
    }),
    anywhere: [],
  };
  // A price saved without its country: on the first country's card, or with every country.
  priced.forEach((p, n) => {
    if (placed.has(n)) return;
    (areasStart.areas[0]?.cities ?? areasStart.anywhere).push({ name: p.city, price: priceOf(p.cents) });
  });
  const startersOf = Object.fromEntries(Object.entries(STARTER_CITIES).map(([code, cities]) => [code, cities.map((c) => (c as Record<string, string>)[lang] ?? c.en)]));
  const allCountries = countryChoices(lang).map((c) => ({ ...c, en: countryNameIn(c.code, "en") }));
  const noWeight = source.kind === "catalog" && settings.weightPricing ? products.filter((p) => p.active && !p.digital && !p.weightGrams).length : 0;
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
  // 132.186 Each with its picture and price, so the owner knows it at a glance.
  const pictureOf = (p: { imageAssetIds: string[] }) => (p.imageAssetIds[0] ? assetUrl(p.imageAssetIds[0]) : null);
  const flashProducts = source.kind === "catalog" ? products.filter((p) => p.active && !p.addon).map((p) => ({ id: p.id, name: p.name, image: pictureOf(p), price: money(p.salePriceCents ?? p.priceCents) })) : null;
  const flashCategories = categories.map((c) => ({ id: c.id, name: c.name }));
  const templatesCount = occasions.reduce((n, o) => n + o.templates.length, 0);
  // 132.25 The tabs the source uses; `?tab=` opens one (an old link to a part, `#h-flash`, too).
  const titled = source.kind !== "own_api" && source.kind !== "none";
  const offers = hosted || source.kind === "wordpress";
  const tabs = [
    ...(hosted || titled ? [{ id: "checkout", label: t("selling.checkoutTitle") }] : []),
    ...(hosted ? [{ id: "delivery", label: t("manage.deliveryTab") }] : []),
    ...(hosted ? [{ id: "areas", label: t("manage.areasTab") }] : []),
    { id: "gifts", label: t("manage.giftsTab") },
    ...(titled ? [{ id: "addons", label: t("selling.addonsTitle") }] : []),
    ...(offers ? [{ id: "flash", label: t("manage.offersTab"), count: sales.length }] : []),
    ...(platform ? [{ id: "deliveries", label: t("selling.deliveriesTitle"), count: deliveries.length }] : []),
  ];
  const tab = tabs.some((x) => x.id === asked) ? asked : tabs[0]!.id;

  const live = sales.filter((s) => s.active && saleOn(s, now) && unitsLeft(s) !== 0).length;
  // Where each part applies, honestly, per source: a platform's in sight, the others behind "?".
  const sourceNote =
    source.kind === "catalog" ? t("selling.srcCatalog") : source.kind === "wordpress" ? t("selling.srcWordpress") : source.kind === "own_api" ? richText(t("selling.srcOwnApi"), { link: (chunk) => <Link href={`${localePath(lang, "/developers")}#store`}>{chunk}</Link> }) : null;
  const statValue = (text: string) => <span className="text-[19px] leading-snug tracking-normal">{text}</span>;
  const more = t("studioPage.more");
  const close = t("common.close");
  /** 132.160 A flash sale's or a code's discount, its percent read the same way in every language ("خصم 20%", "%20 indirim"). */
  const percentOff = (percent: number) => <bdi>{t("manage.percentOff", { percent: num(percent) })}</bdi>;
  const discountOf = (s: StoreFlashSale) => (s.discount.kind === "percent" ? percentOff(s.discount.percent) : <bdi>{t("selling.salePrice", { price: money(s.discount.cents) })}</bdi>);
  const when = (d: Date) => date(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone });
  const saleState = (s: StoreFlashSale) =>
    !s.active ? <KitStatus tone="neutral">{t("selling.turnOff")}</KitStatus> : unitsLeft(s) === 0 ? <KitStatus tone="warn">{t("selling.soldOut")}</KitStatus> : saleOn(s, now) ? <KitStatus tone="success">{t("selling.live")}</KitStatus> : s.endsAt <= now ? <KitStatus tone="neutral">{t("selling.ended")}</KitStatus> : <KitStatus tone="info">{t("selling.scheduled", { date: formatDate(s.startsAt, lang) })}</KitStatus>;
  const productById = new Map(products.map((p) => [p.id, p]));
  /** 132.186 A flash sale's first product with a picture: the sale's picture in the table. */
  const salePicture = (s: StoreFlashSale) => {
    const p = s.productIds.map((id) => productById.get(id)).find((x) => x && x.imageAssetIds.length);
    return p ? pictureOf(p) : null;
  };
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const whatsIn = (s: StoreFlashSale) =>
    s.productIds.length ? t("selling.productsCount", { count: s.productIds.length }) : s.categoryId !== null ? t("selling.categoryNamed", { name: categoryName.get(s.categoryId) ?? String(s.categoryId) }) : null;
  const thumb = (icon: IconName, dim = false, src: string | null = null) => <KitThumb src={src} icon={icon} size={40} dim={dim} />;
  const name = (text: ReactNode, line?: ReactNode) => (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-[14.5px] font-bold" dir="auto">
        {text}
      </span>
      {line ? <span className="truncate text-[12.5px] font-normal text-(--sp-muted)">{line}</span> : null}
    </span>
  );
  const change = (action: (formData: FormData) => Promise<void>, fields: Record<string, string | number>, label: string, icon: IconName, danger = false) => (
    <form action={action} className="flex">
      {Object.entries(fields).map(([field, value]) => (
        <input key={field} type="hidden" name={field} value={value} />
      ))}
      <button type="submit" className={`${kit.menuItem} ${danger ? "text-danger hover:text-danger" : ""}`}>
        <Icon name={icon} size={18} />
        {label}
      </button>
    </form>
  );
  const addFlash = (
    <KitDrawer
      title={t("selling.addFlash")}
      closeLabel={close}
      triggerClassName={kit.main}
      trigger={
        <>
          <Icon name="add" size={20} />
          {t("selling.addFlash")}
        </>
      }
    >
      <FlashSaleForm currency={currency} zone={zone} products={flashProducts} categories={flashCategories} platform={platform} languages={otherLangs} />
    </KitDrawer>
  );

  // 132.160 A flash sale as a row of the table: its name and what's in it, its discount, when, how many sold, its state; the rest in its inspector.
  const flashRows: KitTableRow[] = sales.map((s) => ({
    id: String(s.id),
    name: s.title,
    data: { "data-flash-sale": String(s.id) },
    cells: [
      <>
        {thumb("bolt", !s.active, salePicture(s))}
        {name(s.title, whatsIn(s))}
      </>,
      <KitBadge key="d" tone="peach">
        {discountOf(s)}
      </KitBadge>,
      <span key="w" className="text-[13px]">
        {formatDate(s.startsAt, lang)} – {formatDate(s.endsAt, lang)}
      </span>,
      <span key="s" className="font-sans tabular-nums">
        {s.limit !== null ? t("selling.soldOf", { sold: num(s.sold), limit: num(s.limit) }) : t("selling.soldCount", { sold: num(s.sold) })}
      </span>,
      <span key="st" className="flex flex-wrap gap-1.5">
        {saleState(s)}
        {platform && !s.platformCode ? <KitStatus tone="warn">{t("selling.platformCode", { platform })}</KitStatus> : null}
      </span>,
    ],
    inspector: {
      title: t("selling.flashSale"),
      actions: (
        <KitMore label={more} look="row">
          {change(changeFlashSaleAction, { id: s.id, change: s.active ? "off" : "on" }, s.active ? t("selling.turnOff") : t("selling.turnOn"), s.active ? "pause_circle" : "play_circle")}
          {change(changeFlashSaleAction, { id: s.id, change: "delete" }, t("common.delete"), "delete", true)}
        </KitMore>
      ),
      footer: (
        <KitDrawer
          title={s.title}
          closeLabel={close}
          triggerClassName={`${kit.main} w-full`}
          trigger={
            <>
              <Icon name="edit" size={18} />
              {t("shop.couponEdit")}
            </>
          }
        >
          <FlashSaleForm sale={{ id: s.id, values: saleValues(s) }} currency={currency} zone={zone} products={flashProducts} categories={flashCategories} platform={platform} languages={otherLangs} />
        </KitDrawer>
      ),
      body: (
        <KitInspectorBody data-inspector-flash-sale={s.title}>
          <KitInspectorHead
            icon="bolt"
            title={s.title}
            badges={
              <>
                <KitBadge tone="peach">{discountOf(s)}</KitBadge>
                {saleState(s)}
              </>
            }
            line={whatsIn(s)}
          />
          <KitInspectorFacts
            facts={[
              [t("selling.flashKind"), discountOf(s)],
              [t("selling.flashStarts"), when(s.startsAt)],
              [t("selling.flashEnds"), when(s.endsAt)],
              [t("selling.flashLimit"), s.limit !== null ? t("selling.soldOf", { sold: num(s.sold), limit: num(s.limit) }) : t("selling.soldCount", { sold: num(s.sold) })],
              ...(s.productIds.length && source.kind !== "catalog"
                ? ([[t("selling.flashProducts"), s.productIds.map((id) => `#${id}`).join(" · ")]] as [string, string][])
                : s.categoryId !== null && !s.productIds.length
                  ? ([[t("manage.filterCategory"), categoryName.get(s.categoryId) ?? String(s.categoryId)]] as [string, string][])
                  : []),
              ...(platform ? ([[t("selling.platformCode", { platform }), s.platformCode ? <bdi dir="ltr">{s.platformCode}</bdi> : t("studioPage.notSet")]] as [string, ReactNode][]) : []),
            ]}
          />
          {/* 132.186 Its products with their pictures and prices. */}
          {s.productIds.length && source.kind === "catalog" ? (
            <KitInspectorPart title={t("selling.flashProducts")}>
              <ul className="m-0 flex list-none flex-col gap-2 p-0" data-inspector-products="">
                {s.productIds.map((id) => {
                  const p = productById.get(id);
                  return (
                    <li key={id} className="flex items-center gap-3">
                      <KitThumb src={p ? pictureOf(p) : null} icon="inventory_2" size={40} />
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold" dir="auto">
                        {p?.name ?? `#${id}`}
                      </span>
                      {p ? <span className="shrink-0 font-sans text-[13px] text-(--sp-muted) tabular-nums">{money(p.salePriceCents ?? p.priceCents)}</span> : null}
                    </li>
                  );
                })}
              </ul>
            </KitInspectorPart>
          ) : null}
          {platform && !s.platformCode ? (
            <KitCallout tone="warn" icon="warning">
              {t("selling.platformNoCode", { platform })}
            </KitCallout>
          ) : null}
          <p className="m-0 text-[13px] text-(--sp-muted)">{t("selling.flashTimezone", { zone })}</p>
        </KitInspectorBody>
      ),
    },
  }));

  // 132.160 A platform's discount codes shown in the app, as a table too.
  const couponTerms = (c: CatalogCoupon) => (c.kind === "percent" ? percentOff(c.value) : <bdi>{t("shop.couponAmountOff", { amount: money(c.value) })}</bdi>);
  const couponRows: KitTableRow[] = coupons.map((c) => ({
    id: String(c.id),
    name: c.code,
    data: { "data-coupon": c.code },
    cells: [
      <>
        {thumb("local_offer", !c.active)}
        {name(<bdi dir="ltr">{c.code}</bdi>, c.endsAt ? t("shop.couponUntil", { date: formatDate(c.endsAt, lang) }) : null)}
      </>,
      <KitBadge key="d" tone="peach">
        {couponTerms(c)}
      </KitBadge>,
      <span key="u" className="font-sans tabular-nums">
        {c.maxUses !== null ? t("shop.couponUsesOf", { used: c.usedCount, max: c.maxUses }) : t("shop.couponUses", { used: c.usedCount })}
      </span>,
      <span key="st" className="flex flex-wrap gap-1.5">
        {c.active ? <KitStatus tone="success">{t("selling.live")}</KitStatus> : <KitStatus tone="neutral">{t("shop.couponOff")}</KitStatus>}
        {c.active && c.public ? <KitStatus tone="info">{t("shop.couponShown")}</KitStatus> : null}
      </span>,
    ],
    inspector: {
      title: t("selling.coupon"),
      actions: (
        <KitMore label={more} look="row">
          {change(setCouponActiveAction, c.active ? { id: c.id } : { id: c.id, active: "on" }, c.active ? t("shop.couponTurnOff") : t("shop.couponTurnOn"), c.active ? "pause_circle" : "play_circle")}
          {change(deleteCouponAction, { id: c.id }, t("common.delete"), "delete", true)}
        </KitMore>
      ),
      footer: (
        <KitDrawer
          title={<bdi dir="ltr">{c.code}</bdi>}
          closeLabel={close}
          triggerClassName={`${kit.main} w-full`}
          trigger={
            <>
              <Icon name="edit" size={18} />
              {t("shop.couponEdit")}
            </>
          }
        >
          <CouponForm currency={currency} coupon={{ id: c.id, values: couponValues(c) }} />
        </KitDrawer>
      ),
      body: (
        <KitInspectorBody data-inspector-coupon={c.code}>
          <KitInspectorHead icon="local_offer" title={<bdi dir="ltr">{c.code}</bdi>} badges={<KitBadge tone="peach">{couponTerms(c)}</KitBadge>} />
          <KitInspectorFacts
            facts={[
              [t("selling.flashKind"), couponTerms(c)],
              ...(c.minOrderCents !== null ? ([[t("selling.minOrder"), money(c.minOrderCents)]] as [string, string][]) : []),
              ...(c.startsAt ? ([[t("selling.flashStarts"), formatDate(c.startsAt, lang)]] as [string, string][]) : []),
              ...(c.endsAt ? ([[t("selling.flashEnds"), formatDate(c.endsAt, lang)]] as [string, string][]) : []),
              [t("selling.uses"), c.maxUses !== null ? t("shop.couponUsesOf", { used: c.usedCount, max: c.maxUses }) : t("shop.couponUses", { used: c.usedCount })],
              [t("shop.couponShown"), c.public ? t("common.on") : t("common.off")],
            ]}
          />
        </KitInspectorBody>
      ),
    },
  }));

  // 132.160 The deliveries a platform's shop got from the app, each one's details in its inspector.
  const deliveryRows: KitTableRow[] = deliveries.map((d) => {
    const who = d.delivery.recipient ? d.delivery.recipient.name : (d.buyer.name ?? d.buyer.phone ?? "—");
    const day = d.delivery.date ? `${d.delivery.date}${d.delivery.slot ? ` ${slotLabel(d.delivery.slot)}` : ""}` : "—";
    return {
      id: String(d.id),
      name: who,
      data: { "data-store-delivery": String(d.id) },
      cells: [
        <>
          {thumb(d.delivery.recipient ? "redeem" : "local_shipping")}
          {name(who, d.lines.join(", "))}
        </>,
        <bdi key="w" dir="ltr" className="font-sans text-[13px] tabular-nums">
          {day}
        </bdi>,
        <span key="c" className="text-[13px]">
          {formatDate(d.createdAt, lang)}
        </span>,
        d.passed ? <KitStatus key="p" tone="success">{t("selling.passed", { platform: platform ?? "" })}</KitStatus> : <KitStatus key="p" tone="neutral">{t("selling.notPassed")}</KitStatus>,
      ],
      inspector: {
        title: t("selling.when"),
        body: (
          <KitInspectorBody data-inspector-delivery={String(d.id)}>
            <KitInspectorHead icon={d.delivery.recipient ? "redeem" : "local_shipping"} title={who} line={d.lines.join(", ")} badges={d.passed ? <KitStatus tone="success">{t("selling.passed", { platform: platform ?? "" })}</KitStatus> : <KitStatus tone="neutral">{t("selling.notPassed")}</KitStatus>} />
            <KitInspectorFacts
              facts={[
                [t("selling.when"), <bdi key="w" dir="ltr">{day}</bdi>],
                ...(d.delivery.recipient ? ([[t("selling.recipientLabel"), `${d.delivery.recipient.name} · ${d.delivery.recipient.phone}`]] as [string, string][]) : []),
                ...(d.delivery.recipient?.address ? ([[t("selling.address"), d.delivery.recipient.address]] as [string, string][]) : []),
                ...(d.delivery.sender ? ([[t("selling.sender"), `${d.delivery.sender.name} · ${d.delivery.sender.phone} · ${d.delivery.sender.email}`]] as [string, string][]) : []),
                ...(d.delivery.message ? ([[t("selling.card"), d.delivery.message]] as [string, string][]) : []),
                ...(d.delivery.anonymous ? ([[t("selling.card"), t("selling.anonymousYes")]] as [string, string][]) : []),
                [t("common.date"), formatDate(d.createdAt, lang)],
              ]}
            />
          </KitInspectorBody>
        ),
      },
    };
  });

  // 132.160 The console's look: the title with Add a flash sale, Delivery & offers and Card messages side by side, the numbers as tiles, then each part in its segment.
  return (
    <KitPage>
      <KitHeader
        icon="local_shipping"
        title={t("selling.title")}
        description={t("selling.line")}
        help={
          <span className="flex flex-col gap-2">
            <span>{t("selling.intro")}</span>
            {sourceNote ? <span>{sourceNote}</span> : null}
          </span>
        }
        helpLabel={t("studioPage.help")}
        actions={hosted ? addFlash : null}
      />
      <KitBar>
        <SellingTabs messages={templatesCount} />
      </KitBar>
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
              <KitStat icon="bolt" label={t("selling.flashTitle")} value={num(live)} hint={t("selling.live")} />
              <KitStat icon="edit_note" label={t("selling.messagesTitle")} value={num(templatesCount)} hint={t("selling.occasions", { count: occasions.length })} href="/dashboard/selling/messages" />
              <KitStat icon={mode === "gift" ? "redeem" : "shopping_cart"} label={t("selling.checkoutTitle")} value={statValue(mode === "gift" ? t("selling.modeGift") : t("selling.modeStandard"))} />
              <KitStat icon="schedule" tone={delivery.enabled ? "success" : "neutral"} label={t("selling.deliveryDays")} value={statValue(delivery.enabled ? t("common.on") : t("common.off"))} />
            </>
          }
          next={
            delivery.enabled ? undefined : (
              <KitNext
                icon="schedule"
                action={
                  <button type="button" aria-controls="h-delivery" className={kit.quiet}>
                    {t("selling.setDelivery")}
                  </button>
                }
              >
                {t("selling.noDeliveryDay")}
              </KitNext>
            )
          }
        />
      ) : null}

      {/* 132.25 Each part in its segment (those the source uses): the checkout, delivery times, where it goes and its fees, gifts and card messages, add-ons, flash sales and codes, and the deliveries a platform's shop gets. */}
      <KitTabs label={t("selling.title")} initial={tab} tabs={tabs}>
        {hosted || titled ? (
          <KitTabPanel tab="checkout">
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
          </KitTabPanel>
        ) : null}
        {hosted ? (
          <KitTabPanel tab="delivery">
            <KitSection titleId="h-delivery" title={t("selling.deliveryTitle")} description={t("selling.deliveryIntro")}>
              {mode === "gift" ? <p className="m-0 text-[13px] text-(--sp-muted)">{t("selling.giftForces")}</p> : null}
              <DeliveryForm values={deliveryValues} maxSlots={DELIVERY_LIMITS.slots} currency={currency} weekdays={weekdays} feesNote={platform ? t("selling.feesPlatform", { platform }) : null} />
            </KitSection>
          </KitTabPanel>
        ) : null}
        {hosted ? (
          <KitTabPanel tab="areas">
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
              <AreasForm values={areaValues} currency={currency} countries={allCountries} starters={startersOf} areas={areasStart} />
            </KitSection>
          </KitTabPanel>
        ) : null}
        <KitTabPanel tab="gifts">
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
        </KitTabPanel>
        {titled ? (
          <KitTabPanel tab="addons">
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
          </KitTabPanel>
        ) : null}
        {offers ? (
          <KitTabPanel tab="flash">
            {hosted ? (
              <>
                <KitTable
                  label={t("selling.flashTitle")}
                  title={t("selling.flashTitle")}
                  titleId="h-flash"
                  columns={[
                    { label: t("selling.flashSale"), width: "minmax(0,1fr)" },
                    { label: t("selling.flashKind"), width: "minmax(96px,auto)", phone: "sub" },
                    { label: t("selling.colWhen"), width: "190px", wide: true },
                    { label: t("selling.colSold"), width: "110px", wide: true },
                    { label: t("common.status"), width: "minmax(110px,auto)", phone: "end" },
                  ]}
                  rows={flashRows}
                  empty={
                    <KitEmpty icon="bolt" title={t("selling.noFlash")}>
                      {t("selling.flashIntro")}
                    </KitEmpty>
                  }
                />
                {sales.length ? <p className="-mt-2 m-0 px-1 text-[13px] text-(--sp-muted)">{t("selling.flashIntro")}</p> : null}
                {platform && sales.some((s) => !s.platformCode) ? (
                  <KitCallout tone="warn" icon="warning">
                    {t("selling.platformNoCode", { platform })}
                  </KitCallout>
                ) : null}
              </>
            ) : source.kind === "wordpress" ? (
              <KitCallout icon="info">{t("selling.flashWordpress")}</KitCallout>
            ) : null}
            {platform ? (
              <>
                <KitCallout tone="warn" icon="warning">
                  {t("selling.couponsPlatform", { platform })}
                </KitCallout>
                <KitTable
                  label={t("selling.couponsTitle")}
                  title={t("selling.couponsTitle")}
                  titleId="h-codes"
                  actions={
                    <KitDrawer
                      title={t("shop.addCoupon")}
                      description={t("shop.couponHint")}
                      closeLabel={close}
                      triggerClassName={kit.quiet}
                      trigger={
                        <>
                          <Icon name="add" size={18} />
                          {t("shop.addCoupon")}
                        </>
                      }
                    >
                      <CouponForm currency={currency} />
                    </KitDrawer>
                  }
                  columns={[
                    { label: t("shop.couponCode"), width: "minmax(0,1fr)" },
                    { label: t("selling.flashKind"), width: "minmax(96px,auto)", phone: "sub" },
                    { label: t("selling.uses"), width: "140px", wide: true },
                    { label: t("common.status"), width: "minmax(110px,auto)", phone: "end" },
                  ]}
                  rows={couponRows}
                  empty={<KitEmpty icon="local_offer" title={t("shop.couponsNone")} />}
                />
              </>
            ) : (
              <KitSection titleId="h-codes" title={t("selling.couponsTitle")}>
                {source.kind === "catalog" ? <KitCallout icon="local_offer">{richText(t("selling.couponsCatalog"), { link: (chunk) => <Link href="/dashboard/catalog/coupons">{chunk}</Link> })}</KitCallout> : null}
                {source.kind === "wordpress" ? <KitCallout icon="local_offer">{t("selling.couponsWordpress")}</KitCallout> : null}
              </KitSection>
            )}
          </KitTabPanel>
        ) : null}
        {platform ? (
          <KitTabPanel tab="deliveries">
            <p className="m-0 px-1 text-[14px] text-(--sp-muted)">{t("selling.deliveriesIntro", { platform })}</p>
            <KitTable
              label={t("selling.deliveriesTitle")}
              title={t("selling.deliveriesTitle")}
              titleId="h-deliveries"
              columns={[
                { label: t("selling.recipientLabel"), width: "minmax(0,1fr)" },
                { label: t("selling.when"), width: "170px", phone: "sub" },
                { label: t("common.date"), width: "120px", wide: true },
                { label: t("common.status"), width: "minmax(120px,auto)", phone: "end" },
              ]}
              rows={deliveryRows}
              empty={<KitEmpty icon="local_shipping" title={t("selling.noDeliveries")} />}
            />
          </KitTabPanel>
        ) : null}
      </KitTabs>
    </KitPage>
  );
}

/** 131 A saved coupon as the form shows it. */
function couponValues(c: CatalogCoupon): Record<string, string> {
  const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
  return {
    code: c.code,
    kind: c.kind,
    value: c.kind === "percent" ? String(c.value) : centsToDecimal(c.value),
    minOrder: c.minOrderCents !== null ? centsToDecimal(c.minOrderCents) : "",
    maxUses: c.maxUses !== null ? String(c.maxUses) : "",
    startsOn: day(c.startsAt),
    endsOn: day(c.endsAt),
    public: c.public ? "on" : "",
  };
}
