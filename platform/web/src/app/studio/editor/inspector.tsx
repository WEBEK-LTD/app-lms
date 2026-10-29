"use client";

import { useId, useState, type ReactNode } from "react";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { FontPicker } from "@/components/font-picker";
import { MediaPicker } from "@/components/media-picker";
import type { DashKey } from "@/i18n/dashboard";
import { IconPicker } from "@/app/dashboard/pages/controls";
import type { ScreenOption } from "@/lib/pages/sources";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import {
  ITEMS_SORTS,
  STUDIO_ENTERS,
  STUDIO_HEADER_BUTTONS,
  STUDIO_HEADER_TYPES,
  STUDIO_LOOPS,
  STUDIO_PRESSES,
  type Action,
  type ItemSource,
  type LanguageCode,
  type StudioHeader,
  type StudioNode,
  type StudioPage,
  type StudioSides,
  type StudioSize,
} from "@/lib/pages/types";
import { holdsChildren, placeOf } from "@/lib/studio/edit";
import { newNodeId } from "@/lib/studio/elements";
import { elementLabel } from "./left-panel";
import { Glyph } from "./shared";

/**
 * 103R The editor's right side, as in the approved design: the selected
 * element with copy and delete, and its Design, Motion and Data.
 */

export type InspectorTab = "design" | "motion" | "data";

interface Props {
  page: StudioPage;
  node: StudioNode | null;
  headerSelected: boolean;
  parentLabel: string;
  tab: InspectorTab;
  onTab: (tab: InspectorTab) => void;
  onChange: (patch: Partial<StudioNode>) => void;
  onHeader: (header: StudioHeader | null) => void;
  onPage: (patch: Partial<StudioPage>) => void;
  onCopy: () => void;
  onDelete: () => void;
  /** 107.1 Copying, pasting and moving the selected element. */
  tools: {
    onCopy: () => void;
    onCut: () => void;
    onPaste: () => void;
    onCopyStyle: () => void;
    onPasteStyle: () => void;
    onMove: (by: -1 | 1) => void;
    onSelectParent: () => void;
    canPaste: boolean;
    canPasteStyle: boolean;
  };
  onWrap: (type: "row" | "column" | "stack") => void;
  onPlayMotion: () => void;
  onSaveTemplate: (name: string) => Promise<string | null>;
  palette: string[];
  lang: LanguageCode;
  defaultLang: LanguageCode;
  pages: { slug: string; title: string }[];
  sources: ItemSource[];
  categorySources: ItemSource[];
  screens: ScreenOption[];
  pickable: Pickable;
  fontLabels: { arabicOnly: string; none: string; sample: string; hint?: string };
}

export function Inspector(props: Props) {
  const t = useDashT();
  const { node } = props;
  const source = node?.source ?? null;
  const title = props.headerSelected ? t("studio.header") : node ? (node.name ?? elementLabel(t, node.type, source)) : t("studio.pageBackground");
  const icon = props.headerSelected ? "web_asset" : node ? "smart_button" : "description";
  return (
    <aside aria-label={t("studio.design")} className="flex min-h-0 flex-col bg-white text-[13px]" style={{ flex: "1 1 300px", maxWidth: 330, minWidth: 260, borderInlineStart: "1px solid var(--studio-line)" }}>
      <div className="flex items-center gap-2 px-4 py-3.5" style={{ borderBottom: "1px solid var(--studio-line)" }}>
        <span style={{ color: "#3D63FF" }}>
          <Glyph name={icon} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-extrabold">{node && (node.type === "button" || node.type === "text") && !node.name ? `${elementLabel(t, node.type, source)} «${node.text ?? ""}»` : title}</div>
          <div className="text-xs" style={{ color: "var(--studio-muted)" }}>
            {node ? t("studio.inside", { parent: props.parentLabel }) : null}
          </div>
        </div>
        {node && node.id !== props.page.body.id ? (
          <>
            <button type="button" aria-label={t("studio.duplicate")} title={t("studio.duplicate")} onClick={props.onCopy} className="h-8 w-8 rounded-lg border-0 bg-transparent">
              <Glyph name="content_copy" size={18} />
            </button>
            <button type="button" aria-label={t("studio.delete")} title={t("studio.delete")} onClick={props.onDelete} className="h-8 w-8 rounded-lg border-0 bg-transparent">
              <Glyph name="delete" size={18} />
            </button>
          </>
        ) : null}
      </div>
      {node && !props.headerSelected ? <Tools {...props} node={node} /> : null}
      {props.headerSelected ? (
        <HeaderPanel {...props} />
      ) : !node ? (
        <PagePanel {...props} />
      ) : (
        <>
          <div role="tablist" aria-label={title} className="flex gap-1 px-3 pt-2">
            {(["design", "motion", "data"] as const).map((tab) => (
              <button
                key={tab}
                role="tab"
                type="button"
                aria-selected={props.tab === tab}
                onClick={() => props.onTab(tab)}
                className="h-[34px] flex-1 border-0 bg-transparent text-[13px]"
                style={{ borderBottom: `2px solid ${props.tab === tab ? "var(--studio-ink)" : "transparent"}`, fontWeight: props.tab === tab ? 700 : 400, color: props.tab === tab ? "var(--studio-ink)" : "var(--studio-muted)" }}
              >
                {t(`studio.${tab}` as DashKey)}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-3.5 px-4 py-3.5">
              {props.tab === "design" ? <DesignTab {...props} node={node} /> : props.tab === "motion" ? <MotionTab {...props} node={node} /> : <DataTab {...props} node={node} />}
              <SaveTemplate onSave={props.onSaveTemplate} />
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

/** 107.1 Under the element's name: copy, cut and paste it or its style, move it, and go to what holds it. */
function Tools(props: Props & { node: StudioNode }) {
  const t = useDashT();
  const { node, tools } = props;
  const root = node.id === props.page.body.id;
  const place = root ? null : placeOf(props.page.body, node.id);
  const siblings = place?.parent.children?.length ?? 0;
  const text = (label: string, onClick: () => void, disabled = false) => (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-md bg-white px-2 py-0.5 disabled:opacity-40" style={{ border: "1px solid var(--studio-line)" }}>
      {label}
    </button>
  );
  const glyph = (name: string, label: string, onClick: () => void, disabled = false) => (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="flex h-7 w-7 items-center justify-center rounded-md bg-white disabled:opacity-40" style={{ border: "1px solid var(--studio-line)" }}>
      <Glyph name={name} size={16} flip={name === "subdirectory_arrow_left"} />
    </button>
  );
  return (
    <div role="toolbar" aria-label={t("studio.tools")} className="flex flex-wrap items-center gap-1.5 px-4 py-2 text-xs" style={{ borderBottom: "1px solid var(--studio-line)" }}>
      {root ? null : text(t("studio.copy"), tools.onCopy)}
      {root ? null : text(t("studio.cut"), tools.onCut)}
      {text(t("studio.paste"), tools.onPaste, !tools.canPaste)}
      {text(t("studio.copyStyle"), tools.onCopyStyle)}
      {text(t("studio.pasteStyle"), tools.onPasteStyle, !tools.canPasteStyle)}
      {root ? null : (
        <span className="flex gap-1">
          {glyph("arrow_upward", t("studio.moveUp"), () => tools.onMove(-1), (place?.index ?? 0) === 0)}
          {glyph("arrow_downward", t("studio.moveDown"), () => tools.onMove(1), (place?.index ?? 0) >= siblings - 1)}
          {glyph("subdirectory_arrow_left", t("studio.selectParent"), tools.onSelectParent)}
        </span>
      )}
    </div>
  );
}

// Controls ------------------------------------------------------------------

function Heading({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs font-bold" style={{ color: "var(--studio-muted)" }}>
      {children}
    </div>
  );
}

function Rule() {
  return <div className="h-px" style={{ background: "#EDE8DD" }} />;
}

function Box({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex h-[34px] min-w-0 items-center justify-between gap-1 rounded-lg px-2" style={{ border: "1px solid var(--studio-line)" }}>
      <span className="min-w-0 truncate whitespace-nowrap" style={{ color: "var(--studio-muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function NumberIn({ value, onChange, min = 0, max = 4000, label, step = 1, width = 56 }: { value: number | undefined; onChange: (n: number | undefined) => void; min?: number; max?: number; label: string; step?: number; width?: number }) {
  return (
    <input
      type="number"
      dir="ltr"
      aria-label={label}
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const n = e.target.value === "" ? undefined : Number(e.target.value);
        onChange(n === undefined || Number.isNaN(n) ? undefined : Math.min(max, Math.max(min, n)));
      }}
      className="flex-none border-0 bg-transparent p-0 text-end text-[13px] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      style={{ width }}
    />
  );
}

function Segments<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className="rounded-md bg-white px-2 py-0.5 text-[13px]"
          style={value === o.value ? { border: "2px solid #3D63FF", color: "#1F3FB8", fontWeight: 700 } : { border: "1px solid var(--studio-line)" }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Slider({ label, value, min, max, onChange, step = 1 }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void; step?: number }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2.5">
      <label htmlFor={id} className="w-[72px] flex-none">
        {label}
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="min-w-0 flex-1" style={{ accentColor: "#0E0D24" }} />
      <span dir="ltr" className="w-8 text-end">
        {value}
      </span>
    </div>
  );
}

interface ColorChoice {
  label: string;
  value: string | null | undefined;
  onChange: (hex: string | null) => void;
}

/**
 * Colours as in the design: each one on its line with its swatch and code,
 * and one row of the project's palette below for the line chosen (the
 * first at the start). The chosen swatch again takes the colour off; the
 * last circle opens any colour.
 */
function Colors({ rows, palette }: { rows: ColorChoice[]; palette: string[] }) {
  const t = useDashT();
  const pickId = useId();
  const [index, setIndex] = useState(0);
  const active = rows[Math.min(index, rows.length - 1)]!;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <button
          key={row.label}
          type="button"
          aria-pressed={rows.length > 1 ? row === active : undefined}
          onClick={() => setIndex(i)}
          className="-mx-1.5 flex items-center justify-between rounded-md border-0 bg-transparent px-1.5 py-0.5 text-start"
          style={rows.length > 1 && row === active ? { background: "#F4EFE6" } : undefined}
        >
          <span>{row.label}</span>
          <span className="flex items-center gap-2" dir="ltr">
            <span className="inline-block h-[22px] w-[22px] rounded-md" style={{ background: row.value ?? "transparent", border: "1px solid var(--studio-line)" }} />
            <span style={{ color: row.value ? undefined : "var(--studio-muted)" }}>{row.value ?? t("studio.none")}</span>
          </span>
        </button>
      ))}
      <div role="group" aria-label={active.label} className="flex flex-wrap gap-1.5">
        {palette.map((hex) => (
          <button
            key={hex}
            type="button"
            aria-label={hex}
            aria-pressed={active.value === hex}
            onClick={() => active.onChange(active.value === hex ? null : hex)}
            className="h-[26px] w-[26px] rounded-full"
            style={{ background: hex, border: "1px solid var(--studio-line)", outline: active.value === hex ? "2px solid #3D63FF" : undefined, outlineOffset: 2 }}
          />
        ))}
        <label htmlFor={pickId} title={t("studio.addColor")} className="relative flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-full" style={{ border: "1px dashed var(--studio-muted)" }}>
          <Glyph name="add" size={16} />
          <input id={pickId} type="color" aria-label={`${active.label}: ${t("studio.addColor")}`} value={active.value ?? "#FFFFFF"} onChange={(e) => active.onChange(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </div>
    </div>
  );
}

function SizeControl({ label, value, onChange }: { label: string; value: StudioSize | undefined; onChange: (v: StudioSize | undefined) => void }) {
  const t = useDashT();
  const mode = typeof value === "number" ? "fixed" : (value ?? "auto");
  return (
    <Box label={label}>
      <span className="flex items-center gap-0.5" dir="ltr">
        {typeof value === "number" ? <NumberIn label={label} value={value} width={34} onChange={(n) => onChange(n ?? 0)} /> : null}
        <select
          aria-label={label}
          value={mode}
          onChange={(e) => onChange(e.target.value === "fixed" ? 100 : e.target.value === "auto" ? undefined : (e.target.value as "fill" | "hug"))}
          className="cursor-pointer appearance-none border-0 bg-transparent p-0 text-end text-[13px] outline-none"
        >
          <option value="auto">{t("studio.auto")}</option>
          <option value="fill">{t("studio.fill")}</option>
          <option value="hug">{t("studio.hug")}</option>
          <option value="fixed">{typeof value === "number" ? "px" : t("studio.fixed")}</option>
        </select>
      </span>
    </Box>
  );
}

function SidesControl({ label, value, onChange }: { label: string; value: StudioSides | undefined; onChange: (v: StudioSides | undefined) => void }) {
  const t = useDashT();
  const v = value?.top ?? 0;
  const h = value?.start ?? 0;
  const set = (nv: number, nh: number) => onChange(nv || nh ? { top: nv, end: nh, bottom: nv, start: nh } : undefined);
  return (
    <Box label={label}>
      <span className="flex items-center" dir="ltr">
        <NumberIn label={`${label}: ${t("studio.vertical")}`} value={v} max={400} width={20} onChange={(n) => set(n ?? 0, h)} />
        <span aria-hidden="true" className="px-0.5">
          ·
        </span>
        <NumberIn label={`${label}: ${t("studio.horizontal")}`} value={h} max={400} width={20} onChange={(n) => set(v, n ?? 0)} />
      </span>
    </Box>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex items-center gap-1">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: "#1F8A4C" }} />
      {label}
    </label>
  );
}

function SaveTemplate({ onSave }: { onSave: (name: string) => Promise<string | null> }) {
  const t = useDashT();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState<string | null>(null);
  return naming ? (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const problem = await onSave(name.trim());
        setNote(problem ?? t("studio.templateSaved"));
        if (!problem) {
          setNaming(false);
          setName("");
        }
      }}
    >
      <label className="flex flex-col gap-1 font-bold">
        {t("studio.templateName")}
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required className="h-9 rounded-lg px-2.5 font-normal" style={{ border: "1px solid var(--studio-line)" }} />
      </label>
      <button type="submit" className="h-10 rounded-[10px] border-0 font-bold" style={{ background: "#0E0D24", color: "#F4EFE6" }}>
        {t("studio.saveAsTemplate")}
      </button>
    </form>
  ) : (
    <>
      <button
        type="button"
        onClick={() => setNaming(true)}
        className="mt-1 flex h-[42px] items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-bold"
        style={{ border: "1.5px dashed #0E0D24", background: "#F4EFE6" }}
      >
        <Glyph name="bookmark_add" size={18} />
        {t("studio.saveAsTemplate")}
      </button>
      {note ? (
        <p role="status" className="m-0 text-xs" style={{ color: "var(--studio-muted)" }}>
          {note}
        </p>
      ) : null}
    </>
  );
}

/** The arrow of a one-line choice, at its end in either direction. */
function Chevron() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute end-2 top-1/2 flex -translate-y-1/2">
      <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
        expand_more
      </span>
    </span>
  );
}

/**
 * What a tap opens, as in the design: one line ("Opens: Cart") listing the
 * app's screens and pages, a web address, an entry or a course; a second
 * field only for the address, the entry or the course.
 */
function TapAction({ id, action, onChange, pages, sources, screens, pickable }: { id: string; action: Action | null; onChange: (action: Action | null) => void; pages: { slug: string; title: string }[]; sources: ItemSource[]; screens: ScreenOption[]; pickable: Pickable }) {
  const t = useDashT();
  const known = useKnownText();
  const entrySources = sources.filter((s) => s !== "courses" && s !== "posts");
  const value = !action ? "none" : action.type === "screen" ? `screen:${action.screen ?? ""}` : action.type === "page" ? `page:${action.page_slug ?? ""}` : action.type;
  const opens = (target: string) => t("studio.opens", { target });
  const icon = !action ? "touch_app" : action.type === "screen" ? "apps" : action.type === "page" ? "description" : action.type === "url" ? "link" : action.type === "course" ? "school" : "category";
  const choose = (v: string) => {
    if (v === "none") onChange(null);
    else if (v.startsWith("screen:")) onChange({ type: "screen", screen: v.slice(7) as Action["screen"] });
    else if (v.startsWith("page:")) onChange({ type: "page", page_slug: v.slice(5) });
    else if (v === "url") onChange({ type: "url", url: "", open_in: "in_app" });
    else if (v === "course") onChange({ type: "course", course_id: Number(pickable.items.courses?.[0]?.id ?? 0) || null });
    else onChange({ type: "item", item: { source: entrySources[0] ?? "products", id: "" } });
  };
  const field = "h-[34px] w-full rounded-lg bg-white px-2.5 text-[13px]";
  const line = { border: "1px solid var(--studio-line)" };
  const entries = action?.type === "item" && action.item ? (pickable.items[action.item.source] ?? []) : [];
  return (
    <div className="flex flex-col gap-2">
      <label className="relative flex items-center">
        <span className="sr-only">{t("studio.whenTapped")}</span>
        <span aria-hidden="true" className="pointer-events-none absolute start-2.5 flex">
          <Glyph name={icon} size={18} />
        </span>
        <select id={id} value={value} onChange={(e) => choose(e.target.value)} className={`${field} cursor-pointer appearance-none ps-9 pe-7`} style={line}>
          <option value="none">{opens(t("studio.opensNothing"))}</option>
          <optgroup label={t("studio.tapScreen")}>
            {screens
              .filter((s) => !s.alias || value === `screen:${s.value}`)
              .map((s) => (
                <option key={s.value} value={`screen:${s.value}`}>
                  {opens(known(s.label))}
                </option>
              ))}
          </optgroup>
          {pages.length ? (
            <optgroup label={t("studio.tapPage")}>
              {pages.map((p) => (
                <option key={p.slug} value={`page:${p.slug}`}>
                  {opens(p.title)}
                </option>
              ))}
            </optgroup>
          ) : null}
          <option value="url">{opens(t("studio.tapLink"))}</option>
          {entrySources.length || action?.type === "item" ? <option value="item">{opens(t("studio.tapItem"))}</option> : null}
          {sources.includes("courses") || action?.type === "course" ? <option value="course">{opens(t("studio.tapCourse"))}</option> : null}
        </select>
        <Chevron />
      </label>
      {action?.type === "url" ? (
        <>
          <input dir="ltr" type="url" aria-label={t("studio.tapLink")} placeholder="https://" value={action.url ?? ""} onChange={(e) => onChange({ ...action, url: e.target.value })} className={field} style={line} />
          <Check label={t("studio.inBrowser")} checked={action.open_in === "browser"} onChange={(on) => onChange({ ...action, open_in: on ? "browser" : "in_app" })} />
        </>
      ) : null}
      {action?.type === "item" && action.item ? (
        <div className="grid grid-cols-2 gap-2">
          {entrySources.length > 1 ? (
            <select aria-label={t("studio.dataFrom")} value={action.item.source} onChange={(e) => onChange({ type: "item", item: { source: e.target.value as ItemSource, id: "" } })} className={field} style={line}>
              {entrySources.map((s) => (
                <option key={s} value={s}>
                  {t(`studio.el_items_${s}` as DashKey)}
                </option>
              ))}
            </select>
          ) : null}
          {entries.length ? (
            <select aria-label={t("studio.tapItem")} value={action.item.id} onChange={(e) => onChange({ type: "item", item: { ...action.item!, id: e.target.value } })} className={`${field} ${entrySources.length > 1 ? "" : "col-span-2"}`} style={line}>
              <option value="">{t("studio.chooseEntry")}</option>
              {entries.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          ) : (
            <input dir="ltr" aria-label={t("studio.entryId")} placeholder={t("studio.entryId")} value={action.item.id} onChange={(e) => onChange({ type: "item", item: { ...action.item!, id: e.target.value.trim() } })} className={`${field} ${entrySources.length > 1 ? "" : "col-span-2"}`} style={line} />
          )}
        </div>
      ) : null}
      {action?.type === "course" ? (
        <select aria-label={t("studio.tapCourse")} value={String(action.course_id ?? "")} onChange={(e) => onChange({ type: "course", course_id: Number(e.target.value) || null })} className={field} style={line}>
          <option value="">{t("studio.chooseEntry")}</option>
          {(pickable.items.courses ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

// Tabs ---------------------------------------------------------------------

function textOf(node: StudioNode, lang: LanguageCode, def: LanguageCode): string {
  if (lang === def) return node.text ?? "";
  return (node.translations?.[lang]?.text as string | undefined) ?? "";
}

function withText(node: StudioNode, text: string, lang: LanguageCode, def: LanguageCode): Partial<StudioNode> {
  if (lang === def) return { text };
  const translations = { ...(node.translations ?? {}) };
  translations[lang] = { ...(translations[lang] ?? {}), text };
  return { translations };
}

/** 107.1 The shapes an element can keep, width over height. */
const RATIOS = [
  { key: "1:1", value: 1 },
  { key: "4:3", value: 4 / 3 },
  { key: "3:4", value: 3 / 4 },
  { key: "16:9", value: 16 / 9 },
  { key: "9:16", value: 9 / 16 },
] as const;

function DesignTab(props: Props & { node: StudioNode }) {
  const t = useDashT();
  const { node, onChange } = props;
  const layout = holdsChildren(node);
  const textual = node.type === "text" || node.type === "button" || node.type === "ratings" || node.type === "search";
  const alignField = textual ? "text_align" : "self_align";
  const alignValue = textual ? (node.text_align ?? "start") : (node.self_align ?? null);
  return (
    <>
      {textual ? (
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.text")}
          <textarea value={textOf(node, props.lang, props.defaultLang)} onChange={(e) => onChange(withText(node, e.target.value, props.lang, props.defaultLang))} rows={node.type === "text" ? 3 : 1} maxLength={2000} placeholder={node.type === "text" ? undefined : node.text ?? ""} className="rounded-lg px-2.5 py-1.5 font-normal" style={{ border: "1px solid var(--studio-line)" }} data-studio-text="" />
        </label>
      ) : null}
      {node.type === "image" ? (
        <div className="flex flex-col gap-2">
          <Heading>{t("studio.picture")}</Heading>
          <div className="flex items-center gap-2">
            <MediaPicker kind="image" share library onPick={(url) => onChange({ image_url: url })} label={t("studio.choosePicture")} />
            {node.image_url ? (
              <button type="button" onClick={() => onChange({ image_url: null })} className="rounded-md bg-white px-2 py-0.5" style={{ border: "1px solid var(--studio-line)" }}>
                {t("studio.removePicture")}
              </button>
            ) : null}
          </div>
          <Segments label={t("studio.fit")} value={node.fit ?? "cover"} onChange={(fit) => onChange({ fit })} options={[{ value: "cover", label: t("studio.fitCover") }, { value: "contain", label: t("studio.fitContain") }]} />
        </div>
      ) : null}
      {node.type === "icon" || node.type === "button" ? (
        <div className="flex flex-col gap-2">
          <IconPicker id={`icon-${node.id}`} label={t("studio.icon")} value={node.icon ?? null} optional={node.type === "button"} onChange={(icon) => onChange({ icon: icon ?? undefined })} />
          {node.icon ? <Slider label={t("studio.iconSize")} value={node.icon_size ?? 24} min={8} max={120} onChange={(icon_size) => onChange({ icon_size })} /> : null}
          {node.type === "button" && node.icon ? (
            <Segments label={t("studio.icon")} value={node.icon_position ?? "end"} onChange={(icon_position) => onChange({ icon_position })} options={[{ value: "start", label: t("studio.iconStart") }, { value: "end", label: t("studio.iconEnd") }]} />
          ) : null}
        </div>
      ) : null}
      {node.type === "video" ? (
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.videoUrl")}
          <input dir="ltr" type="url" value={node.video_url ?? ""} onChange={(e) => onChange({ video_url: e.target.value || null })} className="h-9 rounded-lg px-2.5 font-normal" style={{ border: "1px solid var(--studio-line)" }} />
          <Check label={t("studio.autoplay")} checked={Boolean(node.autoplay)} onChange={(autoplay) => onChange({ autoplay: autoplay || undefined })} />
        </label>
      ) : null}
      {node.type === "map" ? (
        <div className="flex flex-col gap-2">
          <Heading>{t("studio.mapPlace")}</Heading>
          <div className="grid grid-cols-2 gap-2">
            <Box label={t("studio.lat")}>
              <NumberIn label={t("studio.lat")} value={node.map?.lat} min={-90} max={90} step={0.0001} onChange={(lat) => onChange({ map: { ...(node.map ?? { lat: 0, lng: 0 }), lat: lat ?? 0 } })} />
            </Box>
            <Box label={t("studio.lng")}>
              <NumberIn label={t("studio.lng")} value={node.map?.lng} min={-180} max={180} step={0.0001} onChange={(lng) => onChange({ map: { ...(node.map ?? { lat: 0, lng: 0 }), lng: lng ?? 0 } })} />
            </Box>
          </div>
          <input aria-label={t("studio.mapLabel")} placeholder={t("studio.mapLabel")} value={node.map?.label ?? ""} onChange={(e) => onChange({ map: { ...(node.map ?? { lat: 0, lng: 0 }), label: e.target.value || null } })} className="h-9 rounded-lg px-2.5" style={{ border: "1px solid var(--studio-line)" }} />
        </div>
      ) : null}
      {node.type === "ratings" ? <Slider label={t("studio.stars")} value={node.rating ?? 5} min={0} max={5} step={0.1} onChange={(rating) => onChange({ rating })} /> : null}
      {node.type === "form" ? <FormEditor node={node} onChange={onChange} /> : null}
      {node.type === "slider" ? (
        <div className="flex flex-col gap-2">
          <Slider label={t("studio.perView")} value={node.per_view ?? 1} min={1} max={4} step={0.1} onChange={(per_view) => onChange({ per_view })} />
          <Check label={t("studio.autoplay")} checked={Boolean(node.autoplay)} onChange={(autoplay) => onChange({ autoplay: autoplay || undefined })} />
          {node.autoplay ? <Slider label={t("studio.interval")} value={Math.round((node.interval_ms ?? 4000) / 1000)} min={2} max={20} onChange={(s) => onChange({ interval_ms: s * 1000 })} /> : null}
          <Check label={t("studio.dots")} checked={node.dots !== false} onChange={(dots) => onChange({ dots: dots ? undefined : false })} />
        </div>
      ) : null}
      {textual || node.type === "image" || node.type === "icon" || node.type === "video" || node.type === "map" || node.type === "form" || node.type === "slider" || node.type === "ratings" ? <Rule /> : null}

      <Heading>{t("studio.sizePlace")}</Heading>
      <div className="grid grid-cols-2 gap-2">
        <SizeControl label={t("studio.width")} value={node.width} onChange={(width) => onChange({ width })} />
        <SizeControl label={t("studio.height")} value={node.height} onChange={(height) => onChange({ height })} />
        <SidesControl label={t("studio.paddingInside")} value={node.padding} onChange={(padding) => onChange({ padding })} />
        <SidesControl label={t("studio.marginOutside")} value={node.margin} onChange={(margin) => onChange({ margin })} />
        {layout ? (
          <Box label={t("studio.gap")}>
            <NumberIn label={t("studio.gap")} value={node.gap ?? 0} max={200} onChange={(gap) => onChange({ gap: gap || undefined })} />
          </Box>
        ) : null}
        {node.type === "grid" || node.type === "items" ? (
          <Box label={t("studio.columns")}>
            <NumberIn label={t("studio.columns")} value={node.columns ?? 2} min={1} max={6} onChange={(columns) => onChange({ columns: columns ?? 2 })} />
          </Box>
        ) : null}
        <Box label={t("studio.minHeight")}>
          <NumberIn label={t("studio.minHeight")} value={node.min_height} max={4000} onChange={(min_height) => onChange({ min_height: min_height || undefined })} />
        </Box>
      </div>
      {node.type === "image" || node.type === "video" || node.type === "stack" || node.type === "map" || layout ? (
        <div className="flex flex-col gap-1">
          <span>{t("studio.ratio")}</span>
          <Segments
            label={t("studio.ratio")}
            value={RATIOS.find((r) => node.aspect_ratio !== undefined && node.aspect_ratio !== null && Math.abs(r.value - node.aspect_ratio) < 0.01)?.key ?? "free"}
            onChange={(key) => {
              const ratio = RATIOS.find((r) => r.key === key);
              onChange({ aspect_ratio: ratio ? Math.round(ratio.value * 100) / 100 : undefined, ...(ratio && typeof node.height === "number" ? { height: undefined } : {}) });
            }}
            options={[{ value: "free" as const, label: t("studio.ratioFree") }, ...RATIOS.map((r) => ({ value: r.key, label: r.key === "1:1" ? t("studio.ratioSquare") : r.key }))]}
          />
        </div>
      ) : null}
      <div className="flex gap-1.5">
        {(
          [
            // Mirrored in right to left, so the start's icon is on the start's side.
            ["start", "format_align_left", "studio.alignStart"],
            ["center", "format_align_center", "studio.alignCenter"],
            ["end", "format_align_right", "studio.alignEnd"],
          ] as const
        ).map(([value, icon, key]) => (
          <button
            key={value}
            type="button"
            aria-label={t(key)}
            title={t(key)}
            aria-pressed={alignValue === value}
            onClick={() => onChange({ [alignField]: alignValue === value && !textual ? undefined : value } as Partial<StudioNode>)}
            className="h-8 flex-1 rounded-lg"
            style={alignValue === value ? { background: "#0E0D24", color: "#F4EFE6", border: "1px solid #0E0D24" } : { background: "#FFFFFF", border: "1px solid var(--studio-line)" }}
          >
            <Glyph name={icon} size={18} flip />
          </button>
        ))}
        <button
          type="button"
          aria-label={t("studio.pin")}
          title={t("studio.pin")}
          aria-pressed={Boolean(node.pin && node.pin !== "none")}
          onClick={() => onChange({ pin: node.pin === "bottom" || node.pin === "top" ? undefined : "bottom" })}
          className="h-8 flex-1 rounded-lg"
          style={node.pin && node.pin !== "none" ? { background: "#0E0D24", color: "#F4EFE6", border: "1px solid #0E0D24" } : { background: "#FFFFFF", border: "1px solid var(--studio-line)" }}
        >
          <Glyph name="push_pin" size={18} />
        </button>
      </div>
      {layout && node.type !== "grid" && node.type !== "stack" ? (
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            {t("studio.spread")}
            <select value={node.align ?? "start"} onChange={(e) => onChange({ align: e.target.value === "start" ? undefined : (e.target.value as StudioNode["align"]) })} className="h-8 rounded-lg px-1.5" style={{ border: "1px solid var(--studio-line)" }}>
              <option value="start">{t("studio.spreadStart")}</option>
              <option value="center">{t("studio.spreadCenter")}</option>
              <option value="end">{t("studio.spreadEnd")}</option>
              <option value="between">{t("studio.spreadBetween")}</option>
              <option value="around">{t("studio.spreadAround")}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            {t("studio.lineUp")}
            <select value={node.cross ?? "stretch"} onChange={(e) => onChange({ cross: e.target.value === "stretch" ? undefined : (e.target.value as StudioNode["cross"]) })} className="h-8 rounded-lg px-1.5" style={{ border: "1px solid var(--studio-line)" }}>
              <option value="stretch">{t("studio.stretch")}</option>
              <option value="start">{t("studio.spreadStart")}</option>
              <option value="center">{t("studio.spreadCenter")}</option>
              <option value="end">{t("studio.spreadEnd")}</option>
            </select>
          </label>
        </div>
      ) : null}
      {node.id !== props.page.body.id ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span style={{ color: "var(--studio-muted)" }}>{t("studio.wrapIn")}</span>
          {(["row", "column", "stack"] as const).map((type) => (
            <button key={type} type="button" onClick={() => props.onWrap(type)} className="rounded-md bg-white px-2 py-0.5" style={{ border: "1px solid var(--studio-line)" }}>
              {t(`studio.el_${type}` as DashKey)}
            </button>
          ))}
        </div>
      ) : null}

      <Rule />
      <Heading>{t("studio.colors")}</Heading>
      <Colors
        palette={props.palette}
        rows={[
          { label: t("studio.background"), value: node.background, onChange: (background) => onChange({ background: background ?? undefined }) },
          { label: t("studio.textColor"), value: node.color, onChange: (color) => onChange({ color: color ?? undefined }) },
        ]}
      />
      <details>
        <summary className="cursor-pointer">{t("studio.inDark")}</summary>
        <div className="flex flex-col gap-2.5 pt-2">
          <Colors
            palette={props.palette}
            rows={[
              { label: t("studio.background"), value: node.dark_background, onChange: (dark_background) => onChange({ dark_background: dark_background ?? undefined }) },
              { label: t("studio.textColor"), value: node.dark_color, onChange: (dark_color) => onChange({ dark_color: dark_color ?? undefined }) },
            ]}
          />
        </div>
      </details>
      <details>
        <summary className="cursor-pointer">{t("studio.gradient")}</summary>
        <div className="flex flex-col gap-2.5 pt-2">
          <Colors
            palette={props.palette}
            rows={[
              { label: "1", value: node.gradient?.from, onChange: (from) => onChange({ gradient: from ? { from, to: node.gradient?.to ?? from, angle: node.gradient?.angle } : undefined }) },
              { label: "2", value: node.gradient?.to, onChange: (to) => onChange({ gradient: to && node.gradient ? { ...node.gradient, to } : undefined }) },
            ]}
          />
          {node.gradient ? <Slider label={t("studio.angle")} value={node.gradient.angle ?? 180} min={0} max={360} onChange={(angle) => onChange({ gradient: { ...node.gradient!, angle } })} /> : null}
        </div>
      </details>
      {layout || node.type === "button" ? (
        <div className="flex flex-col gap-1.5">
          <span>{t("studio.backgroundPicture")}</span>
          <div className="flex items-center gap-2">
            <MediaPicker kind="image" share library onPick={(url) => onChange({ image_background_url: url })} label={t("studio.choosePicture")} />
            {node.image_background_url ? (
              <button type="button" onClick={() => onChange({ image_background_url: undefined })} className="rounded-md bg-white px-2 py-0.5" style={{ border: "1px solid var(--studio-line)" }}>
                {t("studio.none")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {textual || layout ? (
        <>
          <Rule />
          <Heading>{t("studio.font")}</Heading>
          <div className="grid grid-cols-2 gap-2">
            <FontPicker key={node.id} id={`font-${node.id}`} label={t("studio.font")} value={node.font?.family ?? ""} labels={props.fontLabels} compact placeholder={t("studio.appFont")} onChange={(family) => onChange({ font: { ...(node.font ?? {}), family: family || null } })} />
            <label className="relative flex">
              <span className="sr-only">{t("studio.weight")}</span>
              <select value={node.font?.weight ?? ""} onChange={(e) => onChange({ font: { ...(node.font ?? {}), weight: e.target.value ? (Number(e.target.value) as 400) : undefined } })} className="h-[34px] w-full cursor-pointer appearance-none rounded-lg bg-white ps-2.5 pe-7 text-[13px]" style={{ border: "1px solid var(--studio-line)" }}>
                <option value="">{t("studio.weight")}</option>
                {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                  <option key={w} value={w}>
                    {t(`studio.w${w}` as DashKey)}
                  </option>
                ))}
              </select>
              <Chevron />
            </label>
          </div>
          <Slider label={t("studio.size")} value={node.font?.size ?? 16} min={8} max={72} onChange={(size) => onChange({ font: { ...(node.font ?? {}), size } })} />
          <Slider label={t("studio.lineHeight")} value={node.font?.line_height ?? 1.4} min={0.8} max={3} step={0.05} onChange={(line_height) => onChange({ font: { ...(node.font ?? {}), line_height } })} />
          <Slider label={t("studio.letterSpacing")} value={node.font?.letter_spacing ?? 0} min={-5} max={20} step={0.5} onChange={(letter_spacing) => onChange({ font: { ...(node.font ?? {}), letter_spacing: letter_spacing || undefined } })} />
          <div className="flex gap-3">
            <Check label={t("studio.italic")} checked={Boolean(node.font?.italic)} onChange={(italic) => onChange({ font: { ...(node.font ?? {}), italic: italic || undefined } })} />
            <Check label={t("studio.underline")} checked={Boolean(node.font?.underline)} onChange={(underline) => onChange({ font: { ...(node.font ?? {}), underline: underline || undefined } })} />
          </div>
          {node.type === "text" ? (
            <Box label={t("studio.maxLines")}>
              <NumberIn label={t("studio.maxLines")} value={node.max_lines ?? undefined} min={1} max={50} onChange={(max_lines) => onChange({ max_lines: max_lines ?? undefined })} />
            </Box>
          ) : null}
        </>
      ) : null}

      <Rule />
      <Heading>{t("studio.shape")}</Heading>
      <Slider label={t("studio.corners")} value={node.radius ?? 0} min={0} max={60} onChange={(radius) => onChange({ radius: radius || undefined })} />
      <div className="flex items-center justify-between gap-2">
        <span>{t("studio.shadow")}</span>
        <Segments
          label={t("studio.shadow")}
          value={node.shadow ?? "none"}
          onChange={(shadow) => onChange({ shadow: shadow === "none" ? undefined : shadow })}
          options={[
            { value: "none", label: t("studio.shadowNone") },
            { value: "light", label: t("studio.shadowLight") },
            { value: "medium", label: t("studio.shadowMedium") },
            { value: "strong", label: t("studio.shadowStrong") },
          ]}
        />
      </div>
      <Slider label={t("studio.border")} value={node.border_width ?? 0} min={0} max={20} onChange={(border_width) => onChange({ border_width: border_width || undefined, border_color: border_width ? (node.border_color ?? "#DDD8CC") : undefined })} />
      {node.border_width ? <Colors palette={props.palette} rows={[{ label: t("studio.border"), value: node.border_color, onChange: (border_color) => onChange({ border_color: border_color ?? undefined }) }]} /> : null}
      <Slider label={t("studio.opacity")} value={Math.round((node.opacity ?? 1) * 100)} min={0} max={100} onChange={(o) => onChange({ opacity: o === 100 ? undefined : o / 100 })} />

      {node.type !== "items" && node.type !== "categories" && node.type !== "form" && node.type !== "search" && node.bind === undefined ? (
        <>
          <Rule />
          <Heading>{t("studio.whenTapped")}</Heading>
          <TapAction id={`action-${node.id}`} action={node.action ?? null} onChange={(action) => onChange({ action: action ?? undefined })} pages={props.pages} sources={props.sources} screens={props.screens} pickable={props.pickable} />
        </>
      ) : null}
      <div className="flex items-center justify-between">
        <span>{t("studio.showsOn")}</span>
        <span className="flex gap-2.5">
          {(["android", "ios"] as const).map((p) => {
            const on = !node.platforms || node.platforms.includes(p);
            return (
              <Check
                key={p}
                label={t(`studio.${p}`)}
                checked={on}
                onChange={(checked) => {
                  const now = new Set<"android" | "ios">(node.platforms ?? ["android", "ios"]);
                  if (checked) now.add(p);
                  else now.delete(p);
                  if (now.size === 0) return;
                  onChange({ platforms: now.size === 2 ? undefined : [...now] });
                }}
              />
            );
          })}
        </span>
      </div>
      <label className="flex items-center justify-between gap-2">
        {t("studio.whoSees")}
        <select value={node.visibility ?? "everyone"} onChange={(e) => onChange({ visibility: e.target.value === "everyone" ? undefined : (e.target.value as "signed_in") })} className="h-8 rounded-lg px-1.5" style={{ border: "1px solid var(--studio-line)" }}>
          <option value="everyone">{t("studio.everyone")}</option>
          <option value="signed_in">{t("studio.signedIn")}</option>
          <option value="signed_out">{t("studio.signedOut")}</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        {t("studio.name")}
        <input value={node.name ?? ""} maxLength={80} onChange={(e) => onChange({ name: e.target.value || undefined })} className="h-9 rounded-lg px-2.5" style={{ border: "1px solid var(--studio-line)" }} />
      </label>
    </>
  );
}

function FormEditor({ node, onChange }: { node: StudioNode; onChange: (patch: Partial<StudioNode>) => void }) {
  const t = useDashT();
  const form = node.form ?? { send_to: "email" as const, fields: [] };
  const set = (patch: Partial<typeof form>) => onChange({ form: { ...form, ...patch } });
  return (
    <div className="flex flex-col gap-2">
      <Heading>{t("studio.formQuestions")}</Heading>
      {form.fields.map((f, i) => (
        <div key={f.id} className="flex flex-col gap-1 rounded-lg p-2" style={{ border: "1px solid var(--studio-line)" }}>
          <input aria-label={t("studio.question")} value={f.label} onChange={(e) => set({ fields: form.fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} className="h-8 rounded-md px-2" style={{ border: "1px solid var(--studio-line)" }} />
          <div className="flex items-center justify-between gap-2">
            <select aria-label={t("studio.question")} value={f.kind} onChange={(e) => set({ fields: form.fields.map((x, j) => (j === i ? { ...x, kind: e.target.value as typeof f.kind } : x)) })} className="h-8 rounded-md px-1" style={{ border: "1px solid var(--studio-line)" }}>
              {(["text", "long_text", "email", "phone", "number"] as const).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <Check label={t("studio.required")} checked={f.required} onChange={(required) => set({ fields: form.fields.map((x, j) => (j === i ? { ...x, required } : x)) })} />
            <button type="button" aria-label={t("studio.delete")} onClick={() => set({ fields: form.fields.filter((_, j) => j !== i) })} className="border-0 bg-transparent">
              <Glyph name="delete" size={18} />
            </button>
          </div>
        </div>
      ))}
      {form.fields.length < 10 ? (
        <button type="button" onClick={() => set({ fields: [...form.fields, { id: newNodeId(), kind: "text", label: t("studio.question"), required: false, options: null }] })} className="rounded-md bg-white px-2 py-1" style={{ border: "1px dashed var(--studio-muted)" }}>
          {t("studio.addQuestion")}
        </button>
      ) : null}
      <label className="flex items-center justify-between gap-2">
        {t("studio.sendTo")}
        <select value={form.send_to} onChange={(e) => set({ send_to: e.target.value as "email" | "chat" })} className="h-8 rounded-lg px-1.5" style={{ border: "1px solid var(--studio-line)" }}>
          <option value="email">{t("studio.sendEmail")}</option>
          <option value="chat">{t("studio.sendChat")}</option>
        </select>
      </label>
      <input aria-label={t("studio.submitLabel")} placeholder={t("studio.submitLabel")} value={form.submit_label ?? ""} onChange={(e) => set({ submit_label: e.target.value || null })} className="h-8 rounded-md px-2" style={{ border: "1px solid var(--studio-line)" }} />
      <input aria-label={t("studio.successText")} placeholder={t("studio.successText")} value={form.success_text ?? ""} onChange={(e) => set({ success_text: e.target.value || null })} className="h-8 rounded-md px-2" style={{ border: "1px solid var(--studio-line)" }} />
    </div>
  );
}

function MotionTab(props: Props & { node: StudioNode }) {
  const t = useDashT();
  const { node, onChange } = props;
  const m = node.motion ?? {};
  const set = (patch: Partial<NonNullable<StudioNode["motion"]>>) => {
    const next = { ...m, ...patch };
    const empty = (!next.enter || next.enter === "none") && (!next.press || next.press === "none") && (!next.loop || next.loop === "none");
    onChange({ motion: empty ? undefined : next });
  };
  const words = { none: "None", fade: "Fade", slide_up: "SlideUp", slide_down: "SlideDown", slide_start: "SlideStart", slide_end: "SlideEnd", zoom: "Zoom" } as const;
  return (
    <>
      <label className="flex flex-col gap-1 font-bold">
        {t("studio.enter")}
        <select value={m.enter ?? "none"} onChange={(e) => set({ enter: e.target.value as (typeof STUDIO_ENTERS)[number] })} className="h-9 rounded-lg px-1.5 font-normal" style={{ border: "1px solid var(--studio-line)" }}>
          {STUDIO_ENTERS.map((v) => (
            <option key={v} value={v}>
              {t(`studio.enter${words[v]}` as DashKey)}
            </option>
          ))}
        </select>
      </label>
      {m.enter && m.enter !== "none" ? (
        <>
          <Slider label={t("studio.duration")} value={m.duration_ms ?? 400} min={100} max={3000} step={50} onChange={(duration_ms) => set({ duration_ms })} />
          <Slider label={t("studio.delay")} value={m.delay_ms ?? 0} min={0} max={5000} step={50} onChange={(delay_ms) => set({ delay_ms })} />
        </>
      ) : null}
      <div className="flex flex-col gap-1 font-bold">
        {t("studio.press")}
        <Segments label={t("studio.press")} value={m.press ?? "none"} onChange={(press) => set({ press })} options={STUDIO_PRESSES.map((v) => ({ value: v, label: t(`studio.press${v === "none" ? "None" : v === "shrink" ? "Shrink" : "Bounce"}` as DashKey) }))} />
      </div>
      <div className="flex flex-col gap-1 font-bold">
        {t("studio.loop")}
        <Segments label={t("studio.loop")} value={m.loop ?? "none"} onChange={(loop) => set({ loop })} options={STUDIO_LOOPS.map((v) => ({ value: v, label: t(`studio.loop${v === "none" ? "None" : v[0]!.toUpperCase() + v.slice(1)}` as DashKey) }))} />
      </div>
      <button type="button" onClick={props.onPlayMotion} className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-white font-bold" style={{ border: "1px solid var(--studio-line)" }}>
        <Glyph name="play_arrow" size={18} />
        {t("studio.playMotion")}
      </button>
      <p className="m-0 text-xs" style={{ color: "var(--studio-muted)" }}>
        {t("studio.reduceMotion")}
      </p>
    </>
  );
}

function DataTab(props: Props & { node: StudioNode }) {
  const t = useDashT();
  const { node, onChange } = props;
  if (node.type === "items") {
    const q = node.query ?? { limit: 4, category_id: null, featured: false, sort: "newest" as const, ids: [] };
    const cats = (node.source ? props.pickable.categories[node.source] : undefined) ?? [];
    const sortKey: Record<string, string> = { newest: "sortNewest", popular: "sortPopular", price_low: "sortPriceLow", price_high: "sortPriceHigh", title: "sortTitle" };
    return (
      <>
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.dataFrom")}
          <select value={node.source ?? ""} onChange={(e) => onChange({ source: e.target.value as ItemSource, query: { ...q, category_id: null, ids: [] } })} className="h-9 rounded-lg px-1.5 font-normal" style={{ border: "1px solid var(--studio-line)" }}>
            {props.sources.map((s) => (
              <option key={s} value={s}>
                {t(`studio.el_items_${s}` as DashKey)}
              </option>
            ))}
          </select>
        </label>
        <Segments label={t("studio.dataLayout")} value={node.layout ?? "grid"} onChange={(layout) => onChange({ layout })} options={[{ value: "grid", label: t("studio.layoutGrid") }, { value: "list", label: t("studio.layoutList") }, { value: "carousel", label: t("studio.layoutCarousel") }]} />
        <Slider label={t("studio.howMany")} value={q.limit} min={1} max={30} onChange={(limit) => onChange({ query: { ...q, limit } })} />
        <label className="flex items-center justify-between gap-2">
          {t("studio.sort")}
          <select value={q.sort} onChange={(e) => onChange({ query: { ...q, sort: e.target.value as typeof q.sort } })} className="h-8 rounded-lg px-1.5" style={{ border: "1px solid var(--studio-line)" }}>
            {ITEMS_SORTS.map((s) => (
              <option key={s} value={s}>
                {sortKey[s] ? t(`studio.${sortKey[s]}` as DashKey) : s}
              </option>
            ))}
          </select>
        </label>
        {cats.length ? (
          <label className="flex items-center justify-between gap-2">
            {t("studio.category")}
            <select value={q.category_id ?? ""} onChange={(e) => onChange({ query: { ...q, category_id: e.target.value || null } })} className="h-8 rounded-lg px-1.5" style={{ border: "1px solid var(--studio-line)" }}>
              <option value="">{t("studio.anyCategory")}</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Check label={t("studio.onlyFeatured")} checked={q.featured} onChange={(featured) => onChange({ query: { ...q, featured } })} />
        <Rule />
        <Heading>{t("studio.card")}</Heading>
        <Segments
          label={t("studio.card")}
          value={node.card ? "own" : "app"}
          onChange={(v) =>
            onChange({
              card:
                v === "own"
                  ? {
                      id: newNodeId(),
                      type: "column",
                      gap: 6,
                      padding: { top: 8, end: 8, bottom: 8, start: 8 },
                      radius: 14,
                      background: "#FFFFFF",
                      dark_background: "#22203A",
                      shadow: "light",
                      children: [
                        { id: newNodeId(), type: "image", bind: "image", height: 74, radius: 10 },
                        { id: newNodeId(), type: "text", bind: "title", font: { size: 12, weight: 700 } },
                        { id: newNodeId(), type: "text", bind: "price", font: { size: 11 }, opacity: 0.7 },
                      ],
                    }
                  : undefined,
            })
          }
          options={[
            { value: "app", label: t("studio.appCard") },
            { value: "own", label: t("studio.ownCard") },
          ]}
        />
      </>
    );
  }
  if (node.type === "categories") {
    return (
      <label className="flex flex-col gap-1 font-bold">
        {t("studio.dataFrom")}
        <select value={node.source ?? ""} onChange={(e) => onChange({ source: e.target.value as ItemSource })} className="h-9 rounded-lg px-1.5 font-normal" style={{ border: "1px solid var(--studio-line)" }}>
          {props.categorySources.map((s) => (
            <option key={s} value={s}>
              {t(`studio.el_items_${s}` as DashKey)}
            </option>
          ))}
        </select>
      </label>
    );
  }
  if (node.bind !== undefined) {
    return (
      <label className="flex flex-col gap-1 font-bold">
        {t("studio.bind")}
        <select value={node.bind ?? ""} onChange={(e) => onChange({ bind: (e.target.value || null) as StudioNode["bind"] })} className="h-9 rounded-lg px-1.5 font-normal" style={{ border: "1px solid var(--studio-line)" }}>
          <option value="">{t("studio.bindNone")}</option>
          {node.type === "image" ? (
            <option value="image">{t("studio.bindImage")}</option>
          ) : (
            <>
              <option value="title">{t("studio.bindTitle")}</option>
              <option value="subtitle">{t("studio.bindSubtitle")}</option>
              <option value="price">{t("studio.bindPrice")}</option>
              <option value="badge">{t("studio.bindBadge")}</option>
            </>
          )}
        </select>
      </label>
    );
  }
  return (
    <p className="m-0" style={{ color: "var(--studio-muted)" }}>
      {t("studio.noData")}
    </p>
  );
}

function HeaderPanel(props: Props) {
  const t = useDashT();
  const header = props.page.header;
  if (!header) return null;
  const set = (patch: Partial<StudioHeader>) => props.onHeader({ ...header, ...patch });
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-3.5 px-4 py-3.5">
        <Heading>{t("studio.headerTypeLabel")}</Heading>
        <div className="flex flex-col gap-1.5">
          {STUDIO_HEADER_TYPES.map((type, i) => (
            <button key={type} type="button" aria-pressed={header.type === type} onClick={() => set({ type })} className="rounded-lg bg-white px-2.5 py-1.5 text-start" style={header.type === type ? { border: "2px solid #3D63FF", color: "#1F3FB8", fontWeight: 700 } : { border: "1px solid var(--studio-line)" }}>
              {t(`studio.header${i + 1}` as DashKey)}
            </button>
          ))}
          <button type="button" onClick={() => props.onHeader(null)} className="rounded-lg bg-white px-2.5 py-1.5 text-start" style={{ border: "1px solid var(--studio-line)" }}>
            {t("studio.noHeader")}
          </button>
        </div>
        <Rule />
        <div className="flex flex-wrap gap-2.5">
          {STUDIO_HEADER_BUTTONS.map((b) => (
            <Check
              key={b}
              label={t(`studio.btn_${b}` as DashKey)}
              checked={(header.buttons ?? []).includes(b)}
              onChange={(on) => {
                const now = new Set(header.buttons ?? []);
                if (on) now.add(b);
                else now.delete(b);
                set({ buttons: [...now].slice(0, 4) });
              }}
            />
          ))}
        </div>
        <Rule />
        <Colors
          palette={props.palette}
          rows={[
            { label: t("studio.background"), value: header.background, onChange: (background) => set({ background: background ?? undefined }) },
            { label: t("studio.textColor"), value: header.color, onChange: (color) => set({ color: color ?? undefined }) },
          ]}
        />
        <details>
          <summary className="cursor-pointer">{t("studio.inDark")}</summary>
          <div className="flex flex-col gap-2.5 pt-2">
            <Colors
              palette={props.palette}
              rows={[
                { label: t("studio.background"), value: header.dark_background, onChange: (dark_background) => set({ dark_background: dark_background ?? undefined }) },
                { label: t("studio.textColor"), value: header.dark_color, onChange: (dark_color) => set({ dark_color: dark_color ?? undefined }) },
              ]}
            />
          </div>
        </details>
      </div>
    </div>
  );
}

function PagePanel(props: Props) {
  const t = useDashT();
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-3.5 px-4 py-3.5">
        <p className="m-0" style={{ color: "var(--studio-muted)" }}>
          {t("studio.nothingSelected")}
        </p>
        <Rule />
        <Colors
          palette={props.palette}
          rows={[
            { label: t("studio.pageBackground"), value: props.page.background, onChange: (background) => props.onPage({ background: background ?? undefined }) },
            { label: `${t("studio.pageBackground")} · ${t("studio.inDark")}`, value: props.page.dark_background, onChange: (dark_background) => props.onPage({ dark_background: dark_background ?? undefined }) },
          ]}
        />
        <Check label={t("studio.showTabs")} checked={props.page.show_tabs !== false} onChange={(on) => props.onPage({ show_tabs: on ? undefined : false })} />
        <p className="m-0 text-xs" style={{ color: "var(--studio-muted)" }}>
          {t("studio.keyboard")}
        </p>
      </div>
    </div>
  );
}
