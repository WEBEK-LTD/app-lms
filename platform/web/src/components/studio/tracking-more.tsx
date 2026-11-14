import type { CSSProperties, ReactNode } from "react";
import type { StudioNode } from "@/lib/pages/types";

/**
 * 130.11 The live element's more looks in the editor's phone, as the app
 * draws them (mobile/lib/modules/shared/pages/studio_live_more.dart) with a
 * sample (Safra's trip to Bali, the free taxis around Tahrir, a driver on
 * the way): the person's next trip (`trip`: the days over its legs, its
 * city over the first flight as a boarding pass, one line, the days
 * large), the free taxis around as a card (the nearest one's minutes) or a
 * headline (their count), and a ride's minutes to the pickup large. In the
 * app each is the person's own, and shows nothing without one.
 */

interface Leg {
  icon: string;
  day: string;
  note: string;
}

interface MoreWords {
  next: string;
  inDays: string;
  city: string;
  daysTo: string;
  hotel: string;
  nights: string;
  stay: string;
  legs: Leg[];
  from: string;
  to: string;
  flight: string;
  departs: string;
  departDay: string;
  arrives: string;
  arriveDay: string;
  seatsLabel: string;
  seats: string;
  length: string;
  pass: string;
  min: string;
  nearestFree: string;
  around: string;
  freeAround: string;
  onTheWay: string;
  driver: string;
  plate: string;
  car: string;
  name: string;
}

/** The samples in the app's words (Arabic as the app writes it): Safra's demo trip, Lamha's taxis, a driver. */
const SAMPLES: Record<"en" | "ar" | "tr", MoreWords> = {
  en: {
    next: "Your next trip",
    inDays: "In 4 days",
    city: "Bali",
    daysTo: "days to Bali",
    hotel: "Safra Bay Resort",
    nights: "4 nights · Breakfast included",
    stay: "4 nights at Safra Bay Resort",
    legs: [
      { icon: "flight_takeoff", day: "Tue 17", note: "SFR 471" },
      { icon: "airport_shuttle", day: "Wed 18", note: "Transfer" },
      { icon: "hotel", day: "4 nights", note: "Seminyak" },
      { icon: "flight_land", day: "Sun 22", note: "SFR 472" },
    ],
    from: "CAI",
    to: "DPS",
    flight: "SFR 471 · via DXB",
    departs: "21:05",
    departDay: "Tue 17 Nov",
    arrives: "14:35",
    arriveDay: "Wed 18 Nov",
    seatsLabel: "Seats",
    seats: "14A 14B",
    length: "11h 30m",
    pass: "Boarding pass",
    min: "min",
    nearestFree: "Nearest free taxi",
    around: "8 taxis around you, live",
    freeAround: "free taxis around you.",
    onTheWay: "On the way",
    driver: "Hany",
    plate: "TX 4821",
    car: "White sedan · 4.9",
    name: "Omar",
  },
  ar: {
    next: "رحلتك القادمة",
    inDays: "بعد 4 أيام",
    city: "بالي",
    daysTo: "أيام على بالي",
    hotel: "Safra Bay Resort",
    nights: "4 ليالٍ · الإفطار مشمول",
    stay: "4 ليالٍ في Safra Bay Resort",
    legs: [
      { icon: "flight_takeoff", day: "الثلاثاء 17", note: "SFR 471" },
      { icon: "airport_shuttle", day: "الأربعاء 18", note: "التوصيل" },
      { icon: "hotel", day: "4 ليالٍ", note: "Seminyak" },
      { icon: "flight_land", day: "الأحد 22", note: "SFR 472" },
    ],
    from: "CAI",
    to: "DPS",
    flight: "SFR 471 · عبر DXB",
    departs: "21:05",
    departDay: "الثلاثاء 17 نوفمبر",
    arrives: "14:35",
    arriveDay: "الأربعاء 18 نوفمبر",
    seatsLabel: "المقاعد",
    seats: "14A 14B",
    length: "11 س 30 د",
    pass: "بطاقة الصعود",
    min: "د",
    nearestFree: "أقرب سيارة أجرة متاحة",
    around: "8 سيارات أجرة حولك الآن",
    freeAround: "سيارات أجرة متاحة حولك.",
    onTheWay: "في الطريق",
    driver: "هاني",
    plate: "TX 4821",
    car: "سيدان بيضاء · 4.9",
    name: "عمر",
  },
  tr: {
    next: "Sıradaki seyahatiniz",
    inDays: "4 gün sonra",
    city: "Bali",
    daysTo: "gün kaldı: Bali",
    hotel: "Safra Bay Resort",
    nights: "4 gece · Kahvaltı dahil",
    stay: "Safra Bay Resort'ta 4 gece",
    legs: [
      { icon: "flight_takeoff", day: "Sal 17", note: "SFR 471" },
      { icon: "airport_shuttle", day: "Çar 18", note: "Transfer" },
      { icon: "hotel", day: "4 gece", note: "Seminyak" },
      { icon: "flight_land", day: "Paz 22", note: "SFR 472" },
    ],
    from: "CAI",
    to: "DPS",
    flight: "SFR 471 · DXB aktarmalı",
    departs: "21:05",
    departDay: "17 Kas Sal",
    arrives: "14:35",
    arriveDay: "18 Kas Çar",
    seatsLabel: "Koltuklar",
    seats: "14A 14B",
    length: "11 sa 30 dk",
    pass: "Biniş kartı",
    min: "dk",
    nearestFree: "En yakın boş taksi",
    around: "Çevrenizde 8 taksi, canlı",
    freeAround: "boş taksi çevrenizde.",
    onTheWay: "Yolda",
    driver: "Hany",
    plate: "TX 4821",
    car: "Beyaz sedan · 4.9",
    name: "Omar",
  },
};

export function moreWords(lang: string): MoreWords {
  return SAMPLES[(lang in SAMPLES ? lang : "en") as keyof typeof SAMPLES];
}

const ICON: CSSProperties = { fontVariationSettings: "'FILL' 1", lineHeight: 1 };
const MONO = "ui-monospace, 'JetBrains Mono', monospace";

function Icon({ name, size, color, style }: { name: string; size: number; color?: string; style?: CSSProperties }) {
  return (
    <span className="material-symbols-rounded" aria-hidden="true" style={{ ...ICON, fontSize: size, color, ...style }}>
      {name}
    </span>
  );
}

/** A big number with its small unit after it ("3 min", "1 min"). */
function Big({ value, unit, size }: { value: string; unit: string; size: number }) {
  return (
    <span style={{ display: "flex", alignItems: "baseline", gap: 3, flex: "none" }}>
      <span style={{ fontSize: size, fontWeight: 800, lineHeight: 0.9, letterSpacing: "-0.05em" }}>{value}</span>
      <span style={{ fontSize: size / 3.4, fontWeight: 800, opacity: 0.75 }}>{unit}</span>
    </span>
  );
}

/** 130.11 `trip`: the person's next trip. */
export function TripCard({ node, lang, dark, accent }: { node: StudioNode; lang: string; dark: boolean; accent: string }) {
  const w = moreWords(lang);
  const style = node.tracking?.style ?? "card";
  const days = "4";
  if (style === "line") {
    return (
      <span data-studio-tracking="trip-line" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <Icon name="flight" size={18} color={accent} />
        <span>
          <b>{w.city}</b> · {w.inDays} · {w.hotel}
        </span>
      </span>
    );
  }
  const head = (
    <span style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
      <span style={{ fontSize: 56, fontWeight: 700, lineHeight: 0.82, letterSpacing: "-0.05em", color: accent, flex: "none" }}>{days}</span>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: accent }}>{w.daysTo}</span>
        <span style={{ fontSize: 15, fontWeight: 800, marginTop: 3 }}>{w.hotel}</span>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.75 }}>{w.nights}</span>
      </span>
    </span>
  );
  if (style === "headline") return <span data-studio-tracking="trip-headline">{head}</span>;
  if (style === "ticket") return <TripTicket w={w} dark={dark} accent={accent} />;
  return (
    <span data-studio-tracking="trip-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {head}
      <span style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 6 }}>
        {w.legs.map((leg, i) => (
          <span key={i} style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
            <span aria-hidden="true" style={{ height: 3, borderRadius: 2, background: accent, opacity: i === 0 ? 1 : 0.35 }} />
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
              <Icon name={leg.icon} size={15} color={accent} />
              {leg.day}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, opacity: 0.75, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{leg.note}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

/** The trip's city large over its first flight as a boarding pass. */
function TripTicket({ w, dark, accent }: { w: MoreWords; dark: boolean; accent: string }) {
  const card = dark ? "#151C2E" : "#FFFFFF";
  const ink = dark ? "#F3EEE4" : "#0E1424";
  const soft = dark ? "#AEB2BF" : "#5A5F6E";
  const hair = dark ? "rgba(243,238,228,0.16)" : "rgba(14,20,36,0.14)";
  const code: CSSProperties = { fontSize: 30, fontWeight: 800, letterSpacing: "0.02em", lineHeight: 1 };
  return (
    <span data-studio-tracking="trip-ticket" style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: accent }}>
        {w.next} · {w.inDays}
      </span>
      <span style={{ fontSize: 64, fontWeight: 800, lineHeight: 0.92, letterSpacing: "-0.02em", marginTop: 8 }}>{w.city}</span>
      <span style={{ fontSize: 15, fontWeight: 600, marginTop: 8, opacity: 0.92 }}>{w.stay}</span>
      <span style={{ marginTop: 18, borderRadius: 24, background: card, color: ink, overflow: "hidden", boxShadow: dark ? "0 24px 50px rgba(0,0,0,0.55)" : "0 24px 48px rgba(14,20,36,0.18)" }}>
        <span dir="ltr" style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 0" }}>
          <span style={code}>{w.from}</span>
          <span style={{ flex: "1 1 auto", display: "flex", alignItems: "center", gap: 6, color: accent, minWidth: 0 }}>
            <span aria-hidden="true" style={{ flex: "1 1 auto", borderTop: `1.5px dashed ${accent}` }} />
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, color: soft, whiteSpace: "nowrap" }}>{w.flight}</span>
            <Icon name="flight" size={18} style={{ transform: "rotate(90deg)" }} />
            <span aria-hidden="true" style={{ flex: "1 1 auto", borderTop: `1.5px dashed ${accent}` }} />
          </span>
          <span style={code}>{w.to}</span>
        </span>
        <span style={{ display: "flex", justifyContent: "space-between", padding: "4px 16px 0", fontSize: 12, color: soft, fontWeight: 600 }}>
          <span>
            <b style={{ color: ink, fontSize: 14 }}>{w.departs}</b> · {w.departDay}
          </span>
          <span>
            <b style={{ color: ink, fontSize: 14 }}>{w.arrives}</b> · {w.arriveDay}
          </span>
        </span>
        <span aria-hidden="true" style={{ display: "block", margin: "14px 0 0", borderTop: `1.5px dashed ${hair}` }} />
        <span style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 10px 12px 16px", fontSize: 12, color: soft, fontWeight: 600 }}>
          <span>
            {w.seatsLabel} <b style={{ color: ink, fontFamily: MONO }}>{w.seats}</b>
          </span>
          <span>{w.length}</span>
          <span style={{ flex: "1 1 auto" }} />
          <span style={{ height: 36, padding: "0 12px", borderRadius: 18, background: dark ? accent : ink, color: dark ? "#0E1424" : "#F7F3EC", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="qr_code_2" size={17} />
            {w.pass}
          </span>
        </span>
      </span>
    </span>
  );
}

/** 130.11 The free taxis around: the nearest one's minutes (`card`) or their count (`headline`). */
export function NearbyMore({ node, lang, accent }: { node: StudioNode; lang: string; accent: string }) {
  const w = moreWords(lang);
  if (node.tracking?.style === "headline") {
    const size = node.font?.size ?? 44;
    return (
      <span data-studio-tracking="nearby-headline" style={{ fontSize: size, fontWeight: node.font?.weight ?? 800, lineHeight: 1.02, letterSpacing: "-0.04em" }}>
        <span style={{ display: "inline-block", background: accent, color: "#1C2541", borderRadius: size * 0.2, padding: `0 ${size * 0.14}px`, marginInlineEnd: size * 0.2 }}>8</span>
        {w.freeAround}
      </span>
    );
  }
  return (
    <span data-studio-tracking="nearby-card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Big value="1" unit={w.min} size={64} />
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>{w.nearestFree}</span>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.72, marginTop: 2 }}>{w.around}</span>
      </span>
    </span>
  );
}

/** 130.11 A ride's minutes to the pickup large, the driver, the plate and a call button. */
export function RideHeadline({ lang, brand }: { lang: string; brand: string }) {
  const w = moreWords(lang);
  return (
    <span data-studio-tracking="ride-headline" style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Big value="3" unit={w.min} size={56} />
      <span style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: brand }}>{w.onTheWay}</span>
        <span style={{ fontSize: 16, fontWeight: 800, marginTop: 2 }}>{w.driver}</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: 12, fontWeight: 600, opacity: 0.8 }}>
          <span dir="ltr" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 5, border: "1px solid currentColor" }}>
            {w.plate}
          </span>
          {w.car}
        </span>
      </span>
      <span style={{ width: 44, height: 44, borderRadius: 22, border: "1px solid currentColor", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", opacity: 0.9 }}>
        <Icon name="call" size={22} color={brand} />
      </span>
    </span>
  );
}

/** 130.11 A greeting's own words, `{name}` the sample's first name. */
export function ownGreeting(words: string, lang: string): ReactNode {
  return words.replaceAll("{name}", moreWords(lang).name);
}
