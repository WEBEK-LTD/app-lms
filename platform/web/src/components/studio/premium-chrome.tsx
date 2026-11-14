import type { CSSProperties, ReactNode } from "react";
import type { StudioHeader } from "@/lib/pages/types";
import type { SystemLook, SystemScreenKey } from "@/lib/studio/premium-chrome";
import { chromeWords, type ChromeWords } from "@/lib/studio/premium-chrome-words";
import { alpha, appPalette, mix } from "./app-screens";

/**
 * 130.20–130.29 Premium chrome on Studio's canvas, as the app draws it
 * (mobile/lib/modules/shared/pages/premium/studio_premium_header.dart and
 * mobile/lib/modules/shared/account/premium/): the premium page headers
 * (`StudioHeader.style`, open as the page starts: the app collapses them as
 * it scrolls) with round glass buttons, the bell's dot and the back button,
 * and the system screens in their premium look on the pages drawn around
 * them. Only drawings: nothing in a system screen is an element.
 */

const ICONS: Record<string, string> = { menu: "menu", search: "search", cart: "shopping_bag", notifications: "notifications", chat: "chat", account: "person", back: "arrow_back" };

function Icon({ name, size = 21, color, fill, flip }: { name: string; size?: number; color?: string; fill?: boolean; flip?: boolean }) {
  return (
    <span className="material-symbols-rounded" aria-hidden="true" style={{ fontSize: size, width: size, height: size, lineHeight: 1, color, flex: "none", fontVariationSettings: fill ? "'FILL' 1" : undefined, transform: flip ? "scaleX(-1)" : undefined }}>
      {name}
    </span>
  );
}

/** A round glass button: on the page frosted in its colour, over a photo or the brand white glass; the bell with its dot. */
export function GlassButton({ name, onColour, dark, accent, dot, rtl }: { name: string; onColour: boolean; dark: boolean; accent: string; dot?: boolean; rtl?: boolean }) {
  const style: CSSProperties = {
    position: "relative",
    width: 38,
    height: 38,
    borderRadius: 19,
    flex: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backdropFilter: "blur(16px) saturate(1.4)",
    WebkitBackdropFilter: "blur(16px) saturate(1.4)",
    background: onColour ? "rgba(255,255,255,0.20)" : dark ? "rgba(36,34,63,0.62)" : "rgba(255,255,255,0.72)",
    border: `1px solid ${onColour ? "rgba(255,255,255,0.34)" : dark ? "rgba(255,255,255,0.10)" : "rgba(14,13,36,0.07)"}`,
    boxShadow: onColour ? "none" : dark ? "0 6px 16px rgba(0,0,0,0.30)" : "0 6px 16px rgba(14,13,36,0.08)",
    color: onColour ? "#FFFFFF" : dark ? "#F4EFE6" : "#0E0D24",
  };
  return (
    <span style={style} data-chrome-button={name}>
      <Icon name={ICONS[name] ?? name} size={20} flip={name === "back" && rtl} />
      {dot ? <span data-chrome-dot="" style={{ position: "absolute", top: 8, insetInlineEnd: 9, width: 8, height: 8, borderRadius: 4, background: accent, boxShadow: `0 0 0 2px ${onColour ? "rgba(0,0,0,0.25)" : dark ? "#24223F" : "#FFFFFF"}` }} /> : null}
    </span>
  );
}

export interface PremiumHeaderProps {
  header: StudioHeader;
  title: string;
  subtitle: string | null;
  brand: string;
  accent: string | null;
  logoUrl: string | null;
  dark: boolean;
  rtl: boolean;
  searchWord: string;
  /** A page after the first (the `title` type): the round back button first. */
  back: boolean;
  selected: boolean;
  onSelect?: () => void;
  tag?: ReactNode;
}

/** 130.20 A premium page header on the canvas, open as the page starts. */
export function PremiumHeader(props: PremiumHeaderProps) {
  const { header, dark, rtl } = props;
  const style = header.style!;
  const p = appPalette(dark, props.brand, props.accent);
  const accent = props.accent ?? "#FF5A1F";
  const page = dark ? "#14121F" : "#FBF8F2";
  const own = dark ? (header.dark_background ?? header.background) : header.background;
  const ownInk = dark ? (header.dark_color ?? header.color) : header.color;
  const onColour = style === "photo" || style === "brand";
  const ink = ownInk ?? (onColour ? "#FFFFFF" : dark ? "#F4EFE6" : "#0E0D24");
  const muted = onColour ? "rgba(255,255,255,0.82)" : alpha(ink, 0.62);
  const buttons = (header.buttons ?? []).filter((b) => b !== "menu");
  const lead: string[] = [...(props.back ? ["back"] : []), ...((header.buttons ?? []).includes("menu") ? ["menu"] : [])];
  const glass = (name: string) => <GlassButton key={name} name={name} onColour={onColour} dark={dark} accent={accent} dot={name === "notifications"} rtl={rtl} />;
  const row = (middle: ReactNode = <span style={{ flex: 1 }} />) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 40 }}>
      {lead.map(glass)}
      {middle}
      {buttons.map(glass)}
    </div>
  );
  const big = (size: number) => (
    <span role="heading" aria-level={1} style={{ fontWeight: 800, fontSize: size, lineHeight: 1.12, letterSpacing: "-0.02em", color: ink }}>
      {props.title}
    </span>
  );
  const line = props.subtitle ? <span style={{ fontSize: 13.5, color: muted, marginTop: 4 }}>{props.subtitle}</span> : null;
  const mark = props.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={props.logoUrl} alt="" style={{ height: 28, maxWidth: 130, objectFit: "contain" }} />
  ) : (
    <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.01em", color: ink }}>{props.title}</span>
  );
  const wrap: CSSProperties = { position: "relative", outline: props.selected ? "1.5px dashed #6C8BFF" : undefined, outlineOffset: -2, cursor: props.onSelect ? "pointer" : undefined };
  const click = props.onSelect ? (e: { stopPropagation: () => void }) => (e.stopPropagation(), props.onSelect!()) : undefined;
  let body: ReactNode;
  if (style === "large") {
    body = (
      <div style={{ padding: "34px 16px 10px", background: own ?? "transparent", display: "flex", flexDirection: "column" }}>
        {row()}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 10, paddingInline: 2 }}>
          {big(30)}
          {line}
        </div>
      </div>
    );
  } else if (style === "glass") {
    body = (
      <div style={{ position: "sticky", top: 0, zIndex: 3, padding: "34px 12px 10px", background: own ? alpha(own, 0.72) : dark ? "rgba(20,18,31,0.66)" : "rgba(251,248,242,0.70)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(14,13,36,0.06)"}` }}>
        {row(<span style={{ flex: 1, minWidth: 0, fontWeight: 800, fontSize: 17, color: ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingInline: 4 }}>{props.title}</span>)}
      </div>
    );
  } else if (style === "photo") {
    const cover = header.image_url ? `url("${header.image_url}") center / cover no-repeat` : `linear-gradient(135deg, ${mix(p.primary, "#000000", 0.25)}, ${p.primary} 55%, ${accent})`;
    body = (
      <div style={{ position: "relative", height: 232, background: cover, borderEndStartRadius: 26, borderEndEndRadius: 26, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.05) 38%, rgba(0,0,0,0.62) 100%)" }} />
        <div style={{ position: "relative", padding: "34px 14px 0" }}>{row()}</div>
        <div style={{ position: "relative", marginTop: "auto", padding: "0 18px 18px", display: "flex", flexDirection: "column" }}>
          {line ? <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: alpha(mix(accent, "#FFFFFF", 0.35), 0.95), marginBottom: 4 }}>{props.subtitle}</span> : null}
          {big(30)}
        </div>
      </div>
    );
  } else if (style === "brand") {
    const fill = own ?? p.primary;
    body = (
      <div style={{ padding: "34px 14px 18px", background: `linear-gradient(160deg, ${mix(fill, "#FFFFFF", dark ? 0 : 0.08)}, ${mix(fill, "#000000", 0.22)})`, borderEndStartRadius: 26, borderEndEndRadius: 26, display: "flex", flexDirection: "column", alignItems: "stretch" }}>
        {row(<span style={{ flex: 1, display: "flex", justifyContent: "center", minWidth: 0 }}>{mark}</span>)}
        {line ? <span style={{ textAlign: "center", fontSize: 13, color: muted, marginTop: 6 }}>{props.subtitle}</span> : null}
      </div>
    );
  } else {
    body = (
      <div style={{ padding: "34px 16px 12px", background: own ?? "transparent", display: "flex", flexDirection: "column", gap: 10 }}>
        {row(
          <span style={{ flex: 1, minWidth: 0, paddingInline: 2 }}>
            {big(26)}
          </span>,
        )}
        <span style={{ display: "flex", alignItems: "center", gap: 8, height: 46, borderRadius: 23, padding: "0 16px", background: dark ? "rgba(36,34,63,0.7)" : "#FFFFFF", border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(14,13,36,0.08)"}`, boxShadow: dark ? "none" : "0 6px 18px rgba(14,13,36,0.06)", color: alpha(ink, 0.55), fontSize: 14.5 }}>
          <Icon name="search" size={20} color={p.primary} />
          {props.searchWord}
        </span>
      </div>
    );
  }
  return (
    <div style={{ ...wrap, ...(style === "glass" ? { position: "sticky", top: 0, zIndex: 3 } : {}), background: style === "large" || style === "search" ? (own ?? page) : undefined }} onClick={click} data-studio-header={header.type} data-studio-header-style={style}>
      {body}
      {props.tag}
    </div>
  );
}

// ——— 130.21–130.25 The system screens in their premium look ———

interface Tone {
  p: ReturnType<typeof appPalette>;
  w: ChromeWords;
  look: SystemLook;
  rtl: boolean;
  accent: string;
}

/** The colours the rows' icon tiles take in turn: the main colour, then warm, blue and violet (lighter by night). */
function tint(t: Tone, i: number): string {
  const list = [t.p.primary, "#C77A12", "#2F6FDB", "#8A4FD8", "#1C9C6B", t.accent];
  const c = list[i % list.length]!;
  return t.p.dark ? mix(c, "#FFFFFF", 0.25) : c;
}

function cardStyle(t: Tone): CSSProperties {
  if (t.look === "glass") return { background: t.p.dark ? "rgba(36,34,63,0.55)" : "rgba(255,255,255,0.62)", backdropFilter: "blur(18px) saturate(1.4)", WebkitBackdropFilter: "blur(18px) saturate(1.4)", border: `1px solid ${t.p.dark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.8)"}`, borderRadius: 22, boxShadow: t.p.dark ? "0 10px 26px rgba(0,0,0,0.35)" : "0 10px 26px rgba(14,13,36,0.08)" };
  return { background: t.p.surface, borderRadius: 22, border: `1px solid ${t.p.dark ? t.p.border : "rgba(14,13,36,0.05)"}`, boxShadow: t.p.dark ? "none" : "0 8px 22px rgba(14,13,36,0.06)" };
}

function Row({ t, icon, i, title, value, danger, end }: { t: Tone; icon: string; i: number; title: string; value?: string; danger?: boolean; end?: ReactNode }) {
  const c = danger ? t.p.danger : tint(t, i);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", minHeight: 56, boxSizing: "border-box" }}>
      <span style={{ width: 34, height: 34, borderRadius: 11, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: alpha(c, t.p.dark ? 0.22 : 0.13) }}>
        <Icon name={icon} size={19} color={c} fill />
      </span>
      <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: danger ? 650 : 550, color: danger ? t.p.danger : t.p.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
      {value ? <span style={{ fontSize: 13.5, color: t.p.textSecondary }}>{value}</span> : null}
      {end ?? (danger ? null : <Icon name="chevron_right" size={19} color={t.p.textTertiary} flip={t.rtl} />)}
    </div>
  );
}

function Group({ t, title, children }: { t: Tone; title?: string; children: ReactNode[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {title ? <span style={{ paddingInline: 6, fontSize: 12.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: t.p.textSecondary }}>{title}</span> : null}
      <div style={{ ...cardStyle(t), overflow: "hidden" }}>
        {children.map((c, i) => (
          <div key={i} style={{ borderTop: i ? `1px solid ${t.p.divider}` : undefined, marginInlineStart: i ? 60 : 0 }}>
            {c}
          </div>
        ))}
      </div>
    </div>
  );
}

function Toggle({ on, t }: { on: boolean; t: Tone }) {
  return (
    <span aria-hidden="true" style={{ width: 46, height: 28, borderRadius: 14, flex: "none", display: "flex", alignItems: "center", justifyContent: on ? "flex-end" : "flex-start", padding: 3, boxSizing: "border-box", background: on ? t.p.primary : t.p.segment }}>
      <span style={{ width: 22, height: 22, borderRadius: 11, background: "#FFFFFF", boxShadow: "0 1px 3px rgba(0,0,0,0.25)" }} />
    </span>
  );
}

/** The hero at the top of the account: a photo or the brand under a shade, else a card in the main colour's gradient, with the person and the quick numbers. */
function ProfileHero({ t, image }: { t: Tone; image: string | null }) {
  const { p, w } = t;
  const gradient = `linear-gradient(140deg, ${mix(p.primary, "#000000", 0.28)}, ${p.primary} 60%, ${mix(p.primary, t.accent, 0.45)})`;
  const stat = (n: string, label: string) => (
    <span style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <b style={{ fontSize: 18, fontWeight: 800, color: p.text }}>{n}</b>
      <span style={{ fontSize: 12, color: p.textSecondary }}>{label}</span>
    </span>
  );
  const person = (onColour: boolean) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ width: 62, height: 62, borderRadius: 31, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: onColour ? "rgba(255,255,255,0.22)" : alpha(p.primary, 0.14), border: `2px solid ${onColour ? "rgba(255,255,255,0.7)" : alpha(p.primary, 0.3)}` }}>
        <Icon name="person" size={30} color={onColour ? "#FFFFFF" : p.primary} fill />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <b style={{ fontSize: 20, fontWeight: 800, color: onColour ? "#FFFFFF" : p.text }}>{w.sampleName}</b>
        <span dir="ltr" style={{ fontSize: 13, color: onColour ? "rgba(255,255,255,0.8)" : p.textSecondary, textAlign: t.rtl ? "right" : "left" }}>
          {w.samplePhone}
        </span>
      </span>
      <span style={{ padding: "7px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: onColour ? "rgba(255,255,255,0.22)" : alpha(p.primary, 0.12), color: onColour ? "#FFFFFF" : p.primary, border: onColour ? "1px solid rgba(255,255,255,0.35)" : "none" }}>{w.edit}</span>
    </div>
  );
  const stats = (
    <div style={{ ...cardStyle(t), display: "flex", padding: "14px 6px" }}>
      {stat("12", w.stats[0])}
      <span style={{ width: 1, background: p.divider }} />
      {stat("5", w.stats[1])}
      <span style={{ width: 1, background: p.divider }} />
      {stat("340", w.stats[2])}
    </div>
  );
  if (t.look === "photo" || t.look === "brand") {
    const bg = t.look === "photo" && image ? `url("${image}") center / cover no-repeat` : gradient;
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div data-chrome-hero={t.look} style={{ position: "relative", padding: "44px 18px 54px", background: bg, borderEndStartRadius: 28, borderEndEndRadius: 28, overflow: "hidden" }}>
          {t.look === "photo" ? <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.6))" }} /> : null}
          <div style={{ position: "relative" }}>{person(true)}</div>
        </div>
        <div style={{ margin: "-34px 16px 0", position: "relative" }}>{stats}</div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 16px 0" }}>
      <div data-chrome-hero={t.look} style={{ padding: 18, borderRadius: 26, background: t.look === "glass" ? alpha(p.primary, p.dark ? 0.5 : 0.85) : gradient, boxShadow: `0 16px 34px ${alpha(p.primary, 0.32)}`, backdropFilter: t.look === "glass" ? "blur(18px)" : undefined }}>{person(true)}</div>
      {stats}
    </div>
  );
}

export interface SystemScreenProps {
  screen: SystemScreenKey;
  look: SystemLook;
  dark: boolean;
  lang: string;
  brand: string;
  accent: string | null;
  /** The `photo` look's photo; null, the brand's gradient. */
  image: string | null;
  /** The open tab's name, the screen's large title. */
  title: string | null;
  /** Under the page's header the screen's own title isn't shown. */
  hidesTitle: boolean;
  top: number;
}

/** 130.21 One of the app's system screens in its premium look, as the app draws it. */
export function SystemScreen(props: SystemScreenProps) {
  const p = appPalette(props.dark, props.brand, props.accent);
  const w = chromeWords(props.lang);
  const t: Tone = { p, w, look: props.look, rtl: props.lang === "ar", accent: props.accent ?? "#FF5A1F" };
  const fallback = props.screen === "account" ? w.account : props.screen === "settings" ? w.settings : props.screen === "notifications" ? w.notifications : props.screen === "edit_profile" ? w.editProfile : w.myOrders;
  const title = props.title?.trim() || fallback;
  const wash = props.look === "glass" ? `radial-gradient(120% 60% at 0% 0%, ${alpha(p.primary, p.dark ? 0.35 : 0.18)}, transparent 60%), radial-gradient(90% 50% at 100% 30%, ${alpha(t.accent, p.dark ? 0.25 : 0.14)}, transparent 60%), ${p.background}` : p.background;
  const heroFirst = props.screen === "account" && (props.look === "photo" || props.look === "brand");
  const largeTitle = !props.hidesTitle && !heroFirst ? (
    <div style={{ padding: "14px 20px 6px", display: "flex", flexDirection: "column", gap: 10 }}>
      <span role="heading" aria-level={1} style={{ fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em", color: p.text }}>
        {title}
      </span>
    </div>
  ) : null;
  let body: ReactNode;
  switch (props.screen) {
    case "account":
      body = (
        <>
          <ProfileHero t={t} image={props.image} />
          <div style={{ padding: "16px 16px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
            <Group t={t} title={w.general}>
              {[<Row key="o" t={t} icon="receipt_long" i={0} title={w.rows.orders} />, <Row key="n" t={t} icon="notifications" i={1} title={w.rows.notifications} />, <Row key="s" t={t} icon="settings" i={2} title={w.rows.settings} />]}
            </Group>
            <Group t={t} title={w.support}>
              {[<Row key="h" t={t} icon="help" i={3} title={w.rows.help} />, <Row key="p" t={t} icon="shield" i={4} title={w.rows.privacy} />, <Row key="t" t={t} icon="description" i={5} title={w.rows.terms} />]}
            </Group>
            <Group t={t}>{[<Row key="x" t={t} icon="logout" i={0} title={w.rows.logOut} danger />]}</Group>
          </div>
        </>
      );
      break;
    case "settings":
      body = (
        <div style={{ padding: "8px 16px 28px", display: "flex", flexDirection: "column", gap: 16 }}>
          <Group t={t} title={w.preferences}>
            {[<Row key="l" t={t} icon="language" i={2} title={w.rows.language} value={w.languageName} />, <Row key="d" t={t} icon="dark_mode" i={3} title={w.rows.darkMode} end={<Toggle on={p.dark} t={t} />} />, <Row key="n" t={t} icon="notifications" i={1} title={w.rows.notifications} end={<Toggle on t={t} />} />]}
          </Group>
          <Group t={t} title={w.account}>
            {[<Row key="v" t={t} icon="devices" i={0} title={w.rows.devices} />, <Row key="pw" t={t} icon="lock" i={4} title={w.rows.password} />, <Row key="a" t={t} icon="info" i={5} title={w.rows.about} />]}
          </Group>
          <Group t={t}>{[<Row key="del" t={t} icon="delete" i={0} title={w.rows.deleteAccount} danger />]}</Group>
        </div>
      );
      break;
    case "notifications":
      body = (
        <div style={{ padding: "8px 16px 28px", display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ paddingInline: 6, fontSize: 12.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: p.textSecondary }}>{w.today}</span>
          {w.notes.map(([head, text], i) => (
            <div key={i} style={{ ...cardStyle(t), display: "flex", gap: 12, padding: 14, alignItems: "flex-start" }}>
              <span style={{ width: 40, height: 40, borderRadius: 14, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: alpha(tint(t, i), p.dark ? 0.22 : 0.13) }}>
                <Icon name={["local_shipping", "waving_hand", "local_offer"][i]!} size={21} color={tint(t, i)} fill />
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <b style={{ fontSize: 15, fontWeight: 700, color: p.text }}>{head}</b>
                <span style={{ fontSize: 13.5, color: p.textSecondary }}>{text}</span>
              </span>
              {i === 0 ? <span style={{ width: 9, height: 9, borderRadius: 5, background: t.accent, marginTop: 6 }} /> : null}
            </div>
          ))}
        </div>
      );
      break;
    case "edit_profile":
      body = (
        <div style={{ padding: "8px 16px 28px", display: "flex", flexDirection: "column", gap: 16, alignItems: "stretch" }}>
          <span style={{ alignSelf: "center", width: 96, height: 96, borderRadius: 48, display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(140deg, ${p.primary}, ${mix(p.primary, t.accent, 0.5)})`, boxShadow: `0 14px 30px ${alpha(p.primary, 0.3)}`, position: "relative" }}>
            <Icon name="person" size={46} color="#FFFFFF" fill />
            <span style={{ position: "absolute", bottom: 2, insetInlineEnd: 2, width: 30, height: 30, borderRadius: 15, background: p.surface, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}>
              <Icon name="photo_camera" size={16} color={p.primary} />
            </span>
          </span>
          <div style={{ ...cardStyle(t), padding: "4px 0" }}>
            {[w.fullName, w.phone, w.email].map((label, i) => (
              <div key={label} style={{ padding: "10px 16px", borderTop: i ? `1px solid ${p.divider}` : undefined, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: p.textSecondary }}>{label}</span>
                <span dir={i ? "ltr" : undefined} style={{ fontSize: 15, color: p.text, textAlign: t.rtl ? "right" : "left" }}>
                  {i === 0 ? w.sampleName : i === 1 ? w.samplePhone : "sara@example.com"}
                </span>
              </div>
            ))}
          </div>
          <span style={{ height: 52, borderRadius: 26, background: p.primary, color: p.onPrimary, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15.5, boxShadow: `0 12px 26px ${alpha(p.primary, 0.32)}` }}>{w.save}</span>
        </div>
      );
      break;
    default:
      body = (
        <div style={{ padding: "8px 16px 28px", display: "flex", flexDirection: "column", gap: 12 }}>
          {w.orders.map((o, i) => (
            <div key={i} style={{ ...cardStyle(t), display: "flex", gap: 12, padding: 14, alignItems: "center" }}>
              <span style={{ width: 48, height: 48, borderRadius: 16, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(140deg, ${alpha(tint(t, i), 0.22)}, ${alpha(tint(t, i), 0.08)})` }}>
                <Icon name={i ? "inventory_2" : "local_shipping"} size={23} color={tint(t, i)} fill />
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                <b style={{ fontSize: 15, fontWeight: 750, color: p.text }}>{o.title}</b>
                <span style={{ fontSize: 13, color: p.textSecondary }}>{o.meta}</span>
              </span>
              <span style={{ padding: "5px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, background: i ? alpha(p.success, 0.14) : alpha(t.accent, 0.16), color: i ? p.success : t.accent }}>{o.status}</span>
            </div>
          ))}
        </div>
      );
  }
  return (
    <div data-studio-screen-drawn={`system:${props.screen}:${props.look}`} style={{ flex: "1 0 auto", display: "flex", flexDirection: "column", background: wash, color: p.text, paddingTop: heroFirst ? 0 : props.top, minHeight: 300 }}>
      {largeTitle}
      {body}
    </div>
  );
}
// ——— end 130.21–130.25 ———
