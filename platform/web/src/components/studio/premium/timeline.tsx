import type { CSSProperties } from "react";
import { entryText } from "@/lib/studio/premium-content";
import { alpha, CARD_SHADOW, Icon, tones, type PremiumProps } from "./shared";

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

/**
 * 129.15 Steps as the app draws them: a dot for each on a line, its date,
 * title and text; the steps up to the active one filled in the brand's
 * colour, the active one ringed; down the page (its dates in a column at
 * the start with `times`, the active step a card with its chip and its bar
 * with `card`), across it, or as a trip's legs with a bar over each
 * (`bars`). Dates in a monospaced font with `mono`.
 */
export function Timeline(p: PremiumProps) {
  const { node, dark, brand, lang, defaultLang } = p;
  const rtl = lang === "ar";
  const t = tones(dark);
  const entries = node.entries ?? [];
  const active = entries.findIndex((e) => e.highlight);
  const done = (i: number) => active >= 0 && i <= active;
  const o = node.timeline ?? {};
  const date: CSSProperties = o.mono ? { fontFamily: MONO, letterSpacing: 0.2 } : {};
  const dot = (i: number, icon: string | null | undefined) => (
    <span
      aria-hidden="true"
      style={{
        width: 26,
        height: 26,
        borderRadius: 13,
        flex: "none",
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: done(i) ? brand : t.card,
        border: done(i) ? undefined : `2px solid ${t.track}`,
        boxShadow: i === active ? `0 0 0 6px ${alpha(brand, 0.18)}` : undefined,
        color: "#FFFFFF",
        zIndex: 1,
      }}
    >
      {done(i) ? <Icon name={i === active ? (icon ?? "radio_button_checked") : "check"} size={16} rtl={rtl} /> : icon ? <Icon name={icon} size={14} color={t.muted} rtl={rtl} /> : null}
    </span>
  );
  if (o.style === "bars")
    return (
      <span data-studio-timeline="bars" style={{ display: "flex", gap: 10 }}>
        {entries.map((e, i) => (
          <span key={i} aria-current={i === active ? "step" : undefined} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ height: 4, borderRadius: 2, background: done(i) ? brand : t.track, opacity: done(i) && i !== active ? 0.55 : 1 }} />
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: p.color ?? t.ink, whiteSpace: "nowrap", overflow: "hidden" }}>
              {e.icon ? <Icon name={e.icon} size={16} color={done(i) ? brand : t.muted} rtl={rtl} /> : null}
              {entryText(e, "title", lang, defaultLang)}
            </span>
            <span style={{ fontSize: 11, color: t.muted, ...date }}>{entryText(e, "subtitle", lang, defaultLang)}</span>
          </span>
        ))}
      </span>
    );
  if (o.style === "horizontal")
    return (
      <span data-studio-timeline="horizontal" style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
        {entries.map((e, i) => (
          <span key={i} aria-current={i === active ? "step" : undefined} style={{ flex: "1 0 110px", display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
            <span style={{ display: "flex", alignItems: "center" }}>
              {dot(i, e.icon)}
              {i < entries.length - 1 ? <span style={{ flex: "1 1 auto", height: 2, background: done(i + 1) ? brand : t.track, marginInline: 4 }} /> : null}
            </span>
            <span style={{ fontSize: 11, color: t.muted, ...date }}>{entryText(e, "subtitle", lang, defaultLang)}</span>
            <b style={{ fontSize: 14, color: p.color ?? t.ink, paddingInlineEnd: 8 }}>{entryText(e, "title", lang, defaultLang)}</b>
            <span style={{ fontSize: 12, color: t.muted, paddingInlineEnd: 8 }}>{entryText(e, "text", lang, defaultLang)}</span>
          </span>
        ))}
      </span>
    );
  return (
    <span data-studio-timeline="vertical" style={{ display: "flex", flexDirection: "column" }}>
      {entries.map((e, i) => {
        const card = o.card && i === active;
        const chip = entryText(e, "label", lang, defaultLang);
        const share = Math.max(0, Math.min(100, e.value ?? 0));
        const words = (
          <>
            {o.times ? null : <span style={{ fontSize: 12, fontWeight: 600, color: i === active ? brand : t.muted, ...date }}>{entryText(e, "subtitle", lang, defaultLang)}</span>}
            {card && chip ? (
              <span style={{ alignSelf: "flex-start", padding: "3px 10px", borderRadius: 999, background: alpha(brand, 0.14), color: brand, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>{chip}</span>
            ) : null}
            <b style={{ fontSize: card ? 18 : 15, color: p.color ?? t.ink }}>{entryText(e, "title", lang, defaultLang)}</b>
            {card && e.value !== undefined && e.value !== null ? (
              <span style={{ height: 5, borderRadius: 3, background: t.track, overflow: "hidden", margin: "4px 0" }}>
                <span style={{ display: "block", height: "100%", width: `${share}%`, background: brand }} />
              </span>
            ) : null}
            <span style={{ fontSize: 13, lineHeight: 1.45, color: t.muted }}>{entryText(e, "text", lang, defaultLang)}</span>
          </>
        );
        return (
          <span key={i} aria-current={i === active ? "step" : undefined} data-studio-step-card={card ? "" : undefined} style={{ display: "flex", gap: 12 }}>
            {o.times ? <span style={{ width: 48, flex: "none", paddingTop: 4, fontSize: 13, fontWeight: 600, color: i === active ? brand : t.muted, ...date }}>{entryText(e, "subtitle", lang, defaultLang)}</span> : null}
            <span style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              {dot(i, e.icon)}
              {i < entries.length - 1 ? <span style={{ flex: "1 1 auto", width: 2, minHeight: 18, background: done(i + 1) ? brand : t.track, marginBlock: 4 }} /> : null}
            </span>
            <span style={card ? { flex: "1 1 auto", display: "flex", flexDirection: "column", gap: 4, padding: 14, marginBottom: 14, borderRadius: node.radius ?? 20, background: t.card, border: `1px solid ${t.edge}`, boxShadow: dark ? undefined : CARD_SHADOW, minWidth: 0 } : { display: "flex", flexDirection: "column", gap: 3, paddingBottom: 18, minWidth: 0 }}>{words}</span>
          </span>
        );
      })}
    </span>
  );
}
