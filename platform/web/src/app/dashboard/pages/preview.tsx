"use client";

import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { PhoneFrame } from "@/components/device-frame";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import { cleanBlockHtml } from "@/lib/pages/html";
import { SOCIAL_LABELS, WEEKDAY_LABELS } from "@/lib/pages/labels";
import { SOURCE_NAMES } from "@/lib/pages/sources";
import { withFilledTexts } from "@/lib/pages/fill-texts";
import { translated, translatedBlock } from "@/lib/pages/translate";
import { RTL_LANGUAGES, type Appearance, type LanguageCode, type LayoutBlock, type LayoutContent, type LayoutPage } from "@/lib/pages/types";
import { useOptionalDashT } from "@/components/dashboard-i18n";
import { IconGlyph } from "./controls";

/**
 * A phone showing the draft roughly as the app draws it in the chosen
 * template, in the language being edited. Lists show the names of the
 * client's entries when we can read them (lib/hosted/pages/pickable.ts), else
 * sample cards.
 */

interface Theme {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  line: string;
  primary: string;
  secondary: string;
  radius: number;
  card: CSSProperties;
}

function themeOf(appearance: Appearance, primary: string): Theme {
  const dark = appearance.theme_mode === "dark";
  const minimal = appearance.template === "minimal";
  const radius = appearance.corners === "sharp" ? 2 : appearance.corners === "round" ? 18 : 10;
  const surface = dark ? "#1d1c30" : minimal ? "#ffffff" : "#ffffff";
  const line = dark ? "#34334a" : "#e4ded3";
  const card: CSSProperties =
    appearance.cards === "elevated"
      ? { background: surface, boxShadow: dark ? "0 2px 8px rgba(0,0,0,.5)" : "0 2px 8px rgba(14,13,36,.12)" }
      : appearance.cards === "outlined"
        ? { background: surface, border: `1px solid ${line}` }
        : { background: dark ? "#26253a" : "#f1ece3" };
  return {
    bg: dark ? "#0e0d24" : minimal ? "#ffffff" : "#faf7f2",
    surface,
    text: dark ? "#f4efe6" : "#0e0d24",
    muted: dark ? "#a9a6bd" : "#6b6880",
    line,
    primary: dark && primary.toLowerCase() === "#0e0d24" ? "#f4efe6" : primary,
    secondary: appearance.secondary_color ?? "#e8b04b",
    radius,
    card: { ...card, borderRadius: radius },
  };
}

function hostOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).hostname : null;
  } catch {
    return null;
  }
}

function Sample({ theme, n, label, layout }: { theme: Theme; n: number; label: string; layout: string }) {
  const image = <div style={{ background: theme.line, borderRadius: theme.radius, aspectRatio: layout === "list" ? "1" : "4 / 3", width: layout === "list" ? 44 : "100%" }} />;
  return (
    <div style={{ ...theme.card, padding: 6, display: "flex", flexDirection: layout === "list" ? "row" : "column", gap: 6, minWidth: layout === "carousel" ? 104 : undefined, alignItems: layout === "list" ? "center" : undefined }}>
      {image}
      <div style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label || `Entry ${n}` /* i18n-ok: the app's preview */}</div>
    </div>
  );
}

// i18n-ok-begin: the client app's own screens, in the app's language (they stay as the app shows them).
function BlockPreview({ block, theme, appearance, pickable, lang, def }: { block: LayoutBlock; theme: Theme; appearance: Appearance; pickable: Pickable; lang: LanguageCode; def: LanguageCode }) {
  const b = translatedBlock(block, lang, def);
  const bold = appearance.template === "bold";
  const title = b.title ? <div style={{ fontSize: bold ? 15 : 13, fontWeight: 800, margin: "4px 0 6px" }}>{b.title}</div> : null;
  switch (b.type) {
    case "banner":
      return (
        <div>
          {title}
          <div
            style={{
              borderRadius: theme.radius,
              minHeight: bold ? 130 : 110,
              background: b.image_url ? `center / cover no-repeat url("${encodeURI(b.image_url)}"), ${theme.primary}` : theme.primary,
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: 12,
            }}
          >
            {b.heading ? <div style={{ fontSize: bold ? 19 : 16, fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,.5)" }}>{b.heading}</div> : null}
            {b.subheading ? <div style={{ fontSize: 11, textShadow: "0 1px 3px rgba(0,0,0,.5)" }}>{b.subheading}</div> : null}
          </div>
        </div>
      );
    case "text":
      return (
        <div>
          {title}
          <div className="yallapp-preview-text" style={{ fontSize: 12, lineHeight: 1.45 }} dangerouslySetInnerHTML={{ __html: cleanBlockHtml(b.html ?? "") || `<p style="color:${theme.muted}">Text</p>` }} />
        </div>
      );
    case "image":
      return (
        <div>
          {title}
          {b.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.image_url} alt="" style={{ width: "100%", borderRadius: theme.radius, aspectRatio: b.aspect_ratio ? String(b.aspect_ratio) : undefined, objectFit: "cover", display: "block" }} />
          ) : (
            <div style={{ background: theme.line, borderRadius: theme.radius, aspectRatio: String(b.aspect_ratio ?? 1.78) }} />
          )}
        </div>
      );
    case "video":
      return (
        <div>
          {title}
          <div style={{ background: "#000", borderRadius: theme.radius, aspectRatio: "16 / 9", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <IconGlyph name="play_circle" size={36} />
          </div>
        </div>
      );
    case "button": {
      const style: CSSProperties =
        b.style === "outlined"
          ? { border: `1.5px solid ${theme.primary}`, color: theme.primary }
          : b.style === "text"
            ? { color: theme.primary }
            : { background: theme.primary, color: "#fff" };
      return (
        <div>
          {title}
          <div style={{ ...style, borderRadius: theme.radius, padding: "9px 12px", fontSize: 12, fontWeight: 700, display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
            {b.icon ? <IconGlyph name={b.icon} size={16} /> : null}
            {b.label || "Button"}
          </div>
        </div>
      );
    }
    case "items": {
      const source = b.source ?? "courses";
      const entries = pickable.items[source] ?? [];
      const ids = b.query?.ids ?? [];
      const names = ids.length ? ids.map((id) => entries.find((e) => e.id === id)?.title ?? `#${id}`) : entries.map((e) => e.title);
      const count = Math.min(ids.length || b.query?.limit || 3, b.layout === "grid" ? 4 : 3);
      const layout = b.layout ?? "carousel";
      return (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            {title ?? <div style={{ fontSize: 13, fontWeight: 800, margin: "4px 0 6px" }}>{SOURCE_NAMES[source]}</div>}
            {b.see_all ? <span style={{ fontSize: 10, color: theme.primary, fontWeight: 700 }}>See all</span> : null}
          </div>
          <div
            style={{
              display: layout === "grid" ? "grid" : "flex",
              gridTemplateColumns: "1fr 1fr",
              flexDirection: layout === "list" ? "column" : "row",
              gap: 6,
              overflow: "hidden",
            }}
          >
            {Array.from({ length: count }, (_, i) => (
              <Sample key={i} theme={theme} n={i + 1} label={names[i] ?? ""} layout={layout} />
            ))}
          </div>
        </div>
      );
    }
    case "categories": {
      const names = (pickable.categories[b.source ?? "courses"] ?? []).map((c) => c.name);
      const shown = names.length ? names.slice(0, 4) : ["Category", "Category", "Category"];
      return (
        <div>
          {title}
          <div style={{ display: b.style === "tiles" ? "grid" : "flex", gridTemplateColumns: "1fr 1fr", gap: 6, flexWrap: "nowrap", overflow: "hidden" }}>
            {shown.map((name, i) => (
              <span
                key={i}
                style={{
                  ...(b.style === "tiles" ? { ...theme.card, padding: 12 } : { border: `1px solid ${theme.line}`, borderRadius: 999, padding: "4px 10px" }),
                  fontSize: 11,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      );
    }
    case "search":
      return (
        <div>
          {title}
          <div style={{ ...theme.card, display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", color: theme.muted, fontSize: 12 }}>
            <IconGlyph name="search" size={16} />
            {b.placeholder || "Search"}
          </div>
        </div>
      );
    case "continue_learning":
      return (
        <div>
          {title}
          <div style={{ ...theme.card, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{pickable.items.courses?.[0]?.title ?? "A course in progress"}</div>
            <div style={{ height: 5, borderRadius: 3, background: theme.line }}>
              <div style={{ width: "40%", height: 5, borderRadius: 3, background: theme.secondary }} />
            </div>
          </div>
        </div>
      );
    case "embed":
      return (
        <div>
          {title}
          <div style={{ ...theme.card, height: Math.min(b.height ?? 120, 220), display: "flex", alignItems: "center", justifyContent: "center", color: theme.muted, fontSize: 11, gap: 4 }}>
            <IconGlyph name="web" size={18} />
            {hostOf(b.url) ?? "Web page"}
          </div>
        </div>
      );
    case "spacer":
      return <div style={{ height: b.size === "small" ? 8 : b.size === "large" ? 32 : 16 }} />;
    default:
      return (
        <div>
          {title}
          <MoreBlockPreview block={b} theme={theme} bold={bold} />
        </div>
      );
  }
}

// 33 The new blocks, roughly as the app draws them.

const TONES = {
  info: { bg: "#E6EEF9", text: "#1D3F72", icon: "info" },
  success: { bg: "#E3F3E8", text: "#1D5A33", icon: "check_circle" },
  warning: { bg: "#FBEFD9", text: "#7A4B0E", icon: "warning" },
} as const;

const CONTACT_BUTTONS = [
  { key: "phone", icon: "call", label: "Call" },
  { key: "whatsapp", icon: "chat", label: "WhatsApp" },
  { key: "email", icon: "mail", label: "Email" },
  { key: "address", icon: "directions", label: "Directions" },
  { key: "website", icon: "language", label: "Website" },
] as const;

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

function Small({ theme, children }: { theme: Theme; children: ReactNode }) {
  return <div style={{ color: theme.muted, fontSize: 10 }}>{children}</div>;
}

/** The minute now on the client; null on the server, so the page renders the same on both. */
function useMinute(): number | null {
  return useSyncExternalStore(
    (changed) => {
      const timer = setInterval(changed, 60_000);
      return () => clearInterval(timer);
    },
    () => Math.floor(Date.now() / 60_000),
    () => null,
  );
}

function CountdownPreview({ block: b, theme }: { block: LayoutBlock; theme: Theme }) {
  const minute = useMinute();
  const left = minute === null ? null : Math.max(0, Date.parse(b.ends_at ?? "") - minute * 60_000) || 0;
  const parts = left === null ? [null, null, null] : [Math.floor(left / 86_400_000), Math.floor(left / 3_600_000) % 24, Math.floor(left / 60_000) % 60];
  return (
    <div style={{ ...theme.card, padding: 10, display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
      <div style={{ fontSize: 12, fontWeight: 700 }}>{b.heading || "Countdown"}</div>
      <div style={{ display: "flex", gap: 8 }}>
        {parts.map((n, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: theme.primary }}>{n === null ? "--" : String(n).padStart(2, "0")}</div>
            <Small theme={theme}>{["days", "hours", "min"][i]}</Small>
          </div>
        ))}
      </div>
      {b.label ? <div style={{ fontSize: 11, fontWeight: 700, color: theme.primary }}>{b.label}</div> : null}
    </div>
  );
}

function MoreBlockPreview({ block: b, theme, bold }: { block: LayoutBlock; theme: Theme; bold: boolean }) {
  switch (b.type) {
    case "slider": {
      const first = b.slides?.[0];
      return (
        <div>
          <div
            style={{
              borderRadius: theme.radius,
              minHeight: bold ? 130 : 110,
              background: first?.image_url ? `center / cover no-repeat url("${encodeURI(first.image_url)}"), ${theme.primary}` : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              color: "#fff",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: 12,
            }}
          >
            <div style={{ fontSize: bold ? 18 : 15, fontWeight: 800, textShadow: "0 1px 3px rgba(0,0,0,.35)" }}>{first?.heading || "Slide"}</div>
            {first?.subheading ? <div style={{ fontSize: 11, textShadow: "0 1px 3px rgba(0,0,0,.35)" }}>{first.subheading}</div> : null}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 6 }}>
            {(b.slides ?? []).map((_, i) => (
              <span key={i} style={{ width: i === 0 ? 14 : 6, height: 6, borderRadius: 3, background: i === 0 ? theme.primary : theme.line }} />
            ))}
          </div>
        </div>
      );
    }
    case "quick_links": {
      const row = b.style === "row";
      return (
        <div style={{ display: row ? "flex" : "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, overflow: "hidden" }}>
          {(b.links ?? []).map((l, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: row ? 60 : undefined }}>
              <span style={{ ...theme.card, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", color: theme.primary }}>
                <IconGlyph name={l.icon} size={20} />
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, textAlign: "center", lineHeight: 1.2 }}>{l.label || "Link"}</span>
            </div>
          ))}
        </div>
      );
    }
    case "testimonials": {
      const q = b.quotes?.[0];
      return (
        <div style={{ ...theme.card, padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {q?.rating ? <div style={{ color: theme.secondary, fontSize: 12, letterSpacing: 1 }}>{"★".repeat(q.rating)}</div> : null}
          <div style={{ fontSize: 12, lineHeight: 1.4 }}>{q?.text ? `“${q.text}”` : "A quote"}</div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>
            {q?.name || "Name"}
            {q?.role ? <span style={{ color: theme.muted, fontWeight: 500 }}> · {q.role}</span> : null}
          </div>
        </div>
      );
    }
    case "faq":
      return (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {(b.questions ?? []).map((q, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, padding: "8px 0", borderBottom: `1px solid ${theme.line}`, fontSize: 12, fontWeight: 600 }}>
              {q.question || "A question"}
              <IconGlyph name="expand_more" size={16} />
            </div>
          ))}
        </div>
      );
    case "countdown":
      return <CountdownPreview block={b} theme={theme} />;
    case "contact": {
      const has = (key: (typeof CONTACT_BUTTONS)[number]["key"]) => (key === "address" ? Boolean(b.address) || (b.latitude !== null && b.latitude !== undefined) : Boolean(b[key]));
      const shown = CONTACT_BUTTONS.filter((c) => has(c.key));
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(shown.length ? shown : CONTACT_BUTTONS.slice(0, 2)).map((c) => (
            <span key={c.key} style={{ ...theme.card, display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", fontSize: 11, fontWeight: 700, color: theme.primary }}>
              <IconGlyph name={c.icon} size={15} />
              {c.label}
            </span>
          ))}
        </div>
      );
    }
    case "hours":
      return (
        <div style={{ ...theme.card, padding: 10, display: "flex", flexDirection: "column", gap: 3, fontSize: 11 }}>
          {DAYS.map((day) => {
            const periods = (b.hours ?? []).filter((h) => h.day === day);
            return (
              <div key={day} style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <span>{WEEKDAY_LABELS[day]}</span>
                <span style={{ color: periods.length ? theme.text : theme.muted }}>{periods.length ? periods.map((p) => `${p.opens}–${p.closes}`).join(", ") : "Closed"}</span>
              </div>
            );
          })}
          {b.note ? <Small theme={theme}>{b.note}</Small> : null}
        </div>
      );
    case "social":
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {(b.profiles ?? []).map((p, i) => (
            <span key={i} style={{ border: `1px solid ${theme.line}`, borderRadius: 999, padding: "4px 10px", fontSize: 11, fontWeight: 600 }}>
              {SOCIAL_LABELS[p.network]}
            </span>
          ))}
        </div>
      );
    case "team": {
      const list = b.layout === "list";
      return (
        <div style={{ display: list ? "flex" : "grid", gridTemplateColumns: b.layout === "grid" ? "1fr 1fr" : undefined, gridAutoFlow: b.layout === "carousel" ? "column" : undefined, flexDirection: "column", gap: 6, overflow: "hidden" }}>
          {(b.people ?? []).map((p, i) => (
            <div key={i} style={{ ...theme.card, padding: 8, display: "flex", flexDirection: list ? "row" : "column", alignItems: "center", gap: 6, minWidth: list ? undefined : 96 }}>
              <span style={{ width: 36, height: 36, flex: "none", borderRadius: 999, background: theme.secondary, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>
                {initials(p.name)}
              </span>
              <div style={{ textAlign: list ? "start" : "center", minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{p.name || "Name"}</div>
                {p.role ? <Small theme={theme}>{p.role}</Small> : null}
              </div>
            </div>
          ))}
        </div>
      );
    }
    case "stats":
      return (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, b.stats?.length ?? 2)}, 1fr)`, gap: 6 }}>
          {(b.stats ?? []).map((s, i) => (
            <div key={i} style={{ ...theme.card, padding: 8, textAlign: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: theme.primary }}>{s.value || "0"}</div>
              <Small theme={theme}>{s.label || "Label"}</Small>
            </div>
          ))}
        </div>
      );
    case "notice": {
      const tone = TONES[b.tone ?? "info"];
      return (
        <div style={{ background: tone.bg, color: tone.text, borderRadius: theme.radius, padding: "8px 10px", display: "flex", gap: 6, alignItems: "flex-start", fontSize: 11, fontWeight: 600 }}>
          <IconGlyph name={tone.icon} size={16} />
          <span style={{ flex: 1 }}>
            {b.text || "A notice"}
            {b.label ? <span style={{ textDecoration: "underline", marginInlineStart: 4 }}>{b.label}</span> : null}
          </span>
        </div>
      );
    }
    default:
      return null;
  }
}

// i18n-ok-end

/**
 * 33 A small, still picture of a design's home page (the Branding step and
 * "Start from a design"): the same drawing at a smaller size, hidden from
 * screen readers since the design's name and description say what it is.
 */
export function DesignThumb({ layout, app }: { layout: LayoutContent; app: { name: string; primaryColor: string } }) {
  return (
    <div aria-hidden="true" inert className="pointer-events-none flex h-[300px] justify-center overflow-hidden">
      <div style={{ zoom: 0.46 }}>
        <PhonePreview layout={layout} page={layout.pages[0] ?? null} lang={layout.languages.default} pickable={NOTHING_PICKED} app={app} onOpenPage={() => undefined} still />
      </div>
    </div>
  );
}

const NOTHING_PICKED: Pickable = { items: {}, categories: {} };

export function PhonePreview({
  layout,
  page: pageIn,
  lang,
  pickable,
  app,
  onOpenPage,
  still = false,
  builtin,
}: {
  layout: LayoutContent;
  page: LayoutPage | null;
  lang: LanguageCode;
  pickable: Pickable;
  app: { name: string; primaryColor: string };
  onOpenPage: (slug: string) => void;
  /** 33 A thumbnail: no caption and nothing scrolls. */
  still?: boolean;
  /** 43 Yallapp's translations of the texts it wrote (English text, then language), shown where the owner wrote none, as the app does. */
  builtin?: Record<string, Record<string, string>>;
}) {
  const { appearance } = layout;
  const def = layout.languages.default;
  const theme = themeOf(appearance, app.primaryColor);
  const rtl = RTL_LANGUAGES.includes(lang);
  const filled = builtin ? withFilledTexts({ languages: layout.languages, tabs: layout.tabs, pages: pageIn ? [pageIn] : [] }, [lang], (text, l) => builtin[text]?.[l] ?? null) : null;
  const tabs = filled ? filled.tabs : layout.tabs;
  const page = filled ? (filled.pages[0] ?? null) : pageIn;
  const shown = page ? translated(page, lang, def) : null;
  const classic = appearance.template === "classic";
  // 56 The dashboard's words around the phone (the phone shows the app's own language).
  const dt = useOptionalDashT();
  return (
    <figure className="m-0 flex max-w-full flex-col items-center gap-2" aria-label={still ? undefined : (dt?.("pages.phonePreview") ?? "Phone preview")}> {/* i18n-ok: English outside the dashboard */}
      {/* 19 The shared phone frame; the screen clips the content to its rounded corners. */}
      <PhoneFrame className="w-[300px]">
        <div
          dir={rtl ? "rtl" : "ltr"}
          lang={lang}
          style={{
            height: "100%",
            background: theme.bg,
            color: theme.text,
            fontFamily: `"${appearance.font}", ui-sans-serif, system-ui, sans-serif`,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              // Room for the status bar and the camera above the title.
              padding: "12cqw 14px 10px",
              background: classic ? theme.primary : theme.bg,
              color: classic ? "#fff" : theme.text,
              borderBottom: appearance.template === "minimal" ? `1px solid ${theme.line}` : undefined,
              fontWeight: 800,
              fontSize: appearance.template === "bold" ? 20 : 15,
            }}
          >
            {shown?.show_title ? shown.title : app.name}
          </div>
          <div style={{ flex: 1, overflowY: still ? "hidden" : "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
            {page?.blocks.length ? (
              page.blocks.map((block) => <BlockPreview key={block.id} block={block} theme={theme} appearance={appearance} pickable={pickable} lang={lang} def={def} />)
            ) : (
              <p style={{ color: theme.muted, fontSize: 12, textAlign: "center", marginTop: 40 }}>{dt?.("pages.addBlocksHere") ?? "Add blocks to this page." /* i18n-ok */}</p>
            )}
          </div>
          <nav style={{ display: "flex", borderTop: `1px solid ${theme.line}`, background: theme.surface, padding: "6px 4px 10px" }}>
            {tabs.map((tab) => {
              const t = translated(tab, lang, def);
              const current = tab.target.type === "page" && tab.target.page_slug === page?.slug;
              const style: CSSProperties = {
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                border: 0,
                background: "transparent",
                color: current ? theme.primary : theme.muted,
                fontSize: 10,
                fontWeight: current ? 700 : 500,
                cursor: "pointer",
                fontFamily: "inherit",
              };
              const content = (
                <>
                  <IconGlyph name={tab.icon} size={22} />
                  {t.label}
                </>
              );
              // 33 A thumbnail sits inside a design's label: no buttons in it, so the label names its radio.
              if (still) {
                return (
                  <span key={tab.id} style={style}>
                    {content}
                  </span>
                );
              }
              return (
                <button
                  key={tab.id}
                  type="button"
                  tabIndex={-1}
                  onClick={() => (tab.target.type === "page" && tab.target.page_slug ? onOpenPage(tab.target.page_slug) : undefined)}
                  style={style}
                >
                  {content}
                </button>
              );
            })}
          </nav>
        </div>
      </PhoneFrame>
      {still ? null : (
        <figcaption className="text-xs text-muted">
          {Object.values(pickable.items).some((list) => list && list.length > 0)
            ? (dt?.("pages.captionEntries") ?? "Preview of the draft. Lists show the names of your entries; pictures are placeholders.") /* i18n-ok */
            : (dt?.("pages.captionSamples") ?? "Preview of the draft. Lists show sample entries until we can read yours.") /* i18n-ok */}
        </figcaption>
      )}
    </figure>
  );
}
