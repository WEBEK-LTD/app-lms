import type { CSSProperties } from "react";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { StudioNode } from "@/lib/pages/types";
import { APP_WORDS, type AppWordsLang } from "@/lib/studio/app-words";
import { CLOTHES_SIZE_CHART } from "@/lib/demo/clothes";

/**
 * 208 Studio's canvas for the clothes type's two new elements, drawn as the
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

/**
 * 210 The `delivery_slots` element as the app draws it
 * (mobile/lib/modules/shared/pages/studio_delivery_slots.dart): the shop's
 * next delivery days as chips (the first open one chosen), then the chosen
 * day's times (a full one struck out), and with `assembly` a line that the
 * team assembles it on the day. Without the shop's days set, samples, quieter.
 */
export function DeliverySlotsCanvas({ node, pickable, dark, lang, color }: { node: StudioNode; pickable: Pickable; dark: boolean; lang: string; color?: string }) {
  const own = pickable.commerce?.deliverySlots ?? null;
  const sample = own === null;
  const shop = own ?? { closedWeekdays: [5], sameDay: false, slots: [{ start: "09:00", end: "12:00", full: false }, { start: "13:00", end: "16:00", full: true }, { start: "17:00", end: "21:00", full: false }] };
  const count = node.delivery_slots?.days ?? 5;
  const ink = color ?? (dark ? "#F3F0EA" : "#1F241C");
  const fill = `color-mix(in srgb, ${ink} 7%, transparent)`;
  const lit = node.border_color ?? ink;
  const locale = lang === "ar" ? "ar-u-nu-latn" : lang;
  const days: Date[] = [];
  const day = new Date();
  day.setHours(12, 0, 0, 0);
  if (!shop.sameDay) day.setDate(day.getDate() + 1);
  for (let i = 0; days.length < count && i < 60; i++, day.setDate(day.getDate() + 1)) if (!shop.closedWeekdays.includes(day.getDay())) days.push(new Date(day));
  const chip = (on: boolean): CSSProperties => ({ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, minWidth: 56, padding: "8px 10px", borderRadius: 14, background: on ? lit : fill, color: on ? (dark ? "#141613" : "#FFFFFF") : ink, border: `1px solid ${on ? lit : "transparent"}` });
  const words = APP_WORDS[(lang in APP_WORDS ? lang : "en") as AppWordsLang];
  return (
    <span data-studio-delivery-slots={sample ? "sample" : "shop"} style={{ display: "flex", flexDirection: "column", gap: 10, color: ink, opacity: sample ? 0.6 : 1 }}>
      <span style={{ display: "flex", gap: 8, overflow: "hidden" }}>
        {days.map((d, i) => (
          <span key={d.toISOString()} style={chip(i === 0)}>
            <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{d.toLocaleDateString(locale, { weekday: "short" })}</span>
            <span style={{ fontSize: 17, fontWeight: 800 }}>{d.getDate()}</span>
          </span>
        ))}
      </span>
      <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {shop.slots.map((s, i) => (
          <span key={`${s.start}${i}`} dir="ltr" style={{ padding: "8px 12px", borderRadius: 12, fontSize: 12.5, fontWeight: 700, border: `1px solid ${i === 0 ? lit : "transparent"}`, background: fill, opacity: s.full ? 0.45 : 1, textDecoration: s.full ? "line-through" : undefined }}>
            {s.start}–{s.end}
          </span>
        ))}
      </span>
      {node.delivery_slots?.assembly ? (
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>{words.skSlotsAssembly}</span>
      ) : null}
    </span>
  );
}

/** 212 The sample sizes the listing filters show before the shop has its own. */
const SAMPLE_FILTER = { name: "Size", values: ["XS", "S", "M", "L", "XL"].map((label) => ({ label, swatch: null as string | null })) };

/** 212 The listing filters as the app draws them: Filters, then the shop's first choice (sizes, else colours) as chips. */
export function ListingFiltersCanvas({ pickable, dark, lang, title, color }: { pickable: Pickable; dark: boolean; lang: string; title: string | null; color?: string }) {
  const own = pickable.commerce?.listingFilter ?? null;
  const choice = own ?? SAMPLE_FILTER;
  const ink = color ?? (dark ? "#F3F0EA" : "#121212");
  const line = dark ? "#2E2C28" : "#E4DFD6";
  const chip = { display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0, padding: "7px 12px", borderRadius: 999, border: `1px solid ${line}`, fontSize: 13, fontWeight: 600 } as const;
  return (
    <span data-studio-listing-filters={own ? "shop" : "sample"} style={{ display: "flex", flexDirection: "column", gap: 8, color: ink, opacity: own ? 1 : 0.6 }}>
      <span style={{ fontWeight: 800, fontSize: 15 }}>{title || choice.name}</span>
      <span style={{ display: "flex", gap: 8, overflow: "hidden" }}>
        <span style={chip}>
          <span aria-hidden="true" className="material-symbols-rounded" style={{ fontSize: 16 }}>
            tune
          </span>
          {APP_WORDS[(lang in APP_WORDS ? lang : "en") as AppWordsLang].filters}
        </span>
        {choice.values.map((v, i) => (
          <span key={i} style={chip}>
            {v.swatch ? <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 999, background: v.swatch, border: `1px solid ${line}` }} /> : null}
            {v.label}
          </span>
        ))}
      </span>
    </span>
  );
}
