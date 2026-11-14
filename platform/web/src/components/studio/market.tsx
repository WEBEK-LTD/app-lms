import type { CSSProperties, ReactNode } from "react";
import type { StudioMarket, StudioNode } from "@/lib/pages/types";
import { canvasData, dartHash, fill, ltrRun, marketCount, marketSamples, marketWords, pickVendors, type MarketCanvas, type MarketCanvasKind, type MarketCanvasOffer, type MarketCanvasReorder, type MarketCanvasVendor, type MarketWords } from "@/lib/studio/market-canvas";

/**
 * A `market` element on the editor's canvas: the marketplace section the
 * app draws (mobile/lib/modules/market/widgets/market_sections.dart and
 * market_look.dart), with the same sizes, colours and words, filled with
 * the project's places, offers, cuisines and orders (the app's samples
 * where it has none). The element around it keeps selecting, moving and
 * resizing it; nothing in here takes a tap.
 */

interface Palette {
  dark: boolean;
  primary: string;
  accent: string;
  surface: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  success: string;
  danger: string;
  star: string;
  placeholders: readonly string[];
}

type Rgb = [number, number, number];

function rgbOf(hex: string): Rgb | null {
  const h = hex.trim().replace(/^#/, "");
  const six = h.length === 3 ? [...h].map((c) => c + c).join("") : h.length === 8 ? h.slice(2) : h;
  if (!/^[0-9a-fA-F]{6}$/.test(six)) return null;
  const n = parseInt(six, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const hexOf = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

/** `color` at `alpha` over `under` (Flutter's `Color.alphaBlend`). */
function blend(color: string, alpha: number, under: string): string {
  const a = rgbOf(color);
  const b = rgbOf(under);
  if (!a || !b) return color;
  return hexOf([0, 1, 2].map((i) => a[i]! * alpha + b[i]! * (1 - alpha)) as Rgb);
}

function rgba(color: string, alpha: number): string {
  const c = rgbOf(color);
  return c ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})` : color;
}

function luminance(color: string): number {
  const c = rgbOf(color) ?? [0, 0, 0];
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The brand colour as the app's dark theme shows it: lighter, the same hue, until it stands out (`visibleOn`). */
function visibleOn(color: string, background: string): string {
  if (!rgbOf(color) || contrast(color, background) >= 3) return color;
  const [r, g, b] = rgbOf(color)!.map((v) => v / 255) as Rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  const s = d === 0 ? 0 : d / (1 - Math.abs(max + min - 1));
  for (let l = (max + min) / 2; l <= 1; l += 0.02) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const m = l - c / 2;
    const [r1, g1, b1] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
    const lighter = hexOf([(r1 + m) * 255, (g1 + m) * 255, (b1 + m) * 255]);
    if (contrast(lighter, background) >= 3) return lighter;
  }
  return "#F4EFE6";
}

const DARK_SURFACE = "#17162E";

/** The app's palette (mobile/lib/core/theme/palette.dart) around the project's colours, light or dark. */
export function marketPalette(brand: string, accent: string | null | undefined, dark: boolean): Palette {
  const ember = "#FF5A1F";
  if (dark)
    return {
      dark,
      primary: visibleOn(brand, DARK_SURFACE),
      accent: accent || ember,
      surface: DARK_SURFACE,
      text: "#F4EFE6",
      textSecondary: "#B9B5CA",
      textTertiary: "#8C889A",
      border: "#2C2A47",
      success: "#5CCB94",
      danger: "#F2B8B5",
      star: "#E6A23C",
      placeholders: ["#3A3020", "#1E3A2E", "#2A2840", "#3A2434"],
    };
  return {
    dark,
    primary: brand,
    accent: accent || ember,
    surface: "#FFFFFF",
    text: "#0E0D24",
    textSecondary: "#5E5B70",
    textTertiary: "#6F6B80",
    border: "#E4DDD0",
    success: "#1C7C4A",
    danger: "#B3261E",
    star: "#C77A12",
    placeholders: ["#F2E3C9", "#D7EBE2", "#E6E3EF", "#EEDDE8"],
  };
}

/** The brand colour over the card colour, lightly (`marketTint`). */
const tint = (p: Palette, color: string, amount = 0.12) => blend(color, amount, p.surface);
/** A darker shade, for the end of a gradient (`marketDeeper`). */
const deeper = (color: string, amount = 0.28) => blend("#000000", amount, color);

interface Ctx {
  p: Palette;
  w: MarketWords;
  lang: string;
  rtl: boolean;
  card: { radius: number | null; shows: (fact: "offer" | "rating" | "time" | "fee" | "min_order") => boolean };
}

const clamp = (lines: number): CSSProperties => ({ display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" });
const oneLine: CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 };
const scrollRow = (height: number, gap: number): CSSProperties => ({ display: "flex", gap, height, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none", paddingInline: 16, boxSizing: "border-box" });

function Icon({ name, size, color, filled, flip, style }: { name: string; size: number; color: string; filled?: boolean; flip?: boolean; style?: CSSProperties }) {
  return (
    <span className={`material-symbols-rounded${filled ? " filled" : ""}`} aria-hidden="true" style={{ fontSize: size, width: size, height: size, color, flex: "none", transform: flip ? "scaleX(-1)" : undefined, ...style }}>
      {name}
    </span>
  );
}

/** A picture, or the app's soft tint with a quiet picture icon where there is none (`AppNetworkImage`). */
function Picture({ url, seed, p, icon = 24, style }: { url: string; seed: string; p: Palette; icon?: number; style?: CSSProperties }) {
  if (url)
    return (
      // eslint-disable-next-line @next/next/no-img-element -- the place's own picture or a drawn sample, as the app shows it
      <img src={url} alt="" draggable={false} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", ...style }} />
    );
  const shade = p.placeholders[dartHash(seed) % p.placeholders.length]!;
  return (
    <span data-market-picture="" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: `linear-gradient(to bottom right, ${blend(p.surface, p.dark ? 0.1 : 0.35, shade)}, ${shade})`, ...style }}>
      {icon ? <Icon name="image" size={icon} color={rgba(p.textSecondary, 0.45)} /> : null}
    </span>
  );
}

const MARKS = ["#E4572E", "#2E86AB", "#7B4DB6", "#1F9D6B", "#D9822B", "#C2185B", "#3D5A80"];

/** A place's logo, else its initials on a colour of its own (`MarketVendorMark`). */
function Mark({ vendor, size, p }: { vendor: Pick<MarketCanvasVendor, "name" | "logoUrl">; size: number; p: Palette }) {
  const initials = vendor.name
    .split(/\s+/)
    .filter((word) => word && /\w/.test(word))
    .slice(0, 2)
    .map((word) => [...word][0])
    .join("")
    .toUpperCase();
  return (
    <span
      data-market-mark=""
      style={{
        width: size,
        height: size,
        boxSizing: "border-box",
        borderRadius: "50%",
        background: MARKS[dartHash(vendor.name) % MARKS.length],
        border: `${size > 40 ? 3 : 2}px solid ${p.surface}`,
        boxShadow: "0 3px 10px rgba(0,0,0,0.18)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#FFFFFF",
        fontSize: size * 0.34,
        fontWeight: 800,
        letterSpacing: -0.3,
        flex: "none",
      }}
    >
      {vendor.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- the place's logo
        <img src={vendor.logoUrl} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials
      )}
    </span>
  );
}

/** A small coloured label: an offer, Club, Busy (`MarketPill`). */
function Pill({ text, background, color, icon }: { text: string; background: string; color: string; icon?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, maxWidth: "100%", boxSizing: "border-box", background, color, borderRadius: 999, paddingBlock: 4, paddingInlineStart: 8, paddingInlineEnd: 10 }}>
      {icon ? <Icon name={icon} size={14} color={color} filled /> : null}
      <span style={{ ...oneLine, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.1, lineHeight: 1.2 }}>{text}</span>
    </span>
  );
}

/** A section's title, its line under it and "See all" (`MarketSectionHead`). */
function Head({ title, subtitle, seeAll, c, color }: { title: string; subtitle: string; seeAll?: boolean; c: Ctx; color?: string }) {
  if (!title) return null;
  return (
    <div data-market-head="" style={{ display: "flex", alignItems: "flex-end", paddingInlineStart: 20, paddingInlineEnd: 12, paddingBottom: 12 }}>
      <div style={{ flex: "1 1 auto", minWidth: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.25, color: color ?? c.p.text }}>{title}</div>
        {subtitle ? <div style={{ marginTop: 2, fontSize: 13, color: c.p.textSecondary }}>{subtitle}</div> : null}
      </div>
      {seeAll ? (
        <span style={{ display: "flex", alignItems: "center", gap: 2, padding: "4px 8px", color: c.p.primary, fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap" }}>
          {c.w.seeAll}
          <Icon name="chevron_right" size={16} color={c.p.primary} flip={c.rtl} />
        </span>
      ) : null}
    </div>
  );
}

// Hero

function Hero({ node, data, color, title, text, c }: { node: StudioNode; data: MarketCanvas; color: string; title: string; text: string; c: Ctx }) {
  const { p, w } = c;
  const round = (size: number): CSSProperties => ({ width: size, height: size, borderRadius: "50%", background: "rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" });
  return (
    <div data-market-hero={node.id} style={{ padding: "6px 12px 0" }}>
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 30, background: `linear-gradient(to bottom ${c.rtl ? "left" : "right"}, ${color}, ${deeper(color, 0.32)})` }}>
        <span aria-hidden="true" style={{ position: "absolute", top: -60, insetInlineEnd: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,255,255,0.10), rgba(255,255,255,0))" }} />
        <span aria-hidden="true" style={{ position: "absolute", bottom: -70, insetInlineStart: -30, width: 170, height: 170, borderRadius: "50%", background: `radial-gradient(closest-side, ${rgba(p.accent, 0.22)}, ${rgba(p.accent, 0)})` }} />
        <div style={{ position: "relative", padding: "16px 14px 18px 18px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 38, height: 38, borderRadius: 13, background: "rgba(255,255,255,0.16)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <Icon name="location_on" size={20} color="#FFFFFF" filled />
              </span>
              <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>{w.deliverTo}</div>
                <div style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
                  <span style={{ ...oneLine, fontSize: 14.5, fontWeight: 800, color: "#FFFFFF" }}>{data.address ?? w.chooseAddress}</span>
                  <Icon name="expand_more" size={20} color="#FFFFFF" />
                </div>
              </div>
            </div>
            <span style={round(40)}>
              <Icon name="notifications" size={21} color="#FFFFFF" />
            </span>
            <span style={{ ...round(40), marginInlineStart: 8, position: "relative" }}>
              <Icon name="shopping_bag" size={21} color="#FFFFFF" />
              <span style={{ position: "absolute", top: -2, insetInlineEnd: -2, minWidth: 18, height: 18, boxSizing: "border-box", padding: "0 5px", borderRadius: 9, background: p.accent, border: "1.5px solid #FFFFFF", color: "#FFFFFF", fontSize: 10.5, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
            </span>
          </div>
          {title ? <div style={{ paddingTop: 18, fontSize: 25, lineHeight: 1.12, fontWeight: 800, letterSpacing: -0.6, color: "#FFFFFF" }}>{title}</div> : null}
          <div style={{ marginTop: 16, height: 52, boxSizing: "border-box", background: p.surface, borderRadius: 18, boxShadow: "0 6px 24px rgba(0,0,0,0.08)", paddingInlineStart: 16, paddingInlineEnd: 6, display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="search" size={22} color={p.primary} />
            <span style={{ ...oneLine, flex: "1 1 auto", fontSize: 14.5, fontWeight: 500, color: p.textTertiary }}>{text || w.searchHint}</span>
            <span style={{ width: 40, height: 40, borderRadius: 13, background: tint(p, p.primary, 0.12), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon name="tune" size={20} color={p.primary} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 128 The address as a flat bar (`style: "bar"`): where it delivers, the
 * soonest time any open place delivers in, and the search under them, on
 * the element's colour with its foot rounded.
 */
function AddressBar({ node, data, color, text, c }: { node: StudioNode; data: MarketCanvas; color: string; text: string; c: Ctx }) {
  const { p, w } = c;
  const soonest = data.vendors.filter((v) => v.state !== "closed" && v.etaMin !== null).reduce<number | null>((min, v) => (min === null || v.etaMin! < min ? v.etaMin : min), null);
  // 128.10 The words on the bar readable on its colour; by night the search field in the theme's dark colours, as the app's.
  const onBar = luminance(color) > 0.5 ? "#14231B" : "#FFFFFF";
  // 130 On a bar of a dark colour of its own (a page's night), the field that colour a step lighter.
  const field = !p.dark ? "#FFFFFF" : luminance(color) < 0.02 ? blend("#FFFFFF", 0.08, color) : p.surface;
  const fieldInk = p.dark ? p.textSecondary : "#5D6B63";
  return (
    <div data-market-bar={node.id} style={{ padding: "22px 16px 12px", background: color, color: onBar, borderRadius: "0 0 28px 28px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 40, height: 40, borderRadius: 20, background: rgba(onBar, 0.16), display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
          <Icon name="location_on" size={22} color={onBar} />
        </span>
        <div style={{ flex: "1 1 auto", minWidth: 0 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{w.deliverTo}</div>
          <div style={{ ...oneLine, fontSize: 15, fontWeight: 800 }}>{data.address ?? w.chooseAddress}</div>
        </div>
        {soonest !== null ? (
          <span data-market-soonest="" style={{ height: 32, padding: "0 12px", borderRadius: 16, background: p.accent, color: "#1B2A20", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 4, flex: "none" }}>
            <Icon name="bolt" size={16} color="#1B2A20" filled />
            {fill(w.minutes, { min: soonest })}
          </span>
        ) : null}
      </div>
      <div data-market-bar-search="" style={{ marginTop: 14, height: 50, borderRadius: 16, background: field, color: fieldInk, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", fontSize: 15 }}>
        <Icon name="search" size={22} color={fieldInk} />
        <span style={oneLine}>{text || w.searchHint}</span>
      </div>
    </div>
  );
}

/** 128 A place as a small chip (`style: "chips"`): its photo, its name, its rating and soonest time. */
function VendorChip({ vendor, c }: { vendor: MarketCanvasVendor; c: Ctx }) {
  const { p, w } = c;
  const facts = [vendor.rating !== null && c.card.shows("rating") ? `★ ${vendor.rating.toFixed(1)}` : null, vendor.etaMin !== null && c.card.shows("time") ? fill(w.minutes, { min: vendor.etaMin }) : null].filter(Boolean).join(" · ");
  return (
    <div data-market-chip={vendor.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px 8px 8px", paddingInlineStart: 8, paddingInlineEnd: 12, borderRadius: c.card.radius ?? 16, background: p.surface, border: `1px solid ${p.border}`, flex: "none" }}>
      <Picture url={vendor.coverUrl} seed={vendor.id} p={p} icon={18} style={{ width: 40, height: 40, borderRadius: 12, flex: "none" }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ ...oneLine, fontSize: 13, fontWeight: 800, color: p.text }}>{vendor.name}</div>
        {facts ? <div style={{ fontSize: 11, color: p.textSecondary }}>{facts}</div> : null}
      </div>
    </div>
  );
}

// Kinds

function KindTile({ kind, large, index, c }: { kind: MarketCanvasKind; large: boolean; index: number; c: Ctx }) {
  const { p, w } = c;
  const title = kind.title ?? (kind.kind ? w[kind.kind] : kind.id);
  const subtitle = kind.subtitle ?? (kind.places !== undefined ? w.places(kind.places) : null);
  const picture = (
    <span style={{ display: "block", width: "100%", height: "100%", borderRadius: large ? 20 : 14, overflow: "hidden" }}>
      <Picture url={kind.imageUrl} seed={kind.id} p={p} icon={large ? 28 : 18} />
    </span>
  );
  const name = <span style={{ ...oneLine, display: "block", fontSize: large ? 20 : 13, fontWeight: 800, letterSpacing: large ? -0.4 : 0, color: p.text, textAlign: large ? undefined : "center" }}>{title}</span>;
  return (
    <div data-market-kind={kind.id} style={{ position: "relative", flex: "1 1 0", minWidth: 0, height: large ? 156 : 100, borderRadius: large ? 26 : 22, overflow: "hidden", background: index % 2 === 0 ? tint(p, p.primary, 0.1) : tint(p, p.accent, 0.14) }}>
      {large ? (
        <>
          <span style={{ position: "absolute", insetInlineEnd: -14, bottom: -14, width: 116, height: 88, transform: "rotate(-0.08rad)" }}>{picture}</span>
          {kind.badge ? (
            <span style={{ position: "absolute", top: 12, insetInlineEnd: 12 }}>
              <Pill text={kind.badge} background={p.accent} color="#FFFFFF" />
            </span>
          ) : null}
          <div style={{ position: "relative", height: "100%", boxSizing: "border-box", padding: 14, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ maxWidth: "100%" }}>{name}</div>
            {subtitle ? <div style={{ ...clamp(2), marginTop: 2, width: 110, fontSize: 12.5, lineHeight: 1.25, fontWeight: 600, color: p.textSecondary }}>{subtitle}</div> : null}
            <span style={{ marginTop: "auto", width: 30, height: 30, borderRadius: "50%", background: p.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="chevron_right" size={17} color={p.text} flip={c.rtl} />
            </span>
          </div>
        </>
      ) : (
        <div style={{ height: "100%", boxSizing: "border-box", padding: "10px 8px 8px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ width: 62, height: 50 }}>{picture}</span>
          <span style={{ marginTop: "auto", maxWidth: "100%" }}>{name}</span>
        </div>
      )}
    </div>
  );
}

function Kinds({ data, title, text, c }: { data: MarketCanvas; title: string; text: string; c: Ctx }) {
  const big = data.kinds.slice(0, 2);
  const small = data.kinds.slice(2, 6);
  return (
    <div style={{ padding: "0 12px" }}>
      <Head title={title} subtitle={text} c={c} />
      <div style={{ display: "flex", gap: 10 }}>
        {big.map((k, i) => (
          <KindTile key={k.id} kind={k} large index={i} c={c} />
        ))}
      </div>
      {small.length ? (
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          {small.map((k, i) => (
            <KindTile key={k.id} kind={k} large={false} index={i + 2} c={c} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// Offers

function OfferCard({ offer, c }: { offer: MarketCanvasOffer; c: Ctx }) {
  const from = rgbOf(offer.from) ? offer.from : c.p.primary;
  const to = rgbOf(offer.to) ? offer.to : deeper(from);
  return (
    <div data-market-offer={offer.id} style={{ position: "relative", height: "100%", borderRadius: 26, overflow: "hidden", background: `linear-gradient(to bottom ${c.rtl ? "left" : "right"}, ${from}, ${to})`, boxShadow: `0 12px 22px -8px ${rgba(to, 0.3)}` }}>
      <span style={{ position: "absolute", insetInlineEnd: -26, top: 14, bottom: 14, aspectRatio: "1 / 1", borderRadius: "50%", background: "rgba(255,255,255,0.18)", padding: 10, boxSizing: "border-box" }}>
        <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden" }}>
          <Picture url={offer.imageUrl} seed={offer.id} p={c.p} icon={36} />
        </span>
      </span>
      <div style={{ position: "relative", height: "100%", boxSizing: "border-box", paddingBlock: 14, paddingInlineStart: 18, paddingInlineEnd: 112, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ ...clamp(2), fontSize: 22, lineHeight: 1.05, fontWeight: 900, letterSpacing: -0.6, color: "#FFFFFF" }}>{offer.title}</div>
        <div style={{ ...clamp(2), marginTop: 6, fontSize: 12.5, lineHeight: 1.3, fontWeight: 600, color: "rgba(255,255,255,0.88)" }}>{offer.text}</div>
        <span style={{ marginTop: "auto" }}>
          {offer.code ? (
            <span style={{ display: "inline-block", background: "#FFFFFF", borderRadius: 10, padding: "5px 10px", fontSize: 12, fontWeight: 800, letterSpacing: 0.6, color: to }}>{fill(c.w.code, { code: ltrRun(offer.code, c.lang) })}</span>
          ) : (
            <Icon name="chevron_right" size={22} color="rgba(255,255,255,0.9)" flip={c.rtl} />
          )}
        </span>
      </div>
    </div>
  );
}

function Offers({ data, title, text, c }: { data: MarketCanvas; title: string; text: string; c: Ctx }) {
  const offers = data.offers;
  return (
    <div>
      <Head title={title} subtitle={text} c={c} />
      <div style={{ display: "flex", height: 186, overflowX: "auto", overflowY: "hidden", scrollbarWidth: "none" }}>
        {offers.map((o, i) => (
          <div key={o.id} style={{ flex: "0 0 88%", boxSizing: "border-box", paddingInlineStart: i === 0 ? 16 : 6, paddingInlineEnd: i === offers.length - 1 ? 16 : 6, paddingBottom: 22 }}>
            <OfferCard offer={o} c={c} />
          </div>
        ))}
      </div>
      <div aria-hidden="true" style={{ display: "flex", justifyContent: "center" }}>
        {offers.map((o, i) => (
          <span key={o.id} style={{ margin: "0 3px", width: i === 0 ? 22 : 7, height: 7, borderRadius: 4, background: i === 0 ? c.p.primary : c.p.border }} />
        ))}
      </div>
    </div>
  );
}

// Cuisines and departments

function Cuisines({ data, title, text, c }: { data: MarketCanvas; title: string; text: string; c: Ctx }) {
  const { p } = c;
  return (
    <div>
      <Head title={title} subtitle={text} c={c} />
      <div style={scrollRow(96, 14)}>
        {data.cuisines.map((cuisine, i) => (
          <div key={cuisine.id} data-market-cuisine={cuisine.id} style={{ width: 66, flex: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ width: 66, height: 66, boxSizing: "border-box", borderRadius: "50%", border: i === 0 ? `2.5px solid ${p.primary}` : `1px solid ${p.border}`, padding: 3 }}>
              <span style={{ display: "block", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden" }}>
                <Picture url={cuisine.imageUrl} seed={cuisine.id} p={p} icon={20} />
              </span>
            </span>
            <span style={{ ...oneLine, maxWidth: 66, marginTop: 6, fontSize: 12, fontWeight: i === 0 ? 800 : 600, color: i === 0 ? p.text : p.textSecondary }}>{cuisine.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// The club

function Club({ node, title, text, c }: { node: StudioNode; title: string; text: string; c: Ctx }) {
  const { p, w } = c;
  const background = node.background && rgbOf(node.background) ? node.background : "#17152E";
  return (
    <div style={{ padding: "0 16px" }}>
      <div data-market-club="" style={{ position: "relative", overflow: "hidden", borderRadius: 26, background }}>
        <span aria-hidden="true" style={{ position: "absolute", insetInlineEnd: -30, top: -40, width: 190, height: 190, borderRadius: "50%", background: `radial-gradient(closest-side, ${rgba(p.accent, 0.45)}, ${rgba(p.accent, 0)})` }} />
        <Icon name="two_wheeler" size={66} color="rgba(255,255,255,0.9)" filled style={{ position: "absolute", insetInlineEnd: 18, bottom: 14, transform: `rotate(${-180 / 14}deg)` }} />
        <div style={{ position: "relative", paddingBlock: 16, paddingInlineStart: 18, paddingInlineEnd: 100, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <Pill text={w.club.toLocaleUpperCase(c.lang)} background={p.accent} color="#FFFFFF" icon="workspace_premium" />
          <div style={{ marginTop: 10, fontSize: 19, lineHeight: 1.15, fontWeight: 800, letterSpacing: -0.3, color: "#FFFFFF" }}>{title}</div>
          {text ? <div style={{ marginTop: 4, fontSize: 12.5, lineHeight: 1.35, color: "rgba(255,255,255,0.75)" }}>{text}</div> : null}
          <span style={{ marginTop: 12, background: "#FFFFFF", borderRadius: 12, padding: "8px 16px", fontSize: 13.5, fontWeight: 800, color: background }}>{w.joinClub}</span>
        </div>
      </div>
    </div>
  );
}

// Places

function Rating({ vendor, c, light }: { vendor: MarketCanvasVendor; c: Ctx; light?: boolean }) {
  const { p, w } = c;
  if (!c.card.shows("rating")) return null;
  if (vendor.rating === null) return <Pill text={w.newPlace} background={tint(p, p.primary, 0.12)} color={p.primary} />;
  return (
    <span data-market-rating="" style={{ display: "inline-flex", alignItems: "center", gap: 3, minWidth: 0, flex: "none" }}>
      <Icon name="star" size={16} color={p.star} filled />
      <span style={{ fontSize: 13, fontWeight: 800, color: light ? "#FFFFFF" : p.text }}>{vendor.rating.toFixed(1)}</span>
      <span style={{ ...oneLine, fontSize: 12, color: light ? "rgba(255,255,255,0.7)" : p.textTertiary }}>{`(${marketCount(vendor.ratings)})`}</span>
    </span>
  );
}

const etaOf = (vendor: MarketCanvasVendor, w: MarketWords) => (vendor.etaMin === null || vendor.etaMax === null ? null : fill(w.eta, { min: vendor.etaMin, max: vendor.etaMax }));

/** Time, delivery fee and smallest order, in one line (`MarketVendorFacts`). */
function Facts({ vendor, c, wrap = true, eta = true }: { vendor: MarketCanvasVendor; c: Ctx; wrap?: boolean; eta?: boolean }) {
  const { p, w } = c;
  const fact = (key: string, icon: string, text: string, color?: string) => (
    <span key={key} data-market-fact={key} style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0, flex: wrap ? undefined : "0 1 auto" }}>
      <Icon name={icon} size={15} color={color ?? p.textTertiary} />
      <span style={{ ...oneLine, fontSize: 12.5, fontWeight: 600, color: color ?? p.textSecondary }}>{text}</span>
    </span>
  );
  const minutes = etaOf(vendor, w);
  const facts: ReactNode[] = [];
  if (eta && minutes && c.card.shows("time")) facts.push(fact("time", "schedule", minutes));
  if (c.card.shows("fee")) {
    if (vendor.freeDelivery) facts.push(fact("fee", "two_wheeler", w.freeDelivery, p.success));
    else if (vendor.deliveryFee) facts.push(fact("fee", "two_wheeler", fill(w.deliveryFee, { fee: ltrRun(vendor.deliveryFee, c.lang) })));
  }
  if (vendor.minOrder && c.card.shows("min_order")) facts.push(fact("min_order", "shopping_bag", fill(w.minOrder, { amount: ltrRun(vendor.minOrder, c.lang) })));
  if (!wrap) return <div style={{ display: "flex", gap: 12, minWidth: 0 }}>{facts.slice(0, 2)}</div>;
  return <div style={{ display: "flex", flexWrap: "wrap", columnGap: 12, rowGap: 4, alignItems: "center" }}>{facts}</div>;
}

function stateText(vendor: MarketCanvasVendor, w: MarketWords): string {
  if (vendor.state === "busy") return w.busy;
  return vendor.opensAt ? fill(w.closedOpens, { time: vendor.opensAt }) : w.closed;
}

/** A restaurant or a shop: its picture with the offer and the time on it, its mark, name, rating and facts (`MarketVendorCard`). */
function VendorCard({ vendor, c, tall }: { vendor: MarketCanvasVendor; c: Ctx; tall?: boolean }) {
  const { p, w } = c;
  const closed = vendor.state === "closed";
  const radius = c.card.radius ?? 24;
  const promo = c.card.shows("offer") ? vendor.promo : null;
  const minutes = etaOf(vendor, w);
  return (
    <div data-market-vendor={vendor.id} style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ position: "relative", height: tall ? 176 : 150 }}>
        <span style={{ position: "absolute", inset: 0, borderRadius: radius, overflow: "hidden", filter: closed ? "grayscale(1)" : undefined }}>
          <Picture url={vendor.coverUrl} seed={vendor.id} p={p} icon={44} />
        </span>
        {closed || vendor.state === "busy" ? (
          <span style={{ position: "absolute", inset: 0, borderRadius: radius, background: "rgba(0,0,0,0.42)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Pill text={stateText(vendor, w)} background="#FFFFFF" color={p.text} icon={closed ? "lock" : "hourglass_top"} />
          </span>
        ) : null}
        {promo ? (
          <span style={{ position: "absolute", top: 10, insetInlineStart: 10, insetInlineEnd: 56, display: "flex" }}>
            <Pill text={promo} background={p.accent} color="#FFFFFF" icon="local_offer" />
          </span>
        ) : null}
        <span style={{ position: "absolute", top: 8, insetInlineEnd: 8, width: 36, height: 36, borderRadius: "50%", background: rgba(p.surface, 0.94), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="favorite" size={19} color={p.text} />
        </span>
        {minutes && c.card.shows("time") ? (
          <span data-market-eta="" style={{ position: "absolute", bottom: 10, insetInlineEnd: 10, display: "flex", alignItems: "center", gap: 4, background: p.surface, borderRadius: 12, boxShadow: "0 3px 8px rgba(0,0,0,0.14)", padding: "5px 8px" }}>
            <Icon name={vendor.deliveredBy === "app" ? "near_me" : "storefront"} size={14} color={vendor.deliveredBy === "app" ? p.primary : p.textSecondary} filled />
            <span style={{ fontSize: 12, fontWeight: 800, color: p.text }}>{minutes}</span>
          </span>
        ) : null}
        {vendor.club ? (
          <span style={{ position: "absolute", top: promo ? 42 : 10, insetInlineStart: 10 }}>
            <Pill text={vendor.clubBenefit ?? w.clubFree} background={p.surface} color={p.text} icon="workspace_premium" />
          </span>
        ) : null}
        <span style={{ position: "absolute", insetInlineStart: 12, bottom: -20 }}>
          <Mark vendor={vendor} size={46} p={p} />
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 6, paddingInlineStart: 64, paddingInlineEnd: 4 }}>
        <span style={{ ...oneLine, flex: "1 1 auto", fontSize: 16.5, fontWeight: 800, letterSpacing: -0.2, color: p.text }}>{vendor.name}</span>
        <Rating vendor={vendor} c={c} />
      </div>
      <div style={{ ...oneLine, paddingTop: 1, paddingInlineStart: 64, paddingInlineEnd: 4, fontSize: 12.5, color: p.textTertiary }}>
        {[...vendor.tags, ...(vendor.distanceKm !== null ? [fill(w.km, { km: vendor.distanceKm.toFixed(1) })] : [])].join(" · ")}
      </div>
      <div style={{ marginTop: 8, paddingInlineStart: 4 }}>
        <Facts vendor={vendor} c={c} wrap={false} eta={false} />
      </div>
    </div>
  );
}

/** A shop as a tile: its picture, mark, name and time (`_VendorTile`). */
function VendorTile({ vendor, c }: { vendor: MarketCanvasVendor; c: Ctx }) {
  const { p, w } = c;
  const minutes = etaOf(vendor, w);
  return (
    <div data-market-vendor={vendor.id} style={{ width: 136, flex: "none" }}>
      <div style={{ position: "relative", height: 112 }}>
        <span style={{ position: "absolute", inset: 0, borderRadius: c.card.radius ?? 22, overflow: "hidden" }}>
          <Picture url={vendor.coverUrl} seed={vendor.id} p={p} icon={36} />
        </span>
        {vendor.freeDelivery ? (
          <span style={{ position: "absolute", top: 8, insetInlineStart: 8, insetInlineEnd: 8, display: "flex" }}>
            <Pill text={w.freeDelivery} background={p.success} color="#FFFFFF" />
          </span>
        ) : null}
        <span style={{ position: "absolute", insetInlineEnd: 8, bottom: -14 }}>
          <Mark vendor={vendor} size={36} p={p} />
        </span>
      </div>
      <div style={{ ...oneLine, marginTop: 8, fontSize: 14, fontWeight: 800, color: p.text }}>{vendor.name}</div>
      {minutes ? (
        <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 3 }}>
          <Icon name="schedule" size={14} color={p.primary} />
          <span style={{ fontSize: 12, fontWeight: 700, color: p.textSecondary }}>{minutes}</span>
        </div>
      ) : null}
    </div>
  );
}

/** A place in a list: a small picture and its facts (`_VendorRow`). */
function VendorRow({ vendor, c }: { vendor: MarketCanvasVendor; c: Ctx }) {
  const { p, w } = c;
  return (
    <div data-market-vendor={vendor.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px 14px" }}>
      <span style={{ width: 84, height: 84, flex: "none", borderRadius: c.card.radius ?? 20, overflow: "hidden" }}>
        <Picture url={vendor.coverUrl} seed={vendor.id} p={p} icon={28} />
      </span>
      <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ ...oneLine, maxWidth: "100%", fontSize: 15.5, fontWeight: 800, color: p.text }}>{vendor.name}</div>
        <div style={{ marginTop: 2, display: "flex", alignItems: "center", gap: 8, maxWidth: "100%", minWidth: 0 }}>
          <Rating vendor={vendor} c={c} />
          <span style={{ ...oneLine, fontSize: 12.5, color: p.textTertiary }}>{vendor.tags.join(" · ")}</span>
        </div>
        <div style={{ marginTop: 6, maxWidth: "100%" }}>
          <Facts vendor={vendor} c={c} wrap={false} />
        </div>
        {vendor.state !== "open" ? (
          <span style={{ marginTop: 6 }}>
            <Pill text={stateText(vendor, w)} background={tint(p, p.danger, 0.12)} color={p.danger} icon="hourglass_top" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 130 The places as a deck of photo cards (`style: "deck"`, as the app's
 * MarketVendorDeck): the open one in front with its club benefit, name and
 * facts over a shade, up to two more peeking behind it on the end side,
 * smaller and turned a little; the title with "1 / 3" at its end.
 */
function VendorDeck({ vendors, title, c }: { vendors: MarketCanvasVendor[]; title: string; c: Ctx }) {
  const { p } = c;
  const [front, ...rest] = vendors;
  if (!front) return null;
  const facts = (v: MarketCanvasVendor) => [...v.tags.slice(0, 1), v.etaMin !== null ? fill(c.w.minutes, { min: v.etaMin }) : null].filter(Boolean).join(" · ");
  return (
    <div data-market-deck="">
      <div style={{ display: "flex", alignItems: "flex-end", paddingInlineStart: 20, paddingInlineEnd: 20, paddingBottom: 12 }}>
        <div style={{ flex: "1 1 auto", fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: p.text }}>{title}</div>
        <span style={{ fontSize: 13, fontWeight: 700, color: p.textSecondary, fontVariantNumeric: "tabular-nums" }}>{`1 / ${vendors.length}`}</span>
      </div>
      <div style={{ position: "relative", height: 196, marginInline: 16 }}>
        {rest
          .slice(0, 2)
          .reverse()
          .map((v, i, all) => {
            const depth = all.length - i;
            return (
              <div key={v.id} aria-hidden="true" style={{ position: "absolute", top: 12 * depth, bottom: 12 * depth, insetInlineStart: 0, insetInlineEnd: -12 * depth, borderRadius: 24, overflow: "hidden", transform: `rotate(${(c.rtl ? -2 : 2) * depth}deg)`, filter: "brightness(0.85)", boxShadow: "0 12px 24px -12px rgba(0,0,0,0.5)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- the place's cover, drawn as the app draws it */}
                <img src={v.coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            );
          })}
        <div style={{ position: "absolute", inset: 0, insetInlineEnd: 44, borderRadius: 24, overflow: "hidden", boxShadow: "0 26px 40px -18px rgba(0,0,0,0.6)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- the place's cover, drawn as the app draws it */}
          <img src={front.coverUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.78))" }} />
          {front.club || front.promo ? (
            <span style={{ position: "absolute", top: 12, insetInlineStart: 12, maxWidth: "80%", ...oneLine, padding: "5px 10px", borderRadius: 999, background: p.accent, color: "#1B2A20", fontSize: 12, fontWeight: 800 }}>{front.clubBenefit ?? front.promo}</span>
          ) : null}
          <div style={{ position: "absolute", insetInlineStart: 14, insetInlineEnd: 14, bottom: 12, color: "#FFFFFF" }}>
            <div style={{ ...oneLine, fontSize: 24, fontWeight: 800, letterSpacing: -0.4 }}>{front.name}</div>
            <div style={{ ...oneLine, fontSize: 13, opacity: 0.9 }}>{facts(front)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Vendors({ market, vendors, title, text, c }:{ market: StudioMarket; vendors: MarketCanvasVendor[]; title: string; text: string; c: Ctx }) {
  const head = <Head title={title} subtitle={text} seeAll c={c} />;
  switch (market.style ?? "cards") {
    case "spotlight":
      return (
        <div>
          {head}
          <div style={scrollRow(252, 12)}>
            {vendors.map((v) => (
              <div key={v.id} style={{ width: 286, flex: "none" }}>
                <VendorCard vendor={v} c={c} />
              </div>
            ))}
          </div>
        </div>
      );
    case "chips":
      return (
        <div>
          {head}
          <div style={{ ...scrollRow(58, 10), alignItems: "center" }}>
            {vendors.map((v) => (
              <VendorChip key={v.id} vendor={v} c={c} />
            ))}
          </div>
        </div>
      );
    case "tiles":
      return (
        <div>
          {head}
          <div style={scrollRow(196, 12)}>
            {vendors.map((v) => (
              <VendorTile key={v.id} vendor={v} c={c} />
            ))}
          </div>
        </div>
      );
    case "list":
      return (
        <div>
          {head}
          {vendors.map((v) => (
            <VendorRow key={v.id} vendor={v} c={c} />
          ))}
        </div>
      );
    // 130 A deck: the first place as a photo card, the next ones peeking behind it on the end side, "1 / 3" by the title.
    case "deck":
      return <VendorDeck vendors={vendors} title={title} c={c} />;
    default:
      return (
        <div>
          {head}
          {vendors.map((v) => (
            <div key={v.id} style={{ padding: "0 16px 16px" }}>
              <VendorCard vendor={v} c={c} tall />
            </div>
          ))}
        </div>
      );
  }
}

// Order again

function whenOf(order: MarketCanvasReorder, lang: string): string {
  if (order.when) return order.when;
  if (!order.at) return "";
  try {
    return new Intl.DateTimeFormat(lang, { day: "numeric", month: "short", year: "numeric" }).format(new Date(order.at));
  } catch {
    return order.at.slice(0, 10);
  }
}

function Reorders({ data, title, text, c }: { data: MarketCanvas; title: string; text: string; c: Ctx }) {
  const { p, w } = c;
  return (
    <div>
      <Head title={title} subtitle={text} c={c} />
      <div style={scrollRow(128, 12)}>
        {data.reorders.map((order, i) => (
          <div key={`${order.vendor.id}${i}`} data-market-reorder={order.vendor.id} style={{ width: 262, flex: "none", boxSizing: "border-box", padding: 14, background: p.surface, borderRadius: 22, border: `1px solid ${p.border}`, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Mark vendor={order.vendor} size={36} p={p} />
              <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                <div style={{ ...oneLine, fontSize: 14, fontWeight: 800, color: p.text }}>{order.vendor.name}</div>
                <div style={{ fontSize: 12, color: p.textTertiary }}>{whenOf(order, c.lang)}</div>
              </div>
            </div>
            <div style={{ ...oneLine, marginTop: 8, fontSize: 13, color: p.textSecondary }}>{order.summary}</div>
            <div style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ ...oneLine, flex: "0 1 auto", fontSize: 14, fontWeight: 800, color: p.text }}>{ltrRun(order.total, c.lang)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4, flex: "none" }}>
                <Icon name="refresh" size={16} color={p.primary} />
                <span style={{ fontSize: 13, fontWeight: 800, color: p.primary }}>{w.orderAgain}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function localized(node: StudioNode, key: "title" | "text", lang: string, defaultLang: string): string {
  if (lang !== defaultLang) {
    const t = node.translations?.[lang]?.[key];
    if (typeof t === "string" && t) return t;
  }
  return node[key] ?? "";
}

/** One marketplace section drawn as the app draws it (`MarketSectionView`). */
export function MarketSection({
  node,
  lang,
  defaultLang,
  dark,
  brand,
  accent,
  color,
  data,
}: {
  node: StudioNode;
  lang: string;
  defaultLang: string;
  dark: boolean;
  brand: string;
  accent?: string | null;
  /** The element's own colour, for its accents; else the brand's. */
  color?: string;
  /** The project's marketplace; missing, the app's samples. */
  data?: MarketCanvas | null;
}) {
  const market: StudioMarket = node.market ?? { section: "vendors" };
  const p = marketPalette(brand, accent, dark);
  const hide = market.card?.hide ?? [];
  const c: Ctx = { p, w: marketWords(lang), lang, rtl: lang === "ar", card: { radius: market.card?.radius ?? null, shows: (fact) => !hide.includes(fact) } };
  const shown = canvasData(data, lang);
  const title = localized(node, "title", lang, defaultLang);
  const text = localized(node, "text", lang, defaultLang);
  const body = (() => {
    switch (market.section) {
      case "address":
        if (market.style === "bar") return <AddressBar node={node} data={shown} color={color && rgbOf(color) ? color : p.primary} text={text} c={c} />;
        return <Hero node={node} data={shown} color={color && rgbOf(color) ? color : p.primary} title={title} text={text} c={c} />;
      case "kinds":
        return <Kinds data={shown} title={title} text={text} c={c} />;
      case "offers":
        return <Offers data={shown} title={title} text={text} c={c} />;
      case "cuisines":
        return <Cuisines data={shown} title={title} text={text} c={c} />;
      case "club":
        return <Club node={node} title={title} text={text} c={c} />;
      case "reorder":
        return <Reorders data={shown} title={title} text={text} c={c} />;
      default: {
        // The places this section picks; the app's samples when the project has none that fit.
        const own = pickVendors(shown.vendors, market);
        const vendors = own.length ? own : pickVendors(marketSamples(lang).vendors, market);
        return <Vendors market={market} vendors={vendors} title={title} text={text} c={c} />;
      }
    }
  })();
  return (
    <div data-studio-market={market.section} style={{ display: "block", color: p.text }}>
      {body}
    </div>
  );
}
