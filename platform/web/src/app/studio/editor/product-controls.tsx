"use client";

import { useDashT } from "@/components/dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";
import { STUDIO_PRODUCT_LOOKS, STUDIO_PRODUCT_RELATED, type LanguageCode, type StudioNode, type StudioProductPart, type StudioProductType } from "@/lib/pages/types";
import { RangeField } from "./controls";

/**
 * 228 The inspector's part for the product page's elements
 * (lib/pages/types.ts STUDIO_PRODUCT_TYPES): the look each takes, what the
 * related products are, how many rows or products, the gallery's corners,
 * the highlights' colour, and their words in the language being edited (a
 * title, Add to cart's and Buy now's, the shop's own delivery lines). Left
 * empty, the app says its own words in each language.
 */

type Change = (patch: Partial<StudioNode>) => void;
const FIELD = { border: "1px solid var(--sf-line)" } as const;

/** Its words in the language being edited (the default's are the element's own). */
function wordOf(node: StudioNode, field: "text" | "title", lang: LanguageCode, def: LanguageCode): string {
  if (lang === def) return node[field] ?? "";
  return (node.translations?.[lang]?.[field] as string | undefined) ?? "";
}

function withWord(node: StudioNode, field: "text" | "title", value: string, lang: LanguageCode, def: LanguageCode): Partial<StudioNode> {
  if (lang === def) return { [field]: value || undefined };
  const translations = { ...(node.translations ?? {}) };
  translations[lang] = { ...(translations[lang] ?? {}), [field]: value };
  return { translations };
}

export function ProductControls({ node, onChange, lang, defaultLang, onProductPage }: { node: StudioNode; onChange: Change; lang: LanguageCode; defaultLang: LanguageCode; onProductPage: boolean }) {
  const t = useDashT();
  const type = node.type as StudioProductType;
  const part: StudioProductPart = node.product_part ?? {};
  const looks = STUDIO_PRODUCT_LOOKS[type] as readonly string[];
  const set = (patch: Partial<StudioProductPart>) => {
    const next: StudioProductPart = { ...part, ...patch };
    for (const k of Object.keys(next) as (keyof StudioProductPart)[]) if (next[k] === undefined || next[k] === null) delete next[k];
    onChange({ product_part: Object.keys(next).length ? next : undefined });
  };
  const titled = type === "product_variants" || type === "product_description" || type === "product_specs" || type === "product_reviews" || type === "product_related" || type === "product_delivery";
  const word = (field: "text" | "title", label: DashKey, max: number, rows = 1) => (
    <label className="flex flex-col gap-1 font-bold">
      {t(label)}
      <textarea value={wordOf(node, field, lang, defaultLang)} rows={rows} maxLength={max} onChange={(e) => onChange(withWord(node, field, e.target.value, lang, defaultLang))} placeholder={lang === defaultLang ? undefined : (node[field] ?? "")} className="rounded-lg px-2.5 py-1.5 font-normal" style={FIELD} data-product-word={field} />
    </label>
  );
  return (
    <div className="flex flex-col gap-2" data-product-controls={type}>
      {!onProductPage ? (
        <span role="note" className="text-xs" style={{ color: "var(--sf-muted)" }}>
          {t("studio.prodPageNote")}
        </span>
      ) : null}
      {looks.length > 1 ? (
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.prodLook")}
          <select value={part.look ?? looks[0]} onChange={(e) => set({ look: e.target.value === looks[0] ? undefined : e.target.value })} className="h-9 rounded-lg px-1.5 font-normal" style={FIELD} data-product-look="">
            {looks.map((look) => (
              <option key={look} value={look}>
                {t(`studio.prodLook_${type}_${look}` as DashKey)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {type === "product_related" ? (
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.prodRelated")}
          <select value={part.related ?? "related"} onChange={(e) => set({ related: e.target.value === "related" ? undefined : (e.target.value as StudioProductPart["related"]) })} className="h-9 rounded-lg px-1.5 font-normal" style={FIELD}>
            {STUDIO_PRODUCT_RELATED.map((r) => (
              <option key={r} value={r}>
                {t(r === "related" ? "studio.prodRelatedRelated" : "studio.prodRelatedLook")}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {type === "product_specs" || type === "product_related" ? (
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.prodRows")}
          <input type="number" min={1} max={40} value={part.rows ?? ""} placeholder={t("studio.prodAll")} onChange={(e) => set({ rows: e.target.value ? Math.max(1, Math.min(40, Number(e.target.value))) : undefined })} className="h-9 rounded-lg px-2.5 font-normal" style={FIELD} />
        </label>
      ) : null}
      {type === "product_gallery" ? <RangeField label={t("studio.prodRadius")} value={part.radius ?? (part.look === "card" || part.look === "thumbs" ? 20 : 0)} min={0} max={40} unit="px" onChange={(radius) => set({ radius })} /> : null}
      {type !== "product_gallery" && type !== "product_description" ? (
        <label className="flex items-center justify-between gap-2 font-bold">
          {t("studio.prodAccent")}
          <span className="flex items-center gap-1.5">
            <input type="color" aria-label={t("studio.prodAccent")} value={part.accent ?? "#111111"} onChange={(e) => set({ accent: e.target.value.toUpperCase() })} className="h-8 w-10 rounded" style={FIELD} />
            <input type="color" aria-label={t("studio.prodAccentDark")} title={t("studio.prodAccentDark")} value={part.dark_accent ?? part.accent ?? "#F5F5F5"} onChange={(e) => set({ dark_accent: e.target.value.toUpperCase() })} className="h-8 w-10 rounded" style={FIELD} />
            {part.accent || part.dark_accent ? (
              <button type="button" aria-label={t("studio.prodAccentReset")} onClick={() => set({ accent: undefined, dark_accent: undefined })} className="h-8 rounded-md px-2 text-xs font-semibold" style={FIELD}>
                ×
              </button>
            ) : null}
          </span>
        </label>
      ) : null}
      {titled ? word("text", "studio.prodTitle", 120) : null}
      {type === "product_buy" ? word("text", "studio.prodButton", 40) : null}
      {type === "product_buy" && part.look === "buy_now" ? word("title", "studio.prodBuyNow", 40) : null}
      {type === "product_delivery" ? (
        <>
          {word("title", "studio.prodLines", 400, 4)}
          <span className="text-xs" style={{ color: "var(--sf-muted)" }}>
            {t("studio.prodLinesHint")}
          </span>
        </>
      ) : null}
      {titled || type === "product_buy" ? (
        <span className="text-xs" style={{ color: "var(--sf-muted)" }}>
          {t("studio.prodTitleHint")}
        </span>
      ) : null}
    </div>
  );
}
