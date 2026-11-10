import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  deleteDishAction,
  deleteRestaurantAction,
  deleteSectionAction,
  deleteStaffAction,
  endDelayAction,
  keepPlaceChangeAction,
  moveMenuItemAction,
  openRestaurantAction,
  removeClosedDatesAction,
  undoPlaceChangeAction,
  setDishAvailableAction,
  setRestaurantActiveAction,
  setStaffActiveAction,
} from "@/app/actions/food";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn, EmptyState, formatDate, formatDateTime, Notice, PageHeader, Section } from "@/components/ui";
import { DetailLayout, Thumb } from "@/components/page-kit";
import { SideCard } from "@/components/page-kit-b";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { choicesText, WEEK_DAYS } from "@/lib/food/forms";
import { EMPTY_MENU } from "@/lib/food/menu";
import { DEFAULT_FOOD_TIMEZONE, restaurantRating, restaurantState } from "@/lib/food/service";
import { hostedSignInMethods } from "@/lib/hosted/sign-in-methods";
import { ConfirmButton } from "../../chat/forms";
import { isFood } from "../../shipments/parts";
import { isMarketplaceApp } from "@/lib/market/plan";
import { serviceAreasOf, vendorAreaFormValues, vendorAreaWarning } from "@/lib/market/areas";
import { activeDelay, upcomingClosedDates } from "@/lib/market/vendor-controls";
import { utcToLocal } from "@/lib/bookings/time";
import { DaysOffForm, DishForm, HoursForm, RestaurantForm, SectionForm, StaffForm } from "../forms";
import { NotFood, percentOf } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("food.restaurants") };
}

function MoveButtons({ restaurant, section, dish, first, last, t }: { restaurant: number; section: number; dish?: number; first: boolean; last: boolean; t: (key: "food.up" | "food.down") => string }) {
  return (
    <>
      {(["up", "down"] as const).map((step) => (
        <form key={step} action={moveMenuItemAction}>
          <input type="hidden" name="restaurant" value={restaurant} />
          <input type="hidden" name="section" value={section} />
          {dish ? <input type="hidden" name="dish" value={dish} /> : null}
          <input type="hidden" name="step" value={step} />
          <button type="submit" disabled={step === "up" ? first : last} aria-label={t(step === "up" ? "food.up" : "food.down")} className={`${btn.ghost} h-9 px-2`}>
            <Icon name={step === "up" ? "arrow_upward" : "arrow_downward"} size={18} />
          </button>
        </form>
      ))}
    </>
  );
}

/** 105.1 One restaurant: its details, opening hours, menu and the staff who take its orders. */
export default async function RestaurantPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ added?: string }> }) {
  const { app } = await requireClient("catalog");
  const { t, lang } = await dashboardText();
  if (!isFood(app)) return <NotFood title={t("food.restaurants")} t={t} />;
  const id = Number((await params).id);
  const store = await getStore();
  const restaurant = Number.isSafeInteger(id) ? await store.getRestaurant(app.id, id) : null;
  if (!restaurant) notFound();
  const added = (await searchParams).added === "1";
  const [menu, staff, settings] = await Promise.all([
    store.getRestaurantMenu(app.id, restaurant.id).then((m) => m ?? EMPTY_MENU),
    store.listRestaurantStaff(app.id, restaurant.id),
    store.getDeliverySettings(app.id).then(deliverySettingsOf),
  ]);
  const timezone = settings.timezone ?? DEFAULT_FOOD_TIMEZONE;
  const now = new Date();
  const state = restaurantState(restaurant, timezone, now);
  // 115.20 What the place set itself: running late, its days off, and what it changed.
  const delay = activeDelay(restaurant, now);
  const today = utcToLocal(now, timezone).date;
  const daysOff = upcomingClosedDates(restaurant.closedDates, today);
  const edit = restaurant.vendorEdit ?? null;
  const dayText = (date: string) => formatDate(new Date(`${date}T00:00:00Z`), lang);
  const rating = restaurantRating(restaurant);
  const methods = hostedSignInMethods(app);
  const emailOnly = methods.length === 1 && methods[0] === "email";
  const hours: Record<string, string> = {};
  for (const day of WEEK_DAYS) {
    restaurant.hours
      .filter((h) => h.day === day)
      .slice(0, 2)
      .forEach((h, i) => {
        hours[`${day}-opens${i ? "2" : ""}`] = h.opens;
        hours[`${day}-closes${i ? "2" : ""}`] = h.closes;
      });
  }
  const a = restaurant.address;

  const dishes = menu.sections.reduce((n, sec) => n + sec.dishes.length, 0);
  const stateBadge = !restaurant.active ? (
    <Badge tone="warn">{t("food.paused")}</Badge>
  ) : state.busy ? (
    <Badge tone="warn">{t("food.busyNow")}</Badge>
  ) : (
    <Badge tone={state.inHours ? "success" : "neutral"}>{t(state.inHours ? "food.openNow" : "food.closedNow")}</Badge>
  );
  const lateBadge = delay ? <Badge tone="warn">{t("food.runningLateBadge")}</Badge> : null;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, then the menu, hours and details beside the restaurant's state, its staff and the delete. */}
      <PageHeader
        back={{ href: "/dashboard/restaurants", label: t("food.restaurants") }}
        title={restaurant.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {stateBadge}
            {lateBadge}
            {rating !== null ? <span className="text-sm text-muted">{t("food.rating", { rating: String(rating), count: restaurant.ratingCount })}</span> : null}
            <span className="text-sm text-muted">{a.address}</span>
          </span>
        }
      />
      {added ? (
        <Notice tone="success" icon="check_circle" role="status">
          <span className="font-semibold">{t("food.added")}</span>
        </Notice>
      ) : null}
      {edit ? (
        <Notice tone="warn" icon="schedule">
          <div className="flex flex-col gap-2">
            <span className="font-semibold">{edit.by ? t("food.placeChangedBy", { name: edit.by, date: formatDateTime(edit.at, lang) }) : t("food.placeChanged", { date: formatDateTime(edit.at, lang) })}</span>
            <ul className="m-0 list-disc ps-5 text-[15px]">
              {edit.fields.includes("hours") ? <li>{t("food.changedHours")}</li> : null}
              {edit.fields.includes("closed_dates") ? <li>{t("food.changedClosedDates")}</li> : null}
              {edit.fields.includes("prep_minutes") ? <li>{t("food.changedPrep", { before: edit.previous.prepMinutes, after: restaurant.prepMinutes })}</li> : null}
            </ul>
            <span className="text-sm text-muted">{t("food.placeChangedHint")}</span>
            <div className="flex flex-wrap gap-2">
              <form action={undoPlaceChangeAction}>
                <input type="hidden" name="restaurant" value={restaurant.id} />
                <SubmitButton className="h-9">
                  <Icon name="undo" size={18} />
                  {t("food.undoPlaceChange")}
                </SubmitButton>
              </form>
              <form action={keepPlaceChangeAction}>
                <input type="hidden" name="restaurant" value={restaurant.id} />
                <SubmitButton variant="secondary" className="h-9">
                  {t("food.keepPlaceChange")}
                </SubmitButton>
              </form>
            </div>
          </div>
        </Notice>
      ) : null}

      <DetailLayout
        main={
          <>
            <Section titleId="h-menu" title={t("food.menu")} description={t("food.menuIntro")} actions={<Badge tone="neutral">{t("food.dishCount", { count: dishes })}</Badge>}>
              {menu.sections.length === 0 ? <EmptyState icon="restaurant_menu" title={t("food.noSections")} /> : null}
              {menu.sections.map((section, si) => (
                <div key={section.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-sand/40 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-midnight text-sm font-extrabold text-ivory tabular-nums">
                      {si + 1}
                    </span>
                    <h3 className="m-0 flex-1 text-[17px] font-bold">{section.name}</h3>
                    <MoveButtons restaurant={restaurant.id} section={section.id} first={si === 0} last={si === menu.sections.length - 1} t={t} />
                    <form action={deleteSectionAction}>
                      <input type="hidden" name="restaurant" value={restaurant.id} />
                      <input type="hidden" name="section" value={section.id} />
                      <ConfirmButton confirm={t("food.deleteSectionConfirm", { name: section.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("food.delete")}
                      </ConfirmButton>
                    </form>
                  </div>
                  <details className="rounded-xl border border-line-soft bg-white px-3 py-2">
                    <summary className="cursor-pointer text-sm font-semibold">{t("food.rename")}</summary>
                    <div className="pt-3">
                      <SectionForm restaurant={restaurant.id} section={section.id} name={section.name} />
                    </div>
                  </details>
                  {section.dishes.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("food.noDishes")}</p> : null}
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {section.dishes.map((dish, di) => (
                      <li key={dish.id} className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <Thumb src={dish.imageAssetId ? assetUrl(dish.imageAssetId) : null} icon="restaurant" shape="square" tint={di} />
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="text-[15px] font-bold">{dish.name}</span>
                            <span className="text-[13px] text-muted">
                              {[formatCents(dish.priceCents, settings.currency), dish.popular ? t("food.popular") : null, dish.choiceGroups.map((g) => g.name).join(", ")].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          {dish.available ? null : <Badge tone="warn">{t("food.soldOut")}</Badge>}
                          <form action={setDishAvailableAction}>
                            <input type="hidden" name="restaurant" value={restaurant.id} />
                            <input type="hidden" name="dish" value={dish.id} />
                            <input type="hidden" name="available" value={dish.available ? "false" : "true"} />
                            <SubmitButton variant="secondary" className="h-9">
                              {t(dish.available ? "food.markSoldOut" : "food.markAvailable")}
                            </SubmitButton>
                          </form>
                          <MoveButtons restaurant={restaurant.id} section={section.id} dish={dish.id} first={di === 0} last={di === section.dishes.length - 1} t={t} />
                          <form action={deleteDishAction}>
                            <input type="hidden" name="restaurant" value={restaurant.id} />
                            <input type="hidden" name="dish" value={dish.id} />
                            <ConfirmButton confirm={t("food.deleteDishConfirm", { name: dish.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                              {t("food.delete")}
                            </ConfirmButton>
                          </form>
                        </div>
                        <details className="rounded-xl border border-line-soft px-3 py-2">
                          <summary className="cursor-pointer text-[15px] font-semibold">{t("food.editDish", { name: dish.name })}</summary>
                          <div className="pt-3">
                            <DishForm
                              restaurant={restaurant.id}
                              section={section.id}
                              currency={settings.currency}
                              dish={{
                                id: dish.id,
                                name: dish.name,
                                description: dish.description ?? "",
                                price: centsToDecimal(dish.priceCents),
                                available: dish.available,
                                popular: dish.popular,
                                choices: choicesText(dish.choiceGroups),
                                imageUrl: dish.imageAssetId ? assetUrl(dish.imageAssetId) : null,
                              }}
                            />
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                  <details className="rounded-xl border border-dashed border-line-strong bg-white px-3 py-2.5" open={section.dishes.length === 0}>
                    <summary className="flex cursor-pointer items-center gap-2 text-[15px] font-semibold">
                      <Icon name="add" size={18} className="text-muted" />
                      {t("food.addDish")}
                    </summary>
                    <div className="pt-3">
                      <DishForm
                        restaurant={restaurant.id}
                        section={section.id}
                        currency={settings.currency}
                        dish={{ id: null, name: "", description: "", price: "", available: true, popular: false, choices: "", imageUrl: null }}
                      />
                    </div>
                  </details>
                </div>
              ))}
              <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-line-strong p-4">
                <h3 className="m-0 flex items-center gap-2 text-[15px] font-bold">
                  <Icon name="add" size={18} className="text-muted" />
                  {t("food.addSection")}
                </h3>
                <SectionForm restaurant={restaurant.id} section={null} name="" />
              </div>
            </Section>

            <Section titleId="h-hours" title={t("food.hours")} description={t("food.hoursIntro", { zone: timezone })}>
              {restaurant.hours.length === 0 ? (
                <Notice tone="warn" icon="schedule">
                  {t("food.noHours")}
                </Notice>
              ) : null}
              <HoursForm restaurant={restaurant.id} hours={{ values: hours, days: WEEK_DAYS.map((d) => ({ id: d, label: t(`food.day_${d}`) })) }} />
              {/* 115.20 Days off: closed all day on these dates. */}
              <div className="flex flex-col gap-3 border-t border-line-soft pt-4">
                <h3 className="m-0 text-[17px] font-bold">{t("food.daysOff")}</h3>
                <p className="m-0 text-sm text-muted">{t("food.daysOffIntro")}</p>
                {daysOff.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("food.noDaysOff")}</p> : null}
                <ul className="m-0 flex list-none flex-col gap-2 p-0">
                  {daysOff.map((c) => (
                    <li key={`${c.from}-${c.to}`} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-3 py-2">
                      <Icon name="event_busy" size={18} className="text-muted" />
                      <span className="flex-1 text-[15px] font-semibold">{c.from === c.to ? dayText(c.from) : `${dayText(c.from)} – ${dayText(c.to)}`}</span>
                      <form action={removeClosedDatesAction}>
                        <input type="hidden" name="restaurant" value={restaurant.id} />
                        <input type="hidden" name="from" value={c.from} />
                        <input type="hidden" name="to" value={c.to} />
                        <SubmitButton variant="secondary" className="h-9">
                          {t("food.removeDayOff")}
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
                <DaysOffForm restaurant={restaurant.id} today={today} />
              </div>
            </Section>

            <Section titleId="h-details" title={t("food.details")}>
              <RestaurantForm
                currency={settings.currency}
                cuisines={settings.cuisines ?? []}
                restaurant={{
                  id: restaurant.id,
                  name: restaurant.name,
                  description: restaurant.description ?? "",
                  phone: restaurant.phone ?? "",
                  address: a.address,
                  details: a.details ?? "",
                  map: a.lat !== null && a.lng !== null ? `${a.lat}, ${a.lng}` : "",
                  cuisines: restaurant.cuisines,
                  prepMinutes: String(restaurant.prepMinutes),
                  minOrder: restaurant.minOrderCents > 0 ? centsToDecimal(restaurant.minOrderCents) : "",
                  maxKm: restaurant.maxKm === null ? "" : String(restaurant.maxKm),
                  commission: percentOf(restaurant.commissionBp),
                  commissionFixed: restaurant.commissionFixed ? centsToDecimal(restaurant.commissionFixed) : "",
                  taxRate: restaurant.taxRateBp === null || restaurant.taxRateBp === undefined ? "" : percentOf(restaurant.taxRateBp),
                  logoUrl: restaurant.logoAssetId ? assetUrl(restaurant.logoAssetId) : null,
                  coverUrl: restaurant.coverAssetId ? assetUrl(restaurant.coverAssetId) : null,
                }}
                area={isMarketplaceApp(app) ? { areas: serviceAreasOf(settings), values: vendorAreaFormValues(restaurant, serviceAreasOf(settings)), warning: vendorAreaWarning(restaurant, serviceAreasOf(settings)) } : undefined}
              />
            </Section>
          </>
        }
        side={
          <>
            <SideCard titleId="h-status" icon="storefront" title={t("food.inAppTitle")}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[15px] font-semibold">{t(restaurant.active ? "food.inApp" : "food.hiddenNow")}</span>
                <form action={setRestaurantActiveAction}>
                  <input type="hidden" name="restaurant" value={restaurant.id} />
                  <input type="hidden" name="active" value={restaurant.active ? "false" : "true"} />
                  <SubmitButton variant="secondary" className="h-9">
                    {t(restaurant.active ? "food.pauseRestaurant" : "food.showRestaurant")}
                  </SubmitButton>
                </form>
              </div>
              {state.busy && restaurant.busyUntil ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
                  <span className="flex-1 text-[15px]">{t("food.busyUntil", { time: formatDateTime(restaurant.busyUntil, lang) })}</span>
                  <form action={openRestaurantAction}>
                    <input type="hidden" name="restaurant" value={restaurant.id} />
                    <SubmitButton variant="secondary" className="h-9">
                      {t("food.openAgain")}
                    </SubmitButton>
                  </form>
                </div>
              ) : null}
              {delay ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-3">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">
                      {t("food.runningLate", { minutes: delay.minutes, reason: delay.reason === "other" ? (delay.note ?? "") : t(`food.delay_${delay.reason}`) })}
                    </span>
                    <span className="text-[13px] text-muted">
                      {delay.until ? t("food.runningLateUntil", { time: formatDateTime(delay.until, lang) }) : t("food.runningLateOpen")} {t("food.runningLateHint")}
                    </span>
                  </span>
                  <form action={endDelayAction}>
                    <input type="hidden" name="restaurant" value={restaurant.id} />
                    <SubmitButton variant="secondary" className="h-9">
                      {t("food.endDelay")}
                    </SubmitButton>
                  </form>
                </div>
              ) : null}
            </SideCard>

            <Section titleId="h-staff" title={t("food.staff")} description={t("food.staffIntro")}>
              {staff.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("food.noStaff")}</p> : null}
              <ul className="m-0 flex list-none flex-col p-0">
                {staff.map((person, pi) => (
                  <li key={person.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                    <Thumb icon="person" shape="round" tint={pi} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-bold">{person.name}</span>
                      <span className="text-[13px] text-muted" dir="ltr">
                        {person.phone ?? person.email}
                      </span>
                    </span>
                    {person.active ? null : <Badge tone="warn">{t("food.paused")}</Badge>}
                    <form action={setStaffActiveAction}>
                      <input type="hidden" name="id" value={person.id} />
                      <input type="hidden" name="active" value={person.active ? "false" : "true"} />
                      <SubmitButton variant="secondary" className="h-9">
                        {t(person.active ? "food.pause" : "food.resume")}
                      </SubmitButton>
                    </form>
                    <form action={deleteStaffAction}>
                      <input type="hidden" name="id" value={person.id} />
                      <ConfirmButton confirm={t("food.removeStaffConfirm", { name: person.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("food.remove")}
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line-soft pt-4">
                <StaffForm restaurant={restaurant.id} emailOnly={emailOnly} />
              </div>
            </Section>

            <section aria-labelledby="h-delete" className="flex flex-wrap items-center justify-end gap-3">
              <h2 id="h-delete" className="sr-only">
                {t("food.deleteRestaurant")}
              </h2>
              <form action={deleteRestaurantAction}>
                <input type="hidden" name="restaurant" value={restaurant.id} />
                <ConfirmButton confirm={t("food.deleteRestaurantConfirm", { name: restaurant.name })} className={`${btn.danger} h-10 px-4 text-sm`}>
                  {t("food.deleteRestaurant")}
                </ConfirmButton>
              </form>
            </section>
          </>
        }
      />
    </div>
  );
}
