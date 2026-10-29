"use client";

import type { CSSProperties, DragEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import type { LanguageCode } from "@/lib/pages/types";
import { resized } from "@/lib/studio/resize";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import type { LayoutTab, StudioHeader, StudioNode, StudioPage, StudioSides, StudioSize, TabBarStyle } from "@/lib/pages/types";
import { splitTabs } from "@/lib/pages/tab-bar";

/**
 * 103R A Studio page drawn in the editor's phone, as the app draws it: rows,
 * columns, layers, grids and sliders; texts, pictures, buttons, lists from
 * the data and the rest; light or dark; in the language being edited. In the
 * editor every element can be pointed at, selected and dropped into.
 */

export interface StudioLook {
  name: string;
  logoUrl: string | null;
  brand: string;
  font: string;
  tabs: LayoutTab[];
  /** The tab whose page this is, highlighted. */
  activeTab: string | null;
  /** 109 How the bottom tabs look; missing, the usual bar. */
  tabBar?: TabBarStyle;
  /** 109 The More tab's name, with more than five tabs. */
  moreLabel?: string;
}

export interface StudioEditing {
  selectedId: string | null;
  hoveredId: string | null;
  /** Where a dragged element would land: inside `parentId`, before its child at `index`. */
  drop: { parentId: string; index: number } | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onDragOver: (e: DragEvent, node: StudioNode) => void;
  onDrop: (e: DragEvent) => void;
  onDragStartNode: (e: DragEvent, id: string) => void;
  dropLabel: string;
  /** Labels on the selected element ("Header · type 3"). */
  tagOf: (node: StudioNode) => string;
  /** 108.1 A corner of the selection dragged: the element's new size; `drag` is the same for one drag (one undo step). */
  onResize?: (id: string, size: { width?: StudioSize; height?: StudioSize }, drag: number) => void;
}

interface ViewProps {
  page: StudioPage;
  lang: LanguageCode;
  defaultLang: LanguageCode;
  dark: boolean;
  look: StudioLook;
  pickable: Pickable;
  editing?: StudioEditing;
  /** Labels for the placeholders, in the dashboard's language. */
  words: { price: string; addPicture: string; addVideo: string; send: string; search: string; days: string; hours: string; minutes: string; seconds: string };
}

const SHADOWS: Record<string, string> = {
  light: "0 2px 6px rgba(14,13,36,0.10)",
  medium: "0 6px 14px rgba(14,13,36,0.22)",
  strong: "0 14px 30px rgba(14,13,36,0.30)",
};

function sides(s: StudioSides | undefined, prop: "padding" | "margin"): CSSProperties {
  if (!s) return {};
  return {
    [`${prop}Top`]: s.top ?? 0,
    [`${prop}InlineEnd`]: s.end ?? 0,
    [`${prop}Bottom`]: s.bottom ?? 0,
    [`${prop}InlineStart`]: s.start ?? 0,
  } as CSSProperties;
}

const JUSTIFY: Record<string, CSSProperties["justifyContent"]> = { start: "flex-start", center: "center", end: "flex-end", between: "space-between", around: "space-around" };
const ITEMS: Record<string, CSSProperties["alignItems"]> = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };

/** The text in the language being edited (the default one's when not translated). */
export function textIn(node: { text?: string | null; translations?: Record<string, Record<string, unknown>> }, lang: string, def: string): string {
  if (lang !== def) {
    const t = node.translations?.[lang]?.text;
    if (typeof t === "string" && t) return t;
  }
  return node.text ?? "";
}

/** 107.3 A question's or a tab's name in the language being edited. */
function titleIn(node: StudioNode, lang: string, def: string): string {
  if (lang !== def) {
    const t = node.translations?.[lang]?.title;
    if (typeof t === "string" && t) return t;
  }
  return node.title ?? "";
}

/** 107.3 What is left until `ends`: days, hours, minutes and seconds, or null once the time is up. */
export function timeLeft(ends: string | null | undefined, now: number): [number, number, number, number] | null {
  const left = Math.floor(((ends ? Date.parse(ends) : NaN) - now) / 1000);
  if (!(left > 0)) return null;
  return [Math.floor(left / 86_400), Math.floor(left / 3600) % 24, Math.floor(left / 60) % 60, left % 60];
}

function sizeStyle(size: StudioSize | undefined, axis: "width" | "height", parentDir: Dir): CSSProperties {
  if (typeof size === "number") return { [axis]: size, flexShrink: 0 } as CSSProperties;
  // 107.2 In a row that scrolls sideways, each child keeps its own width.
  if (parentDir === "scroll" && axis === "width") return { flex: "0 0 auto" };
  const along = (parentDir === "row" && axis === "width") || (parentDir === "column" && axis === "height");
  // Across the parent, stretching keeps the margins inside it (100% would add them).
  if (size === "fill") return along ? { flex: "1 1 0", minWidth: 0, minHeight: 0 } : { alignSelf: "stretch", minWidth: 0 };
  if (size === "hug") return along ? { flex: "0 0 auto" } : { [axis]: "auto", alignSelf: axis === "width" ? "auto" : undefined };
  return {};
}

export function StudioView(props: ViewProps) {
  const { page, dark, look } = props;
  const bg = (dark ? (page.dark_background ?? page.background) : page.background) ?? (dark ? "#14121F" : "#FBF8F2");
  const rtl = props.lang === "ar";
  const showTabs = page.show_tabs !== false && look.tabs.length > 0;
  return (
    <div dir={rtl ? "rtl" : "ltr"} style={{ display: "flex", flexDirection: "column", minHeight: "100%", background: bg, color: dark ? "#F4EFE6" : "#0E0D24", fontFamily: `'${look.font}', 'Cairo', system-ui, sans-serif` }}>
      {page.header ? <Header header={page.header} {...props} /> : null}
      <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column" }}>
        <Node node={page.body} parentDir="column" {...props} />
      </div>
      {showTabs ? <Tabs {...props} /> : null}
    </div>
  );
}

function Header(props: ViewProps & { header: StudioHeader }) {
  const { header, look, dark, editing } = props;
  const background = (dark ? (header.dark_background ?? header.background) : header.background) ?? look.brand;
  const color = (dark ? (header.dark_color ?? header.color) : header.color) ?? "#FFFFFF";
  const title = (props.lang !== props.defaultLang ? (header.translations?.[props.lang]?.title as string | undefined) : undefined) ?? header.title ?? look.name;
  const buttons = header.buttons ?? [];
  const icons: Record<string, string> = { menu: "menu", search: "search", cart: "shopping_bag", notifications: "notifications", chat: "chat", account: "account_circle" };
  const logo = header.logo_url ?? look.logoUrl;
  const brandMark = logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" style={{ height: 28, maxWidth: 120, objectFit: "contain" }} />
  ) : (
    <span style={{ fontWeight: 800, fontSize: 16 }}>{title}</span>
  );
  const selected = editing?.selectedId === "header";
  const wrap: CSSProperties = {
    position: "relative",
    margin: header.type === "transparent" ? "0" : "30px 10px 0",
    padding: "10px 12px",
    borderRadius: 16,
    background: header.type === "transparent" ? "transparent" : background,
    color,
    display: "flex",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    outline: selected ? "1.5px dashed #6C8BFF" : undefined,
    outlineOffset: 2,
    cursor: editing ? "pointer" : undefined,
    ...(header.type === "transparent" ? { position: "absolute", insetInline: 10, top: 30, zIndex: 2 } : {}),
  };
  const icon = (name: string) => (
    <span key={name} className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 22 }}>
      {icons[name]}
    </span>
  );
  return (
    <div style={wrap} onClick={editing ? (e) => (e.stopPropagation(), editing.onSelect("header")) : undefined} data-studio-header={header.type}>
      {header.type === "logo_center" ? (
        <>
          {buttons.includes("menu") ? icon("menu") : <span style={{ width: 22 }} />}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>{brandMark}</div>
          {buttons.filter((b) => b !== "menu").slice(0, 1).map(icon)}
        </>
      ) : header.type === "title_search" ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 18 }}>{title}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, borderRadius: 10, background: "rgba(255,255,255,0.18)", padding: "6px 10px", fontSize: 13, opacity: 0.9 }}>
            <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 18 }}>
              search
            </span>
            {props.words.search}
          </span>
        </div>
      ) : (
        <>
          {buttons.includes("menu") ? icon("menu") : null}
          <div style={{ flex: 1, display: "flex", justifyContent: header.type === "logo_actions" ? "center" : "flex-start" }}>{brandMark}</div>
          {buttons.filter((b) => b !== "menu").map(icon)}
        </>
      )}
      {selected && editing ? <Tag text={editing.tagOf({ id: "header", type: "row" })} /> : null}
    </div>
  );
}

/**
 * The bottom tabs as the app draws them: 109 up to five, else four and More;
 * in the owner's colours, corners and font, floating or across the bottom,
 * names under every tab, the open one's or none, and a tab in the middle
 * as a raised round button. In the editor a tap selects the bar.
 */
function Tabs({ look, dark, lang, defaultLang, editing }: ViewProps) {
  const style = look.tabBar ?? {};
  const { shown, more } = splitTabs(look.tabs);
  const tabs: (LayoutTab | null)[] = more.length ? [...shown, null] : shown;
  const background = (dark ? (style.dark_background ?? style.background) : style.background) ?? (dark ? "#22203A" : "#FFFFFF");
  const activeColour = style.active ?? look.brand;
  const inactiveColour = style.inactive ?? (dark ? "#A7A3C2" : "#5E5B70");
  const labels = style.labels ?? "always";
  const middle = tabs.length % 2 === 1 && tabs.length >= 3 ? (tabs.length - 1) / 2 : -1;
  const center = middle >= 0 && style.center && tabs[middle]?.id === style.center ? middle : -1;
  const margin = style.margin ?? 0;
  const radius = style.radius ?? 0;
  const selected = editing?.selectedId === "tabs";
  return (
    <div
      data-studio-tabs=""
      onClick={editing ? (e) => (e.stopPropagation(), editing.onSelect("tabs")) : undefined}
      style={{
        position: "relative",
        // The usual bar sits a little in from the phone's edges.
        margin: margin ? `0 ${margin}px ${margin}px` : "0 10px 12px",
        padding: "8px 6px",
        borderRadius: margin ? radius : radius || 18,
        background,
        boxShadow: "0 -2px 10px rgba(14,13,36,0.08)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        fontSize: 10,
        fontFamily: style.font ? `'${style.font}', inherit` : undefined,
        color: inactiveColour,
        outline: selected ? "1.5px dashed #6C8BFF" : undefined,
        outlineOffset: 2,
        cursor: editing ? "pointer" : undefined,
      }}
    >
      {tabs.map((tab, i) => {
        const label = tab ? ((lang !== defaultLang ? (tab.translations?.[lang]?.label as string | undefined) : undefined) ?? tab.label) : (look.moreLabel ?? "More");
        const active = tab ? tab.id === look.activeTab : false;
        const icon = tab ? tab.icon : "apps";
        const glyph = tab?.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tab.icon_url} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
        ) : (
          <span className="material-symbols-rounded" aria-hidden="true">
            {icon}
          </span>
        );
        if (i === center) {
          return (
            <div key={tab?.id ?? "more"} data-studio-tab-center="" title={label} style={{ display: "flex", flex: 1, justifyContent: "center" }}>
              <span style={{ marginTop: -26, width: 50, height: 50, borderRadius: "50%", background: activeColour, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(14,13,36,0.25)" }}>{glyph}</span>
            </div>
          );
        }
        const showLabel = labels === "always" || (labels === "active" && active);
        return (
          <div key={tab?.id ?? "more"} data-studio-tab={tab ? tab.id : "more"} title={label} style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", minWidth: 0, color: active ? activeColour : undefined, fontWeight: active ? 700 : 400 }}>
            {glyph}
            {showLabel ? <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span> : null}
          </div>
        );
      })}
      {selected && editing ? <Tag text={editing.tagOf({ id: "tabs", type: "row" })} /> : null}
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return <span style={{ position: "absolute", top: -22, insetInlineEnd: 0, background: "#6C8BFF", color: "#FFFFFF", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap", zIndex: 5 }}>{text}</span>;
}

/** The layout an element sits in; `scroll` a row that scrolls sideways (107.2). */
type Dir = "row" | "scroll" | "column" | "stack" | "grid" | "slider" | null;

/** 107.2 A colour with its strength, for CSS. */
function tint(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
}

/** 107.2 Each corner on its own (logical corners), else the one radius. */
function cornersStyle(node: StudioNode): CSSProperties {
  const k = node.corners;
  if (!k) return { borderRadius: node.radius };
  return { borderStartStartRadius: k.top_start ?? 0, borderStartEndRadius: k.top_end ?? 0, borderEndEndRadius: k.bottom_end ?? 0, borderEndStartRadius: k.bottom_start ?? 0 };
}

function Node(props: ViewProps & { node: StudioNode; parentDir: Dir }) {
  const { node, dark, editing, lang, defaultLang, look, parentDir } = props;
  // 107.2 A hidden element shows only in the editor, faded.
  if (node.hidden && !editing) return null;
  const overlay = node.overlay ? tint(node.overlay.color, node.overlay.opacity) : null;
  const decoration = [node.font?.underline ? "underline" : "", node.font?.strike ? "line-through" : ""].filter(Boolean).join(" ");
  const background = (dark ? (node.dark_background ?? node.background) : node.background) ?? undefined;
  const color = (dark ? (node.dark_color ?? node.color) : node.color) ?? undefined;
  const style: CSSProperties = {
    position: "relative",
    boxSizing: "border-box",
    ...sides(node.padding, "padding"),
    ...sides(node.margin, "margin"),
    ...sizeStyle(node.width ?? (parentDir === "column" || parentDir === "stack" ? "fill" : undefined), "width", parentDir),
    ...sizeStyle(node.height, "height", parentDir),
    minHeight: node.min_height,
    aspectRatio: node.aspect_ratio ?? undefined,
    background: node.gradient ? `linear-gradient(${node.gradient.angle ?? 180}deg, ${node.gradient.from}, ${node.gradient.to})` : background,
    backgroundImage: node.image_background_url ? `${overlay ? `linear-gradient(${overlay}, ${overlay}), ` : ""}url("${node.image_background_url}")` : undefined,
    backgroundSize: node.image_background_url ? "cover" : undefined,
    backgroundPosition: "center",
    color,
    ...cornersStyle(node),
    transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
    border: node.border_width && node.border_color ? `${node.border_width}px solid ${node.border_color}` : undefined,
    boxShadow: node.shadow && node.shadow !== "none" ? SHADOWS[node.shadow] : undefined,
    opacity: node.opacity,
    fontFamily: node.font?.family ? `'${node.font.family}', '${look.font}', sans-serif` : undefined,
    fontWeight: node.font?.weight,
    fontSize: node.font?.size,
    lineHeight: node.font?.line_height,
    letterSpacing: node.font?.letter_spacing,
    fontStyle: node.font?.italic ? "italic" : undefined,
    textDecoration: decoration || undefined,
    textTransform: node.font?.uppercase ? "uppercase" : undefined,
    textAlign: node.text_align === "center" ? "center" : node.text_align === "end" ? "end" : undefined,
    alignSelf: node.self_align ? ITEMS[node.self_align] : undefined,
    overflow: node.radius || node.corners ? "hidden" : undefined,
  };
  if (parentDir === "stack") Object.assign(style, { gridArea: "1 / 1", justifySelf: node.self_align ? ITEMS[node.self_align] : "stretch", alignSelf: node.self_align ? ITEMS[node.self_align] : "stretch" });
  if (parentDir === "slider") Object.assign(style, { scrollSnapAlign: "start", flex: "0 0 auto" });

  const selected = editing?.selectedId === node.id;
  const hovered = editing?.hoveredId === node.id && !selected;
  if (editing) {
    style.outline = selected ? "2px solid #3D63FF" : hovered || node.hidden ? "1.5px dashed #6C8BFF" : undefined;
    if (node.hidden) style.opacity = 0.35;
    style.outlineOffset = selected ? 3 : 2;
    style.cursor = "pointer";
  }
  const handlers = editing
    ? {
        onClick: (e: MouseEvent) => {
          e.stopPropagation();
          editing.onSelect(node.id);
        },
        onMouseOver: (e: MouseEvent) => {
          e.stopPropagation();
          editing.onHover(node.id);
        },
        onDragOver: (e: DragEvent) => editing.onDragOver(e, node),
        onDrop: (e: DragEvent) => editing.onDrop(e),
        draggable: node.id !== props.page.body.id,
        onDragStart: (e: DragEvent) => {
          e.stopPropagation();
          editing.onDragStartNode(e, node.id);
        },
      }
    : {};
  const content = Content(props);
  return (
    <div style={{ ...style, ...layoutStyle(node) }} data-studio-node={node.id} {...handlers}>
      {content}
      {selected && editing ? (
        <>
          {(["top", "bottom"] as const).flatMap((v) =>
            (["insetInlineStart", "insetInlineEnd"] as const).map((h) => <Corner key={`${v}${h}`} v={v} h={h} rtl={lang === "ar"} id={node.id} onResize={node.id === props.page.body.id ? undefined : editing.onResize} />),
          )}
          <SizeBadge id={node.id} />
          <Tag text={editing.tagOf(node)} />
        </>
      ) : null}
    </div>
  );

  function Content(p: ViewProps & { node: StudioNode }) {
    const n = p.node;
    const text = textIn(n, lang, defaultLang);
    switch (n.type) {
      case "row":
      case "column":
      case "stack":
      case "grid":
      case "slider":
        return Children(p);
      case "spacer":
        return null;
      case "text":
        return <span style={{ display: "block", whiteSpace: "pre-wrap", WebkitLineClamp: n.max_lines ?? undefined, overflow: n.max_lines ? "hidden" : undefined }}>{text}</span>;
      case "button":
        return (
          <span style={{ display: "flex", alignItems: "center", justifyContent: n.text_align === "start" ? "flex-start" : n.text_align === "end" ? "flex-end" : "center", gap: 8, height: "100%", flexDirection: n.icon_position === "start" ? "row" : "row-reverse", minHeight: 40, paddingInline: n.padding ? 0 : 16 }}>
            {n.icon ? (
              <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: n.icon_size ?? 20 }}>
                {n.icon}
              </span>
            ) : null}
            <span>{text}</span>
          </span>
        );
      case "icon":
        return (
          <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: n.icon_size ?? 24, display: "block" }}>
            {n.icon}
          </span>
        );
      case "image":
        return n.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <>
            <img src={n.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: n.fit ?? "cover", display: "block" }} />
            {overlay ? <span aria-hidden="true" data-studio-overlay="" style={{ position: "absolute", inset: 0, background: overlay }} /> : null}
          </>
        ) : (
          <Placeholder icon="image" text={p.words.addPicture} />
        );
      case "video":
        return <Placeholder icon="play_circle" text={n.video_url ? "" : p.words.addVideo} dark />;
      case "map":
        return <Placeholder icon="location_on" text={n.map?.label ?? ""} map />;
      case "ratings":
        return (
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span style={{ color: "#E8B04B", letterSpacing: 1 }}>{"★★★★★".slice(0, Math.round(n.rating ?? 5))}</span>
            {text}
          </span>
        );
      case "search":
        return (
          <span style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid rgba(94,91,112,0.35)", borderRadius: "inherit", padding: "8px 12px", fontSize: 13, opacity: 0.8 }}>
            <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 18 }}>
              search
            </span>
            {text || p.words.search}
          </span>
        );
      case "divider":
        return null;
      case "accordion":
      case "tabs":
        return Children(p);
      case "countdown": {
        const left = timeLeft(n.ends_at, Date.now());
        if (!left) return <span style={{ display: "block", textAlign: "center" }}>{text}</span>;
        const units = [p.words.days, p.words.hours, p.words.minutes, p.words.seconds];
        return (
          // Days on the left in every language, like a clock.
          <span dir="ltr" style={{ display: "flex", gap: 8 }} data-studio-countdown="">
            {left.map((value, i) => (
              <span key={i} style={{ flex: "1 1 0", display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 4px", borderRadius: 10, background: "rgba(127,127,127,0.14)" }}>
                <span style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{String(value).padStart(2, "0")}</span>
                <span style={{ fontSize: 11, opacity: 0.75 }}>{units[i]}</span>
              </span>
            ))}
          </span>
        );
      }
      case "bullets":
        return (
          <span style={{ display: "flex", flexDirection: "column", gap: n.gap ?? 8 }}>
            {text
              .split("\n")
              .filter((line) => line.trim())
              .map((line, i) => (
                <span key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: n.icon_size ?? 20, color: n.color ? undefined : look.brand, flex: "none" }}>
                    {n.icon ?? "check_circle"}
                  </span>
                  <span>{line}</span>
                </span>
              ))}
          </span>
        );
      case "categories": {
        const cats = (n.source ? p.pickable.categories[n.source] : undefined) ?? [];
        const names = cats.length ? cats.slice(0, 6).map((c) => c.name) : ["[1]", "[2]", "[3]"];
        return (
          <span style={{ display: "flex", gap: 6, fontSize: 12, overflow: "hidden" }}>
            {names.map((name, i) => (
              <span key={i} style={{ background: i === 0 ? look.brand : dark ? "#2A2742" : "#EFE8D8", color: i === 0 ? "#FFFFFF" : undefined, padding: "5px 12px", borderRadius: 999, fontWeight: i === 0 ? 700 : 400, whiteSpace: "nowrap" }}>
                {name}
              </span>
            ))}
          </span>
        );
      }
      case "items":
        return Items(p);
      case "form":
        return (
          <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(n.form?.fields ?? []).map((f) => (
              <span key={f.id} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
                {f.label}
                <span style={{ height: 34, borderRadius: 10, border: "1px solid rgba(94,91,112,0.35)", background: dark ? "#22203A" : "#FFFFFF" }} />
              </span>
            ))}
            <span style={{ height: 40, borderRadius: 12, background: look.brand, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14 }}>{n.form?.submit_label ?? p.words.send}</span>
          </span>
        );
    }
  }

  function Children(p: ViewProps & { node: StudioNode }) {
    const n = p.node;
    const dir: Dir = n.type === "row" && n.scroll ? "scroll" : n.type === "accordion" || n.type === "tabs" ? "column" : n.type === "row" || n.type === "column" || n.type === "stack" || n.type === "grid" || n.type === "slider" ? n.type : null;
    const kids = n.children ?? [];
    const drop = editing?.drop?.parentId === n.id ? editing.drop.index : null;
    const out: ReactNode[] = [];
    // 107.3 Tabs show the tab holding what's selected (the first otherwise); every question of an accordion shows open here, to be edited.
    const inside = (child: StudioNode, id: string | null | undefined): boolean => !!id && (child.id === id || (child.children ?? []).some((c) => inside(c, id)) || (!!child.card && inside(child.card, id)));
    const shownTab = n.type === "tabs" ? Math.max(0, kids.findIndex((c) => inside(c, editing?.selectedId) || inside(c, editing?.hoveredId))) : -1;
    if (n.type === "tabs") {
      out.push(
        <span key="tabbar" role="presentation" style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
          {kids.map((child, i) => (
            <span
              key={child.id}
              onClick={editing ? (e) => (e.stopPropagation(), editing.onSelect(child.id)) : undefined}
              style={{ padding: "6px 14px", borderRadius: 999, whiteSpace: "nowrap", fontSize: 13, fontWeight: i === shownTab ? 700 : 400, background: i === shownTab ? look.brand : "rgba(127,127,127,0.14)", color: i === shownTab ? "#FFFFFF" : undefined }}
            >
              {titleIn(child, lang, defaultLang) || String(i + 1)}
            </span>
          ))}
        </span>,
      );
    }
    kids.forEach((child, i) => {
      if (drop === i) out.push(<DropLine key={`drop${i}`} dir={dir} label={editing!.dropLabel} />);
      if (n.type === "tabs" && i !== shownTab) return;
      const width = n.type === "slider" ? { width: `${100 / (n.per_view ?? 1)}%` } : {};
      const view = <Node {...p} node={child} parentDir={dir} />;
      out.push(
        n.type === "accordion" ? (
          <div key={child.id} style={{ display: "flex", flexDirection: "column", borderBottom: "1px solid rgba(127,127,127,0.25)", paddingBottom: 4 }}>
            <span onClick={editing ? (e) => (e.stopPropagation(), editing.onSelect(child.id)) : undefined} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 0", fontWeight: 700 }}>
              {titleIn(child, lang, defaultLang) || String(i + 1)}
              <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 20, transform: "rotate(180deg)" }}>
                expand_more
              </span>
            </span>
            {view}
          </div>
        ) : (
          <div key={child.id} style={n.type === "slider" ? { ...width, flex: "0 0 auto", scrollSnapAlign: "start" } : { display: "contents" }}>
            {view}
          </div>
        ),
      );
    });
    if (drop !== null && drop >= kids.length) out.push(<DropLine key="dropEnd" dir={dir} label={editing!.dropLabel} />);
    if (!kids.length && editing) out.push(<EmptyLayout key="empty" />);
    return <>{out}</>;
  }

  function Items(p: ViewProps & { node: StudioNode }) {
    const n = p.node;
    const entries = (n.source ? p.pickable.items[n.source] : undefined) ?? [];
    const count = Math.max(1, Math.min(n.query?.limit ?? 4, 6));
    const shown = (entries.length ? entries.slice(0, count) : Array.from({ length: count }, (_, i) => ({ id: String(i), title: `[${i + 1}]` }))).map((e) => ({ ...e, price: p.words.price }));
    const layout = n.layout ?? "grid";
    const wrap: CSSProperties =
      layout === "grid"
        ? { display: "grid", gridTemplateColumns: `repeat(${n.columns ?? 2}, minmax(0, 1fr))`, gap: n.gap ?? 10 }
        : layout === "carousel"
          ? { display: "flex", gap: n.gap ?? 10, overflow: "hidden" }
          : { display: "flex", flexDirection: "column", gap: n.gap ?? 10 };
    return (
      <span style={wrap}>
        {shown.map((entry) =>
          n.card ? (
            <span key={entry.id} style={layout === "carousel" ? { flex: "0 0 60%" } : undefined}>
              <CardOf {...p} node={n.card} entry={entry} />
            </span>
          ) : (
            <span key={entry.id} style={{ background: dark ? "#22203A" : "#FFFFFF", borderRadius: 14, padding: 8, boxShadow: "0 2px 6px rgba(20,54,31,0.08)", display: layout === "list" ? "flex" : "block", gap: 8, ...(layout === "carousel" ? { flex: "0 0 60%" } : {}) }}>
              <span style={{ display: "block", height: layout === "list" ? 56 : 74, width: layout === "list" ? 56 : "auto", flex: "none", borderRadius: 10, background: dark ? "#2A2742" : "#F3E3C3" }} />
              <span style={{ display: "block" }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginTop: 6 }}>{entry.title}</span>
                <span style={{ display: "block", fontSize: 11, opacity: 0.7 }}>{entry.price}</span>
              </span>
            </span>
          ),
        )}
      </span>
    );
  }
}

/** An items element's card for one entry: its bound elements show the entry. */
function CardOf(props: ViewProps & { node: StudioNode; entry: { id: string; title: string; price: string } }) {
  const fill = (node: StudioNode): StudioNode => ({
    ...node,
    ...(node.bind === "title" ? { text: props.entry.title, translations: undefined } : {}),
    ...(node.bind === "price" ? { text: props.entry.price, translations: undefined } : {}),
    ...(node.bind === "subtitle" ? { text: "", translations: undefined } : {}),
    ...(node.children ? { children: node.children.map(fill) } : {}),
  });
  return <StudioView {...props} page={{ body: fill(props.node), show_tabs: false, background: "transparent" }} editing={undefined} />;
}

function Placeholder({ icon, text, dark, map }: { icon: string; text: string; dark?: boolean; map?: boolean }) {
  return (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, width: "100%", height: "100%", minHeight: 80, background: map ? "repeating-linear-gradient(45deg, #DDE7D8 0 12px, #E7EFE3 12px 24px)" : dark ? "#0E0D24" : "#EFE8D8", color: dark ? "#F4EFE6" : "#5E5B70", fontSize: 12 }}>
      <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 30 }}>
        {icon}
      </span>
      {text}
    </span>
  );
}

function DropLine({ dir, label }: { dir: Dir; label: string }) {
  const across = dir === "row" || dir === "scroll" || dir === "slider";
  return (
    <span aria-hidden="true" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, ...(across ? { width: 4, alignSelf: "stretch" } : { margin: "4px 8px" }) }}>
      <span style={{ display: "block", background: "#FF5A1F", borderRadius: 4, ...(across ? { width: 4, height: "100%" } : { height: 4, width: "100%" }) }} />
      {across ? null : <span style={{ fontSize: 10, color: "#FF5A1F", fontWeight: 700 }}>{label}</span>}
    </span>
  );
}

function EmptyLayout() {
  return <span aria-hidden="true" style={{ display: "block", minHeight: 44, minWidth: 44, border: "1.5px dashed #B9B3A5", borderRadius: 10, flex: "1 1 auto" }} />;
}

/**
 * A corner of the selected element. 108.1 Dragging it resizes the element
 * (Shift keeps its shape); a double click gives it back its own size.
 */
function Corner({ v, h, rtl, id, onResize }: { v: "top" | "bottom"; h: "insetInlineStart" | "insetInlineEnd"; rtl: boolean; id: string; onResize?: StudioEditing["onResize"] }) {
  const right = (h === "insetInlineEnd") !== rtl;
  const style: CSSProperties = { position: "absolute", [v]: -9, [h]: -9, width: 9, height: 9, background: "#FFFFFF", border: "2px solid #3D63FF", borderRadius: 2, zIndex: 6, boxSizing: "content-box" };
  if (!onResize) return <span aria-hidden="true" style={style} />;
  function down(e: PointerEvent<HTMLSpanElement>) {
    const el = e.currentTarget.parentElement;
    if (!el || e.button !== 0 || !onResize) return;
    e.preventDefault();
    e.stopPropagation();
    const box = el.getBoundingClientRect();
    // The phone may be zoomed: its pixels, not the screen's.
    const scale = el.offsetWidth ? box.width / el.offsetWidth : 1;
    const holder = el.parentElement;
    const room = holder ? holder.clientWidth - (parseFloat(getComputedStyle(holder).paddingLeft) || 0) - (parseFloat(getComputedStyle(holder).paddingRight) || 0) : 0;
    const start = { x: e.clientX, y: e.clientY, width: el.offsetWidth, height: el.offsetHeight, room };
    const drag = Date.now();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const move = (m: globalThis.PointerEvent) => {
      const dx = ((m.clientX - start.x) / scale) * (right ? 1 : -1);
      const dy = ((m.clientY - start.y) / scale) * (v === "bottom" ? 1 : -1);
      const size = resized(start, { dx, dy, keepRatio: m.shiftKey });
      if (size.width !== undefined || size.height !== undefined) onResize(id, size, drag);
    };
    const up = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  }
  return (
    <span
      aria-hidden="true"
      data-studio-resize={`${v}-${right ? "right" : "left"}`}
      style={{ ...style, cursor: (v === "top") === right ? "nesw-resize" : "nwse-resize", touchAction: "none" }}
      onPointerDown={down}
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onResize(id, { width: undefined, height: undefined }, Date.now());
      }}
      draggable={false}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    />
  );
}

/** The selected element's size on the screen ("306 × 46"), measured once drawn. */
function SizeBadge({ id }: { id: string }) {
  return (
    <span
      data-studio-size={id}
      dir="ltr"
      style={{ position: "absolute", bottom: -30, left: "50%", transform: "translateX(-50%)", background: "#3D63FF", color: "#FFFFFF", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap", zIndex: 6 }}
      ref={(el) => {
        const box = el?.parentElement?.getBoundingClientRect();
        if (el && box) el.textContent = `${Math.round(box.width)} × ${Math.round(box.height)}`;
      }}
    />
  );
}

function layoutStyle(node: StudioNode): CSSProperties {
  switch (node.type) {
    case "row":
      return { display: "flex", flexDirection: "row", gap: node.gap, justifyContent: JUSTIFY[node.align ?? "start"], alignItems: ITEMS[node.cross ?? "stretch"], ...(node.scroll ? { overflowX: "auto", scrollbarWidth: "none" } : {}) };
    case "column":
    case "accordion":
    case "tabs":
      return { display: "flex", flexDirection: "column", gap: node.gap, justifyContent: JUSTIFY[node.align ?? "start"], alignItems: ITEMS[node.cross ?? "stretch"] };
    case "stack":
      return { display: "grid", gridTemplate: "1fr / 1fr", alignItems: ITEMS[node.cross ?? "stretch"] };
    case "grid":
      return { display: "grid", gridTemplateColumns: `repeat(${node.columns ?? 2}, minmax(0, 1fr))`, gap: node.gap };
    case "slider":
      return { display: "flex", gap: node.gap, overflowX: "auto", scrollSnapType: "x mandatory" };
    case "spacer":
      return { flex: node.height === undefined ? "1 1 auto" : undefined };
    case "divider":
      return { height: node.height ?? 1 };
    default:
      return {};
  }
}
