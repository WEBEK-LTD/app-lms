import type { Metadata } from "next";
import Link from "next/link";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { showcase } from "@/components/community/site/next";
import { Empty, More, PageHead, ShowcaseCard, withCursor } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { CM_WORDS2, SHOWCASE_TYPES as TYPES } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Showcase" };


/** 232 The showcase gallery: apps members built, by type, newest or most liked. */
export default async function ShowcasePage({ searchParams }: { searchParams: Promise<{ type?: string; sort?: string; cursor?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const sort = sp.sort === "most_liked" ? "most_liked" : "newest";
  const type = TYPES.find((t) => t === sp.type);
  const list = await showcase({ type, sort, cursor: sp.cursor });
  const here = cmLinks.showcase({ type, sort: sort === "newest" ? undefined : sort });
  const chip = (q: { type?: string; sort?: string }, label: string, on: boolean) => (
    <Link key={`${q.type ?? ""}-${q.sort ?? ""}-${label}`} href={cmLinks.showcase(q)} className={on ? "on" : ""} aria-pressed={on}>{label}</Link>
  );
  return (
    <SitePage active="showcase">
      <PageHead title={w2.showcaseTitle} intro={w2.showcaseIntro}>
        <Link href={viewer ? cmLinks.showcaseNew() : cmLinks.signIn(cmLinks.showcaseNew())} className="cm-btn o"><span className="ms" aria-hidden="true">add</span>{w2.showYourApp}</Link>
      </PageHead>
      <div className="cm-tabs">
        {chip({ type, sort: undefined }, w2.sortNewest, sort === "newest")}
        {chip({ type, sort: "most_liked" }, w2.sortLiked, sort === "most_liked")}
        <span className="cm-tabsep" />
        {chip({ sort: sort === "newest" ? undefined : sort }, w2.allTypes, !type)}
        {TYPES.map((t) => chip({ type: t, sort: sort === "newest" ? undefined : sort }, w2[`st_${t}`], type === t))}
      </div>
      {list.items.length ? (
        <div className="cm-grid3">{list.items.map((it) => <ShowcaseCard key={it.id} item={it} w={w} w2={w2} />)}</div>
      ) : (
        <Empty icon="apps" text={w2.noShowcase} />
      )}
      <More href={withCursor(here, list.next)} w2={w2} />
    </SitePage>
  );
}
