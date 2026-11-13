import { entryText, statNumber } from "@/lib/studio/premium-content";
import { alpha, CARD_SHADOW, Icon, tones, type PremiumProps } from "./shared";

/**
 * 129.13 Big numbers with their labels as the app draws them (where they
 * count up once, when they first show; here their final values): an icon
 * over each when it has one, thin lines between them, or each in a card.
 */
export function Stats(p: PremiumProps) {
  const { node, dark, brand, accent, lang, defaultLang } = p;
  const t = tones(dark);
  const cards = node.stats?.style === "cards";
  const entries = node.entries ?? [];
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
              alignItems: "center",
              textAlign: "center",
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
            <bdi style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5, color: p.color ?? (e.highlight ? tone : t.ink), fontVariantNumeric: "tabular-nums" }}>
              {entryText(e, "prefix", lang, defaultLang)}
              {statNumber(e.value ?? 0)}
              {entryText(e, "suffix", lang, defaultLang)}
            </bdi>
            <span style={{ fontSize: 12, fontWeight: 600, color: t.muted }}>{entryText(e, "title", lang, defaultLang)}</span>
          </span>
        );
      })}
    </span>
  );
}
