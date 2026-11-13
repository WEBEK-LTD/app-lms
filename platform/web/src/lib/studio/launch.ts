import { defaultLaunchBackground, LAUNCH_DEFAULT_BACKGROUND, LAUNCH_DEFAULT_OVERLAY, type LaunchBackground, type LaunchDirection, type LaunchLook } from "./screens";

/**
 * 124.15 The launch screen's colours, as the app works them out
 * (mobile/lib/core/launch/launch_colors.dart does the same): the
 * background in light or dark, what the words are drawn in on it, and the
 * second colour made lighter where it sits on a dark background.
 */

/** The app's own light and dark page colours and words (its palette). */
export const LAUNCH_NEUTRALS = {
  light: { page: "#F4EFE6", ink: "#0E0D24", muted: "#5E5B70" },
  dark: { page: "#0B0A1C", card: "#17162E", ink: "#F4EFE6", muted: "#B9B5CA" },
} as const;

/** The app's accent when the project has no second colour. */
export const LAUNCH_SECOND_FALLBACK = "#FF5A1F";

export type LaunchFill = { kind: "color"; color: string } | { kind: "gradient"; from: string; to: string; direction: LaunchDirection } | { kind: "photo"; url: string; overlay: number };

export interface LaunchColors {
  dark: boolean;
  main: string;
  second: string;
  /** What fills the screen. */
  screen: LaunchFill;
  /** Cinema's and Editorial's picture (the photo, or the gradient until there is one); the words are then on the page colour. */
  picture: LaunchFill | null;
  /** The colour the words sit on. */
  surface: string;
  /** Light words on it. */
  onDark: boolean;
  text: string;
  muted: string;
  /** The second colour, lighter on a dark background. */
  accent: string;
  /** The loading sign's track. */
  track: string;
  /** The logo's tile: the main colour, the dark card, or glass over a coloured background. */
  tile: "brand" | "card" | "glass";
  /** The initials on the tile: the second colour, lighter on a dark one. */
  onTile: string;
}

/** The second colour on a tile of the main colour: lighter when the tile is dark, else as it is, else the words' colour. */
function onBrand(main: string, second: string): string {
  const light = glow(second);
  if (contrast(light, main) >= 3) return light;
  if (contrast(second, main) >= 3) return second;
  return luminance(main) > 0.4 ? LAUNCH_NEUTRALS.light.ink : LAUNCH_NEUTRALS.dark.ink;
}

const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}
export function mix(a: string, b: string, t: number): string {
  const x = rgb(a);
  const y = rgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}
export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${Math.round(alpha * 1000) / 1000})`;
}
export function luminance(hex: string): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = rgb(hex);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
}

/** The colour made light enough to glow on a dark background, keeping its hue (#B8893A → about #E2BE74). */
export function glow(hex: string): string {
  const [r, g, b] = rgb(hex).map((c) => c / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  h = (h * 60 + 360) % 360;
  const l2 = Math.max(l, 0.68);
  const s2 = Math.min(1, s * 1.2);
  const c = (1 - Math.abs(2 * l2 - 1)) * s2;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l2 - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex([(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255]);
}

/** The background shown in dark: the owner's, else the look's dark colours (a photo stays, darker). */
export function darkBackground(launch: LaunchLook): LaunchBackground {
  if (launch.background_dark) return launch.background_dark;
  const base = defaultLaunchBackground(launch.look);
  if (launch.background.type === "photo") return { ...base, type: "photo", image_url: launch.background.image_url };
  return { ...base, type: LAUNCH_DEFAULT_BACKGROUND[launch.look] };
}

/** The one colour a fill reads as, for the words on it. */
function readsAs(fill: LaunchFill): string {
  if (fill.kind === "color") return fill.color;
  if (fill.kind === "gradient") return mix(fill.from, fill.to, 0.5);
  return mix("#808080", "#000000", fill.overlay / 100);
}

export function launchColors(launch: LaunchLook, brand: { main: string; second: string | null }, dark: boolean): LaunchColors {
  const main = launch.main_color ?? brand.main;
  const second = launch.second_color ?? brand.second ?? LAUNCH_SECOND_FALLBACK;
  const n = dark ? LAUNCH_NEUTRALS.dark : LAUNCH_NEUTRALS.light;
  const bg = dark ? darkBackground(launch) : launch.background;
  const own = launch.look === "monogram" && !dark ? main : n.page;
  const gradient = (from = main, to = second, direction: LaunchDirection = "diagonal"): LaunchFill => ({ kind: "gradient", from, to, direction });
  const fill: LaunchFill =
    bg.type === "color"
      ? { kind: "color", color: bg.color ?? own }
      : bg.type === "gradient"
        ? gradient(bg.from ?? main, bg.to ?? second, bg.direction)
        : bg.image_url
          ? { kind: "photo", url: bg.image_url, overlay: bg.overlay ?? LAUNCH_DEFAULT_OVERLAY[launch.look][dark ? "dark" : "light"] }
          : gradient();
  const framed = (launch.look === "cinema" || launch.look === "editorial") && bg.type === "photo";
  const surface = framed ? n.page : readsAs(fill);
  const onDark = contrast("#F4EFE6", surface) >= contrast("#0E0D24", surface);
  const own2 = bg.text_color;
  const text = own2 ?? (onDark ? LAUNCH_NEUTRALS.dark.ink : LAUNCH_NEUTRALS.light.ink);
  const muted = own2 ? withAlpha(own2, 0.72) : onDark ? (surface === LAUNCH_NEUTRALS.dark.page ? LAUNCH_NEUTRALS.dark.muted : withAlpha(LAUNCH_NEUTRALS.dark.ink, 0.72)) : LAUNCH_NEUTRALS.light.muted;
  const isPage = framed || (bg.type === "color" && !bg.color);
  const tile = !onDark ? "brand" : dark && isPage ? "card" : "glass";
  return {
    dark,
    main,
    second,
    screen: framed ? { kind: "color", color: n.page } : fill,
    picture: framed ? fill : null,
    surface,
    onDark,
    text,
    muted,
    accent: onDark ? glow(second) : second,
    track: onDark ? withAlpha("#F4EFE6", 0.16) : withAlpha(second, 0.18),
    tile,
    onTile: tile === "brand" ? onBrand(main, second) : glow(second),
  };
}

/** A fill as CSS. */
export function fillCss(fill: LaunchFill): string {
  if (fill.kind === "color") return fill.color;
  if (fill.kind === "gradient") {
    if (fill.direction === "radial") return `radial-gradient(circle at 50% 40%, ${fill.from}, ${fill.to} 75%)`;
    return `linear-gradient(${fill.direction === "vertical" ? "180deg" : "155deg"}, ${fill.from}, ${fill.to})`;
  }
  return `linear-gradient(rgba(0,0,0,${fill.overlay / 100}), rgba(0,0,0,${fill.overlay / 100})), url("${fill.url.replace(/"/g, "%22")}") center / cover`;
}
