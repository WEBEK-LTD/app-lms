import type { CSSProperties } from "react";
import type { StudioNode } from "@/lib/pages/types";

/**
 * 128 A `school` element in the editor's phone, as the app draws it for a
 * parent (lib/pages/types.ts `StudioSchool`): a sample family, since the
 * editor has no signed-in parent. The app draws the parent's own children,
 * their check-in at the gate, their class now and next and the bus home.
 */

export interface SchoolWords {
  /** Today's date, as the greeting shows it. */
  date: string;
  hello: string;
  childOne: string;
  childTwo: string;
  checkedIn: string;
  onTime: string;
  now: string;
  next: string;
  bus: string;
  busRoute: string;
}

export const SCHOOL_WORDS_EN: SchoolWords = {
  date: "Thursday, 13 November",
  hello: "Good morning, Lina's family",
  childOne: "Lina · 5A",
  childTwo: "Adam · 2B",
  checkedIn: "Lina checked in at 07:42",
  onTime: "On time · the gate",
  now: "Now · Maths with Ms. Mona",
  next: "Next: Arabic at 08:50",
  bus: "Bus home leaves 14:20",
  busRoute: "Route 1 · Road 9 stop",
};

/** The approved card's colours by day and by night. */
const DAY = { surface: "#FFFFFF", line: "#DFE5EC", ink2: "#56657A", soft: "#E3ECF6", ok: "#1F7A4D", okBg: "#E3F2E9", warn: "#8A5300", warnBg: "#FBEBD0", gold: "#F2B544" };
const NIGHT = { surface: "#122033", line: "#22334A", ink2: "#A6B3C3", soft: "#1B2D45", ok: "#74D6A0", okBg: "#12392A", warn: "#F4B860", warnBg: "#3E2D0F", gold: "#F2B544" };

function initials(label: string): string {
  const name = label.split("·")[0]!.trim();
  return name.slice(0, 1).toUpperCase() + "H";
}

export function SchoolCard({ node, dark, brand, color, words, title }: { node: StudioNode; dark: boolean; brand: string; color: string | null; words: SchoolWords; title: string | null }) {
  const c = dark ? NIGHT : DAY;
  const section = node.school?.section ?? "today";
  if (section === "greeting") {
    return (
      <div style={{ color: color ?? "#FFFFFF" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F2D58A" }}>{words.date}</div>
        <div style={{ fontSize: 28, lineHeight: 1.08, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 4 }}>{words.hello}</div>
      </div>
    );
  }
  if (section === "children") {
    const chip = (on: boolean): CSSProperties => ({
      height: 44,
      padding: "0 14px 0 6px",
      borderRadius: 22,
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 14,
      fontWeight: on ? 800 : 700,
      background: on ? brand : c.surface,
      color: on ? "#FFFFFF" : (color ?? undefined),
      border: on ? undefined : `1px solid ${c.line}`,
      whiteSpace: "nowrap",
    });
    const face = (on: boolean): CSSProperties => ({ width: 32, height: 32, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, background: on ? c.gold : c.soft, color: on ? brand : undefined });
    return (
      <div style={{ display: "flex", gap: 8 }}>
        {[words.childOne, words.childTwo].map((label, i) => (
          <span key={label} style={chip(i === 0)}>
            <span style={face(i === 0)}>{initials(label)}</span>
            {label}
          </span>
        ))}
      </div>
    );
  }
  const row = (icon: string, tile: { bg: string; fg: string }, fill: boolean, line1: string, line2: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 36, height: 36, borderRadius: 12, background: tile.bg, color: tile.fg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 22, fontVariationSettings: fill ? "'FILL' 1" : undefined }}>
          {icon}
        </span>
      </span>
      <div style={{ flexGrow: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>{line1}</div>
        <div style={{ fontSize: 12, color: c.ink2 }}>{line2}</div>
      </div>
    </div>
  );
  const rule = <div style={{ height: 1, background: c.line }} />;
  return (
    <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10, color: color ?? undefined }}>
      {title ? <div style={{ fontSize: 12, fontWeight: 700, color: c.ink2 }}>{title}</div> : null}
      {row("how_to_reg", { bg: c.okBg, fg: c.ok }, true, words.checkedIn, words.onTime)}
      {rule}
      {row("menu_book", { bg: c.soft, fg: dark ? "#9CC3EA" : brand }, false, words.now, words.next)}
      {rule}
      {row("directions_bus", { bg: c.warnBg, fg: c.warn }, false, words.bus, words.busRoute)}
    </div>
  );
}
