"use client";

import type { CSSProperties } from "react";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import { cleanBlockHtml } from "@/lib/pages/html";
import { SOURCE_NAMES } from "@/lib/pages/sources";
import { translated } from "@/lib/pages/translate";
import { RTL_LANGUAGES, type Appearance, type LanguageCode, type LayoutBlock, type LayoutContent, type LayoutPage } from "@/lib/pages/types";
import { IconGlyph } from "./controls";

/**
 * A phone showing the draft roughly as the app draws it in the chosen
 * template, in the language being edited. Lists show sample cards.
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
      <div style={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label || `Entry ${n}`}</div>
    </div>
  );
}

function BlockPreview({ block, theme, appearance, pickable, lang, def }: { block: LayoutBlock; theme: Theme; appearance: Appearance; pickable: Pickable; lang: LanguageCode; def: LanguageCode }) {
  const b = translated(block, lang, def);
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
  }
}

export function PhonePreview({
  layout,
  page,
  lang,
  pickable,
  app,
  onOpenPage,
}: {
  layout: LayoutContent;
  page: LayoutPage | null;
  lang: LanguageCode;
  pickable: Pickable;
  app: { name: string; primaryColor: string };
  onOpenPage: (slug: string) => void;
}) {
  const { appearance } = layout;
  const def = layout.languages.default;
  const theme = themeOf(appearance, app.primaryColor);
  const rtl = RTL_LANGUAGES.includes(lang);
  const shown = page ? translated(page, lang, def) : null;
  const classic = appearance.template === "classic";
  return (
    <figure className="m-0 flex flex-col items-center gap-2" aria-label="Phone preview">
      <div
        dir={rtl ? "rtl" : "ltr"}
        lang={lang}
        style={{
          width: 300,
          height: 600,
          borderRadius: 36,
          border: "10px solid #0e0d24",
          background: theme.bg,
          color: theme.text,
          fontFamily: `"${appearance.font}", ui-sans-serif, system-ui, sans-serif`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "16px 14px 10px",
            background: classic ? theme.primary : theme.bg,
            color: classic ? "#fff" : theme.text,
            borderBottom: appearance.template === "minimal" ? `1px solid ${theme.line}` : undefined,
            fontWeight: 800,
            fontSize: appearance.template === "bold" ? 20 : 15,
          }}
        >
          {shown?.show_title ? shown.title : app.name}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {page?.blocks.length ? (
            page.blocks.map((block) => <BlockPreview key={block.id} block={block} theme={theme} appearance={appearance} pickable={pickable} lang={lang} def={def} />)
          ) : (
            <p style={{ color: theme.muted, fontSize: 12, textAlign: "center", marginTop: 40 }}>Add blocks to this page.</p>
          )}
        </div>
        <nav style={{ display: "flex", borderTop: `1px solid ${theme.line}`, background: theme.surface, padding: "6px 4px 10px" }}>
          {layout.tabs.map((tab) => {
            const t = translated(tab, lang, def);
            const current = tab.target.type === "page" && tab.target.page_slug === page?.slug;
            return (
              <button
                key={tab.id}
                type="button"
                tabIndex={-1}
                onClick={() => (tab.target.type === "page" && tab.target.page_slug ? onOpenPage(tab.target.page_slug) : undefined)}
                style={{
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
                }}
              >
                <IconGlyph name={tab.icon} size={22} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
      <figcaption className="text-xs text-muted">Preview of the draft. Lists show sample entries.</figcaption>
    </figure>
  );
}
