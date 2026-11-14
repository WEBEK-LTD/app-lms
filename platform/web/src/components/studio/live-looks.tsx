import type { CSSProperties } from "react";
import type { StudioLiveLook, StudioNode } from "@/lib/pages/types";

/**
 * 130 The live cards' premium looks in the editor's phone (`live_status`
 * and `tracking` with a `style` of STUDIO_LIVE_LOOKS), as the app draws
 * them (mobile/lib/modules/shared/pages/studio_live_looks.dart) with a
 * sample, since the editor has no signed-in person: a hero number of
 * minutes beside the state, a photo in a progress ring, a slim pill with a
 * Track button, or named stages on a line. In the app each is the person's
 * own order, shipment or ride, and shows nothing when there is none.
 */

/** What a live card says, whatever it follows. */
export interface LiveLookFacts {
  /** The reference, as a chip before the state (a shipment's). */
  tag: string | null;
  /** "On its way". */
  state: string;
  /** The dish, the parcel's way, the driver. */
  title: string;
  /** Where it comes from. */
  line: string;
  /** The pill's words: what is on its way, and who brings it. */
  pillTitle: string;
  pillLine: string;
  minutes: number | null;
  /** Of 4. */
  stage: number;
  stages: [string, string, string, string];
}

interface LookWords {
  min: string;
  minAway: string;
  live: string;
  track: string;
  /** "step {n} of 4". */
  step: string;
}

type Lang = "en" | "ar" | "tr";
type Kind = "food_order" | "market_order" | "shipment" | "ride";

/** The samples in the app's words (Arabic as the app writes it). */
const WORDS: Record<Lang, LookWords> = {
  en: { min: "min", minAway: "min away", live: "Live", track: "Track", step: "step {n} of 4" },
  ar: { min: "د", minAway: "دقيقة متبقية", live: "مباشر", track: "تتبّع", step: "المرحلة {n} من 4" },
  tr: { min: "dk", minAway: "dk kaldı", live: "Canlı", track: "Takip et", step: "4 adımdan {n}." },
};

const SAMPLES: Record<Lang, Record<Kind, LiveLookFacts>> = {
  en: {
    food_order: { tag: null, state: "On its way", title: "Kofta wrap", line: "Sahara Grill", pillTitle: "Sahara Grill is on the way", pillLine: "Karim · 1 item", minutes: 12, stage: 3, stages: ["Placed", "Cooking", "On its way", "Delivered"] },
    market_order: { tag: null, state: "On its way", title: "2 pizzas", line: "Nile Pizza Co.", pillTitle: "Nile Pizza Co. is on the way", pillLine: "Karim Adel · 2 items", minutes: 18, stage: 3, stages: ["Placed", "Packing", "On its way", "Delivered"] },
    shipment: { tag: "S-1001", state: "On the way", title: "Karim is heading to Maadi", line: "Road 9, Maadi", pillTitle: "S-1001 is on the way", pillLine: "Karim · Road 9, Maadi", minutes: 6, stage: 3, stages: ["Placed", "Picked up", "On the way", "Delivered"] },
    ride: { tag: null, state: "Arriving", title: "Hany · White sedan", line: "TX 4821", pillTitle: "Hany is on the way", pillLine: "White sedan · TX 4821", minutes: 3, stage: 2, stages: ["Finding", "Coming", "Here", "On board"] },
  },
  ar: {
    food_order: { tag: null, state: "في الطريق", title: "راب كفتة", line: "صحارى جريل", pillTitle: "طلب صحارى جريل في الطريق", pillLine: "كريم · صنف واحد", minutes: 12, stage: 3, stages: ["تم الطلب", "قيد التحضير", "في الطريق", "تم التوصيل"] },
    market_order: { tag: null, state: "في الطريق", title: "بيتزا عدد 2", line: "نايل بيتزا", pillTitle: "طلب نايل بيتزا في الطريق", pillLine: "كريم عادل · صنفان", minutes: 18, stage: 3, stages: ["تم الطلب", "قيد التجهيز", "في الطريق", "تم التوصيل"] },
    shipment: { tag: "S-1001", state: "في الطريق", title: "كريم في طريقه إلى المعادي", line: "الطريق 9، المعادي", pillTitle: "الشحنة S-1001 في الطريق", pillLine: "كريم · الطريق 9، المعادي", minutes: 6, stage: 3, stages: ["تم الطلب", "تم الاستلام", "في الطريق", "تم التسليم"] },
    ride: { tag: null, state: "يصل قريبًا", title: "هاني · سيدان بيضاء", line: "TX 4821", pillTitle: "هاني في الطريق إليك", pillLine: "سيدان بيضاء · TX 4821", minutes: 3, stage: 2, stages: ["البحث", "في الطريق", "وصل", "في الرحلة"] },
  },
  tr: {
    food_order: { tag: null, state: "Yolda", title: "Köfte dürüm", line: "Sahara Grill", pillTitle: "Sahara Grill siparişi yolda", pillLine: "Karim · 1 ürün", minutes: 12, stage: 3, stages: ["Alındı", "Hazırlanıyor", "Yolda", "Teslim edildi"] },
    market_order: { tag: null, state: "Yolda", title: "2 pizza", line: "Nile Pizza Co.", pillTitle: "Nile Pizza Co. siparişi yolda", pillLine: "Karim Adel · 2 ürün", minutes: 18, stage: 3, stages: ["Alındı", "Hazırlanıyor", "Yolda", "Teslim edildi"] },
    shipment: { tag: "S-1001", state: "Yolda", title: "Karim Maadi'ye gidiyor", line: "Road 9, Maadi", pillTitle: "S-1001 yolda", pillLine: "Karim · Road 9, Maadi", minutes: 6, stage: 3, stages: ["Alındı", "Teslim alındı", "Yolda", "Teslim edildi"] },
    ride: { tag: null, state: "Geliyor", title: "Hany · Beyaz sedan", line: "TX 4821", pillTitle: "Hany yolda", pillLine: "Beyaz sedan · TX 4821", minutes: 3, stage: 2, stages: ["Aranıyor", "Geliyor", "Geldi", "Yolculukta"] },
  },
};

const langOf = (lang: string): Lang => (lang === "ar" || lang === "tr" ? lang : "en");

/** The sample of `kind` in `lang`. */
export function liveLookSample(kind: Kind, lang: string): LiveLookFacts {
  return SAMPLES[langOf(lang)][kind];
}

/** The premium look a live element is drawn in, or null for its own card. */
export function liveLookOf(node: Pick<StudioNode, "type" | "live_status" | "tracking">): StudioLiveLook | null {
  const style = node.type === "live_status" ? node.live_status?.style : node.type === "tracking" && node.tracking?.kind !== "nearby_taxis" ? node.tracking?.style : undefined;
  return style === "hero" || style === "ring" || style === "pill" || style === "steps" ? style : null;
}

const ICON: CSSProperties = { fontFamily: "'Material Symbols Rounded'", fontVariationSettings: "'FILL' 1", lineHeight: 1 };
const BIG: CSSProperties = { fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 0.9 };

/** A #RRGGBB colour at `alpha`. */
function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** A live card in one of its premium looks. */
export function LiveLookCard({ node, lang, dark, brand, color }: { node: StudioNode; lang: string; dark: boolean; brand: string; color: string | null | undefined }) {
  const look = liveLookOf(node) ?? "hero";
  const kind: Kind = node.type === "live_status" ? (node.live_status?.source ?? "food_order") : node.tracking?.kind === "ride" ? "ride" : "shipment";
  const f = liveLookSample(kind, lang);
  const w = WORDS[langOf(lang)];
  const set = node.type === "live_status" ? node.live_status : node.tracking;
  const accent = (dark ? (set?.dark_accent ?? set?.accent) : set?.accent) ?? brand;
  const ink = color ?? (dark ? "#FFFFFF" : "#141414");
  const soft = alpha(ink.length === 7 ? ink : "#141414", 0.72);
  const track = alpha(ink.length === 7 ? ink : "#141414", 0.16);
  const dot = (
    <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, flex: "none", background: accent, boxShadow: `0 0 0 4px ${alpha(accent, 0.22)}` }} />
  );
  const photo = node.image_url ?? null;
  const tagChip = f.tag ? (
    <span style={{ height: 24, padding: "0 8px", borderRadius: 6, background: track, fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center" }}>{f.tag}</span>
  ) : null;
  const kicker = (word: string) => (
    <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: accent }}>
      {tagChip ?? dot}
      {word}
    </span>
  );
  const minutes =
    f.minutes === null ? null : (
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flex: "none" }}>
        <span style={{ ...BIG, fontSize: 46 }}>{f.minutes}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: soft }}>{look === "ring" ? w.min : w.minAway}</span>
      </span>
    );
  const segments = (
    <span aria-hidden="true" style={{ display: "flex", gap: 4, marginTop: 12 }}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} style={{ flex: "1 1 0", height: 4, borderRadius: 2, background: i < f.stage - 1 ? accent : track, overflow: "hidden" }}>
          {i === f.stage - 1 ? <span style={{ display: "block", width: "70%", height: 4, background: accent }} /> : null}
        </span>
      ))}
    </span>
  );
  const avatar = (size: number) =>
    photo ? (
      // eslint-disable-next-line @next/next/no-img-element -- the element's photo, drawn as the app draws it
      <img src={photo} alt="" style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover", flex: "none", boxShadow: `0 0 0 2px ${accent}` }} />
    ) : null;
  if (look === "pill") {
    return (
      <span data-studio-live-look="pill" style={{ display: "flex", alignItems: "center", gap: 12, color: ink }}>
        <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 14, background: alpha(accent, 0.25), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <span style={{ width: 10, height: 10, borderRadius: 5, background: accent }} />
        </span>
        <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.pillTitle}</span>
          <span style={{ fontSize: 12, color: soft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.pillLine}</span>
        </span>
        <span style={{ height: 38, padding: "0 14px", borderRadius: 19, background: "#FFFFFF", color: "#10201A", display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 800, flex: "none" }}>
          <span aria-hidden="true" style={{ ...ICON, fontSize: 18 }}>
            {node.icon ?? (kind === "ride" ? "local_taxi" : "two_wheeler")}
          </span>
          {w.track}
        </span>
      </span>
    );
  }
  if (look === "ring") {
    const share = Math.max(0.08, Math.min(1, (f.stage - 0.3) / 4));
    return (
      <span data-studio-live-look="ring" style={{ display: "flex", alignItems: "center", gap: 14, color: ink }}>
        <span aria-hidden="true" style={{ width: 80, height: 80, borderRadius: 40, flex: "none", background: `conic-gradient(${accent} 0deg ${share * 360}deg, ${track} ${share * 360}deg 360deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- the element's photo, drawn as the app draws it
            <img src={photo} alt="" style={{ width: 70, height: 70, borderRadius: 35, objectFit: "cover" }} />
          ) : (
            <span style={{ width: 70, height: 70, borderRadius: 35, background: alpha(accent, 0.2), display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ ...ICON, fontSize: 30, color: accent }}>{node.icon ?? "two_wheeler"}</span>
            </span>
          )}
        </span>
        <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
          {kicker(`${w.live} · ${f.state}`)}
          <span style={{ fontSize: 17, fontWeight: 800, marginTop: 5 }}>{f.title}</span>
          <span style={{ fontSize: 12, color: soft }}>
            {f.line} · {w.step.replaceAll("{n}", String(f.stage))}
          </span>
        </span>
        {minutes}
      </span>
    );
  }
  const top = (
    <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {look === "steps" ? avatar(46) : null}
      <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column" }}>
        {kicker(f.state)}
        <span style={{ fontSize: 16, fontWeight: 800, marginTop: 6 }}>{f.title}</span>
        {look === "hero" ? <span style={{ fontSize: 13, color: soft, marginTop: 1 }}>{f.line}</span> : null}
      </span>
      {minutes}
      {look === "hero" && node.icon ? (
        <span aria-hidden="true" style={{ width: 44, height: 44, borderRadius: 22, background: accent, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <span style={{ ...ICON, fontSize: 22 }}>{node.icon}</span>
        </span>
      ) : null}
    </span>
  );
  if (look === "steps") {
    return (
      <span data-studio-live-look="steps" style={{ display: "flex", flexDirection: "column", color: ink }}>
        {top}
        <span aria-hidden="true" style={{ position: "relative", display: "flex", marginTop: 14 }}>
          {f.stages.map((name, i) => (
            <span key={name} style={{ flex: "1 1 0", display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
              <span style={{ position: "relative", width: "100%", height: 14, display: "flex", alignItems: "center" }}>
                {i < 3 ? <span style={{ position: "absolute", insetInlineStart: 7, insetInlineEnd: -7, height: 2, background: i < f.stage - 1 ? accent : track }} /> : null}
                <span style={{ position: "relative", width: i === f.stage - 1 ? 14 : 10, height: i === f.stage - 1 ? 14 : 10, borderRadius: 7, background: i < f.stage ? accent : "transparent", border: i < f.stage ? "none" : `2px solid ${track}`, boxShadow: i === f.stage - 1 ? `0 0 0 4px ${alpha(accent, 0.3)}` : "none", boxSizing: "border-box" }} />
              </span>
              <span style={{ fontSize: 12, fontWeight: i === f.stage - 1 ? 800 : 600, color: i === f.stage - 1 ? ink : soft }}>{name}</span>
            </span>
          ))}
        </span>
      </span>
    );
  }
  return (
    <span data-studio-live-look="hero" style={{ display: "flex", flexDirection: "column", color: ink }}>
      {top}
      {segments}
    </span>
  );
}
