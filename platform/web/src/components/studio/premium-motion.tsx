import type { CSSProperties, ReactNode } from "react";
import type { LanguageCode, StudioNode, Translations } from "@/lib/pages/types";
import { scrimCss } from "@/lib/studio/scrim";

/**
 * 129.1–129.8 Studio's premium motion and media on the canvas, as the app
 * draws them (mobile/lib/modules/shared/pages/studio_motion.dart and the
 * files beside it): a slider's frosted pill and slow zoom, and the
 * keyframes the premium elements move with. Every animation stops when the
 * computer asks to reduce motion.
 */

/** The keyframes, once per canvas. */
export const PREMIUM_MOTION_CSS = `
@keyframes studio-ken-burns { from { transform: scale(1); } to { transform: scale(1.1); } }
[data-studio-ken-burns] [data-studio-cover] img, [data-studio-ken-burns] [data-studio-node] > img, [data-studio-ken-burns] > img, [data-studio-ken-burns] [data-studio-banner] > img { animation: studio-ken-burns 8s ease-in-out infinite alternate; transform-origin: center; }
@keyframes studio-marquee { from { transform: translateX(var(--studio-marquee-from)); } to { transform: translateX(var(--studio-marquee-to)); } }
[data-studio-marquee-track] { animation: studio-marquee var(--studio-marquee-time) linear infinite; }
[data-studio-marquee="press"]:active [data-studio-marquee-track] { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  [data-studio-ken-burns] [data-studio-cover] img, [data-studio-ken-burns] [data-studio-node] > img, [data-studio-ken-burns] > img, [data-studio-ken-burns] [data-studio-banner] > img { animation: none; }
  [data-studio-marquee-track] { animation: none; }
}
`;

export function PremiumMotionStyles() {
  return <style data-studio-premium-motion="">{PREMIUM_MOTION_CSS}</style>;
}

/** 129.1 Where a slider's indicator sits: at its top or foot, as far from that edge as the owner set (12 missing). */
export function edge(look: StudioNode["indicator_look"]): CSSProperties {
  return look?.at === "top" ? { top: look.inset ?? 12 } : { bottom: look?.inset ?? 12 };
}

/** 129.1 "1/3" or "01/03" beside the indicator, at its end, the open slide first. */
export function SliderCount({ count, look }: { count: number; look: StudioNode["indicator_look"] }) {
  const pad = (n: number) => (look?.count === "padded" ? String(n).padStart(2, "0") : String(n));
  const at = look?.at === "top" ? { top: (look.inset ?? 12) + 18 } : { bottom: (look?.inset ?? 12) + 18 };
  return (
    <span data-studio-slide-count="" dir="ltr" style={{ position: "absolute", insetInlineEnd: 16, ...at, color: look?.color ?? "#FFFFFF", fontSize: 12, fontWeight: 700, letterSpacing: 1, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
      {pad(1)}/{pad(count)}
    </span>
  );
}

/** 129.1 Where a slider is: its dots in a frosted pill over its slides' foot (or top), the first one open. */
export function SliderPill({ count, look }: { count: number; look?: StudioNode["indicator_look"] }) {
  return (
    <span data-studio-indicator="pill" aria-hidden="true" style={{ position: "absolute", ...edge(look), left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5, padding: "7px 10px", borderRadius: 999, background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ width: i === 0 ? 18 : 6, height: 6, borderRadius: 3, background: i === 0 ? (look?.color ?? "#FFFFFF") : "rgba(255,255,255,0.55)" }} />
      ))}
    </span>
  );
}

/**
 * 129.3 A ticker: its words (`text`, a line each) and pictures one after
 * another, the separator icon between them in the second colour, running
 * endlessly toward the start (or the end), held while pressed; a still row
 * when the computer reduces motion.
 */
export function Marquee({ node, text, rtl, accent, dark = false }: { node: StudioNode; text: string; rtl: boolean; accent?: string | null; dark?: boolean }) {
  const m = node.marquee ?? {};
  const size = m.size ?? 36;
  const fontSize = node.font?.size ?? 15;
  const gap = node.gap ?? 18;
  const words = text
    .split("\n")
    .map((w) => w.trim())
    .filter(Boolean);
  const items: ReactNode[] = [
    ...words.map((word, i) => (
      <span key={`w${i}`} data-studio-marquee-chip={m.chips ? "" : undefined} style={{ whiteSpace: "nowrap", ...(m.chips ? { padding: "8px 16px", borderRadius: 999, border: `1px solid ${dark ? "rgba(255,255,255,0.16)" : "#E5DFD3"}`, background: dark ? "rgba(255,255,255,0.04)" : "#FFFFFF" } : {}) }}>
        {word}
      </span>
    )),
    ...(node.images ?? []).map((image, i) => (
      // eslint-disable-next-line @next/next/no-img-element -- the owner's logo or photo, drawn as the app draws it
      <img key={`i${i}`} src={image.image_url} alt="" draggable={false} style={{ height: size, width: "auto", display: "block", borderRadius: 6 }} />
    )),
  ].flatMap((item, i) =>
    !node.icon && m.dot
      ? [item, <span key={`d${i}`} aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 3, background: "currentColor", opacity: 0.8, flex: "none" }} />]
      : node.icon
      ? [
          item,
          <span key={`s${i}`} className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: node.icon_size ?? 16, color: accent ?? "#F5B700", fontVariationSettings: "'FILL' 1" }}>
            {node.icon}
          </span>,
        ]
      : [item],
  );
  // One copy's length, roughly, for its time at the owner's speed.
  const length = words.reduce((n, w) => n + w.length * fontSize * 0.58 + gap * 2, 0) + (node.images ?? []).length * (size * 2 + gap) + 1;
  const toStart = (m.direction ?? "start") === "start";
  const away = rtl ? "50%" : "-50%";
  const vars = { "--studio-marquee-from": toStart ? "0%" : away, "--studio-marquee-to": toStart ? away : "0%", "--studio-marquee-time": `${Math.max(4, length / (m.speed ?? 40)).toFixed(1)}s` } as CSSProperties;
  const copy = (key: string, hidden: boolean) => (
    <span key={key} aria-hidden={hidden || undefined} style={{ display: "inline-flex", alignItems: "center", gap, paddingInlineEnd: gap }}>
      {items}
    </span>
  );
  return (
    // A turned band reaches past the sides, so its ends never show.
    <span data-studio-marquee={m.pause_on_press === false ? "" : "press"} aria-label={words.join(", ")} style={{ display: "block", overflow: "hidden", ...(m.tilt ? { transform: `rotate(${rtl ? -m.tilt : m.tilt}deg) scaleX(${(1.04 + Math.abs(Math.sin((m.tilt * Math.PI) / 180)) * 2).toFixed(3)})` } : {}) }}>
      <span data-studio-marquee-track="" style={{ display: "inline-flex", width: "max-content", ...vars }}>
        {copy("a", false)}
        {copy("b", true)}
      </span>
    </span>
  );
}

const JUSTIFY: Record<string, CSSProperties["justifyContent"]> = { start: "flex-start", center: "center", end: "flex-end", between: "space-between", around: "space-around" };
const ITEMS: Record<string, CSSProperties["alignItems"]> = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };

/**
 * 129.4 and 129.7 A video banner (its poster first, the video muted and
 * looping in the app, a round play button in its corner) or a parallax
 * banner (its photo a little taller, moving slower than the page in the
 * app), under its shade, what it holds laid out over it, in a frosted
 * panel when `glass` is set.
 */
export function MediaBanner({ node, dark, rtl, front }: { node: StudioNode; dark: boolean; rtl: boolean; front: ReactNode }) {
  const video = node.type === "video_hero";
  const height = typeof node.height === "number" ? node.height : video ? 420 : 300;
  const pad = node.padding ?? {};
  const radius: CSSProperties = node.corners
    ? { borderStartStartRadius: node.corners.top_start ?? 0, borderStartEndRadius: node.corners.top_end ?? 0, borderEndEndRadius: node.corners.bottom_end ?? 0, borderEndStartRadius: node.corners.bottom_start ?? 0 }
    : { borderRadius: node.radius };
  const background = (dark ? (node.dark_background ?? node.background) : node.background) ?? "#1F2A37";
  const speed = node.parallax?.speed ?? 0.5;
  const fill: CSSProperties = { position: "absolute", insetInline: 0, top: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" };
  const words = (
    <div
      data-studio-glass={node.glass ? "" : undefined}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: node.gap,
        alignItems: ITEMS[node.cross ?? "stretch"],
        ...(node.glass ? { padding: 18, borderRadius: 22, background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" } : { flex: "1 1 auto", justifyContent: JUSTIFY[node.align ?? "start"] }),
      }}
    >
      {front}
    </div>
  );
  return (
    <div data-studio-banner={node.type} style={{ position: "relative", height, overflow: "hidden", background, ...radius }}>
      {video && node.video_url ? (
        <video src={node.video_url} poster={node.image_url ?? undefined} muted loop playsInline preload="none" aria-hidden="true" style={fill} />
      ) : node.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- the owner's photo, drawn as the app draws it
        <img src={node.image_url} alt="" data-studio-parallax={video ? undefined : speed} style={video ? fill : { ...fill, height: `${100 + speed * 100}%`, transform: `translateY(-${((speed * 50) / (1 + speed)).toFixed(1)}%)` }} />
      ) : null}
      {node.scrim ? <span aria-hidden="true" data-studio-scrim="" style={{ position: "absolute", inset: 0, background: scrimCss(node.scrim, rtl) }} /> : null}
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxSizing: "border-box",
          paddingTop: pad.top ?? 0,
          paddingInlineEnd: pad.end ?? 0,
          paddingBottom: pad.bottom ?? 0,
          paddingInlineStart: pad.start ?? 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: node.glass ? JUSTIFY[node.align ?? "start"] : undefined,
        }}
      >
        {words}
      </div>
      {video && node.video_url ? (
        <span data-studio-video-button="" aria-hidden="true" style={{ position: "absolute", top: 12, insetInlineEnd: 12, width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.24)", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", color: "#FFFFFF" }}>
          <span className="material-symbols-rounded" style={{ fontSize: 22, fontVariationSettings: "'FILL' 1" }}>
            {node.autoplay ? "pause" : "play_arrow"}
          </span>
        </span>
      ) : null}
    </div>
  );
}

/**
 * 129.6 Before and after: the photo after over the photo before, shown
 * from the divider to the end (the start in Arabic is the right), the
 * divider a white line with a round handle, each photo's label in a pill
 * at its top corner; dragged in the app.
 */
export function BeforeAfter({ node, lang, defaultLang, dark, words }: { node: StudioNode; lang: string; defaultLang: string; dark: boolean; words: { addPicture: string } }) {
  const [before, after] = node.images ?? [];
  const at = node.compare?.at ?? 50;
  const rtl = lang === "ar";
  const ratio = node.aspect_ratio ?? 1.33;
  const photo = (image: typeof before, shade: string) =>
    image ? (
      // eslint-disable-next-line @next/next/no-img-element -- the owner's photo, drawn as the app draws it
      <img src={image.image_url} alt={entryText(image, "caption", lang, defaultLang)} draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    ) : (
      <span style={{ position: "absolute", inset: 0, background: shade }} />
    );
  const label = (image: typeof before, end: boolean) => {
    const text = image ? entryText(image, "caption", lang, defaultLang) : "";
    return text ? <span style={{ position: "absolute", top: 12, ...(end ? { insetInlineEnd: 12 } : { insetInlineStart: 12 }), padding: "4px 10px", borderRadius: 999, background: "rgba(14,13,36,0.55)", color: "#FFFFFF", fontSize: 12, fontWeight: 700, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}>{text}</span> : null;
  };
  // The after photo shows from the divider to the end side.
  const clip = rtl ? `inset(0 ${at}% 0 0)` : `inset(0 0 0 ${at}%)`;
  return (
    <span data-studio-before-after="" style={{ position: "relative", display: "block", width: "100%", aspectRatio: typeof node.height === "number" ? undefined : `${ratio}`, height: typeof node.height === "number" ? node.height : undefined, overflow: "hidden", borderRadius: "inherit" }}>
      {photo(before, dark ? "#2A2742" : "#E8E2D6")}
      <span style={{ position: "absolute", inset: 0, clipPath: clip }}>{photo(after, dark ? "#3B3858" : "#D4CBB8")}</span>
      {label(before, false)}
      {label(after, true)}
      <span aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, insetInlineStart: `${at}%`, width: 3, marginInlineStart: -1.5, background: "#FFFFFF", boxShadow: "0 0 8px rgba(0,0,0,0.35)" }} />
      <span data-studio-compare-handle="" aria-hidden="true" style={{ position: "absolute", top: "50%", insetInlineStart: `${at}%`, width: 40, height: 40, marginInlineStart: -20, marginTop: -20, borderRadius: "50%", background: "#FFFFFF", boxShadow: "0 4px 14px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0E0D24" }}>
        <span className="material-symbols-rounded" style={{ fontSize: 22 }}>
          arrow_range
        </span>
      </span>
      {!before || !after ? <span style={{ position: "absolute", insetInline: 0, bottom: 10, textAlign: "center", fontSize: 12, opacity: 0.75 }}>{words.addPicture}</span> : null}
    </span>
  );
}

/** 129.5 A masonry tile's shape (width over height) by its place, so the columns' heights differ as the app draws them. */
export const MASONRY_RATIOS = [0.8, 1.15, 1, 0.75, 1.25, 0.9] as const;

/**
 * 129.5 A gallery: the photos in masonry columns, as a bento (a big tile
 * beside two small ones, then a wide one) or a filmstrip that scrolls
 * sideways, their captions over them when asked; a tap opens them full
 * screen in the app. Without photos, three soft tiles say to add them.
 */
export function GalleryGrid({ node, lang, defaultLang, dark, words }: { node: StudioNode; lang: string; defaultLang: string; dark: boolean; words: { addPicture: string } }) {
  const g = node.gallery ?? { layout: "masonry" as const };
  const gap = node.gap ?? 8;
  const radius = g.radius ?? 16;
  const shades = dark ? ["#2A2742", "#33304F", "#3B3858"] : ["#F3E3C3", "#E8EEF6", "#F6E3E7"];
  const images = node.images ?? [];
  const shown = images.length ? images : [0, 1, 2].map(() => null);
  const tile = (image: (typeof images)[number] | null, i: number, style: CSSProperties) => {
    const caption = image ? entryText(image, "caption", lang, defaultLang) : "";
    return (
      <span key={i} data-studio-gallery-photo="" style={{ position: "relative", display: "block", overflow: "hidden", borderRadius: radius, background: shades[i % 3], ...style }}>
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- the owner's photo, drawn as the app draws it
          <img src={image.image_url} alt={caption} draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <span className="material-symbols-rounded" aria-hidden="true" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 28, opacity: 0.45 }}>
            add_photo_alternate
          </span>
        )}
        {g.captions && caption ? (
          <span data-studio-caption={node.caption_style ?? "shade"} style={node.caption_style === "pill" ? { position: "absolute", insetInlineStart: 10, bottom: 10, maxWidth: "calc(100% - 20px)", padding: "7px 14px", borderRadius: 16, background: "rgba(14,13,36,0.5)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", color: "#FFFFFF" } : { position: "absolute", insetInline: 0, bottom: 0, padding: "18px 10px 8px", background: "linear-gradient(transparent, rgba(0,0,0,0.6))", color: "#FFFFFF" }}>
            {/* Its first line bold, the rest under it. */}
            {caption.split("\n").map((line, j) => (
              <span key={j} style={{ display: "block", fontSize: j ? 11 : 13, fontWeight: j ? 500 : 800, opacity: j ? 0.9 : 1 }}>
                {line}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    );
  };
  const hint = images.length ? null : <span style={{ display: "block", marginTop: 6, fontSize: 12, opacity: 0.7, textAlign: "center" }}>{words.addPicture}</span>;
  if (g.layout === "filmstrip") {
    const height = typeof node.height === "number" ? node.height : 220;
    return (
      <span data-studio-gallery="filmstrip" style={{ display: "block" }}>
        <span style={{ display: "flex", gap, overflowX: "auto", scrollSnapType: "x mandatory", scrollbarWidth: "none" }}>{shown.map((image, i) => tile(image, i, { flex: "0 0 auto", width: height * 0.75, height, scrollSnapAlign: "start" }))}</span>
        {hint}
      </span>
    );
  }
  if (g.layout === "bento") {
    // Each four: a big tile over two rows beside two small ones, then a wide one.
    return (
      <span data-studio-gallery="bento" style={{ display: "block", containerType: "inline-size" }}>
        {/* Square small tiles, as the app draws them: a third of the width a row. */}
        <span style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gridAutoRows: `calc((100cqw - ${gap * 2}px) / 3)`, gridAutoFlow: "dense", gap }}>
          {shown.map((image, i) => tile(image, i, i % 4 === 0 ? { gridColumn: "span 2", gridRow: "span 2" } : i % 4 === 3 ? { gridColumn: "span 3" } : {}))}
        </span>
        {hint}
      </span>
    );
  }
  const columns = node.columns ?? 2;
  return (
    <span data-studio-gallery="masonry" style={{ display: "block" }}>
      <span style={{ display: "flex", gap, alignItems: "flex-start" }}>
        {Array.from({ length: columns }, (_, c) => (
          <span key={c} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap }}>
            {shown.map((image, i) => (i % columns === c ? tile(image, i, { width: "100%", aspectRatio: `${MASONRY_RATIOS[i % MASONRY_RATIOS.length]}` }) : null))}
          </span>
        ))}
      </span>
      {hint}
    </span>
  );
}

/**
 * 129.1 A bar of segments: `done` of them filled in the element's colour
 * (gold missing), the next one filled by `part`, the rest a quiet track;
 * from the start side. With `source: course` the app fills it from the
 * student's course (the canvas shows the owner's numbers).
 */
export function Segments({ node, dark, rtl }: { node: StudioNode; dark: boolean; rtl: boolean }) {
  const s = node.segments ?? {};
  const count = s.count ?? 5;
  const done = Math.min(s.done ?? 0, count);
  const color = (dark ? (node.dark_color ?? node.color) : node.color) ?? "#F5C451";
  // The track: the colour, faint, so it reads on a photo and on paper.
  const track = `${color}4D`;
  return (
    <span data-studio-segments="" aria-hidden="true" style={{ display: "flex", gap: node.gap ?? 4 }}>
      {Array.from({ length: count }, (_, i) => {
        const fill = i < done ? 1 : i === done ? (s.part ?? 0) : 0;
        return <span key={i} style={{ flex: "1 1 0", height: s.height ?? 3, borderRadius: 2, background: fill >= 1 ? color : fill > 0 ? `linear-gradient(${rtl ? 270 : 90}deg, ${color} ${fill * 100}%, ${track} ${fill * 100}%)` : track }} />;
      })}
    </span>
  );
}

/** An entry's text (a story's title, a photo's caption) in the language being edited. */
export function entryText(entry: { translations?: Translations } | null | undefined, field: string, lang: string, def: string): string {
  if (!entry) return "";
  const own = lang !== def ? entry.translations?.[lang as LanguageCode]?.[field] : undefined;
  if (typeof own === "string" && own.trim()) return own;
  const text = (entry as Record<string, unknown>)[field];
  return typeof text === "string" ? text : "";
}

/**
 * 129.2 A row of stories: round photos in a ring, the second colour into
 * the main one where a story is still to be seen, their titles under them;
 * in the app a tap opens them full screen.
 */
export function StoriesRow({ node, lang, defaultLang, dark, brand, accent }: { node: StudioNode; lang: string; defaultLang: string; dark: boolean; brand: string; accent?: string | null }) {
  const size = node.stories?.size ?? 68;
  const shades = dark ? ["#2A2742", "#33304F", "#3B3858"] : ["#F3E3C3", "#E8EEF6", "#F6E3E7"];
  return (
    <span data-studio-stories="" style={{ display: "flex", gap: 14, overflow: "hidden" }}>
      {(node.slides ?? []).map((story, i) => (
        <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: "0 0 auto", width: size + 8 }}>
          {/* 129.2 Its ring: lit until seen (the canvas shows it unseen), always lit, quiet, or dashed. */}
          <span
            data-studio-story-ring={story.ring ?? "auto"}
            style={{
              width: size + 8,
              height: size + 8,
              borderRadius: "50%",
              padding: story.ring === "dashed" ? 1 : 3,
              boxSizing: "border-box",
              ...(story.ring === "dashed"
                ? { border: `2px dashed ${dark ? "rgba(255,255,255,0.35)" : "#B9B2A3"}` }
                : { background: story.ring === "plain" ? (dark ? "#3B3858" : "#DDD8CC") : story.ring === "highlight" ? (story.ring_color ?? accent ?? "#F5B700") : story.ring_color ? story.ring_color : `linear-gradient(45deg, ${accent ?? "#F5B700"}, ${brand})` }),
            }}
          >
            <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", padding: story.ring === "dashed" ? 0 : 2.5, boxSizing: "border-box", background: dark ? "#14121F" : "#FFFFFF" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: story.color ?? (story.ring === "dashed" ? "transparent" : shades[i % 3]), color: story.color ? "#FFFFFF" : undefined }}>
                {story.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the owner's photo, drawn as the app draws it
                  <img src={story.image_url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : story.label ? (
                  <span style={{ fontWeight: 800, fontSize: size * 0.32 }}>{story.label}</span>
                ) : story.icon ? (
                  <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: size * 0.42 }}>
                    {story.icon}
                  </span>
                ) : null}
              </span>
            </span>
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 600, maxWidth: size + 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>{entryText(story, "heading", lang, defaultLang)}</span>
        </span>
      ))}
    </span>
  );
}
