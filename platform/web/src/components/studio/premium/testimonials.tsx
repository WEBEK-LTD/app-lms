import { entryText } from "@/lib/studio/premium-content";
import { CARD_SHADOW, Icon, tones, type PremiumProps } from "./shared";

/**
 * 129.11 Quote cards as the app draws them: the stars as icons, the quote,
 * the person's photo (else their initial), name and role; side by side to
 * swipe, or stacked. With a course's or a product's reviews the app shows
 * those instead (here the owner's entries, as samples).
 */
export function Testimonials(p: PremiumProps) {
  const { node, dark, brand, lang, defaultLang } = p;
  const t = tones(dark);
  const stacked = node.testimonials?.style === "stacked";
  const entries = node.entries ?? [];
  const radius = node.radius ?? 22;
  return (
    <span data-studio-testimonials={stacked ? "stacked" : "carousel"} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {node.testimonials?.reviews && p.editing ? (
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: t.muted }}>
          <Icon name="reviews" size={16} />
          {p.words.reviewsNote}
        </span>
      ) : null}
      <span style={{ display: "flex", flexDirection: stacked ? "column" : "row", gap: node.gap ?? 12, overflowX: stacked ? undefined : "auto", scrollSnapType: stacked ? undefined : "x mandatory", scrollbarWidth: "none", paddingBottom: 6 }}>
        {entries.map((e, i) => {
          const name = entryText(e, "title", lang, defaultLang);
          const stars = Math.round(e.value ?? 5);
          return (
            <span key={i} style={{ flex: stacked ? "none" : "0 0 84%", scrollSnapAlign: "start", display: "flex", flexDirection: "column", gap: 12, padding: 18, borderRadius: radius, background: t.card, border: `1px solid ${t.edge}`, boxShadow: dark ? undefined : CARD_SHADOW, color: p.color ?? t.ink, position: "relative" }}>
              <Icon name="format_quote" size={40} fill color={brand} style={{ position: "absolute", top: 10, insetInlineEnd: 14, opacity: 0.16 }} />
              <span role="img" aria-label={`${stars} / 5`} style={{ display: "flex", gap: 2 }}>
                {[0, 1, 2, 3, 4].map((s) => (
                  <Icon key={s} name="star" size={18} fill color={s < stars ? t.gold : t.track} />
                ))}
              </span>
              <span style={{ fontSize: 15, lineHeight: 1.5, fontWeight: 500 }}>{entryText(e, "text", lang, defaultLang)}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "auto" }}>
                {e.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the owner's photo, drawn as the app draws it
                  <img src={e.image_url} alt="" style={{ width: 42, height: 42, borderRadius: 21, objectFit: "cover" }} />
                ) : (
                  <span aria-hidden="true" style={{ width: 42, height: 42, borderRadius: 21, background: brand, color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                    {name.trim().charAt(0).toUpperCase() || "·"}
                  </span>
                )}
                <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <b style={{ fontSize: 14 }}>{name}</b>
                  <span style={{ fontSize: 12, color: t.muted }}>{entryText(e, "subtitle", lang, defaultLang)}</span>
                </span>
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}
