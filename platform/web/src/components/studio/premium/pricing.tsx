import { entryText, planPrice } from "@/lib/studio/premium-content";
import { alpha, CARD_SHADOW, Icon, Placeholder, tones, type PremiumProps } from "./shared";

/**
 * 129.12 Plan cards as the app draws them: the name, the price in the
 * platform's own money format with its period, the features with a check
 * each, a button, and the most popular plan in the brand's gradient with its
 * chip; a monthly / yearly switch over them (monthly shown here). A price
 * not set yet shows only here, for the owner to fill.
 */
export function Pricing(p: PremiumProps) {
  const { node, dark, brand, accent, lang, defaultLang, words } = p;
  const t = tones(dark);
  const radius = node.radius ?? 22;
  return (
    <span data-studio-pricing="" style={{ display: "flex", flexDirection: "column", gap: node.gap ?? 12 }}>
      {node.pricing?.yearly ? (
        <span role="presentation" style={{ alignSelf: "center", display: "flex", padding: 4, borderRadius: 999, background: t.track, fontSize: 13, fontWeight: 700 }}>
          <span style={{ padding: "6px 16px", borderRadius: 999, background: t.card, color: t.ink, boxShadow: CARD_SHADOW }}>{words.monthly}</span>
          <span style={{ padding: "6px 16px", color: t.muted }}>{words.yearly}</span>
        </span>
      ) : null}
      {(node.entries ?? []).map((e, i) => {
        const hot = e.highlight === true;
        const ink = hot ? "#FFFFFF" : (p.color ?? t.ink);
        const price = planPrice(e.price, node.pricing);
        const features = entryText(e, "text", lang, defaultLang)
          .split("\n")
          .filter((l) => l.trim());
        return (
          <span
            key={i}
            data-studio-plan={hot ? "popular" : ""}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              padding: 18,
              borderRadius: radius,
              color: ink,
              background: hot ? `linear-gradient(135deg, ${brand}, ${accent ?? brand})` : t.card,
              border: hot ? undefined : `1px solid ${t.edge}`,
              boxShadow: hot ? `0 16px 36px ${alpha(brand, 0.32)}` : dark ? undefined : CARD_SHADOW,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <b style={{ fontSize: 17 }}>{entryText(e, "title", lang, defaultLang)}</b>
              {hot ? <span style={{ padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.22)", fontSize: 11, fontWeight: 800 }}>{words.popular}</span> : null}
            </span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              {price ? (
                <>
                  <bdi style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.5 }}>{price}</bdi>
                  <span style={{ fontSize: 13, opacity: 0.75 }}>{words.perMonth}</span>
                </>
              ) : p.editing ? (
                <Placeholder text={words.setPrice} color={hot ? "#FFFFFF" : brand} />
              ) : null}
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {features.map((f, j) => (
                <span key={j} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 14 }}>
                  <Icon name="check_circle" size={18} fill color={hot ? "#FFFFFF" : brand} />
                  <span>{f}</span>
                </span>
              ))}
            </span>
            {entryText(e, "label", lang, defaultLang) ? (
              <span style={{ height: 44, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14, background: hot ? "#FFFFFF" : brand, color: hot ? brand : "#FFFFFF" }}>{entryText(e, "label", lang, defaultLang)}</span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
