import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, Notice, PageHeader, Section } from "@/components/ui";
import { ItemList, ItemRow, Thumb } from "@/components/page-kit";
import { clubPlanActiveAction, couponActiveAction, createClubPlanAction, createCouponAction, deleteCouponAction, ownerPauseCouponAction } from "@/app/actions/market";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { MarketCoupon } from "@/lib/data/types";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { formatMinor } from "@/lib/market/currency";
import { marketCurrency } from "@/lib/market/settings";
import { isFood } from "../../shipments/parts";
import { NotMarket } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.offers") };
}

const field = "input w-full";
const label = "flex flex-col gap-1 text-[13px] font-semibold text-ink-3";

/** 115.12 Studio › Offers & club: the owner's coupons and automatic offers, and the delivery club's plans. */
export default async function OffersPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { app } = await requireClient("orders");
  const { t, lang } = await dashboardText();
  if (!isFood(app)) return <NotMarket title={t("market.offers")} t={t} />;
  const error = (await searchParams).error;
  const store = await getStore();
  const [settings, coupons, plans, vendors] = await Promise.all([store.getDeliverySettings(app.id).then(deliverySettingsOf), store.listMarketCoupons(app.id), store.listMarketClubPlans(app.id), store.listRestaurants(app.id)]);
  // 115.18 Coupons places made in their panel, with the place's name.
  const placeOf = (c: (typeof coupons)[number]) => (c.createdByVendorId ? (vendors.find((v) => v.id === c.createdByVendorId)?.name ?? "") : null);
  const currency = marketCurrency(settings);
  const money = (minor: number, c = currency) => formatMinor(minor, c, lang);
  const worth = (c: MarketCoupon) => (c.kind === "percent" ? `${c.value}%` : c.kind === "amount" ? money(c.value, c.currency) : t("market.k_free_delivery"));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("market.offers")} description={t("market.offersIntro")} />
      {error ? (
        <Notice tone="danger" icon="error">
          {error}
        </Notice>
      ) : null}

      <Section titleId="h-offers" title={t("market.offers")} actions={<Badge tone="neutral">{coupons.length}</Badge>} flush>
        {coupons.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="local_offer" title={t("market.noOffers")} />
          </div>
        ) : (
          <ItemList>
            {coupons.map((c, i) => (
              <ItemRow
                key={c.id}
                media={<Thumb icon={c.kind === "free_delivery" ? "local_shipping" : "local_offer"} shape="square" tint={i} />}
                title={c.title}
                badges={c.code ? <Badge tone="info">{c.code}</Badge> : <Badge tone="neutral">{t("market.automatic")}</Badge>}
                meta={t("market.offerLine", { value: worth(c), min: money(c.minOrder, c.currency) })}
                extra={
                  <>
                    <span>{t(c.paidBy === "vendor" ? "market.f_vendor" : "market.f_owner")}</span>
                    {placeOf(c) !== null ? <span>{t("market.byPlace", { place: placeOf(c)! })}</span> : null}
                    {c.firstOrderOnly ? <span>{t("market.firstOrder")}</span> : null}
                    {c.endsAt ? <span dir="ltr">→ {c.endsAt.toISOString().slice(0, 10)}</span> : null}
                  </>
                }
                aside={<Badge tone={c.active && !c.ownerPaused ? "success" : "neutral"}>{t(c.ownerPaused ? "market.pausedByYou" : c.active ? "market.activeOffer" : "market.pausedOffer")}</Badge>}
                actions={
                  <span className="flex gap-2">
                    {placeOf(c) !== null ? (
                      <form action={ownerPauseCouponAction}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="paused" value={c.ownerPaused ? "0" : "1"} />
                        <button type="submit" className={`${btn.secondary} h-9 px-3 text-sm`}>
                          {t(c.ownerPaused ? "market.allowIt" : "market.pauseIt")}
                        </button>
                      </form>
                    ) : (
                    <form action={couponActiveAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="active" value={c.active ? "0" : "1"} />
                      <button type="submit" className={`${btn.secondary} h-9 px-3 text-sm`}>
                        {t(c.active ? "market.pauseIt" : "market.turnOn")}
                      </button>
                    </form>
                    )}
                    <form action={deleteCouponAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className={`${btn.secondary} h-9 px-3 text-sm`}>
                        {t("market.deleteIt")}
                      </button>
                    </form>
                  </span>
                }
              />
            ))}
          </ItemList>
        )}
        <form action={createCouponAction} className="grid gap-3 border-t border-line-soft p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          <h3 className="m-0 text-base font-bold sm:col-span-2 lg:col-span-3">{t("market.newOffer")}</h3>
          <label className={label}>
            {t("market.offerTitle")}
            <input name="title" required maxLength={80} className={field} />
          </label>
          <label className={label}>
            {t("market.offerCode")}
            <input name="code" maxLength={24} dir="ltr" className={`${field} uppercase`} />
          </label>
          <label className={label}>
            {t("market.offerKind")}
            <select name="kind" defaultValue="percent" className="input h-10">
              {(["percent", "amount", "free_delivery"] as const).map((k) => (
                <option key={k} value={k}>
                  {t(`market.k_${k}`)}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            {t("market.offerValue")}
            <input name="value" inputMode="decimal" dir="ltr" className={field} />
          </label>
          <label className={label}>
            {t("market.maxDiscount")}
            <input name="max_discount" inputMode="decimal" dir="ltr" className={field} />
          </label>
          <label className={label}>
            {t("market.minOrder")}
            <input name="min_order" inputMode="decimal" dir="ltr" className={field} />
          </label>
          <label className={label}>
            {t("market.usesLimit")}
            <input name="uses_limit" inputMode="numeric" dir="ltr" className={field} />
          </label>
          <label className={label}>
            {t("market.perUserLimit")}
            <input name="per_user_limit" inputMode="numeric" dir="ltr" className={field} />
          </label>
          <label className={label}>
            {t("market.paidBy")}
            <select name="paid_by" defaultValue="owner" className="input h-10">
              <option value="owner">{t("market.f_owner")}</option>
              <option value="vendor">{t("market.f_vendor")}</option>
            </select>
          </label>
          <label className={label}>
            {t("market.starts")}
            <input name="starts" type="date" dir="ltr" className={field} />
          </label>
          <label className={label}>
            {t("market.ends")}
            <input name="ends" type="date" dir="ltr" className={field} />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-[14px]">
            <input type="checkbox" name="first_order" value="1" />
            {t("market.firstOrder")}
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" className={`${btn.primary} h-11 px-5 text-sm`}>
              <Icon name="add" size={18} />
              {t("market.addOffer")}
            </button>
          </div>
        </form>
      </Section>

      <Section titleId="h-club" title={t("market.club")} description={t("market.clubIntro")} actions={<Badge tone="neutral">{plans.length}</Badge>} flush>
        {plans.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="workspace_premium" title={t("market.noPlans")} />
          </div>
        ) : (
          <ItemList>
            {plans.map((p, i) => (
              <ItemRow
                key={p.id}
                media={<Thumb icon="workspace_premium" shape="square" tint={i} />}
                title={p.name}
                meta={t(p.period === "month" ? "market.perMonth" : "market.perYear", { price: money(p.price, p.currency) })}
                extra={
                  <>
                    <span>{p.freeDeliveryOver !== null ? t("market.b_free") : `${t("market.b_percent")} · ${p.deliveryDiscountPercent}%`}</span>
                    {p.perks.map((perk) => (
                      <span key={perk}>{perk}</span>
                    ))}
                  </>
                }
                aside={<Badge tone={p.active ? "success" : "neutral"}>{t(p.active ? "market.activeOffer" : "market.pausedOffer")}</Badge>}
                actions={
                  <form action={clubPlanActiveAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="active" value={p.active ? "0" : "1"} />
                    <button type="submit" className={`${btn.secondary} h-9 px-3 text-sm`}>
                      {t(p.active ? "market.pauseIt" : "market.turnOn")}
                    </button>
                  </form>
                }
              />
            ))}
          </ItemList>
        )}
        <form action={createClubPlanAction} className="grid gap-3 border-t border-line-soft p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
          <h3 className="m-0 text-base font-bold sm:col-span-2 lg:col-span-3">{t("market.newPlan")}</h3>
          <label className={label}>
            {t("market.planName")}
            <input name="name" required maxLength={60} className={field} />
          </label>
          <label className={label}>
            {t("market.period")}
            <select name="period" defaultValue="month" className="input h-10">
              <option value="month">{t("market.monthly")}</option>
              <option value="year">{t("market.yearly")}</option>
            </select>
          </label>
          <label className={label}>
            {t("market.planPrice", { currency })}
            <input name="price" required inputMode="decimal" dir="ltr" className={field} />
          </label>
          <label className={label}>
            {t("market.benefit")}
            <select name="benefit" defaultValue="free" className="input h-10">
              <option value="free">{t("market.b_free")}</option>
              <option value="percent">{t("market.b_percent")}</option>
            </select>
          </label>
          <label className={label}>
            {t("market.freeOver")}
            <input name="free_over" inputMode="decimal" dir="ltr" className={field} />
          </label>
          <label className={label}>
            {t("market.deliveryPercent")}
            <input name="delivery_percent" inputMode="numeric" dir="ltr" className={field} />
          </label>
          <label className={`${label} sm:col-span-2`}>
            {t("market.planDescription")}
            <input name="description" maxLength={200} className={field} />
          </label>
          <label className={label}>
            {t("market.perks")}
            <textarea name="perks" rows={2} className={field} />
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" className={`${btn.primary} h-11 px-5 text-sm`}>
              <Icon name="add" size={18} />
              {t("market.addPlan")}
            </button>
          </div>
        </form>
      </Section>
    </div>
  );
}
