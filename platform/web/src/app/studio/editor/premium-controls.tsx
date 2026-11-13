"use client";

import { useState, type ReactNode } from "react";
import { useDashT } from "@/components/dashboard-i18n";
import { MediaPicker } from "@/components/media-picker";
import type { DashKey } from "@/i18n/dashboard";
import { IconPicker } from "@/app/dashboard/pages/controls";
import { centsToDecimal, parsePrice } from "@/lib/catalog/money";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import {
  SOCIAL_NETWORKS,
  STUDIO_BADGE_STYLES,
  STUDIO_CTA_STYLES,
  STUDIO_ENTRY_SIZES,
  STUDIO_MAX_ENTRIES,
  STUDIO_PRICING_CURRENCIES,
  STUDIO_PROFILE_SHAPES,
  STUDIO_PROGRESS_STYLES,
  STUDIO_REVIEW_SOURCES,
  STUDIO_STATS_STYLES,
  STUDIO_TESTIMONIAL_STYLES,
  STUDIO_TIMELINE_STYLES,
  STUDIO_BENTO_CAPTIONS,
  STUDIO_PATTERNS,
  type Action,
  type LanguageCode,
  type StudioEntry,
  type StudioNode,
  type StudioSurface,
} from "@/lib/pages/types";
import { RangeField } from "./controls";
import { Glyph } from "./shared";

/**
 * 129.11–129.20 The inspector's part for the premium elements: every option
 * of each, and its list entry by entry (added, moved, removed), each text in
 * the language being edited; and the premium card style of any layout
 * (129.18). Colours, size, corners and space are the inspector's usual ones.
 */

type Change = (patch: Partial<StudioNode>) => void;
type EntryField = "title" | "subtitle" | "text" | "label" | "prefix" | "suffix";

const FIELD = { border: "1px solid var(--studio-line)" } as const;

interface Props {
  node: StudioNode;
  onChange: Change;
  lang: LanguageCode;
  defaultLang: LanguageCode;
  pickable: Pickable;
  /** The inspector's tap editor, for an entry's button or link. */
  actionFor: (id: string, action: Action | null, onChange: (action: Action | null) => void) => ReactNode;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex items-center gap-1">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: "#1F8A4C" }} />
      {label}
    </label>
  );
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="h-8 max-w-[60%] rounded-lg px-1.5" style={FIELD}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ColorIn({ label, value, onChange }: { label: string; value: string | null | undefined; onChange: (v: string | null) => void }) {
  const t = useDashT();
  return (
    <label className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="flex items-center gap-1.5">
        <input type="color" value={value ?? "#000000"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-7 w-10 cursor-pointer rounded-md bg-white p-0.5" style={FIELD} />
        {value ? (
          <button type="button" onClick={() => onChange(null)} className="rounded-md bg-white px-1.5 text-xs" style={FIELD}>
            {t("studio.none")}
          </button>
        ) : null}
      </span>
    </label>
  );
}

function Picture({ label, value, onChange }: { label: string; value: string | null | undefined; onChange: (url: string | null) => void }) {
  const t = useDashT();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span>{label}</span>
      <MediaPicker kind="image" share library onPick={(url) => onChange(url)} label={value ? t("studio.pm_changePhoto") : t("studio.choosePicture")} />
      {value ? (
        <button type="button" onClick={() => onChange(null)} className="rounded-md bg-white px-2 py-0.5" style={FIELD}>
          {t("studio.removePicture")}
        </button>
      ) : null}
    </div>
  );
}

/** A text of an entry (or of the element) in the language being edited, the default language's as its hint. */
function TextIn({ label, value, hint, onChange, rows = 1, max }: { label: string; value: string; hint?: string; onChange: (v: string) => void; rows?: number; max: number }) {
  return (
    <label className="flex flex-col gap-1">
      {label}
      {rows > 1 ? (
        <textarea value={value} rows={rows} maxLength={max} placeholder={hint} onChange={(e) => onChange(e.target.value)} className="rounded-lg px-2.5 py-1.5" style={FIELD} />
      ) : (
        <input value={value} maxLength={max} placeholder={hint} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-lg px-2.5" style={FIELD} />
      )}
    </label>
  );
}

/** The fields each element's entries show in the inspector. */
const ENTRY_FIELDS: Record<string, { texts: { field: EntryField; key: string; rows?: number }[]; value?: { key: string; min: number; max: number; step: number; unit?: string }; picture?: string; icon?: boolean; highlight?: string; prices?: boolean; size?: boolean; gradient?: boolean; color?: boolean; action?: boolean }> = {
  testimonials: { texts: [{ field: "text", key: "pm_quote", rows: 3 }, { field: "title", key: "pm_personName" }, { field: "subtitle", key: "pm_personRole" }], value: { key: "pm_stars", min: 0, max: 5, step: 1, unit: "★" }, picture: "pm_photo" },
  pricing: { texts: [{ field: "title", key: "pm_planName" }, { field: "text", key: "pm_features", rows: 4 }, { field: "label", key: "pm_buttonWords" }], prices: true, highlight: "pm_popular", action: true },
  stats: { texts: [{ field: "title", key: "pm_label" }, { field: "prefix", key: "pm_prefix" }, { field: "suffix", key: "pm_suffix" }], value: { key: "pm_number", min: -1e9, max: 1e9, step: 1 }, icon: true, highlight: "pm_accentNumber", color: true },
  // 129 A ring's photo, icon and chip; a step's chip and share on its card; a tile's chip.
  progress: { texts: [{ field: "title", key: "pm_label" }, { field: "subtitle", key: "pm_ringChip" }], value: { key: "pm_share", min: 0, max: 100, step: 1, unit: "%" }, picture: "pm_ringPhoto", icon: true, gradient: true, color: true },
  timeline: { texts: [{ field: "subtitle", key: "pm_date" }, { field: "title", key: "pm_stepTitle" }, { field: "text", key: "pm_stepText", rows: 2 }, { field: "label", key: "pm_stepChip" }], value: { key: "pm_stepShare", min: 0, max: 100, step: 1, unit: "%" }, icon: true, highlight: "pm_activeStep" },
  bento: { texts: [{ field: "title", key: "pm_tileTitle" }, { field: "text", key: "pm_tileText", rows: 2 }, { field: "subtitle", key: "pm_tileChip" }, { field: "label", key: "pm_linkWords" }], picture: "pm_tilePhoto", icon: true, size: true, gradient: true, color: true, action: true },
};

/** A new entry of the element's kind, as its first one was. */
function newEntry(type: StudioNode["type"]): StudioEntry {
  switch (type) {
    case "testimonials":
      return { text: "…", title: "…", value: 5 };
    case "pricing":
      return { title: "…", price: null, price_yearly: null };
    case "stats":
      return { title: "…", value: 0 };
    case "progress":
      return { title: "…", value: 50 };
    default:
      return { title: "…" };
  }
}

function EntriesEditor({ node, onChange, lang, defaultLang, actionFor }: Props) {
  const t = useDashT();
  const spec = ENTRY_FIELDS[node.type];
  const [open, setOpen] = useState(0);
  if (!spec) return null;
  const entries = node.entries ?? [];
  const other = lang !== defaultLang;
  const set = (i: number, patch: Partial<StudioEntry>) => onChange({ entries: entries.map((e, j) => (j === i ? { ...e, ...patch } : e)) });
  const setText = (i: number, field: EntryField, value: string) => {
    const e = entries[i]!;
    if (!other) return set(i, { [field]: value || null });
    set(i, { translations: { ...e.translations, [lang]: { ...e.translations?.[lang], [field]: value } } });
  };
  const textOf = (e: StudioEntry, field: EntryField) => (other ? ((e.translations?.[lang]?.[field] as string | undefined) ?? "") : (e[field] ?? ""));
  const move = (i: number, by: -1 | 1) => {
    const next = [...entries];
    const [it] = next.splice(i, 1);
    next.splice(i + by, 0, it!);
    onChange({ entries: next });
    setOpen(i + by);
  };
  const yearly = node.type === "pricing" && node.pricing?.yearly === true;
  return (
    <div className="flex flex-col gap-2" data-studio-entries="">
      <b>{t(`studio.pm_entries_${node.type}` as DashKey)}</b>
      {entries.map((e, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-lg p-2" style={FIELD}>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-start font-semibold">
              {i + 1}. {textOf(e, ENTRY_FIELDS[node.type]!.texts[0]!.field) || e[ENTRY_FIELDS[node.type]!.texts[0]!.field] || "…"}
            </button>
            <button type="button" aria-label={t("studio.pm_moveUp")} disabled={i === 0} onClick={() => move(i, -1)} className="h-7 w-7 rounded-md border-0 bg-transparent disabled:opacity-30">
              <Glyph name="arrow_upward" size={16} />
            </button>
            <button type="button" aria-label={t("studio.pm_moveDown")} disabled={i === entries.length - 1} onClick={() => move(i, 1)} className="h-7 w-7 rounded-md border-0 bg-transparent disabled:opacity-30">
              <Glyph name="arrow_downward" size={16} />
            </button>
            <button type="button" aria-label={t("studio.pm_remove")} disabled={entries.length <= 1 && node.type !== "testimonials"} onClick={() => onChange({ entries: entries.filter((_, j) => j !== i) })} className="h-7 w-7 rounded-md border-0 bg-transparent disabled:opacity-30">
              <Glyph name="delete" size={16} />
            </button>
          </div>
          {open === i ? (
            <>
              {spec.texts.map((f) => (
                <TextIn key={f.field} label={t(`studio.${f.key}` as DashKey)} value={textOf(e, f.field)} hint={other ? (e[f.field] ?? "") : undefined} rows={f.rows} max={f.field === "text" ? 600 : f.field === "label" ? 40 : f.field === "prefix" || f.field === "suffix" ? 8 : 120} onChange={(v) => setText(i, f.field, v)} />
              ))}
              {spec.value ? (
                spec.value.max > 100 ? (
                  <label className="flex items-center justify-between gap-2">
                    {t(`studio.${spec.value.key}` as DashKey)}
                    <input type="number" dir="ltr" value={e.value ?? 0} step="any" onChange={(ev) => set(i, { value: Number.isFinite(Number(ev.target.value)) ? Math.max(-1e9, Math.min(1e9, Number(ev.target.value))) : 0 })} className="h-8 w-28 rounded-lg px-2 text-end" style={FIELD} />
                  </label>
                ) : (
                  <RangeField label={t(`studio.${spec.value.key}` as DashKey)} value={e.value ?? 0} min={spec.value.min} max={spec.value.max} step={spec.value.step} unit={spec.value.unit ?? ""} onChange={(value) => set(i, { value })} />
                )
              ) : null}
              {spec.prices ? (
                <>
                  <PriceIn label={t("studio.pm_priceMonth")} cents={e.price} onChange={(price) => set(i, { price })} />
                  {yearly ? <PriceIn label={t("studio.pm_priceYear")} cents={e.price_yearly} onChange={(price_yearly) => set(i, { price_yearly })} /> : null}
                  <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
                    {t("studio.pm_priceHint")}
                  </span>
                </>
              ) : null}
              {spec.highlight ? (
                <Toggle
                  label={t(`studio.${spec.highlight}` as DashKey)}
                  checked={e.highlight === true}
                  // One most popular plan, one active step.
                  onChange={(on) => onChange({ entries: entries.map((x, j) => (j === i ? { ...x, highlight: on || undefined } : node.type === "pricing" || node.type === "timeline" ? { ...x, highlight: undefined } : x)) })}
                />
              ) : null}
              {spec.size ? <Choice label={t("studio.pm_tileSize")} value={e.size ?? "small"} options={STUDIO_ENTRY_SIZES.map((s) => ({ value: s, label: t(`studio.pm_size_${s}` as DashKey) }))} onChange={(size) => set(i, { size: size === "small" ? undefined : size })} /> : null}
              {spec.picture ? <Picture label={t(`studio.${spec.picture}` as DashKey)} value={e.image_url} onChange={(image_url) => set(i, { image_url })} /> : null}
              {spec.icon ? <IconPicker id={`entry-icon-${node.id}-${i}`} label={t("studio.icon")} value={e.icon ?? null} optional onChange={(icon) => set(i, { icon })} /> : null}
              {spec.gradient ? (
                <>
                  <ColorIn label={t("studio.pm_gradientFrom")} value={e.gradient?.from} onChange={(from) => set(i, { gradient: from ? { from, to: e.gradient?.to ?? from, angle: e.gradient?.angle ?? 135 } : null })} />
                  {e.gradient ? <ColorIn label={t("studio.pm_gradientTo")} value={e.gradient.to} onChange={(to) => set(i, { gradient: to ? { ...e.gradient!, to } : null })} /> : null}
                </>
              ) : null}
              {spec.color ? <ColorIn label={t("studio.pm_entryColor")} value={e.color} onChange={(color) => set(i, { color })} /> : null}
              {spec.action ? actionFor(`entry-${node.id}-${i}`, e.action ?? null, (action) => set(i, { action })) : null}
            </>
          ) : null}
        </div>
      ))}
      {entries.length < STUDIO_MAX_ENTRIES ? (
        <button
          type="button"
          onClick={() => {
            onChange({ entries: [...entries, newEntry(node.type)] });
            setOpen(entries.length);
          }}
          className="flex h-8 items-center justify-center gap-1 rounded-lg bg-white font-semibold"
          style={FIELD}
        >
          <Glyph name="add" size={16} />
          {t("studio.pm_addEntry")}
        </button>
      ) : null}
    </div>
  );
}

/** A price typed as the shop's prices are ("450", "1,250.00"), kept in cents; empty, not set. */
function PriceIn({ label, cents, onChange }: { label: string; cents: number | null | undefined; onChange: (cents: number | null) => void }) {
  const [text, setText] = useState(cents === null || cents === undefined ? "" : centsToDecimal(cents));
  return (
    <label className="flex items-center justify-between gap-2">
      {label}
      <input
        dir="ltr"
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.trim() ? parsePrice(e.target.value) : null);
        }}
        className="h-8 w-28 rounded-lg px-2 text-end"
        style={FIELD}
      />
    </label>
  );
}

/** The element's own title or text in the language being edited. */
function OwnText({ node, onChange, lang, defaultLang, field, label, max, rows }: Props & { field: "title" | "text"; label: string; max: number; rows?: number }) {
  const other = lang !== defaultLang;
  const value = other ? ((node.translations?.[lang]?.[field] as string | undefined) ?? "") : (node[field] ?? "");
  return (
    <TextIn
      label={label}
      value={value}
      max={max}
      rows={rows}
      hint={other ? (node[field] ?? "") : undefined}
      onChange={(v) => onChange(other ? { translations: { ...node.translations, [lang]: { ...node.translations?.[lang], [field]: v } } } : { [field]: v || null })}
    />
  );
}

export function PremiumControls(props: Props) {
  const t = useDashT();
  const { node, onChange } = props;
  const styles = <T extends string>(key: string, list: readonly T[]) => list.map((v) => ({ value: v, label: t(`studio.${key}_${v}` as DashKey) }));
  switch (node.type) {
    case "testimonials": {
      const reviews = node.testimonials?.reviews ?? null;
      const picks = reviews ? (props.pickable.items[reviews.source] ?? []) : [];
      return (
        <div className="flex flex-col gap-2">
          <Choice label={t("studio.pm_layout")} value={node.testimonials?.style ?? "carousel"} options={styles("pm_tst", STUDIO_TESTIMONIAL_STYLES)} onChange={(style) => onChange({ testimonials: { ...node.testimonials, style: style === "carousel" ? undefined : style } })} />
          <Toggle label={t("studio.pm_realReviews")} checked={!!reviews} onChange={(on) => onChange({ testimonials: { ...node.testimonials, reviews: on ? { source: "courses", id: props.pickable.items.courses?.[0]?.id ?? "1" } : undefined } })} />
          {reviews ? (
            <>
              <Choice label={t("studio.pm_reviewsOf")} value={reviews.source} options={styles("pm_rev", STUDIO_REVIEW_SOURCES)} onChange={(source) => onChange({ testimonials: { ...node.testimonials, reviews: { source, id: props.pickable.items[source]?.[0]?.id ?? reviews.id } } })} />
              {picks.length ? (
                <Choice label={t("studio.pm_reviewsWhich")} value={reviews.id} options={picks.map((e) => ({ value: e.id, label: e.title }))} onChange={(id) => onChange({ testimonials: { ...node.testimonials, reviews: { ...reviews, id } } })} />
              ) : null}
              <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
                {t("studio.pm_realReviewsHint")}
              </span>
            </>
          ) : null}
          <EntriesEditor {...props} />
        </div>
      );
    }
    case "pricing":
      return (
        <div className="flex flex-col gap-2">
          <Choice label={t("studio.pm_currency")} value={node.pricing?.currency ?? "TRY"} options={STUDIO_PRICING_CURRENCIES.map((c) => ({ value: c, label: c }))} onChange={(currency) => onChange({ pricing: { ...node.pricing, currency: currency === "TRY" ? undefined : currency } })} />
          <Toggle label={t("studio.pm_yearlySwitch")} checked={node.pricing?.yearly === true} onChange={(yearly) => onChange({ pricing: { ...node.pricing, yearly: yearly || undefined } })} />
          <EntriesEditor {...props} />
        </div>
      );
    case "stats":
      return (
        <div className="flex flex-col gap-2">
          <Choice label={t("studio.pm_look")} value={node.stats?.style ?? "plain"} options={styles("pm_stats", STUDIO_STATS_STYLES)} onChange={(style) => onChange({ stats: { ...node.stats, style: style === "plain" ? undefined : style } })} />
          <Toggle label={t("studio.pm_dividers")} checked={node.stats?.dividers === true} onChange={(dividers) => onChange({ stats: { ...node.stats, dividers: dividers || undefined } })} />
          <Toggle label={t("studio.pm_still")} checked={node.stats?.still === true} onChange={(still) => onChange({ stats: { ...node.stats, still: still || undefined } })} />
          <Toggle label={t("studio.pm_statsStart")} checked={node.stats?.start === true} onChange={(start) => onChange({ stats: { ...node.stats, start: start || undefined } })} />
          <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
            {t("studio.pm_countHint")} {t("studio.pm_statsFontHint")}
          </span>
          <EntriesEditor {...props} />
        </div>
      );
    case "progress":
      return (
        <div className="flex flex-col gap-2">
          <Choice label={t("studio.pm_look")} value={node.progress?.style ?? "bars"} options={styles("pm_progress", STUDIO_PROGRESS_STYLES)} onChange={(style) => onChange({ progress: { ...node.progress, style: style === "bars" ? undefined : style } })} />
          {node.progress?.style === "rings" ? (
            <>
              <RangeField label={t("studio.pm_ringSize")} value={node.progress.size ?? 76} min={40} max={320} step={2} unit="px" fallback={76} onChange={(size) => onChange({ progress: { ...node.progress, size: size === 76 ? undefined : size } })} />
              <RangeField label={t("studio.pm_ticks")} value={node.progress.ticks ?? 0} min={0} max={60} unit="" fallback={0} onChange={(ticks) => onChange({ progress: { ...node.progress, ticks: ticks || undefined } })} />
              <Toggle label={t("studio.pm_knob")} checked={node.progress.knob === true} onChange={(knob) => onChange({ progress: { ...node.progress, knob: knob || undefined } })} />
            </>
          ) : null}
          {node.progress?.style === "segments" ? <RangeField label={t("studio.pm_segments")} value={node.progress.segments ?? 4} min={2} max={40} unit="" fallback={4} onChange={(segments) => onChange({ progress: { ...node.progress, segments: segments === 4 ? undefined : segments } })} /> : null}
          <RangeField label={t("studio.pm_stroke")} value={node.progress?.stroke ?? (node.progress?.style === "segments" ? 4 : node.progress?.style === "rings" ? 8 : 10)} min={2} max={24} unit="px" onChange={(stroke) => onChange({ progress: { ...node.progress, stroke } })} />
          <EntriesEditor {...props} />
        </div>
      );
    case "timeline":
      return (
        <div className="flex flex-col gap-2">
          <Choice label={t("studio.pm_direction")} value={node.timeline?.style ?? "vertical"} options={styles("pm_timeline", STUDIO_TIMELINE_STYLES)} onChange={(style) => onChange({ timeline: { ...node.timeline, style: style === "vertical" ? undefined : style } })} />
          {(node.timeline?.style ?? "vertical") === "vertical" ? (
            <>
              <Toggle label={t("studio.pm_times")} checked={node.timeline?.times === true} onChange={(times) => onChange({ timeline: { ...node.timeline, times: times || undefined } })} />
              <Toggle label={t("studio.pm_activeCard")} checked={node.timeline?.card === true} onChange={(card) => onChange({ timeline: { ...node.timeline, card: card || undefined } })} />
            </>
          ) : null}
          <Toggle label={t("studio.pm_mono")} checked={node.timeline?.mono === true} onChange={(mono) => onChange({ timeline: { ...node.timeline, mono: mono || undefined } })} />
          <EntriesEditor {...props} />
        </div>
      );
    case "bento":
      return (
        <div className="flex flex-col gap-2">
          <RangeField label={t("studio.columns")} value={node.columns ?? 2} min={1} max={4} unit="" fallback={2} onChange={(columns) => onChange({ columns })} />
          <RangeField label={t("studio.pm_rowHeight")} value={node.bento?.row ?? 112} min={60} max={240} step={4} unit="px" fallback={112} onChange={(row) => onChange({ bento: { ...node.bento, row: row === 112 ? undefined : row } })} />
          <Choice label={t("studio.pm_caption")} value={node.bento?.caption ?? "plain"} options={styles("pm_caption", STUDIO_BENTO_CAPTIONS)} onChange={(caption) => onChange({ bento: { ...node.bento, caption: caption === "plain" ? undefined : caption } })} />
          <EntriesEditor {...props} />
        </div>
      );
    case "profile_card": {
      const socials = node.profile?.socials ?? [];
      const setSocials = (next: typeof socials) => onChange({ profile: { ...node.profile, socials: next.length ? next : undefined } });
      const unused = SOCIAL_NETWORKS.filter((n) => !socials.some((s) => s.network === n));
      return (
        <div className="flex flex-col gap-2">
          <OwnText {...props} field="title" label={t("studio.pm_personName")} max={120} />
          <OwnText {...props} field="text" label={t("studio.pm_personRole")} max={120} />
          <Picture label={t("studio.pm_photo")} value={node.image_url} onChange={(image_url) => onChange({ image_url })} />
          <Picture label={t("studio.pm_cover")} value={node.profile?.cover_url} onChange={(cover_url) => onChange({ profile: { ...node.profile, cover_url } })} />
          <Choice label={t("studio.pm_shape")} value={node.profile?.shape ?? "round"} options={styles("pm_shape", STUDIO_PROFILE_SHAPES)} onChange={(shape) => onChange({ profile: { ...node.profile, shape: shape === "round" ? undefined : shape } })} />
          <b>{t("studio.pm_socials")}</b>
          {socials.map((s, i) => (
            <div key={s.network} className="flex items-center gap-1.5">
              <select aria-label={t("studio.pm_network")} value={s.network} onChange={(e) => setSocials(socials.map((x, j) => (j === i ? { ...x, network: e.target.value as typeof s.network } : x)))} className="h-8 rounded-lg px-1" style={FIELD}>
                {[s.network, ...unused].map((n) => (
                  <option key={n} value={n}>
                    {t(`studio.pm_net_${n}` as DashKey)}
                  </option>
                ))}
              </select>
              <input dir="ltr" type="url" aria-label={t("studio.pm_link")} placeholder="https://" value={s.url} onChange={(e) => setSocials(socials.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} className="h-8 min-w-0 flex-1 rounded-lg px-2" style={FIELD} />
              <button type="button" aria-label={t("studio.pm_remove")} onClick={() => setSocials(socials.filter((_, j) => j !== i))} className="h-7 w-7 rounded-md border-0 bg-transparent">
                <Glyph name="delete" size={16} />
              </button>
            </div>
          ))}
          {socials.length < 6 && unused.length ? (
            <button type="button" onClick={() => setSocials([...socials, { network: unused[0]!, url: "https://" }])} className="flex h-8 items-center justify-center gap-1 rounded-lg bg-white font-semibold" style={FIELD}>
              <Glyph name="add" size={16} />
              {t("studio.pm_addSocial")}
            </button>
          ) : null}
          <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
            {t("studio.pm_profileHint")}
          </span>
        </div>
      );
    }
    case "badge_text":
      return (
        <div className="flex flex-col gap-2">
          <OwnText {...props} field="text" label={t("studio.pm_badgeWords")} max={200} />
          <Choice label={t("studio.pm_look")} value={node.badge?.style ?? "pill"} options={styles("pm_badge", STUDIO_BADGE_STYLES)} onChange={(style) => onChange({ badge: { style } })} />
          <IconPicker id={`icon-${node.id}`} label={t("studio.icon")} value={node.icon ?? null} optional onChange={(icon) => onChange({ icon: icon ?? undefined })} />
          <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
            {t("studio.pm_badgeHint")}
          </span>
        </div>
      );
    case "cta_bar":
      return (
        <div className="flex flex-col gap-2">
          <Choice label={t("studio.pm_look")} value={node.cta?.style ?? "bar"} options={styles("pm_cta", STUDIO_CTA_STYLES)} onChange={(style) => onChange({ cta: { ...node.cta, style } })} />
          {node.cta?.style !== "fab" ? (
            <>
              <OwnText {...props} field="title" label={t("studio.pm_ctaLabel")} max={120} rows={2} />
              <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
                {t("studio.pm_ctaLabelHint")}
              </span>
              <IconPicker id={`lead-${node.id}`} label={t("studio.pm_ctaLead")} value={node.cta?.lead ?? null} optional onChange={(lead) => onChange({ cta: { style: node.cta?.style ?? "bar", lead: lead ?? undefined } })} />
            </>
          ) : null}
          <OwnText {...props} field="text" label={t("studio.pm_buttonWords")} max={200} />
          <IconPicker id={`icon-${node.id}`} label={t("studio.icon")} value={node.icon ?? null} optional={node.cta?.style !== "fab"} onChange={(icon) => onChange({ icon: icon ?? undefined })} />
          <Toggle label={t("studio.pm_ctaPinned")} checked={node.pin === "bottom"} onChange={(on) => onChange({ pin: on ? "bottom" : undefined })} />
          <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
            {t("studio.pm_ctaHint")}
          </span>
        </div>
      );
    default:
      return null;
  }
}

/** 129.18 A layout's premium card style: glass, a gradient border, a glow inside its edge, soft shadows. */
export function SurfaceControls({ node, onChange }: { node: StudioNode; onChange: Change }) {
  const t = useDashT();
  const s: StudioSurface = node.surface ?? {};
  const set = (patch: Partial<StudioSurface>) => {
    const next = { ...s, ...patch };
    for (const k of Object.keys(next) as (keyof StudioSurface)[]) if (next[k] === undefined || next[k] === null) delete next[k];
    onChange({ surface: Object.keys(next).length ? next : undefined });
  };
  return (
    <details className="flex flex-col gap-2" open={!!node.surface} data-studio-surface="">
      <summary className="cursor-pointer font-bold">{t("studio.pm_cardStyle")}</summary>
      <div className="mt-2 flex flex-col gap-2">
        <Toggle label={t("studio.pm_glass")} checked={s.glass !== undefined} onChange={(on) => set({ glass: on ? 18 : undefined, tint: on ? s.tint : undefined })} />
        {s.glass !== undefined ? (
          <>
            <RangeField label={t("studio.pm_blur")} value={s.glass} min={4} max={40} unit="px" onChange={(glass) => set({ glass })} />
            <RangeField label={t("studio.pm_tint")} value={s.tint ?? 0.18} scale={0.01} min={5} max={90} unit="%" fallback={0.18} onChange={(tint) => set({ tint: tint === 0.18 ? undefined : tint })} />
          </>
        ) : null}
        <Toggle label={t("studio.pm_gradientBorder")} checked={!!s.border} onChange={(on) => set({ border: on ? { from: "#FFFFFF", to: "#E8B04B" } : undefined })} />
        {s.border ? (
          <>
            <ColorIn label={t("studio.pm_gradientFrom")} value={s.border.from} onChange={(from) => from && set({ border: { ...s.border!, from } })} />
            <ColorIn label={t("studio.pm_gradientTo")} value={s.border.to} onChange={(to) => to && set({ border: { ...s.border!, to } })} />
            <RangeField label={t("studio.border")} value={s.border.width ?? 1.5} min={1} max={6} step={0.5} unit="px" fallback={1.5} onChange={(width) => set({ border: { ...s.border!, width: width === 1.5 ? undefined : width } })} />
          </>
        ) : null}
        <ColorIn label={t("studio.pm_glow")} value={s.glow} onChange={(glow) => set({ glow })} />
        <Choice label={t("studio.pm_soft")} value={String(s.soft ?? 0)} options={["0", "1", "2", "3"].map((v) => ({ value: v, label: v === "0" ? t("studio.none") : `${t("studio.pm_level")} ${v}` }))} onChange={(v) => set({ soft: v === "0" ? undefined : (Number(v) as 1 | 2 | 3) })} />
        {/* 129 A ticket's perforation, and a texture. */}
        <Toggle label={t("studio.pm_ticket")} checked={!!s.ticket} onChange={(on) => set({ ticket: on ? { at: 60 } : undefined })} />
        {s.ticket ? (
          <>
            <RangeField label={t("studio.pm_ticketAt")} value={s.ticket.at} min={5} max={95} unit="%" onChange={(at) => set({ ticket: { ...s.ticket!, at } })} />
            <RangeField label={t("studio.pm_notch")} value={s.ticket.notch ?? 10} min={4} max={24} unit="px" fallback={10} onChange={(notch) => set({ ticket: { ...s.ticket!, notch: notch === 10 ? undefined : notch } })} />
            <Toggle label={t("studio.pm_ticketDown")} checked={s.ticket.axis === "vertical"} onChange={(down) => set({ ticket: { ...s.ticket!, axis: down ? "vertical" : undefined } })} />
          </>
        ) : null}
        <Choice label={t("studio.pm_pattern")} value={s.pattern ?? "none"} options={(["none", ...STUDIO_PATTERNS] as const).map((v) => ({ value: v, label: t(`studio.pm_pattern_${v}` as DashKey) }))} onChange={(v) => set({ pattern: v === "none" ? undefined : v, pattern_strength: v === "none" ? undefined : s.pattern_strength })} />
        {s.pattern ? <RangeField label={t("studio.pm_patternStrength")} value={s.pattern_strength ?? 0.08} scale={0.01} min={2} max={40} unit="%" fallback={0.08} onChange={(v) => set({ pattern_strength: v === 0.08 ? undefined : v })} /> : null}
        <span className="text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
          {t("studio.pm_cardStyleHint")}
        </span>
      </div>
    </details>
  );
}
