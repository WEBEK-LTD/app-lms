import type { CSSProperties } from "react";
import type { LanguageCode, StudioNode, StudioSurface } from "@/lib/pages/types";
import { mirrored } from "../mirrored";

/**
 * 129.11–129.20 What the premium elements share on the canvas, as the app
 * draws them (mobile/lib/modules/shared/pages/premium/): their colours by
 * day and by night, an icon, and the editor's words for what only the
 * editor shows (an empty price, a missing label).
 */

export interface PremiumWords {
  setPrice: string;
  monthly: string;
  yearly: string;
  perMonth: string;
  perYear: string;
  popular: string;
  addLabel: string;
  reviewsNote: string;
}

export const PREMIUM_WORDS_EN: PremiumWords = {
  setPrice: "Set a price",
  monthly: "Monthly",
  yearly: "Yearly",
  perMonth: "/ month",
  perYear: "/ year",
  popular: "Most popular",
  addLabel: "Add a label or a price",
  reviewsNote: "In the app, its real reviews",
};

export interface PremiumProps {
  node: StudioNode;
  lang: LanguageCode;
  defaultLang: LanguageCode;
  dark: boolean;
  brand: string;
  accent: string | null | undefined;
  /** The element's own text colour, by day or night. */
  color: string | undefined;
  words: PremiumWords;
  /** Drawn in the editor: what only the owner sees (empty prices) shows. */
  editing: boolean;
}

/** A #RRGGBB colour at a strength. */
export function alpha(hex: string, opacity: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, opacity))})`;
}

/** The premium cards' colours: their surface, edge, words and quieter words. */
export function tones(dark: boolean) {
  return dark
    ? { card: "#1D1B2C", edge: "rgba(255,255,255,0.09)", ink: "#F4EFE6", muted: "#B7B3C9", track: "rgba(255,255,255,0.12)", gold: "#F0C063" }
    : { card: "#FFFFFF", edge: "rgba(14,13,36,0.08)", ink: "#0E0D24", muted: "#5E5B70", track: "rgba(14,13,36,0.08)", gold: "#E8B04B" };
}

/** A soft, wide shadow for the premium cards. */
export const CARD_SHADOW = "0 10px 28px rgba(14,13,36,0.08)";

/** An icon; `rtl`, one that points along the reading direction mirrored, as the app's (../mirrored.ts). */
export function Icon({ name, size = 20, fill = false, color, style, rtl = false }: { name: string; size?: number; fill?: boolean; color?: string; style?: CSSProperties; rtl?: boolean }) {
  return (
    <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: size, lineHeight: 1, color, fontVariationSettings: fill ? "'FILL' 1" : undefined, flex: "none", ...mirrored(name, rtl), ...style }}>
      {name}
    </span>
  );
}

/** An empty spot only the editor shows (a price to fill). */
export function Placeholder({ text, color }: { text: string; color: string }) {
  return (
    <span data-studio-premium-placeholder="" style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1.5px dashed ${color}`, borderRadius: 10, padding: "4px 10px", fontSize: 13, fontWeight: 700, color }}>
      <Icon name="edit" size={16} />
      {text}
    </span>
  );
}

/**
 * 129.18 A layout's premium card style as CSS: frosted glass over what is
 * behind it, a border in two colours, a glow inside its edge, soft shadows.
 */
export function surfaceStyle(s: StudioSurface, dark: boolean, background: string | undefined, rtl = false): CSSProperties {
  const out: CSSProperties = {};
  const tint = s.tint ?? 0.18;
  const fill = s.glass !== undefined ? (dark ? `rgba(18,16,30,${Math.min(0.95, tint + 0.25)})` : `rgba(255,255,255,${tint})`) : background;
  if (s.glass !== undefined) {
    out.backdropFilter = `blur(${s.glass}px) saturate(160%)`;
    out.WebkitBackdropFilter = out.backdropFilter;
    out.background = fill;
  }
  if (s.border && s.glass !== undefined) {
    // Under see-through glass a gradient behind it would show through: its edge in the border's colours instead.
    out.border = `${s.border.width ?? 1.5}px solid ${alpha(s.border.from, 0.6)}`;
    out.borderBottomColor = alpha(s.border.to, 0.6);
    out.borderInlineEndColor = alpha(s.border.to, 0.6);
  } else if (s.border) {
    const inner = fill ?? (dark ? "#16141F" : "#FFFFFF");
    out.border = `${s.border.width ?? 1.5}px solid transparent`;
    out.background = `linear-gradient(${inner}, ${inner}) padding-box, linear-gradient(135deg, ${s.border.from}, ${s.border.to}) border-box`;
  }
  const shadows: string[] = [];
  if (s.soft) shadows.push(["0 4px 12px rgba(14,13,36,0.06)", "0 10px 28px rgba(14,13,36,0.10)", "0 18px 48px rgba(14,13,36,0.14)"][s.soft - 1]!);
  if (s.glow) shadows.push(`inset 0 0 0 1px ${alpha(s.glow, 0.35)}`, `inset 0 1px 22px ${alpha(s.glow, 0.32)}`);
  if (shadows.length) out.boxShadow = shadows.join(", ");
  // 129 A ticket: a notch cut from each edge where it is perforated.
  if (s.ticket) {
    const n = s.ticket.notch ?? 10;
    // Down a ticket, the perforation is that far from its start side.
    const at = s.ticket.axis === "vertical" && rtl ? 100 - s.ticket.at : s.ticket.at;
    const hole = (where: string) => `radial-gradient(circle at ${where}, transparent ${n}px, #000 ${n + 0.5}px)`;
    const mask =
      s.ticket.axis === "vertical"
        ? `${hole(`${at}% 0`)} top / 100% 51% no-repeat, ${hole(`${at}% 100%`)} bottom / 100% 51% no-repeat`
        : `${hole(`0 ${at}%`)} left / 51% 100% no-repeat, ${hole(`100% ${at}%`)} right / 51% 100% no-repeat`;
    out.mask = mask;
    out.WebkitMask = mask;
  }
  return out;
}

/** 129 Grain as an SVG noise, drawn once. */
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/></filter><rect width="160" height="160" filter="url(#g)"/></svg>')}")`;

/**
 * 129 What a premium card style draws over the layout without taking room:
 * a ticket's dashed perforation, and a texture (grain, a dot grid, a square
 * grid, stripes) in the text's colour.
 */
export function SurfaceExtras({ s, dark }: { s: StudioSurface; dark: boolean }) {
  const ink = dark ? "#FFFFFF" : "#0E0D24";
  const strength = s.pattern_strength ?? 0.08;
  const line = alpha(ink, 0.22);
  const n = s.ticket?.notch ?? 10;
  const background: Record<string, string> = {
    dots: `radial-gradient(${alpha(ink, strength * 2)} 1px, transparent 1.3px) 0 0 / 12px 12px`,
    grid: `linear-gradient(${alpha(ink, strength)} 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, ${alpha(ink, strength)} 1px, transparent 1px) 0 0 / 24px 24px`,
    stripes: `repeating-linear-gradient(135deg, ${alpha(ink, strength * 1.5)} 0 1.5px, transparent 1.5px 9px)`,
    grain: `${GRAIN} 0 0 / 160px 160px`,
  };
  return (
    <>
      {s.pattern ? <span aria-hidden="true" data-studio-pattern={s.pattern} style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none", background: background[s.pattern], opacity: s.pattern === "grain" ? strength * 2.5 : 1 }} /> : null}
      {s.ticket ? (
        <span
          aria-hidden="true"
          data-studio-ticket={s.ticket.axis ?? "horizontal"}
          style={
            s.ticket.axis === "vertical"
              ? { position: "absolute", insetInlineStart: `${s.ticket.at}%`, top: n + 4, bottom: n + 4, borderInlineStart: `1.5px dashed ${line}`, pointerEvents: "none" }
              : { position: "absolute", top: `${s.ticket.at}%`, insetInline: n + 4, borderTop: `1.5px dashed ${line}`, pointerEvents: "none" }
          }
        />
      ) : null}
    </>
  );
}
