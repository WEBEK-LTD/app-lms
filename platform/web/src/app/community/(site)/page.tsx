import { siteContext } from "@/components/community/site/context";
import { Composer, Feed, FeedTabs, feedTab, Hero, Rail } from "@/components/community/site/feed";
import { cmLinks } from "@/components/community/site/links";
import { LinkSuggestion } from "@/components/community/site/link-suggest";
import { SitePage } from "@/components/community/site/page";
import { questions, sections, siteStats, tutorials, waiting } from "@/components/community/site/source";

/** 231 The Community's home: the hero, the composer, the feed's tabs and the feed, with the rail. */
export default async function CommunityHome({ searchParams }: { searchParams: Promise<{ tab?: string; section?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const tab = feedTab(sp.tab);
  const viewerId = viewer?.id ?? null;
  const [all, stats, feed, tuts, wq] = await Promise.all([
    sections(lang, viewerId),
    siteStats(),
    questions({ viewerId, lang, tab, section: sp.section, limit: 12 }),
    tutorials({ viewerId, lang, section: sp.section, limit: 4 }),
    viewer ? waiting({ viewerId, lang, limit: 20 }) : Promise.resolve({ items: [], total: 0, inMySections: 0 }),
  ]);
  // The member's followed section with the most questions waiting, for the hero ("3 questions in Stores…").
  const followed = new Set(all.filter((s) => s.followed).map((s) => s.slug));
  const bySection = new Map<string, { name: string; n: number }>();
  for (const q of wq.items) if (followed.has(q.section.slug)) bySection.set(q.section.slug, { name: q.section.name, n: (bySection.get(q.section.slug)?.n ?? 0) + 1 });
  const top = [...bySection.values()].sort((a, b) => b.n - a.n)[0];
  return (
    <SitePage active="home" rail={<Rail w={w} lang={lang} viewer={viewer} />}>
      <Hero w={w} viewer={viewer} waitingCount={top?.n ?? wq.total} topSection={top?.name ?? null} stats={stats} />
      <LinkSuggestion w={w} viewer={viewer} back={cmLinks.home()} />
      <Composer w={w} viewer={viewer} />
      <FeedTabs w={w} tab={tab} section={sp.section} sections={all} base={(q) => (q.tab || q.section ? `${cmLinks.home()}?${new URLSearchParams(Object.entries(q).filter((e): e is [string, string] => !!e[1])).toString()}` : cmLinks.home())} />
      <Feed w={w} questions={feed.items} tutorials={tab === "unanswered" ? [] : tuts.items} />
    </SitePage>
  );
}
