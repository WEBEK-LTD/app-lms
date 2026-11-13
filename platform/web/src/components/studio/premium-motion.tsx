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
[data-studio-ken-burns] [data-studio-cover] img, [data-studio-ken-burns] [data-studio-node] > img { animation: studio-ken-burns 8s ease-in-out infinite alternate; transform-origin: center; }
@keyframes studio-marquee { from { transform: translateX(var(--studio-marquee-from)); } to { transform: translateX(var(--studio-marquee-to)); } }
[data-studio-marquee-track] { animation: studio-marquee var(--studio-marquee-time) linear infinite; }
[data-studio-marquee="press"]:active [data-studio-marquee-track] { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  [data-studio-ken-burns] [data-studio-cover] img, [data-studio-ken-burns] [data-studio-node] > img { animation: none; }
  [data-studio-marquee-track] { animation: none; }
}
`;

export function PremiumMotionStyles() {
  return <style data-studio-premium-motion="">{PREMIUM_MOTION_CSS}</style>;
}

/** 129.1 Where a slider is: its dots in a frosted pill over its slides' foot, the first one open. */
export function SliderPill({ count }: { count: number }) {
  return (
    <span data-studio-indicator="pill" aria-hidden="true" style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5, padding: "7px 10px", borderRadius: 999, background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} style={{ width: i === 0 ? 18 : 6, height: 6, borderRadius: 3, background: i === 0 ? "#FFFFFF" : "rgba(255,255,255,0.55)" }} />
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
export function Marquee({ node, text, rtl, accent }: { node: StudioNode; text: string; rtl: boolean; accent?: string | null }) {
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
      <span key={`w${i}`} style={{ whiteSpace: "nowrap" }}>
        {word}
      </span>
    )),
    ...(node.images ?? []).map((image, i) => (
      // eslint-disable-next-line @next/next/no-img-element -- the owner's logo or photo, drawn as the app draws it
      <img key={`i${i}`} src={image.image_url} alt="" draggable={false} style={{ height: size, width: "auto", display: "block", borderRadius: 6 }} />
    )),
  ].flatMap((item, i) =>
    node.icon
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
    <span data-studio-marquee={m.pause_on_press === false ? "" : "press"} aria-label={words.join(", ")} style={{ display: "block", overflow: "hidden" }}>
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
          <span data-studio-story-ring="" style={{ width: size + 8, height: size + 8, borderRadius: "50%", padding: 3, boxSizing: "border-box", background: `linear-gradient(45deg, ${accent ?? "#F5B700"}, ${brand})` }}>
            <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", padding: 2.5, boxSizing: "border-box", background: dark ? "#14121F" : "#FFFFFF" }}>
              <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", background: shades[i % 3] }}>
                {story.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the owner's photo, drawn as the app draws it
                  <img src={story.image_url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
