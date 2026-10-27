import type { Corners } from "../pages/types";

/**
 * 97.3 What a design tokens file exported from Figma holds that an app's
 * look can use: its colors, font families and corner radii. Reads the common
 * formats: W3C design tokens (`$value`, `$type`, as Figma's own "Export
 * variables" writes them, colors as hex or as `{ components, hex }`), Tokens
 * Studio (`value`, `type`, typography with `fontFamily`), Style Dictionary
 * (`value`), and lists of variables (`{ name, type, value }`), with
 * references like `{color.brand.500}`. Runs in the browser too.
 */

export interface FigmaColor {
  name: string;
  /** #RRGGBB */
  hex: string;
}

export interface FigmaFont {
  name: string;
  family: string;
}

export interface FigmaTokens {
  colors: FigmaColor[];
  fonts: FigmaFont[];
  /** Corner radii in pixels. */
  radii: number[];
}

/** The most of each the preview lists. */
export const TOKEN_LIMITS = { colors: 60, fonts: 20, leaves: 5000, bytes: 1024 * 1024 } as const;

interface Leaf {
  path: string[];
  type: string | null;
  value: unknown;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Every token in the file, with the type it has or inherits from its group. */
function leaves(root: unknown): Leaf[] {
  const out: Leaf[] = [];
  const walk = (node: unknown, path: string[], inherited: string | null, depth: number) => {
    if (out.length >= TOKEN_LIMITS.leaves || depth > 12) return;
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, [...path, isRecord(item) && typeof item.name === "string" ? item.name : String(i)], inherited, depth + 1));
      return;
    }
    if (!isRecord(node)) return;
    const type = typeof node.$type === "string" ? node.$type : typeof node.type === "string" ? node.type : inherited;
    if ("$value" in node) {
      out.push({ path, type, value: node.$value });
      return;
    }
    // A token in the older formats: a value that isn't itself a group of tokens.
    if ("value" in node && !(isRecord(node.value) && Object.values(node.value).some((v) => isRecord(v) && ("value" in v || "$value" in v)))) {
      out.push({ path, type, value: node.value });
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith("$") || key === "type" || key === "description") continue;
      walk(child, [...path, key], type, depth + 1);
    }
  };
  walk(root, [], null, 0);
  return out;
}

/** `{a.b.c}` in a value, resolved from the other tokens (up to five steps). */
function resolver(all: Leaf[]): (value: unknown) => unknown {
  const byPath = new Map(all.map((l) => [l.path.join(".").toLowerCase(), l.value]));
  const resolve = (value: unknown, steps = 0): unknown => {
    if (typeof value !== "string" || steps > 5) return value;
    const ref = /^\{([^}]+)\}$/.exec(value.trim());
    if (!ref) return value;
    const target = byPath.get(ref[1]!.toLowerCase());
    return target === undefined ? null : resolve(target, steps + 1);
  };
  return resolve;
}

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/** A color as #RRGGBB: hex (3, 6 or 8 digits), rgb()/rgba(), or `{ hex }` / `{ components }` (0 to 1) objects. */
export function colorHex(value: unknown): string | null {
  if (isRecord(value)) {
    if (typeof value.hex === "string") return colorHex(value.hex);
    const parts = value.components;
    if (Array.isArray(parts) && parts.length >= 3 && parts.slice(0, 3).every((p) => typeof p === "number")) {
      return `#${(parts.slice(0, 3) as number[]).map((p) => hex2(p * 255)).join("")}`.toUpperCase();
    }
    if (["r", "g", "b"].every((k) => typeof value[k] === "number")) {
      const scale = [value.r, value.g, value.b].some((p) => (p as number) > 1) ? 1 : 255;
      return `#${[value.r, value.g, value.b].map((p) => hex2((p as number) * scale)).join("")}`.toUpperCase();
    }
    return null;
  }
  if (typeof value !== "string") return null;
  const text = value.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(text);
  if (hex) {
    const digits = hex[1]!.length === 3 ? [...hex[1]!].map((d) => d + d).join("") : hex[1]!.slice(0, 6);
    return `#${digits}`.toUpperCase();
  }
  const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i.exec(text);
  return rgb ? `#${[rgb[1], rgb[2], rgb[3]].map((p) => hex2(Number(p))).join("")}`.toUpperCase() : null;
}

/** A radius in pixels: a number, "8px" or "0.5rem" (16 pixels to a rem). */
function radiusPx(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (isRecord(value) && typeof value.value === "number") return value.unit === "rem" ? value.value * 16 : value.value;
  if (typeof value !== "string") return null;
  const m = /^(\d+(?:\.\d+)?)\s*(px|rem)?$/i.exec(value.trim());
  return m ? Number(m[1]) * (m[2]?.toLowerCase() === "rem" ? 16 : 1) : null;
}

/** A font family: a name, the first of a list, or a typography token's. */
function family(value: unknown): string | null {
  if (Array.isArray(value)) return family(value[0]);
  if (isRecord(value)) return family(value.fontFamily ?? value.family);
  if (typeof value !== "string") return null;
  const first = value.split(",")[0]!.trim().replace(/^["']|["']$/g, "");
  return first && first.length <= 64 && !first.startsWith("{") ? first : null;
}

/** The colors, fonts and radii in an exported tokens file; null when it has none. */
export function readTokens(json: unknown): FigmaTokens | null {
  const all = leaves(json);
  const resolve = resolver(all);
  const colors = new Map<string, FigmaColor>();
  const fonts = new Map<string, FigmaFont>();
  const radii: number[] = [];
  for (const leaf of all) {
    const type = (leaf.type ?? "").toLowerCase();
    // The variables lists' own levels say nothing about the token.
    const name = leaf.path.filter((p) => !/^(collections|modes|variables|values)$/i.test(p)).join(" / ");
    const lower = name.toLowerCase();
    const value = resolve(leaf.value);
    if (type === "color" || (!type && typeof value === "string" && colorHex(value))) {
      const hex = colorHex(value);
      if (hex && !colors.has(hex) && colors.size < TOKEN_LIMITS.colors) colors.set(hex, { name, hex });
    } else if (type === "fontfamily" || type === "fontfamilies" || type === "typography" || (type === "string" && /font.?family/.test(lower))) {
      const found = family(value);
      if (found && !fonts.has(found.toLowerCase()) && fonts.size < TOKEN_LIMITS.fonts) fonts.set(found.toLowerCase(), { name, family: found });
    } else if (type === "borderradius" || type === "radius" || ((type === "dimension" || type === "number" || type === "float") && /radius|corner|rounded/.test(lower))) {
      const px = radiusPx(value);
      if (px !== null && px >= 0 && px <= 999) radii.push(px);
    }
  }
  if (!colors.size && !fonts.size && !radii.length) return null;
  return { colors: [...colors.values()], fonts: [...fonts.values()], radii };
}

/** Grey, white or black: not a brand color. */
function neutral(hex: string): boolean {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return Math.max(r!, g!, b!) - Math.min(r!, g!, b!) < 24;
}

export interface FigmaSuggestion {
  primary: string | null;
  secondary: string | null;
  font: string | null;
  corners: Corners | null;
}

/** What the preview chooses first: named brand colors and body font when the file has them, else the first that fit. */
export function suggestLook(tokens: FigmaTokens): FigmaSuggestion {
  // A color the file names as the brand's, whatever it is (a dark navy brand too).
  const named = (re: RegExp, not?: string | null) => tokens.colors.find((c) => re.test(c.name.toLowerCase()) && c.hex !== not)?.hex ?? null;
  const vivid = tokens.colors.filter((c) => !neutral(c.hex));
  const primary = named(/primary|brand|main/) ?? vivid[0]?.hex ?? tokens.colors[0]?.hex ?? null;
  const secondary = named(/secondary|accent|highlight/, primary) ?? vivid.find((c) => c.hex !== primary)?.hex ?? null;
  const font = (tokens.fonts.find((f) => /body|text|base|paragraph|regular/.test(f.name.toLowerCase())) ?? tokens.fonts[0])?.family ?? null;
  const sorted = [...tokens.radii].sort((a, b) => a - b);
  const middle = sorted.length ? sorted[Math.floor(sorted.length / 2)]! : null;
  const corners: Corners | null = middle === null ? null : middle <= 3 ? "sharp" : middle <= 12 ? "soft" : "round";
  return { primary, secondary, font, corners };
}
