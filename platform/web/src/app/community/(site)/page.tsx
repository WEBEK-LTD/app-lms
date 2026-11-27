import Link from "next/link";
import { siteContext } from "@/components/community/site/context";
import { Composer as AskBox, Feed, Hero, Rail } from "@/components/community/site/feed";
import { cmLinks } from "@/components/community/site/links";
import { LinkSuggestion } from "@/components/community/site/link-suggest";
import { feed, stories } from "@/components/community/site/next";
import { Composer, Empty, FeedList, More, PageNote, StoryRow, withCursor } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { questions, sections, siteStats, tutorials, waiting } from "@/components/community/site/source";
import { CM_WORDS2 } from "@/components/community/site/words2";

const TABS = ["for_you", "latest", "following"] as const;
type Tab = (typeof TABS)[number];

/** 231–232 The Community's home: the hero, stories, the post composer, and the feed (posts and questions mixed: For you, Latest, Following), with the rail. */
export default async function CommunityHome({ searchParams }: { searchParams: Promise<{ tab?: string; cursor?: string; error?: string; pending?: string; done?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "for_you";
  const viewerId = viewer?.id ?? null;
  const back = tab === "for_you" ? cmLinks.home() : `${cmLinks.home()}?tab=${tab}`;
  const [all, stats, mixed, rings, wq] = await Promise.all([
    sections(lang, viewerId),
    siteStats(),
    feed(tab, sp.cursor),
    viewer ? stories() : Promise.resolve([]),
    viewer ? waiting({ viewerId, lang, limit: 20 }) : Promise.resolve({ items: [], total: 0, inMySections: 0 }),
  ]);
  // The member's followed section with the most questions waiting, for the hero ("3 questions in Stores…").
  const followed = new Set(all.filter((s) => s.followed).map((s) => s.slug));
  const bySection = new Map<string, { name: string; n: number }>();
  for (const q of wq.items) if (followed.has(q.section.slug)) bySection.set(q.section.slug, { name: q.section.name, n: (bySection.get(q.section.slug)?.n ?? 0) + 1 });
  const top = [...bySection.values()].sort((a, b) => b.n - a.n)[0];
  // Before the feed has posts (or where it can't be read), the questions' feed as before.
  const fallback = mixed.items.length ? null : await Promise.all([questions({ viewerId, lang, tab: tab === "following" ? "for_you" : tab, limit: 12 }), tutorials({ viewerId, lang, limit: 4 })]);
  const label = { for_you: w2.feedForYou, latest: w2.feedLatest, following: w2.feedFollowing };
  return (
    <SitePage active="home" rail={<Rail w={w} lang={lang} viewer={viewer} />}>
      <Hero w={w} viewer={viewer} waitingCount={top?.n ?? wq.total} topSection={top?.name ?? null} stats={stats} />
      <LinkSuggestion w={w} viewer={viewer} back={cmLinks.home()} />
      <StoryRow rings={rings} viewer={viewer} w2={w2} back={back} />
      <PageNote sp={sp} w2={w2} />
      {/* One composer: a member's post box (with Question and Show your app); signed out, the bar that leads to sign-in. */}
      {viewer ? <Composer w2={w2} back={back} viewer={viewer} more={{ question: w.question, showApp: w.showApp }} /> : <AskBox w={w} viewer={null} />}
      <div className="cm-tabs" role="tablist">
        {TABS.map((t) => (
          <Link key={t} href={t === "for_you" ? cmLinks.home() : `${cmLinks.home()}?tab=${t}`} className={t === tab ? "on" : ""} aria-current={t === tab ? "page" : undefined} role="tab" aria-selected={t === tab}>
            {label[t]}
          </Link>
        ))}
      </div>
      {mixed.items.length ? (
        <>
          <FeedList items={mixed.items} w={w} w2={w2} back={back} />
          <More href={withCursor(back, mixed.next)} w2={w2} />
        </>
      ) : fallback && (fallback[0].items.length || fallback[1].items.length) ? (
        <Feed w={w} questions={fallback[0].items} tutorials={fallback[1].items} />
      ) : (
        <Empty icon="dynamic_feed" text={w2.noPosts} />
      )}
    </SitePage>
  );
}
