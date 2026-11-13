import { entryText, statNumber } from "@/lib/studio/premium-content";
import { alpha, CARD_SHADOW, Icon, tones, type PremiumProps } from "./shared";

/**
 * 129.13 Big numbers with their labels as the app draws them (where they
 * count up once, when they first show; here their final values): an icon
 * over each when it has one, thin lines between them, or each in a card;
 * at the element's font (from 40 up, the text before and after is small
 * beside the number: "6 min"), centred or at the start.
 */
export function Stats(p: PremiumProps) {
  const { node, dark, brand, accent, lang, defaultLang } = p;
  const t = tones(dark);
  const cards = node.stats?.style === "cards";
  const entries = node.entries ?? [];
  const size = node.font?.size ?? 28;
  const big = size >= 40;
  const at = node.stats?.start ? "flex-start" : "center";
  const small = { fontSize: Math.max(12, size * 0.36), fontWeight: 700, letterSpacing: 0 };
  return (
    <span data-studio-stats={cards ? "cards" : "plain"} style={{ display: "flex", gap: cards ? (node.gap ?? 10) : 0, alignItems: "stretch" }}>
      {entries.map((e, i) => {
        const tone = e.color ?? (e.highlight ? (accent ?? brand) : brand);
        return (
          <span
            key={i}
            style={{
              flex: "1 1 0",
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: at,
              textAlign: node.stats?.start ? "start" : "center",
              gap: 4,
              padding: cards ? "14px 8px" : "4px 6px",
              borderRadius: cards ? (node.radius ?? 18) : undefined,
              background: cards ? t.card : undefined,
              border: cards ? `1px solid ${t.edge}` : undefined,
              boxShadow: cards && !dark ? CARD_SHADOW : undefined,
              borderInlineStart: !cards && node.stats?.dividers && i > 0 ? `1px solid ${t.edge}` : undefined,
            }}
          >
            {e.icon ? (
              <span style={{ width: 36, height: 36, borderRadius: 12, background: alpha(tone, 0.14), display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                <Icon name={e.icon} size={20} fill color={tone} />
              </span>
            ) : null}
            <bdi style={{ fontSize: size, lineHeight: 1, fontWeight: node.font?.weight ?? 900, letterSpacing: big ? -1.5 : -0.5, color: p.color ?? (e.highlight ? tone : t.ink), fontVariantNumeric: "tabular-nums" }}>
              {big ? <span style={small}>{entryText(e, "prefix", lang, defaultLang)}</span> : entryText(e, "prefix", lang, defaultLang)}
              {statNumber(e.value ?? 0)}
              {big ? <span style={small}>{entryText(e, "suffix", lang, defaultLang)}</span> : entryText(e, "suffix", lang, defaultLang)}
            </bdi>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.muted }}>{entryText(e, "title", lang, defaultLang)}</span>
          </span>
        );
      })}
    </span>
  );
}
