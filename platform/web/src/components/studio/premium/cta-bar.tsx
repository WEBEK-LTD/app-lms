import { own } from "./own";
import { alpha, Icon, Placeholder, tones, type PremiumProps } from "./shared";

/**
 * 129.20 A call to action at the page's foot as the app draws it, above the
 * tabs while the page scrolls: a bar with its label (a price) and a button,
 * or a round floating button at the end side (with its words, a wide one).
 * A label not written yet shows only here.
 */
export function CtaBar(p: PremiumProps) {
  const { node, dark, brand, words, lang } = p;
  const t = tones(dark);
  const label = own(p, "title");
  const button = own(p, "text");
  const background = (dark ? (node.dark_background ?? node.background) : node.background) ?? brand;
  const arrow = node.icon ? <Icon name={node.icon} size={20} style={{ transform: lang === "ar" && node.icon.startsWith("arrow_") ? "scaleX(-1)" : undefined }} /> : null;
  if (node.cta?.style === "fab")
    return (
      <span data-studio-cta="fab" style={{ display: "flex", justifyContent: "flex-end", padding: "8px 16px 12px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 56, minWidth: 56, justifyContent: "center", padding: button ? "0 20px" : 0, borderRadius: 28, background, color: "#FFFFFF", fontWeight: 800, fontSize: 15, boxShadow: `0 12px 28px ${alpha(background, 0.4)}` }}>
          {node.icon ? <Icon name={node.icon} size={24} /> : null}
          {button}
        </span>
      </span>
    );
  return (
    <span data-studio-cta="bar" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: t.card, borderTop: `1px solid ${t.edge}`, borderStartStartRadius: node.radius ?? 22, borderStartEndRadius: node.radius ?? 22, boxShadow: "0 -10px 28px rgba(14,13,36,0.10)", color: p.color ?? t.ink }}>
      <span style={{ flex: "1 1 auto", minWidth: 0, fontSize: 18, fontWeight: 900 }}>{label ? <bdi>{label}</bdi> : p.editing ? <Placeholder text={words.addLabel} color={brand} /> : null}</span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 48, padding: "0 20px", borderRadius: 16, background, color: "#FFFFFF", fontWeight: 800, fontSize: 15, flex: "none" }}>
        {button}
        {arrow}
      </span>
    </span>
  );
}
