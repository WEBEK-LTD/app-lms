"use client";

import { useState } from "react";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { StudioNode } from "@/lib/pages/types";
import { Icon } from "@/components/icon";
import { entryText } from "./premium-motion";

/**
 * 209 Studio's canvas for the shop types' helpers, as the app draws them
 * (mobile/lib/modules/shared/pages/studio_shop_helpers.dart): the size
 * finder (the ages of the shop's size chart as chips, the size that fits
 * the one chosen with its measures and the button; a sample chart, faded,
 * while the shop has none), the swatches (a row of shades, the one chosen
 * named under them with its line, then the button) and the quiz (its
 * first question with its answers, a step bar and the results' names).
 * The canvas lets the owner tap through them as people will.
 */

const SAMPLE_CHART = {
  headers: ["Age", "Height", "Weight"],
  rows: [
    ["0–3M", "56–62", "4–6"],
    ["6–12M", "68–80", "8–10"],
    ["2–3Y", "92–98", "13–15"],
    ["4–5Y", "104–110", "16–19"],
  ],
  unit: "cm" as const,
};

interface Ink {
  ink: string;
  muted: string;
  line: string;
  fill: string;
  onFill: string;
  surface: string;
}

function inkOf(dark: boolean, brand: string, color?: string): Ink {
  const ink = color ?? (dark ? "#F3F0EA" : "#1E1B18");
  return { ink, muted: dark ? "rgba(243,240,234,0.7)" : "rgba(30,27,24,0.64)", line: dark ? "#34312C" : "#E4DFD6", fill: brand, onFill: "#FFFFFF", surface: dark ? "#1E1D1A" : "#FFFFFF" };
}

function Button({ label, k }: { label: string; k: Ink }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, alignSelf: "flex-start", height: 40, padding: "0 16px", borderRadius: 20, background: k.fill, color: k.onFill, fontWeight: 700, fontSize: 13.5 }}>
      {label}
      <Icon name="arrow_forward" size={18} />
    </span>
  );
}

export function SizeFinderCanvas({ node, pickable, dark, brand, color, title, button }: { node: StudioNode; pickable: Pickable; dark: boolean; brand: string; color?: string; title: string; button: string }) {
  const own = pickable.commerce?.sizeChart ?? null;
  const chart = own ?? SAMPLE_CHART;
  const [at, setAt] = useState(Math.min(2, chart.rows.length - 1));
  const k = inkOf(dark, brand, color);
  const row = chart.rows[at] ?? chart.rows[0]!;
  void node;
  return (
    <span data-studio-size-finder={own ? "shop" : "sample"} style={{ display: "flex", flexDirection: "column", gap: 12, color: k.ink, opacity: own ? 1 : 0.75 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 17 }}>
        <Icon name="straighten" size={20} />
        {title}
      </span>
      <span style={{ display: "flex", gap: 6, overflowX: "auto" }}>
        {chart.rows.map((r, i) => (
          <span key={r[0]} role="button" onClick={() => setAt(i)} style={{ flex: "0 0 auto", padding: "7px 12px", borderRadius: 16, fontSize: 12.5, fontWeight: 700, cursor: "pointer", background: i === at ? k.fill : k.surface, color: i === at ? k.onFill : k.ink, border: `1px solid ${i === at ? k.fill : k.line}` }}>
            {r[0]}
          </span>
        ))}
      </span>
      <span style={{ display: "grid", gridTemplateColumns: `repeat(${chart.headers.length - 1}, minmax(0, 1fr))`, gap: 8 }}>
        {chart.headers.slice(1).map((h, i) => (
          <span key={h} style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 12px", borderRadius: 14, background: k.surface }}>
            <span style={{ fontSize: 11.5, color: k.muted }}>{h}</span>
            <span style={{ fontSize: 16, fontWeight: 800 }}>
              {row[i + 1]} <span style={{ fontSize: 11, fontWeight: 600, color: k.muted }}>{i === 0 ? chart.unit : ""}</span>
            </span>
          </span>
        ))}
      </span>
      {button ? <Button label={`${button} · ${row[0]}`} k={k} /> : null}
    </span>
  );
}

export function SwatchesCanvas({ node, lang, def, dark, brand, color, title, button }: { node: StudioNode; lang: string; def: string; dark: boolean; brand: string; color?: string; title: string; button: string }) {
  const entries = node.entries ?? [];
  const [at, setAt] = useState(Math.max(0, entries.findIndex((e) => e.highlight)));
  const k = inkOf(dark, brand, color);
  const size = node.swatches?.size ?? 36;
  const square = node.swatches?.shape === "square";
  const chosen = entries[at] ?? entries[0];
  return (
    <span data-studio-swatches="" style={{ display: "flex", flexDirection: "column", gap: 12, color: k.ink }}>
      {title ? <span style={{ fontWeight: 800, fontSize: 17 }}>{title}</span> : null}
      <span style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
        {entries.map((e, i) => (
          <span key={i} role="button" onClick={() => setAt(i)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer", flex: "0 0 auto" }}>
            <span style={{ width: size, height: size, borderRadius: square ? 10 : size, background: e.color ?? "#CCCCCC", boxShadow: i === at ? `0 0 0 2px ${dark ? "#1E1D1A" : "#FFFFFF"}, 0 0 0 4px ${k.ink}` : `inset 0 0 0 1px rgba(0,0,0,0.08)` }} />
            <span style={{ fontSize: 11, fontWeight: i === at ? 800 : 500, color: i === at ? k.ink : k.muted }}>{entryText(e, "subtitle", lang, def) || entryText(e, "title", lang, def)}</span>
          </span>
        ))}
      </span>
      {chosen ? (
        <span style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: k.surface }}>
          <span style={{ width: 28, height: 28, borderRadius: 28, background: chosen.color ?? "#CCCCCC", flex: "0 0 auto" }} />
          <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 13.5 }}>{entryText(chosen, "title", lang, def)}</span>
            {entryText(chosen, "text", lang, def) ? <span style={{ fontSize: 12, color: k.muted }}>{entryText(chosen, "text", lang, def)}</span> : null}
          </span>
        </span>
      ) : null}
      {button ? <Button label={button} k={k} /> : null}
    </span>
  );
}

export function QuizCanvas({ node, lang, def, dark, brand, color, title, button }: { node: StudioNode; lang: string; def: string; dark: boolean; brand: string; color?: string; title: string; button: string }) {
  const questions = node.quiz?.questions ?? [];
  const results = node.entries ?? [];
  const [step, setStep] = useState(0);
  const [votes, setVotes] = useState<number[]>([]);
  const k = inkOf(dark, brand, color);
  const done = step >= questions.length && questions.length > 0;
  const winner = (() => {
    const counts = results.map((_, i) => votes.filter((v) => v % Math.max(1, results.length) === i).length);
    return counts.indexOf(Math.max(...counts, 0));
  })();
  const q = questions[step];
  const answers = q ? entryText(q, "text", lang, def).split("\n").map((x) => x.trim()).filter(Boolean) : [];
  const result = results[winner] ?? results[0];
  return (
    <span data-studio-quiz="" style={{ display: "flex", flexDirection: "column", gap: 12, color: k.ink }}>
      {title ? <span style={{ fontWeight: 800, fontSize: 17 }}>{title}</span> : null}
      <span style={{ display: "flex", gap: 4 }}>
        {questions.map((_, i) => (
          <span key={i} style={{ flex: "1 1 0", height: 4, borderRadius: 2, background: i < step || done ? k.fill : k.line }} />
        ))}
      </span>
      {!done && q ? (
        <>
          <span style={{ fontSize: 12, color: k.muted }}>
            {step + 1} / {questions.length}
          </span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{entryText(q, "title", lang, def)}</span>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {answers.map((a, i) => (
              <span
                key={i}
                role="button"
                onClick={() => {
                  setVotes([...votes, i]);
                  setStep(step + 1);
                }}
                style={{ padding: "8px 14px", borderRadius: 18, fontSize: 13, fontWeight: 600, cursor: "pointer", background: k.surface, border: `1px solid ${k.line}` }}
              >
                {a}
              </span>
            ))}
          </span>
        </>
      ) : result ? (
        <>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 24 }}>
              {result.icon ?? "check_circle"}
            </span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>{entryText(result, "title", lang, def)}</span>
          </span>
          {entryText(result, "text", lang, def) ? <span style={{ fontSize: 13, color: k.muted, lineHeight: 1.45 }}>{entryText(result, "text", lang, def)}</span> : null}
          <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Button label={entryText(result, "label", lang, def) || button} k={k} />
            <span
              role="button"
              onClick={() => {
                setVotes([]);
                setStep(0);
              }}
              style={{ cursor: "pointer", display: "inline-flex" }}
            >
              <Icon name="refresh" size={22} />
            </span>
          </span>
        </>
      ) : null}
    </span>
  );
}
