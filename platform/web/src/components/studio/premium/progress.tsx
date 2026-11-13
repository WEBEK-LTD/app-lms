import type { StudioEntry } from "@/lib/pages/types";
import { entryText } from "@/lib/studio/premium-content";
import { Icon, tones, type PremiumProps } from "./shared";

/**
 * 129.14 Progress as the app draws it (filling once when it shows; here
 * full): bars with their label and share; rings of `progress.size` and
 * `stroke`, with tick marks around them and a knob at their end, holding
 * the entry's photo (its `subtitle` a chip over the photo's foot), its icon
 * or the share, the label under; or rows of short segments, as many filled
 * as the share. Each in its own colour or gradient, else the brand's.
 */
export function Progress(p: PremiumProps) {
  const { node, dark, brand, accent, lang, defaultLang } = p;
  const t = tones(dark);
  const style = node.progress?.style ?? "bars";
  const entries = node.entries ?? [];
  const rtl = lang === "ar";
  const fillOf = (e: StudioEntry) => (e.gradient ? `linear-gradient(90deg, ${e.gradient.from}, ${e.gradient.to})` : e.color ? e.color : `linear-gradient(90deg, ${brand}, ${accent ?? brand})`);
  if (style === "rings")
    return (
      <span data-studio-progress="rings" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-around", gap: node.gap ?? 12 }}>
        {entries.map((e, i) => {
          const value = Math.max(0, Math.min(100, e.value ?? 0));
          const size = node.progress?.size ?? 76;
          const stroke = node.progress?.stroke ?? 8;
          const ticks = node.progress?.ticks ?? 0;
          const gap = ticks ? 10 : 0;
          const r = size / 2 - stroke / 2 - gap;
          const around = 2 * Math.PI * r;
          const c = size / 2;
          const gid = `pg-${node.id}-${i}`;
          const tone = e.gradient ? `url(#${gid})` : (e.color ?? brand);
          const end = (value / 100) * 2 * Math.PI - Math.PI / 2;
          const chip = entryText(e, "subtitle", lang, defaultLang);
          const inner = r - stroke / 2 - 6;
          return (
            <span key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: Math.max(84, size) }}>
              <span style={{ position: "relative", width: size, height: size }}>
                {e.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- the owner's photo, drawn as the app draws it
                  <img src={e.image_url} alt="" style={{ position: "absolute", left: c - inner, top: c - inner, width: inner * 2, height: inner * 2, borderRadius: "50%", objectFit: "cover" }} />
                ) : null}
                <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true" style={{ position: "absolute", inset: 0, transform: rtl ? "scaleX(-1) rotate(-90deg)" : "rotate(-90deg)" }}>
                  {e.gradient ? (
                    <defs>
                      <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor={e.gradient.from} />
                        <stop offset="1" stopColor={e.gradient.to} />
                      </linearGradient>
                    </defs>
                  ) : null}
                  {Array.from({ length: ticks }, (_, k) => {
                    const a = (k / ticks) * 2 * Math.PI;
                    const r1 = size / 2 - 2;
                    const r2 = r1 - 4;
                    return <line key={k} x1={c + r1 * Math.cos(a)} y1={c + r1 * Math.sin(a)} x2={c + r2 * Math.cos(a)} y2={c + r2 * Math.sin(a)} stroke={t.muted} strokeOpacity={0.5} strokeWidth={1.5} strokeLinecap="round" />;
                  })}
                  <circle cx={c} cy={c} r={r} fill="none" stroke={t.track} strokeWidth={stroke} />
                  <circle cx={c} cy={c} r={r} fill="none" stroke={tone} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${(around * value) / 100} ${around}`} />
                  {node.progress?.knob && value > 0 ? <circle data-studio-progress-knob="" cx={c + r * Math.cos(end + Math.PI / 2)} cy={c + r * Math.sin(end + Math.PI / 2)} r={stroke * 0.9 + 2} fill={dark ? "#1D1B2C" : "#FFFFFF"} stroke={e.gradient?.to ?? e.color ?? brand} strokeWidth={3} /> : null}
                </svg>
                {e.image_url ? null : (
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: Math.max(13, size * 0.22), color: p.color ?? t.ink }}>
                    {e.icon ? <Icon name={e.icon} size={Math.max(16, size * 0.34)} color={e.color ?? brand} /> : <bdi>{Math.round(value)}%</bdi>}
                  </span>
                )}
                {chip && e.image_url ? <span style={{ position: "absolute", left: "50%", bottom: stroke + gap + 10, transform: "translateX(-50%)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999, background: "rgba(14,13,36,0.62)", backdropFilter: "blur(10px)", color: "#FFFFFF", fontSize: 13, fontWeight: 700 }}>{chip}</span> : null}
              </span>
              {entryText(e, "title", lang, defaultLang) ? <span style={{ fontSize: 12, fontWeight: 600, color: t.muted, textAlign: "center" }}>{entryText(e, "title", lang, defaultLang)}</span> : null}
            </span>
          );
        })}
      </span>
    );
  if (style === "segments") {
    const count = node.progress?.segments ?? 4;
    return (
      <span data-studio-progress="segments" style={{ display: "flex", flexDirection: "column", gap: node.gap ?? 12 }}>
        {entries.map((e, i) => {
          const value = Math.max(0, Math.min(100, e.value ?? 0));
          const done = (value / 100) * count;
          return (
            <span key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {entryText(e, "title", lang, defaultLang) ? <span style={{ fontSize: 13, fontWeight: 700, color: p.color ?? t.ink }}>{entryText(e, "title", lang, defaultLang)}</span> : null}
              <span style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: count }, (_, k) => {
                  const share = Math.max(0, Math.min(1, done - k));
                  return (
                    <span key={k} style={{ flex: "1 1 0", height: node.progress?.stroke ?? 4, borderRadius: 3, background: t.track, overflow: "hidden" }}>
                      <span style={{ display: "block", height: "100%", width: `${share * 100}%`, background: fillOf(e) }} />
                    </span>
                  );
                })}
              </span>
            </span>
          );
        })}
      </span>
    );
  }
  return (
    <span data-studio-progress="bars" style={{ display: "flex", flexDirection: "column", gap: node.gap ?? 12 }}>
      {entries.map((e, i) => {
        const value = Math.max(0, Math.min(100, e.value ?? 0));
        const height = node.progress?.stroke ?? 10;
        return (
          <span key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, color: p.color ?? t.ink }}>
              <span>{entryText(e, "title", lang, defaultLang)}</span>
              <bdi style={{ color: t.muted }}>{Math.round(value)}%</bdi>
            </span>
            <span style={{ height, borderRadius: height / 2, background: t.track, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${value}%`, borderRadius: height / 2, background: fillOf(e) }} />
            </span>
          </span>
        );
      })}
    </span>
  );
}
