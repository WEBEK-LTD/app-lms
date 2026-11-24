import { ok, type CommunityContext, type CommunityResult } from "../api/http";
import { groupsCreatePolicy } from "../api/trust-hooks";
import { t } from "../i18n";
import { LEVELS } from "../levels";
import { COMMUNITY_LANGUAGES } from "../types";

/**
 * 231 The community's sections, in the side menu's order (design/mobile.html:
 * Home, Q&A, Tutorials, Academy, Showcase, Challenges, Groups, Friends,
 * Pros, Events) and the tab bar's (Home, Q&A, create, Learn, Groups). Phase
 * 1 has Home, Q&A, Tutorials (Learn) and Friends; the others show "Coming
 * soon" and open nothing. Icons are Material Symbols Rounded.
 */
export const COMMUNITY_SECTIONS = [
  { slug: "home", icon: "home", live: true },
  { slug: "qa", icon: "forum", live: true },
  { slug: "tutorials", icon: "menu_book", live: true },
  { slug: "academy", icon: "school", live: false },
  { slug: "showcase", icon: "apps", live: false },
  { slug: "challenges", icon: "emoji_events", live: false },
  { slug: "groups", icon: "groups", live: false },
  { slug: "friends", icon: "diversity_3", live: true },
  { slug: "pros", icon: "work", live: false },
  { slug: "events", icon: "event", live: false },
] as const;

export const COMMUNITY_TABS = [
  { slug: "home", icon: "home", live: true },
  { slug: "qa", icon: "forum", live: true },
  { slug: "create", icon: "add", live: true },
  { slug: "learn", icon: "school", live: true },
  { slug: "groups", icon: "groups", live: false },
] as const;

export async function getConfig(ctx: CommunityContext): Promise<CommunityResult> {
  const section = (s: { slug: string; icon: string; live: boolean }) => ({ slug: s.slug, name: t(ctx.lang, `section.${s.slug}`), icon: s.icon, coming_soon: !s.live });
  return ok({
    languages: COMMUNITY_LANGUAGES,
    default_language: "en",
    sections: COMMUNITY_SECTIONS.map(section),
    tabs: COMMUNITY_TABS.map(section),
    levels: LEVELS.map((l) => ({ key: l.key, name: t(ctx.lang, `rank.${l.key}`), min_points: l.minPoints })),
    groups_create_policy: await groupsCreatePolicy(ctx),
    site_url: ctx.deps.siteUrl,
  });
}
