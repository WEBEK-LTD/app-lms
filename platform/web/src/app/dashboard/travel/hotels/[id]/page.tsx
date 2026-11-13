export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deleteTravelRoomAction, setTravelReviewHiddenAction } from "@/app/actions/travel";
import { ItemList, ItemRow, Thumb } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { SampleBadge } from "@/components/samples";
import { Badge, btn, EmptyState, PageHeader, Section } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { hotelFormValues, roomFormValues } from "@/lib/travel/forms";
import { travelSettingsOf } from "@/lib/travel/settings";
import { ConfirmButton } from "../../../chat/forms";
import { HotelForm, RoomForm } from "../../forms";
import { isTravel, NotTravel } from "../../parts";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { app } = await requireClient("settings");
  const hotel = app ? await (await getStore()).getTravelHotel(app.id, Number((await params).id)) : null;
  return { title: hotel?.name ?? (await dashboardText()).t("travel.hotels") };
}

/** 126 A hotel: its details and photos, its rooms with their rates and calendar, its reviews. */
export default async function TravelHotelPage({ params }: { params: Promise<{ id: string }> }) {
  const { app } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isTravel(app)) return <NotTravel title={t("travel.hotels")} t={t} />;
  const store = await getStore();
  const id = Number((await params).id);
  const hotel = Number.isSafeInteger(id) ? await store.getTravelHotel(app.id, id) : null;
  if (!hotel) notFound();
  const [rooms, reviews, saved] = await Promise.all([store.listTravelRooms(app.id, hotel.id), store.listTravelReviews(app.id, hotel.id), store.getTravelSettings(app.id)]);
  const currency = travelSettingsOf(saved).currency;
  const photos = (ids: string[]) => ids.map((a) => ({ id: a, url: assetUrl(a) }));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={{ href: "/dashboard/travel/hotels", label: t("travel.backToHotels") }}
        title={hotel.name}
        description={[hotel.area, hotel.city, hotel.country].filter(Boolean).join(", ")}
        actions={
          <SheetButton target="new-room" icon="add">
            {t("travel.addRoom")}
          </SheetButton>
        }
      />
      <Section titleId="h-rooms" title={t("travel.rooms")} description={t("travel.roomsIntro")} flush>
        {rooms.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="bed" title={t("travel.noRooms")} />
          </div>
        ) : (
          <ItemList>
            {rooms.map((room, i) => (
              <ItemRow
                key={room.id}
                media={<Thumb src={room.photos[0] ? assetUrl(room.photos[0]) : null} icon="bed" shape="square" tint={i} />}
                title={room.name}
                badges={
                  <>
                    <SampleBadge sample={room.sample} />
                    {room.active ? null : <Badge tone="neutral">{t("travel.hidden")}</Badge>}
                  </>
                }
                meta={t("travel.roomLine", { price: formatCents(room.nightlyCents, currency), units: room.units, sleeps: room.sleeps })}
                extra={room.rates.map((r) => r.name).join(" · ")}
                actions={
                  <>
                    <SheetButton target={`room-${room.id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
                      {t("travel.edit")}
                    </SheetButton>
                    <form action={deleteTravelRoomAction}>
                      <input type="hidden" name="id" value={room.id} />
                      <ConfirmButton confirm={t("travel.deleteRoom", { name: room.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("travel.delete")}
                      </ConfirmButton>
                    </form>
                    <Sheet id={`room-${room.id}`} title={t("travel.editRoom", { name: room.name })}>
                      <RoomForm hotelId={hotel.id} id={room.id} values={roomFormValues(room)} photos={photos(room.photos)} currency={currency} />
                    </Sheet>
                  </>
                }
              />
            ))}
          </ItemList>
        )}
      </Section>
      <Sheet id="new-room" title={t("travel.addRoom")}>
        <RoomForm hotelId={hotel.id} id={null} values={roomFormValues(null)} photos={[]} currency={currency} />
      </Sheet>
      <Section titleId="h-details" title={t("travel.details")}>
        <HotelForm id={hotel.id} values={hotelFormValues(hotel)} photos={photos(hotel.photos)} />
      </Section>
      <Section titleId="h-reviews" title={t("travel.reviews")} description={t("travel.reviewsIntro")} flush>
        {reviews.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="star" title={t("travel.noReviews")} />
          </div>
        ) : (
          <ItemList>
            {reviews.map((review) => (
              <ItemRow
                key={review.id}
                title={`${review.score}/10 · ${review.name}`}
                badges={review.hidden ? <Badge tone="neutral">{t("travel.hidden")}</Badge> : null}
                meta={review.text ?? undefined}
                extra={review.stayed}
                actions={
                  <form action={setTravelReviewHiddenAction}>
                    <input type="hidden" name="id" value={review.id} />
                    <input type="hidden" name="hidden" value={review.hidden ? "false" : "true"} />
                    <button type="submit" className={`${btn.secondary} h-9 px-3.5 text-sm`}>
                      {review.hidden ? t("travel.show") : t("travel.hide")}
                    </button>
                  </form>
                }
              />
            ))}
          </ItemList>
        )}
      </Section>
    </div>
  );
}
