"use client";

import { useDashT } from "@/components/dashboard-i18n";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import { STUDIO_TRADE_IN_LOOKS, type StudioNode, type StudioTech } from "@/lib/pages/types";
import { SPEC_KEYS, SPEC_NAMES } from "@/lib/selling/specs";

/**
 * 211 The inspector's part for the electronics shops' elements: which
 * products a specs table or a comparison shows (picked, else the shop's
 * first featured ones with specs), the category they come from, the rows a
 * table shows, the spec a filter is by, and whether trade-in is a card or
 * the estimator itself. The spec names are the app's (lib/selling/specs.ts),
 * shown in English, Arabic or Turkish as the dashboard speaks.
 */

type Change = (patch: Partial<StudioNode>) => void;
const FIELD = { border: "1px solid var(--sf-line)" } as const;

export function TechControls({ node, onChange, pickable, lang }: { node: StudioNode; onChange: Change; pickable: Pickable; lang: string }) {
  const t = useDashT();
  const tech: StudioTech = node.tech ?? {};
  const set = (patch: Partial<StudioTech>) => onChange({ tech: { ...tech, ...patch } });
  const products = (pickable.items.products ?? []).filter((p) => p.specs?.length);
  const categories = pickable.categories.products ?? [];
  const most = node.type === "compare" ? 3 : 1;
  const ids = tech.ids ?? [];
  const pick = (i: number, id: string) => {
    const next = [...ids];
    if (id) next[i] = id;
    else next.splice(i, 1);
    set({ ids: [...new Set(next.filter(Boolean))].slice(0, most) });
  };
  const specName = (key: (typeof SPEC_KEYS)[number]) => (lang === "ar" ? SPEC_NAMES[key].ar : lang === "tr" ? SPEC_NAMES[key].tr : SPEC_NAMES[key].en);
  return (
    <div className="flex flex-col gap-2">
      {node.type === "spec_table" || node.type === "compare" ? (
        <>
          {Array.from({ length: node.type === "compare" ? Math.min(ids.length + 1, 3) : 1 }, (_, i) => (
            <label key={i} className="flex flex-col gap-1 font-bold">
              {node.type === "compare" ? t("studio.techCompareProduct", { n: i + 1 }) : t("studio.techProduct")}
              <select value={ids[i] ?? ""} onChange={(e) => pick(i, e.target.value)} className="h-9 rounded-lg px-1.5 font-normal" style={FIELD}>
                <option value="">{t("studio.techProductAuto")}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {products.length === 0 ? (
            <span className="text-xs" style={{ color: "var(--sf-muted)" }}>
              {t("studio.techNoSpecs")}
            </span>
          ) : null}
        </>
      ) : null}
      {node.type === "compare" || node.type === "spec_filter" || node.type === "spec_table" ? (
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.techCategory")}
          <select value={tech.category_id ?? ""} onChange={(e) => set({ category_id: e.target.value || null })} className="h-9 rounded-lg px-1.5 font-normal" style={FIELD}>
            <option value="">{t("studio.techWholeShop")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {node.type === "spec_table" ? (
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.techRows")}
          <input type="number" min={1} max={40} value={tech.rows ?? ""} placeholder={t("studio.techAllRows")} onChange={(e) => set({ rows: e.target.value ? Math.max(1, Math.min(40, Number(e.target.value))) : undefined })} className="h-9 rounded-lg px-2.5 font-normal" style={FIELD} />
        </label>
      ) : null}
      {node.type === "spec_filter" ? (
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.techSpec")}
          <select value={tech.spec ?? "ram"} onChange={(e) => set({ spec: e.target.value })} className="h-9 rounded-lg px-1.5 font-normal" style={FIELD}>
            {SPEC_KEYS.map((k) => (
              <option key={k} value={k}>
                {specName(k)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {node.type === "trade_in" ? (
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.techTradeLook")}
          <select value={tech.look ?? "card"} onChange={(e) => set({ look: e.target.value as (typeof STUDIO_TRADE_IN_LOOKS)[number] })} className="h-9 rounded-lg px-1.5 font-normal" style={FIELD}>
            <option value="card">{t("studio.techTradeCard")}</option>
            <option value="full">{t("studio.techTradeFull")}</option>
          </select>
        </label>
      ) : null}
      {(node.type === "trade_in" && !pickable.commerce?.tradeIn) || (node.type === "pc_builder" && !pickable.commerce?.pcBuilder) ? (
        <span className="text-xs" style={{ color: "var(--sf-muted)" }}>
          {t(node.type === "trade_in" ? "studio.techTradeOff" : "studio.techBuildOff")}
        </span>
      ) : null}
    </div>
  );
}
