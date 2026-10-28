import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteDishAction,
  deleteRestaurantAction,
  deleteSectionAction,
  deleteStaffAction,
  moveMenuItemAction,
  openRestaurantAction,
  setDishAvailableAction,
  setRestaurantActiveAction,
  setStaffActiveAction,
} from "@/app/actions/food";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn, formatDateTime } from "@/components/ui";
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
import { DishForm, HoursForm, RestaurantForm, SectionForm, StaffForm } from "../forms";
import { NotFood, percentOf } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("food.restaurants") };
}

const box = "flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6";

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
  const state = restaurantState(restaurant, timezone, new Date());
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

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/restaurants" className="text-sm font-semibold">
        {t("food.backToRestaurants")}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{restaurant.name}</h1>
        {!restaurant.active ? <Badge tone="warn">{t("food.paused")}</Badge> : state.busy ? <Badge tone="warn">{t("food.busyNow")}</Badge> : <Badge tone={state.inHours ? "success" : "neutral"}>{t(state.inHours ? "food.openNow" : "food.closedNow")}</Badge>}
        {rating !== null ? <span className="text-sm text-muted">{t("food.rating", { rating: String(rating), count: restaurant.ratingCount })}</span> : null}
      </div>
      {added ? (
        <p role="status" className="m-0 rounded-xl bg-success-bg px-4 py-3 text-[15px] font-semibold text-success">
          {t("food.added")}
        </p>
      ) : null}

      <section aria-labelledby="h-status" className={`${box} max-w-[860px]`}>
        <h2 id="h-status" className="sr-only">
          {t("food.inApp")}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex-1 text-[15px] font-semibold">{t(restaurant.active ? "food.inApp" : "food.hiddenNow")}</span>
          <form action={setRestaurantActiveAction}>
            <input type="hidden" name="restaurant" value={restaurant.id} />
            <input type="hidden" name="active" value={restaurant.active ? "false" : "true"} />
            <SubmitButton variant="secondary" className="h-9">
              {t(restaurant.active ? "food.pauseRestaurant" : "food.showRestaurant")}
            </SubmitButton>
          </form>
        </div>
        {state.busy && restaurant.busyUntil ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-4">
            <span className="flex-1 text-[15px]">{t("food.busyUntil", { time: formatDateTime(restaurant.busyUntil, lang) })}</span>
            <form action={openRestaurantAction}>
              <input type="hidden" name="restaurant" value={restaurant.id} />
              <SubmitButton variant="secondary" className="h-9">
                {t("food.openAgain")}
              </SubmitButton>
            </form>
          </div>
        ) : null}
      </section>

      <section aria-labelledby="h-details" className={`${box} max-w-[860px]`}>
        <h2 id="h-details" className="m-0 text-lg font-bold">
          {t("food.details")}
        </h2>
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
            logoUrl: restaurant.logoAssetId ? assetUrl(restaurant.logoAssetId) : null,
            coverUrl: restaurant.coverAssetId ? assetUrl(restaurant.coverAssetId) : null,
          }}
        />
      </section>

      <section aria-labelledby="h-hours" className={`${box} max-w-[860px]`}>
        <div className="flex flex-col gap-1">
          <h2 id="h-hours" className="m-0 text-lg font-bold">
            {t("food.hours")}
          </h2>
          <p className="m-0 text-[15px] text-ink-4">{t("food.hoursIntro", { zone: timezone })}</p>
          {restaurant.hours.length === 0 ? <p className="m-0 text-[15px] font-semibold text-warn">{t("food.noHours")}</p> : null}
        </div>
        <HoursForm restaurant={restaurant.id} hours={{ values: hours, days: WEEK_DAYS.map((d) => ({ id: d, label: t(`food.day_${d}`) })) }} />
      </section>

      <section aria-labelledby="h-menu" className={box}>
        <div className="flex flex-col gap-1">
          <h2 id="h-menu" className="m-0 text-lg font-bold">
            {t("food.menu")}
          </h2>
          <p className="m-0 text-[15px] text-ink-4">{t("food.menuIntro")}</p>
        </div>
        {menu.sections.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("food.noSections")}</p> : null}
        {menu.sections.map((section, si) => (
          <div key={section.id} className="flex flex-col gap-3 rounded-xl border border-line p-4">
            <div className="flex flex-wrap items-center gap-2">
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
            <details className="rounded-lg bg-sand p-3">
              <summary className="cursor-pointer text-sm font-semibold">{t("food.rename")}</summary>
              <div className="pt-3">
                <SectionForm restaurant={restaurant.id} section={section.id} name={section.name} />
              </div>
            </details>
            {section.dishes.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("food.noDishes")}</p> : null}
            <ul className="m-0 flex list-none flex-col p-0">
              {section.dishes.map((dish, di) => (
                <li key={dish.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-3">
                    {dish.imageAssetId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetUrl(dish.imageAssetId)} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-line object-cover" />
                    ) : null}
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
                  <details className="rounded-xl border border-line p-4">
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
            <details className="rounded-xl border border-dashed border-line p-4" open={section.dishes.length === 0}>
              <summary className="cursor-pointer text-[15px] font-semibold">{t("food.addDish")}</summary>
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
        <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
          <h3 className="m-0 text-[15px] font-bold">{t("food.addSection")}</h3>
          <SectionForm restaurant={restaurant.id} section={null} name="" />
        </div>
      </section>

      <section aria-labelledby="h-staff" className={`${box} max-w-[860px]`}>
        <div className="flex flex-col gap-1">
          <h2 id="h-staff" className="m-0 text-lg font-bold">
            {t("food.staff")}
          </h2>
          <p className="m-0 text-[15px] text-ink-4">{t("food.staffIntro")}</p>
        </div>
        {staff.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("food.noStaff")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {staff.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
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
        <StaffForm restaurant={restaurant.id} emailOnly={emailOnly} />
      </section>

      <section aria-labelledby="h-delete" className="flex max-w-[860px] flex-wrap items-center justify-end gap-3">
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
    </div>
  );
}
