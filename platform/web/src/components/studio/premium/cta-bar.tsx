import { own } from "./own";
import { alpha, Icon, Placeholder, tones, type PremiumProps } from "./shared";

/**
 * 129.20 A call to action at the page's foot as the app draws it, above the
 * tabs while the page scrolls: a bar with its label (a price) and a button,
 * a floating rounded card (`card`), or a round floating button at the end
 * side (with its words, a wide one). The label's first line is its title,
 * the next ones under it, smaller; `cta.lead` an icon on a soft tile at the
 * start. A label not written yet shows only here.
 */
export function CtaBar(p: PremiumProps) {
  const { node, dark, brand, words, lang } = p;
  const rtl = lang === "ar";
  const t = tones(dark);
  const label = own(p, "title");
  const button = own(p, "text");
  const background = (dark ? (node.dark_background ?? node.background) : node.background) ?? brand;
  const arrow = node.icon ? <Icon name={node.icon} size={20} rtl={rtl} /> : null;
  if (node.cta?.style === "fab")
    return (
      <span data-studio-cta="fab" style={{ display: "flex", justifyContent: "flex-end", padding: "8px 16px 12px" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 56, minWidth: 56, justifyContent: "center", padding: button ? "0 20px" : 0, borderRadius: 28, background, color: "#FFFFFF", fontWeight: 800, fontSize: 15, boxShadow: `0 12px 28px ${alpha(background, 0.4)}` }}>
          {node.icon ? <Icon name={node.icon} size={24} rtl={rtl} /> : null}
          {button}
        </span>
      </span>
    );
  const card = node.cta?.style === "card";
  const [first, ...rest] = label.split("\n");
  const lead = node.cta?.lead;
  return (
    <span
      data-studio-cta={card ? "card" : "bar"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: card ? 14 : "12px 16px",
        margin: card ? "8px 16px 12px" : undefined,
        background: t.card,
        border: card ? `1px solid ${t.edge}` : undefined,
        borderTop: `1px solid ${t.edge}`,
        borderRadius: card ? (node.radius ?? 22) : undefined,
        borderStartStartRadius: node.radius ?? 22,
        borderStartEndRadius: node.radius ?? 22,
        boxShadow: card ? "0 14px 32px rgba(14,13,36,0.14)" : "0 -10px 28px rgba(14,13,36,0.10)",
        color: p.color ?? t.ink,
      }}
    >
      {lead ? (
        <span style={{ width: 48, height: 48, borderRadius: 14, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", background: alpha(brand, 0.14), color: brand }}>
          <Icon name={lead} size={24} rtl={rtl} />
        </span>
      ) : null}
      <span style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {label ? (
          <>
            <bdi style={{ fontSize: rest.length ? 16 : 18, fontWeight: 900 }}>{first}</bdi>
            {rest.length ? <span style={{ fontSize: 13, color: t.muted }}>{rest.join(" ")}</span> : null}
          </>
        ) : p.editing ? (
          <Placeholder text={words.addLabel} color={brand} />
        ) : null}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 48, padding: "0 20px", borderRadius: 16, background, color: "#FFFFFF", fontWeight: 800, fontSize: 15, flex: "none" }}>
        {button}
        {arrow}
      </span>
    </span>
  );
}
