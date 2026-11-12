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
};

const GOLD = "#B8893A";
const GOLD_LIGHT = "#E7C982";

export function LearningCard({ node, dark, color, words, title }: { node: StudioNode; dark: boolean; color: string | null; words: LearningWords; title: string | null }) {
  const section = node.learning?.section ?? "continue";
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
