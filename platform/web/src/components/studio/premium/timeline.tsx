import { entryText } from "@/lib/studio/premium-content";
import { alpha, Icon, tones, type PremiumProps } from "./shared";

/**
 * 129.15 Steps as the app draws them: a dot for each on a line, its date,
 * title and text; the steps up to the active one filled in the brand's
 * colour, the active one ringed; down the page, or across it.
 */
export function Timeline(p: PremiumProps) {
  const { node, dark, brand, lang, defaultLang } = p;
  const t = tones(dark);
  const entries = node.entries ?? [];
  const active = entries.findIndex((e) => e.highlight);
  const done = (i: number) => active >= 0 && i <= active;
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
      {done(i) ? <Icon name={i === active ? (icon ?? "radio_button_checked") : "check"} size={16} /> : icon ? <Icon name={icon} size={14} color={t.muted} /> : null}
    </span>
  );
  if (node.timeline?.style === "horizontal")
    return (
      <span data-studio-timeline="horizontal" style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none" }}>
        {entries.map((e, i) => (
          <span key={i} aria-current={i === active ? "step" : undefined} style={{ flex: "1 0 110px", display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
            <span style={{ display: "flex", alignItems: "center" }}>
              {dot(i, e.icon)}
              {i < entries.length - 1 ? <span style={{ flex: "1 1 auto", height: 2, background: done(i + 1) ? brand : t.track, marginInline: 4 }} /> : null}
            </span>
            <span style={{ fontSize: 11, color: t.muted }}>{entryText(e, "subtitle", lang, defaultLang)}</span>
            <b style={{ fontSize: 14, color: p.color ?? t.ink, paddingInlineEnd: 8 }}>{entryText(e, "title", lang, defaultLang)}</b>
            <span style={{ fontSize: 12, color: t.muted, paddingInlineEnd: 8 }}>{entryText(e, "text", lang, defaultLang)}</span>
          </span>
        ))}
      </span>
    );
  return (
    <span data-studio-timeline="vertical" style={{ display: "flex", flexDirection: "column" }}>
      {entries.map((e, i) => (
        <span key={i} aria-current={i === active ? "step" : undefined} style={{ display: "flex", gap: 14 }}>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {dot(i, e.icon)}
            {i < entries.length - 1 ? <span style={{ flex: "1 1 auto", width: 2, minHeight: 18, background: done(i + 1) ? brand : t.track, marginBlock: 4 }} /> : null}
          </span>
          <span style={{ display: "flex", flexDirection: "column", gap: 3, paddingBottom: 18, minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: i === active ? brand : t.muted }}>{entryText(e, "subtitle", lang, defaultLang)}</span>
            <b style={{ fontSize: 15, color: p.color ?? t.ink }}>{entryText(e, "title", lang, defaultLang)}</b>
            <span style={{ fontSize: 13, lineHeight: 1.45, color: t.muted }}>{entryText(e, "text", lang, defaultLang)}</span>
          </span>
        </span>
      ))}
    </span>
  );
}
