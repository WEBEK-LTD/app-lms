import type { CSSProperties, ReactNode } from "react";
import type { PickableEntry } from "@/lib/hosted/pages/pickable";
import type { ScreenDrawing } from "@/lib/studio/screen-drawing";
import type { AccountMenuEntry, CourseCardLook, CoursePageLook, StudioScreens } from "@/lib/studio/screens";
import { screenWords, type ScreenWords } from "@/lib/studio/screen-words";

/**
 * 124.8 The app's own screens in Studio's canvas, as the app draws them
 * (lib/studio/screen-drawing.ts says which): the academy's catalog (the
 * premium Explore or the app's own), My courses, the account, a course's
 * page and a lesson, each in the look chosen in Studio › Screens, in the
 * app's colours (lib/theme/palette.dart: ivory and midnight by day, the
 * night's by night, the project's second colour for the accents and its
 * main colour for the app's own buttons), its font, the language being
 * edited and right to left in Arabic, with the project's courses (else the
 * samples) and sample learning. Only a drawing: nothing in it is an
 * element, so nothing in it is selected or dragged.
 */

export interface AppScreenProps {
  drawing: ScreenDrawing;
  dark: boolean;
  lang: string;
  /** The project's main and second colours, and its name. */
  brand: string;
  accent: string | null;
  appName: string;
  /** The open tab's name, which the premium screens take as their large title. */
  tabLabel: string | null;
  /** The project's courses, else the samples; `own` when they are the project's. */
  courses: PickableEntry[];
  own: boolean;
  categories: string[];
  /** 120 Under the page's header the screen's own title isn't shown (the app's own My courses). */
  hidesTitle: boolean;
  /** Room for the status bar when nothing is over the screen. */
  top: number;
}

// The app's colours (mobile/lib/core/theme/palette.dart).
interface Palette {
  dark: boolean;
  background: string;
  surface: string;
  segment: string;
  border: string;
  divider: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  star: string;
  success: string;
  danger: string;
  accent: string;
  primary: string;
  onPrimary: string;
  placeholders: string[];
}

function hex(c: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  const n = m ? parseInt(m[1]!, 16) : 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** `a` towards `b` by `t` (Color.lerp). */
export function mix(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, "0")).join("")}`;
}
export function alpha(c: string, a: number): string {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
}
function luminance(c: string): number {
  const ch = hex(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}
function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}
/** 110 In the dark the brand colour stays when it stands out (3:1), else it is lightened. */
function visibleOn(colour: string, on: string): string {
  let c = colour;
  for (let i = 0; i < 10 && contrast(c, on) < 3; i++) c = mix(c, "#FFFFFF", 0.2);
  return c;
}

export function appPalette(dark: boolean, brand: string, accent: string | null): Palette {
  const primary = dark ? visibleOn(brand, "#17162E") : brand;
  const onPrimary = luminance(primary) > 0.45 ? "#0E0D24" : "#FFFFFF";
  const second = accent ?? "#FF5A1F";
  if (dark) {
    return {
      dark,
      background: "#0B0A1C",
      surface: "#17162E",
      segment: "#24223F",
      border: "#2C2A47",
      divider: "#24223F",
      text: "#F4EFE6",
      textSecondary: "#B9B5CA",
      textTertiary: "#8C889A",
      star: "#E6A23C",
      success: "#5CCB94",
      danger: "#F2B8B5",
      accent: second,
      primary,
      onPrimary,
      placeholders: ["#3A3020", "#1E3A2E", "#2A2840", "#3A2434"],
    };
  }
  return {
    dark,
    background: "#F4EFE6",
    surface: "#FFFFFF",
    segment: "#E9E2D5",
    border: "#E4DDD0",
    divider: "#EDE7DC",
    text: "#0E0D24",
    textSecondary: "#5E5B70",
    textTertiary: "#6F6B80",
    star: "#C77A12",
    success: "#1C7C4A",
    danger: "#B3261E",
    accent: second,
    primary,
    onPrimary,
    placeholders: ["#F2E3C9", "#D7EBE2", "#E6E3EF", "#EEDDE8"],
  };
}

const GOLD = "#B8893A";
const GOLD_LIGHT = "#E7C982";
const ON_GOLD = "#2A1D05";

function I({ name, size = 20, color, fill, flip, style }: { name: string; size?: number; color?: string; fill?: boolean; flip?: boolean; style?: CSSProperties }) {
  return (
    <span
      className="material-symbols-rounded"
      aria-hidden="true"
      style={{ fontSize: size, width: size, height: size, lineHeight: 1, color, flex: "none", fontVariationSettings: fill ? "'FILL' 1" : undefined, transform: flip ? "scaleX(-1)" : undefined, ...style }}
    >
      {name}
    </span>
  );
}

/** A picture as the app's AppNetworkImage shows it: the entry's, else a tint from the seed. */
function Picture({ url, seed, p, radius = 0, style }: { url?: string | null; seed: number; p: Palette; radius?: number; style?: CSSProperties }) {
  const tint = p.placeholders[seed % p.placeholders.length]!;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "block",
        flex: "none",
        borderRadius: radius,
        overflow: "hidden",
        background: url ? `center / cover no-repeat url("${url}"), ${tint}` : `linear-gradient(135deg, ${mix(tint, p.surface, p.dark ? 0.1 : 0.35)}, ${tint})`,
        ...style,
      }}
    />
  );
}

/** A person's photo in a circle (a stand-in: the editor has no person). */
function Avatar({ size, p, ring }: { size: number; p: Palette; ring?: string }) {
  const face = <span style={{ display: "block", width: size, height: size, borderRadius: "50%", background: p.dark ? "linear-gradient(135deg,#4A3F5C,#2A2840)" : "linear-gradient(135deg,#F6E7EE,#E6D3DD)" }} />;
  if (!ring) return face;
  return <span style={{ display: "block", padding: 2, borderRadius: "50%", border: `2px solid ${ring}`, flex: "none" }}>{face}</span>;
}

/** The progress around a course: a ring in the second colour with the share in it. */
function Ring({ percent, p, size = 42 }: { percent: number; p: Palette; size?: number }) {
  const r = (size - 4) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span style={{ position: "relative", width: size, height: size, flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.divider} strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.accent} strokeWidth={4} strokeDasharray={`${(c * percent) / 100} ${c}`} />
      </svg>
      <b style={{ position: "relative", fontSize: 10, fontWeight: 800, color: p.text }}>{percent}%</b>
    </span>
  );
}

/** Chips in ink, the open one filled (the premium screens'). */
function InkChips({ labels, p, height = 36, fontSize = 13, icons = [] }: { labels: string[]; p: Palette; height?: number; fontSize?: number; icons?: (string | null)[] }) {
  return (
    <div style={{ display: "flex", gap: 8, overflow: "hidden", flex: "none" }}>
      {labels.map((label, i) => (
        <span
          key={i}
          data-screen-chip=""
          style={{ flex: "none", height, display: "inline-flex", alignItems: "center", gap: 4, padding: "0 14px", borderRadius: 999, background: i === 0 ? p.text : alpha(p.text, 0.06), color: i === 0 ? p.surface : p.text, fontSize, fontWeight: 700, whiteSpace: "nowrap" }}
        >
          {icons[i] ? <I name={icons[i]!} size={15} /> : null}
          {label}
        </span>
      ))}
    </div>
  );
}

/** The app's segmented tabs (SegmentedTabs): the open one raised on the segment's colour. */
function Segmented({ labels, p }: { labels: string[]; p: Palette }) {
  return (
    <div style={{ display: "flex", height: 44, borderRadius: 12, background: p.segment, padding: 4, gap: 4, flex: "none" }}>
      {labels.map((label, i) => (
        <span
          key={i}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 9, background: i === 0 ? p.surface : "transparent", boxShadow: i === 0 && !p.dark ? "0 1px 3px rgba(14,13,36,.08)" : undefined, fontSize: 14, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? p.text : p.textSecondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

/** A card as the app's AppCard: the surface with a hairline. */
function card(p: Palette, radius = 16): CSSProperties {
  return { background: p.surface, border: `1px solid ${p.dark ? p.border : p.border}`, borderRadius: radius };
}

const clamp = (lines: number): CSSProperties => ({ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" });
const one: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

/** A price without its zero cents ("₺1,450.00" → "₺1,450"); null without one. */
export function plainPrice(price: string | null | undefined): string | null {
  if (!price?.trim()) return null;
  return price.replace(/([.,٫])0{2}(?!\d)/, "");
}

/** The sample facts of the drawings' courses (the project's own show theirs in the app). */
const FACTS = [
  { rating: 4.9, lessons: 32, badge: "new" as const },
  { rating: 4.8, lessons: 18, badge: null },
  { rating: 4.7, lessons: 14, badge: "bestseller" as const },
  { rating: 4.6, lessons: 21, badge: null },
  { rating: 4.8, lessons: 12, badge: null },
];

interface Ctx {
  p: Palette;
  w: ScreenWords;
  rtl: boolean;
  props: AppScreenProps;
}

export function AppScreen(props: AppScreenProps) {
  const p = appPalette(props.dark, props.brand, props.accent);
  const ctx: Ctx = { p, w: screenWords(props.lang), rtl: props.lang === "ar", props };
  const d = props.drawing;
  const body =
    d.screen === "catalog" ? (
      d.look === "explore" ? <Explore ctx={ctx} card={d.card} /> : <Catalog ctx={ctx} card={d.card} />
    ) : d.screen === "my_courses" ? (
      d.look === "premium" ? <PremiumMyCourses ctx={ctx} /> : <MyCourses ctx={ctx} />
    ) : d.screen === "account" ? (
      d.look === "academy" ? <AcademyAccount ctx={ctx} screens={d.screens} /> : <Account ctx={ctx} screens={d.screens} onCard={d.look === "card"} />
    ) : d.screen === "course" ? (
      <Course ctx={ctx} page={d.page} premium={d.look === "premium"} />
    ) : d.look === "premium" ? (
      <PremiumLesson ctx={ctx} />
    ) : (
      <Lesson ctx={ctx} />
    );
  const fullBleed = d.screen === "course" || d.screen === "lesson";
  return (
    <div
      data-studio-screen-drawn={`${d.screen}:${d.look}`}
      style={{ flex: "1 0 auto", display: "flex", flexDirection: "column", background: p.background, color: p.text, paddingTop: fullBleed ? 0 : props.top, minHeight: 300 }}
    >
      {body}
    </div>
  );
}

// The catalog.

function tabTitle(ctx: Ctx, fallback: string): string {
  return ctx.props.tabLabel?.trim() || fallback;
}

function Explore({ ctx, card: look }: { ctx: Ctx; card: CourseCardLook | null }) {
  const { p, w } = ctx;
  const subjects = ctx.props.categories.length ? ctx.props.categories : w.subjects;
  const gold = p.dark ? "#E2BE74" : GOLD;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 18px 14px", display: "flex", flexDirection: "column" }}>
        <LargeTitle p={p} text={tabTitle(ctx, w.allCourses)} />
        <div style={{ height: 14 }} />
        <div style={{ height: 54, display: "flex", alignItems: "center", gap: 8, paddingInline: "14px 8px", background: p.surface, borderRadius: 18, border: `1px solid ${p.divider}` }}>
          <I name="search" size={24} color={p.textSecondary} />
          <span style={{ flex: 1, fontSize: 16, color: p.textSecondary, ...one }}>{w.exploreSearch}</span>
          <span style={{ width: 38, height: 38, borderRadius: 12, background: p.text, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I name="tune" size={20} color={p.surface} />
          </span>
        </div>
        <div style={{ height: 18 }} />
        <div style={{ display: "flex", gap: 16, overflow: "hidden", height: 96 }}>
          {subjects.map((name, i) => (
            <div key={i} style={{ width: 72, flex: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ width: 64, height: 64, borderRadius: 20, background: p.surface, border: `1px solid ${p.divider}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <I name={subjectIcon(name)} size={28} color={gold} />
              </span>
              <span style={{ marginTop: 8, fontSize: 12.5, fontWeight: 700, maxWidth: 72, ...one }}>{name}</span>
            </div>
          ))}
        </div>
        <div style={{ height: 16 }} />
        <InkChips p={p} labels={[w.all, w.freeChip, w.topRated, w.newest]} icons={[null, null, "star", null]} height={34} fontSize={12.5} />
      </div>
      <CourseList ctx={ctx} look={look} />
    </div>
  );
}

/** A subject's icon from its name in the languages the app speaks (explore_parts.dart subjectIcon). */
export function subjectIcon(name: string): string {
  const n = name.toLowerCase();
  const has = (words: string[]) => words.some((x) => n.includes(x));
  if (has(["design", "تصميم", "tasarım", "ui", "ux"])) return "palette";
  if (has(["program", "code", "coding", "برمج", "kod", "yazılım", "python"])) return "code";
  if (has(["language", "لغ", "english", "إنجليز", "dil", "türkçe", "عربي"])) return "translate";
  if (has(["business", "أعمال", "iş", "manage", "إدار", "finance", "مال"])) return "trending_up";
  if (has(["market", "تسويق", "pazarlama"])) return "campaign";
  if (has(["photo", "تصوير", "fotoğraf", "video"])) return "photo_camera";
  if (has(["music", "موسيق", "müzik"])) return "music_note";
  if (has(["math", "رياض", "matematik", "science", "علوم"])) return "calculate";
  return "category";
}

function LargeTitle({ p, text }: { p: Palette; text: string }) {
  return <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.25, color: p.text }}>{text}</div>;
}

function Catalog({ ctx, card: look }: { ctx: Ctx; card: CourseCardLook | null }) {
  const { p, w } = ctx;
  const pill = (label: string, on: boolean) => (
    <span key={label} style={{ flex: "none", height: 40, display: "inline-flex", alignItems: "center", padding: "0 16px", borderRadius: 999, background: on ? p.primary : p.surface, border: on ? "none" : `1px solid ${p.border}`, color: on ? p.onPrimary : p.text, fontSize: 14, fontWeight: on ? 600 : 400, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "24px 20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.25 }}>{w.allCourses}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, height: 50, display: "flex", alignItems: "center", gap: 10, paddingInline: 14, borderRadius: 14, border: `1px solid ${p.border}`, background: p.surface }}>
            <I name="search" size={20} color={p.textSecondary} />
            <span style={{ fontSize: 15, color: p.textSecondary, ...one }}>{w.searchCourses}</span>
          </div>
          <span style={{ width: 50, height: 50, borderRadius: 14, border: `1px solid ${p.border}`, background: p.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I name="tune" size={22} color={p.text} />
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, overflow: "hidden" }}>
          {pill(w.all, true)}
          {pill(w.free, false)}
          {pill(w.paid, false)}
          {pill(w.sortNewest, false)}
        </div>
      </div>
      <CourseList ctx={ctx} look={look} />
    </div>
  );
}

function CourseList({ ctx, look }: { ctx: Ctx; look: CourseCardLook | null }) {
  const courses = ctx.props.courses.slice(0, 5);
  return (
    <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
      {courses.map((c, i) => (
        <CourseCard key={c.id} ctx={ctx} course={c} index={i} look={look} />
      ))}
    </div>
  );
}

/** A course in the lists, in the card the owner chose (designed_course_card.dart). */
function CourseCard({ ctx, course, index, look }: { ctx: Ctx; course: PickableEntry; index: number; look: CourseCardLook | null }) {
  const { p, w } = ctx;
  // The rating, lessons and badge are samples: the editor's entries don't carry them.
  const facts = FACTS[index % FACTS.length]!;
  const shows = (f: "teacher" | "rating" | "price" | "lessons") => !look?.hide.includes(f);
  const style = look?.style ?? "classic";
  const teacher = shows("teacher") ? course.subtitle : null;
  // A course without a price is free; "1,450.00" as "1,450", as the premium academy shows it.
  const price = shows("price") ? (plainPrice(course.price) ?? w.free) : null;
  const free = price === w.free || ["Free", "مجاني", "مجانية", "Ücretsiz"].includes(price ?? "");
  const priceLabel = (size = 16, colour = p.text) => (price ? <b style={{ fontSize: size, fontWeight: 800, color: free ? p.success : colour, whiteSpace: "nowrap" }}>{price}</b> : null);
  const rating = facts && shows("rating") ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 12, color: p.textSecondary }}>
      <I name="star" size={14} color={p.star} fill />
      {facts.rating.toFixed(1)}
    </span>
  ) : null;
  const lessons = facts && shows("lessons") ? w.lessons(facts.lessons) : null;
  if (style === "premium") {
    const radius = look?.radius ?? 18;
    const badge = facts?.badge === "new" ? w.badgeNew : facts?.badge === "bestseller" ? w.badgeBestseller : course.badge;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "2px 0" }}>
        <Picture url={course.imageUrl} seed={index} p={p} radius={radius} style={{ width: 96, height: 96 }} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {badge || rating || lessons ? (
            <span style={{ fontSize: 12, color: p.textSecondary, display: "flex", alignItems: "center", gap: 4, ...one }}>
              {badge ? <b style={{ fontWeight: 800, color: p.accent, marginInlineEnd: 4 }}>{badge}</b> : null}
              {facts && shows("rating") ? (
                <>
                  <I name="star" size={13} color={p.star} fill />
                  <span>{facts.rating.toFixed(1)}</span>
                  {lessons ? <span>·</span> : null}
                </>
              ) : null}
              {lessons ? <span style={one}>{lessons}</span> : null}
            </span>
          ) : null}
          <span style={{ marginTop: 4, fontSize: 15, fontWeight: 700, lineHeight: 1.35, color: p.text, ...clamp(2) }}>{course.title}</span>
          {teacher ? (
            <span style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
              <Avatar size={22} p={p} />
              <span style={{ fontSize: 12, color: p.textSecondary, ...one }}>{teacher}</span>
            </span>
          ) : null}
        </div>
        {priceLabel(15, p.accent)}
      </div>
    );
  }
  if (style === "cover") {
    const radius = look?.radius ?? 22;
    return (
      <div style={{ position: "relative", aspectRatio: "16 / 10", borderRadius: radius, overflow: "hidden" }}>
        <Picture url={course.imageUrl} seed={index} p={p} style={{ position: "absolute", inset: 0 }} />
        <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.8))" }} />
        <div style={{ position: "absolute", insetInline: 14, bottom: 14, color: "#FFFFFF", display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.3, ...clamp(2) }}>{course.title}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5 }}>
            <span style={{ flex: 1, opacity: 0.9, ...one }}>{[teacher, lessons].filter(Boolean).join(" · ")}</span>
            {price ? <b style={{ background: "rgba(255,255,255,.95)", color: "#15131A", borderRadius: 10, padding: "5px 10px", fontSize: 13, fontWeight: 800 }}>{price}</b> : null}
          </span>
        </div>
      </div>
    );
  }
  if (style === "tile") {
    const radius = look?.radius ?? 18;
    return (
      <div style={{ ...card(p), padding: 10, display: "flex", flexDirection: "column" }}>
        <Picture url={course.imageUrl} seed={index} p={p} radius={radius} style={{ width: "100%", aspectRatio: "16 / 9" }} />
        <span style={{ marginTop: 10, fontSize: 16, fontWeight: 700, lineHeight: 1.35, ...clamp(2) }}>{course.title}</span>
        {teacher || lessons ? <span style={{ marginTop: 4, fontSize: 12.5, color: p.textSecondary, ...one }}>{[teacher, lessons].filter(Boolean).join(" · ")}</span> : null}
        <span style={{ marginTop: 8, display: "flex", alignItems: "center" }}>
          <span style={{ flex: 1 }}>{priceLabel()}</span>
          {rating}
        </span>
      </div>
    );
  }
  const rich = style === "rich";
  const radius = look?.radius ?? (rich ? 22 : 12);
  const size = rich ? 108 : 96;
  return (
    <div style={{ ...card(p), padding: rich ? 12 : 10, display: "flex", alignItems: "center", gap: 12 }}>
      <Picture url={course.imageUrl} seed={index} p={p} radius={radius} style={{ width: size, height: size }} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {rich && rating ? <span style={{ marginBottom: 4 }}>{rating}</span> : null}
        <span style={{ fontSize: rich ? 16 : 15, fontWeight: 700, lineHeight: 1.4, ...clamp(2) }}>{course.title}</span>
        {rich && teacher ? (
          <span style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <Avatar size={20} p={p} />
            <span style={{ fontSize: 12, color: p.textSecondary, ...one }}>{teacher}</span>
          </span>
        ) : teacher || lessons ? (
          <span style={{ marginTop: 4, fontSize: 12, color: p.textSecondary, ...one }}>{[teacher, lessons].filter(Boolean).join(" · ")}</span>
        ) : null}
        <span style={{ marginTop: 8, display: "flex", alignItems: "center" }}>
          <span style={{ flex: 1 }}>{priceLabel()}</span>
          {!rich ? rating : null}
        </span>
      </div>
    </div>
  );
}

// My courses.

/** This week's learning (learning_cards.dart LearningWeek), sample minutes. */
function Week({ ctx, ink }: { ctx: Ctx; ink: string }) {
  const { w } = ctx;
  const bars = [0.45, 0.08, 0.65, 1, 0.35, 0.08, 0.42];
  // The last seven days, today last: Thursday to Wednesday.
  const days = [4, 5, 6, 0, 1, 2, 3];
  return (
    <div style={{ padding: "16px 18px 14px", color: ink }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>{w.weekTitle}</div>
          {/* Made smaller to fit beside the change, as the app's FittedBox does on a narrow phone. */}
          <div style={{ marginTop: 2, fontSize: 23, fontWeight: 800, whiteSpace: "nowrap" }}>{w.weekTime}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 999, background: alpha(ink, 0.1), whiteSpace: "nowrap" }}>{w.weekUp}</span>
      </div>
      <div style={{ marginTop: 12, height: 96, display: "flex", alignItems: "flex-end", gap: 10 }}>
        {bars.map((v, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
            <span style={{ width: "100%", height: 8 + 64 * v, borderRadius: 10, background: v === 1 ? `linear-gradient(180deg, ${GOLD_LIGHT}, ${GOLD})` : alpha(ink, 0.14) }} />
            <span style={{ marginTop: 6, fontSize: 10, opacity: 0.6 }}>{w.weekdays[days[i]!]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PROGRESS = [
  { percent: 61, done: 11, total: 18 },
  { percent: 34, done: 6, total: 18 },
  { percent: 88, done: 21, total: 24 },
];

function PremiumMyCourses({ ctx }: { ctx: Ctx }) {
  const { p, w } = ctx;
  const courses = ctx.props.courses.slice(0, 2);
  return (
    <div style={{ padding: "14px 18px 24px", display: "flex", flexDirection: "column" }}>
      <LargeTitle p={p} text={tabTitle(ctx, w.myCourses)} />
      <div style={{ marginTop: 14, borderRadius: 26, background: p.dark ? "#F3F1EC" : "#15131A" }}>
        <Week ctx={ctx} ink={p.dark ? "#15131A" : "#FFFFFF"} />
      </div>
      <div style={{ height: 16 }} />
      <InkChips p={p} labels={[`${w.learning} ${courses.length}`, `${w.finished} 1`, w.saved]} />
      <div style={{ height: 14 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {courses.map((c, i) => {
          const pr = PROGRESS[i % PROGRESS.length]!;
          return (
            <div key={c.id} style={{ aspectRatio: "0.82", background: p.surface, border: `1px solid ${p.divider}`, borderRadius: 22, padding: 10, display: "flex", flexDirection: "column", minWidth: 0 }}>
              <Picture url={c.imageUrl} seed={i} p={p} radius={16} style={{ flex: "1 1 0", minHeight: 0, width: "100%" }} />
              <div style={{ marginTop: 10, display: "flex", alignItems: "flex-end", gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3, ...clamp(2) }}>{c.title}</div>
                  <div style={{ marginTop: 3, fontSize: 11.5, color: p.textSecondary }}>{w.doneOf(pr.done, pr.total)}</div>
                </div>
                <Ring percent={pr.percent} p={p} />
              </div>
            </div>
          );
        })}
        <div style={{ aspectRatio: "0.82", borderRadius: 22, padding: 16, display: "flex", flexDirection: "column", background: `linear-gradient(135deg, ${mix(p.accent, "#FFFFFF", 0.45)}, ${p.accent})`, color: ON_GOLD }}>
          <I name="workspace_premium" size={30} color={ON_GOLD} fill />
          <span style={{ flex: 1 }} />
          <b style={{ fontSize: 17, fontWeight: 800 }}>{w.certificates(1)}</b>
          <span style={{ marginTop: 2, fontSize: 12, opacity: 0.7 }}>{w.certificatesReady}</span>
        </div>
      </div>
    </div>
  );
}

function MyCourses({ ctx }: { ctx: Ctx }) {
  const { p, w } = ctx;
  const courses = ctx.props.courses.slice(0, 3);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "24px 20px 16px", display: "flex", flexDirection: "column" }}>
        {ctx.props.hidesTitle ? null : <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.25, marginBottom: 16 }}>{w.myCourses}</div>}
        <Segmented p={p} labels={[w.inProgress, w.completed, w.wishlist]} />
      </div>
      <div style={{ padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {courses.map((c, i) => {
          const pr = PROGRESS[i % PROGRESS.length]!;
          return (
            <div key={c.id} style={{ ...card(p), padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Picture url={c.imageUrl} seed={i} p={p} radius={12} style={{ width: 64, height: 64 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4, ...clamp(2) }}>{c.title}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: p.textSecondary, ...one }}>{w.next(w.sampleLessons[i % w.sampleLessons.length]!)}</div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ flex: 1, height: 6, borderRadius: 3, background: p.segment, overflow: "hidden" }}>
                  <i style={{ display: "block", width: `${pr.percent}%`, height: "100%", background: p.accent, borderRadius: 3 }} />
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: p.textSecondary }}>{pr.percent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// The account.

const ITEM_ICONS: Record<string, string> = {
  orders: "receipt_long",
  points: "redeem",
  certificates: "workspace_premium",
  memberships: "card_membership",
  quiz_results: "fact_check",
  live_classes: "live_tv",
  learning_paths: "route",
  achievements: "emoji_events",
  wishlist: "favorite",
  downloads: "download_for_offline",
  my_courses: "play_circle",
  teachers: "group",
  teacher: "school",
  teach: "school",
  chat: "chat",
  notifications: "notifications",
  settings: "tune",
  help: "help",
  privacy: "article",
  terms: "article",
  link: "link",
};
/** The entries an academy's app has (the others belong to other kinds of app). */
const ACADEMY_ITEMS = new Set(["orders", "certificates", "memberships", "quiz_results", "live_classes", "learning_paths", "achievements", "wishlist", "downloads", "my_courses", "teachers", "teacher", "teach", "chat", "notifications", "settings", "help", "privacy", "terms", "link"]);
const REQUIRED = new Set(["settings", "privacy", "terms"]);

interface Line {
  key: string;
  icon: string;
  title: string;
}

function menuLines(ctx: Ctx, screens: StudioScreens | null): Line[] | null {
  const items = screens?.account_menu?.items;
  if (!items) return null;
  const lang = ctx.props.lang;
  const name = (e: AccountMenuEntry) => e.label[lang] || Object.values(e.label)[0] || ctx.w.items[e.key] || e.key;
  return items.filter((e) => !e.hidden && ACADEMY_ITEMS.has(e.key)).map((e) => ({ key: e.key, icon: e.icon ?? ITEM_ICONS[e.key] ?? "link", title: name(e) }));
}

function Chevron({ ctx, size = 18 }: { ctx: Ctx; size?: number }) {
  return <I name="chevron_right" size={size} color={ctx.p.textTertiary} flip={ctx.rtl} />;
}

/** A Material switch, on or off. */
function Switch({ on, p, colour }: { on: boolean; p: Palette; colour: string }) {
  return (
    <span aria-hidden="true" style={{ width: 52, height: 32, borderRadius: 16, flex: "none", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: on ? "flex-end" : "flex-start", padding: on ? 4 : 6, background: on ? colour : p.dark ? "#2C2A47" : "#E9E2D5", border: on ? "none" : `2px solid ${p.dark ? "#8C889A" : "#C9C1B2"}` }}>
      <span style={{ width: on ? 24 : 16, height: on ? 24 : 16, borderRadius: "50%", background: on ? "#FFFFFF" : p.dark ? "#8C889A" : "#6F6B80" }} />
    </span>
  );
}

function AcademyAccount({ ctx, screens }: { ctx: Ctx; screens: StudioScreens | null }) {
  const { p, w } = ctx;
  const gold = p.accent;
  const lines = menuLines(ctx, screens) ?? (["orders", "certificates", "quiz_results", "downloads", "settings", "help", "privacy", "terms"] as const).map((key) => ({ key, icon: ITEM_ICONS[key]!, title: w.items[key]! }));
  const last = (l: Line) => REQUIRED.has(l.key) || l.key === "help";
  const main = lines.filter((l) => !last(l));
  const rest = lines.filter(last);
  const green = p.dark ? "#4FD1B0" : "#0E7C66";
  const group = (children: ReactNode[]) => (
    <div style={{ background: p.surface, borderRadius: 24, border: `1px solid ${p.divider}`, overflow: "hidden" }}>
      {children.map((c, i) => (
        <div key={i} style={{ borderTop: i ? `1px solid ${p.divider}` : undefined }}>
          {c}
        </div>
      ))}
    </div>
  );
  const line = (icon: string, title: string, end: ReactNode, colour?: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
      <span style={{ width: 36, height: 36, borderRadius: 12, background: alpha(p.text, 0.06), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
        <I name={icon} size={20} color={colour ?? gold} />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 500, color: colour ?? p.text, ...one }}>{title}</span>
      {end}
    </div>
  );
  const pill = (text: string) => <span style={{ padding: "3px 10px", borderRadius: 999, background: alpha(p.text, 0.06), fontSize: 12, fontWeight: 700 }}>{text}</span>;
  const stat = (value: number, label: string) => (
    <span style={{ whiteSpace: "nowrap" }}>
      <b style={{ fontSize: 15, fontWeight: 800, color: gold }}>{value} </b>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,.8)" }}>{label}</span>
    </span>
  );
  return (
    <div style={{ padding: "8px 18px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div data-screen-account-card="" style={{ padding: "16px 18px", borderRadius: 26, background: "linear-gradient(225deg, #1C1710, #3A2D18, #6E5427)", boxShadow: "0 14px 30px rgba(0,0,0,.25)", color: "#FFFFFF" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 800, letterSpacing: 2, color: alpha(gold, 0.9), textTransform: "uppercase", ...one }}>{ctx.props.appName}</span>
          <I name="verified" size={24} color={gold} fill />
        </div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar size={56} p={{ ...p, dark: false }} ring={gold} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 20, fontWeight: 800, ...one }}>{w.sampleName}</div>
            <div dir="ltr" style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)", textAlign: ctx.rtl ? "right" : "left" }}>
              +90 532 123 45 67
            </div>
          </div>
        </div>
        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", columnGap: 16 }}>
          {stat(2, w.statCourses(2))}
          {stat(1, w.statCertificates(1))}
          {stat(38, w.statHours(38))}
        </div>
      </div>
      {main.length ? group(main.map((l) => line(l.icon, l.title, <>{l.key === "certificates" ? pill("1") : null}<Chevron ctx={ctx} /></>))) : null}
      {group([
        line("dark_mode", w.darkMode, <Switch on={p.dark} p={p} colour={green} />),
        line("notifications", w.notifications, <Switch on p={p} colour={green} />),
        line("language", w.language, <>{pill(w.languageName)}<Chevron ctx={ctx} /></>),
      ])}
      {group([...rest.map((l) => line(l.icon, l.title, <Chevron ctx={ctx} />)), line("logout", w.logOut, null, p.danger)])}
    </div>
  );
}

function Account({ ctx, screens, onCard }: { ctx: Ctx; screens: StudioScreens | null; onCard: boolean }) {
  const { p, w } = ctx;
  const designed = menuLines(ctx, screens);
  const head = onCard ? p.onPrimary : p.text;
  const tile = (icon: string, title: string, danger = false, chevron = true) => (
    <div style={{ minHeight: 54, display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", boxSizing: "border-box" }}>
      <I name={icon} size={24} color={danger ? p.danger : p.text} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: danger ? 600 : 400, color: danger ? p.danger : p.text, ...one }}>{title}</span>
      {chevron ? <Chevron ctx={ctx} size={20} /> : null}
    </div>
  );
  const group = (title: string | null, lines: Line[]) => (
    <div>
      {title ? <div style={{ padding: "0 4px 8px", fontSize: 13, fontWeight: 600, color: p.textSecondary }}>{title}</div> : null}
      <div style={{ ...card(p), overflow: "hidden" }}>
        {lines.map((l, i) => (
          <div key={`${l.key}-${i}`} style={{ borderTop: i ? `1px solid ${p.divider}` : undefined }}>
            {tile(l.icon, l.title)}
          </div>
        ))}
      </div>
    </div>
  );
  const item = (key: string): Line => ({ key, icon: ITEM_ICONS[key]!, title: w.items[key]! });
  return (
    <div style={{ padding: "24px 20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, ...(onCard ? { padding: 16, borderRadius: 20, background: p.primary } : {}) }}>
        <span style={{ width: 64, height: 64, borderRadius: "50%", background: p.placeholders[2], display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <I name="account_circle" size={30} color={p.text} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 700, color: head, ...one }}>{w.sampleName}</div>
          <div dir="ltr" style={{ marginTop: 2, fontSize: 14, color: onCard ? alpha(p.onPrimary, 0.8) : p.textSecondary, textAlign: ctx.rtl ? "right" : "left" }}>
            +90 532 123 45 67
          </div>
        </div>
        <span style={{ padding: "8px 16px", borderRadius: 999, border: `1px solid ${onCard ? p.onPrimary : p.border}`, color: onCard ? p.onPrimary : p.primary, fontSize: 14, fontWeight: 600 }}>{w.edit}</span>
      </div>
      {designed ? (
        group(w.accountAndApp, designed)
      ) : (
        <>
          {group(w.learningGroup, ["certificates", "quiz_results", "wishlist", "orders"].map(item))}
          {group(w.accountAndApp, ["notifications", "settings", "help", "privacy", "terms"].map(item))}
        </>
      )}
      <div style={{ ...card(p), overflow: "hidden" }}>{tile("logout", w.logOut, true, false)}</div>
    </div>
  );
}

// A course's page.

function Course({ ctx, page, premium }: { ctx: Ctx; page: CoursePageLook; premium: boolean }) {
  const { p, w } = ctx;
  const course = ctx.props.courses[0];
  const title = course?.title ?? w.sampleCourse;
  const teacher = course?.subtitle || w.sampleTeacher;
  const price = course ? (plainPrice(course.price) ?? w.free) : "₺1,450";
  const full = page.cover === "full";
  const glass = page.bar === "glass";
  const shows = (f: "students" | "level" | "duration" | "certificate" | "reviews") => !page.hide.includes(f);
  const top = 30;
  const facts = [w.lessons(32), shows("duration") ? w.hoursMinutes(10, 10) : null].filter(Boolean).join("  ·  ");
  const circle = (icon: string, bg: string, flip = false) => (
    <span style={{ width: 40, height: 40, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <I name={icon} size={22} color="#FFFFFF" flip={flip} />
    </span>
  );
  const square = (icon: string, flip = false) => (
    <span style={{ width: 44, height: 44, borderRadius: 12, background: p.surface, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(14,13,36,.12)" }}>
      <I name={icon} size={22} color={p.text} flip={flip} />
    </span>
  );
  const tabs = premium ? [w.curriculum, w.aboutCourse, ...(shows("reviews") ? [w.reviews] : [])] : [w.overview, w.curriculum, ...(shows("reviews") ? [w.reviews] : [])];
  const units = [
    { n: 1, lessons: 2, minutes: 22, open: false },
    { n: 2, lessons: 3, minutes: 55, open: true },
  ];
  const curriculum = (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {units.map((u) => (
        <div key={u.n} style={{ ...card(p, 18), background: premium ? (p.dark ? p.surface : "#FBF8F2") : p.surface, overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{w.unit(u.n)}</div>
              <div style={{ marginTop: 2, fontSize: 12.5, color: p.textSecondary }}>
                {w.lessons(u.lessons)} · {w.minutes(u.minutes)}
              </div>
            </div>
            <I name={u.open ? "expand_less" : "expand_more"} size={24} color={p.textSecondary} />
          </div>
          {u.open
            ? w.sampleLessons.map((l, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: `1px solid ${p.divider}` }}>
                  <I name="play_circle" size={22} color={i === 0 ? p.accent : p.textSecondary} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, ...one }}>{l}</span>
                  <span style={{ fontSize: 12, color: p.textSecondary }}>{w.minutes(14 + i * 4)}</span>
                </div>
              ))
            : null}
        </div>
      ))}
    </div>
  );
  const overview = (
    <div style={{ fontSize: 15, lineHeight: 1.6, color: p.text }}>
      <span style={{ display: "block", height: 9, width: "92%", borderRadius: 5, background: p.segment, marginBottom: 10 }} />
      <span style={{ display: "block", height: 9, width: "80%", borderRadius: 5, background: p.segment, marginBottom: 10 }} />
      <span style={{ display: "block", height: 9, width: "86%", borderRadius: 5, background: p.segment }} />
    </div>
  );
  const metaChip = (icon: string, text: string, colour?: string) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, border: `1px solid ${p.border}`, background: p.surface, fontSize: 13, color: p.text }}>
      <I name={icon} size={16} color={colour ?? p.textSecondary} fill={icon === "star"} />
      {text}
    </span>
  );
  const bar = (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 20px 18px",
        background: glass ? (p.dark ? "rgba(11,10,28,.72)" : "rgba(255,255,255,.72)") : p.surface,
        backdropFilter: glass ? "blur(18px)" : undefined,
        borderTop: `1px solid ${p.divider}`,
      }}
    >
      <b style={{ fontSize: 24, fontWeight: 800, color: p.text, whiteSpace: "nowrap" }}>{price}</b>
      {premium ? (
        <span style={{ flex: 1, height: 56, borderRadius: 18, background: `linear-gradient(135deg, ${mix(p.accent, "#FFFFFF", 0.45)}, ${p.accent})`, boxShadow: `0 10px 24px ${alpha(p.accent, 0.35)}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: ON_GOLD, fontSize: 16, fontWeight: 600 }}>
          <I name="shopping_bag" size={20} color={ON_GOLD} />
          {w.joinNow}
        </span>
      ) : (
        <span style={{ flex: 1, height: 56, borderRadius: 14, background: p.primary, display: "flex", alignItems: "center", justifyContent: "center", color: p.onPrimary, fontSize: 16, fontWeight: 600 }}>{w.enrollNow}</span>
      )}
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: "1 0 auto" }}>
      <div style={{ position: "relative", height: (full ? 340 : 220) + top, flex: "none", overflow: "hidden" }}>
        <Picture url={course?.imageUrl} seed={0} p={p} style={{ position: "absolute", inset: 0 }} />
        {course?.imageUrl ? null : <span style={{ position: "absolute", inset: 0, background: `radial-gradient(120% 70% at 85% 10%, ${alpha(GOLD_LIGHT, 0.75)}, transparent 55%), linear-gradient(160deg, #2A2558 0%, #3A2D6E 45%, #0B0A1C 100%)` }} />}
        <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 30%)" }} />
        {full ? <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,.85) 100%)" }} /> : null}
        <span style={{ position: "absolute", top: top + 16, insetInlineStart: 20 }}>{premium ? circle("arrow_back", alpha(p.accent, 0.55), ctx.rtl) : square("arrow_back", ctx.rtl)}</span>
        <span style={{ position: "absolute", top: top + 16, insetInlineEnd: 20, display: "flex", gap: premium ? 8 : 4 }}>
          {premium ? circle("share", "rgba(0,0,0,.25)") : square("share")}
          {premium ? circle("favorite", "rgba(0,0,0,.25)") : square("favorite")}
        </span>
        {full ? (
          <div style={{ position: "absolute", insetInline: 20, bottom: 22, color: "#FFFFFF" }}>
            {premium ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                <span style={{ padding: "4px 9px", borderRadius: 9, background: p.accent, color: ON_GOLD, fontSize: 11, fontWeight: 800 }}>{ctx.props.categories[0] ?? w.sampleSubject}</span>
                {shows("certificate") ? <span style={{ padding: "4px 9px", borderRadius: 9, background: "rgba(255,255,255,.18)", fontSize: 11, fontWeight: 800 }}>{w.certifiedCertificate}</span> : null}
              </div>
            ) : null}
            <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, ...clamp(3) }}>{title}</div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,.92)", ...one }}>
              <I name="star" size={15} color="#F5C451" fill />
              <span>{premium ? "4.9 (418)" : "4.9"}</span>
              <span>&nbsp;·&nbsp;{facts}</span>
            </div>
          </div>
        ) : null}
      </div>
      <div style={{ padding: "20px 20px 20px", display: "flex", flexDirection: "column" }}>
        {full ? null : <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>{title}</div>}
        {premium ? (
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 24, background: p.surface, border: `1px solid ${p.divider}` }}>
            <Avatar size={48} p={p} ring={p.accent} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, ...one }}>{teacher}</div>
              <div style={{ marginTop: 3, fontSize: 12, color: p.textSecondary, ...one }}>{w.sampleBio}</div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar size={40} p={p} />
            <span style={{ fontSize: 15, fontWeight: 600 }}>{teacher}</span>
          </div>
        )}
        {premium ? null : (
          <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {metaChip("star", "4.9 · 418", p.star)}
            {metaChip("menu_book", w.lessons(32))}
            {shows("duration") ? metaChip("schedule", w.hoursMinutes(10, 10)) : null}
            {shows("certificate") ? metaChip("workspace_premium", w.certificate) : null}
          </div>
        )}
        <div style={{ height: premium ? 30 : 16 }} />
        {premium ? <InkChips p={p} labels={tabs} /> : <Segmented p={p} labels={tabs} />}
        <div style={{ height: 16 }} />
        {premium || page.first_tab === "curriculum" ? curriculum : overview}
      </div>
      <span style={{ flex: "1 0 0" }} />
      {bar}
    </div>
  );
}

// A lesson.

function Player({ ctx, premium }: { ctx: Ctx; premium: boolean }) {
  const { p } = ctx;
  const gold = p.accent;
  return (
    <div
      dir="ltr"
      style={{
        position: "relative",
        height: premium ? 300 : 250,
        flex: "none",
        background: premium ? "linear-gradient(180deg, #120F2A 0%, #2E2160 45%, #3B2A6E 62%, #120F2A 100%)" : "#0E0D24",
        color: "#FFFFFF",
        overflow: "hidden",
      }}
    >
      <span style={{ position: "absolute", top: 40, left: 16 }}>
        {premium ? (
          <I name="keyboard_arrow_down" size={28} color="#FFFFFF" />
        ) : (
          <span style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I name="arrow_back" size={22} color="#FFFFFF" />
          </span>
        )}
      </span>
      <span style={{ position: "absolute", top: 40, right: 16, display: "flex", alignItems: "center", gap: 20 }}>
        <b style={{ fontSize: 15, fontWeight: 800 }}>1x</b>
        <I name="fullscreen" size={26} color="#FFFFFF" />
      </span>
      <span style={{ position: "absolute", left: 0, right: 0, top: premium ? 100 : 95, display: "flex", alignItems: "center", justifyContent: "center", gap: 36 }}>
        <I name="replay_10" size={34} color="#FFFFFF" />
        <span style={{ width: premium ? 92 : 68, height: premium ? 92 : 68, borderRadius: "50%", background: "rgba(255,255,255,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <I name="play_arrow" size={premium ? 46 : 38} color="#FFFFFF" fill />
        </span>
        <I name="forward_10" size={34} color="#FFFFFF" />
      </span>
      <span style={{ position: "absolute", left: 12, right: 12, bottom: 44, display: "flex", gap: 4 }}>
        {premium ? (
          [1, 0.55, 0, 0, 0].map((v, i) => (
            <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,.25)", overflow: "hidden" }}>
              <i style={{ display: "block", height: "100%", width: `${v * 100}%`, background: gold }} />
            </span>
          ))
        ) : (
          <span style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,.25)", overflow: "hidden" }}>
            <i style={{ display: "block", height: "100%", width: "34%", background: p.accent }} />
          </span>
        )}
      </span>
      <span style={{ position: "absolute", left: 12, right: 12, bottom: 16, display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span>06:12</span>
        <span>18:00</span>
      </span>
    </div>
  );
}

function PremiumLesson({ ctx }: { ctx: Ctx }) {
  const { p, w } = ctx;
  const next = ctx.props.courses[1];
  const roundCard = (extra?: CSSProperties): CSSProperties => ({ background: p.surface, border: `1px solid ${p.divider}`, borderRadius: 22, ...extra });
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Player ctx={ctx} premium />
      <div style={{ padding: "26px 20px 24px", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: 1, fontSize: 13, color: p.textSecondary }}>
            {w.lessonOf(4, 5)} · {w.sampleUnit}
          </span>
          <I name="bookmark" size={26} color={p.accent} />
        </div>
        <div style={{ marginTop: 16, fontSize: 25, fontWeight: 800, lineHeight: 1.3 }}>{w.sampleLesson}</div>
        <div style={{ height: 14 }} />
        <InkChips p={p} labels={[w.myNotes, `${w.files} 2`, `${w.discussion} 24`]} icons={["edit_note", "folder", "forum"]} height={34} fontSize={13} />
        <div style={{ height: 14 }} />
        <div style={roundCard({ padding: "14px 16px" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <b dir="ltr" style={{ fontSize: 13, fontWeight: 800, color: p.accent }}>
              04:32
            </b>
            <span style={{ fontSize: 12, color: p.textSecondary }}>{w.sampleNoteWhen}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 13.5, lineHeight: 1.55 }}>{w.sampleNote}</div>
        </div>
        <div style={{ margin: "14px 4px 4px", display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: p.textSecondary }}>
          <I name="add" size={18} color={p.accent} />
          {w.addNote}
        </div>
        <div style={{ height: 14 }} />
        <div style={roundCard({ padding: 12, display: "flex", alignItems: "center", gap: 12 })}>
          <Picture url={next?.imageUrl} seed={1} p={p} radius={14} style={{ width: 74, height: 56, ...(next?.imageUrl ? {} : { background: "linear-gradient(135deg,#3B3F8F,#2A1E5C 50%,#1E6B8F)" }) }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, color: p.textSecondary }}>
              {w.upNext} · {w.minutes(22)}
            </div>
            <div style={{ marginTop: 3, fontSize: 14, fontWeight: 800, ...one }}>{w.sampleNextLesson}</div>
          </div>
          <span style={{ width: 44, height: 44, borderRadius: "50%", background: p.text, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I name="skip_next" size={24} color={p.surface} fill />
          </span>
        </div>
        <div style={{ height: 12 }} />
        <div style={{ borderRadius: 22, padding: "16px 16px", display: "flex", alignItems: "center", gap: 12, color: ON_GOLD, background: `linear-gradient(${ctx.rtl ? 270 : 90}deg, ${p.accent}, ${mix(p.accent, "#FFEBB0", 0.6)})` }}>
          <I name="quiz" size={30} color={ON_GOLD} fill />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 800 }}>{w.sampleQuiz}</div>
            <div style={{ marginTop: 3, fontSize: 11.5, ...one }}>
              {w.questions(10)} · {w.quizOpens}
            </div>
          </div>
          <I name="chevron_right" size={24} color={ON_GOLD} flip={ctx.rtl} />
        </div>
        <div style={{ height: 12 }} />
        <div style={roundCard({ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 })}>
          <span style={{ width: 42, height: 42, borderRadius: 12, background: alpha("#E5484D", 0.12), display: "flex", alignItems: "center", justifyContent: "center" }}>
            <I name="picture_as_pdf" size={22} color="#E5484D" />
          </span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, ...one }}>{w.sampleFile}</span>
          <span dir="ltr" style={{ fontSize: 11.5, color: p.textSecondary }}>
            1.2 MB
          </span>
          <I name="download" size={22} color={p.accent} />
        </div>
      </div>
    </div>
  );
}

function Lesson({ ctx }: { ctx: Ctx }) {
  const { p, w } = ctx;
  const course = ctx.props.courses[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: "1 0 auto" }}>
      <Player ctx={ctx} premium={false} />
      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", flex: "1 0 auto" }}>
        <div style={{ fontSize: 12, color: p.textSecondary }}>{course?.title ?? w.sampleCourse}</div>
        <div style={{ marginTop: 4, fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>{w.sampleLesson}</div>
        <div style={{ height: 14 }} />
        <Segmented p={p} labels={[w.notes, w.lessonsTab, w.attachments]} />
        <div style={{ height: 14 }} />
        <div style={{ ...card(p), padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ display: "block", height: 9, width: "94%", borderRadius: 5, background: p.segment }} />
          <span style={{ display: "block", height: 9, width: "82%", borderRadius: 5, background: p.segment }} />
          <span style={{ display: "block", height: 9, width: "88%", borderRadius: 5, background: p.segment }} />
          <span style={{ display: "block", height: 9, width: "60%", borderRadius: 5, background: p.segment }} />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 16px", background: p.surface, borderTop: `1px solid ${p.divider}` }}>
        <span style={{ width: 48, height: 48, borderRadius: 12, border: `1px solid ${p.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <I name="chevron_left" size={24} color={p.text} flip={ctx.rtl} />
        </span>
        <span style={{ flex: 1, height: 48, borderRadius: 14, background: p.primary, color: p.onPrimary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15, fontWeight: 600 }}>
          <I name="check_circle" size={20} color={p.onPrimary} />
          {w.markComplete}
        </span>
        <span style={{ width: 48, height: 48, borderRadius: 12, border: `1px solid ${p.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <I name="chevron_right" size={24} color={p.text} flip={ctx.rtl} />
        </span>
      </div>
    </div>
  );
}
