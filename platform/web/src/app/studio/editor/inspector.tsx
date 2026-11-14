"use client";
// 130.20 130.21 Premium chrome: the header's premium style and the system screens' look.
import { HeaderStyleControls, SystemLookControl } from "./premium-chrome-controls";
import type { SystemLook } from "@/lib/studio/premium-chrome";

import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { FontPicker } from "@/components/font-picker";
import { MediaPicker } from "@/components/media-picker";
import type { DashKey } from "@/i18n/dashboard";
import { IconPicker, OwnIcon } from "@/app/dashboard/pages/controls";
import { newBlockId } from "@/lib/pages/defaults";
import type { ScreenOption } from "@/lib/pages/sources";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import {
  ITEMS_SORTS,
  STUDIO_SLIDER_INDICATORS,
  STUDIO_ENTERS,
  STUDIO_MARKET_KINDS,
  STUDIO_MARKET_SECTIONS,
  STUDIO_LEARNING_SECTIONS,
  STUDIO_LIVE_SOURCES,
  STUDIO_SCHOOL_SECTIONS,
  STUDIO_LEARNING_STYLES,
  STUDIO_MARKET_SORTS,
  STUDIO_MARKET_STYLES,
  STUDIO_MARKET_CARD_FACTS,
  STUDIO_HEADER_BUTTONS,
  STUDIO_HEADER_TYPES,
  STUDIO_LOOPS,
  STUDIO_PRESSES,
  STUDIO_TEXT_STYLES,
  LAYOUT_LIMITS,
  TAB_LABELS,
  type Action,
  type ItemSource,
  type LanguageCode,
  type LayoutTab,
  type StudioHeader,
  type StudioMarket,
  type StudioFont,
  type StudioNode,
  type StudioPage,
  type StudioSize,
  type StudioTextStyle,
  type TabBarStyle,
  type TabBarDesign,
  TAB_BAR_DESIGNS,
 type WebPageLook,
} from "@/lib/pages/types";
import { holdsChildren, placeOf } from "@/lib/studio/edit";
import { newNodeId } from "@/lib/studio/elements";
import { followStyle } from "@/lib/studio/text-styles";
import { SCRIM_DEFAULT } from "@/lib/studio/scrim";
import { elementLabel } from "./left-panel";
import { RangeField, SidesField } from "./controls";
import { CoverControls, TrackingControls } from "./cover-controls";
// 129 Premium motion & media.
import { BannerControls, BeforeAfterControls, GalleryControls, IndicatorLookControls, SegmentsControls, MarqueeControls, StoriesControls, type PremiumControlsProps } from "./premium-motion-controls";
// 129.11–129.20 The premium elements' options and lists, and a layout's premium card style.
import { PremiumControls, SurfaceControls } from "./premium-controls";
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
  /** 109 The bottom tabs selected: they and the bar's look are edited here. */
  tabsSelected: boolean;
  tabs: LayoutTab[];
  tabBar: TabBarStyle | undefined;
  onTabs: (tabs: LayoutTab[]) => void;
  onTabBar: (style: TabBarStyle | undefined) => void;
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
  /** 120 The screens a page can be drawn around. */
  pageScreens: { value: string; label: string }[];
  pickable: Pickable;
  fontLabels: { arabicOnly: string; none: string; sample: string; hint?: string };
  /** Editor audit 3.3: the project's text styles, filled in from the defaults. */
  textStyles: Record<StudioTextStyle, StudioFont>;
  /** Editor audit 3.3: editing while the canvas shows a tablet; `changed` when the element has tablet changes. */
  tablet?: { changed: boolean; onReset: () => void };
  /** 130.21 The system screens' look (Studio › Screens), where the project has Studio's screens. */
  system?: { look: SystemLook | null; onLook: (look: SystemLook | null) => void; busy: boolean };
}

export function Inspector(props: Props) {
  const t = useDashT();
  const { node } = props;
  const source = node?.source ?? null;
  const title = props.tabsSelected ? t("studio.tabBar") : props.headerSelected ? t("studio.header") : node ? (node.name ?? elementLabel(t, node.type, source)) : t("studio.pageBackground");
  const icon = props.tabsSelected ? "tab" : props.headerSelected ? "web_asset" : node ? "smart_button" : "description";
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
      {props.tabsSelected ? (
        <TabsPanel {...props} />
      ) : props.headerSelected ? (
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
          <Check label={t("studio.inBrowser")} checked={action.open_in === "browser"} onChange={(on) => onChange({ ...action, open_in: on ? "browser" : "in_app", ...(on ? { web: undefined } : {}) })} />
          {/* 122 A web page in the app: no address shown, the site's own header and footer hidden, its links kept in. */}
          {action.open_in !== "browser" ? <WebLookControls look={action.web} onChange={(web) => onChange({ ...action, web })} /> : null}
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

/** 122 How a web page shows in the app (`Action.web`): what to hide of the site, and whether every link stays in. */
function WebLookControls({ look, onChange }: { look: WebPageLook | undefined; onChange: (look: WebPageLook | undefined) => void }) {
  const t = useDashT();
  const set = (patch: Partial<WebPageLook>) => {
    const next: WebPageLook = { ...(look ?? {}), ...patch };
    for (const key of Object.keys(next) as (keyof WebPageLook)[]) if (next[key] === false || next[key] === "" || next[key] === undefined) delete next[key];
    onChange(Object.keys(next).length ? next : undefined);
  };
  return (
    <div className="flex flex-col gap-1.5 rounded-lg p-2.5" style={{ background: "var(--studio-soft, #F6F4FB)" }}>
      <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
        {t("studio.webHint")}
      </span>
      <Check label={t("studio.webHideHeader")} checked={look?.hide_header === true} onChange={(on) => set({ hide_header: on })} />
      <Check label={t("studio.webHideFooter")} checked={look?.hide_footer === true} onChange={(on) => set({ hide_footer: on })} />
      <Check label={t("studio.webLinksInside")} checked={look?.links_inside === true} onChange={(on) => set({ links_inside: on })} />
      <label className="flex flex-col gap-1 text-xs font-bold">
        {t("studio.webHideMore")}
        <input dir="ltr" value={look?.hide ?? ""} maxLength={300} placeholder=".newsletter, #cookie-banner" onChange={(e) => set({ hide: e.target.value })} className="h-[34px] w-full rounded-lg bg-white px-2.5 text-[13px] font-normal" style={{ border: "1px solid var(--studio-line)" }} />
      </label>
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

/** 107.3 A question's or a tab's name, in the language being edited. */
function titleOf(node: StudioNode, lang: LanguageCode, def: LanguageCode): string {
  if (lang === def) return node.title ?? "";
  return (node.translations?.[lang]?.title as string | undefined) ?? "";
}

function withTitle(node: StudioNode, title: string, lang: LanguageCode, def: LanguageCode): Partial<StudioNode> {
  if (lang === def) return { title: title || undefined };
  const translations = { ...(node.translations ?? {}) };
  translations[lang] = { ...(translations[lang] ?? {}), title };
  return { translations };
}

/** 107.3 A moment as the date and time field shows it, in the browser's time zone. */
function localInput(iso: string | null | undefined): string {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  // Editor audit 3.3: changing the font by hand leaves the text style.
  const setFont = (patch: StudioFont) => onChange({ font: { ...(node.font ?? {}), ...patch }, text_style: undefined });
  const layout = holdsChildren(node);
  const textual = node.type === "text" || node.type === "button" || node.type === "ratings" || node.type === "search" || node.type === "bullets" || node.type === "countdown" || node.type === "market";
  const alignField = textual ? "text_align" : "self_align";
  const alignValue = textual ? (node.text_align ?? "start") : (node.self_align ?? null);
  // 107.3 A child of an accordion or tabs has a question or a tab name.
  const holder = node.id === props.page.body.id ? null : placeOf(props.page.body, node.id)?.parent;
  const titled = holder?.type === "accordion" || holder?.type === "tabs";
  // 112.4 A list of what was seen lately has its own title, hidden with it.
  const listTitled = (node.type === "items" && (node.recent || !!node.title)) || node.type === "market";
  return (
    <>
      {props.tablet ? (
        <div role="note" className="flex flex-col gap-1.5 rounded-lg p-2.5 text-xs" style={{ background: "#EEF1FF", color: "var(--studio-ink)" }}>
          <span className="flex items-center gap-1.5 font-bold">
            <Glyph name="tablet" size={16} />
            {t("studio.tabletEditing")}
          </span>
          <span style={{ color: "var(--studio-muted)" }}>{t("studio.tabletHint")}</span>
          {props.tablet.changed ? (
            <button type="button" onClick={props.tablet.onReset} className="h-7 self-start rounded-md bg-white px-2 font-semibold" style={{ border: "1px solid var(--studio-line)" }}>
              {t("studio.tabletReset")}
            </button>
          ) : null}
        </div>
      ) : null}
      {titled || listTitled ? (
        <label className="flex flex-col gap-1 font-bold">
          {t(listTitled && !titled ? "studio.listTitleLabel" : "studio.itemTitle")}
          <input value={titleOf(node, props.lang, props.defaultLang)} maxLength={120} onChange={(e) => onChange(withTitle(node, e.target.value, props.lang, props.defaultLang))} placeholder={props.lang === props.defaultLang ? undefined : (node.title ?? "")} className="h-9 rounded-lg px-2.5 font-normal" style={{ border: "1px solid var(--studio-line)" }} />
          <span className="text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
            {t(node.type === "market" ? "studio.marketTitleHint" : listTitled && !titled ? "studio.recentHint" : "studio.itemTitleHint")}
          </span>
        </label>
      ) : null}
      {node.type === "countdown" ? (
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.endsAt")}
          <input type="datetime-local" dir="ltr" value={localInput(node.ends_at)} onChange={(e) => e.target.value && onChange({ ends_at: new Date(e.target.value).toISOString() })} className="h-9 rounded-lg px-2.5 font-normal" style={{ border: "1px solid var(--studio-line)" }} />
        </label>
      ) : null}
      {textual && node.type !== "bullets" && node.type !== "countdown" ? (
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.text")}
          <textarea value={textOf(node, props.lang, props.defaultLang)} onChange={(e) => onChange(withText(node, e.target.value, props.lang, props.defaultLang))} rows={node.type === "text" ? 3 : 1} maxLength={2000} placeholder={node.type === "text" ? undefined : node.text ?? ""} className="rounded-lg px-2.5 py-1.5 font-normal" style={{ border: "1px solid var(--studio-line)" }} data-studio-text="" />
        </label>
      ) : null}
      {/* 130.11 A greeting's own words ({name} the person's first name) and its words without a name. */}
      {node.type === "greeting" ? (
        <div className="flex flex-col gap-2" data-greeting-words="">
          <label className="flex flex-col gap-1 font-bold">
            {t("studio.greetingWords")}
            <input value={textOf(node, props.lang, props.defaultLang)} maxLength={200} onChange={(e) => onChange(withText(node, e.target.value, props.lang, props.defaultLang))} className="h-9 rounded-lg px-2.5 font-normal" style={{ border: "1px solid var(--studio-line)" }} />
            <span className="text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
              {t("studio.greetingWordsHint", { name: "{name}" })}
            </span>
          </label>
          <label className="flex flex-col gap-1 font-bold">
            {t("studio.greetingAlone")}
            <input value={titleOf(node, props.lang, props.defaultLang)} maxLength={120} onChange={(e) => onChange(withTitle(node, e.target.value, props.lang, props.defaultLang))} className="h-9 rounded-lg px-2.5 font-normal" style={{ border: "1px solid var(--studio-line)" }} />
            <span className="text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
              {t("studio.greetingAloneHint")}
            </span>
          </label>
        </div>
      ) : null}
      {node.type === "bullets" || node.type === "countdown" ? (
        <label className="flex flex-col gap-1 font-bold">
          {t(node.type === "bullets" ? "studio.bulletLines" : "studio.endedText")}
          <textarea value={textOf(node, props.lang, props.defaultLang)} onChange={(e) => onChange(withText(node, e.target.value, props.lang, props.defaultLang))} rows={node.type === "bullets" ? 4 : 2} maxLength={2000} className="rounded-lg px-2.5 py-1.5 font-normal" style={{ border: "1px solid var(--studio-line)" }} data-studio-text="" />
          {node.type === "countdown" ? (
            <span className="text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
              {t("studio.endedTextHint")}
            </span>
          ) : null}
        </label>
      ) : null}
      {node.type === "bullets" ? (
        <div className="flex flex-col gap-2">
          <IconPicker id={`icon-${node.id}`} label={t("studio.bulletIcon")} value={node.icon ?? "check_circle"} onChange={(icon) => onChange({ icon: icon ?? undefined })} />
          <RangeField label={t("studio.iconSize")} value={node.icon_size ?? 20} min={12} max={96} step={2} unit="px" fallback={20} presets={[{ value: 16 }, { value: 24 }, { value: 32 }, { value: 48 }]} onChange={(icon_size) => onChange({ icon_size })} />
        </div>
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
      {node.type === "icon" || node.type === "button" || node.type === "live_status" ? (
        <div className="flex flex-col gap-2">
          <IconPicker id={`icon-${node.id}`} label={t("studio.icon")} value={node.icon ?? null} optional={node.type !== "icon"} onChange={(icon) => onChange({ icon: icon ?? undefined })} />
          {node.icon && node.type !== "live_status" ? <RangeField label={t("studio.iconSize")} value={node.icon_size ?? 24} min={12} max={96} step={2} unit="px" fallback={24} presets={[{ value: 16 }, { value: 24 }, { value: 32 }, { value: 48 }]} onChange={(icon_size) => onChange({ icon_size })} /> : null}
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
      {node.type === "ratings" ? <RangeField label={t("studio.stars")} value={node.rating ?? 5} min={0} max={5} step={0.5} unit="★" fallback={5} onChange={(rating) => onChange({ rating })} /> : null}
      {node.type === "form" ? <FormEditor node={node} onChange={onChange} /> : null}
      {node.type === "slider" ? (
        <div className="flex flex-col gap-2">
          <Segments
            label={t("studio.perView")}
            value={String(node.per_view ?? 1)}
            onChange={(v) => onChange({ per_view: Number(v) })}
            options={["1", "1.2", "2", "2.5", "3"].map((v) => ({ value: v, label: v }))}
          />
          <Check label={t("studio.autoplay")} checked={Boolean(node.autoplay)} onChange={(autoplay) => onChange({ autoplay: autoplay || undefined })} />
          {node.autoplay ? <RangeField label={t("studio.interval")} value={node.interval_ms ?? 4000} scale={1000} min={2} max={15} unit={t("studio.unitSeconds")} fallback={4000} onChange={(interval_ms) => onChange({ interval_ms })} /> : null}
          <Check label={t("studio.dots")} checked={node.dots !== false} onChange={(dots) => onChange({ dots: dots ? undefined : false })} />
          {node.dots !== false ? (
            <Segments
              label={t("studio.indicator")}
              value={node.indicator ?? "dots"}
              onChange={(indicator) => onChange({ indicator: indicator === "dots" ? undefined : indicator })}
              options={STUDIO_SLIDER_INDICATORS.map((v) => ({ value: v, label: t(`studio.indicator_${v}` as DashKey) }))}
            />
          ) : null}
          {/* 129.1 The open slide's photo zooming slowly; where the indicator sits, its colour and a count. */}
          <Check label={t("studio.kenBurns")} checked={Boolean(node.ken_burns)} onChange={(on) => onChange({ ken_burns: on || undefined })} />
          <IndicatorLookControls {...premiumProps(props, node)} />
          {node.children?.length ? <SlidesControl node={node} onChange={onChange} /> : null}
        </div>
      ) : null}
      {node.type === "market" ? <MarketControls node={node} onChange={onChange} /> : null}
      {node.type === "learning" ? <LearningControls node={node} onChange={onChange} /> : null}
      {node.type === "live_status" ? <LiveStatusControls node={node} onChange={onChange} /> : null}
      {node.type === "photo_hero" || node.type === "map_header" ? <CoverControls node={node} onChange={onChange} /> : null}
      {/* 128 The shade over a photo hero's photo, as over any picture. */}
      {node.type === "photo_hero" || node.type === "video_hero" || node.type === "parallax_banner" ? (
        <div className="flex flex-col gap-2">
          <ScrimFields node={node} onChange={onChange} palette={props.palette} />
        </div>
      ) : null}
      {node.type === "tracking" ? <TrackingControls node={node} onChange={onChange} /> : null}
      {/* 129 Premium motion & media. */}
      {node.type === "stories" ? <StoriesControls {...premiumProps(props, node)} /> : null}
      {node.type === "marquee" ? <MarqueeControls {...premiumProps(props, node)} /> : null}
      {node.type === "video_hero" || node.type === "parallax_banner" ? <BannerControls {...premiumProps(props, node)} /> : null}
      {node.type === "gallery" ? <GalleryControls {...premiumProps(props, node)} /> : null}
      {node.type === "before_after" ? <BeforeAfterControls {...premiumProps(props, node)} /> : null}
      {node.type === "segments" ? <SegmentsControls {...premiumProps(props, node)} /> : null}
      {/* 129.1 A photo growing slowly, again and again. */}
      {node.type === "photo_hero" || node.type === "image" || node.type === "video_hero" || node.type === "parallax_banner" ? <Check label={t("studio.pmKenBurnsLoop")} checked={Boolean(node.ken_burns)} onChange={(on) => onChange({ ken_burns: on || undefined })} /> : null}
      {node.type === "school" ? <SchoolControls node={node} onChange={onChange} /> : null}
      {/* 129.11–129.20 The premium elements, and (129.18) any layout's premium card style. */}
      <PremiumControls
        node={node}
        onChange={onChange}
        lang={props.lang}
        defaultLang={props.defaultLang}
        pickable={props.pickable}
        actionFor={(id, action, change) => <TapAction id={id} action={action} onChange={change} pages={props.pages} sources={props.sources} screens={props.screens} pickable={props.pickable} />}
      />
      {layout ? <SurfaceControls node={node} onChange={onChange} /> : null}
      {node.type === "coupon" ? (
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.couponCode")}
          <input dir="ltr" value={node.code ?? ""} maxLength={40} onChange={(e) => onChange({ code: e.target.value.replace(/\s+/g, "").toUpperCase() })} className="h-9 rounded-lg px-2.5 font-normal" style={{ border: "1px solid var(--studio-line)" }} />
          <span className="text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
            {t("studio.couponHint")}
          </span>
        </label>
      ) : null}
      {holder?.type === "stack" ? (
        <div className="flex flex-col gap-2">
          <Check label={t("studio.place")} checked={!!node.place} onChange={(on) => onChange({ place: on ? { x: 50, y: 50 } : undefined })} />
          {node.place ? (
            <>
              <RangeField label={t("studio.placeX")} value={node.place.x} min={0} max={100} unit="%" onChange={(x) => onChange({ place: { ...node.place!, x } })} />
              <RangeField label={t("studio.placeY")} value={node.place.y} min={0} max={100} unit="%" onChange={(y) => onChange({ place: { ...node.place!, y } })} />
              <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
                {t("studio.placeHint")}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
      {textual || node.type === "image" || node.type === "icon" || node.type === "video" || node.type === "map" || node.type === "form" || node.type === "slider" || node.type === "ratings" || node.type === "coupon" || holder?.type === "stack" ? <Rule /> : null}

      <Heading>{t("studio.sizePlace")}</Heading>
      <div className="grid grid-cols-2 gap-2">
        <SizeControl label={t("studio.width")} value={node.width} onChange={(width) => onChange({ width })} />
        <SizeControl label={t("studio.height")} value={node.height} onChange={(height) => onChange({ height })} />
        <SidesField label={t("studio.paddingInside")} value={node.padding} onChange={(padding) => onChange({ padding })} />
        <SidesField label={t("studio.marginOutside")} value={node.margin} onChange={(margin) => onChange({ margin })} />
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
      {node.type === "row" ? <Check label={t("studio.scrollSideways")} checked={Boolean(node.scroll)} onChange={(scroll) => onChange({ scroll: scroll || undefined })} /> : null}
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
              // 128.8 The border by night.
              ...(node.border_width ? [{ label: t("studio.border"), value: node.dark_border_color, onChange: (dark_border_color: string | null) => onChange({ dark_border_color: dark_border_color ?? undefined }) }] : []),
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
          {node.gradient ? <RangeField label={t("studio.angle")} value={node.gradient.angle ?? 180} min={0} max={360} step={5} unit="°" fallback={180} presets={[{ value: 0, label: "↑" }, { value: 90, label: "→" }, { value: 180, label: "↓" }, { value: 270, label: "←" }, { value: 135, label: "↘" }]} onChange={(angle) => onChange({ gradient: { ...node.gradient!, angle } })} /> : null}
        </div>
      </details>
      {node.image_background_url || node.overlay || (node.type === "image" && (node.image_url || node.bind === "image")) ? (
        <div className="flex flex-col gap-2">
          <Colors palette={props.palette} rows={[{ label: t("studio.overlay"), value: node.overlay?.color, onChange: (color) => onChange({ overlay: color ? { color, opacity: node.overlay?.opacity ?? 0.4 } : undefined }) }]} />
          {node.overlay ? <RangeField label={t("studio.overlayStrength")} value={node.overlay.opacity} scale={0.01} min={5} max={95} unit="%" onChange={(opacity) => onChange({ overlay: { ...node.overlay!, opacity } })} /> : null}
          <ScrimFields node={node} onChange={onChange} palette={props.palette} />
        </div>
      ) : null}
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
          <label className="flex flex-col gap-1">
            <span>{t("studio.textStyle")}</span>
            <span className="relative flex">
            <select
              value={node.text_style ?? ""}
              onChange={(e) => {
                const style = e.target.value as StudioTextStyle | "";
                onChange(style ? followStyle(style, props.textStyles) : { text_style: undefined });
              }}
              className="h-[34px] w-full cursor-pointer appearance-none rounded-lg bg-white ps-2.5 pe-7 text-[13px]"
              style={{ border: "1px solid var(--studio-line)" }}
            >
              <option value="">{t("studio.textStyleNone")}</option>
              {STUDIO_TEXT_STYLES.map((style) => (
                <option key={style} value={style}>
                  {t(`studio.ts_${style}` as DashKey)}
                </option>
              ))}
            </select>
            <Chevron />
            </span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <FontPicker key={node.id} id={`font-${node.id}`} label={t("studio.font")} value={node.font?.family ?? ""} labels={props.fontLabels} compact placeholder={t("studio.appFont")} onChange={(family) => setFont({ family: family || null })} />
            <label className="relative flex">
              <span className="sr-only">{t("studio.weight")}</span>
              <select value={node.font?.weight ?? ""} onChange={(e) => setFont({ weight: e.target.value ? (Number(e.target.value) as 400) : undefined })} className="h-[34px] w-full cursor-pointer appearance-none rounded-lg bg-white ps-2.5 pe-7 text-[13px]" style={{ border: "1px solid var(--studio-line)" }}>
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
          <RangeField label={t("studio.size")} value={node.font?.size ?? 16} min={10} max={64} unit="px" fallback={16} presets={[{ value: 12 }, { value: 14 }, { value: 16 }, { value: 20 }, { value: 24 }, { value: 32 }]} onChange={(size) => setFont({ size })} />
          <RangeField label={t("studio.lineHeight")} value={node.font?.line_height ?? 1.4} min={1} max={2.2} step={0.1} unit="×" fallback={1.4} onChange={(line_height) => setFont({ line_height })} />
          <RangeField label={t("studio.letterSpacing")} value={node.font?.letter_spacing ?? 0} min={-2} max={8} step={0.5} unit="px" fallback={0} onChange={(letter_spacing) => setFont({ letter_spacing: letter_spacing || undefined })} />
          <div className="flex gap-3">
            <Check label={t("studio.italic")} checked={Boolean(node.font?.italic)} onChange={(italic) => setFont({ italic: italic || undefined })} />
            <Check label={t("studio.underline")} checked={Boolean(node.font?.underline)} onChange={(underline) => setFont({ underline: underline || undefined })} />
          </div>
          <div className="flex gap-3">
            <Check label={t("studio.strike")} checked={Boolean(node.font?.strike)} onChange={(strike) => setFont({ strike: strike || undefined })} />
            <Check label={t("studio.uppercase")} checked={Boolean(node.font?.uppercase)} onChange={(uppercase) => setFont({ uppercase: uppercase || undefined })} />
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
      {node.corners ? (
        <div className="grid grid-cols-2 gap-2">
          {(["top_start", "top_end", "bottom_start", "bottom_end"] as const).map((corner) => (
            <Box key={corner} label={t(`studio.corner_${corner}` as DashKey)}>
              <NumberIn label={t(`studio.corner_${corner}` as DashKey)} value={node.corners?.[corner] ?? 0} max={500} onChange={(n) => onChange({ corners: { ...node.corners, [corner]: n || undefined } })} />
            </Box>
          ))}
        </div>
      ) : (
              <RangeField label={t("studio.corners")} value={Math.min(node.radius ?? 0, 999)} min={0} max={40} unit="px" fallback={0} presets={[{ value: 0 }, { value: 8 }, { value: 16 }, { value: 24 }, { value: 999, label: t("studio.pill") }]} onChange={(radius) => onChange({ radius: radius || undefined })} />
      )}
      <Check
        label={t("studio.eachCorner")}
        checked={Boolean(node.corners)}
        onChange={(on) => {
          const r = node.radius ?? 0;
          onChange(on ? { corners: { top_start: r, top_end: r, bottom_end: r, bottom_start: r } } : { corners: undefined });
        }}
      />
      <RangeField label={t("studio.rotation")} value={node.rotation ?? 0} min={-180} max={180} unit="°" fallback={0} presets={[{ value: -90 }, { value: 0 }, { value: 90 }, { value: 180 }]} onChange={(rotation) => onChange({ rotation: rotation || undefined })} />
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
      <RangeField label={t("studio.border")} value={node.border_width ?? 0} min={0} max={8} unit="px" fallback={0} onChange={(border_width) => onChange({ border_width: border_width || undefined, border_color: border_width ? (node.border_color ?? "#DDD8CC") : undefined })} />
      {node.border_width ? <Colors palette={props.palette} rows={[{ label: t("studio.border"), value: node.border_color, onChange: (border_color) => onChange({ border_color: border_color ?? undefined }) }]} /> : null}
      <RangeField label={t("studio.opacity")} value={node.opacity ?? 1} scale={0.01} min={10} max={100} unit="%" fallback={1} onChange={(o) => onChange({ opacity: o >= 1 ? undefined : o })} />

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
      {node.id !== props.page.body.id ? <Check label={t("studio.hideInApp")} checked={Boolean(node.hidden)} onChange={(hidden) => onChange({ hidden: hidden || undefined })} /> : null}
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

/** 129 What the premium elements' controls get: the element, the language being edited and the inspector's link picker. */
function premiumProps(props: Props, node: StudioNode): PremiumControlsProps {
  return {
    node,
    onChange: props.onChange,
    lang: props.lang,
    defaultLang: props.defaultLang,
    link: (id, action, onChange) => <TapAction id={id} action={action} onChange={onChange} pages={props.pages} sources={props.sources} screens={props.screens} pickable={props.pickable} />,
  };
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
          {/* 129.8 Played once when it first shows, in the app and on the canvas. */}
          <p className="m-0 text-xs" style={{ color: "var(--studio-muted)" }}>
            {t("studio.pmEnterHint")}
          </p>
          <RangeField label={t("studio.duration")} value={m.duration_ms ?? 400} scale={1000} min={0.1} max={3} step={0.1} unit={t("studio.unitSeconds")} fallback={400} onChange={(duration_ms) => set({ duration_ms: Math.round(duration_ms) })} />
          <RangeField label={t("studio.delay")} value={m.delay_ms ?? 0} scale={1000} min={0} max={5} step={0.1} unit={t("studio.unitSeconds")} fallback={0} onChange={(delay_ms) => set({ delay_ms: Math.round(delay_ms) })} />
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

/** 112.4 Every slide's words lined up, and the pictures under them darkened, at once. */
function SlidesControl({ node, onChange }: { node: StudioNode; onChange: (patch: Partial<StudioNode>) => void }) {
  const t = useDashT();
  const slides = node.children ?? [];
  const texts = (n: StudioNode): StudioNode[] => (n.type === "text" ? [n] : (n.children ?? []).flatMap(texts));
  const align = texts(slides[0]!)[0]?.text_align ?? "start";
  const pictured = slides.filter((s) => s.image_background_url || s.overlay);
  const dark = pictured[0]?.overlay?.opacity ?? 0;
  const aligned = (n: StudioNode, to: "start" | "center" | "end"): StudioNode => {
    if (n.type === "text") return { ...n, text_align: to === "start" ? undefined : to };
    if (n.type !== "column" && n.type !== "row") return n;
    return { ...n, ...(n.type === "column" ? { cross: to === "start" ? undefined : to } : {}), children: (n.children ?? []).map((c) => aligned(c, to)) };
  };
  return (
    <div className="flex flex-col gap-2">
      <Segments
        label={t("studio.slidesText")}
        value={align}
        onChange={(to) => onChange({ children: slides.map((c) => aligned(c, to)) })}
        options={[
          { value: "start" as const, label: t("studio.alignStart") },
          { value: "center" as const, label: t("studio.alignCenter") },
          { value: "end" as const, label: t("studio.alignEnd") },
        ]}
      />
      {pictured.length ? (
        <RangeField
          label={t("studio.slidesOverlay")}
          value={Math.round(dark * 100)}
          min={0}
          max={80}
          unit="%"
          fallback={0}
          onChange={(v) => onChange({ children: slides.map((c) => (c.image_background_url || c.overlay ? { ...c, overlay: v ? { color: c.overlay?.color ?? "#000000", opacity: v / 100 } : undefined } : c)) })}
        />
      ) : null}
      <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
        {t("studio.slidesHint")}
      </span>
    </div>
  );
}

function DataTab(props: Props & { node: StudioNode }) {
  const t = useDashT();
  const { node, onChange } = props;
  if (node.type === "items") {
    const q = node.query ?? { limit: 4, category_id: null, featured: false, sort: "newest" as const, ids: [] };
    const cats = (node.source ? props.pickable.categories[node.source] : undefined) ?? [];
    const sortKey: Record<string, string> = { newest: "sortNewest", popular: "sortPopular", price_asc: "sortPriceLow", price_desc: "sortPriceHigh", title: "sortTitle" };
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
        <RangeField label={t("studio.howMany")} value={q.limit} min={1} max={30} unit={t("studio.unitItems")} onChange={(limit) => onChange({ query: { ...q, limit } })} />
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
        {node.source === "products" ? (
          <>
            <Check label={t("studio.onlyOnSale")} checked={q.on_sale === true} onChange={(on) => onChange({ query: { ...q, on_sale: on || undefined } })} />
            <Check label={t("studio.recentOnly")} checked={node.recent === true} onChange={(recent) => onChange({ recent: recent || undefined })} />
            {node.recent ? (
              <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
                {t("studio.recentHint")}
              </span>
            ) : null}
          </>
        ) : null}
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
    const look = node.style ?? "chips";
    return (
      <>
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
        {/* 112.4 Chips, tiles, pictures in a grid or round pictures in a row. */}
        <Segments
          label={t("studio.categoriesLook")}
          value={look}
          onChange={(style) => onChange({ style: style === "chips" ? undefined : style, ...(style === "pictures" ? { columns: node.columns ?? 2 } : { columns: undefined }) })}
          options={[
            { value: "chips" as const, label: t("studio.catChips") },
            { value: "tiles" as const, label: t("studio.catTiles") },
            { value: "pictures" as const, label: t("studio.catPictures") },
            { value: "circles" as const, label: t("studio.catCircles") },
          ]}
        />
        {look === "pictures" ? <Segments label={t("studio.columns")} value={String(node.columns ?? 2)} onChange={(v) => onChange({ columns: Number(v) })} options={["1", "2", "3", "4"].map((v) => ({ value: v, label: v }))} /> : null}
      </>
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
              <option value="rating">{t("studio.bindRating")}</option>
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
        {/* 130.20 The header's premium style. */}
        <Rule />
        <HeaderStyleControls header={header} onChange={set} lang={props.lang} defaultLang={props.defaultLang} />
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

/**
 * 109 The bottom tabs, as in the dashboard's editor and more: each tab's
 * name (in the language being edited), icon or own picture and what it
 * opens, in order; past five, the fifth on is in the More tab. Then how the
 * bar looks: its colours, corners, the space around it, the names' font and
 * when they show, and a round button in the middle.
 */
function TabsPanel(props: Props) {
  const t = useDashT();
  const { tabs } = props;
  const style = props.tabBar ?? {};
  const setStyle = (patch: Partial<TabBarStyle>) => {
    const next: Record<string, unknown> = { ...style, ...patch };
    for (const key of Object.keys(next)) if (next[key] === undefined || next[key] === null || next[key] === 0 || next[key] === "always") delete next[key];
    props.onTabBar(Object.keys(next).length ? (next as TabBarStyle) : undefined);
  };
  const setTab = (i: number, patch: Partial<LayoutTab>) => props.onTabs(tabs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...tabs];
    const [tab] = next.splice(i, 1);
    next.splice(i + by, 0, tab!);
    props.onTabs(next);
  };
  const other = props.lang !== props.defaultLang;
  const labelOf = (tab: LayoutTab) => (other ? ((tab.translations?.[props.lang]?.label as string | undefined) ?? "") : tab.label);
  const setLabel = (i: number, label: string) => {
    const tab = tabs[i]!;
    if (!other) setTab(i, { label });
    else setTab(i, { translations: { ...tab.translations, [props.lang]: { ...tab.translations?.[props.lang], label } } });
  };
  const add = () =>
    props.onTabs([...tabs, { id: newBlockId("t"), label: t("studio.tabN", { n: tabs.length + 1 }), icon: "star", target: props.pages[0] ? { type: "page", page_slug: props.pages[0].slug } : { type: "screen", screen: (props.screens[0]?.value ?? "account") as Action["screen"] } }]);
  // The middle of the bar: a tab only when three or five show and it isn't More.
  const shown = tabs.length > LAYOUT_LIMITS.shownTabs ? LAYOUT_LIMITS.shownTabs : tabs.length;
  const middle = shown % 2 === 1 && shown >= 3 ? tabs[(shown - 1) / 2] : undefined;
  const field = "h-[34px] w-full rounded-lg bg-white px-2.5 text-[13px]";
  const line = { border: "1px solid var(--studio-line)" };
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-3.5 px-4 py-3.5">
        <p className="m-0 text-xs" style={{ color: "var(--studio-muted)" }}>
          {t("studio.tabBarHint")}
        </p>
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {tabs.map((tab, i) => (
            <li key={tab.id} data-studio-tab-edit={tab.id} className="flex flex-col gap-2 rounded-xl p-2.5" style={line}>
              <div className="flex items-center gap-1">
                <b className="flex-1">{t("studio.tabN", { n: i + 1 })}</b>
                {tabs.length > LAYOUT_LIMITS.shownTabs && i >= LAYOUT_LIMITS.shownTabs - 1 ? (
                  <span className="rounded-full px-2 py-px text-[11px]" style={{ background: "#F4EFE6" }}>
                    {t("studio.tabInMore")}
                  </span>
                ) : null}
                <button type="button" aria-label={t("studio.tabUp", { n: i + 1 })} title={t("studio.tabUp", { n: i + 1 })} disabled={i === 0} onClick={() => move(i, -1)} className="h-7 w-7 rounded-lg border-0 bg-transparent disabled:opacity-40">
                  <Glyph name="arrow_upward" size={16} />
                </button>
                <button type="button" aria-label={t("studio.tabDown", { n: i + 1 })} title={t("studio.tabDown", { n: i + 1 })} disabled={i === tabs.length - 1} onClick={() => move(i, 1)} className="h-7 w-7 rounded-lg border-0 bg-transparent disabled:opacity-40">
                  <Glyph name="arrow_downward" size={16} />
                </button>
                <button
                  type="button"
                  aria-label={t("studio.tabRemove", { n: i + 1 })}
                  title={t("studio.tabRemove", { n: i + 1 })}
                  disabled={tabs.length <= LAYOUT_LIMITS.minTabs}
                  onClick={() => props.onTabs(tabs.filter((x) => x.id !== tab.id))}
                  className="h-7 w-7 rounded-lg border-0 bg-transparent disabled:opacity-40"
                >
                  <Glyph name="delete" size={16} />
                </button>
              </div>
              <label className="flex flex-col gap-1">
                <span style={{ color: "var(--studio-muted)" }}>{t("studio.tabName")}</span>
                <input value={labelOf(tab)} placeholder={other ? tab.label : undefined} maxLength={24} onChange={(e) => setLabel(i, e.target.value)} className={field} style={line} dir={props.lang === "ar" ? "rtl" : undefined} />
              </label>
              <IconPicker id={`tab-${tab.id}-icon`} label={t("studio.tabIcon")} value={tab.icon} onChange={(icon) => setTab(i, { icon: icon ?? tab.icon })} />
              <OwnIcon
                id={`tab-${tab.id}-own-icon`}
                value={tab.icon_url}
                onChange={(icon_url) => {
                  if (icon_url) setTab(i, { icon_url });
                  else props.onTabs(tabs.map((x, j) => (j === i ? (({ icon_url: _drop, ...rest }) => (void _drop, rest))(x) : x)));
                }}
              />
              <TapAction id={`tab-${tab.id}-target`} action={tab.target} onChange={(target) => target && setTab(i, { target })} pages={props.pages} sources={props.sources} screens={props.screens} pickable={props.pickable} />
            </li>
          ))}
        </ol>
        <button type="button" disabled={tabs.length >= LAYOUT_LIMITS.maxTabs} onClick={add} className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white font-bold disabled:opacity-50" style={line}>
          <Glyph name="add" size={18} />
          {t("studio.addTab")}
        </button>
        <Rule />
        <Heading>{t("studio.tabBarLook")}</Heading>
        <div role="group" aria-label={t("studio.tabBarDesign")} className="flex flex-col gap-1.5">
          <span style={{ color: "var(--studio-muted)" }}>{t("studio.tabBarDesign")}</span>
          <div className="grid grid-cols-2 gap-1.5">
            {([undefined, ...TAB_BAR_DESIGNS] as const).map((design) => {
              const on = style.design === design;
              return (
                <button
                  key={design ?? "template"}
                  type="button"
                  aria-pressed={on}
                  data-tab-design={design ?? "template"}
                  onClick={() => setStyle({ design })}
                  className="flex flex-col items-stretch gap-1 rounded-lg bg-white p-1.5 text-start text-xs"
                  style={on ? { border: "2px solid #3D63FF", color: "#1F3FB8", fontWeight: 700 } : line}
                >
                  <TabDesignSample design={design} brand={style.active ?? props.palette[0] ?? "#3D63FF"} />
                  {t(`studio.tabDesign_${design ?? "template"}` as DashKey)}
                </button>
              );
            })}
          </div>
        </div>
        <Colors
          palette={props.palette}
          rows={[
            { label: t("studio.background"), value: style.background, onChange: (background) => setStyle({ background }) },
            { label: t("studio.tabActive"), value: style.active, onChange: (active) => setStyle({ active }) },
            { label: t("studio.tabInactive"), value: style.inactive, onChange: (inactive) => setStyle({ inactive }) },
          ]}
        />
        <details>
          <summary className="cursor-pointer">{t("studio.inDark")}</summary>
          <div className="flex flex-col gap-2.5 pt-2">
            <Colors
              palette={props.palette}
              rows={[
                { label: t("studio.background"), value: style.dark_background, onChange: (dark_background) => setStyle({ dark_background }) },
                { label: t("studio.tabActive"), value: style.dark_active, onChange: (dark_active) => setStyle({ dark_active }) },
                { label: t("studio.tabInactive"), value: style.dark_inactive, onChange: (dark_inactive) => setStyle({ dark_inactive }) },
              ]}
            />
            <p className="m-0 text-xs" style={{ color: "var(--studio-muted)" }}>
              {t("studio.tabBarDarkHint")}
            </p>
          </div>
        </details>
        <RangeField label={t("studio.tabBarRadius")} value={style.radius ?? 0} min={0} max={32} unit="px" fallback={0} onChange={(radius) => setStyle({ radius })} />
        <RangeField label={t("studio.tabBarMargin")} value={style.margin ?? 0} min={0} max={24} unit="px" fallback={0} onChange={(margin) => setStyle({ margin })} />
        <FontPicker id="tab-bar-font" label={t("studio.tabBarFont")} value={style.font ?? ""} labels={props.fontLabels} compact placeholder={t("studio.appFont")} onChange={(family) => setStyle({ font: family || null })} />
        <div role="group" aria-label={t("studio.tabLabels")} className="flex flex-col gap-1.5">
          <span style={{ color: "var(--studio-muted)" }}>{t("studio.tabLabels")}</span>
          <div className="flex gap-1">
            {TAB_LABELS.map((when) => {
              const on = (style.labels ?? "always") === when;
              return (
                <button key={when} type="button" aria-pressed={on} onClick={() => setStyle({ labels: when })} className="h-8 flex-1 rounded-lg bg-white px-1.5 text-xs" style={on ? { border: "2px solid #3D63FF", color: "#1F3FB8", fontWeight: 700 } : line}>
                  {t(`studio.tabLabels_${when}` as DashKey)}
                </button>
              );
            })}
          </div>
        </div>
        {middle ? <Check label={t("studio.tabCenter")} checked={style.center === middle.id} onChange={(on) => setStyle({ center: on ? middle.id : null })} /> : null}
        <Check label={t("studio.tabAvatar")} checked={style.avatar === true} onChange={(on) => setStyle({ avatar: on || undefined })} />
        <p className="m-0 text-xs" style={{ color: "var(--studio-muted)" }}>
          {middle ? `${t("studio.tabCenterHint")} ` : ""}
          {t("studio.tabBarApp")}
        </p>
      </div>
    </div>
  );
}

/** 119 A tiny bar in one of the designs: three tabs, the middle one open. */
function TabDesignSample({ design, brand }: { design: TabBarDesign | undefined; brand: string }) {
  const grey = "#B8B4C9";
  const box = (open: boolean, size = 9) => <span style={{ width: size, height: size, borderRadius: 3, background: open ? brand : grey }} />;
  const name = (open: boolean, colour = open ? brand : "#D6D3E0") => <span style={{ width: 10, height: 2, borderRadius: 2, background: colour }} />;
  const col = (children: ReactNode, extra: CSSProperties = {}) => <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, ...extra }}>{children}</span>;
  const tab = (open: boolean, key: number) => {
    switch (design) {
      case "pill":
      case "island":
      case "float":
        return open ? <span key={key} style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 8, background: brand }}><span style={{ width: 7, height: 7, borderRadius: 2, background: "#FFFFFF" }} /><span style={{ width: 12, height: 3, borderRadius: 2, background: "#FFFFFF" }} /></span> : <span key={key} style={{ width: 9, height: 9, borderRadius: 3, background: design === "island" ? "#6F7A75" : grey }} />;
      case "bubble":
      case "segment":
        return open ? <span key={key} style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 8, background: design === "segment" ? "#FFFFFF" : `${brand}26`, boxShadow: design === "segment" ? "0 1px 3px rgba(14,13,36,.18)" : undefined }}><span style={{ width: 7, height: 7, borderRadius: 2, background: brand }} /><span style={{ width: 12, height: 3, borderRadius: 2, background: brand }} /></span> : box(false);
      case "dot":
        return <span key={key}>{col(<>{box(open)}<span style={{ width: 3, height: 3, borderRadius: 2, background: open ? brand : "transparent" }} /></>)}</span>;
      case "line":
        return <span key={key}>{col(<>{box(open)}{name(open)}</>, { borderTop: `2px solid ${open ? brand : "transparent"}`, paddingTop: 2 })}</span>;
      case "minimal":
        return <span key={key}>{col(<>{box(open, 7)}<span style={{ width: 8, height: 2, borderRadius: 2, background: open ? brand : "#D6D3E0" }} /></>)}</span>;
      case "glass":
        return <span key={key}>{col(<><span style={{ padding: "1px 4px", borderRadius: 6, background: open ? "rgba(255,255,255,.9)" : "transparent" }}>{box(open)}</span>{name(open)}</>)}</span>;
      case "notch":
        return open ? <span key={key} style={{ width: 14, height: 14, borderRadius: "50%", background: brand, marginTop: -10, boxShadow: "0 0 0 3px #F6F4FB" }} /> : <span key={key}>{col(<>{box(false)}{name(false)}</>)}</span>;
      case "lift":
        return open ? <span key={key}>{col(<><span style={{ width: 14, height: 14, borderRadius: "50%", background: brand, marginTop: -12, border: "2px solid #FFFFFF" }} />{name(true)}</>)}</span> : <span key={key}>{col(<>{box(false)}{name(false)}</>)}</span>;
      case "outline":
        return <span key={key}>{col(<><span style={{ padding: "1px 4px", borderRadius: 6, border: `1.5px solid ${open ? brand : "transparent"}` }}>{box(open, 7)}</span>{name(open)}</>)}</span>;
      case "square":
        return <span key={key}>{col(<><span style={{ padding: 2, borderRadius: 4, background: open ? brand : "transparent" }}><span style={{ display: "block", width: 7, height: 7, borderRadius: 2, background: open ? "#FFFFFF" : grey }} /></span>{name(open)}</>)}</span>;
      case "text":
        return <span key={key} style={{ width: 16, height: 3, borderRadius: 2, background: open ? brand : grey, boxShadow: open ? `0 3px 0 -1px ${brand}` : undefined }} />;
      case "folder":
        return open ? <span key={key} style={{ alignSelf: "flex-start", marginTop: -3, padding: "4px 6px 6px", borderRadius: "6px 6px 0 0", background: "#F6F4FB" }}>{box(true)}</span> : <span key={key} style={{ width: 9, height: 9, borderRadius: 3, background: "rgba(255,255,255,.75)" }} />;
      case "drop":
        return <span key={key} style={{ position: "relative" }}>{open ? <span style={{ position: "absolute", top: -9, left: -3, width: 15, height: 5, borderRadius: "0 0 6px 6px", background: brand }} /> : null}{col(<>{box(open)}{name(open)}</>)}</span>;
      case "glow":
        return <span key={key}>{col(<><span style={{ width: 9, height: 9, borderRadius: 3, background: open ? brand : grey, boxShadow: open ? `0 0 6px ${brand}` : undefined }} />{name(open)}</>)}</span>;
      // 129 The dock: icons only, the open one a filled circle.
      case "dock":
        return open ? <span key={key} style={{ width: 14, height: 14, borderRadius: "50%", background: brand }} /> : <span key={key} style={{ width: 8, height: 8, borderRadius: 3, background: grey }} />;
      case "colours": {
        const c = ["#1F6F5C", "#B26A00", "#2F4FB5"][key] ?? brand;
        return <span key={key} style={{ width: 13, height: 13, borderRadius: "50%", background: `${c}26`, border: open ? `1.5px solid ${c}` : "1.5px solid transparent", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ width: 5, height: 5, borderRadius: 2, background: c }} /></span>;
      }
      default:
        return <span key={key}>{col(<><span style={{ padding: "1px 4px", borderRadius: 6, background: open ? `${brand}22` : "transparent" }}>{box(open)}</span>{name(open)}</>)}</span>;
    }
  };
  const track: CSSProperties =
    design === "island"
      ? { margin: "0 14px", borderRadius: 999, background: "#121614" }
      : design === "dock"
        ? { margin: "0 22px", borderRadius: 999, background: "#FFFFFF", boxShadow: "0 3px 8px rgba(0,0,0,.18)" }
      : design === "float"
        ? { margin: "0 4px", borderRadius: 9, background: "#2A1810", boxShadow: "0 3px 8px rgba(0,0,0,.18)" }
      : design === "segment"
        ? { margin: "0 4px", borderRadius: 8, background: "#E3E7E5" }
        : design === "folder"
          ? { background: brand }
          : design === "glass"
            ? { margin: "0 4px", borderRadius: 10, background: "linear-gradient(120deg,#F2B544,#E2623A 45%,#1F6F5C)" }
            : { background: "#F6F4FB" };
  return (
    <span aria-hidden="true" style={{ display: "flex", justifyContent: "space-around", alignItems: "center", height: 26, borderRadius: 7, overflow: "visible", ...track }}>
      {[0, 1, 2].map((i) => tab(i === 1, i))}
    </span>
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
        {/* 120 The app's own screen under the page's elements. */}
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.pageScreen")}
          <select
            value={props.page.screen ?? ""}
            onChange={(e) => {
              const screen = (e.target.value || undefined) as StudioPage["screen"];
              // The header lying over the page can't lie over a screen.
              props.onPage({ screen, ...(screen && props.page.header?.type === "transparent" ? { header: { ...props.page.header, type: "title_search" } } : {}) });
            }}
            className="h-9 rounded-lg px-2 font-normal"
            style={{ border: "1px solid var(--studio-line)" }}
          >
            <option value="">{t("studio.pageScreenNone")}</option>
            {props.pageScreens.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
          </select>
          <span className="text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
            {t("studio.pageScreenHint")}
          </span>
        </label>
        {/* 130.21 The look of the app's system screens, for the whole project. */}
        {props.system ? <SystemLookControl look={props.system.look} onLook={props.system.onLook} busy={props.system.busy} /> : null}
        <p className="m-0 text-xs" style={{ color: "var(--studio-muted)" }}>
          {t("studio.keyboard")}
        </p>
      </div>
    </div>
  );
}

/** 115.14 A marketplace section: which one, and for the places, how many, which and in what order. */
/** 123 Which of the student's cards a `learning` element is. */
function LearningControls({ node, onChange }: { node: StudioNode; onChange: (patch: Partial<StudioNode>) => void }) {
  const t = useDashT();
  type Learning = NonNullable<StudioNode["learning"]>;
  const style = node.learning?.style ?? "card";
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 font-bold">
        {t("studio.learningSection")}
        <select
          value={node.learning?.section ?? "continue"}
          onChange={(e) => onChange({ learning: { section: e.target.value as Learning["section"], ...(style === "photo" ? { style } : {}) } })}
          className="h-9 rounded-lg px-2 font-normal"
          style={{ border: "1px solid var(--studio-line)" }}
        >
          {STUDIO_LEARNING_SECTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`studio.learning_${s}` as DashKey)}
            </option>
          ))}
        </select>
        <span className="text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
          {t("studio.learningHint")}
        </span>
      </label>
      {/* 128.8 On a photo, as the approved academy home draws them. */}
      <label className="flex flex-col gap-1 font-bold">
        {t("studio.learningStyle")}
        <select
          value={style}
          onChange={(e) => onChange({ learning: { section: node.learning?.section ?? "continue", ...(e.target.value === "photo" ? { style: "photo" as const } : {}) } })}
          className="h-9 rounded-lg px-2 font-normal"
          style={{ border: "1px solid var(--studio-line)" }}
        >
          {STUDIO_LEARNING_STYLES.map((s) => (
            <option key={s} value={s}>
              {t(`studio.learningStyle_${s}` as DashKey)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** 128 A shade over the element's picture (an image, a background picture, a photo hero's photo), darker at its ends, so words on it read. */
function ScrimFields({ node, onChange, palette }: { node: StudioNode; onChange: (patch: Partial<StudioNode>) => void; palette: string[] }) {
  const t = useDashT();
  return (
    <>
      <Colors palette={palette} rows={[{ label: t("studio.scrim"), value: node.scrim?.color, onChange: (color) => onChange({ scrim: color ? { ...(node.scrim ?? SCRIM_DEFAULT), color } : undefined }) }]} />
      {node.scrim ? (
        <>
          <RangeField label={t("studio.scrimFrom")} value={node.scrim.from} scale={0.01} min={0} max={95} unit="%" onChange={(from) => onChange({ scrim: { ...node.scrim!, from } })} />
          <RangeField label={t("studio.scrimTo")} value={node.scrim.to} scale={0.01} min={0} max={95} unit="%" onChange={(to) => onChange({ scrim: { ...node.scrim!, to } })} />
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={node.scrim.angle === 90} onChange={(e) => onChange({ scrim: { ...node.scrim!, angle: e.target.checked ? 90 : undefined } })} />
            {t("studio.scrimAcross")}
          </label>
        </>
      ) : null}
    </>
  );
}

/** 128 Which part of the family's school day a `school` element is. */
function SchoolControls({ node, onChange }: { node: StudioNode; onChange: (patch: Partial<StudioNode>) => void }) {
  const t = useDashT();
  return (
    <label className="flex flex-col gap-1 font-bold">
      {t("studio.schoolSection")}
      <select value={node.school?.section ?? "today"} onChange={(e) => onChange({ school: { section: e.target.value as NonNullable<StudioNode["school"]>["section"] } })} className="h-9 rounded-lg px-2 font-normal" style={{ border: "1px solid var(--studio-line)" }}>
        {STUDIO_SCHOOL_SECTIONS.map((s) => (
          <option key={s} value={s}>
            {t(`studio.school_${s}` as DashKey)}
          </option>
        ))}
      </select>
      <span className="text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
        {t("studio.schoolHint")}
      </span>
    </label>
  );
}

/** 128 Whose order a live order card follows. */
function LiveStatusControls({ node, onChange }: { node: StudioNode; onChange: (patch: Partial<StudioNode>) => void }) {
  const t = useDashT();
  return (
    <label className="flex flex-col gap-1 font-bold">
      {t("studio.liveSource")}
      <select value={node.live_status?.source ?? "food_order"} onChange={(e) => onChange({ live_status: { source: e.target.value as NonNullable<StudioNode["live_status"]>["source"] } })} className="h-9 rounded-lg px-2 font-normal" style={{ border: "1px solid var(--studio-line)" }}>
        {STUDIO_LIVE_SOURCES.map((s) => (
          <option key={s} value={s}>
            {t(`studio.live_${s}` as DashKey)}
          </option>
        ))}
      </select>
      <span className="text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
        {t("studio.liveHint")}
      </span>
    </label>
  );
}

function MarketControls({ node, onChange }: { node: StudioNode; onChange: (patch: Partial<StudioNode>) => void }) {
  const t = useDashT();
  const market: StudioMarket = node.market ?? { section: "vendors" };
  const set = (patch: Partial<StudioMarket>) => onChange({ market: { ...market, ...patch } });
  const setCard = (patch: Partial<NonNullable<StudioMarket["card"]>>) => {
    const card = { ...(market.card ?? {}), ...patch };
    if (card.radius === undefined) delete card.radius;
    if (!card.hide?.length) delete card.hide;
    set({ card: card.radius !== undefined || card.hide ? card : undefined });
  };
  const places = market.section === "vendors" || market.section === "offers";
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-1 font-bold">
        {t("studio.marketSection")}
        <select value={market.section} onChange={(e) => onChange({ market: { section: e.target.value as StudioMarket["section"] } })} className="h-9 rounded-lg px-2 font-normal" style={{ border: "1px solid var(--studio-line)" }}>
          {STUDIO_MARKET_SECTIONS.map((s) => (
            <option key={s} value={s}>
              {t(`studio.market_${s}` as DashKey)}
            </option>
          ))}
        </select>
        <span className="text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
          {t("studio.marketHint")}
        </span>
      </label>
      {market.section === "address" ? (
        // 128 The big greeting with the search, or a flat bar with the soonest delivery time.
        <Segments label={t("studio.marketStyle")} value={market.style === "bar" ? "bar" : "cards"} onChange={(style) => set({ style: style === "bar" ? "bar" : undefined })} options={(["cards", "bar"] as const).map((v) => ({ value: v, label: t(v === "bar" ? "studio.marketStyle_bar" : "studio.marketStyle_hero") }))} />
      ) : null}
      {places ? (
        <>
          <Segments label={t("studio.marketStyle")} value={market.style ?? "cards"} onChange={(style) => set({ style: style === "cards" ? undefined : style })} options={STUDIO_MARKET_STYLES.filter((v) => v !== "bar").map((v) => ({ value: v, label: t(`studio.marketStyle_${v}` as DashKey) }))} />
          <Segments label={t("studio.marketKind")} value={market.kind ?? "all"} onChange={(kind) => set({ kind: kind === "all" ? undefined : kind })} options={STUDIO_MARKET_KINDS.map((v) => ({ value: v, label: t(`studio.marketKind_${v}` as DashKey) }))} />
          <label className="flex flex-col gap-1 font-bold">
            {t("studio.marketSort")}
            <select value={market.sort ?? "recommended"} onChange={(e) => set({ sort: e.target.value === "recommended" ? undefined : (e.target.value as StudioMarket["sort"]) })} className="h-9 rounded-lg px-2 font-normal" style={{ border: "1px solid var(--studio-line)" }}>
              {STUDIO_MARKET_SORTS.map((s) => (
                <option key={s} value={s}>
                  {t(`studio.marketSort_${s}` as DashKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-bold">
            {t("studio.marketTag")}
            <input value={market.tag ?? ""} maxLength={60} onChange={(e) => set({ tag: e.target.value.trim() ? e.target.value : undefined })} className="h-9 rounded-lg px-2.5 font-normal" style={{ border: "1px solid var(--studio-line)" }} />
            <span className="text-xs font-normal" style={{ color: "var(--studio-muted)" }}>
              {t("studio.marketTagHint")}
            </span>
          </label>
          <Check label={t("studio.marketFree")} checked={market.free_delivery === true} onChange={(on) => set({ free_delivery: on ? true : undefined })} />
          <RangeField label={t("studio.marketLimit")} value={market.limit ?? 10} min={1} max={40} unit={t("studio.unitItems")} fallback={10} onChange={(limit) => set({ limit: limit === 10 ? undefined : limit })} />
          {/* Editor audit 3.4: each place's card, its corners and the facts it shows. */}
          <span className="mt-1 font-bold">{t("studio.marketCard")}</span>
          <RangeField
            label={t("studio.corners")}
            value={market.card?.radius ?? 24}
            min={0}
            max={32}
            unit="px"
            fallback={24}
            presets={[{ value: 0 }, { value: 12 }, { value: 24 }, { value: 32 }]}
            onChange={(radius) => setCard({ radius: radius === 24 ? undefined : radius })}
          />
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {STUDIO_MARKET_CARD_FACTS.map((fact) => (
              <Check
                key={fact}
                label={t(`studio.marketFact_${fact}` as DashKey)}
                checked={!(market.card?.hide ?? []).includes(fact)}
                onChange={(on) => {
                  const hide = (market.card?.hide ?? []).filter((f) => f !== fact);
                  setCard({ hide: on ? (hide.length ? hide : undefined) : [...hide, fact] });
                }}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
