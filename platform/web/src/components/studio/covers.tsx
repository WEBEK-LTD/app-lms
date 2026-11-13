import type { CSSProperties, ReactNode } from "react";
import type { StudioNode } from "@/lib/pages/types";
import { scrimCss } from "@/lib/studio/scrim";

/**
 * 128 The cover layouts as the app draws them (mobile/lib/modules/shared/
 * pages/studio_covers.dart): a photo under its shade (`photo_hero`, the
 * `scrim` any picture can have: lib/studio/scrim.ts)
 * or a drawn map with its markers and the person's dot (`map_header`), the
 * elements they hold laid out over it in a column, and their last element
 * hanging over the cover's foot when `overlap` is set (a card, a sheet).
 */

/** A #RRGGBB colour at a strength, for CSS. */
function alpha(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, opacity))})`;
}

/** The drawn map's colours by day and by night (the land is the element's background when it has one). */
export const MAP_COLORS = {
  light: { land: "#ECE8DF", water: "#BCD7E2", road: "#FFFFFF", park: "#D7E4CB" },
  dark: { land: "#151B2B", water: "#1F3550", road: "#262E44", park: "#1B2A26" },
} as const;

/** The default markers' colour and tile: taxi gold on navy. */
export const MAP_MARKER = { accent: "#F5B700", chip: "#1C2541" } as const;

/** The map, drawn in a 375 × 470 frame that covers the element: a river, four roads and two parks. */
function MapDrawing({ dark, land }: { dark: boolean; land: string | null }) {
  const c = dark ? MAP_COLORS.dark : MAP_COLORS.light;
  return (
    <svg aria-hidden="true" viewBox="0 0 375 470" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}>
      <rect x="0" y="0" width="375" height="470" fill={land ?? c.land} />
      <rect x="150" y="-40" width="70" height="560" fill={c.water} transform="rotate(18 185 240)" />
      <rect x="-20" y="120" width="420" height="12" fill={c.road} transform="rotate(-8 190 126)" />
      <rect x="-20" y="300" width="420" height="12" fill={c.road} transform="rotate(6 190 306)" />
      <rect x="70" y="-20" width="10" height="520" fill={c.road} />
      <rect x="290" y="-20" width="10" height="520" fill={c.road} />
      <rect x="40" y="190" width="80" height="70" rx="12" fill={c.park} />
      <rect x="240" y="30" width="90" height="60" rx="12" fill={c.park} />
    </svg>
  );
}

/** A marker: the icon in the accent colour on its tile, ringed in the accent. */
function Marker({ x, y, icon, accent, chip }: { x: number; y: number; icon: string; accent: string; chip: string }) {
  return (
    <span data-studio-map-marker="" style={{ position: "absolute", insetInlineStart: `${x}%`, top: `${y}%`, width: 34, height: 34, marginInlineStart: -17, marginTop: -17, borderRadius: 12, background: chip, border: `2px solid ${accent}`, boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: 18, color: accent, fontVariationSettings: "'FILL' 1" }}>
        {icon}
      </span>
    </span>
  );
}

/** The person's own dot, with its halo. */
function Me({ accent }: { accent: string }) {
  return (
    <span data-studio-map-me="" aria-hidden="true" style={{ position: "absolute", insetInlineStart: "50%", top: "56%", width: 56, height: 56, marginInlineStart: -28, marginTop: -28, borderRadius: 28, background: alpha(accent, 0.28), display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ width: 24, height: 24, borderRadius: 12, background: accent, border: "4px solid #FFFFFF", boxSizing: "border-box" }} />
    </span>
  );
}

/**
 * The cover and what it holds: `front` laid out over it (the element's own
 * padding, gap and alignment, down the cover), `last` under it, pulled up
 * by `overlap` so it hangs over the cover's foot.
 */
export function Cover({ node, dark, rtl, front, last }: { node: StudioNode; dark: boolean; rtl: boolean; front: ReactNode; last: ReactNode | null }) {
  const height = typeof node.height === "number" ? node.height : node.type === "map_header" ? 320 : 180;
  const radius: CSSProperties = node.corners
    ? { borderStartStartRadius: node.corners.top_start ?? 0, borderStartEndRadius: node.corners.top_end ?? 0, borderEndEndRadius: node.corners.bottom_end ?? 0, borderEndStartRadius: node.corners.bottom_start ?? 0 }
    : { borderRadius: node.radius };
  const background = (dark ? (node.dark_background ?? node.background) : node.background) ?? null;
  const pad = node.padding ?? {};
  const JUSTIFY: Record<string, CSSProperties["justifyContent"]> = { start: "flex-start", center: "center", end: "flex-end", between: "space-between", around: "space-around" };
  const ITEMS: Record<string, CSSProperties["alignItems"]> = { start: "flex-start", center: "center", end: "flex-end", stretch: "stretch" };
  const drawing = node.map_drawing ?? {};
  const accent = drawing.accent ?? MAP_MARKER.accent;
  return (
    // 128.10 The cover whole even under an element shorter than how far it hangs.
    <div data-studio-cover={node.type} style={{ display: "flex", flexDirection: "column", minHeight: height }}>
      <div style={{ position: "relative", height, overflow: "hidden", background: node.type === "photo_hero" ? (background ?? "#1F2A37") : undefined, boxShadow: undefined, ...radius }}>
        {node.type === "photo_hero" ? (
          <>
            {node.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- the owner's photo, drawn as the app draws it
              <img src={node.image_url} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            ) : null}
            {node.scrim ? <span aria-hidden="true" data-studio-scrim="" style={{ position: "absolute", inset: 0, background: scrimCss(node.scrim, rtl) }} /> : null}
          </>
        ) : (
          <>
            {/* 128.10 Its land: the element's background by day, its dark_background by night (missing, the dark map's own). */}
            <MapDrawing dark={dark} land={(dark ? node.dark_background : node.background) ?? null} />
            {(drawing.markers ?? []).map((m, i) => (
              <Marker key={i} x={m.x} y={m.y} icon={drawing.icon ?? "local_taxi"} accent={accent} chip={drawing.chip ?? MAP_MARKER.chip} />
            ))}
            {drawing.me ? <Me accent={accent} /> : null}
          </>
        )}
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
            gap: node.gap,
            justifyContent: JUSTIFY[node.align ?? "start"],
            alignItems: ITEMS[node.cross ?? "stretch"],
          }}
        >
          {front}
        </div>
      </div>
      {last ? <div style={{ position: "relative", zIndex: 1, marginTop: -(node.overlap ?? 0), display: "flex", flexDirection: "column" }}>{last}</div> : null}
    </div>
  );
}
