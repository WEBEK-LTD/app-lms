import type { CSSProperties } from "react";
import type { StudioNode } from "@/lib/pages/types";

/**
 * 123 A `learning` card in the editor's phone, as the app draws it for a
 * student (lib/pages/types.ts `StudioLearning`): sample learning, since
 * the editor has no student. The app draws the student's own.
 */

export interface LearningWords {
  lessonOf: string;
  minutesLeft: string;
  streak: string;
  days: string;
  live: string;
  liveWhen: string;
  week: string;
  weekChange: string;
  sampleCourse: string;
  sampleTeacher: string;
  sampleLive: string;
  weekdays: string;
  /** 128.8 The photo look's chip, live class time and sample course. */
  photoChip?: string;
  liveAt?: string;
  photoCourse?: string;
  /** 130.18 The ring look's chip, kicker, line and button. */
  ringChip?: string;
  ringKicker?: string;
  ringLine?: string;
  ringResume?: string;
}

export const LEARNING_WORDS_EN: LearningWords = {
  lessonOf: "In progress · lesson 7 of 32",
  minutesLeft: "12 min left",
  streak: "Learning streak",
  days: "days",
  live: "Live class",
  liveWhen: "In 2 h · 19:30",
  week: "This week",
  weekChange: "+24% on last week",
  sampleCourse: "Python programming",
  sampleTeacher: "Khaled Fouad · Lists and dictionaries",
  sampleLive: "Content marketing",
  weekdays: "S,S,M,T,W,T,F",
  photoChip: "Lesson 12 of 18 · 14 min left",
  liveAt: "LIVE AT 19:30",
  photoCourse: "Arabic calligraphy for beginners",
  ringChip: "Lesson 12 of 18",
  ringKicker: "Continue learning",
  ringLine: "14 min left · 61% of the course",
  ringResume: "Resume lesson",
};

/**
 * 130.18 This week's days under a streak (`StudioLearning.days`): round
 * letters or short pills, the sample's first four days learned, today (the
 * fourth) ringed.
 */
function WeekDays({ style, dark, words }: { style: "letters" | "pills"; dark: boolean; words: LearningWords }) {
  const letters = (words.weekdays || LEARNING_WORDS_EN.weekdays).split(",");
  const quiet = dark ? "#2A2C38" : "#EFE6D3";
  const fill = dark ? "#E7C982" : "#C99B4A";
  const ring = dark ? "#E7C982" : "#7A5C14";
  return (
    <div data-studio-learning-days={style} style={{ display: "flex", gap: style === "pills" ? 4 : 3, alignItems: "center", marginTop: 10 }}>
      {letters.slice(0, 7).map((letter, i) => {
        const lit = i < 4;
        const today = i === 3;
        const border = today ? `1.6px solid ${ring}` : lit ? "none" : `1px solid ${quiet}`;
        return style === "pills" ? (
          <span key={i} style={{ width: today ? 18 : 12, height: today ? 22 : 18, borderRadius: 5, background: lit ? fill : quiet, border: today ? border : "none", boxSizing: "border-box" }} />
        ) : (
          <span key={i} style={{ width: today ? 22 : 18, height: today ? 22 : 18, borderRadius: 11, background: lit ? fill : "transparent", border, boxSizing: "border-box", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", color: lit ? "#2A1D05" : dark ? "#A9A3B4" : "#625C69" }}>
            {letter}
          </span>
        );
      })}
    </div>
  );
}

/**
 * 130.18 The ring look (`StudioLearning.style` `ring`): the course they are
 * taking as its photo in a gold ring filled to how far they are, its
 * lesson on a chip, the kicker, its name, the minutes and the share left,
 * and the button that opens the lesson.
 */
function RingCard({ dark, color, words, title }: { dark: boolean; color: string | null; words: LearningWords; title: string | null }) {
  const share = 0.61;
  const r = 104;
  const c = 2 * Math.PI * r;
  const gold = dark ? "#E7C982" : "#C99B4A";
  const ticks = Array.from({ length: 48 }, (_, i) => (i / 48) * 2 * Math.PI);
  const end = -Math.PI / 2 + share * 2 * Math.PI;
  return (
    <div data-studio-learning-ring="continue" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "8px 0", color: color ?? (dark ? "#F4F1EA" : "#15131A") }}>
      <div style={{ position: "relative", width: 236, height: 236 }}>
        <svg width={236} height={236} viewBox="0 0 236 236" style={{ position: "absolute", inset: 0 }} aria-hidden="true">
          {ticks.map((a, i) => (
            <line key={i} x1={118 + Math.cos(a) * (r + 8)} y1={118 + Math.sin(a) * (r + 8)} x2={118 + Math.cos(a) * (r + 12)} y2={118 + Math.sin(a) * (r + 12)} stroke={dark ? "#3A3C4A" : "#CDBE9F"} strokeWidth={1.4} strokeLinecap="round" />
          ))}
          <circle cx={118} cy={118} r={r} fill="none" stroke={dark ? "#262833" : "#E9DFCB"} strokeWidth={5} />
          <circle cx={118} cy={118} r={r} fill="none" stroke={gold} strokeWidth={5} strokeLinecap="round" strokeDasharray={`${share * c} ${c}`} transform="rotate(-90 118 118)" />
          <circle cx={118 + Math.cos(end) * r} cy={118 + Math.sin(end) * r} r={9} fill={gold} />
          <circle cx={118 + Math.cos(end) * r} cy={118 + Math.sin(end) * r} r={5} fill={dark ? "#15161D" : "#FFFFFF"} />
        </svg>
        <div style={{ position: "absolute", inset: 24, borderRadius: "50%", overflow: "hidden", background: "#1D2B4F" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SAMPLE_PHOTO} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <span style={{ position: "absolute", left: "50%", bottom: 18, transform: "translateX(-50%)", height: 30, padding: "0 12px", borderRadius: 15, background: "rgba(20,22,38,0.7)", color: "#FFFFFF", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
            <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 16, color: "#E7C982", fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
            {words.ringChip ?? LEARNING_WORDS_EN.ringChip}
          </span>
        </div>
      </div>
      <div style={{ marginTop: 18, fontSize: 12, fontWeight: 800, letterSpacing: 2.4, textTransform: "uppercase", color: dark ? "#E7C982" : "#7A5C14" }}>{words.ringKicker ?? LEARNING_WORDS_EN.ringKicker}</div>
      <div style={{ marginTop: 8, fontSize: 26, lineHeight: 1.12, fontWeight: 700, letterSpacing: -0.6 }}>{title ?? words.photoCourse ?? LEARNING_WORDS_EN.photoCourse}</div>
      <div style={{ marginTop: 8, fontSize: 14, color: dark ? "#A9A3B4" : "#625C69" }}>{words.ringLine ?? LEARNING_WORDS_EN.ringLine}</div>
      <span style={{ marginTop: 16, height: 52, padding: "0 26px", borderRadius: 26, background: dark ? "#E7C982" : "#1D2B4F", color: dark ? "#2A1D05" : "#FFFFFF", fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
        <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>
          play_arrow
        </span>
        {words.ringResume ?? LEARNING_WORDS_EN.ringResume}
      </span>
    </div>
  );
}

/** 128.8 The board's gold for fills, and the sample photo of the course they are taking (the app shows the course's own). */
const GOLD_FILL = "#E6C26E";
const SAMPLE_PHOTO = "/stories/academy/academy-evening.jpg";

/**
 * 128.8 The photo look (`StudioLearning.style` `photo`): the course they
 * are taking over its photo with a dark scrim, the lesson and minutes on
 * one chip, how far they are in gold and a round play button; the live
 * class's time in gold over its name, on the element's own picture; the
 * streak as one figure.
 */
function PhotoCard({ node, dark, color, words, title }: { node: StudioNode; dark: boolean; color: string | null; words: LearningWords; title: string | null }) {
  const section = node.learning?.section ?? "continue";
  const icon = (name: string, style: CSSProperties) => (
    <span className="material-symbols-rounded" aria-hidden="true" style={{ fontVariationSettings: "'FILL' 1", ...style }}>
      {name}
    </span>
  );
  if (section === "continue") {
    const photo = node.image_background_url ? null : SAMPLE_PHOTO;
    return (
      <div data-studio-learning-photo="continue" style={{ position: "relative", height: "100%", minHeight: 236, color: color ?? "#FFFFFF", overflow: "hidden" }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}
        <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(14,18,40,0.15) 0%, rgba(14,18,40,0.92) 100%)" }} />
        <span style={{ position: "absolute", insetInlineStart: 14, top: 14, height: 26, padding: "0 10px", borderRadius: 13, background: "rgba(255,255,255,0.2)", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center" }}>
          {words.photoChip ?? LEARNING_WORDS_EN.photoChip}
        </span>
        <div style={{ position: "absolute", insetInline: 16, bottom: 16 }}>
          <div style={{ fontSize: 22, lineHeight: 1.1, fontWeight: 800 }}>{title ?? words.photoCourse ?? LEARNING_WORDS_EN.photoCourse}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <span style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,0.3)" }}>
              <i style={{ display: "block", width: "61%", height: 5, borderRadius: 3, background: GOLD_FILL }} />
            </span>
            <span style={{ width: 44, height: 44, borderRadius: 22, background: "#FFFFFF", color: "#1D2B4F", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon("play_arrow", { fontSize: 22 })}</span>
          </div>
        </div>
      </div>
    );
  }
  if (section === "live") {
    return (
      <div data-studio-learning-photo="live" style={{ padding: 12, color: color ?? "#FFFFFF" }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: GOLD_FILL, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: GOLD_FILL }} />
          {title ?? words.liveAt ?? LEARNING_WORDS_EN.liveAt}
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>{words.sampleLive}</div>
      </div>
    );
  }
  if (section === "streak") {
    return (
      <div data-studio-learning-photo="streak" style={{ padding: 12, color: color ?? (dark ? "#EEF0F7" : "#141A30") }}>
        <div style={{ fontSize: 12, color: dark ? "#A8AEC4" : "#5A5F73", display: "flex", alignItems: "center", gap: 4 }}>
          {icon("local_fire_department", { fontSize: 16, color: "#E8742F" })}
          {title ?? words.streak}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4 }}>
          12 {words.days}
        </div>
        {node.learning?.days ? <WeekDays style={node.learning.days} dark={dark} words={words} /> : null}
      </div>
    );
  }
  return null;
}

const GOLD = "#B8893A";
const GOLD_LIGHT = "#E7C982";

export function LearningCard({ node, dark, color, words, title }: { node: StudioNode; dark: boolean; color: string | null; words: LearningWords; title: string | null }) {
  const section = node.learning?.section ?? "continue";
  // 130.18 The ring: the course they are taking in a gold ring; its other cards as on a photo.
  if (node.learning?.style === "ring" && section === "continue") return <RingCard dark={dark} color={color} words={words} title={title} />;
  if (node.learning?.style === "photo" || node.learning?.style === "ring") {
    const photo = PhotoCard({ node, dark, color, words, title });
    if (photo) return photo;
  }
  const ink = color ?? (dark ? "#F3F1EC" : "#15131A");
  const mute = dark ? "#9A98A2" : "#6E6A72";
  const line = dark ? "rgba(255,255,255,.08)" : "rgba(21,19,26,.08)";
  const gold = dark ? "#E2BE74" : GOLD;
  const card: CSSProperties = { padding: 14, display: "flex", flexDirection: "column", gap: 6, color: ink, height: "100%" };
  if (section === "continue") {
    const tag: CSSProperties = { fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 8, background: "rgba(255,255,255,.18)" };
    return (
      <div style={{ ...card, color: color ?? "#FFFFFF", minHeight: 190, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={tag}>{words.lessonOf}</span>
          <span style={tag}>{words.minutesLeft}</span>
        </div>
        <div style={{ marginTop: "auto", fontSize: 21, fontWeight: 700, lineHeight: 1.3 }}>{title ?? words.sampleCourse}</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>{words.sampleTeacher}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span style={{ flex: 1, height: 6, borderRadius: 6, background: "rgba(255,255,255,.25)", overflow: "hidden" }}>
            <i style={{ display: "block", width: "46%", height: "100%", background: `linear-gradient(90deg,${GOLD},${GOLD_LIGHT})` }} />
          </span>
          <b style={{ fontSize: 12 }}>46%</b>
          <span className="material-symbols-rounded" aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 21, background: "#FFFFFF", color: "#141A3A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontVariationSettings: "'FILL' 1" }}>
            play_arrow
          </span>
        </div>
      </div>
    );
  }
  if (section === "streak") {
    return (
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: mute }}>
          <span>{title ?? words.streak}</span>
          <span className="material-symbols-rounded" aria-hidden="true" style={{ color: "#FF7A45", fontSize: 20, fontVariationSettings: "'FILL' 1" }}>
            local_fire_department
          </span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 800 }}>
          12 <span style={{ fontSize: 12, color: mute, fontWeight: 500 }}>{words.days}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 1, 1, 1, 0.5, 0, 0].map((v, i) => (
            <span key={i} style={{ flex: 1, height: 20, borderRadius: 6, background: v === 1 ? gold : v ? GOLD_LIGHT : line }} />
          ))}
        </div>
      </div>
    );
  }
  if (section === "live") {
    return (
      <div style={{ ...card, color: color ?? "#2A1D05" }}>
        <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 20, fontVariationSettings: "'FILL' 1", alignSelf: "flex-end" }}>
          videocam
        </span>
        <span style={{ fontSize: 11, opacity: 0.8 }}>{title ?? words.live}</span>
        <span style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.25 }}>{words.sampleLive}</span>
        <span style={{ fontSize: 11, fontWeight: 800 }}>{words.liveWhen}</span>
      </div>
    );
  }
  const bars = [0.55, 0.3, 0.7, 1, 0.45, 0.25, 0.6];
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{title ?? words.week}</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>5 h 20 min</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 8px", borderRadius: 999, background: "rgba(255,255,255,.1)" }}>{words.weekChange}</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 84, marginTop: 6 }}>
        {bars.map((v, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ width: "100%", height: v * 70, borderRadius: 8, background: v === 1 ? `linear-gradient(180deg,${GOLD_LIGHT},${GOLD})` : "rgba(255,255,255,.14)" }} />
            <span style={{ fontSize: 9, opacity: 0.6 }}>{words.weekdays.split(",")[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
