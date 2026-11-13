import { entryText } from "@/lib/studio/premium-content";
import { alpha, CARD_SHADOW, Icon, tones, type PremiumProps } from "./shared";

/** 129.17 How many cells a tile takes across and down. */
const SPAN = { small: [1, 1], wide: [2, 1], tall: [1, 2], large: [2, 2], full: [99, 1] } as const;

/**
 * 129.17 A bento grid as the app draws it: tiles of mixed sizes in
 * `columns`, each on its photo under a dark shade, its gradient, or a soft
 * card; its icon, title, text and link; its `subtitle` as a chip at its
 * top, and its words on a frosted label with `bento.caption` glass.
 */
export function Bento(p: PremiumProps) {
  const { node, dark, brand, accent, lang, defaultLang } = p;
  const t = tones(dark);
  const columns = Math.max(1, Math.min(4, node.columns ?? 2));
  const radius = node.radius ?? 22;
  return (
    <span data-studio-bento="" style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: node.bento?.row ?? 112, gridAutoFlow: "dense", gap: node.gap ?? 10 }}>
      {(node.entries ?? []).map((e, i) => {
        const [across, down] = SPAN[e.size ?? "small"];
        const photo = e.image_url;
        const filled = !!photo || !!e.gradient;
        const ink = filled ? "#FFFFFF" : (p.color ?? t.ink);
        const label = entryText(e, "label", lang, defaultLang);
        const chip = entryText(e, "subtitle", lang, defaultLang);
        const glass = node.bento?.caption === "glass";
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
            {chip ? <span data-studio-tile-chip="" style={{ position: "absolute", top: 12, insetInlineEnd: 12, padding: "4px 10px", borderRadius: 999, background: e.color ?? accent ?? "#E8B04B", color: "#0E0D24", fontSize: 11, fontWeight: 800 }}>{chip}</span> : null}
            <span style={glass ? { position: "relative", alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: 2, padding: "8px 12px", borderRadius: 16, background: "rgba(20,18,32,0.42)", backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)", border: "1px solid rgba(255,255,255,0.18)", color: "#FFFFFF" } : { position: "relative", display: "flex", flexDirection: "column", gap: 4 }}>
              <b style={{ fontSize: e.size === "large" ? 20 : 15, lineHeight: 1.2 }}>{entryText(e, "title", lang, defaultLang)}</b>
              {entryText(e, "text", lang, defaultLang) ? <span style={{ fontSize: 12, opacity: filled || glass ? 0.88 : 1, color: filled || glass ? undefined : t.muted }}>{entryText(e, "text", lang, defaultLang)}</span> : null}
            </span>
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
