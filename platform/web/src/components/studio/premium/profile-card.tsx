import type { ReactNode } from "react";
import type { SocialNetwork } from "@/lib/pages/types";
import { CARD_SHADOW, Icon, tones, type PremiumProps } from "./shared";

/** Material Symbols has no brand marks: a plain icon for each network, as the app's social block draws them. */
export const SOCIAL_ICONS: Record<SocialNetwork, string> = {
  instagram: "photo_camera",
  facebook: "group",
  x: "forum",
  tiktok: "music_note",
  youtube: "smart_display",
  linkedin: "work",
  snapchat: "photo_camera",
  telegram: "send",
  whatsapp_channel: "campaign",
};

/**
 * 129.16 A person's or a place's card as the app draws it: the cover photo
 * (else the brand's gradient), the round photo (a place's rounded square)
 * over its foot, the name and role, what the card holds (badges, two
 * buttons) and its social links.
 */
export function ProfileCard(p: PremiumProps & { front: ReactNode }) {
  const { node, dark, brand, accent, lang, defaultLang } = p;
  const t = tones(dark);
  const square = node.profile?.shape === "square";
  const cover = node.profile?.cover_url;
  const own = (field: "title" | "text") => (lang !== defaultLang && (node.translations?.[lang]?.[field] as string | undefined)) || node[field] || "";
  const name = own("title");
  const role = own("text");
  const background = (dark ? (node.dark_background ?? node.background) : node.background) ?? t.card;
  const pad = node.padding ?? {};
  return (
    <span data-studio-profile-card="" style={{ display: "flex", flexDirection: "column", borderRadius: node.radius ?? 26, overflow: "hidden", background, border: `1px solid ${t.edge}`, boxShadow: dark ? undefined : CARD_SHADOW, color: p.color ?? t.ink }}>
      <span style={{ position: "relative", height: 120, background: `linear-gradient(135deg, ${brand}, ${accent ?? brand})` }}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- the owner's photo, drawn as the app draws it
          <img src={cover} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}
      </span>
      <span style={{ alignSelf: "center", marginTop: -46, width: 92, height: 92, borderRadius: square ? 24 : 46, border: `4px solid ${background}`, background: brand, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFFFFF", fontSize: 32, fontWeight: 800, zIndex: 1 }}>
        {node.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- the owner's photo, drawn as the app draws it
          <img src={node.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          name.trim().charAt(0).toUpperCase() || <Icon name="person" size={40} />
        )}
      </span>
      <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 16px 0", textAlign: "center" }}>
        <b style={{ fontSize: 20, fontWeight: 800 }}>{name}</b>
        {role ? <span style={{ fontSize: 13, color: t.muted }}>{role}</span> : null}
      </span>
      <span style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: node.gap ?? 12, paddingTop: 12, paddingInlineEnd: pad.end ?? 16, paddingBottom: pad.bottom ?? 18, paddingInlineStart: pad.start ?? 16 }}>
        {p.front}
        {node.profile?.socials?.length ? (
          <span style={{ display: "flex", justifyContent: "center", gap: 10 }}>
            {node.profile.socials.map((s) => (
              <span key={s.network} title={s.network} style={{ width: 38, height: 38, borderRadius: 19, background: t.track, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={SOCIAL_ICONS[s.network]} size={19} />
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </span>
  );
}
