import { entryText } from "@/lib/studio/premium-content";
import { tones, type PremiumProps } from "./shared";

/**
 * 129.14 Progress as the app draws it (filling once when it shows; here
 * full): bars with their label and share, or rings with the share inside
 * and the label under, in each entry's colour or the brand's.
 */
export function Progress(p: PremiumProps) {
  const { node, dark, brand, accent, lang, defaultLang } = p;
  const t = tones(dark);
  const rings = node.progress?.style === "rings";
  const entries = node.entries ?? [];
  if (rings)
    return (
      <span data-studio-progress="rings" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-around", gap: node.gap ?? 12 }}>
        {entries.map((e, i) => {
          const value = Math.max(0, Math.min(100, e.value ?? 0));
          const tone = e.color ?? brand;
          const r = 30;
          const around = 2 * Math.PI * r;
          return (
            <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 84 }}>
              <span style={{ position: "relative", width: 76, height: 76 }}>
                <svg viewBox="0 0 76 76" width={76} height={76} aria-hidden="true" style={{ transform: lang === "ar" ? "scaleX(-1) rotate(-90deg)" : "rotate(-90deg)" }}>
                  <circle cx={38} cy={38} r={r} fill="none" stroke={t.track} strokeWidth={8} />
                  <circle cx={38} cy={38} r={r} fill="none" stroke={tone} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${(around * value) / 100} ${around}`} />
                </svg>
                <bdi style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 17, color: p.color ?? t.ink }}>{Math.round(value)}%</bdi>
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.muted, textAlign: "center" }}>{entryText(e, "title", lang, defaultLang)}</span>
            </span>
          );
        })}
      </span>
    );
  return (
    <span data-studio-progress="bars" style={{ display: "flex", flexDirection: "column", gap: node.gap ?? 12 }}>
      {entries.map((e, i) => {
        const value = Math.max(0, Math.min(100, e.value ?? 0));
        const tone = e.color ?? brand;
        return (
          <span key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: p.color ?? t.ink }}>
              <span>{entryText(e, "title", lang, defaultLang)}</span>
              <bdi style={{ color: t.muted }}>{Math.round(value)}%</bdi>
            </span>
            <span style={{ height: 10, borderRadius: 5, background: t.track, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${value}%`, borderRadius: 5, background: e.color ? tone : `linear-gradient(90deg, ${brand}, ${accent ?? brand})` }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
