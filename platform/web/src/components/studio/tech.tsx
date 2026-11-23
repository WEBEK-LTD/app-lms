import type { Pickable, PickableEntry } from "@/lib/hosted/pages/pickable";
import type { StudioNode } from "@/lib/pages/types";
import { APP_WORDS, type AppWordsLang } from "@/lib/studio/app-words";
import { isSpecKey, specLabel, type SpecKey } from "@/lib/selling/specs";

/**
 * 211 Studio's canvas for the electronics shops' elements, drawn as the app
 * draws them (mobile/lib/modules/shared/pages/studio_tech.dart): a
 * product's specs as a table, two or three products compared, a spec's
 * values as chips, the trade-in estimator and Build your PC. With the
 * shop's own products (and their specs) they show them; without, samples,
 * quieter, as the size chart does.
 */

type Spec = { key: string | null; label: string; value: string };
type Product = { id: string; title: string; imageUrl: string | null; price: string | null; specs: Spec[] };

const words = (lang: string) => APP_WORDS[(lang in APP_WORDS ? lang : "en") as AppWordsLang];

/** Samples, in the canvas's language: a phone and two others like it. */
function samples(lang: string): Product[] {
  const s = (key: SpecKey, value: string): Spec => ({ key, label: specLabel({ key, label: key }, lang), value });
  return [
    { id: "s1", title: "[1]", imageUrl: null, price: null, specs: [s("screen", '6.7" OLED · 120 Hz'), s("cpu", "8 cores · 3 nm"), s("ram", "12 GB"), s("storage", "256 GB"), s("camera", "50 MP × 3"), s("battery", "5,000 mAh")] },
    { id: "s2", title: "[2]", imageUrl: null, price: null, specs: [s("screen", '6.3" OLED · 120 Hz'), s("cpu", "8 cores · 4 nm"), s("ram", "8 GB"), s("storage", "128 GB"), s("camera", "48 MP × 2"), s("battery", "4,400 mAh")] },
    { id: "s3", title: "[3]", imageUrl: null, price: null, specs: [s("screen", '6.6" LCD · 90 Hz'), s("cpu", "6 cores"), s("ram", "8 GB"), s("storage", "128 GB"), s("camera", "64 MP"), s("battery", "4,800 mAh")] },
  ];
}

/** The shop's products with specs the element would show: those picked, else the first with specs. */
function shopProducts(node: StudioNode, pickable: Pickable, count: number): Product[] {
  const all = (pickable.items.products ?? []).filter((e): e is PickableEntry & { specs: Spec[] } => Array.isArray(e.specs) && e.specs.length > 0);
  const ids = node.tech?.ids ?? [];
  const picked = ids.map((id) => all.find((e) => e.id === id)).filter((e): e is PickableEntry & { specs: Spec[] } => Boolean(e));
  const chosen = (picked.length ? picked : all).slice(0, count);
  return chosen.map((e) => ({ id: e.id, title: e.title, imageUrl: e.imageUrl ?? null, price: e.price ?? null, specs: e.specs }));
}

const palette = (dark: boolean, color?: string) => ({
  ink: dark ? "#F1F2F4" : "#111317",
  muted: dark ? "#A8ADB6" : "#5D636E",
  line: dark ? "#2B2F36" : "#E3E6EB",
  tint: dark ? "#1B1E23" : "#F2F4F7",
  accent: color ?? (dark ? "#7EA2FF" : "#2450E6"),
});

function Photo({ url, size, dark }: { url: string | null; size: number; dark: boolean }) {
  return <span style={{ width: size, height: size, borderRadius: 14, flex: "none", background: url ? `center / cover no-repeat url("${url}")` : dark ? "#23262C" : "#E9ECF1" }} />;
}

export function SpecTableCanvas({ node, pickable, dark, lang, title, color }: { node: StudioNode; pickable: Pickable; dark: boolean; lang: string; title: string | null; color?: string }) {
  const [own] = shopProducts(node, pickable, 1);
  const product = own ?? samples(lang)[0]!;
  const p = palette(dark, undefined);
  const rows = product.specs.slice(0, node.tech?.rows ?? product.specs.length);
  return (
    <span data-studio-tech="spec_table" style={{ display: "flex", flexDirection: "column", gap: 6, color: color ?? p.ink, opacity: own ? 1 : 0.6 }}>
      <span style={{ fontWeight: 800, fontSize: 15 }}>{title || words(lang).techSpecs}</span>
      {rows.map((r, i) => (
        <span key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "8px 0", borderTop: i ? `1px solid ${p.line}` : undefined, fontSize: 13 }}>
          <span style={{ color: p.muted }}>{r.label}</span>
          <span style={{ fontWeight: 700, textAlign: "end" }}>{r.value}</span>
        </span>
      ))}
    </span>
  );
}

export function CompareCanvas({ node, pickable, dark, lang, title, color }: { node: StudioNode; pickable: Pickable; dark: boolean; lang: string; title: string | null; color?: string }) {
  const count = Math.min(Math.max(node.tech?.ids?.length ?? 2, 2), 3);
  const own = shopProducts(node, pickable, count);
  const products = own.length >= 2 ? own : samples(lang).slice(0, count);
  const p = palette(dark, node.tech?.accent ?? color);
  const labels: { key: string; label: string }[] = [];
  for (const prod of products) for (const s of prod.specs) if (!labels.some((l) => l.key === (s.key ?? s.label))) labels.push({ key: s.key ?? s.label, label: s.label });
  const shared = labels.filter((l) => products.every((x) => x.specs.some((s) => (s.key ?? s.label) === l.key)));
  const rows = [...shared, ...labels.filter((l) => !shared.includes(l))].slice(0, 8);
  const grid = `minmax(0, 0.9fr) repeat(${products.length}, minmax(0, 1fr))`;
  return (
    <span data-studio-tech="compare" style={{ display: "flex", flexDirection: "column", gap: 8, color: p.ink, opacity: own.length >= 2 ? 1 : 0.6 }}>
      <span style={{ fontWeight: 800, fontSize: 15 }}>{title || words(lang).techCompareTitle}</span>
      <span style={{ display: "grid", gridTemplateColumns: grid, gap: 6, alignItems: "end" }}>
        <span />
        {products.map((prod, i) => (
          <span key={prod.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: 6, borderRadius: 14, background: i === 0 ? p.tint : undefined }}>
            <Photo url={prod.imageUrl} size={48} dark={dark} />
            <span style={{ fontSize: 12, fontWeight: 700, textAlign: "center", lineHeight: 1.25 }}>{prod.title}</span>
            {prod.price ? <span style={{ fontSize: 11.5, fontWeight: 800, color: p.accent }}>{prod.price}</span> : null}
          </span>
        ))}
        {rows.flatMap((row, r) => [
          <span key={`l${r}`} style={{ fontSize: 11.5, color: p.muted, padding: "7px 0", borderTop: `1px solid ${p.line}` }}>
            {row.label}
          </span>,
          ...products.map((prod, i) => (
            <span key={`${r}-${i}`} style={{ fontSize: 12, fontWeight: 600, textAlign: "center", padding: "7px 2px", borderTop: `1px solid ${p.line}`, background: i === 0 ? p.tint : undefined }}>
              {prod.specs.find((s) => (s.key ?? s.label) === row.key)?.value ?? "—"}
            </span>
          )),
        ])}
      </span>
    </span>
  );
}

export function SpecFilterCanvas({ node, pickable, dark, lang, title, color }: { node: StudioNode; pickable: Pickable; dark: boolean; lang: string; title: string | null; color?: string }) {
  const key = isSpecKey(node.tech?.spec) ? node.tech.spec : "ram";
  const counts = new Map<string, number>();
  for (const e of pickable.items.products ?? []) {
    const v = e.specs?.find((s) => s.key === key)?.value;
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const own = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const values = own.length ? own : ["[1]", "[2]", "[3]", "[4]"].map((v) => [v, 0] as [string, number]);
  const p = palette(dark, node.tech?.accent ?? color);
  const label = specLabel({ key, label: key }, lang);
  return (
    <span data-studio-tech="spec_filter" style={{ display: "flex", flexDirection: "column", gap: 8, color: p.ink, opacity: own.length ? 1 : 0.6 }}>
      <span style={{ fontWeight: 800, fontSize: 14 }}>{title || words(lang).techFilterBy.replace("{spec}", label)}</span>
      <span style={{ display: "flex", gap: 8, overflow: "hidden" }}>
        {values.map(([v, n], i) => (
          <span key={v} style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", borderRadius: 17, fontSize: 13, fontWeight: 700, border: `1px solid ${i === 0 ? p.accent : p.line}`, color: i === 0 ? p.accent : p.ink }}>
            {v}
            {n ? <span style={{ fontSize: 11, color: p.muted, fontWeight: 600 }}>{n}</span> : null}
          </span>
        ))}
      </span>
    </span>
  );
}

export function TradeInCanvas({ node, pickable, dark, lang, title, color }: { node: StudioNode; pickable: Pickable; dark: boolean; lang: string; title: string | null; color?: string }) {
  const w = words(lang);
  const p = palette(dark, node.tech?.accent ?? color);
  const own = pickable.commerce?.tradeIn ?? null;
  const model = own?.models[0];
  const full = node.tech?.look === "full";
  const icon = (name: string) => <span className="material-symbols-rounded" style={{ fontSize: 22 }}>{name}</span>;
  if (!full) {
    return (
      <span data-studio-tech="trade_in" style={{ display: "flex", gap: 12, alignItems: "center", color: p.ink, opacity: own ? 1 : 0.6 }}>
        <span style={{ width: 46, height: 46, borderRadius: 23, display: "grid", placeItems: "center", background: p.tint, color: p.accent, flex: "none" }}>{icon("currency_exchange")}</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>{title || w.techTradeTitle}</span>
          <span style={{ fontSize: 12.5, color: p.muted }}>{w.techTradeLine}</span>
        </span>
        <span style={{ height: 36, padding: "0 14px", borderRadius: 18, background: p.accent, color: "#FFFFFF", display: "inline-flex", alignItems: "center", fontSize: 12.5, fontWeight: 700, flex: "none" }}>{w.techTradeButton}</span>
      </span>
    );
  }
  const chip = (text: string, on: boolean) => (
    <span key={text} style={{ height: 34, padding: "0 12px", borderRadius: 17, display: "inline-flex", alignItems: "center", fontSize: 12.5, fontWeight: 700, background: on ? p.ink : "transparent", color: on ? (dark ? "#111317" : "#FFFFFF") : p.ink, border: `1px solid ${on ? p.ink : p.line}` }}>
      {text}
    </span>
  );
  return (
    <span data-studio-tech="trade_in" style={{ display: "flex", flexDirection: "column", gap: 10, color: p.ink, opacity: own ? 1 : 0.6 }}>
      <span style={{ fontWeight: 800, fontSize: 16 }}>{title || w.techTradeTitle}</span>
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 14, background: p.tint, fontSize: 13 }}>
        <span style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 11, color: p.muted }}>{w.techTradeDevice}</span>
          <span style={{ fontWeight: 700 }}>{model ? `${model.name} · ${model.storages[0]?.label ?? ""}` : "[1]"}</span>
        </span>
        {icon("expand_more")}
      </span>
      <span style={{ fontSize: 12, color: p.muted, fontWeight: 600 }}>{w.techTradeCondition}</span>
      <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{[w.techGradeLikeNew, w.techGradeGood, w.techGradeFair, w.techGradeBroken].map((g, i) => chip(g, i === 1))}</span>
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: `1px solid ${p.line}` }}>
        <span style={{ fontWeight: 800, fontSize: 19 }}>{w.techTradeUpTo.replace("{amount}", own && model ? `${Math.floor(((model.storages[0]?.cents ?? 0) * (own.grades.good ?? 85)) / 10000)}` : "[…]")}</span>
        <span style={{ height: 40, padding: "0 16px", borderRadius: 20, background: p.accent, color: "#FFFFFF", display: "inline-flex", alignItems: "center", fontSize: 13, fontWeight: 700 }}>{w.techTradeStart}</span>
      </span>
    </span>
  );
}

const PART_ICONS: Record<string, string> = { cpu: "memory", board: "developer_board", ram: "memory_alt", gpu: "monitor", storage: "hard_drive", cooler: "mode_fan", psu: "power", case: "deployed_code" };
const PART_WORDS = { cpu: "techPartCpu", board: "techPartBoard", ram: "techPartRam", gpu: "techPartGpu", storage: "techPartStorage", cooler: "techPartCooler", psu: "techPartPsu", case: "techPartCase" } as const;

export function PcBuilderCanvas({ node, pickable, dark, lang, title, color }: { node: StudioNode; pickable: Pickable; dark: boolean; lang: string; title: string | null; color?: string }) {
  const w = words(lang);
  const p = palette(dark, node.tech?.accent ?? color);
  const own = pickable.commerce?.pcBuilder ?? null;
  const parts = (own?.parts ?? ["cpu", "board", "ram", "gpu", "storage"]).slice(0, 6) as (keyof typeof PART_WORDS)[];
  return (
    <span data-studio-tech="pc_builder" style={{ display: "flex", flexDirection: "column", gap: 12, color: p.ink, opacity: own ? 1 : 0.6 }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontWeight: 800, fontSize: 16 }}>{title || w.techBuildTitle}</span>
        <span style={{ fontSize: 12.5, color: p.muted }}>{w.techBuildLine}</span>
      </span>
      <span style={{ display: "flex", justifyContent: "space-between" }}>
        {parts.map((part, i) => (
          <span key={part} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flex: 1 }}>
            <span className="material-symbols-rounded" style={{ width: 38, height: 38, borderRadius: 19, display: "grid", placeItems: "center", fontSize: 20, background: i < 2 ? p.accent : p.tint, color: i < 2 ? "#FFFFFF" : p.muted }}>
              {i < 2 ? "check" : PART_ICONS[part]}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: 600, textAlign: "center" }}>{w[PART_WORDS[part]]}</span>
          </span>
        ))}
      </span>
      <span style={{ height: 44, borderRadius: 22, background: p.accent, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13.5, fontWeight: 700 }}>{w.techBuildStart}</span>
    </span>
  );
}
