"use client";

import type { CSSProperties } from "react";
import { fillCss, launchColors, mix, withAlpha, type LaunchColors, type LaunchFill } from "@/lib/studio/launch";
import type { LaunchLoader, LaunchLook } from "@/lib/studio/screens";
import "./launch.css";

/** The app's own words in the preview's language. */
export interface LaunchBrand {
  main: string;
  second: string | null;
  appName: string;
  logoUrl: string | null;
  iconUrl: string | null;
}

const SIZES = { s: 0.75, m: 0.88, l: 1, xl: 1.2 } as const;

/** Up to two letters of the name, as the app's start-up screen has them. */
function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => [...w][0]!.toUpperCase())
      .join("") || "A"
  );
}

/** The picture the logo shows: the owner's choice, falling back to the logo, the icon, then the initials. */
function logoPicture(launch: LaunchLook, brand: LaunchBrand): string | null {
  if (launch.logo === "picture" && launch.logo_url) return launch.logo_url;
  if (launch.logo === "icon") return brand.iconUrl ?? brand.logoUrl;
  return brand.logoUrl ?? brand.iconUrl;
}

/**
 * 124.15 The launch screen as the app draws it, at the phone's size
 * (390 by 844) scaled into [width]: the look, its background in light or
 * dark, the logo, the words and the loading sign, moving as in the app.
 */
export function LaunchPreview({ launch, brand, dark, title, subtitle, welcome, rtl, width = 236 }: { launch: LaunchLook; brand: LaunchBrand; dark: boolean; title: string; subtitle: string; welcome: string; rtl: boolean; width?: number }) {
  const c = launchColors(launch, { main: brand.main, second: brand.second }, dark);
  const scale = width / 390;
  const props: LookProps = { launch, brand, c, title, subtitle, welcome, rtl, k: SIZES[launch.logo_size], picture: logoPicture(launch, brand) };
  return (
    <div className="relative overflow-hidden rounded-[30px] shadow-[0_16px_40px_rgba(22,22,29,.14)]" style={{ width, height: Math.round(844 * scale) }} data-testid="launch-preview" data-look={launch.look} data-dark={dark ? "" : undefined}>
      <div dir={rtl ? "rtl" : "ltr"} className="yl-launch absolute top-0 left-0 overflow-hidden" style={{ width: 390, height: 844, transform: `scale(${scale})`, transformOrigin: "top left", fontWeight: 400 }}>
        {launch.look === "cinema" ? <Cinema {...props} /> : launch.look === "aurora" ? <Aurora {...props} /> : launch.look === "editorial" ? <Editorial {...props} /> : launch.look === "monogram" ? <Monogram {...props} /> : <Signature {...props} />}
      </div>
    </div>
  );
}

interface LookProps {
  launch: LaunchLook;
  brand: LaunchBrand;
  c: LaunchColors;
  title: string;
  subtitle: string;
  welcome: string;
  rtl: boolean;
  k: number;
  picture: string | null;
}

const abs: CSSProperties = { position: "absolute" };

function Fill({ fill, className, style }: { fill: LaunchFill; className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={className} style={{ ...abs, inset: 0, background: fillCss(fill), ...style }} />;
}

/** The logo on its tile: the picture (cover, or whole when kept as it is) or the initials in the second colour. */
function Tile({ p, size, radius, background, shadow, letters }: { p: LookProps; size: number; radius: number; background?: string; shadow?: string; letters: number }) {
  const shape = p.launch.logo_shape;
  const r = shape === "circle" ? size / 2 : radius;
  if (p.picture && shape === "as_is") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.picture} alt="" style={{ width: size, height: size, objectFit: "contain" }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: r, background, boxShadow: shadow, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flex: "none" }}>
      {p.picture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.picture} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <span style={{ fontSize: letters * (initials(p.brand.appName).length > 1 ? 0.78 : 1), fontWeight: 700, color: p.c.onTile, letterSpacing: p.rtl ? 0 : -2, lineHeight: 1 }}>{initials(p.brand.appName)}</span>
      )}
    </div>
  );
}

function tileLook(c: LaunchColors): { background: string; shadow: string } {
  if (c.tile === "brand") return { background: `linear-gradient(160deg, ${mix(c.main, "#FFFFFF", 0.08)}, ${c.main} 55%, ${mix(c.main, "#000000", 0.3)})`, shadow: `0 18px 40px ${withAlpha(c.main, 0.35)}, 0 0 0 1px ${withAlpha(c.accent, 0.35)} inset` };
  if (c.tile === "card") return { background: "linear-gradient(160deg, #1D1C36, #17162E)", shadow: `0 18px 40px rgba(0,0,0,.5), 0 0 0 1px ${withAlpha(c.accent, 0.4)} inset` };
  return { background: "rgba(255,255,255,.12)", shadow: `0 18px 40px rgba(0,0,0,.25), 0 0 0 1px rgba(255,255,255,.28) inset` };
}

/** The loading sign the owner chose, in the second colour on its track. */
function Loader({ kind, c, width, line = false, dot }: { kind: LaunchLoader; c: LaunchColors; width?: number; line?: boolean; dot: string }) {
  if (kind === "none") return null;
  if (kind === "bar") {
    return (
      <div style={{ width: width ?? 120, height: line ? 2 : 3, borderRadius: 3, background: c.track, overflow: "hidden" }}>
        <div className={line ? "yl-line" : "yl-bar"} style={{ width: line ? undefined : "40%", height: "100%", borderRadius: 3, background: c.accent }} />
      </div>
    );
  }
  if (kind === "ring") {
    return (
      <svg aria-hidden="true" width="26" height="26" viewBox="0 0 26 26" className="yl-spin">
        <circle cx="13" cy="13" r="11" fill="none" stroke={c.track} strokeWidth="2.5" />
        <circle cx="13" cy="13" r="11" fill="none" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="69" strokeDashoffset="46" />
      </svg>
    );
  }
  if (kind === "dots") {
    return (
      <div style={{ display: "flex", gap: 8 }}>
        {["yl-d1", "yl-d2", "yl-d3"].map((cls, i) => (
          <span key={cls} className={cls} style={{ width: 7, height: 7, borderRadius: "50%", background: i === 2 ? c.accent : dot }} />
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {["yl-s1", "yl-s2", "yl-s3", "yl-s4"].map((cls, i) => (
        <span key={cls} className={cls} style={{ width: 22, height: 4, borderRadius: 4, background: i === 3 ? c.accent : dot }} />
      ))}
    </div>
  );
}

function Words({ p, size, weight, gap = 8, spacing, sub = 14, center = true }: { p: LookProps; size: number; weight: number; gap?: number; spacing: number; sub?: number; center?: boolean }) {
  return (
    <>
      <div style={{ position: "relative", fontSize: size, fontWeight: weight, color: p.c.text, letterSpacing: p.rtl ? 0 : spacing, lineHeight: 1.1, textAlign: center ? "center" : "start", maxWidth: 334 }}>{p.title}</div>
      {p.subtitle ? <div style={{ position: "relative", marginTop: gap, fontSize: sub, color: p.c.muted, textAlign: center ? "center" : "start", maxWidth: 334 }}>{p.subtitle}</div> : null}
    </>
  );
}

const dotOf = (c: LaunchColors) => (c.onDark ? c.text : c.main);

function Signature(p: LookProps) {
  const { c, k } = p;
  const size = 116 * k;
  const ring = p.launch.logo_shape === "circle" ? "50%" : 40 * k;
  const t = tileLook(c);
  return (
    <div style={{ ...abs, inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Fill fill={c.screen} />
      {c.screen.kind === "color" ? <div aria-hidden="true" style={{ ...abs, inset: 0, background: `radial-gradient(420px 360px at 50% 44%, ${withAlpha(c.accent, 0.16)}, transparent 70%)` }} /> : null}
      <div style={{ position: "relative", width: 132 * k, height: 132 * k, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="yl-halo" style={{ ...abs, inset: 0, borderRadius: ring, border: `1.5px solid ${withAlpha(c.accent, 0.55)}` }} />
        <div className="yl-halo2" style={{ ...abs, inset: 0, borderRadius: ring, border: `1.5px solid ${withAlpha(c.accent, 0.4)}` }} />
        <Tile p={p} size={size} radius={34 * k} background={t.background} shadow={t.shadow} letters={60 * k} />
      </div>
      <div style={{ height: 34 }} />
      <Words p={p} size={26} weight={700} spacing={-0.4} />
      <div style={{ ...abs, bottom: 92, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Loader kind={p.launch.loader} c={c} dot={dotOf(c)} />
      </div>
    </div>
  );
}

function Cinema(p: LookProps) {
  const { c, k } = p;
  const page = c.screen.kind === "color" ? c.screen.color : c.surface;
  const fade = c.dark
    ? `linear-gradient(180deg, ${withAlpha(page, 0.25)} 0%, ${withAlpha(page, 0.2)} 30%, ${withAlpha(page, 0.82)} 62%, ${page} 82%)`
    : `linear-gradient(180deg, ${withAlpha(page, 0)} 0%, ${withAlpha(page, 0)} 34%, ${withAlpha(page, 0.85)} 58%, ${page} 68%)`;
  const tile = c.tile === "brand" ? { background: c.main, shadow: `0 12px 28px ${withAlpha(c.main, 0.3)}` } : c.tile === "card" ? { background: "rgba(23,22,46,.75)", shadow: `0 0 0 1px ${withAlpha(c.accent, 0.45)} inset` } : tileLook(c);
  return (
    <div style={{ ...abs, inset: 0 }}>
      <Fill fill={c.screen} />
      {c.picture ? (
        <>
          <div aria-hidden="true" className="yl-zoom" style={{ ...abs, top: 0, left: 0, right: 0, height: c.dark ? 844 : 560, background: fillCss(c.picture) }} />
          <div aria-hidden="true" style={{ ...abs, inset: 0, background: fade }} />
        </>
      ) : null}
      <div style={{ ...abs, left: 28, right: 28, bottom: 84, display: "flex", flexDirection: "column", gap: 14 }}>
        <Tile p={p} size={64 * k} radius={20 * k} background={tile.background} shadow={tile.shadow} letters={32 * k} />
        <div style={{ fontSize: 38, lineHeight: 1.1, fontWeight: 800, color: c.text, letterSpacing: p.rtl ? 0 : -0.8 }}>{p.title}</div>
        {p.subtitle ? <div style={{ fontSize: 15, color: c.muted }}>{p.subtitle}</div> : null}
        {p.launch.loader === "none" ? null : (
          <div style={{ marginTop: 10 }}>
            <Loader kind={p.launch.loader} c={c} width={334} line dot={dotOf(c)} />
          </div>
        )}
      </div>
    </div>
  );
}

function Aurora(p: LookProps) {
  const { c, k } = p;
  const disc = 118 * k;
  const blob = c.dark ? `color-mix(in srgb, ${c.main} 80%, white)` : c.main;
  const ring1 = c.onDark ? withAlpha("#F4EFE6", 0.3) : withAlpha(c.main, 0.35);
  return (
    <div style={{ ...abs, inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Fill fill={c.screen} />
      <div aria-hidden="true" className="yl-b1" style={{ ...abs, top: c.dark ? 60 : 90, left: c.dark ? -100 : -80, width: c.dark ? 380 : 340, height: c.dark ? 380 : 340, borderRadius: "50%", background: blob, opacity: c.dark ? 0.55 : 0.22, filter: `blur(${c.dark ? 80 : 70}px)` }} />
      <div aria-hidden="true" className="yl-b2" style={{ ...abs, bottom: c.dark ? 60 : 70, right: c.dark ? -100 : -90, width: c.dark ? 380 : 360, height: c.dark ? 380 : 360, borderRadius: "50%", background: c.second, opacity: c.dark ? 0.4 : 0.3, filter: `blur(${c.dark ? 90 : 80}px)` }} />
      <div style={{ position: "relative", width: 150 * k, height: 150 * k, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="yl-ring" style={{ ...abs, inset: 16 * k, borderRadius: "50%", border: `1.5px solid ${ring1}` }} />
        <div className="yl-ring2" style={{ ...abs, inset: 16 * k, borderRadius: "50%", border: `1.5px solid ${withAlpha(c.accent, 0.45)}` }} />
        <div style={{ width: disc, height: disc, borderRadius: "50%", background: c.onDark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.7)", border: `1px solid ${c.onDark ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.9)"}`, boxShadow: c.onDark ? "0 20px 44px rgba(0,0,0,.4)" : `0 20px 44px ${withAlpha(c.main, 0.18)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {p.picture ? (
            <Tile p={p} size={disc * 0.62} radius={disc * 0.18} letters={0} />
          ) : (
            <span style={{ fontSize: 54 * k * (initials(p.brand.appName).length > 1 ? 0.78 : 1), fontWeight: 700, color: c.onDark ? c.accent : c.main }}>{initials(p.brand.appName)}</span>
          )}
        </div>
      </div>
      <div style={{ height: 28 }} />
      <Words p={p} size={28} weight={800} spacing={-0.5} />
      <div style={{ ...abs, bottom: 88, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Loader kind={p.launch.loader} c={c} dot={dotOf(c)} />
      </div>
    </div>
  );
}

function Editorial(p: LookProps) {
  const { c, k } = p;
  const page = c.picture ? c.surface : c.screen.kind === "color" ? c.screen.color : c.surface;
  const size = 76 * k;
  const tile = c.tile === "brand" ? { background: c.main, shadow: `0 14px 30px ${withAlpha(c.main, 0.28)}` } : c.tile === "card" ? { background: "#17162E", shadow: `0 0 0 1px ${withAlpha(c.accent, 0.45)} inset, 0 14px 30px rgba(0,0,0,.5)` } : tileLook(c);
  return (
    <div style={{ ...abs, inset: 0 }}>
      <Fill fill={c.screen} />
      <div aria-hidden="true" style={{ ...abs, top: 12, left: 12, right: 12, height: 470, borderRadius: "34px 34px 180px 180px", overflow: "hidden", ...(c.picture ? { background: fillCss(c.picture) } : { background: c.onDark ? "rgba(255,255,255,.14)" : withAlpha(c.main, 0.08), boxShadow: `0 0 0 1px ${c.onDark ? "rgba(255,255,255,.22)" : withAlpha(c.main, 0.12)} inset` }) }} />
      <div style={{ ...abs, top: 440 + (76 - size) / 2, insetInlineStart: 36, padding: 0, borderRadius: p.launch.logo_shape === "circle" ? "50%" : 28 * k, border: p.picture && p.launch.logo_shape === "as_is" ? undefined : `4px solid ${page}` }}>
        <Tile p={p} size={size - 8} radius={24 * k - 4} background={tile.background} shadow={tile.shadow} letters={36 * k} />
      </div>
      <div className="yl-rise" style={{ ...abs, insetInlineStart: 36, insetInlineEnd: 36, top: 552, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: p.rtl ? 0 : 2.4, color: c.accent }}>{p.rtl ? p.welcome : p.welcome.toLocaleUpperCase()}</div>
        <div style={{ fontSize: 40, lineHeight: 1.05, fontWeight: 800, color: c.text, letterSpacing: p.rtl ? 0 : -1 }}>{p.title}</div>
        {p.subtitle ? <div style={{ fontSize: 15, color: c.muted }}>{p.subtitle}</div> : null}
      </div>
      <div style={{ ...abs, insetInlineStart: 36, bottom: 64 }}>
        <Loader kind={p.launch.loader} c={c} dot={dotOf(c)} />
      </div>
    </div>
  );
}

function Monogram(p: LookProps) {
  const { c, k } = p;
  const box = 200 * k;
  const ring = p.launch.loader === "ring";
  const track = c.onDark ? withAlpha("#F4EFE6", c.dark ? 0.1 : 0.14) : withAlpha(c.main, 0.14);
  return (
    <div style={{ ...abs, inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <Fill fill={c.screen} />
      <div aria-hidden="true" style={{ ...abs, inset: 0, background: `radial-gradient(360px 300px at 50% 46%, ${withAlpha(c.accent, 0.16)}, transparent 70%)` }} />
      <div style={{ position: "relative", width: box, height: box, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg aria-hidden="true" width={box} height={box} viewBox="0 0 200 200" className={ring ? "yl-spin" : undefined} style={{ ...abs, inset: 0 }}>
          <circle cx="100" cy="100" r="92" fill="none" stroke={track} strokeWidth="2" />
          {ring ? <circle className="yl-arc" cx="100" cy="100" r="92" fill="none" stroke={c.accent} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="578" strokeDashoffset="400" /> : null}
        </svg>
        <div className="yl-breathe">
          {p.picture ? <Tile p={p} size={104 * k} radius={28 * k} letters={0} /> : <span style={{ display: "block", fontSize: 104 * k * (initials(p.brand.appName).length > 1 ? 0.7 : 1), fontWeight: 800, color: c.accent, letterSpacing: p.rtl ? 0 : -4, lineHeight: 1 }}>{initials(p.brand.appName)}</span>}
        </div>
      </div>
      <div style={{ ...abs, bottom: 84, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {!ring && p.launch.loader !== "none" ? (
          <div style={{ marginBottom: 16 }}>
            <Loader kind={p.launch.loader} c={c} dot={dotOf(c)} />
          </div>
        ) : null}
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: p.rtl ? 0 : 5, color: c.text, textAlign: "center", padding: "0 28px" }}>{p.rtl ? p.title : p.title.toLocaleUpperCase()}</div>
        {p.subtitle ? <div style={{ fontSize: 13, color: c.muted, textAlign: "center", padding: "0 28px" }}>{p.subtitle}</div> : null}
      </div>
    </div>
  );
}
