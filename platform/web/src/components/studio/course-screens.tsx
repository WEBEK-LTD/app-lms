import type { CSSProperties, ReactNode } from "react";
import type { PickableEntry } from "@/lib/hosted/pages/pickable";
import { courseScreenWords } from "@/lib/studio/course-screen-words";
import { courseText, type ResolvedCourseScreens } from "@/lib/studio/course-screens";
import { screenWords } from "@/lib/studio/screen-words";
import { alpha, appPalette, mix, plainPrice } from "./app-screens";

/**
 * 130.52 Studio's course screens drawn as the app draws them
 * (mobile/lib/modules/lms/studio_courses/): the course card in the
 * catalog, a course's page, the lesson and My courses, in the look and
 * options chosen in Studio › Screens, in the project's colours, light or
 * dark, the language being edited and right to left in Arabic, with the
 * project's courses (else the samples) and the sample student's progress.
 * Studio's canvas draws them on the pages around those screens, and
 * Studio › Screens shows them beside its options. Only a drawing.
 */

export type CourseScreenPart = "card" | "page" | "lesson" | "mine";

export interface CourseScreenDrawingProps {
  part: CourseScreenPart;
  design: ResolvedCourseScreens;
  dark: boolean;
  lang: string;
  brand: string;
  accent: string | null;
  courses: PickableEntry[];
  tabLabel?: string | null;
  /** Room for the status bar when nothing is over the screen. */
  top?: number;
}

const GOLD = "#B8893A";
/** The sample student's progress in the drawings' courses. */
const SAMPLE_PROGRESS = [38, 61, 20, 100];

function luminance(c: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  const n = m ? parseInt(m[1]!, 16) : 0;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

interface Kit {
  p: ReturnType<typeof appPalette>;
  d: ResolvedCourseScreens;
  accent: string;
  onAccent: string;
  soft: string;
  ink: string;
  line: string;
  track: string;
  live: string;
  shadow: string | undefined;
  rtl: boolean;
  w: ReturnType<typeof screenWords>;
  c: ReturnType<typeof courseScreenWords>;
}

function kit(props: CourseScreenDrawingProps): Kit {
  const p = appPalette(props.dark, props.brand, props.accent);
  let accent = props.design.accent ?? props.accent ?? GOLD;
  // By night a dark accent is lifted until it stands out, as in the app.
  if (props.dark) for (let i = 0; i < 6 && (luminance(accent) + 0.05) / (luminance(p.background) + 0.05) < 3; i++) accent = mix(accent, "#FFFFFF", 0.2);
  const look = props.design.look;
  return {
    p,
    d: props.design,
    accent,
    onAccent: luminance(accent) > 0.42 ? "#17120A" : "#FFFFFF",
    soft: alpha(accent, props.dark ? 0.18 : 0.13),
    ink: look === "cinema" ? "#0B0F1E" : look === "on_air" ? "#14101C" : props.dark ? "#0B0D16" : "#111522",
    line: look === "index" ? alpha(p.text, props.dark ? 0.22 : 0.16) : p.border,
    track: alpha(p.text, props.dark ? 0.14 : 0.09),
    live: props.dark ? "#FF6B6B" : "#E5484D",
    shadow: look === "index" || props.dark ? undefined : "0 10px 24px rgba(14,13,36,.08)",
    rtl: props.lang === "ar",
    w: screenWords(props.lang),
    c: courseScreenWords(props.lang),
  };
}

function I({ name, size = 18, color, fill, flip, style }: { name: string; size?: number; color?: string; fill?: boolean; flip?: boolean; style?: CSSProperties }) {
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

function Photo({ url, k, seed, radius = 0, style, children }: { url?: string | null; k: Kit; seed: number; radius?: number; style?: CSSProperties; children?: ReactNode }) {
  const tint = k.p.placeholders[seed % k.p.placeholders.length]!;
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        display: "block",
        flex: "none",
        overflow: "hidden",
        borderRadius: radius,
        background: url ? `center / cover no-repeat url("${url}"), ${tint}` : `linear-gradient(135deg, ${mix(tint, k.p.surface, k.p.dark ? 0.1 : 0.35)}, ${tint})`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/** The rating as five star icons with its number (only a course that has one). */
function Stars({ rating, k, size = 13, color, text }: { rating: number; k: Kit; size?: number; color?: string; text?: string }) {
  return (
    <span data-course-stars="" style={{ display: "inline-flex", alignItems: "center", gap: 1, flex: "none" }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <I key={i} name={rating >= i + 0.75 ? "star" : rating >= i + 0.25 ? "star_half" : "star"} size={size} fill={rating >= i + 0.25} color={rating >= i + 0.25 ? (color ?? k.accent) : alpha(color ?? k.accent, 0.4)} flip={k.rtl && rating < i + 0.75 && rating >= i + 0.25} />
      ))}
      <b style={{ marginInlineStart: 4, fontSize: size * 0.9, color: text ?? k.p.text }}>{rating.toFixed(1)}</b>
    </span>
  );
}

function Bar({ value, k, color, track, height = 6 }: { value: number; k: Kit; color?: string; track?: string; height?: number }) {
  return (
    <span style={{ display: "block", flex: 1, height, borderRadius: height, background: track ?? k.track, overflow: "hidden" }}>
      <span style={{ display: "block", height: "100%", width: `${Math.max(0, Math.min(100, value))}%`, borderRadius: height, background: `linear-gradient(90deg, ${mix(color ?? k.accent, "#FFFFFF", 0.25)}, ${color ?? k.accent})`, marginInlineStart: 0 }} />
    </span>
  );
}

function Ring({ value, k, size = 44, stroke = 4, track, text, children }: { value: number; k: Kit; size?: number; stroke?: number; track?: string; text?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span style={{ position: "relative", width: size, height: size, flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ position: "absolute", inset: 0, transform: `rotate(-90deg)${k.rtl ? " scaleY(-1)" : ""}` }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track ?? k.track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={k.accent} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(c * value) / 100} ${c}`} />
      </svg>
      {children ?? <b style={{ position: "relative", fontSize: size * 0.24, fontWeight: 800, color: text ?? k.p.text }}>{value}%</b>}
    </span>
  );
}

function Tag({ label, bg, color, icon }: { label: string; bg: string; color: string; icon?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 999, background: bg, color, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", flex: "none" }}>
      {icon ? <I name={icon} size={13} fill /> : null}
      {label}
    </span>
  );
}

const glass = (radius: number, dark = true): CSSProperties => ({
  borderRadius: radius,
  background: dark ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.74)",
  border: "0.8px solid rgba(255,255,255,.28)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
});

const one: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const clamp = (lines: number): CSSProperties => ({ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" });
const RATIO = { wide: "16 / 9", tall: "4 / 3", square: "1 / 1" } as const;

function Avatar({ name, size, k }: { name: string; size: number; k: Kit }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("");
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", background: k.soft, color: k.accent, fontSize: size * 0.38, fontWeight: 800 }}>{initials}</span>
  );
}

// ——— The course card ———

function CourseCard({ entry, index, k, progress }: { entry: PickableEntry; index: number; k: Kit; progress: number | null }) {
  const { p, d } = k;
  const card = d.card;
  const shows = (part: (typeof card.hide)[number]) => !card.hide.includes(part);
  const teacher = shows("teacher") && entry.subtitle ? entry.subtitle : null;
  const rating = shows("rating") && entry.rating ? entry.rating : null;
  const price = shows("price") && progress === null ? (plainPrice(entry.price) ?? k.w.free) : null;
  const done = shows("progress") ? progress : null;
  const badge = entry.badge;
  const white = "#FFFFFF";
  const box: CSSProperties = { position: "relative", borderRadius: card.radius, overflow: "hidden", flex: "none" };
  if (card.layout === "poster") {
    const s = card.scrim / 100;
    return (
      <div data-course-card="poster" style={{ ...box, aspectRatio: RATIO[card.ratio] }}>
        <Photo url={entry.imageUrl} k={k} seed={index} style={{ position: "absolute", inset: 0 }} />
        <span style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,${s * 0.25}) 0%, rgba(0,0,0,${s * 0.15}) 42%, rgba(0,0,0,${Math.min(0.95, s + 0.12)}) 100%)` }} />
        <div style={{ position: "absolute", top: 12, insetInline: 12, display: "flex", alignItems: "center" }}>
          {badge ? <Tag label={badge} bg={k.accent} color={k.onAccent} icon="workspace_premium" /> : null}
          <span style={{ flex: 1 }} />
          {price ? <span style={{ ...glass(999), padding: "5px 11px", color: white, fontSize: 13, fontWeight: 800 }}>{price}</span> : null}
        </div>
        <div style={{ position: "absolute", insetInline: 16, bottom: 16, display: "flex", flexDirection: "column", gap: 8, color: white }}>
          {rating ? <Stars rating={rating} k={k} text={white} /> : null}
          <b style={{ fontSize: 20, lineHeight: 1.22, fontWeight: 800, ...clamp(2) }}>{entry.title}</b>
          {teacher ? (
            <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, opacity: 0.92 }}>
              <Avatar name={teacher} size={20} k={k} />
              <span style={one}>{teacher}</span>
            </span>
          ) : null}
          {done !== null ? (
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Bar value={done} k={k} track="rgba(255,255,255,.25)" height={5} />
              <b style={{ fontSize: 11.5 }}>{done}%</b>
            </span>
          ) : null}
        </div>
      </div>
    );
  }
  if (card.layout === "glass") {
    return (
      <div data-course-card="glass" style={{ ...box, aspectRatio: RATIO[card.ratio] }}>
        <Photo url={entry.imageUrl} k={k} seed={index} style={{ position: "absolute", inset: 0 }} />
        <span style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 30%, rgba(0,0,0,${card.scrim / 100}))` }} />
        <div style={{ position: "absolute", top: 10, insetInline: 10, display: "flex" }}>
          {badge ? <Tag label={badge.toUpperCase()} bg={d.look === "on_air" ? k.live : k.accent} color={d.look === "on_air" ? white : k.onAccent} /> : null}
          <span style={{ flex: 1 }} />
          {price ? <Tag label={price} bg={k.accent} color={k.onAccent} /> : null}
        </div>
        <div style={{ ...glass(Math.max(8, card.radius - 6)), position: "absolute", insetInline: 9, bottom: 9, padding: "10px 12px", display: "flex", alignItems: "center", gap: 10, color: white }}>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
            <b style={{ fontSize: 15, lineHeight: 1.25, ...clamp(2) }}>{entry.title}</b>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, minWidth: 0 }}>
              {teacher ? <span style={one}>{teacher}</span> : null}
              {rating ? <Stars rating={rating} k={k} size={11} color="#F5C451" text={white} /> : null}
            </span>
          </span>
          {done !== null ? <Ring value={done} k={k} size={40} track="rgba(255,255,255,.25)" text={white} /> : null}
        </div>
      </div>
    );
  }
  if (card.layout === "ticket") {
    return (
      <div data-course-card="ticket" style={{ borderRadius: card.radius, background: p.surface, border: `1px solid ${k.line}`, boxShadow: k.shadow, flex: "none" }}>
        <div style={{ padding: 7 }}>
          <Photo url={entry.imageUrl} k={k} seed={index} radius={Math.max(0, card.radius - 6)} style={{ width: "100%", aspectRatio: RATIO[card.ratio] }}>
            {badge ? <span style={{ position: "absolute", top: 9, insetInlineStart: 9 }}><Tag label={badge} bg={k.accent} color={k.onAccent} /></span> : null}
          </Photo>
        </div>
        <div style={{ position: "relative", height: 16, margin: "0 -1px" }}>
          <span style={{ position: "absolute", insetInlineStart: -8, top: -1, width: 18, height: 18, borderRadius: "50%", background: p.background, borderInlineEnd: `1px solid ${k.line}` }} />
          <span style={{ position: "absolute", insetInline: 18, top: 8, borderTop: `1.2px dashed ${k.line}` }} />
          <span style={{ position: "absolute", insetInlineEnd: -8, top: -1, width: 18, height: 18, borderRadius: "50%", background: p.background, borderInlineStart: `1px solid ${k.line}` }} />
        </div>
        <div style={{ padding: "6px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 15.5, lineHeight: 1.3, color: p.text, ...clamp(2) }}>{entry.title}</b>
          {teacher ? (
            <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: p.textSecondary }}>
              <Avatar name={teacher} size={20} k={k} />
              <span style={one}>{teacher}</span>
            </span>
          ) : null}
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {rating ? <Stars rating={rating} k={k} size={12} /> : null}
            <span style={{ flex: 1 }} />
            {price ? <b style={{ fontSize: 15, color: k.accent }}>{price}</b> : null}
          </span>
          {done !== null ? (
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Bar value={done} k={k} />
              <b style={{ fontSize: 11.5, color: p.text }}>{done}%</b>
            </span>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div data-course-card="row" style={{ display: "flex", alignItems: "center", gap: 12, padding: 9, borderRadius: card.radius, background: p.surface, border: `1px solid ${k.line}`, boxShadow: k.shadow, flex: "none" }}>
      <Photo url={entry.imageUrl} k={k} seed={index} radius={Math.max(0, card.radius - 6)} style={{ width: 80, height: 80 }} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
        {badge ? <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: k.accent }}>{badge.toUpperCase()}</span> : null}
        <b style={{ fontSize: 14.5, lineHeight: 1.3, color: p.text, ...clamp(2) }}>{entry.title}</b>
        {teacher ? <span style={{ fontSize: 11.5, color: p.textSecondary, ...one }}>{teacher}</span> : null}
        {rating ? <Stars rating={rating} k={k} size={11} /> : null}
      </span>
      {done !== null ? <Ring value={done} k={k} size={46} /> : price ? <b style={{ fontSize: 14, color: p.text, flex: "none" }}>{price}</b> : null}
    </div>
  );
}

function Catalog({ props, k }: { props: CourseScreenDrawingProps; k: Kit }) {
  const { p, w } = k;
  const list = props.courses.slice(0, 4);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px 20px" }}>
      <b style={{ fontSize: 28, lineHeight: 1.15, color: p.text }}>{props.tabLabel?.trim() || w.allCourses}</b>
      <span style={{ display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 14px", borderRadius: 999, background: p.surface, border: `1px solid ${k.line}`, color: p.textTertiary, fontSize: 13 }}>
        <I name="search" size={19} />
        {w.exploreSearch}
      </span>
      {list.map((entry, i) => (
        // The first course one the sample student is in, the others to join.
        <CourseCard key={entry.id} entry={entry} index={i} k={k} progress={i === 1 ? SAMPLE_PROGRESS[0]! : null} />
      ))}
    </div>
  );
}

// ——— A course's page ———

function RoundButton({ icon, k, onPhoto, flip }: { icon: string; k: Kit; onPhoto: boolean; flip?: boolean }) {
  return (
    <span style={{ width: 38, height: 38, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none", ...(onPhoto ? glass(19) : { background: k.p.surface, border: `1px solid ${k.p.border}` }), color: onPhoto ? "#FFFFFF" : k.p.text }}>
      <I name={icon} size={19} flip={flip} />
    </span>
  );
}

function Buttons({ k, onPhoto }: { k: Kit; onPhoto: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <RoundButton icon="arrow_back" k={k} onPhoto={onPhoto} flip={k.rtl} />
      <span style={{ flex: 1 }} />
      <RoundButton icon="ios_share" k={k} onPhoto={onPhoto} />
      <RoundButton icon="favorite" k={k} onPhoto={onPhoto} />
    </div>
  );
}

function Section({ title, k, number, trailing, children }: { title: string; k: Kit; number: number; trailing?: ReactNode; children: ReactNode }) {
  const index = k.d.look === "index";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {index ? <span style={{ borderTop: `1px solid ${k.line}` }} /> : null}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <b style={index ? { flex: 1, fontSize: 11.5, letterSpacing: 1.4, color: k.p.text } : { flex: 1, fontSize: 17, color: k.p.text }}>{index ? `${String(number).padStart(2, "0")}  ${title.toUpperCase()}` : title}</b>
        {trailing}
      </div>
      {children}
    </div>
  );
}

function CoursePage({ props, k }: { props: CourseScreenDrawingProps; k: Kit }) {
  const { p, d, w, c } = k;
  const entry = props.courses[0];
  const title = entry?.title ?? w.sampleCourse;
  const teacher = entry?.subtitle || w.sampleTeacher;
  const rating = entry?.rating ?? null;
  const price = plainPrice(entry?.price) ?? w.free;
  const shows = (part: (typeof d.page.hide)[number]) => !d.page.hide.includes(part);
  const facts = [
    ["play_lesson", w.lessons(w.sampleLessons.length + 3)],
    ["schedule", w.hoursMinutes(2, 40)],
    ["workspace_premium", w.certificate],
  ] as const;
  const white = "#FFFFFF";
  const hero =
    d.page.hero === "cinema" ? (
      <div data-course-hero="cinema" style={{ position: "relative", height: 380 }}>
        <Photo url={entry?.imageUrl} k={k} seed={0} style={{ position: "absolute", inset: 0 }} />
        <span style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.05) 30%, ${alpha(k.ink, 0.8)} 72%, ${k.ink} 100%)` }} />
        <div style={{ position: "absolute", top: (props.top ?? 0) + 10, insetInline: 14 }}>
          <Buttons k={k} onPhoto />
        </div>
        <div style={{ position: "absolute", insetInline: 18, bottom: 20, display: "flex", flexDirection: "column", gap: 10, color: white }}>
          <span style={{ display: "flex", gap: 6 }}>
            {d.look === "on_air" && entry?.badge ? <Tag label={entry.badge.toUpperCase()} bg={k.live} color={white} /> : null}
            <Tag label={w.sampleSubject} bg={k.accent} color={k.onAccent} />
          </span>
          <b style={{ fontSize: 25, lineHeight: 1.15, ...clamp(3) }}>{title}</b>
          {rating ? <Stars rating={rating} k={k} size={14} text={white} /> : null}
          <span style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11.5, opacity: 0.9 }}>
            {facts.map(([icon, label]) => (
              <span key={icon} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <I name={icon} size={14} color={k.accent} />
                {label}
              </span>
            ))}
          </span>
          <span style={{ ...glass(999), alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 7, padding: "3px 12px 3px 3px", fontSize: 12, fontWeight: 700 }}>
            <Avatar name={teacher} size={26} k={k} />
            {teacher}
          </span>
        </div>
      </div>
    ) : d.page.hero === "framed" ? (
      <div data-course-hero="framed" style={{ padding: `${(props.top ?? 0) + 10}px 16px 4px`, display: "flex", flexDirection: "column", gap: 12 }}>
        <Buttons k={k} onPhoto={false} />
        <Photo url={entry?.imageUrl} k={k} seed={0} radius={26} style={{ width: "100%", aspectRatio: "16 / 11", boxShadow: `0 16px 34px ${alpha(k.accent, p.dark ? 0.18 : 0.28)}` }}>
          <span style={{ ...glass(999), position: "absolute", top: 12, insetInlineStart: 12, padding: "5px 11px", color: white, fontSize: 11.5, fontWeight: 800 }}>{w.sampleSubject}</span>
        </Photo>
        <b style={{ fontSize: 23, lineHeight: 1.2, color: p.text }}>{title}</b>
        {rating ? <Stars rating={rating} k={k} size={14} /> : null}
        <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {facts.map(([icon, label]) => (
            <span key={icon} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 999, background: k.soft, fontSize: 11.5, fontWeight: 700, color: p.text }}>
              <I name={icon} size={14} color={k.accent} />
              {label}
            </span>
          ))}
        </span>
      </div>
    ) : (
      <div data-course-hero="split">
        <Photo url={entry?.imageUrl} k={k} seed={0} style={{ height: 250 }}>
          <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.4), transparent 45%)" }} />
          <div style={{ position: "absolute", top: (props.top ?? 0) + 10, insetInline: 14 }}>
            <Buttons k={k} onPhoto />
          </div>
        </Photo>
        <div style={{ marginTop: -26, position: "relative", borderRadius: "26px 26px 0 0", background: p.background, padding: "20px 20px 4px", display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 11, letterSpacing: 2, fontWeight: 800, color: k.accent }}>{w.sampleSubject.toUpperCase()}</span>
          <b style={{ fontSize: 26, lineHeight: 1.12, letterSpacing: -0.4, color: p.text }}>{title}</b>
          {rating ? <Stars rating={rating} k={k} size={13} /> : null}
          <div style={{ display: "flex", borderTop: `1px solid ${k.line}`, borderBottom: `1px solid ${k.line}`, marginTop: 6 }}>
            {facts.map(([icon, label], i) => (
              <span key={icon} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "12px 4px", borderInlineStart: i ? `1px solid ${k.line}` : undefined, fontSize: 11.5, fontWeight: 700, color: p.text, textAlign: "center" }}>
                <I name={icon} size={18} color={k.accent} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  let n = 0;
  const lessons = w.sampleLessons;
  const sections: ReactNode[] = [];
  if (shows("teacher"))
    sections.push(
      <Section key="t" title={c.instructor} k={k} number={++n}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, ...(d.look === "index" ? {} : { padding: 14, borderRadius: 22, background: p.surface, border: `1px solid ${k.line}` }) }}>
          <span style={{ padding: 3, borderRadius: "50%", background: `conic-gradient(${k.accent}, ${mix(k.accent, "#FFFFFF", 0.45)}, ${k.accent})`, flex: "none" }}>
            <span style={{ display: "block", borderRadius: "50%", border: `2px solid ${p.surface}` }}>
              <Avatar name={teacher} size={44} k={k} />
            </span>
          </span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            <b style={{ fontSize: 15, color: p.text, ...one }}>{teacher}</b>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: k.accent }}>{c.instructor}</span>
            <span style={{ fontSize: 11.5, color: p.textSecondary, ...one }}>{w.sampleBio}</span>
          </span>
        </div>
      </Section>,
    );
  if (shows("learn"))
    sections.push(
      <Section key="l" title={c.learn} k={k} number={++n}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, ...(d.look === "index" ? {} : { padding: 14, borderRadius: 20, background: k.soft }) }}>
          {c.sampleLearn.map((text, i) => (
            <span key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, lineHeight: 1.45, color: p.text }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", background: d.look === "index" ? "transparent" : k.accent, border: d.look === "index" ? `1px solid ${k.accent}` : undefined, color: d.look === "index" ? k.accent : k.onAccent, fontSize: 10.5, fontWeight: 800 }}>
                {d.look === "index" ? i + 1 : <I name="check" size={14} />}
              </span>
              {text}
            </span>
          ))}
        </div>
      </Section>,
    );
  if (shows("curriculum"))
    sections.push(
      <Section key="c" title={w.curriculum} k={k} number={++n}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ display: "flex", gap: 10, fontSize: 13, fontWeight: 800, color: p.text, marginBottom: 6 }}>
            <span style={{ color: k.accent }}>01</span>
            {w.unit(1)}
          </span>
          {[...lessons, w.sampleQuiz].map((title, i) => {
            const done = i < 2;
            const here = i === 2;
            const locked = i === 3;
            return (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
                <span style={{ position: "relative", width: 26, alignSelf: "stretch", display: "flex", justifyContent: "center", flex: "none" }}>
                  <span style={{ position: "absolute", top: i === 0 ? "50%" : 0, bottom: i === 3 ? "50%" : 0, width: 2, background: k.track }} />
                  <span style={{ position: "relative", alignSelf: "center", width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: done ? k.accent : here ? p.surface : p.background, border: `${here ? 2.5 : 1.5}px solid ${done || here ? k.accent : k.track}`, boxShadow: here ? `0 0 10px ${alpha(k.accent, 0.35)}` : undefined, color: done ? k.onAccent : here ? k.accent : p.textSecondary }}>
                    <I name={done ? "check" : locked ? "lock" : "play_arrow"} size={13} fill={here} />
                  </span>
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: here ? "8px 10px" : 0, borderRadius: 12, background: here ? k.soft : undefined }}>
                  {here ? <span style={{ fontSize: 10.5, fontWeight: 800, color: k.accent }}>{c.youAreHere}</span> : null}
                  <span style={{ fontSize: 13, fontWeight: here ? 800 : 600, color: locked ? p.textSecondary : p.text, ...one }}>{title}</span>
                </span>
                <span style={{ fontSize: 11, color: p.textSecondary, flex: "none" }}>{i === 3 ? w.questions(10) : w.minutes([10, 12, 18][i]!)}</span>
              </span>
            );
          })}
        </div>
      </Section>,
    );
  if (shows("reviews"))
    sections.push(
      <Section key="r" title={w.reviews} k={k} number={++n} trailing={<span style={{ fontSize: 12, fontWeight: 800, color: k.accent }}>{c.allReviews}</span>}>
        <div style={{ display: "flex", gap: 12, padding: 14, borderRadius: d.look === "index" ? 14 : 22, background: p.surface, border: `1px solid ${k.line}` }}>
          <span style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar name={c.sampleReviewer} size={30} k={k} />
              <b style={{ fontSize: 13, color: p.text, flex: 1, ...one }}>{c.sampleReviewer}</b>
              <I name="format_quote" size={22} fill color={alpha(k.accent, 0.5)} />
            </span>
            <span style={{ fontSize: 12.5, lineHeight: 1.5, color: p.text, ...clamp(3) }}>{c.sampleReview}</span>
          </span>
        </div>
      </Section>,
    );
  if (shows("about"))
    sections.push(
      <Section key="a" title={w.aboutCourse} k={k} number={++n}>
        <span style={{ fontSize: 13, lineHeight: 1.55, color: p.textSecondary }}>{k.c.sampleLearn.join(". ")}.</span>
      </Section>,
    );
  const cta = courseText(d.page.cta, props.lang) ?? w.joinNow;
  const floating = d.page.bar === "floating";
  const bar = (
    <div
      data-course-bar={d.page.bar}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: floating ? "10px 10px 10px 16px" : "12px 18px 16px",
        background: d.page.bar === "solid" ? p.surface : alpha(p.surface, floating ? 0.86 : 0.72),
        backdropFilter: d.page.bar === "solid" ? undefined : "blur(18px)",
        WebkitBackdropFilter: d.page.bar === "solid" ? undefined : "blur(18px)",
        borderTop: floating ? undefined : `1px solid ${alpha(p.border, d.page.bar === "glass" ? 0.5 : 1)}`,
        border: floating ? `1px solid ${alpha(p.border, 0.6)}` : undefined,
        borderRadius: floating ? 26 : 0,
        margin: floating ? "0 12px 12px" : 0,
        boxShadow: floating ? `0 12px 30px rgba(14,13,36,${p.dark ? 0.5 : 0.18})` : undefined,
      }}
    >
      <b style={{ fontSize: 21, color: p.text, flex: "none" }}>{price}</b>
      <span style={{ flex: 1, height: 50, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: `linear-gradient(135deg, ${mix(k.accent, "#FFFFFF", 0.3)}, ${k.accent})`, color: k.onAccent, fontWeight: 800, fontSize: 14.5 }}>
        <I name="shopping_bag" size={18} />
        {cta}
      </span>
    </div>
  );
  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", flex: "1 0 auto" }}>
      {hero}
      <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: `${d.page.hero === "split" ? 8 : 20}px 18px ${d.page.bar === "solid" ? 20 : 120}px` }}>{sections}</div>
      <div style={{ position: "sticky", bottom: 0, marginTop: "auto" }}>{bar}</div>
    </div>
  );
}

// ——— The lesson ———

function Lesson({ props, k }: { props: CourseScreenDrawingProps; k: Kit }) {
  const { p, d, w, c } = k;
  const entry = props.courses[0];
  const shows = (part: (typeof d.lesson.hide)[number]) => !d.lesson.hide.includes(part);
  const cinema = d.lesson.player === "cinema";
  const total = 8;
  const done = 3;
  const share = Math.round((done / total) * 100);
  const player = (
    <div data-course-player={d.lesson.player} style={{ position: "relative", aspectRatio: "16 / 9", background: "linear-gradient(180deg,#1A1636,#3A2A62 55%,#15122A)", borderRadius: cinema ? 0 : 22, overflow: "hidden", boxShadow: cinema ? undefined : `0 12px 28px ${alpha(k.accent, 0.22)}` }}>
      {entry?.imageUrl ? <Photo url={entry.imageUrl} k={k} seed={0} style={{ position: "absolute", inset: 0, opacity: 0.55 }} /> : null}
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 26, color: "#FFFFFF" }}>
        <I name="replay_10" size={24} />
        <span style={{ ...glass(28), width: 56, height: 56, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <I name="pause" size={30} fill />
        </span>
        <I name="forward_10" size={24} />
      </span>
      <span style={{ position: "absolute", insetInline: 14, bottom: 12, display: "flex", gap: 3 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i < 2 ? k.accent : i === 2 ? `linear-gradient(90deg, ${k.accent} 40%, rgba(255,255,255,.35) 40%)` : "rgba(255,255,255,.35)" }} />
        ))}
      </span>
    </div>
  );
  const label = <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, color: p.textSecondary }}>{c.yourProgress}</span>;
  const counts = <b style={{ fontSize: 11.5, color: p.text }}>{w.doneOf(done, total)}</b>;
  const progress = shows("progress") ? (
    <div data-course-progress={d.lesson.progress} style={{ padding: 12, borderRadius: d.look === "index" ? 12 : 18, background: p.surface, border: `1px solid ${k.line}`, display: "flex", flexDirection: d.lesson.progress === "ring" ? "row" : "column", alignItems: d.lesson.progress === "ring" ? "center" : "stretch", gap: 10 }}>
      {d.lesson.progress === "ring" ? (
        <>
          <Ring value={share} k={k} size={46} stroke={5} />
          <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {label}
            {counts}
          </span>
        </>
      ) : (
        <>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ flex: 1 }}>{label}</span>
            {d.lesson.progress === "bar" ? <b style={{ fontSize: 11.5, color: k.accent }}>{share}%</b> : null}
            {counts}
          </span>
          {d.lesson.progress === "bar" ? (
            <Bar value={share} k={k} height={7} />
          ) : (
            <span style={{ display: "flex", gap: 4 }}>
              {Array.from({ length: total }, (_, i) => (
                <span key={i} style={{ flex: 1, height: 6, borderRadius: 6, background: i < done ? k.accent : i === done ? `linear-gradient(90deg, ${k.accent} 50%, ${k.track} 50%)` : k.track }} />
              ))}
            </span>
          )}
        </>
      )}
    </div>
  ) : null;
  const chips = [shows("notes") ? w.myNotes : null, shows("resources") ? `${c.resources} 2` : null, `${w.discussion} 24`].filter((x): x is string => !!x);
  return (
    <div style={{ display: "flex", flexDirection: "column", background: cinema ? k.p.background : p.background, flex: "1 0 auto" }}>
      {cinema ? (
        <div style={{ background: "#0E0D24", paddingTop: props.top ?? 0 }}>{player}</div>
      ) : (
        <div style={{ padding: `${(props.top ?? 0) + 6}px 14px 0`, display: "flex", flexDirection: "column", gap: 8 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, color: p.text }}>
            <I name="chevron_left" size={24} flip={k.rtl} />
            <b style={{ fontSize: 13, ...one }}>{entry?.title ?? w.sampleCourse}</b>
          </span>
          {player}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 18px 20px" }}>
        <span style={{ fontSize: 11, color: p.textSecondary }}>
          {w.lessonOf(4, total)} · {w.sampleUnit}
        </span>
        {progress}
        <b style={{ fontSize: 21, lineHeight: 1.3, color: p.text }}>{w.sampleLesson}</b>
        <span style={{ display: "flex", gap: 10 }}>
          <span style={{ flex: 1, height: 44, borderRadius: 14, border: `1px solid ${p.border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 700, color: p.text }}>
            <I name="arrow_back" size={17} flip={k.rtl} />
            {c.previous}
          </span>
          <span style={{ flex: 1, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${mix(k.accent, "#FFFFFF", 0.3)}, ${k.accent})`, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, fontWeight: 800, color: k.onAccent }}>
            {w.nextLesson}
            <I name="arrow_forward" size={17} flip={k.rtl} />
          </span>
        </span>
        <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {chips.map((label, i) => (
            <span key={i} style={{ height: 30, padding: "0 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", background: i === 0 ? p.text : alpha(p.text, 0.06), color: i === 0 ? p.surface : p.text, fontSize: 12, fontWeight: 700 }}>
              {label}
            </span>
          ))}
        </span>
        {shows("notes") ? (
          <span style={{ padding: 12, borderRadius: 16, background: p.surface, border: `1px solid ${k.line}`, display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: k.accent }}>04:32 · {w.sampleNoteWhen}</span>
            <span style={{ fontSize: 13, color: p.text }}>{w.sampleNote}</span>
          </span>
        ) : null}
        {shows("up_next") ? (
          <span style={{ padding: 10, borderRadius: 18, background: p.surface, border: `1px solid ${k.line}`, display: "flex", alignItems: "center", gap: 10 }}>
            <Photo url={entry?.imageUrl} k={k} seed={1} radius={12} style={{ width: 64, height: 48 }} />
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 10.5, color: p.textSecondary }}>{w.upNext} · {w.minutes(22)}</span>
              <b style={{ fontSize: 13, color: p.text, ...one }}>{w.sampleNextLesson}</b>
            </span>
            <span style={{ width: 38, height: 38, borderRadius: "50%", background: p.text, color: p.surface, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <I name="skip_next" size={20} fill flip={k.rtl} />
            </span>
          </span>
        ) : null}
        {shows("resources") ? (
          <span style={{ padding: 10, borderRadius: 16, background: p.surface, border: `1px solid ${k.line}`, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(229,72,77,.14)", color: "#E5484D", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <I name="picture_as_pdf" size={19} />
            </span>
            <span style={{ flex: 1, fontSize: 12.5, fontWeight: 700, color: p.text, ...one }}>{w.sampleFile}</span>
            <span style={{ fontSize: 11, color: p.textSecondary }}>1.2 MB</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ——— My courses ———

function MyCourses({ props, k }: { props: CourseScreenDrawingProps; k: Kit }) {
  const { p, d, w, c } = k;
  const list = props.courses.slice(0, 4);
  const shows = (part: (typeof d.my_courses.hide)[number]) => !d.my_courses.hide.includes(part);
  const rings = d.my_courses.progress === "rings";
  const headline = courseText(d.my_courses.headline, props.lang);
  const first = list[0];
  const chips = [`${w.inProgress} ${Math.min(3, list.length)}`, ...(shows("completed") ? [`${w.completed} 1`] : []), w.saved];
  const progressOf = (i: number) => SAMPLE_PROGRESS[i % SAMPLE_PROGRESS.length]!;
  const progress = (value: number, onPhoto = false, size = 42) =>
    rings ? (
      <Ring value={value} k={k} size={size} track={onPhoto ? "rgba(255,255,255,.25)" : undefined} text={onPhoto ? "#FFFFFF" : undefined} />
    ) : (
      <span style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
        <Bar value={value} k={k} track={onPhoto ? "rgba(255,255,255,.25)" : undefined} />
        <b style={{ fontSize: 11, color: onPhoto ? "#FFFFFF" : p.text }}>{value}%</b>
      </span>
    );
  const shown = list.slice(0, 3);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 16px 24px" }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <b style={{ fontSize: 27, lineHeight: 1.1, color: p.text }}>{props.tabLabel?.trim() || w.myCourses}</b>
        {headline ? <span style={{ fontSize: 13, color: p.textSecondary }}>{headline}</span> : null}
      </span>
      {shows("continue") && first ? (
        <div data-course-continue="" style={{ position: "relative", height: 190, borderRadius: d.look === "index" ? 16 : 26, overflow: "hidden" }}>
          <Photo url={first.imageUrl} k={k} seed={0} style={{ position: "absolute", inset: 0 }} />
          <span style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${alpha(k.ink, 0.25)}, ${alpha(k.ink, 0.92)})` }} />
          <span style={{ position: "absolute", top: 14, insetInlineStart: 14 }}>
            <Tag label={c.continueLearning} bg={k.accent} color={k.onAccent} icon="play_arrow" />
          </span>
          <div style={{ position: "absolute", insetInline: 16, bottom: 16, display: "flex", alignItems: "flex-end", gap: 12, color: "#FFFFFF" }}>
            <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
              <b style={{ fontSize: 18, lineHeight: 1.2, ...clamp(2) }}>{first.title}</b>
              <span style={{ fontSize: 12, opacity: 0.85, ...one }}>{w.next(w.sampleLesson)}</span>
              {rings ? null : progress(progressOf(0), true)}
            </span>
            {rings ? (
              <Ring value={progressOf(0)} k={k} size={56} stroke={5} track="rgba(255,255,255,.25)">
                <I name="play_arrow" size={26} fill color="#FFFFFF" />
              </Ring>
            ) : (
              <span style={{ width: 46, height: 46, borderRadius: "50%", background: k.accent, color: k.onAccent, display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <I name="play_arrow" size={26} fill />
              </span>
            )}
          </div>
        </div>
      ) : null}
      {shows("week") ? (
        <span style={{ padding: "12px 14px", borderRadius: d.look === "index" ? 14 : 22, background: p.dark ? "#EEF0F7" : p.primary, color: p.dark ? "#141A30" : p.onPrimary, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 11, opacity: 0.75 }}>{w.weekTitle}</span>
            <b style={{ fontSize: 18 }}>{w.weekTime}</b>
          </span>
          <span style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 34 }}>
            {[40, 70, 30, 90, 55, 100, 20].map((h, i) => (
              <span key={i} style={{ width: 7, height: `${h}%`, borderRadius: 4, background: i === 5 ? k.accent : "currentColor", opacity: i === 5 ? 1 : 0.35 }} />
            ))}
          </span>
        </span>
      ) : null}
      <span style={{ display: "flex", gap: 8, overflow: "hidden" }}>
        {chips.map((label, i) => (
          <span key={i} style={{ flex: "none", height: 34, padding: "0 14px", borderRadius: 999, display: "inline-flex", alignItems: "center", background: i === 0 ? k.accent : "transparent", border: `1px solid ${i === 0 ? k.accent : k.line}`, color: i === 0 ? k.onAccent : p.text, fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap" }}>
            {label}
          </span>
        ))}
      </span>
      {d.my_courses.layout === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {shown.map((e, i) => (
            <div key={e.id} style={{ padding: 8, borderRadius: d.look === "index" ? 14 : 22, background: p.surface, border: `1px solid ${k.line}`, display: "flex", flexDirection: "column", gap: 8 }}>
              <Photo url={e.imageUrl} k={k} seed={i} radius={d.look === "index" ? 8 : 16} style={{ width: "100%", aspectRatio: "1 / 0.85" }}>
                {rings ? (
                  <span style={{ position: "absolute", insetInlineEnd: 6, bottom: 6, padding: 3, borderRadius: "50%", background: p.surface }}>
                    <Ring value={progressOf(i)} k={k} size={38} />
                  </span>
                ) : null}
              </Photo>
              <b style={{ fontSize: 12.5, lineHeight: 1.3, color: p.text, ...clamp(2) }}>{e.title}</b>
              {rings ? <span style={{ fontSize: 10.5, color: p.textSecondary }}>{w.doneOf(3 + i, 8 + i * 4)}</span> : progress(progressOf(i))}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: d.look === "index" ? 0 : 10 }}>
          {shown.map((e, i) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: d.look === "index" ? "12px 0" : 9, borderRadius: d.look === "index" ? 0 : 20, background: d.look === "index" ? "transparent" : p.surface, border: d.look === "index" ? undefined : `1px solid ${k.line}`, borderTop: d.look === "index" && i ? `1px solid ${k.line}` : undefined }}>
              <Photo url={e.imageUrl} k={k} seed={i} radius={d.look === "index" ? 8 : 16} style={{ width: 74, height: 74 }} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
                {e.subtitle ? <span style={{ fontSize: d.look === "index" ? 10 : 11, letterSpacing: d.look === "index" ? 1.2 : 0, fontWeight: 700, color: d.look === "index" ? k.accent : p.textSecondary, ...one }}>{d.look === "index" ? e.subtitle.toUpperCase() : e.subtitle}</span> : null}
                <b style={{ fontSize: 13.5, lineHeight: 1.3, color: p.text, ...clamp(2) }}>{e.title}</b>
                {rings ? <span style={{ fontSize: 11, color: p.textSecondary }}>{w.doneOf(3 + i, 8 + i * 4)}</span> : progress(progressOf(i))}
              </span>
              {rings ? <Ring value={progressOf(i)} k={k} size={46} /> : null}
            </div>
          ))}
        </div>
      )}
      {shows("completed") ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: k.accent }}>
          <I name="workspace_premium" size={17} fill />
          {c.viewCertificate}
        </span>
      ) : null}
    </div>
  );
}

/** One course screen in the look, as the app draws it. */
export function CourseScreenDrawing(props: CourseScreenDrawingProps) {
  const k = kit(props);
  const body =
    props.part === "card" ? <Catalog props={props} k={k} /> : props.part === "page" ? <CoursePage props={props} k={k} /> : props.part === "lesson" ? <Lesson props={props} k={k} /> : <MyCourses props={props} k={k} />;
  const bleeds = props.part === "page" || props.part === "lesson";
  return (
    <div
      data-studio-screen-drawn={`courses:${props.part}:${props.design.look}`}
      dir={k.rtl ? "rtl" : "ltr"}
      style={{ flex: "1 0 auto", display: "flex", flexDirection: "column", background: k.p.background, color: k.p.text, paddingTop: bleeds ? 0 : (props.top ?? 0), minHeight: 300 }}
    >
      {body}
    </div>
  );
}
