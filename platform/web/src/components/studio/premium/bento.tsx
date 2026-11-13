import { entryText } from "@/lib/studio/premium-content";
import { alpha, CARD_SHADOW, Icon, tones, type PremiumProps } from "./shared";

/** 129.17 How many cells a tile takes across and down. */
const SPAN = { small: [1, 1], wide: [2, 1], tall: [1, 2], large: [2, 2] } as const;

/**
 * 129.17 A bento grid as the app draws it: tiles of mixed sizes in
 * `columns`, each on its photo under a dark shade, its gradient, or a soft
 * card; its icon, title, text and link.
 */
export function Bento(p: PremiumProps) {
  const { node, dark, brand, lang, defaultLang } = p;
  const t = tones(dark);
  const columns = Math.max(1, Math.min(4, node.columns ?? 2));
  const radius = node.radius ?? 22;
  return (
    <span data-studio-bento="" style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: 112, gridAutoFlow: "dense", gap: node.gap ?? 10 }}>
      {(node.entries ?? []).map((e, i) => {
        const [across, down] = SPAN[e.size ?? "small"];
        const photo = e.image_url;
        const filled = !!photo || !!e.gradient;
        const ink = filled ? "#FFFFFF" : (p.color ?? t.ink);
        const label = entryText(e, "label", lang, defaultLang);
        return (
          <span
            key={i}
            data-studio-tile={e.size ?? "small"}
            style={{
              gridColumn: `span ${Math.min(across, columns)}`,
              gridRow: `span ${down}`,
              position: "relative",
              overflow: "hidden",
              borderRadius: radius,
              padding: 14,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              gap: 4,
              color: ink,
              background: e.gradient ? `linear-gradient(${e.gradient.angle ?? 180}deg, ${e.gradient.from}, ${e.gradient.to})` : t.card,
              border: filled ? undefined : `1px solid ${t.edge}`,
              boxShadow: dark ? undefined : CARD_SHADOW,
            }}
          >
            {photo ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- the owner's photo, drawn as the app draws it */}
                <img src={photo} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <span aria-hidden="true" style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.65))" }} />
              </>
            ) : null}
            {e.icon ? (
              <span style={{ position: "absolute", top: 12, insetInlineStart: 12, width: 34, height: 34, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", background: filled ? "rgba(255,255,255,0.22)" : alpha(e.color ?? brand, 0.14) }}>
                <Icon name={e.icon} size={19} fill color={filled ? "#FFFFFF" : (e.color ?? brand)} />
              </span>
            ) : null}
            <b style={{ position: "relative", fontSize: e.size === "large" ? 20 : 15, lineHeight: 1.2 }}>{entryText(e, "title", lang, defaultLang)}</b>
            {entryText(e, "text", lang, defaultLang) ? <span style={{ position: "relative", fontSize: 12, opacity: filled ? 0.88 : 1, color: filled ? undefined : t.muted }}>{entryText(e, "text", lang, defaultLang)}</span> : null}
            {label ? (
              <span style={{ position: "relative", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, marginTop: 2, color: filled ? "#FFFFFF" : brand }}>
                {label}
                <Icon name="arrow_forward" size={15} style={{ transform: lang === "ar" ? "scaleX(-1)" : undefined }} />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
