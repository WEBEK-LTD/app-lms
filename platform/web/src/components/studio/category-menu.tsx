import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { StudioNode } from "@/lib/pages/types";
import { APP_WORDS, type AppWordsLang } from "@/lib/studio/app-words";
import { CLOTHES_SIZE_CHART } from "@/lib/demo/clothes";

/**
 * 206 Studio's canvas for the clothes type's two new elements, drawn as the
 * app draws them (mobile/lib/modules/shared/pages/studio_category_menu.dart,
 * studio_size_chart.dart): the category menu (`categories` as `rows`), every
 * main category of the shop a row of cards that slides, its own card first
 * ("All"), its sub-categories after it; and the shop's size chart. Without
 * the shop's own, the canvas shows samples, quieter.
 */

type CanvasCategory = { id: string; name: string; parent_id?: string; image_url?: string };

const SHADES = { day: ["#EEEAE3", "#E6E1D8", "#E8EEF6", "#F6E3E7"], night: ["#23221F", "#2B2A26", "#22283A", "#33242A"] };

const allWord = (lang: string) => APP_WORDS[(lang in APP_WORDS ? lang : "en") as AppWordsLang].categoryAll;

/** The rows the menu shows: each main category with its sub-categories; samples without the shop's. */
export function categoryRows(categories: readonly CanvasCategory[]): { main: CanvasCategory; subs: CanvasCategory[] }[] {
  const mains = categories.filter((c) => !c.parent_id || !categories.some((x) => x.id === c.parent_id));
  return mains.map((main) => ({ main, subs: categories.filter((c) => c.parent_id === main.id) }));
}

export function CategoryMenuCanvas({ node, pickable, dark, lang, color }: { node: StudioNode; pickable: Pickable; dark: boolean; lang: string; color?: string }) {
  const own = (node.source ? pickable.categories[node.source] : undefined) ?? [];
  const sample = own.length === 0;
  const rows = sample ? [1, 2, 3].map((i) => ({ main: { id: `s${i}`, name: `[${i}]` }, subs: [1, 2, 3].map((j) => ({ id: `s${i}${j}`, name: `[${i}.${j}]` })) })) : categoryRows(own);
  const look = node.category_menu?.look ?? "lead";
  const numbers = node.category_menu?.numbers !== false;
  const radius = node.category_menu?.radius ?? 18;
  const shades = dark ? SHADES.night : SHADES.day;
  const ink = color ?? (dark ? "#F3F0EA" : "#121212");
  const photo = (c: CanvasCategory, i: number) => (c.image_url ? { backgroundImage: `url("${c.image_url}")`, backgroundSize: "cover", backgroundPosition: "center" } : { background: shades[i % shades.length] });
  const all = allWord(lang);
  return (
    <span data-studio-categories="rows" data-category-menu={look} style={{ display: "flex", flexDirection: "column", gap: 18, opacity: sample ? 0.6 : 1 }}>
      {rows.map(({ main, subs }, r) => {
        const no = String(r + 1).padStart(2, "0");
        return (
          <span key={main.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {look === "label" ? (
              <span style={{ display: "flex", alignItems: "baseline", gap: 8, paddingInline: 16, color: ink }}>
                {numbers ? <span style={{ fontSize: 12, fontWeight: 800, opacity: 0.6 }}>{no}</span> : null}
                <span style={{ fontSize: 17, fontWeight: 800 }}>{main.name}</span>
              </span>
            ) : null}
            <span style={{ display: "flex", gap: 10, overflow: "hidden", paddingInline: 16 }}>
              <span style={{ position: "relative", flex: "0 0 auto", width: look === "lead" ? 136 : 118, height: look === "lead" ? 172 : 118, borderRadius: radius, overflow: "hidden", ...photo(main, r) }}>
                <span style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 35%, rgba(0,0,0,0.65))" }} />
                {look === "lead" && numbers ? <span style={{ position: "absolute", top: 8, insetInlineEnd: 10, color: "#FFFFFF", fontSize: 11, fontWeight: 700 }}>{no}</span> : null}
                {look === "label" ? <span style={{ position: "absolute", top: 8, insetInlineEnd: 8, background: "#2B3FF0", color: "#FFFFFF", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 6 }}>{all}</span> : null}
                <span style={{ position: "absolute", insetInline: 10, bottom: 10, color: "#FFFFFF", fontSize: look === "lead" ? 16 : 13, fontWeight: 800, lineHeight: 1.15 }}>{look === "lead" ? main.name : `${all} · ${main.name}`}</span>
              </span>
              {subs.map((s, i) =>
                look === "lead" ? (
                  <span key={s.id} style={{ display: "flex", flexDirection: "column", gap: 6, flex: "0 0 auto", width: 104 }}>
                    <span style={{ width: 104, height: 134, borderRadius: radius - 4, ...photo(s, i + 1) }} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: ink, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span>
                  </span>
                ) : (
                  <span key={s.id} style={{ position: "relative", flex: "0 0 auto", width: 118, height: 118, borderRadius: radius, overflow: "hidden", ...photo(s, i + 1) }}>
                    <span style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 45%, rgba(0,0,0,0.6))" }} />
                    <span style={{ position: "absolute", insetInline: 8, bottom: 8, color: "#FFFFFF", fontSize: 12.5, fontWeight: 700 }}>{s.name}</span>
                  </span>
                ),
              )}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/** The shop's size chart as a table: its titles, then a row per size, the size in bold. */
export function SizeChartCanvas({ node, pickable, dark, title, color }: { node: StudioNode; pickable: Pickable; dark: boolean; title: string | null; color?: string }) {
  const own = pickable.commerce?.sizeChart ?? null;
  const chart = own ?? CLOTHES_SIZE_CHART;
  const ink = color ?? (dark ? "#F3F0EA" : "#121212");
  const line = dark ? "#2E2C28" : "#E4DFD6";
  void node;
  return (
    <span data-studio-size-chart={own ? "shop" : "sample"} style={{ display: "flex", flexDirection: "column", gap: 10, color: ink, opacity: own ? 1 : 0.6 }}>
      {title ? (
        <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontWeight: 800, fontSize: 15 }}>
          {title}
          <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.6 }}>{chart.unit}</span>
        </span>
      ) : null}
      <span style={{ display: "grid", gridTemplateColumns: `repeat(${chart.headers.length}, minmax(0, 1fr))`, fontSize: 12.5, textAlign: "center" }}>
        {chart.headers.map((h, i) => (
          <span key={`h${i}`} style={{ padding: "6px 2px", fontWeight: 700, opacity: 0.7, borderBottom: `1px solid ${line}` }}>
            {h}
          </span>
        ))}
        {chart.rows.flatMap((row, r) =>
          row.map((cell, i) => (
            <span key={`${r}-${i}`} style={{ padding: "7px 2px", fontWeight: i === 0 ? 800 : 500, borderBottom: r === chart.rows.length - 1 ? undefined : `1px solid ${line}` }}>
              {cell}
            </span>
          )),
        )}
      </span>
    </span>
  );
}
