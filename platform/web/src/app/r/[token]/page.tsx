import type { Metadata } from "next";
import { getStore } from "@/lib/data";
import { carText } from "@/lib/rides/notify";
import { DRIVER_FRESH_MINUTES, rideReference } from "@/lib/rides/service";
import { PayShell } from "@/app/pay/[token]/shell";
import { NO_INDEX } from "@/lib/seo";

export const metadata: Metadata = { title: "Shared ride", robots: NO_INDEX };
export const dynamic = "force-dynamic";

type Lang = "en" | "ar" | "tr";

interface Words {
  ended: string;
  endedTitle: string;
  title: string;
  scheduled: string;
  searching: string;
  accepted: string;
  arrived: string;
  in_progress: string;
  from: string;
  to: string;
  driver: string;
  where: string;
  open: string;
  updated: string;
}

const WORDS: Record<Lang, Words> = {
  en: {
    ended: "This ride has ended, or the link isn't valid.",
    endedTitle: "Link ended",
    title: "Ride {ref}",
    scheduled: "Booked for later",
    searching: "Looking for a driver",
    accepted: "The driver is on the way to the pickup",
    arrived: "The driver is at the pickup",
    in_progress: "On the way",
    from: "From",
    to: "To",
    driver: "Driver",
    where: "Where the car is now",
    open: "Open in maps",
    updated: "This page refreshes by itself.",
  },
  ar: {
    ended: "انتهت هذه الرحلة، أو أن الرابط غير صالح.",
    endedTitle: "انتهى الرابط",
    title: "الرحلة {ref}",
    scheduled: "محجوزة لوقت لاحق",
    searching: "جارٍ البحث عن سائق",
    accepted: "السائق في الطريق إلى نقطة الانطلاق",
    arrived: "السائق عند نقطة الانطلاق",
    in_progress: "في الطريق",
    from: "من",
    to: "إلى",
    driver: "السائق",
    where: "مكان السيارة الآن",
    open: "افتح في الخرائط",
    updated: "تتحدّث هذه الصفحة تلقائيًا.",
  },
  tr: {
    ended: "Bu yolculuk bitti ya da bağlantı geçerli değil.",
    endedTitle: "Bağlantının süresi doldu",
    title: "Yolculuk {ref}",
    scheduled: "Sonrası için ayrıldı",
    searching: "Sürücü aranıyor",
    accepted: "Sürücü alış noktasına geliyor",
    arrived: "Sürücü alış noktasında",
    in_progress: "Yolda",
    from: "Nereden",
    to: "Nereye",
    driver: "Sürücü",
    where: "Aracın şu anki yeri",
    open: "Haritada aç",
    updated: "Bu sayfa kendini yeniler.",
  },
};

/**
 * 105.2 A shared ride (`Ride.share_url`): whoever has the link sees the
 * ride's stage, the driver, the car and where it is, until the ride ends
 * (its token is cleared then). No rider's name or number is shown. The page
 * asks again every 15 seconds.
 */
export default async function SharedRidePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = await getStore();
  const ride = /^[A-Za-z0-9_-]{16,40}$/.test(token) ? await store.findRideByShareToken(token) : null;
  const app = ride ? await store.getAppById(ride.appId) : null;
  const lang: Lang = ride?.lang === "ar" || ride?.lang === "tr" ? ride.lang : "en";
  const w = WORDS[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";
  if (!ride || !app || app.connector?.kind !== "rides") {
    return (
      <div dir={dir} lang={lang}>
        <PayShell app={app}>
          <h1 className="m-0 text-[24px] font-extrabold">{w.endedTitle}</h1>
          <p className="m-0 text-[16px] leading-relaxed text-ink-4">{w.ended}</p>
        </PayShell>
      </div>
    );
  }
  const driver = ride.driverId !== null ? await store.getCourier(app.id, ride.driverId) : null;
  const fresh = driver?.locatedAt && Date.now() - driver.locatedAt.getTime() <= DRIVER_FRESH_MINUTES * 60_000 && driver.lat !== null && driver.lng !== null;
  const status = ride.status === "scheduled" || ride.status === "searching" || ride.status === "accepted" || ride.status === "arrived" || ride.status === "in_progress" ? w[ride.status] : "";
  return (
    <div dir={dir} lang={lang}>
      <meta httpEquiv="refresh" content="15" />
      <PayShell app={app}>
        <h1 className="m-0 text-[24px] font-extrabold">{w.title.replace("{ref}", rideReference(ride))}</h1>
        <p role="status" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[16px] font-semibold">
          {status}
        </p>
        <dl className="m-0 grid gap-3 text-[15px]">
          <div>
            <dt className="text-ink-4">{w.from}</dt>
            <dd className="m-0 font-semibold">{ride.pickup.address}</dd>
          </div>
          <div>
            <dt className="text-ink-4">{w.to}</dt>
            <dd className="m-0 font-semibold">{ride.dropoff.address}</dd>
          </div>
          {ride.driverName ? (
            <div>
              <dt className="text-ink-4">{w.driver}</dt>
              <dd className="m-0 font-semibold">
                {ride.driverName}
                {carText(driver) ? ` · ${carText(driver)}` : ""}
              </dd>
            </div>
          ) : null}
        </dl>
        {fresh ? (
          <p className="m-0 text-[15px]">
            {w.where}:{" "}
            <a className="font-semibold text-accent" href={`https://www.google.com/maps?q=${driver!.lat},${driver!.lng}`} rel="noopener noreferrer" target="_blank">
              {w.open}
            </a>
          </p>
        ) : null}
        <p className="m-0 text-[13px] text-ink-4">{w.updated}</p>
      </PayShell>
    </div>
  );
}
