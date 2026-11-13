import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { StudioMapDrawing, StudioNode, StudioPlace } from "@/lib/pages/types";
import {
  HORIZON,
  LENS,
  MAP_HEADINGS,
  NATURAL,
  TWO_INK,
  band,
  fitPath,
  horizonDepth,
  horizonPolygon,
  lensBox,
  mapPalette,
  markerLook,
  meSpot,
  mix,
  rgba,
  roundedLine,
  roundedRect,
  samplePath,
  splitRoute,
  type MapPalette,
} from "@/lib/studio/map-looks";

/**
 * 129.21–129.24 The drawn map's premium looks in the editor's phone, as the
 * app draws them (mobile/lib/modules/shared/pages/studio_map_looks.dart;
 * the shared numbers: lib/studio/map-looks.ts): a living map, a horizon in
 * perspective, two inks, a radar lens; labelled pins, words on the map, the
 * person's dot where it is put, and a route done solid and dashed ahead
 * with its vehicle. A live route or live taxis are the person's own in the
 * app; here the element's own sample. The sweep, the pulse and a moving
 * vehicle stop with reduced motion.
 */

/** The samples' words in the page's language (Arabic as the app writes it). */
const WORDS: Record<"en" | "ar" | "tr", { sign: string; minutes: (n: number) => string }> = {
  en: { sign: "TAXI", minutes: (n) => `${n} min` },
  ar: { sign: "تاكسي", minutes: (n) => `${n} د` },
  tr: { sign: "TAKSİ", minutes: (n) => `${n} dk` },
};

const ANIMATIONS = `
@keyframes ya-map-pulse { from { transform: scale(0.85); opacity: 1; } to { transform: scale(1.15); opacity: 0.4; } }
@keyframes ya-map-turn { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.ya-map-pulse { animation: ya-map-pulse 1.6s ease-in-out infinite alternate; }
.ya-map-turn { animation: ya-map-turn ${LENS.turnMs}ms linear infinite; }
@media (prefers-reduced-motion: reduce) { .ya-map-pulse, .ya-map-turn { animation: none !important; } }
`;

/** Whether the person asked for less motion. */
const REDUCED = "(prefers-reduced-motion: reduce)";
function useStill(): boolean {
  return useSyncExternalStore(
    (on) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
      const q = window.matchMedia(REDUCED);
      q.addEventListener?.("change", on);
      return () => q.removeEventListener?.("change", on);
    },
    () => (typeof window !== "undefined" && !!window.matchMedia ? window.matchMedia(REDUCED).matches : false),
    () => false,
  );
}

/** The element's size once drawn (its height and a phone's width before). */
function useBox(height: number) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState({ w: 375, h: height });
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const seen = () => setBox((b) => (b.w === el.clientWidth && b.h === el.clientHeight ? b : { w: el.clientWidth || 375, h: el.clientHeight || height }));
    seen();
    const o = new ResizeObserver(seen);
    o.observe(el);
    return () => o.disconnect();
  }, [height]);
  return { ref, w: box.w, h: box.h };
}

/** How far a moving vehicle has driven on (0 to 1 of the rest of its way), again and again. */
function useDrive(on: boolean): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!on) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      setT(((now - start) % LENS.turnMs) / LENS.turnMs);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [on]);
  return on ? t : 0;
}

const FILL: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" };
const ABS: CSSProperties = { position: "absolute" };
const ICON: CSSProperties = { fontVariationSettings: "'FILL' 1", lineHeight: 1 };

function Glyph({ name, size, color }: { name: string; size: number; color: string }) {
  return (
    <span className="material-symbols-rounded" aria-hidden="true" style={{ ...ICON, fontSize: size, color }}>
      {name}
    </span>
  );
}

/** A mirror for the drawing in right-to-left pages (what's placed on it is placed from the start). */
const mirror = (rtl: boolean, width: number) => (rtl ? `matrix(-1 0 0 1 ${width} 0)` : undefined);

function PlainGround({ p, rtl }: { p: MapPalette; rtl: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 375 470" preserveAspectRatio="xMidYMid slice" style={FILL}>
      <g transform={mirror(rtl, 375)}>
        <rect x="0" y="0" width="375" height="470" fill={p.land} />
        <rect x="150" y="-40" width="70" height="560" fill={p.water} transform="rotate(18 185 240)" />
        <rect x="-20" y="120" width="420" height="12" fill={p.road} transform="rotate(-8 190 126)" />
        <rect x="-20" y="300" width="420" height="12" fill={p.road} transform="rotate(6 190 306)" />
        <rect x="70" y="-20" width="10" height="520" fill={p.road} />
        <rect x="290" y="-20" width="10" height="520" fill={p.road} />
        <rect x="40" y="190" width="80" height="70" rx="12" fill={p.park} />
        <rect x="240" y="30" width="90" height="60" rx="12" fill={p.park} />
      </g>
    </svg>
  );
}

function NaturalGround({ p, rtl, w, h }: { p: MapPalette; rtl: boolean; w: number; h: number }) {
  const H = (h * 375) / w;
  const strokes = (list: readonly string[], color: string, width: number) => (
    <g stroke={color} strokeWidth={width} strokeLinecap="round" fill="none">
      {list.map((d, i) => (
        <path key={i} d={fitPath(d, H)} />
      ))}
    </g>
  );
  return (
    <svg aria-hidden="true" viewBox={`0 0 375 ${H}`} preserveAspectRatio="none" style={FILL}>
      <g transform={mirror(rtl, 375)}>
        <rect x="0" y="0" width="375" height={H} fill={p.land} />
        <path d={fitPath(NATURAL.water, H)} fill={p.water} />
        <path d={fitPath(NATURAL.island, H)} fill={p.land} />
        {NATURAL.parks.map(([x, y, pw, ph, r], i) => (
          <rect key={i} x={x} y={(y * H) / 1000} width={pw} height={(ph * H) / 1000} rx={r} fill={p.park} />
        ))}
        {strokes(NATURAL.streets, p.casing, 7)}
        {strokes(NATURAL.streets, p.road, 5)}
        {strokes(NATURAL.avenues, p.majorCasing, 13)}
        {strokes(NATURAL.avenues, p.major, 9)}
      </g>
    </svg>
  );
}

function TwoInkGround({ p, rtl, w, h, id }: { p: MapPalette; rtl: boolean; w: number; h: number; id: string }) {
  const H = (h * 375) / w;
  const [rx, ry, rr] = TWO_INK.roundabout;
  const cy = (ry * H) / 1000;
  return (
    <svg aria-hidden="true" viewBox={`0 0 375 ${H}`} preserveAspectRatio="none" style={FILL}>
      <defs>
        <pattern id={`${id}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill={p.land} />
          <rect width="1.6" height="6" fill={p.water} />
        </pattern>
        <pattern id={`${id}-dots`} width="5" height="5" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1.05" fill={p.park} />
        </pattern>
      </defs>
      <g transform={mirror(rtl, 375)}>
        <rect x="0" y="0" width="375" height={H} fill={p.land} />
        <path d={fitPath(TWO_INK.water, H)} fill={`url(#${id}-hatch)`} />
        <path d={fitPath(TWO_INK.shore, H)} stroke={p.road} strokeWidth="1.5" fill="none" />
        {TWO_INK.parks.map(([x, y, pw, ph, r], i) => (
          <rect key={i} x={x} y={(y * H) / 1000} width={pw} height={(ph * H) / 1000} rx={r} fill={`url(#${id}-dots)`} />
        ))}
        <g stroke={p.road} strokeWidth="2.2" strokeLinecap="round" fill="none">
          {TWO_INK.streets.map((d, i) => (
            <path key={i} d={fitPath(d, H)} />
          ))}
        </g>
        <g stroke={p.major} strokeWidth="6" strokeLinecap="round" fill="none">
          {TWO_INK.avenues.map((d, i) => (
            <path key={i} d={fitPath(d, H)} />
          ))}
        </g>
        <circle cx={rx} cy={cy} r={rr} fill={p.land} stroke={p.major} strokeWidth="5" />
        <circle cx={rx} cy={cy} r={rr / 2} fill={`url(#${id}-dots)`} />
      </g>
    </svg>
  );
}

function HorizonGround({ p, rtl, w, h }: { p: MapPalette; rtl: boolean; w: number; h: number }) {
  const H = (h * 375) / w;
  const poly = (pts: [number, number][]) => horizonPolygon(pts, H);
  const lines = (list: readonly string[], color: string, width: number) =>
    list.flatMap((d, i) => samplePath(d).map((pts, k) => <path key={`${i}-${k}`} d={poly(band(pts, width))} fill={color} />));
  return (
    <svg aria-hidden="true" viewBox={`0 0 375 ${H}`} preserveAspectRatio="none" style={FILL}>
      <g transform={mirror(rtl, 375)}>
        <rect x="0" y="0" width="375" height={H} fill={p.edge} />
        <path d={poly([[0, 0], [HORIZON.width, 0], [HORIZON.width, HORIZON.depth], [0, HORIZON.depth]])} fill={p.land} />
        {samplePath(HORIZON.water).map((pts, i) => (
          <path key={`w${i}`} d={poly(pts)} fill={p.water} />
        ))}
        {samplePath(HORIZON.island).map((pts, i) => (
          <path key={`i${i}`} d={poly(pts)} fill={p.land} />
        ))}
        {HORIZON.parks.map(([x, y, pw, ph, r], i) => (
          <path key={`p${i}`} d={poly(roundedRect(x, y, pw, ph, r))} fill={p.park} />
        ))}
        {lines(HORIZON.streets, p.casing, 12)}
        {lines(HORIZON.streets, p.road, 8)}
        {lines(HORIZON.avenues, p.majorCasing, 22)}
        {lines(HORIZON.avenues, p.major, 15)}
      </g>
    </svg>
  );
}

function LensGround({ p, rtl }: { p: MapPalette; rtl: boolean }) {
  const s = LENS.size;
  return (
    <svg aria-hidden="true" viewBox={`0 0 ${s} ${s}`} style={FILL}>
      <g transform={mirror(rtl, s)}>
        <rect x="0" y="0" width={s} height={s} fill={p.land} />
        <path d={LENS.river} fill={p.water} />
        <rect x={LENS.park[0]} y={LENS.park[1]} width={LENS.park[2]} height={LENS.park[3]} rx={LENS.park[4]} fill={p.park} />
        <g stroke={p.road} strokeWidth="2" strokeLinecap="round" fill="none">
          {LENS.streets.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g stroke={p.major} strokeWidth="5" strokeLinecap="round" fill="none">
          {LENS.avenues.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      </g>
    </svg>
  );
}

/** A marker in its look, its middle at (x, y) in pixels. */
function MarkerAt({ x, y, i, look, drawing, dark, accent, chip, p, sign, depth }: { x: number; y: number; i: number; look: string; drawing: StudioMapDrawing; dark: boolean; accent: string; chip: string; p: MapPalette; sign: string; depth: number }) {
  const heading = MAP_HEADINGS[i % MAP_HEADINGS.length]!;
  const at = (w: number, h: number): CSSProperties => ({ ...ABS, left: x - w / 2, top: y - h / 2, width: w, height: h, boxSizing: "border-box" });
  if (look === "car") {
    const body = dark ? mix(chip, "#FFFFFF", 0.8) : chip;
    const glass = dark ? chip : mix(chip, "#FFFFFF", 0.65);
    // On the horizon a car lies on the tilted ground: flatter and smaller further away.
    const flat = drawing.style === "horizon" ? ` scale(${depth}, ${depth * 0.55})` : "";
    return (
      <span data-studio-map-marker="" aria-hidden="true" style={{ ...at(15, 27), borderRadius: 6, background: body, transform: `${flat} rotate(${heading}deg)`, boxShadow: "0 3px 6px rgba(0, 0, 0, 0.25)" }}>
        <span style={{ ...ABS, left: 3, right: 3, top: 5, height: 6, borderRadius: 2, background: glass }} />
        <span style={{ ...ABS, left: 3, right: 3, bottom: 4, height: 3, borderRadius: 1, background: glass, opacity: 0.7 }} />
      </span>
    );
  }
  if (look === "sign") {
    return (
      <span data-studio-map-marker="" aria-hidden="true" style={{ ...at(34, 20), borderRadius: "9px 9px 4px 4px", background: dark ? accent : chip, color: dark ? chip : accent, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 3px 0 ${dark ? "rgba(0, 0, 0, 0.45)" : rgba(chip, 0.25)}`, whiteSpace: "nowrap", overflow: "hidden" }}>
        {sign}
      </span>
    );
  }
  if (look === "token") {
    return (
      <>
        <span aria-hidden="true" style={{ ...ABS, left: x - 34, top: y - 2, width: 34, height: 4, borderRadius: 2, background: `linear-gradient(90deg, ${rgba(accent, 0)}, ${rgba(accent, 0.75)})`, transformOrigin: "100% 50%", transform: `rotate(${heading}deg)` }} />
        <span data-studio-map-marker="" aria-hidden="true" style={{ ...at(26, 26), borderRadius: 13, background: accent, border: `2px solid ${p.edge}`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 10px rgba(0, 0, 0, 0.22)" }}>
          <Glyph name={drawing.icon ?? "local_taxi"} size={14} color={chip} />
        </span>
      </>
    );
  }
  return (
    <span data-studio-map-marker="" aria-hidden="true" style={{ ...at(34, 34), borderRadius: 12, background: chip, border: `2px solid ${accent}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Glyph name={drawing.icon ?? "local_taxi"} size={18} color={accent} />
    </span>
  );
}

/** The person's own dot in the style's look. */
function MeAt({ x, y, style, dark, ink, accent, chip, p }: { x: number; y: number; style: StudioMapDrawing["style"]; dark: boolean; ink: string; accent: string; chip: string; p: MapPalette }) {
  const round = (d: number, extra: CSSProperties = {}): CSSProperties => ({ ...ABS, left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: d / 2, boxSizing: "border-box", ...extra });
  const oval = (w: number, h: number, extra: CSSProperties = {}): CSSProperties => ({ ...ABS, left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: "50%", ...extra });
  let parts: ReactNode;
  switch (style) {
    case "natural":
      parts = (
        <>
          <span className="ya-map-pulse" style={round(80, { background: rgba(ink, 0.14) })} />
          <span style={round(44, { background: rgba(ink, 0.14) })} />
          <span style={round(22, { background: ink, border: `4px solid ${dark ? "#04201D" : "#FFFFFF"}`, boxShadow: "0 4px 10px rgba(0, 0, 0, 0.25)" })} />
        </>
      );
      break;
    case "horizon":
      parts = (
        <>
          <span className="ya-map-pulse" style={oval(110, 36, { background: rgba(ink, 0.16) })} />
          <span style={oval(54, 18, { background: rgba(ink, 0.16) })} />
          <span style={oval(16, 10, { background: ink })} />
        </>
      );
      break;
    case "two_ink":
      parts = (
        <>
          <span style={round(64, { border: `2px solid ${p.major}`, opacity: 0.35 })} />
          <span style={round(32, { background: dark ? "#F1F2F7" : "#FFFFFF", border: `6px solid ${dark ? accent : chip}`, boxShadow: "0 6px 14px rgba(0, 0, 0, 0.25)" })} />
        </>
      );
      break;
    case "lens":
      parts = (
        <>
          <span className="ya-map-pulse" style={round(36, { background: dark ? rgba(accent, 0.2) : rgba(chip, 0.16) })} />
          <span style={round(20, { background: dark ? "#F1F2F7" : chip, border: `4px solid ${dark ? accent : "#FFFFFF"}` })} />
        </>
      );
      break;
    default:
      parts = (
        <>
          <span style={round(56, { background: rgba(accent, 0.28) })} />
          <span style={round(24, { background: accent, border: "4px solid #FFFFFF" })} />
        </>
      );
  }
  return (
    <span data-studio-map-me="" aria-hidden="true">
      {parts}
    </span>
  );
}

/** A chip of words with its middle over (x, y). */
function Chip({ x, y, text, dark, dot }: { x: number; y: number; text: string; dark: boolean; dot?: string }) {
  return (
    <span style={{ ...ABS, left: x, top: y, transform: "translate(-50%, -100%)", height: 26, padding: "0 10px", borderRadius: 13, background: dark ? "#15243A" : "#FFFFFF", color: dark ? "#EAF1F8" : "#0D1B2A", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", maxWidth: 170, overflow: "hidden", textOverflow: "ellipsis", boxShadow: dark ? "0 6px 16px -6px rgba(0, 0, 0, 0.6)" : "0 6px 16px -6px rgba(13, 27, 42, 0.3)" }}>
      {dot ? <span style={{ width: 6, height: 6, borderRadius: 3, background: dot, flexShrink: 0 }} /> : null}
      {text}
    </span>
  );
}

/** A pin standing on the horizon: a chip on a stem over its shadow, its foot at (x, y). */
function Standing({ x, y, stem, bg, ink, dot, icon, text, depth }: { x: number; y: number; stem: number; bg: string; ink: string; dot?: string; icon?: string; text: string; depth: number }) {
  return (
    <>
      <span aria-hidden="true" style={{ ...ABS, left: x - 18 * depth, top: y - 7 * depth, width: 36 * depth, height: 14 * depth, borderRadius: "50%", background: rgba(bg.startsWith("#") ? bg : "#000000", 0.4) }} />
      <span aria-hidden="true" style={{ ...ABS, left: x - 1, top: y - stem, width: 2, height: stem, background: bg }} />
      <span style={{ ...ABS, left: x, top: y - stem, transform: "translate(-50%, -100%)", height: 32, padding: icon ? "0 11px 0 8px" : "0 12px", borderRadius: 16, background: bg, color: ink, display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", boxShadow: "0 8px 18px rgba(0, 0, 0, 0.22)" }}>
        {icon ? <Glyph name={icon} size={17} color={ink} /> : dot ? <span style={{ width: 7, height: 7, borderRadius: 4, background: dot }} /> : null}
        {text}
      </span>
    </>
  );
}

/** The vehicle on a route, where it is, in the style's look. */
function Vehicle({ x, y, heading, style, dark, accent, chip, ink, p, icon, photo, eta, rtl, sign, depth }: { x: number; y: number; heading: number; style: StudioMapDrawing["style"]; dark: boolean; accent: string; chip: string; ink: string; p: MapPalette; icon: string; photo: string | null; eta: string | null; rtl: boolean; sign: string; depth: number }) {
  if (style === "horizon")
    return (
      <span data-studio-map-vehicle="">
        <Standing x={x} y={y} stem={40} bg={accent} ink={mix(accent, "#000000", 0.8)} icon={icon} text={eta ?? ""} depth={depth} />
      </span>
    );
  const round = (d: number, extra: CSSProperties = {}): CSSProperties => ({ ...ABS, left: x - d / 2, top: y - d / 2, width: d, height: d, borderRadius: d / 2, boxSizing: "border-box", ...extra });
  let body: ReactNode;
  if (style === "natural") {
    body = (
      <>
        <span className="ya-map-pulse" style={round(48, { background: rgba(accent, 0.26) })} />
        <span style={{ ...ABS, left: x - 9.5, top: y - 16.5, width: 19, height: 33, borderRadius: 7, background: accent, transform: `rotate(${heading + 90}deg)`, boxShadow: "0 0 0 2px #FFFFFF, 0 6px 14px rgba(0, 0, 0, 0.3)" }}>
          <span style={{ ...ABS, left: 3, right: 3, top: 6, height: 7, borderRadius: 2, background: mix(accent, "#000000", 0.62) }} />
        </span>
      </>
    );
  } else if (style === "two_ink") {
    body = (
      <>
        <span className="ya-map-pulse" style={{ ...ABS, left: x - 33, top: y - 25, width: 66, height: 50, borderRadius: 20, background: rgba(p.major, 0.14) }} />
        <span style={{ ...ABS, left: x - 21, top: y - 12, width: 42, height: 24, borderRadius: "11px 11px 5px 5px", background: dark ? accent : chip, color: dark ? chip : accent, fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 2px ${p.land}, 0 0 0 4px ${dark ? accent : chip}`, whiteSpace: "nowrap", overflow: "hidden" }}>{sign}</span>
      </>
    );
  } else {
    body = (
      <>
        <span className="ya-map-pulse" style={round(84, { background: rgba(ink, 0.14) })} />
        <span style={round(56, { background: rgba(ink, 0.14) })} />
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- the element's own photo of the driver or courier, as the app draws it
          <img src={photo} alt="" style={{ ...round(40), objectFit: "cover", border: "3px solid #FFFFFF", boxShadow: "0 8px 18px rgba(0, 0, 0, 0.35)" }} />
        ) : (
          <span style={round(40, { background: accent, border: "3px solid #FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 18px rgba(0, 0, 0, 0.35)" })}>
            <Glyph name={icon} size={20} color={chip} />
          </span>
        )}
      </>
    );
  }
  return (
    <span data-studio-map-vehicle="">
      {body}
      {eta ? (
        <span style={{ ...ABS, ...(style === "two_ink" ? { left: x, top: y - 20, transform: "translate(-50%, -100%)" } : { left: rtl ? x + 30 : x - 30, top: y, transform: rtl ? "translate(0, -50%)" : "translate(-100%, -50%)" }), height: 28, padding: "0 10px", borderRadius: 14, background: dark ? "#F2F6FA" : "#0D1B2A", color: dark ? "#0D1B2A" : "#FFFFFF", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", boxShadow: "0 6px 16px -6px rgba(13, 27, 42, 0.4)" }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: accent }} />
          {eta}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The map in its look and what is on it, over the element's whole box (a
 * lens: a circle at its foot).
 */
export function MapLooks({ node, dark, rtl, lang }: { node: StudioNode; dark: boolean; rtl: boolean; lang: string }) {
  const drawing: StudioMapDrawing = node.map_drawing ?? {};
  const height = typeof node.height === "number" ? node.height : 320;
  const { ref, w, h } = useBox(height);
  const still = useStill();
  const words = WORDS[(lang as "en" | "ar" | "tr") in WORDS ? (lang as "en" | "ar" | "tr") : "en"];
  const accent = drawing.accent ?? "#F5B700";
  const chip = drawing.chip ?? "#1C2541";
  const style = drawing.style ?? null;
  const p = mapPalette(style, dark, accent, chip, (dark ? node.dark_background : node.background) ?? null);
  const route = drawing.route ?? null;
  const ink = (dark ? (route?.dark_color ?? route?.color) : route?.color) ?? accent;
  const drive = useDrive(!!route?.moving && !still);
  const sign = drawing.sign ?? words.sign;
  const look = markerLook(drawing);
  // Where things on the map are: the lens's box for a lens, else the element's.
  const lens = style === "lens" ? lensBox(w, h) : null;
  const area = lens ? { left: lens.left, top: lens.top, w: lens.size, h: lens.size } : { left: 0, top: 0, w, h };
  const px = (at: StudioPlace) => ({ x: area.left + ((rtl ? 100 - at.x : at.x) / 100) * area.w, y: area.top + (at.y / 100) * area.h });
  const depthAt = (y: number) => (style === "horizon" ? Math.max(0.4, Math.min(1, horizonDepth((y * 375) / w, (h * 375) / w))) : 1);
  const me = px(meSpot(drawing));

  let ground: ReactNode;
  switch (style) {
    case "natural":
      ground = <NaturalGround p={p} rtl={rtl} w={w} h={h} />;
      break;
    case "horizon":
      ground = <HorizonGround p={p} rtl={rtl} w={w} h={h} />;
      break;
    case "two_ink":
      ground = <TwoInkGround p={p} rtl={rtl} w={w} h={h} id={`ya-map-${node.id}`} />;
      break;
    case "lens":
      ground = null;
      break;
    default:
      ground = <PlainGround p={p} rtl={rtl} />;
  }

  const lensParts = lens ? (
    <div aria-hidden="true" style={{ ...ABS, left: lens.left, top: lens.top, width: lens.size, height: lens.size, borderRadius: "50%", overflow: "hidden", boxShadow: dark ? `0 0 0 1px ${rgba(accent, 0.18)}, 0 0 0 10px ${rgba(accent, 0.04)}, 0 0 60px ${rgba(accent, 0.1)}` : `0 0 0 1px ${rgba(chip, 0.1)}, 0 0 0 10px ${rgba(chip, 0.04)}, 0 24px 48px ${rgba(chip, 0.16)}` }}>
      <LensGround p={p} rtl={rtl} />
      <div className="ya-map-turn" style={{ ...ABS, inset: 0 }}>
        <div style={{ ...ABS, inset: 0, background: `conic-gradient(from ${LENS.sweepAt}deg, ${rgba(accent, 0)} 0deg, ${rgba(accent, 0)} 290deg, ${rgba(accent, dark ? 0.26 : 0.34)} 360deg)` }} />
        <span style={{ ...ABS, left: lens.size / 2 - 1, top: lens.size / 2 - (146 / 320) * lens.size, width: 2, height: (146 / 320) * lens.size, background: `linear-gradient(0deg, ${rgba(accent, 0.9)}, ${rgba(accent, 0)})`, transformOrigin: "50% 100%", transform: `rotate(${LENS.sweepAt}deg)` }} />
      </div>
      <svg viewBox={`0 0 ${LENS.size} ${LENS.size}`} style={FILL}>
        {LENS.rings.map(([r]) => (
          <circle key={r} cx={LENS.size / 2} cy={LENS.size / 2} r={r} fill="none" stroke={dark ? rgba(accent, 0.34) : rgba(chip, 0.32)} strokeWidth={320 / lens.size} strokeDasharray="4 4" />
        ))}
      </svg>
    </div>
  ) : null;
  const ringTags = lens
    ? LENS.rings.map(([r, n]) => (
        <span key={n} style={{ ...ABS, left: lens.left + lens.size / 2, top: lens.top + lens.size / 2 - (r / 320) * lens.size, transform: "translate(-50%, -50%)", height: 18, padding: "0 8px", borderRadius: 9, background: dark ? chip : "#FFFFFF", color: dark ? accent : chip, fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
          {words.minutes(n)}
        </span>
      ))
    : null;

  // The route: the part done solid, the rest dashed (on a living map and the horizon, solid with a dotted middle).
  let routeParts: ReactNode = null;
  if (route && route.points.length >= 2) {
    const share = Math.min(1, ((route.at ?? 0) + (100 - (route.at ?? 0)) * drive) / 100);
    const cut = splitRoute(route.points, share);
    const line = (list: StudioPlace[]) => roundedLine(list.map((at) => { const q = px(at); return [q.x, q.y] as [number, number]; }));
    const dotted = style === "natural" || style === "horizon";
    const start = px(route.points[0]!);
    const end = px(route.points[route.points.length - 1]!);
    const vehicle = px(cut.at);
    const heading = rtl ? 180 - cut.at.heading : cut.at.heading;
    const meEnd = drawing.me && Math.hypot(end.x - me.x, end.y - me.y) < 12;
    routeParts = (
      <>
        <svg aria-hidden="true" viewBox={`0 0 ${w} ${h}`} style={FILL}>
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={line(cut.done)} stroke={rgba(ink, 0.22)} strokeWidth={16} />
            <path d={line(cut.done)} stroke={ink} strokeWidth={5} />
            {dotted ? (
              <>
                <path d={line(cut.ahead)} stroke={rgba(ink, 0.22)} strokeWidth={16} />
                <path d={line(cut.ahead)} stroke={ink} strokeWidth={5} />
                <path d={line(cut.ahead)} stroke={dark ? "rgba(4, 32, 29, 0.9)" : "rgba(255, 255, 255, 0.9)"} strokeWidth={1.5} strokeDasharray="2 6" />
              </>
            ) : (
              <path d={line(cut.ahead)} stroke={ink} strokeWidth={5} strokeDasharray="10 7" strokeLinecap="butt" opacity={0.8} />
            )}
          </g>
        </svg>
        {style === "horizon" ? null : (
          <span aria-hidden="true" style={{ ...ABS, left: start.x - 12, top: start.y - 12, width: 24, height: 24, borderRadius: 12, background: ink, boxShadow: `0 0 0 4px ${dark ? "rgba(8, 17, 28, 0.9)" : "rgba(255, 255, 255, 0.9)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: "#FFFFFF" }} />
          </span>
        )}
        {meEnd || style === "horizon" ? null : (
          <span aria-hidden="true" data-studio-map-end="" style={{ ...ABS, left: end.x - 20, top: end.y - 38, width: 40, height: 40, display: "flex", justifyContent: "center", filter: "drop-shadow(0 6px 8px rgba(0, 0, 0, 0.3))" }}>
            <Glyph name="location_on" size={40} color={accent} />
          </span>
        )}
        {route.from_label ? style === "horizon" ? <Standing x={start.x} y={start.y} stem={28} bg={p.glass} ink={p.ink} dot={p.pin} text={route.from_label} depth={depthAt(start.y)} /> : <Chip x={start.x} y={start.y - 18} text={route.from_label} dark={dark} /> : null}
        {route.to_label ? style === "horizon" ? <Standing x={end.x} y={end.y} stem={28} bg={p.glass} ink={p.ink} dot={p.pin} text={route.to_label} depth={depthAt(end.y)} /> : <Chip x={end.x} y={end.y - (meEnd ? 22 : 44)} text={route.to_label} dark={dark} /> : null}
        <Vehicle x={vehicle.x} y={vehicle.y} heading={heading} style={style} dark={dark} accent={accent} chip={chip} ink={ink} p={p} icon={route.icon ?? drawing.icon ?? "local_taxi"} photo={node.image_url ?? null} eta={route.eta ?? null} rtl={rtl} sign={sign} depth={depthAt(vehicle.y)} />
      </>
    );
  }

  const labelStyle = (y: number): CSSProperties => {
    const size = style === "horizon" ? Math.round(11 + 11 * ((depthAt(y) - 0.4) / 0.6)) : 10;
    return { fontSize: size, fontWeight: style === "lens" ? 700 : 800, letterSpacing: rtl ? 0 : style === "lens" ? "0.3em" : "0.24em", textTransform: "uppercase", color: p.label, whiteSpace: "nowrap", lineHeight: 1 };
  };

  return (
    <div ref={ref} data-studio-map-style={style ?? "plain"} style={{ ...ABS, inset: 0, overflow: "hidden" }}>
      <style>{ANIMATIONS}</style>
      {ground}
      {style === "natural" ? <span aria-hidden="true" style={{ ...ABS, inset: 0, background: `radial-gradient(circle ${Math.round(Math.hypot(0.55 * w, 0.58 * h))}px at 45% 42%, ${p.edge.replace(/[\d.]+\)$/, "0)")} 55%, ${p.edge} 100%)` }} /> : null}
      {style === "horizon" ? <span aria-hidden="true" style={{ ...ABS, inset: 0, background: `linear-gradient(180deg, ${p.edge} 0%, ${rgba(p.edge, 0.94)} 24%, ${rgba(p.edge, 0)} 60%)` }} /> : null}
      {style === "two_ink" ? <span aria-hidden="true" style={{ ...ABS, left: 0, right: 0, bottom: 0, height: TWO_INK.band, background: `repeating-conic-gradient(${chip} 0% 25%, ${accent} 0% 50%) 0 0 / ${TWO_INK.square * 2}px ${TWO_INK.square * 2}px` }} /> : null}
      {lensParts}
      {(drawing.labels ?? []).map((l, i) => {
        const at = px(l);
        return (
          <span key={`l${i}`} data-studio-map-label="" style={{ ...ABS, left: at.x, top: at.y, transform: rtl ? "translate(-100%, -50%)" : "translate(0, -50%)", ...labelStyle(at.y) }}>
            {l.text}
          </span>
        );
      })}
      {ringTags}
      {routeParts}
      {(drawing.markers ?? []).map((m, i) => {
        const at = px(m);
        return <MarkerAt key={`m${i}`} x={at.x} y={at.y} i={i} look={look} drawing={drawing} dark={dark} accent={accent} chip={chip} p={p} sign={sign} depth={depthAt(at.y)} />;
      })}
      {drawing.me ? <MeAt x={me.x} y={me.y} style={style} dark={dark} ink={ink} accent={accent} chip={chip} p={p} /> : null}
      {(drawing.places ?? []).map((pin, i) => {
        const at = px(pin);
        if (style === "horizon") return <Standing key={`p${i}`} x={at.x} y={at.y} stem={24} bg={p.glass} ink={p.ink} dot={p.pin} text={pin.label} depth={depthAt(at.y)} />;
        return (
          <span key={`p${i}`} data-studio-map-place="" style={{ ...ABS, left: rtl ? at.x + 17 : at.x - 17, top: at.y - 17, transform: rtl ? "translateX(-100%)" : undefined, height: 34, boxSizing: "border-box", paddingInlineStart: 4, paddingInlineEnd: 12, borderRadius: 17, display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: p.ink, background: p.glass, border: `1px solid ${p.glassEdge}`, whiteSpace: "nowrap", boxShadow: dark ? "0 16px 40px rgba(0, 0, 0, 0.5)" : "0 14px 34px rgba(11, 36, 34, 0.16)" }}>
            <span style={{ width: 26, height: 26, borderRadius: 13, background: p.pin, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Glyph name={pin.icon ?? "place"} size={16} color={p.pinInk} />
            </span>
            {pin.label}
          </span>
        );
      })}
    </div>
  );
}

/** Whether the map has more than the plain drawing of 128 (one of 129's looks or what goes on them). */
export function hasMapLooks(drawing: StudioMapDrawing | null | undefined): boolean {
  if (!drawing) return false;
  return !!(drawing.style || drawing.marker || drawing.sign || drawing.me_at || drawing.places?.length || drawing.labels?.length || drawing.route);
}
