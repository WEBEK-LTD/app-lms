"use client";

import { withDashboardStories } from "@/lib/stories/canvas";
import { shownSlide, storiesSlider } from "@/lib/studio/slides";
import { COMMERCE_WORDS_EN, CouponCanvas, FlashSaleCanvas, type CommerceWords } from "./commerce";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import type { LanguageCode } from "@/lib/pages/types";
import { RESIZE_START, resized, snapped } from "@/lib/studio/resize";
import { autoSized, sizedByHand } from "@/lib/studio/auto-size";
import { forTablet } from "@/lib/studio/tablet";
import { mapTree } from "@/lib/studio/tree";
import { withShopCategoriesIn } from "@/lib/studio/shop-categories";
import type { Pickable, PickableEntry } from "@/lib/hosted/pages/pickable";
import type { LayoutTab, StudioHeader, StudioNode, StudioPage, StudioSides, StudioSize, TabBarStyle } from "@/lib/pages/types";
import { splitTabs } from "@/lib/pages/tab-bar";
import type { MarketCanvas } from "@/lib/studio/market-canvas";
import { MarketSection } from "./market";
import { LEARNING_WORDS_EN, LearningCard, type LearningWords } from "./learning";
import { LIVE_STATUS_WORDS_EN, LiveStatusCard, type LiveStatusWords } from "./live-status";
import { scrimCss, toneStyle } from "@/lib/studio/scrim";
import { SCHOOL_WORDS_EN, SchoolCard, type SchoolWords } from "./school";
import type { ScreenDrawing } from "@/lib/studio/screen-drawing";
import { AppScreen } from "./app-screens";
import { CourseScreenDrawing } from "./course-screens";
// 128 The cover layouts and the live elements.
import { Cover } from "./covers";
import { GreetingText, TrackingCard } from "./tracking";
// 128 The icons that point along the reading direction, mirrored in Arabic.
import { mirrored } from "./mirrored";
// 130 The live cards' premium looks.
import { LiveLookCard, liveLookOf } from "./live-looks";
// 129 Premium motion & media.
import { entranceMark, watchEntrances } from "@/lib/studio/motion";
import { BeforeAfter, edge, GalleryGrid, MediaBanner, Marquee, PremiumMotionStyles, Segments, SliderCount, SliderPill, StoriesRow } from "./premium-motion";
// 129.11–129.20 The premium content elements, and a layout's premium card style.
import { isPremiumContent, PREMIUM_WORDS_EN, PremiumElement, SurfaceExtras, surfaceStyle, type PremiumWords } from "./premium";
// 130.20 The premium page headers.
import { PremiumHeader, SystemScreen } from "./premium-chrome";
import { GiftCheckout } from "./gift-checkout";
import { quickAddLabel } from "./quick-add";
// 208 The category menu and the size chart.
import { CategoryMenuCanvas, SizeChartCanvas } from "./category-menu";

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
  /** The app's second colour (`secondary_color`), for its accents; missing, Ember. */
  accent?: string | null;
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
  /** 159 A corner of an element of automatic size pressed: Studio asks before its size changes by hand, then it can be dragged. */
  onAskByHand?: (id: string) => void;
  /** 159 A double click on a corner: the element back to its automatic size. */
  onAutoSize?: (id: string) => void;
  /**
   * 189 A slider's own buttons on the canvas, in the dashboard's language:
   * the slide before and after, "Slide 2 of 5" (`of`, with `{n}` and
   * `{count}`), and for the app's stories, once saved in Dashboard ›
   * Stories (`storiesSaved`, the app showing those), the way there, where
   * their pictures, words and buttons are changed.
   */
  slides?: { previous: string; next: string; of: string; editStories: string; storiesHref: string; storiesSaved?: boolean };
}

interface ViewProps {
  page: StudioPage;
  lang: LanguageCode;
  defaultLang: LanguageCode;
  dark: boolean;
  look: StudioLook;
  pickable: Pickable;
  editing?: StudioEditing;
  /** Editor audit 3.3: inside a locked element, which the canvas leaves alone with what it holds. */
  lockedAbove?: boolean;
  /** 128.10 Inside a cover (`photo_hero`, `map_header`): a colour over an element without a picture is its see-through background there. */
  inCover?: boolean;
  /** 128.10 In a row: the one text that gives way to what follows it (`textGivingWay`). */
  rowGivesWay?: string | null;
  /** Editor audit 3.3: shown on a tablet, with each element's tablet changes. */
  tablet?: boolean;
  /** Labels for the placeholders, in the dashboard's language. */
  words: { price: string; addPicture: string; addVideo: string; send: string; search: string; days: string; hours: string; minutes: string; seconds: string; copy: string };
  /** 123 The sample words of the student's cards (`learning`); missing, English. */
  learningWords?: LearningWords;
  /** 128 The sample words of a live order card (`live_status`); missing, English. */
  liveWords?: LiveStatusWords;
  /** 128 The sample family of the school's cards (`school`); missing, English. */
  schoolWords?: SchoolWords;
  /** 123 The sample greeting header: today's date and a greeting with a name. */
  greeting?: { date: string; hello: string };
  /** 115.14 The marketplace's places, offers, cuisines and orders its `market` elements show; missing, the app's samples. */
  market?: MarketCanvas | null;
  /** 120 For a page drawn around one of the app's screens: 124.8 the screen as the app draws it, or what the canvas says in its place. */
  screenPart?: ScreenPartInfo;
  /** 129.11–129.20 The editor's words of the premium elements (an empty price, the plans' switch); missing, English. */
  premiumWords?: PremiumWords;
  /** 131 The flash sale's and the coupon's words (lib/studio/app-words.ts); missing, English. */
  commerceWords?: CommerceWords;
  /** 193 The app draws Add to cart under each product's card (a store on the gift checkout, Leqaa's looks). */
  quickAdd?: boolean;
}

/** 124.8 The app's screen under a page's elements in the canvas. */
export interface ScreenPartInfo {
  /** Its name in the editor ("My courses"). */
  name: string;
  /** How the app draws it (lib/studio/screen-drawing.ts); null: no drawing yet, the canvas says the app draws it. */
  drawing: ScreenDrawing | null;
  /** Studio › Screens, where its look is chosen; null when it has none there. */
  looksHref: string | null;
  /** In the dashboard's language. */
  words: { drawnLook: string; drawnOwn: string; open: string; hint: string };
  /** 127 What the screen lists, the project's own entries (else its samples): shown in place of grey rows. */
  entries?: PickableEntry[];
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
/** 174 Arabic script, whose letters join (Arabic, Persian, Urdu and their supplements). */
const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

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

/**
 * 128.10 Whether a page's first element (of those not pinned) is a cover: a photo hero, a map header, 130 a video hero, a
 * parallax banner, or a picture with a scrim (the app's `studioStartsWithCover`, mobile studio_page.dart). Under a transparent header only such a page reaches
 * under the status bar with the app's name over it; older pages, which have none of these, look as before.
 */
export function startsWithCover(body: StudioNode): boolean {
  const first = (body.children ?? []).find((n) => (n.pin ?? "none") === "none" && !n.hidden);
  // 130 And 129's video hero and parallax banner, covers too.
  return !!first && (first.type === "photo_hero" || first.type === "map_header" || first.type === "video_hero" || first.type === "parallax_banner" || !!first.scrim);
}

/**
 * 128.10 The one text in a row that gives way to what follows it: the row's only text cut to its lines without a width
 * of its own, when nothing in the row fills it (the app's `studioTextGivingWay`). With two such texts, or none, none does.
 */
export function textGivingWay(kids: readonly StudioNode[]): string | null {
  if (kids.some((k) => k.width === "fill")) return null;
  const texts = kids.filter((k) => k.type === "text" && k.max_lines && typeof k.width !== "number");
  return texts.length === 1 ? texts[0]!.id : null;
}

export function StudioView(givenProps: ViewProps) {
  // 165 The story elements from Dashboard › Stories show its stories, as the app does now.
  const storied = withDashboardStories(givenProps.page, givenProps.pickable?.stories, givenProps.lang, givenProps.defaultLang, new Date());
  const viewProps = storied === givenProps.page ? givenProps : { ...givenProps, page: storied };
  // 157 A template's lists of the shop's categories as the app shows them.
  const shop = viewProps.pickable.shopCategories;
  const listed = shop ? { ...viewProps, page: { ...viewProps.page, body: withShopCategoriesIn(viewProps.page.body, shop) } } : viewProps;
  // 159 At their automatic sizes, as the app draws them (a cover's top bar across the cover), unless sized by hand.
  const body = autoSized(listed.tablet ? (mapTree(listed.page.body, forTablet) ?? listed.page.body) : listed.page.body);
  const props = body === listed.page.body ? listed : { ...listed, page: { ...listed.page, body } };
  const { page, dark, look } = props;
  const bg = (dark ? (page.dark_background ?? page.background) : page.background) ?? (dark ? "#14121F" : "#FBF8F2");
  const rtl = props.lang === "ar";
  const showTabs = page.show_tabs !== false && look.tabs.length > 0;
  // 128.10 Under a transparent header a page starting with anything but a cover starts below the status bar, as the app draws it.
  // 130.20 A premium style is drawn in the page's flow, whatever its type.
  const belowBar = page.header?.type === "transparent" && !page.header.style && !startsWithCover(page.body);
  // 129.8 Each element's entrance plays once when it first comes into view (lib/studio/motion.ts).
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => (root.current ? watchEntrances(root.current, rtl) : undefined), [rtl]);
  const overCover = page.header?.type === "transparent" && !belowBar;
  const { top: underMark, scrolled: scrolledUnder } = useScrolledUnder(overCover);
  return (
    <div ref={root} dir={rtl ? "rtl" : "ltr"} style={{ display: "flex", flexDirection: "column", minHeight: "100%", background: bg, color: dark ? "#F4EFE6" : "#0E0D24", fontFamily: `'${look.font}', 'Cairo', system-ui, sans-serif` }}>
      {overCover ? <span ref={underMark} aria-hidden="true" style={{ display: "block", flex: "none", height: SCROLLED_UNDER_AT, marginBottom: -SCROLLED_UNDER_AT }} /> : null}
      {page.header ? <Header header={page.header} {...props} under={overCover ? { scrolled: scrolledUnder, background: bg } : undefined} /> : null}
      <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", paddingTop: belowBar ? 30 : undefined }} data-studio-below-bar={belowBar ? "" : undefined}>
        <Node node={page.body} parentDir="column" {...props} />
        {page.screen ? <ScreenPart {...props} /> : null}
      </div>
      {showTabs ? <Tabs {...props} /> : null}
      {/* 129 The premium elements' keyframes. */}
      <PremiumMotionStyles />
    </div>
  );
}

/** 128.11 How far the page scrolls before a transparent header over a cover takes the page's background (the app's `studioScrolledUnderAt`). */
const SCROLLED_UNDER_AT = 8;

/**
 * 128.11 Whether the page has scrolled under its transparent header over a cover, in the canvas's scrolling screen
 * (the nearest scrolling box around the page): a mark as tall as `SCROLLED_UNDER_AT` at the page's top, seen or not.
 * Where nothing scrolls the page (a template's small picture), never.
 */
function useScrolledUnder(on: boolean): { top: (mark: HTMLSpanElement | null) => void; scrolled: boolean } {
  const [mark, top] = useState<HTMLSpanElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!on || !mark || typeof IntersectionObserver === "undefined") return;
    let root = mark.parentElement;
    while (root && !/(auto|scroll)/.test(getComputedStyle(root).overflowY)) root = root.parentElement;
    if (!root) return;
    const seen = new IntersectionObserver((entries) => setScrolled(!entries.at(-1)!.isIntersecting), { root });
    seen.observe(mark);
    return () => {
      seen.disconnect();
      setScrolled(false);
    };
  }, [on, mark]);
  return { top, scrolled: on && scrolled };
}

function Header(props: ViewProps & { header: StudioHeader; under?: { scrolled: boolean; background: string } }) {
  const { header, look, dark, editing, under } = props;
  const background = (dark ? (header.dark_background ?? header.background) : header.background) ?? look.brand;
  // 128.11 Over a cover, once the page scrolls under it: on the page's background, in the colour that reads on it, as the app draws it.
  const solid = !!under?.scrolled && /^#[0-9a-f]{6}$/i.test(under.background);
  const color = solid ? onFill(under!.background) : ((dark ? (header.dark_color ?? header.color) : header.color) ?? "#FFFFFF");
  const title = (props.lang !== props.defaultLang ? (header.translations?.[props.lang]?.title as string | undefined) : undefined) ?? header.title ?? look.name;
  const buttons = header.buttons ?? [];
  const icons: Record<string, string> = { menu: "menu", search: "search", cart: "shopping_bag", notifications: "notifications", chat: "chat", account: "account_circle" };
  const logo = header.logo_url ?? look.logoUrl;
  // 128.10 A transparent header shows the app's name (or logo) only over a cover; over anything else its buttons alone, as the app draws it.
  const brandMark = header.type === "transparent" && !startsWithCover(props.page.body) ? null : logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt="" style={{ height: 28, maxWidth: 120, objectFit: "contain" }} />
  ) : (
    <span style={{ fontWeight: 800, fontSize: 16 }}>{title}</span>
  );
  const selected = editing?.selectedId === "header";
  // ——— 130.20 A premium header style: drawn by premium-chrome.tsx, open as the page starts ———
  if (header.style) {
    const subtitle = (props.lang !== props.defaultLang ? (header.translations?.[props.lang]?.subtitle as string | undefined) : undefined) ?? header.subtitle ?? null;
    return (
      <PremiumHeader
        header={header}
        title={title}
        subtitle={subtitle}
        brand={look.brand}
        accent={look.accent ?? null}
        logoUrl={logo}
        dark={dark}
        rtl={props.lang === "ar"}
        searchWord={props.words.search}
        back={header.type === "title"}
        selected={selected}
        onSelect={editing ? () => editing.onSelect("header") : undefined}
        tag={selected && editing ? <Tag text={editing.tagOf({ id: "header", type: "row" })} /> : null}
      />
    );
  }
  // ——— end 130.20 ———
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
  // 123 Today's date over a greeting with the person's name; 128.8 the buttons as round buttons on a card beside it.
  if (header.type === "greeting") {
    const ink = (dark ? (header.dark_color ?? header.color) : header.color) ?? (dark ? "#F3F1EC" : "#15131A");
    const square: CSSProperties = { width: 40, height: 40, borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", background: dark ? "#161C33" : "#FFFFFF", border: `1px solid ${dark ? "#262D48" : "#E3DFD6"}` };
    return (
      <div style={{ ...wrap, background: (dark ? (header.dark_background ?? header.background) : header.background) ?? "transparent", color: ink, margin: "30px 6px 0" }} onClick={editing ? (e) => (e.stopPropagation(), editing.onSelect("header")) : undefined} data-studio-header={header.type}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 12, opacity: 0.7 }}>{props.greeting?.date ?? ""}</span>
          <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" }}>{props.greeting?.hello ?? title}</span>
        </div>
        {buttons.map((b) => (
          <span key={b} style={square}>
            {icon(b)}
          </span>
        ))}
        {selected && editing ? <Tag text={editing.tagOf({ id: "header", type: "row" })} /> : null}
      </div>
    );
  }
  const bar = (
    <div style={wrap} onClick={editing ? (e) => (e.stopPropagation(), editing.onSelect("header")) : undefined} data-studio-header={header.type}>
      {header.type === "logo_center" ? (
        <>
          {buttons.includes("menu") ? icon("menu") : <span style={{ width: 22 }} />}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>{brandMark}</div>
          {buttons.filter((b) => b !== "menu").slice(0, 1).map(icon)}
        </>
      ) : header.type === "title" ? (
        <>
          {buttons.includes("menu") ? icon("menu") : null}
          <span style={{ flex: 1, fontWeight: 800, fontSize: 18, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
          {buttons.filter((b) => b !== "menu").map(icon)}
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
  if (!under) return bar;
  // 128.11 Over a cover it stays at the top of the screen as the page scrolls, as in the app, its background fading in once the page is under it.
  return (
    <div style={{ position: "sticky", top: 0, height: 0, zIndex: 2 }} data-studio-header-over-cover={solid ? "under" : "top"}>
      <span aria-hidden="true" data-studio-header-under="" style={{ position: "absolute", top: 0, insetInline: 0, height: 78, pointerEvents: "none", background: solid ? under.background : "transparent", transition: "background-color 180ms ease" }} />
      {bar}
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
  const design = style.design ?? "classic";
  const own = dark ? (style.dark_background ?? style.background) : style.background;
  // 119 In dark mode its own colours, else the light ones made readable on a dark bar.
  const activeColour = dark ? (style.dark_active ?? readableOnDark(style.active ?? look.brand)) : (style.active ?? look.brand);
  const inactiveColour = dark ? (style.dark_inactive ?? (style.inactive ? readableOnDark(style.inactive) : "#A7A3C2")) : (style.inactive ?? "#5E5B70");
  const page = dark ? "#14121F" : "#FBF8F2";
  const background =
    own ??
    (design === "island"
      ? dark
        ? "#262E2B"
        : "#121614"
      : design === "segment"
        ? dark
          ? "#1E2523"
          : "#E9EDEB"
        : design === "folder"
          ? dark
            ? mixHex(activeColour, "#000000", 0.62)
            : (style.active ?? look.brand)
          : design === "glass"
            ? dark
              ? "rgba(20,24,22,0.55)"
              : "rgba(255,255,255,0.6)"
            : dark
              ? "#22203A"
              : "#FFFFFF");
  const labels = style.labels ?? "always";
  const middleOf = tabs.length % 2 === 1 && tabs.length >= 3 ? (tabs.length - 1) / 2 : -1;
  // 131.22 The petal: the middle tab is always its raised bloom, as the notch's button.
  const petal = design === "petal";
  const center = design === "notch" || petal ? middleOf : middleOf >= 0 && style.center && tabs[middleOf]?.id === style.center ? middleOf : -1;
  // 128 The floating pill floats too, 22 round unless the owner chose its corners.
  // 129 The dock: a small capsule in the middle, icons only.
  const dock = design === "dock";
  const floatsItself = design === "glass" || design === "island" || design === "segment" || design === "float" || dock || petal;
  const margin = style.margin ?? (floatsItself ? 12 : 0);
  const radius = design === "island" || dock ? 999 : (style.radius ?? (design === "glass" ? 26 : design === "segment" ? 18 : design === "float" ? 22 : petal ? 30 : 0));
  const selected = editing?.selectedId === "tabs";
  const onBar = design === "folder" ? "rgba(255,255,255,0.78)" : design === "island" ? "#8F9A95" : inactiveColour;
  const colours = ["#1F6F5C", "#B26A00", "#2F4FB5", "#7A2E8E"].map((c) => (dark ? readableOnDark(c) : c));
  return (
    <div
      data-studio-tabs=""
      data-studio-tab-bar-design={design}
      onClick={editing ? (e) => (e.stopPropagation(), editing.onSelect("tabs")) : undefined}
      style={{
        position: "relative",
        // The usual bar sits a little in from the phone's edges.
        margin: design === "island" ? `0 48px ${Math.max(margin, 12)}px` : dock ? `0 auto ${Math.max(margin, 12)}px` : margin ? `0 ${margin}px ${margin}px` : "0 10px 12px",
        alignSelf: dock ? "center" : undefined,
        gap: dock ? 6 : undefined,
        padding: design === "segment" ? "5px" : design === "folder" ? "14px 6px 8px" : design === "float" ? "11px 6px" : dock ? "8px" : petal ? "9px 6px 8px" : "8px 6px",
        borderRadius: margin || design === "island" ? radius : radius || 18,
        // 131.22 The petal: a soft wash of the open tab's colour toward the bar's foot, a hairline of light at its top.
        background: petal ? `linear-gradient(180deg, ${background}, ${mixHex(background.startsWith("#") ? background : "#FFFFFF", activeColour, dark ? 0.1 : 0.07)})` : background,
        borderTop: petal ? `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)"}` : undefined,
        backdropFilter: design === "glass" ? "blur(18px)" : undefined,
        border: design === "glass" ? `1px solid ${dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.5)"}` : undefined,
        boxShadow: design === "notch" ? undefined : design === "float" || dock ? "0 10px 30px rgba(0,0,0,0.18)" : petal ? `0 14px 34px ${dark ? "rgba(0,0,0,0.45)" : "rgba(42,18,28,0.16)"}` : "0 -2px 10px rgba(14,13,36,0.08)",
        // 119 The notch: a curved cut in the bar's top for the middle button.
        WebkitMaskImage: design === "notch" && center >= 0 ? "radial-gradient(circle 30px at 50% -6px, transparent 29px, #000 30px)" : undefined,
        maskImage: design === "notch" && center >= 0 ? "radial-gradient(circle 30px at 50% -6px, transparent 29px, #000 30px)" : undefined,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        fontSize: 10,
        fontFamily: style.font ? `'${style.font}', inherit` : undefined,
        color: onBar,
        outline: selected ? "1.5px dashed #6C8BFF" : undefined,
        outlineOffset: 2,
        cursor: editing ? "pointer" : undefined,
      }}
    >
      {tabs.map((tab, i) => {
        const label = tab ? ((lang !== defaultLang ? (tab.translations?.[lang]?.label as string | undefined) : undefined) ?? tab.label) : (look.moreLabel ?? "More");
        const active = tab ? tab.id === look.activeTab : false;
        const icon = tab ? tab.icon : "apps";
        // 119 The account tab with the person's photo (a stand-in in the editor).
        const photo = style.avatar === true && tab?.target.type === "screen" && tab.target.screen === "account";
        const glyph = photo ? (
          <span data-studio-tab-avatar="" style={{ display: "block", width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#E9C9A8,#B98A60)", boxShadow: active ? `0 0 0 2px ${activeColour}` : undefined }} />
        ) : tab?.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tab.icon_url} alt="" style={{ width: 22, height: 22, objectFit: "contain" }} />
        ) : (
          <span className="material-symbols-rounded" aria-hidden="true">
            {icon}
          </span>
        );
        // 131.22 The petal's raised bloom: a petal-shaped button in the open colour's gradient, ringed in the page's colour, its name under it.
        if (i === center && petal) {
          return (
            <div key={tab?.id ?? "more"} data-studio-tab-center="" data-studio-tab-design="petal" title={label} style={{ display: "flex", flex: 1.1, flexDirection: "column", alignItems: "center", gap: 3 }}>
              <span style={{ position: "relative", marginTop: -34, width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "50% 50% 50% 16%", transform: "rotate(-45deg)", background: `linear-gradient(135deg, ${mixHex(activeColour, "#FFFFFF", 0.18)}, ${activeColour} 55%, ${mixHex(activeColour, "#000000", 0.25)})`, boxShadow: `0 0 0 4px ${page}, 0 10px 22px ${dark ? "rgba(0,0,0,0.5)" : "rgba(42,18,28,0.28)"}` }} />
                <span style={{ position: "relative", color: onFill(activeColour), display: "flex" }}>{glyph}</span>
              </span>
              {labels !== "never" ? <span data-studio-tab-name="" style={{ fontWeight: 700, color: activeColour, whiteSpace: "nowrap" }}>{label}</span> : null}
            </div>
          );
        }
        if (i === center) {
          return (
            <div key={tab?.id ?? "more"} data-studio-tab-center="" title={label} style={{ display: "flex", flex: 1, justifyContent: "center" }}>
              <span style={{ marginTop: design === "notch" ? -38 : -26, width: 50, height: 50, borderRadius: "50%", background: activeColour, color: onFill(activeColour), display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(14,13,36,0.25)" }}>{glyph}</span>
            </div>
          );
        }
        // 129 The dock: icons only, the open tab a filled circle.
        if (dock) {
          return (
            <div key={tab?.id ?? "more"} data-studio-tab={tab ? tab.id : "more"} data-studio-tab-design="dock" title={label} style={{ width: 46, height: 46, borderRadius: "50%", flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: active ? activeColour : "transparent", color: active ? onFill(activeColour) : undefined }}>
              {glyph}
            </div>
          );
        }
        const showLabel = labels === "always" || (labels === "active" && active);
        const name = <span data-studio-tab-name="" style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>;
        const key = tab?.id ?? "more";
        const tabKey = tab ? tab.id : "more";
        // 119 The open tab with its name beside its icon: a filled pill (lit on the island), a soft bubble or a raised segment; the others icons only.
        if (design === "pill" || design === "bubble" || design === "island" || design === "segment" || design === "float") {
          if (!active) {
            return (
              <div key={key} data-studio-tab={tabKey} title={label} style={{ display: "flex", flex: 1, justifyContent: "center", minWidth: 0 }}>
                {glyph}
              </div>
            );
          }
          const fill = design === "bubble" ? tint(activeColour, dark ? 0.22 : 0.14) : design === "segment" ? (dark ? "#2E3734" : "#FFFFFF") : activeColour;
          const ink = design === "bubble" || design === "segment" ? activeColour : onFill(activeColour);
          return (
            <div key={key} data-studio-tab={tabKey} data-studio-tab-design={design} title={label} style={{ display: "flex", flex: 1.6, justifyContent: "center", minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4, padding: design === "float" ? "8px 14px" : "5px 10px", borderRadius: design === "segment" ? 12 : design === "float" ? 20 : 16, minWidth: 0, background: fill, color: ink, fontWeight: 700, boxShadow: design === "segment" ? "0 2px 6px rgba(14,13,36,0.15)" : undefined }}>
                {glyph}
                {labels !== "never" ? name : null}
              </span>
            </div>
          );
        }
        // 131.22 The petal: the open tab on a petal-cut leaf of its colour with its name, the others quiet.
        if (petal) {
          return (
            <div key={key} data-studio-tab={tabKey} data-studio-tab-design="petal" title={label} style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", gap: 2, minWidth: 0, color: active ? activeColour : undefined, fontWeight: active ? 700 : 500 }}>
              <span style={{ display: "flex", padding: "3px 12px", borderRadius: "16px 16px 16px 5px", background: active ? tint(activeColour, dark ? 0.24 : 0.14) : "transparent" }}>{glyph}</span>
              {showLabel ? name : null}
            </div>
          );
        }
        if (design === "text") {
          return (
            <div key={key} data-studio-tab={tabKey} title={label} style={{ display: "flex", flex: 1, justifyContent: "center", minWidth: 0, fontSize: 11.5, color: active ? activeColour : undefined, fontWeight: active ? 700 : 400 }}>
              <span style={{ borderBottom: `2px solid ${active ? activeColour : "transparent"}`, paddingBottom: 2 }}>{name}</span>
            </div>
          );
        }
        if (design === "folder" && active) {
          return (
            <div key={key} data-studio-tab={tabKey} title={label} style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", minWidth: 0, marginTop: -20, paddingTop: 6, paddingBottom: 4, borderRadius: "14px 14px 0 0", background: page, color: activeColour, fontWeight: 700 }}>
              {glyph}
              {showLabel ? name : null}
            </div>
          );
        }
        if (design === "lift" && active) {
          return (
            <div key={key} data-studio-tab={tabKey} title={label} style={{ display: "flex", flex: 1, flexDirection: "column", alignItems: "center", minWidth: 0, color: activeColour, fontWeight: 700 }}>
              <span style={{ marginTop: -26, width: 40, height: 40, borderRadius: "50%", background: activeColour, color: onFill(activeColour), border: `4px solid ${page}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{glyph}</span>
              {showLabel ? name : null}
            </div>
          );
        }
        const ownColour = colours[i % colours.length]!;
        const wrapped =
          design === "classic" ? (
            <span style={{ display: "flex", padding: "1px 10px", borderRadius: 12, background: active ? tint(activeColour, dark ? 0.22 : 0.14) : "transparent" }}>{glyph}</span>
          ) : design === "outline" ? (
            <span style={{ display: "flex", padding: "1px 10px", borderRadius: 12, border: `1.5px solid ${active ? activeColour : "transparent"}` }}>{glyph}</span>
          ) : design === "square" ? (
            <span style={{ display: "flex", padding: "3px 7px", borderRadius: 9, background: active ? activeColour : "transparent", color: active ? onFill(activeColour) : undefined }}>{glyph}</span>
          ) : design === "glass" ? (
            <span style={{ display: "flex", padding: "1px 10px", borderRadius: 12, background: active ? (dark ? "rgba(255,255,255,0.16)" : "rgba(255,255,255,0.85)") : "transparent" }}>{glyph}</span>
          ) : design === "glow" ? (
            <span style={{ display: "flex", filter: active ? `drop-shadow(0 0 6px ${activeColour})` : undefined }}>{glyph}</span>
          ) : design === "colours" ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: "50%", background: tint(ownColour, dark ? 0.22 : 0.14), color: ownColour, border: `1.5px solid ${active ? ownColour : "transparent"}` }}>{glyph}</span>
          ) : (
            glyph
          );
        return (
          <div
            key={key}
            data-studio-tab={tabKey}
            title={label}
            style={{
              position: "relative",
              display: "flex",
              flex: 1,
              flexDirection: "column",
              alignItems: "center",
              gap: design === "dot" || design === "glow" ? 2 : 0,
              minWidth: 0,
              color: active ? (design === "colours" ? ownColour : activeColour) : undefined,
              fontWeight: active ? 700 : 400,
              fontSize: design === "minimal" ? 9 : undefined,
              borderTop: design === "line" ? `2.5px solid ${active ? activeColour : "transparent"}` : undefined,
              paddingTop: design === "line" ? 4 : undefined,
              marginTop: design === "line" ? -8 : undefined,
            }}
          >
            {design === "drop" && active ? <span style={{ position: "absolute", top: -9, width: 26, height: 8, borderRadius: "0 0 12px 12px", background: activeColour }} /> : null}
            {wrapped}
            {design === "dot" ? <span style={{ width: 4, height: 4, borderRadius: 2, background: active ? activeColour : "transparent" }} /> : null}
            {showLabel ? name : null}
            {design === "glow" ? <span style={{ width: 24, height: 2, borderRadius: 2, background: active ? activeColour : "transparent", boxShadow: active ? `0 0 8px ${activeColour}` : undefined }} /> : null}
          </div>
        );
      })}
      {selected && editing ? <Tag text={editing.tagOf({ id: "tabs", type: "row" })} /> : null}
    </div>
  );
}

/** 119 Dark text on a light fill, white on a dark one (as the app does). */
function onFill(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum > 0.6 ? "#14121F" : "#FFFFFF";
}

/** 119 Two #RRGGBB colours mixed. */
function mixHex(a: string, b: string, t: number): string {
  const x = parseInt(a.slice(1), 16);
  const y = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((x >> s) & 255) * (1 - t) + ((y >> s) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function Tag({ text }: { text: string }) {
  return <span style={{ position: "absolute", top: -22, insetInlineEnd: 0, background: "#6C8BFF", color: "#FFFFFF", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap", zIndex: 5 }}>{text}</span>;
}

/** The layout an element sits in; `scroll` a row that scrolls sideways (107.2). */
type Dir = "row" | "scroll" | "column" | "stack" | "grid" | "slider" | null;

/** 119 A colour lightened when it would be hard to see on a dark bar (as the app does). */
function readableOnDark(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (lum >= 0.45) return hex;
  const mix = (c: number) => Math.round(c + (255 - c) * 0.5);
  return `#${[r, g, b].map((c) => mix(c).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

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

/** 124.6 Where an element sits on a layer (a stack's `cross`), as the app aligns it there. */
const STACK_AT: Record<string, CSSProperties["alignSelf"]> = { start: "start", center: "center", end: "end", stretch: "start" };

/** 124.6 An element on a layer: whether it is the layer's first, and the layer's alignment. */
interface InStack {
  first: boolean;
  cross: StudioNode["cross"];
}

function Node(props: ViewProps & { node: StudioNode; parentDir: Dir; inStack?: InStack }) {
  const { node, dark, editing, lang, defaultLang, look, parentDir } = props;
  // 107.2 A hidden element shows only in the editor, faded.
  if (node.hidden && !editing) return null;
  const overlay = node.overlay ? tint(node.overlay.color, node.overlay.opacity) : null;
  const scrim = node.scrim ? scrimCss(node.scrim, lang === "ar") : null;
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
    // 128 The shade for the words over it, then the colour over it, then the picture.
    backgroundImage: node.image_background_url ? `${scrim ? `${scrim}, ` : ""}${overlay ? `linear-gradient(${overlay}, ${overlay}), ` : ""}url("${node.image_background_url}")` : undefined,
    backgroundSize: node.image_background_url ? "cover" : undefined,
    backgroundPosition: "center",
    color,
    ...cornersStyle(node),
    transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
    border: node.border_width && node.border_color ? `${node.border_width}px solid ${(dark ? node.dark_border_color : null) ?? node.border_color}` : undefined,
    boxShadow: node.shadow && node.shadow !== "none" ? SHADOWS[node.shadow] : undefined,
    opacity: node.opacity,
    fontFamily: node.font?.family ? `'${node.font.family}', '${look.font}', sans-serif` : undefined,
    fontWeight: node.font?.weight,
    fontSize: node.font?.size,
    lineHeight: node.font?.line_height,
    // 174 Arabic letters are joined: spacing them (a Latin display style's tracking) breaks them apart on the canvas, and the app keeps them joined.
    letterSpacing: node.font?.letter_spacing && !ARABIC_SCRIPT.test(textIn(node, lang, defaultLang)) ? node.font.letter_spacing : undefined,
    fontStyle: node.font?.italic ? "italic" : undefined,
    textDecoration: decoration || undefined,
    textTransform: node.font?.uppercase ? "uppercase" : undefined,
    textAlign: node.text_align === "center" ? "center" : node.text_align === "end" ? "end" : undefined,
    // 124.6 Hugging across its row or column, it sits at the start of it, as the app draws it (a button that hugs its words).
    alignSelf: node.self_align ? ITEMS[node.self_align] : (parentDir === "column" && node.width === "hug") || (parentDir === "row" && node.height === "hug") ? "flex-start" : undefined,
    overflow: node.radius || node.corners ? "hidden" : undefined,
  };
  // 128 A colour over an element without a picture is its see-through background (a frosted button over a photo); 128.10 only
  // inside a cover, so older pages draw such a colour as before (not at all).
  if (props.inCover && overlay && !node.image_background_url && !node.gradient && !background) style.background = overlay;
  // 128.10 In a row, its one text cut to its lines gives way to what follows it; the rest keep their width, as the app's.
  if (parentDir === "row" && props.rowGivesWay) Object.assign(style, node.id === props.rowGivesWay ? { minWidth: 0, flexShrink: 1 } : { flexShrink: 0 });
  // 128 A cover draws its own height, space inside, colour and corners (lib/pages/types.ts STUDIO_COVER_TYPES).
  if (node.type === "photo_hero" || node.type === "map_header" || node.type === "video_hero" || node.type === "parallax_banner") {
    for (const key of ["height", "paddingTop", "paddingBottom", "paddingInlineStart", "paddingInlineEnd", "background", "backgroundImage", "borderRadius", "overflow", "flexShrink"] as const) delete style[key];
  }
  // ——— 129.11–129.20 The premium elements draw their own cards and corners; a layout's premium card style. ———
  if (isPremiumContent(node.type)) {
    for (const key of ["borderRadius", "overflow"] as const) delete style[key];
    if (node.type === "profile_card" || node.type === "cta_bar" || node.type === "badge_text") {
      for (const key of ["background", "backgroundImage", "paddingTop", "paddingBottom", "paddingInlineStart", "paddingInlineEnd", "border", "boxShadow"] as const) delete style[key];
    }
    // 129.20 The bar stays at the foot of the page while it scrolls, above the tabs.
    if (node.type === "cta_bar") Object.assign(style, { position: "sticky", bottom: 0, zIndex: 3 });
  }
  if (node.surface) Object.assign(style, surfaceStyle(node.surface, dark, typeof style.background === "string" ? style.background : undefined, lang === "ar"));
  // ——— end 129.11–129.20 ———
  if (parentDir === "stack") {
    // 124.6 As the app's layers: after the first, an element filling the height fills the layer; any other is as tall as
    // what it holds, at its own alignment or the layer's (and as wide, when it hugs or has a width).
    const fills = props.inStack?.first === false && node.height === "fill" && (node.width === undefined || node.width === "fill");
    const at = node.self_align ? ITEMS[node.self_align] : STACK_AT[props.inStack?.cross ?? "stretch"];
    // 150 A row placed at the top (or foot) of a layer still spans it, as the app's Row does (Leqaa's and Kech Flora's
    // wordmark between the search and the bag, which shrank to its words here and put the bag mid-cover); its
    // own placement moves it up or down only. Others take theirs across too.
    // 150.2 The app's Row takes the layer's whole width unless it has a width of its own in points, so a row that
    // hugs spans it too (Kech Flora's top row, set to hug, still put the bag mid-cover).
    const spans = node.type === "row" && !node.scroll && typeof node.width !== "number";
    const across = spans ? "stretch" : node.self_align ? ITEMS[node.self_align] : node.width === "hug" || typeof node.width === "number" ? at : "stretch";
    Object.assign(style, { gridArea: "1 / 1", justifySelf: fills ? "stretch" : across, alignSelf: fills ? "stretch" : at });
  }
  // 112.4 A spot on a picture: the point at the same share of it sits there, as the app's alignment does.
  if (parentDir === "stack" && node.place) {
    const { x, y } = node.place;
    Object.assign(style, { position: "absolute", insetInlineStart: `${x}%`, top: `${y}%`, transform: `translate(${lang === "ar" ? x : -x}%, ${-y}%)${node.rotation ? ` rotate(${node.rotation}deg)` : ""}`, zIndex: 1 });
  }
  if (parentDir === "slider") Object.assign(style, { scrollSnapAlign: "start", flex: "0 0 auto" });
  // 112.4 A slider's height (or shape) is its slides'; the dots go under them.
  const slides: CSSProperties | null = node.type === "slider" ? { height: style.height, aspectRatio: style.aspectRatio } : null;
  if (slides) {
    delete style.height;
    delete style.aspectRatio;
  }

  const selected = editing?.selectedId === node.id;
  const hovered = editing?.hoveredId === node.id && !selected;
  // Editor audit 3.3: a locked element (or one inside it) isn't picked, moved or resized on the canvas;
  // a click goes to what holds it. Its layer still selects it.
  const locked = node.locked === true || props.lockedAbove === true;
  if (editing) {
    style.outline = selected ? "2px solid #3D63FF" : hovered || node.hidden ? "1.5px dashed #6C8BFF" : undefined;
    if (node.hidden) style.opacity = 0.35;
    style.outlineOffset = selected ? 3 : 2;
    style.cursor = locked ? "default" : "pointer";
  }
  const handlers = editing && !locked
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
  const content = Content(locked && !props.lockedAbove ? { ...props, lockedAbove: true } : props);
  return (
    <div style={{ ...style, ...layoutStyle(node) }} data-studio-node={node.id} data-studio-selected={selected && editing ? "" : undefined} data-studio-enter={entranceMark(node.motion)} data-studio-ken-burns={node.ken_burns && node.type !== "slider" ? "" : undefined} {...handlers}>
      {/* 129 A premium card style's ticket perforation and texture, over it without taking room. */}
      {node.surface && (node.surface.ticket || node.surface.pattern) ? <SurfaceExtras s={node.surface} dark={dark} /> : null}
      {content}
      {selected && editing ? (
        <>
          <SelectionHandles id={node.id} rtl={lang === "ar"} onResize={node.id === props.page.body.id || locked ? undefined : editing.onResize} onAsk={sizedByHand(node) ? undefined : editing.onAskByHand} onAuto={editing.onAutoSize} />
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
        return Children(p);
      case "slider":
        return Slider(p);
      case "coupon":
        // 112.4 The code in a dashed frame, with a button that copies it in the app; 131 a ticket or glass, the shop's own coupon when bound.
        return <CouponCanvas node={n} pickable={p.pickable} dark={dark} brand={look.brand} color={color ?? null} words={{ ...(p.commerceWords ?? COMMERCE_WORDS_EN), copy: p.words.copy }} />;
      case "size_chart":
        // 208 The shop's size chart.
        return <SizeChartCanvas node={n} pickable={p.pickable} dark={dark} title={text || null} color={color} />;
      case "flash_sale":
        // 131 The flash sale: its products at their sale price, the live countdown and the stock bar.
        return <FlashSaleCanvas node={n} title={text} pickable={p.pickable} dark={dark} brand={look.brand} words={p.commerceWords ?? COMMERCE_WORDS_EN} />;
      case "learning":
        // 123 The student's card as the app draws it, with sample learning.
        return <LearningCard node={n} dark={dark} color={color ?? null} words={p.learningWords ?? LEARNING_WORDS_EN} title={((lang !== defaultLang ? (n.translations?.[lang]?.title as string | undefined) : undefined) ?? n.title) || null} />;
      case "live_status":
        // 128 The person's order on its way, with sample words.
        // 130 Or in one of the live cards' premium looks.
        if (liveLookOf(n)) return <LiveLookCard node={n} lang={lang} dark={dark} brand={look.brand} color={color} />;
        return <LiveStatusCard node={n} color={color ?? null} words={p.liveWords ?? LIVE_STATUS_WORDS_EN} />;
      case "school":
        // 128 The family's school day as the app draws it, with a sample family.
        return <SchoolCard node={n} dark={dark} brand={look.brand} color={color ?? null} words={{ ...(p.schoolWords ?? SCHOOL_WORDS_EN), ...(p.greeting ? { date: p.greeting.date } : {}) }} title={text || null} />;
      case "market":
        // 115.14 The section as the app draws it, from the project's marketplace (the app's samples where it has none).
        return <MarketSection node={n} lang={lang} defaultLang={defaultLang} dark={dark} brand={look.brand} accent={look.accent} color={color} data={p.market} />;
      case "spacer":
        return null;
      // 128 A photo with a scrim or a drawn map, what it holds over it, its last element hanging over its foot.
      case "photo_hero":
      case "map_header": {
        const kids = n.children ?? [];
        const hang = (n.overlap ?? 0) > 0 && kids.length ? kids[kids.length - 1]! : null;
        // 128.10 What it holds may be see-through on it (a frosted button).
        const inside = { ...p, inCover: true };
        const front = Children({ ...inside, node: { ...n, type: "column", children: hang ? kids.slice(0, -1) : kids } });
        return <Cover node={n} dark={dark} rtl={lang === "ar"} lang={lang} front={front} last={hang ? <Node {...inside} node={hang} parentDir="column" /> : null} />;
      }
      // 128 The person's shipment or ride on its way, or the taxis near them, and a greeting: samples here.
      case "tracking":
        if (liveLookOf(n)) return <LiveLookCard node={n} lang={lang} dark={dark} brand={look.brand} color={color} />;
        return <TrackingCard node={n} lang={lang} dark={dark} brand={look.brand} second={look.accent} color={color} />;
      case "greeting":
        // 130.11 Its own words, when it has them.
        return <GreetingText lang={lang} sample={p.greeting?.hello} own={textIn(n, lang, defaultLang) || null} />;
      // 129 Premium motion & media.
      case "stories":
        return <StoriesRow node={n} lang={lang} defaultLang={defaultLang} dark={dark} brand={look.brand} accent={look.accent} />;
      case "marquee":
        return <Marquee node={n} text={text} rtl={lang === "ar"} accent={look.accent} dark={dark} />;
      case "before_after":
        return <BeforeAfter node={n} lang={lang} defaultLang={defaultLang} dark={dark} words={p.words} />;
      case "segments":
        return <Segments node={n} dark={dark} rtl={lang === "ar"} />;
      case "gallery":
        return <GalleryGrid node={n} lang={lang} defaultLang={defaultLang} dark={dark} words={p.words} />;
      case "video_hero":
      case "parallax_banner":
        return <MediaBanner node={n} dark={dark} rtl={lang === "ar"} front={Children({ ...p, node: { ...n, type: "column" } })} />;
      // 129.11–129.20 The premium elements; a profile card's own elements under the person.
      case "testimonials":
      case "pricing":
      case "stats":
      case "progress":
      case "timeline":
      case "bento":
      case "badge_text":
      case "cta_bar":
      case "profile_card":
        return (
          <PremiumElement
            node={n}
            lang={lang}
            defaultLang={defaultLang}
            dark={dark}
            brand={look.brand}
            accent={look.accent}
            color={color}
            words={p.premiumWords ?? PREMIUM_WORDS_EN}
            editing={!!editing}
            front={n.type === "profile_card" ? Children({ ...p, node: { ...n, type: "column" } }) : undefined}
          />
        );
      case "text":
        // 124.6 Its lines at most, the rest cut off as the app does (a line clamp needs the box).
        return <span style={{ display: n.max_lines ? "-webkit-box" : "block", WebkitBoxOrient: n.max_lines ? "vertical" : undefined, whiteSpace: "pre-wrap", WebkitLineClamp: n.max_lines ?? undefined, overflow: n.max_lines ? "hidden" : undefined }}>{text}</span>;
      case "button":
        return (
          <span style={{ display: "flex", alignItems: "center", justifyContent: n.text_align === "start" ? "flex-start" : n.text_align === "end" ? "flex-end" : "center", gap: 8, height: "100%", flexDirection: n.icon_position === "start" ? "row" : "row-reverse", minHeight: 40, paddingInline: n.padding ? 0 : 16 }}>
            {n.icon ? (
              <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: n.icon_size ?? 20, ...mirrored(n.icon, lang === "ar") }}>
                {n.icon}
              </span>
            ) : null}
            <span>{text}</span>
          </span>
        );
      case "icon":
        return (
          <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: n.icon_size ?? 24, display: "block", ...mirrored(n.icon, lang === "ar") }}>
            {n.icon}
          </span>
        );
      case "image":
        return n.image_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- any picture's link, drawn as the app draws it */}
            <img src={n.image_url} alt="" data-studio-tone={n.tone} style={{ width: "100%", height: "100%", objectFit: n.fit ?? "cover", display: "block", ...toneStyle(n.tone) }} />
            {overlay ? <span aria-hidden="true" data-studio-overlay="" style={{ position: "absolute", inset: 0, background: overlay }} /> : null}
            {scrim ? <span aria-hidden="true" data-studio-scrim="" style={{ position: "absolute", inset: 0, background: scrim }} /> : null}
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
                {/* 132.58 The second can tick between the server's drawing and the browser's. */}
                <span suppressHydrationWarning style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                  {String(value).padStart(2, "0")}
                </span>
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
        // 208 The category menu: every main category a row of cards.
        if (n.style === "rows") return <CategoryMenuCanvas node={n} pickable={p.pickable} dark={dark} lang={lang} color={color} />;
        // 208 The main categories only, as the app draws them (the menu's rows hold the sub-categories).
        const cats = ((n.source ? p.pickable.categories[n.source] : undefined) ?? []).filter((c) => !c.parent_id);
        const names = cats.length ? cats.slice(0, 6).map((c) => c.name) : ["[1]", "[2]", "[3]"];
        // 112.4 Tiles, pictures in a grid, or round pictures in a row; a category without a picture shows a colour.
        const shades = dark ? ["#2A2742", "#33304F", "#3B3858"] : ["#F3E3C3", "#E8EEF6", "#F6E3E7"];
        if (n.style === "pictures" || n.style === "tiles")
          return (
            <span data-studio-categories={n.style} style={{ display: "grid", gridTemplateColumns: `repeat(${n.style === "pictures" ? (n.columns ?? 2) : 2}, minmax(0, 1fr))`, gap: 10 }}>
              {names.map((name, i) => (
                <span key={i} style={{ position: "relative", borderRadius: 14, background: shades[i % 3], aspectRatio: n.style === "pictures" ? "1 / 1" : undefined, padding: n.style === "tiles" ? 14 : 0, overflow: "hidden", display: "flex", alignItems: "flex-end" }}>
                  <span style={n.style === "pictures" ? { width: "100%", padding: "18px 10px 8px", background: "linear-gradient(transparent, rgba(0,0,0,0.55))", color: "#FFFFFF", fontWeight: 700, fontSize: 13 } : { fontWeight: 700, fontSize: 14 }}>{name}</span>
                </span>
              ))}
            </span>
          );
        if (n.style === "circles")
          return (
            <span data-studio-categories="circles" style={{ display: "flex", gap: 12, overflow: "hidden" }}>
              {names.map((name, i) => (
                <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "0 0 auto", width: 68 }}>
                  <span style={{ width: 64, height: 64, borderRadius: "50%", background: shades[i % 3], border: `2px solid ${i === 0 ? look.brand : "transparent"}` }} />
                  <span style={{ fontSize: 11, fontWeight: 600, textAlign: "center", maxWidth: 68, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
                </span>
              ))}
            </span>
          );
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
    // 128.10 Of the elements the app shows (it never gets the hidden ones).
    const givesWay = dir === "row" ? textGivingWay(kids.filter((k) => !k.hidden)) : null;
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
    // 189 While editing, a slider showing one slide at a time shows the one holding what's selected (the first otherwise).
    const oneSlide = n.type === "slider" && editing && (n.per_view ?? 1) <= 1 ? shownSlide(n, editing.selectedId) : -1;
    kids.forEach((child, i) => {
      if (drop === i) out.push(<DropLine key={`drop${i}`} dir={dir} label={editing!.dropLabel} />);
      if (n.type === "tabs" && i !== shownTab) return;
      if (oneSlide >= 0 && i !== oneSlide) return;
      const width = n.type === "slider" ? { width: `${100 / (n.per_view ?? 1)}%` } : {};
      const view = <Node {...p} node={child} parentDir={dir} rowGivesWay={dir === "row" ? givesWay : null} inStack={dir === "stack" ? { first: i === 0, cross: n.cross } : undefined} />;
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
          <div key={child.id} style={n.type === "slider" ? { ...width, flex: "0 0 auto", scrollSnapAlign: "start", display: "grid" } : { display: "contents" }}>
            {view}
          </div>
        ),
      );
    });
    if (drop !== null && drop >= kids.length) out.push(<DropLine key="dropEnd" dir={dir} label={editing!.dropLabel} />);
    if (!kids.length && editing) out.push(<EmptyLayout key="empty" />);
    return <>{out}</>;
  }

  /** 112.4 The slides side by side, and where it is: dots under them, lines over their bottom or "1 / 3" over their corner. */
  function Slider(p: ViewProps & { node: StudioNode }) {
    const n = p.node;
    const kids = n.children ?? [];
    const count = kids.length;
    const indicator = n.dots === false || count < 2 ? null : (n.indicator ?? "dots");
    // 189 The slide being edited (the first in the app's own drawing): the indicator shows where it is.
    const open = editing ? shownSlide(n, editing.selectedId) : 0;
    const labels = editing?.slides;
    const go = (to: number) => (e: MouseEvent) => {
      e.stopPropagation();
      editing?.onSelect(kids[(to + count) % count]!.id);
    };
    const round: CSSProperties = { pointerEvents: "auto", width: 34, height: 34, borderRadius: 999, border: "0", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(14,13,36,0.62)", color: "#FFFFFF", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.25)" };
    return (
      <>
        <span style={{ position: "relative", display: "block", height: slides?.height ?? (slides?.aspectRatio ? undefined : 180), aspectRatio: slides?.aspectRatio }}>
          <span
            data-studio-ken-burns={n.ken_burns ? "" : undefined}
            // 189 Several at a time: the slide being edited scrolled into the slider's view.
            ref={editing && (n.per_view ?? 1) > 1 && open > 0 ? (el) => (el?.children[open] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest", inline: "start" }) : undefined}
            style={{ display: "flex", gap: n.gap, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none", height: "100%" }}
          >
            {Children(p)}
          </span>
          {/* 189 Studio's own buttons (never in the app): the slide before and after, which slide this is, and for the app's stories the way to Stories. */}
          {editing && labels && count > 1 ? (
            <span data-studio-slide-nav="" style={{ position: "absolute", insetInline: 8, top: "50%", transform: "translateY(-50%)", display: "flex", justifyContent: "space-between", pointerEvents: "none", zIndex: 4 }}>
              <button type="button" aria-label={labels.previous} title={labels.previous} onClick={go(open - 1)} style={round}>
                <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 22, transform: lang === "ar" ? "scaleX(-1)" : undefined }}>
                  chevron_left
                </span>
              </button>
              <button type="button" aria-label={labels.next} title={labels.next} onClick={go(open + 1)} style={round}>
                <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 22, transform: lang === "ar" ? "scaleX(-1)" : undefined }}>
                  chevron_right
                </span>
              </button>
            </span>
          ) : null}
          {editing && labels && (count > 1 || (labels.storiesSaved && storiesSlider(n))) ? (
            <span style={{ position: "absolute", insetInline: 0, bottom: 10, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, pointerEvents: "none", zIndex: 4 }}>
              {count > 1 ? (
                <span data-studio-slide-of="" style={{ padding: "3px 10px", borderRadius: 999, background: "rgba(14,13,36,0.62)", color: "#FFFFFF", fontSize: 11, fontWeight: 700 }}>
                  {labels.of.replace("{n}", String(open + 1)).replace("{count}", String(count))}
                </span>
              ) : null}
              {labels.storiesSaved && storiesSlider(n) ? (
                <a
                  href={labels.storiesHref}
                  target="_blank"
                  rel="noopener"
                  data-studio-edit-stories=""
                  onClick={(e) => e.stopPropagation()}
                  style={{ pointerEvents: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 999, background: "#FFFFFF", color: "#0E0D24", fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 2px 10px rgba(0,0,0,0.3)" }}
                >
                  <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 18 }}>
                    auto_stories
                  </span>
                  {labels.editStories}
                </a>
              ) : null}
            </span>
          ) : null}
          {/* 129.1 The dots in a frosted pill over the slides' foot. */}
          {indicator === "pill" ? <SliderPill count={count} look={n.indicator_look} at={open} /> : null}
          {indicator === "progress" ? (
            // 129.1 At the top or the foot, as far from it as the owner set, in their colour.
            <span data-studio-indicator="progress" aria-hidden="true" style={{ position: "absolute", insetInline: 16, ...edge(n.indicator_look), display: "flex", gap: 4 }}>
              {Array.from({ length: count }, (_, i) => (
                <span key={i} style={{ flex: "1 1 0", height: 3, borderRadius: 2, background: i < open ? (n.indicator_look?.color ?? "#FFFFFF") : i === open ? `linear-gradient(${lang === "ar" ? 270 : 90}deg, ${n.indicator_look?.color ?? "#FFFFFF"} 55%, rgba(255,255,255,0.45) 55%)` : "rgba(255,255,255,0.45)" }} />
              ))}
            </span>
          ) : null}
          {n.indicator_look?.count && count > 1 ? <SliderCount count={count} look={n.indicator_look} at={open} /> : null}
          {indicator === "count" ? (
            <span data-studio-indicator="count" style={{ position: "absolute", insetInlineEnd: 10, top: 10, padding: "3px 9px", borderRadius: 999, background: "rgba(14,13,36,0.55)", color: "#FFFFFF", fontSize: 11, fontWeight: 700 }}>
              <bdi>
                {open + 1} / {count}
              </bdi>
            </span>
          ) : null}
        </span>
        {indicator === "dots" ? (
          <span data-studio-indicator="dots" aria-hidden="true" style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8 }}>
            {Array.from({ length: count }, (_, i) => (
              <span key={i} style={{ width: i === open ? 16 : 6, height: 6, borderRadius: 3, background: i === open ? look.brand : dark ? "#3B3858" : "#D9D3C7" }} />
            ))}
          </span>
        ) : null}
      </>
    );
  }

  function Items(p: ViewProps & { node: StudioNode }) {
    const n = p.node;
    // The project's entries; while it has none, the samples its kind gets (never a numbered box when there are some).
    const own = (n.source ? p.pickable.items[n.source] : undefined) ?? [];
    const entries = own.length ? own : ((n.source ? (p.pickable.samples?.[lang] ?? p.pickable.samples?.en)?.[n.source] : undefined) ?? []);
    const count = Math.max(1, Math.min(n.query?.limit ?? 4, 6));
    const shown: PickableEntry[] = entries.length ? entries.slice(0, count) : Array.from({ length: count }, (_, i) => ({ id: String(i), title: `[${i + 1}]`, price: p.words.price }));
    const layout = n.layout ?? "grid";
    const wrap: CSSProperties =
      layout === "grid"
        ? { display: "grid", gridTemplateColumns: `repeat(${n.columns ?? 2}, minmax(0, 1fr))`, gap: n.gap ?? 10 }
        : layout === "carousel"
          ? { display: "flex", gap: n.gap ?? 10, overflow: "hidden" }
          : { display: "flex", flexDirection: "column", gap: n.gap ?? 10 };
    const shades = dark ? ["#3A3020", "#1E3A2E", "#2A2840", "#3A2434"] : ["#F2E3C9", "#D7EBE2", "#E6E3EF", "#EEDDE8"];
    // 193 Add to cart under each product's card, as the app draws it on Leqaa's looks.
    const quickAdd = Boolean(p.quickAdd) && n.source === "products";
    const addButton = (
      <span data-studio-quick-add="" style={{ marginTop: 8, height: 34, borderRadius: 12, background: look.brand, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden" }}>
        <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 16 }}>
          add_shopping_cart
        </span>
        {quickAddLabel(lang)}
      </span>
    );
    const list = (
      <span style={wrap}>
        {shown.map((entry, i) =>
          n.card ? (
            <span key={entry.id} style={layout === "carousel" ? { flex: "0 0 60%" } : quickAdd ? { display: "flex", flexDirection: "column" } : undefined}>
              <CardOf {...p} node={n.card} entry={{ id: entry.id, title: entry.title, price: entry.price ?? "", subtitle: entry.subtitle ?? "", imageUrl: entry.imageUrl ?? null, badge: entry.badge ?? "", rating: entry.rating ?? null, sale: entry.sale ?? null }} />
              {quickAdd ? addButton : null}
            </span>
          ) : (
            <span key={entry.id} data-studio-entry={entry.id} style={{ background: dark ? "#22203A" : "#FFFFFF", borderRadius: 14, padding: 8, boxShadow: "0 2px 6px rgba(20,54,31,0.08)", display: layout === "list" ? "flex" : "block", gap: 8, minWidth: 0, ...(layout === "carousel" ? { flex: "0 0 60%" } : {}) }}>
              <span style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: layout === "list" ? 56 : 74, width: layout === "list" ? 56 : "auto", flex: "none", borderRadius: 10, overflow: "hidden", background: shades[i % shades.length] }}>
                {entry.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the entry's own picture, as the app's card shows it
                  <img src={entry.imageUrl} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : entries.length ? (
                  <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 24, color: dark ? "rgba(185,181,202,0.45)" : "rgba(94,91,112,0.45)" }}>
                    image
                  </span>
                ) : null}
                {entry.badge && layout !== "list" && !entry.sale ? <span style={{ position: "absolute", top: 6, insetInlineStart: 6, maxWidth: "calc(100% - 12px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: look.brand, color: "#FFFFFF", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>{entry.badge}</span> : null}
                {/* 131 The sale on the card, as the products element's `sale_badge` says (a chip by default). */}
                {entry.sale && layout !== "list" && n.sale_badge?.style !== "price" ? (
                  <span data-studio-sale-badge={n.sale_badge?.style ?? "chip"} style={n.sale_badge?.style === "ribbon" ? { position: "absolute", top: 10, insetInlineEnd: -22, transform: "rotate(45deg)", background: n.sale_badge.color ?? look.brand, color: "#FFFFFF", fontSize: 10, fontWeight: 800, padding: "2px 26px" } : { position: "absolute", top: 6, insetInlineStart: 6, background: n.sale_badge?.color ?? look.brand, color: "#FFFFFF", fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 999 }}>
                    −{entry.sale.percentOff}%
                  </span>
                ) : null}
              </span>
              <span style={{ display: "block", minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginTop: layout === "list" ? 0 : 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.title}</span>
                {entry.sale ? (
                  <span style={{ display: "flex", gap: 5, alignItems: "baseline", fontSize: 11 }}>
                    <span style={{ fontWeight: 800, color: n.sale_badge?.color ?? look.brand }}>{entry.sale.now}</span>
                    <span style={{ textDecoration: "line-through", opacity: 0.55 }}>{entry.sale.was}</span>
                  </span>
                ) : entry.price || entry.subtitle ? (
                  <span style={{ display: "block", fontSize: 11, opacity: 0.7, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.price || entry.subtitle}</span>
                ) : null}
                {quickAdd ? addButton : null}
              </span>
            </span>
          ),
        )}
      </span>
    );
    // 112.4 A list's own title (what was seen lately), over it.
    const title = titleIn(n, lang, defaultLang);
    return title ? (
      <span style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <span style={{ fontSize: 18, fontWeight: 800 }}>{title}</span>
        {list}
      </span>
    ) : (
      list
    );
  }
}

/** An items element's card for one entry: its bound elements show the entry. */
function CardOf(props: ViewProps & { node: StudioNode; entry: { id: string; title: string; price: string; subtitle: string; imageUrl: string | null; badge: string; rating?: number | null; sale?: PickableEntry["sale"] } }) {
  const { entry } = props;
  // 131 A product's sale: the share off and its price before it; nothing when it isn't on sale.
  const sale = (node: StudioNode): string => (node.bind === "sale" ? (entry.sale ? `−${entry.sale.percentOff}%` : "") : entry.sale ? entry.sale.was : "");
  // 128.8 A rating: the element's own text, a star and the rating; nothing without one.
  const rating = (node: StudioNode): string => (entry.rating ? `${node.text ? `${node.text} ` : ""}★ ${entry.rating.toFixed(1)}` : "");
  const bound = (node: StudioNode): string | null =>
    node.bind === "title"
      ? entry.title
      : node.bind === "price"
        ? (entry.sale?.now ?? entry.price)
        : node.bind === "subtitle"
          ? entry.subtitle
          : node.bind === "badge"
            ? entry.badge
            : node.bind === "rating"
              ? rating(node)
              : node.bind === "sale" || node.bind === "was_price"
                ? sale(node)
                : null;
  const fill = (node: StudioNode): StudioNode => ({
    ...node,
    ...(bound(node) !== null ? { text: bound(node)!, translations: undefined } : {}),
    // 124.6 What the entry hasn't (a course without a badge) leaves no empty pill, as in the app.
    ...(bound(node) !== null && !bound(node)!.trim() ? { hidden: true } : {}),
    ...(node.bind === "image" && entry.imageUrl ? { image_url: entry.imageUrl } : {}),
    ...(node.children ? { children: node.children.map(fill) } : {}),
  });
  // 124.6 Only the view's own props: the card (and where the list sits) would stand in for the filled card.
  const { node: card, entry: _entry, parentDir: _dir, inStack: _stack, ...view } = props as typeof props & { parentDir?: unknown; inStack?: unknown };
  void _entry;
  void _dir;
  void _stack;
  return <StudioView {...view} page={{ body: fill(card), show_tabs: false, background: "transparent" }} editing={undefined} />;
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

/**
 * 120 The app's own screen under a page's elements. 124.8 As the app draws
 * it, in the look chosen in Studio › Screens, where the canvas has a
 * drawing of it (components/studio/app-screens.tsx): only a drawing, so a
 * click selects nothing and a drop lands at the end of the page's
 * elements; on the pointer, a note says so, with the way to its look.
 * Without a drawing yet: the screen's name, that the app draws it, and
 * the way to its look when Studio › Screens has one.
 */
function ScreenPart(props: ViewProps) {
  const { page, dark, lang, look, pickable } = props;
  const part: ScreenPartInfo = props.screenPart ?? { name: page.screen ?? "", drawing: null, looksHref: null, words: { drawnLook: "", drawnOwn: "", open: "", hint: "" } };
  const [hover, setHover] = useState(false);
  const link = (onDark: boolean) =>
    part.looksHref ? (
    <a
      href={part.looksHref}
      target="_blank"
      rel="noopener"
      onClick={(e) => e.stopPropagation()}
      data-studio-screen-looks=""
      style={{ pointerEvents: "auto", display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 999, background: onDark ? "#FFFFFF" : "#0E0D24", color: onDark ? "#0E0D24" : "#FFFFFF", fontSize: 11.5, fontWeight: 800, textDecoration: "none", whiteSpace: "nowrap" }}
    >
      {part.words.open}
      <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 14 }}>
        open_in_new
      </span>
    </a>
  ) : null;
  if (part.drawing) {
    const own = pickable.items.courses ?? [];
    const courses = own.length ? own : ((pickable.samples?.[lang] ?? pickable.samples?.en)?.courses ?? []);
    const tab = look.tabs.find((t) => t.id === look.activeTab);
    const tabLabel = tab ? ((lang !== props.defaultLang ? (tab.translations?.[lang]?.label as string | undefined) : undefined) ?? tab.label) : null;
    return (
      <div
        data-studio-screen=""
        data-studio-screen-name={part.name}
        title={props.editing ? part.words.hint : undefined}
        onMouseEnter={props.editing ? () => setHover(true) : undefined}
        onMouseLeave={props.editing ? () => setHover(false) : undefined}
        style={{ position: "relative", flex: "1 0 auto", display: "flex", flexDirection: "column", cursor: props.editing ? "default" : undefined, userSelect: "none" }}
      >
        {/* 130.21 A system screen in its premium look (premium-chrome.tsx). */}
        {part.drawing.screen === "system" ? (
          <SystemScreen
            screen={part.drawing.key}
            look={part.drawing.look}
            dark={dark}
            lang={lang}
            brand={look.brand}
            accent={look.accent ?? null}
            image={part.drawing.image}
            title={tabLabel}
            hidesTitle={Boolean(page.header)}
            top={page.header || page.body.children?.length || props.editing ? 0 : 30}
          />
        ) : part.drawing.screen === "checkout" ? (
          // 131.25 The store's checkout in the gift look (gift-checkout.tsx), drawn with a sample order.
          <GiftCheckout look={part.drawing.look} dark={dark} lang={lang} brand={look.brand} photo="/flower-photos/blush-bouquet.jpg" top={page.header || page.body.children?.length || props.editing ? 0 : 30} />
        ) : part.drawing.screen === "courses" ? (
          // 130.52 A course screen in Studio's course screens' look.
          <CourseScreenDrawing
            part={part.drawing.part}
            design={part.drawing.look}
            dark={dark}
            lang={lang}
            brand={look.brand}
            accent={look.accent ?? null}
            courses={courses}
            tabLabel={tabLabel}
            top={page.header || page.body.children?.length || props.editing ? 0 : 30}
          />
        ) : (
        <AppScreen
          drawing={part.drawing}
          dark={dark}
          lang={lang}
          brand={look.brand}
          accent={look.accent ?? null}
          appName={look.name}
          tabLabel={tabLabel}
          courses={courses}
          own={own.length > 0}
          categories={(pickable.categories.courses ?? []).map((c) => c.name)}
          hidesTitle={Boolean(page.header)}
          // Room for the status bar when nothing is over it (in the editor the empty page's drop box takes it).
          top={page.header || page.body.children?.length || props.editing ? 0 : 30}
        />
        )}
        {props.editing && hover ? (
          <span style={{ position: "absolute", top: 8, insetInline: 10, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 4 }}>
            <span data-studio-screen-hint="" style={{ display: "inline-flex", alignItems: "center", gap: 8, maxWidth: "100%", padding: "6px 6px 6px 12px", borderRadius: 999, background: "rgba(14,13,36,0.88)", color: "#F4EFE6", fontSize: 11.5, fontWeight: 700, boxShadow: "0 6px 16px rgba(14,13,36,0.25)" }}>
              <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 16 }}>
                apps
              </span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{part.name}</span>
              {link(true)}
            </span>
          </span>
        ) : null}
      </div>
    );
  }
  const row = dark ? "#26233A" : "#ECE6DA";
  const line = dark ? "#34314A" : "#DDD5C6";
  const entries = (part.entries ?? []).slice(0, 6);
  if (entries.length) {
    // 127 The screen's real content where the project has it: its entries, as rows the app lists.
    const ink = dark ? "#F4EFE6" : "#0E0D24";
    const soft = dark ? "#B8B3C8" : "#5E5B70";
    return (
      <div data-studio-screen="" data-studio-screen-name={part.name} data-studio-screen-entries={entries.length} style={{ position: "relative", flex: "1 0 auto", minHeight: 300, display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px 18px", pointerEvents: "none" }}>
        {entries.map((e, i) => (
          <span key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 64, borderRadius: 16, background: row, padding: "8px 12px" }}>
            {e.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- the project's own entry's picture
              <img src={e.imageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 12, objectFit: "cover", flex: "none" }} />
            ) : (
              <span style={{ width: 44, height: 44, borderRadius: 12, background: line, flex: "none", opacity: 0.6 + (i % 3) * 0.1 }} />
            )}
            <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
              <b style={{ fontSize: 13.5, fontWeight: 700, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</b>
              {e.subtitle || e.price ? <span style={{ fontSize: 12, color: soft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[e.subtitle, e.price].filter(Boolean).join(" · ")}</span> : null}
            </span>
          </span>
        ))}
      </div>
    );
  }
  return (
    <div data-studio-screen="" data-studio-screen-name={part.name} style={{ position: "relative", flex: "1 0 auto", minHeight: 300, display: "flex", flexDirection: "column", gap: 10, padding: "14px 16px 18px", pointerEvents: "none" }}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} aria-hidden="true" style={{ display: "flex", alignItems: "center", gap: 12, height: 64, borderRadius: 16, background: row, padding: "0 12px", opacity: 0.7 }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: line, flex: "none" }} />
          <span style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
            <span style={{ height: 9, width: `${70 - i * 9}%`, borderRadius: 5, background: line }} />
            <span style={{ height: 8, width: `${45 + i * 7}%`, borderRadius: 5, background: line, opacity: 0.7 }} />
          </span>
        </span>
      ))}
      <span style={{ position: "absolute", top: 34, insetInline: 18, display: "flex", justifyContent: "center" }}>
        <span data-studio-screen-placeholder="" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, maxWidth: 260, padding: "14px 16px", borderRadius: 18, textAlign: "center", background: dark ? "#F4EFE6" : "#0E0D24", color: dark ? "#0E0D24" : "#F4EFE6", boxShadow: "0 8px 20px rgba(14,13,36,0.22)" }}>
          <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 22 }}>
            apps
          </span>
          <b style={{ fontSize: 14, fontWeight: 800 }}>{part.name}</b>
          {part.words.drawnOwn ? <span style={{ fontSize: 12, lineHeight: 1.4, opacity: 0.85 }}>{part.looksHref ? part.words.drawnLook : part.words.drawnOwn}</span> : null}
          {part.looksHref ? <span style={{ marginTop: 4 }}>{link(!dark)}</span> : null}
        </span>
      </span>
    </div>
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
 * 174.2 The selected element's corners and its size, drawn over the phone
 * (the editor's `[data-studio-handles]` layer) rather than inside the
 * element: a rounded element, a text cut to its lines and the phone's
 * screen all clip what is inside them, so handles drawn 9px outside the
 * element were cut off on buttons, chips, rounded cards and full-width rows
 * and a drag or a double click landed on the element underneath. The layer
 * follows the element as the page scrolls, zooms or changes. Without the
 * layer (a view outside the editor) they are drawn inside it, as before.
 */
function SelectionHandles({ id, rtl, onResize, onAsk, onAuto }: { id: string; rtl: boolean; onResize?: StudioEditing["onResize"]; onAsk?: (id: string) => void; onAuto?: (id: string) => void }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  const [box, setBox] = useState<HandleBox | null>(null);
  useLayoutEffect(() => {
    const el = anchor.current?.parentElement;
    const host = el?.closest<HTMLElement>("[data-studio-phone-frame]")?.querySelector<HTMLElement>("[data-studio-handles]") ?? null;
    setLayer(host);
    if (!el || !host) return;
    let frame = 0;
    let last = "";
    const measure = () => {
      const next = handleBox(el, host);
      const key = next ? `${next.x},${next.y},${next.w},${next.h},${next.top},${next.bottom},${next.size}` : "";
      if (key !== last) {
        last = key;
        setBox(next);
      }
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [id]);
  const target = () => anchor.current?.parentElement ?? null;
  const corners = (["top", "bottom"] as const).flatMap((v) => (["insetInlineStart", "insetInlineEnd"] as const).map((h) => ({ v, h })));
  if (!layer) {
    return (
      <>
        <span ref={anchor} aria-hidden="true" data-studio-anchor="" style={{ display: "none" }} />
        {corners.map(({ v, h }) => <Corner key={`${v}${h}`} v={v} h={h} rtl={rtl} id={id} target={target} onResize={onResize} onAsk={onAsk} onAuto={onAuto} />)}
        <SizeBadge id={id} />
      </>
    );
  }
  return (
    <>
      <span ref={anchor} aria-hidden="true" data-studio-anchor="" style={{ display: "none" }} />
      {box
        ? createPortal(
            <span data-studio-handles-for={id} style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, pointerEvents: "none" }}>
              {corners.map(({ v, h }) => ((v === "top" ? box.top : box.bottom) ? <Corner key={`${v}${h}`} v={v} h={h} rtl={false} id={id} target={target} onResize={onResize} onAsk={onAsk} onAuto={onAuto} /> : null))}
              {box.bottom ? <SizeBadge id={id} text={box.size} /> : null}
            </span>,
            layer,
          )
        : null}
    </>
  );
}

interface HandleBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Whether the element's top and foot are on the screen (a handle scrolled out of it isn't drawn over the frame). */
  top: boolean;
  bottom: boolean;
  size: string;
}

/** Where the element sits in the layer, in the phone's pixels (the frame may be zoomed). */
function handleBox(el: HTMLElement, layer: HTMLElement): HandleBox | null {
  const r = el.getBoundingClientRect();
  const l = layer.getBoundingClientRect();
  if (!l.width || !layer.offsetWidth) return null;
  const scale = l.width / layer.offsetWidth;
  const screen = (layer.parentElement?.querySelector(".studio-screen") as HTMLElement | null)?.getBoundingClientRect() ?? l;
  const inside = (y: number) => y >= screen.top - 1 && y <= screen.bottom + 1;
  return {
    x: (r.left - l.left) / scale,
    y: (r.top - l.top) / scale,
    w: r.width / scale,
    h: r.height / scale,
    top: inside(r.top),
    bottom: inside(r.bottom),
    size: `${Math.round(r.width)} × ${Math.round(r.height)}`,
  };
}

/**
 * A corner of the selected element. 108.1 Dragging it resizes the element
 * (Shift keeps its shape); a double click gives it back its own size.
 * 159 An element of automatic size asks first (`onAsk`); a double click puts
 * it back to its automatic size (`onAuto`).
 */
function Corner({ v, h, rtl, id, target, onResize, onAsk, onAuto }: { v: "top" | "bottom"; h: "insetInlineStart" | "insetInlineEnd"; rtl: boolean; id: string; target: () => HTMLElement | null; onResize?: StudioEditing["onResize"]; onAsk?: (id: string) => void; onAuto?: (id: string) => void }) {
  const right = (h === "insetInlineEnd") !== rtl;
  // In the layer (left to right, so `rtl` is false there) the side is the screen's; inside the element, its own start and end.
  const style: CSSProperties = { position: "absolute", [v]: -9, [h]: -9, width: 9, height: 9, background: "#FFFFFF", border: "2px solid #3D63FF", borderRadius: 2, zIndex: 6, boxSizing: "content-box", pointerEvents: "auto" };
  if (!onResize) return <span aria-hidden="true" style={style} />;
  function down(e: PointerEvent<HTMLSpanElement>) {
    const el = target();
    if (!el || e.button !== 0 || !onResize) return;
    e.preventDefault();
    e.stopPropagation();
    // 159 Its size is automatic: once the corner is dragged, Studio asks before it changes by hand (a click or a
    // double click alone asks nothing).
    if (onAsk) {
      const from = { x: e.clientX, y: e.clientY };
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);
      const moved = (m: globalThis.PointerEvent) => {
        if (Math.abs(m.clientX - from.x) < RESIZE_START && Math.abs(m.clientY - from.y) < RESIZE_START) return;
        stop();
        onAsk(id);
      };
      const stop = () => {
        target.removeEventListener("pointermove", moved);
        target.removeEventListener("pointerup", stop);
        target.removeEventListener("pointercancel", stop);
      };
      target.addEventListener("pointermove", moved);
      target.addEventListener("pointerup", stop);
      target.addEventListener("pointercancel", stop);
      return;
    }
    const box = el.getBoundingClientRect();
    // The phone may be zoomed: its pixels, not the screen's.
    const scale = el.offsetWidth ? box.width / el.offsetWidth : 1;
    // 159 What holds it: the layout's own box, past the wrapper each element is drawn in (`display: contents`, no box,
    // no width), so a width dragged up to it becomes "fill" and a half or a third of it snaps.
    let holder = el.parentElement;
    while (holder && getComputedStyle(holder).display === "contents") holder = holder.parentElement;
    const room = holder ? holder.clientWidth - (parseFloat(getComputedStyle(holder).paddingLeft) || 0) - (parseFloat(getComputedStyle(holder).paddingRight) || 0) : 0;
    const start = { x: e.clientX, y: e.clientY, width: el.offsetWidth, height: el.offsetHeight, room };
    const drag = Date.now();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    // Editor audit 3.3: a guide over what holds it while the width sits on a half or a third of it.
    let guide: HTMLSpanElement | null = null;
    const show = (g: { share: string; width: number } | null) => {
      if (!holder || !g) {
        guide?.remove();
        guide = null;
        return;
      }
      if (!guide) {
        guide = document.createElement("span");
        guide.setAttribute("aria-hidden", "true");
        guide.dataset.studioGuide = "";
        Object.assign(guide.style, { position: "absolute", top: "0", bottom: "0", borderInline: "1.5px dashed #FF4D8D", background: "rgba(255,77,141,0.06)", pointerEvents: "none", zIndex: "5" });
        holder.appendChild(guide);
      }
      const pad = parseFloat(getComputedStyle(holder).paddingInlineStart) || 0;
      guide.style.insetInlineStart = `${pad}px`;
      guide.style.width = `${g.width}px`;
      guide.dataset.studioGuide = g.share;
    };
    const move = (m: globalThis.PointerEvent) => {
      const dx = ((m.clientX - start.x) / scale) * (right ? 1 : -1);
      const dy = ((m.clientY - start.y) / scale) * (v === "bottom" ? 1 : -1);
      // Sizes land on the grid and on shares of what holds it; Alt puts them anywhere.
      const { size, guide: g } = snapped(resized(start, { dx, dy, keepRatio: m.shiftKey }), start, m.altKey);
      show(g);
      if (size.width !== undefined || size.height !== undefined) onResize(id, size, drag);
    };
    const up = () => {
      show(null);
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
        if (onAuto) onAuto(id);
        else onResize(id, { width: undefined, height: undefined }, Date.now());
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
function SizeBadge({ id, text }: { id: string; text?: string }) {
  return (
    <span
      data-studio-size={id}
      dir="ltr"
      style={{ position: "absolute", bottom: -30, left: "50%", transform: "translateX(-50%)", background: "#3D63FF", color: "#FFFFFF", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap", zIndex: 6 }}
      ref={(el) => {
        if (!el) return;
        if (text !== undefined) el.textContent = text;
        else {
          const box = el.parentElement?.getBoundingClientRect();
          if (box) el.textContent = `${Math.round(box.width)} × ${Math.round(box.height)}`;
        }
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
      return { display: "flex", flexDirection: "column" };
    case "spacer":
      return { flex: node.height === undefined ? "1 1 auto" : undefined };
    case "divider":
      return { height: node.height ?? 1 };
    default:
      return {};
  }
}
