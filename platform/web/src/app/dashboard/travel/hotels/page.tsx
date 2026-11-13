export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { deleteTravelHotelAction, moveTravelHotelAction } from "@/app/actions/travel";
import { Icon } from "@/components/icon";
import { ItemList, ItemRow, Thumb } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";
import { Badge, btn, EmptyState, PageHeader, Section } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { hotelFormValues } from "@/lib/travel/forms";
import { travelSettingsOf } from "@/lib/travel/settings";
import { ConfirmButton } from "../../chat/forms";
import { HotelForm } from "../forms";
import { isTravel, NotTravel, PartOff, TravelPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("travel.hotels") };
}

/** 126 The company's hotels, in the app's order; each opens its page with its rooms. */
export default async function TravelHotelsPage({ searchParams }: { searchParams: Promise<SampleQuery> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isTravel(app)) return <NotTravel title={t("travel.hotels")} t={t} />;
  const store = await getStore();
  const [hotels, rooms, saved, plan] = await Promise.all([store.listTravelHotels(app.id), store.listTravelRooms(app.id), store.getTravelSettings(app.id), appPlan(store, license, new Date())]);
  const settings = travelSettingsOf(saved);
  const has = hotels.length > 0;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("travel.hotels")}
        description={t("travel.hotelsIntro")}
        actions={
          has ? (
            <SheetButton target="new-hotel" icon="add">
              {t("travel.addHotel")}
            </SheetButton>
          ) : null
        }
      />
      <TravelPlanNotice app={app} plan={plan} t={t} />
      {settings.hotels ? null : <PartOff text={t("travel.hotelsOff")} />}
      <SampleEntries app={app} list="hotels" query={await searchParams} />
      <Section titleId="h-hotels" title={t("travel.hotels")} actions={<Badge tone="neutral">{t("travel.hotelsCount", { count: hotels.length })}</Badge>} flush>
        {!has ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="bed" title={t("travel.noHotels")} />
          </div>
        ) : (
          <ItemList>
            {hotels.map((hotel, i) => (
              <ItemRow
                key={hotel.id}
                href={`/dashboard/travel/hotels/${hotel.id}`}
                media={<Thumb src={hotel.photos[0] ? assetUrl(hotel.photos[0]) : null} icon="bed" shape="square" tint={i} />}
                title={hotel.name}
                badges={
                  <>
                    <SampleBadge sample={hotel.sample} />
                    {hotel.featured ? <Badge tone="info">{t("travel.featured")}</Badge> : null}
                    {hotel.active ? null : <Badge tone="neutral">{t("travel.hidden")}</Badge>}
                  </>
                }
                meta={[t(`travel.hk_${hotel.kind}` as DashKey), [hotel.area, hotel.city].filter(Boolean).join(", "), "★".repeat(hotel.stars)].filter(Boolean).join(" · ")}
                extra={t("travel.roomsCount", { count: rooms.filter((r) => r.hotelId === hotel.id).length })}
                actions={
                  <>
                    <form action={moveTravelHotelAction}>
                      <input type="hidden" name="id" value={hotel.id} />
                      <input type="hidden" name="step" value="up" />
                      <button type="submit" disabled={i === 0} aria-label={t("travel.up")} className={`${btn.ghost} h-9 px-2`}>
                        <Icon name="arrow_upward" size={18} />
                      </button>
                    </form>
                    <form action={moveTravelHotelAction}>
                      <input type="hidden" name="id" value={hotel.id} />
                      <input type="hidden" name="step" value="down" />
                      <button type="submit" disabled={i === hotels.length - 1} aria-label={t("travel.down")} className={`${btn.ghost} h-9 px-2`}>
                        <Icon name="arrow_downward" size={18} />
                      </button>
                    </form>
                    <form action={deleteTravelHotelAction}>
                      <input type="hidden" name="id" value={hotel.id} />
                      <ConfirmButton confirm={t("travel.deleteHotel", { name: hotel.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("travel.delete")}
                      </ConfirmButton>
                    </form>
                  </>
                }
              />
            ))}
          </ItemList>
        )}
      </Section>
      <Sheet id="new-hotel" inline={!has} title={t("travel.addHotel")} description={t("travel.addHotelHint")}>
        <HotelForm id={null} values={hotelFormValues(null)} photos={[]} />
      </Sheet>
    </div>
  );
}
