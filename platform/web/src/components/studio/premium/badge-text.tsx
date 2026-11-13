import { brandGradient } from "@/lib/studio/premium-content";
import { own } from "./own";
import { alpha, Icon, tones, type PremiumProps } from "./shared";

/**
 * 129.19 A premium badge as the app draws it: a filled pill, an outline, the
 * brand's two colours as a gradient, frosted glass, or gradient words
 * without a chip (a heading's, at the element's font). Any row of a text
 * or a heading can hold one.
 */
export function BadgeText(p: PremiumProps) {
  const { node, dark, brand, accent } = p;
  const t = tones(dark);
  const style = node.badge?.style ?? "pill";
  const g = brandGradient(node, brand, accent);
  const text = own(p, "text");
  const tone = p.color ?? brand;
  if (style === "text")
    return (
      <span data-studio-badge="text" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: node.font?.size ?? 28, fontWeight: node.font?.weight ?? 900, lineHeight: 1.15 }}>
        {node.icon ? <Icon name={node.icon} size={(node.font?.size ?? 28) * 0.9} fill color={g.from} /> : null}
        <span style={{ backgroundImage: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{text}</span>
      </span>
    );
  const look =
    style === "outline"
      ? { border: `1.5px solid ${tone}`, color: tone }
      : style === "gradient"
        ? { backgroundImage: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`, color: "#FFFFFF", boxShadow: `0 6px 16px ${alpha(g.from, 0.3)}` }
        : style === "glass"
          ? { background: dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.55)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.45)", color: p.color ?? t.ink }
          : { background: alpha(tone, 0.14), color: tone };
  return (
    <span data-studio-badge={style} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 999, fontSize: node.font?.size ?? 12, fontWeight: node.font?.weight ?? 800, whiteSpace: "nowrap", ...look }}>
      {node.icon ? <Icon name={node.icon} size={(node.font?.size ?? 12) + 3} fill /> : null}
      {text}
    </span>
  );
}
