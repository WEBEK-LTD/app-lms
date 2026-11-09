import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, Notice, PageHeader, Section } from "@/components/ui";
import { ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList, Sheet, SheetButton } from "@/components/page-kit-client";
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

  const rows = sorted.map((r) => {
    const state = restaurantState(r, timezone, now);
    const menu = menus[restaurants.indexOf(r)];
    const dishes = menu ? menu.sections.reduce((n, sec) => n + sec.dishes.length, 0) : 0;
    const people = staff.filter((p) => p.restaurantId === r.id).length;
    const group = !r.active ? "paused" : state.busy ? "busy" : state.inHours ? "open" : "closed";
    return { r, dishes, people, group };
  });
  const has = restaurants.length > 0;
  const count = (group: string) => rows.filter((row) => row.group === group).length;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, the form in a Sheet (in place for the first restaurant), then the list. */}
      <PageHeader
        title={t("food.restaurants")}
        description={t("food.restaurantsIntro")}
        actions={
          has ? (
            <SheetButton target="new-restaurant" icon="add">
              {t("food.addRestaurant")}
            </SheetButton>
          ) : null
        }
      />
      <PlanNotice plan={plan} t={t} app={app} />
      {!pricesSet(settings) ? (
        <Notice tone="warn" icon="warning">
          {richText(t("food.pricesFirst"), { link: (chunk) => <Link href="/dashboard/delivery">{chunk}</Link> })}
        </Notice>
      ) : null}
      {cuisines.length === 0 ? (
        <Notice tone="neutral" icon="restaurant_menu">
          {richText(t("food.cuisinesFirst"), { link: (chunk) => <Link href="/dashboard/delivery">{chunk}</Link> })}
        </Notice>
      ) : null}
      {/* 110.2 */}
      <SampleEntries app={app} list="restaurants" query={await searchParams} />

      {has ? (
        <StatRow label={t("food.restaurants")}>
          <Stat icon="storefront" label={t("food.restaurants")} value={restaurants.length} />
          <Stat icon="check_circle" tone="success" label={t("food.openNow")} value={count("open")} hint={count("busy") ? `${t("food.busyNow")}: ${count("busy")}` : undefined} />
          <Stat icon="restaurant_menu" tone="accent" label={t("food.statDishes")} value={rows.reduce((n, row) => n + row.dishes, 0)} />
          <Stat icon="groups" label={t("food.staff")} value={staff.length} />
        </StatRow>
      ) : null}

      {/* One place in the page either way, so the form that adds the first restaurant keeps its message. */}
      <Sheet id="new-restaurant" inline={!has} title={t("food.addRestaurant")} description={t("food.addRestaurantHint")}>
        <RestaurantForm
          currency={settings.currency}
          cuisines={cuisines}
          restaurant={{ id: null, name: "", description: "", phone: "", address: "", details: "", map: "", cuisines: [], prepMinutes: "20", minOrder: "", maxKm: "", commission: "", commissionFixed: "", taxRate: "", logoUrl: null, coverUrl: null }}
        />
      </Sheet>

      <Section titleId="h-restaurants" title={t("food.restaurantCount", { count: restaurants.length })} flush>
        {sorted.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="storefront" title={t("food.noRestaurants")} />
          </div>
        ) : (
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("food.searchRestaurants")}
            noMatch={t("food.noRestaurantMatch")}
            filters={[
              { value: "open", label: t("food.openNow") },
              { value: "busy", label: t("food.busyNow") },
              { value: "closed", label: t("food.closedNow") },
              { value: "paused", label: t("food.paused") },
            ]}
            items={rows.map(({ r, dishes, people, group }, i) => {
              const kinds = r.cuisines
                .map((id) => names.get(id))
                .filter(Boolean)
                .join(", ");
              return {
                id: r.id,
                text: [r.name, kinds, r.address.address].filter(Boolean).join(" "),
                group,
                node: (
                  <ItemRow
                    href={`/dashboard/restaurants/${r.id}`}
                    media={<Thumb src={r.logoAssetId ? assetUrl(r.logoAssetId) : null} icon="storefront" shape="square" tint={i} />}
                    title={r.name}
                    badges={<SampleBadge sample={r.sample} />}
                    meta={[kinds, t("food.dishCount", { count: dishes }), t("food.staffCount", { count: people }), t("food.shareLine", { percent: percentOf(r.commissionBp) })].filter(Boolean).join(" · ")}
                    extra={
                      <span className="flex min-w-0 items-center gap-1">
                        <Icon name="location_on" size={16} className="text-muted" />
                        <span className="truncate">{r.address.address}</span>
                      </span>
                    }
                    aside={
                      group === "paused" ? (
                        <Badge tone="warn">{t("food.paused")}</Badge>
                      ) : group === "busy" ? (
                        <Badge tone="warn">{t("food.busyNow")}</Badge>
                      ) : (
                        <Badge tone={group === "open" ? "success" : "neutral"}>{t(group === "open" ? "food.openNow" : "food.closedNow")}</Badge>
                      )
                    }
                  />
                ),
              };
            })}
          />
        )}
      </Section>
    </div>
  );
}
