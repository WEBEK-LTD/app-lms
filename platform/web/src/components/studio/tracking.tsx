import type { CSSProperties } from "react";
import type { StudioNode } from "@/lib/pages/types";

/**
 * 128 The live elements in the editor's phone, as the app draws them
 * (mobile/lib/modules/shared/pages/studio_live.dart) with a sample, since the
 * editor has no signed-in person: a shipment on its way with its stages, a
 * driver on the way with their car and a call button, the taxis near the
 * person, and a greeting with their name. In the app each is the person's
 * own, and shows nothing when there is none.
 */

interface LiveWords {
  shipmentTitle: string;
  shipmentLine: string;
  track: string;
  driverWhen: string;
  driverName: string;
  driverFacts: string;
  nearbyBefore: string;
  nearbyBold: string;
  nearbyAfter: string;
  greeting: string;
}

/** The samples in the app's words (Arabic as the app writes it). */
const SAMPLES: Record<"en" | "ar" | "tr", LiveWords> = {
  en: {
    shipmentTitle: "S-1001 is on the way",
    shipmentLine: "Karim is bringing it to Road 9, Maadi",
    track: "Track",
    driverWhen: "Arriving in 3 min",
    driverName: "Hany · White sedan",
    driverFacts: "★ 4.9 · TX 4821",
    nearbyBefore: "7 taxis near you · the nearest is ",
    nearbyBold: "1 min",
    nearbyAfter: " away",
    greeting: "Good evening, Omar",
  },
  ar: {
    shipmentTitle: "الشحنة S-1001 في الطريق",
    shipmentLine: "كريم يوصلها إلى الطريق 9، المعادي",
    track: "تتبّع",
    driverWhen: "يصل خلال 3 دقائق",
    driverName: "هاني · سيدان بيضاء",
    driverFacts: "★ 4.9 · TX 4821",
    nearbyBefore: "7 سيارات أجرة بالقرب منك · الأقرب على بُعد ",
    nearbyBold: "دقيقة واحدة",
    nearbyAfter: "",
    greeting: "مساء الخير يا عمر",
  },
  tr: {
    shipmentTitle: "S-1001 yolda",
    shipmentLine: "Karim, Road 9, Maadi adresine getiriyor",
    track: "Takip et",
    driverWhen: "3 dk içinde geliyor",
    driverName: "Hany · Beyaz sedan",
    driverFacts: "★ 4.9 · TX 4821",
    nearbyBefore: "Yakınınızda 7 taksi · en yakını ",
    nearbyBold: "1 dk",
    nearbyAfter: " uzaklıkta",
    greeting: "İyi akşamlar, Omar",
  },
};

export function liveWords(lang: string): LiveWords {
  return SAMPLES[(lang in SAMPLES ? lang : "en") as keyof typeof SAMPLES];
}

/** Two #RRGGBB colours mixed. */
function mix(a: string, b: string, t: number): string {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

const ICON: CSSProperties = { fontVariationSettings: "'FILL' 1", lineHeight: 1 };

/**
 * A `tracking` element: the stages, the button and the icon in the app's
 * main colour (a line's icon in its second colour); its text colour and
 * background are the element's own.
 */
export function TrackingCard({ node, lang, dark, brand, second, color }: { node: StudioNode; lang: string; dark: boolean; brand: string; second: string | null | undefined; color: string | undefined }) {
  const w = liveWords(lang);
  const kind = node.tracking?.kind ?? "shipment";
  const style = node.tracking?.style ?? (kind === "nearby_taxis" ? "line" : kind === "ride" ? "driver" : "card");
  const accent = style === "line" ? (second ?? brand) : brand;
  const ink = color;
  if (style === "line") {
    return (
      <span data-studio-tracking="line" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <span className="material-symbols-rounded" aria-hidden="true" style={{ ...ICON, fontSize: 18, color: accent }}>
          {kind === "shipment" ? "local_shipping" : "local_taxi"}
        </span>
        <span style={{ opacity: 0.75 }}>
          {w.nearbyBefore}
          <b style={{ opacity: 1 }}>{w.nearbyBold}</b>
          {w.nearbyAfter}
        </span>
      </span>
    );
  }
  if (style === "driver") {
    const soft = mix(accent, "#FFFFFF", 0.6);
    return (
      <span data-studio-tracking="driver" style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {node.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- the driver's photo, drawn as the app draws it
          <img src={node.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 18, objectFit: "cover", flex: "none" }} />
        ) : (
          <span className="material-symbols-rounded" aria-hidden="true" style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flex: "none" }}>
            person
          </span>
        )}
        <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: soft, textTransform: "uppercase" }}>{w.driverWhen}</span>
          <span style={{ fontSize: 15, fontWeight: 800 }}>{w.driverName}</span>
          <span dir="ltr" style={{ fontSize: 12, opacity: 0.85, textAlign: "start" }}>
            {w.driverFacts}
          </span>
        </span>
        <span style={{ width: 42, height: 42, borderRadius: 21, background: accent, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <span className="material-symbols-rounded" aria-hidden="true" style={{ ...ICON, fontSize: 22 }}>
            call
          </span>
        </span>
      </span>
    );
  }
  const line = dark ? "#22324A" : "#DEE5EE";
  return (
    <span data-studio-tracking="card" style={{ display: "flex", flexDirection: "column", gap: 10, color: ink }}>
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="material-symbols-rounded" aria-hidden="true" style={{ ...ICON, fontSize: 22, color: accent }}>
          {kind === "ride" ? "local_taxi" : "local_shipping"}
        </span>
        <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 14, fontWeight: 800 }}>{w.shipmentTitle}</span>
          <span style={{ fontSize: 12, opacity: 0.72 }}>{w.shipmentLine}</span>
        </span>
        <span style={{ height: 30, padding: "0 12px", borderRadius: 15, background: accent, color: "#FFFFFF", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center" }}>{w.track}</span>
      </span>
      <span aria-hidden="true" style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ flex: "1 1 0", height: 5, borderRadius: 3, background: i < 3 ? accent : line }} />
        ))}
      </span>
    </span>
  );
}

/** A `greeting`: good morning or good evening with the person's first name (a sample here). */
export function GreetingText({ lang, sample }: { lang: string; sample?: string | null }) {
  return <span data-studio-greeting="">{sample ?? liveWords(lang).greeting}</span>;
}
