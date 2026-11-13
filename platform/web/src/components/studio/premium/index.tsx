import type { ReactNode } from "react";
import { BadgeText } from "./badge-text";
import { CtaBar } from "./cta-bar";
import { Bento } from "./bento";
import { Pricing } from "./pricing";
import { ProfileCard } from "./profile-card";
import { Progress } from "./progress";
import type { PremiumProps } from "./shared";
import { Stats } from "./stats";
import { Testimonials } from "./testimonials";
import { Timeline } from "./timeline";

export { PREMIUM_WORDS_EN, surfaceStyle, type PremiumWords } from "./shared";

/** 129.11–129.20 The premium content elements, each drawn as the app draws it (null for any other type). */
export function PremiumElement(p: PremiumProps & { front?: ReactNode }): ReactNode {
  switch (p.node.type) {
    case "testimonials":
      return <Testimonials {...p} />;
    case "pricing":
      return <Pricing {...p} />;
    case "stats":
      return <Stats {...p} />;
    case "progress":
      return <Progress {...p} />;
    case "timeline":
      return <Timeline {...p} />;
    case "bento":
      return <Bento {...p} />;
    case "profile_card":
      return <ProfileCard {...p} front={p.front ?? null} />;
    case "badge_text":
      return <BadgeText {...p} />;
    case "cta_bar":
      return <CtaBar {...p} />;
    default:
      return null;
  }
}

/** 129.11–129.20 Whether the element is one of these (they draw their own corners and cards). */
export function isPremiumContent(type: string): boolean {
  return ["testimonials", "pricing", "stats", "progress", "timeline", "bento", "profile_card", "badge_text", "cta_bar"].includes(type);
}
