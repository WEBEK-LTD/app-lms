import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui";
import { richText } from "@/i18n/rich";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { deliverySettingsOf, pricesSet } from "@/lib/delivery/settings";
import { appPlan } from "@/lib/entitlements";
import { DEFAULT_FOOD_TIMEZONE, restaurantState } from "@/lib/food/service";
import { isFood, PlanNotice } from "../shipments/parts";
import { RestaurantForm } from "./forms";
import { NotFood, percentOf } from "./parts";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("food.restaurants") };
}

/** 105.1 The company's restaurants: open now or not, their menus and staff, the company's share. */
export default async function RestaurantsPage({ searchParams }: { searchParams: Promise<SampleQuery> }) {
  const { app, license } = await requireClient("catalog");
  const { t } = await dashboardText();
  if (!isFood(app)) return <NotFood title={t("food.restaurants")} t={t} />;
  const store = await getStore();
  const now = new Date();
  const [restaurants, staff, settings, plan] = await Promise.all([
    store.listRestaurants(app.id),
    store.listRestaurantStaff(app.id),
    store.getDeliverySettings(app.id).then(deliverySettingsOf),
    appPlan(store, license, now),
  ]);
  const menus = await Promise.all(restaurants.map((r) => store.getRestaurantMenu(app.id, r.id)));
  const cuisines = settings.cuisines ?? [];
  const names = new Map(cuisines.map((c) => [c.id, c.name]));
  const timezone = settings.timezone ?? DEFAULT_FOOD_TIMEZONE;
  const sorted = [...restaurants].sort((a, b) => a.position - b.position || a.id - b.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[640px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{t("food.restaurants")}</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("food.restaurantsIntro")}</p>
      </div>
      <PlanNotice plan={plan} t={t} app={app} />
      {!pricesSet(settings) ? (
        <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
          {richText(t("food.pricesFirst"), { link: (chunk) => <Link href="/dashboard/delivery">{chunk}</Link> })}
        </p>
      ) : null}
      {cuisines.length === 0 ? (
        <p role="note" className="m-0 rounded-xl bg-sand px-4 py-3 text-[15px] leading-relaxed">
          {richText(t("food.cuisinesFirst"), { link: (chunk) => <Link href="/dashboard/delivery">{chunk}</Link> })}
        </p>
      ) : null}

      <section aria-labelledby="h-restaurants" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-restaurants" className="m-0 text-lg font-bold">
          {t("food.restaurantCount", { count: restaurants.length })}
        </h2>
        {/* 110.2 */}
        <SampleEntries app={app} list="restaurants" query={await searchParams} />
        {sorted.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("food.noRestaurants")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {sorted.map((r) => {
              const state = restaurantState(r, timezone, now);
              const menu = menus[restaurants.indexOf(r)];
              const dishes = menu ? menu.sections.reduce((n, s) => n + s.dishes.length, 0) : 0;
              const people = staff.filter((s) => s.restaurantId === r.id).length;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-4 first:border-t-0 first:pt-0">
                  {r.logoAssetId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(r.logoAssetId)} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-line object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sand text-muted">
                      <Icon name="storefront" size={22} />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link href={`/dashboard/restaurants/${r.id}`} className="text-[15px] font-bold">
                      {r.name}
                    </Link>
                    <span className="text-[13px] text-muted">
                      {[
                        r.cuisines
                          .map((id) => names.get(id))
                          .filter(Boolean)
                          .join(", "),
                        t("food.dishCount", { count: dishes }),
                        t("food.staffCount", { count: people }),
                        t("food.shareLine", { percent: percentOf(r.commissionBp) }),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <SampleBadge sample={r.sample} />
                  {!r.active ? (
                    <Badge tone="warn">{t("food.paused")}</Badge>
                  ) : state.busy ? (
                    <Badge tone="warn">{t("food.busyNow")}</Badge>
                  ) : (
                    <Badge tone={state.inHours ? "success" : "neutral"}>{t(state.inHours ? "food.openNow" : "food.closedNow")}</Badge>
                  )}
                  <Link href={`/dashboard/restaurants/${r.id}`} className="text-sm font-semibold">
                    {t("food.manage")}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-add" className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-add" className="m-0 text-lg font-bold">
          {t("food.addRestaurant")}
        </h2>
        <RestaurantForm
          currency={settings.currency}
          cuisines={cuisines}
          restaurant={{ id: null, name: "", description: "", phone: "", address: "", details: "", map: "", cuisines: [], prepMinutes: "20", minOrder: "", maxKm: "", commission: "", logoUrl: null, coverUrl: null }}
        />
      </section>
    </div>
  );
}
