import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { group, groupFeed } from "@/components/community/site/next";
import { Composer, Empty, FeedList, More, PageNote, withCursor } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { CM_WORDS2 } from "@/components/community/site/words2";
import { GroupHead } from "./head";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ cursor?: string; error?: string; pending?: string; done?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = await group(decodeURIComponent((await params).slug));
  return g ? { title: g.name, description: g.description.slice(0, 160) } : {};
}

/** 232 A group's page: its posts and questions, newest first; members write in it; a private group shows only its name to others. */
export default async function GroupPage({ params, searchParams }: Props) {
  const slug = decodeURIComponent((await params).slug);
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const g = await group(slug);
  if (!g) notFound();
  const member = !!g.standing.role;
  const canRead = g.visibility === "public" || member;
  const items = canRead ? await groupFeed(g.slug, sp.cursor) : { items: [], next: null };
  const back = cmLinks.group(g.slug);
  return (
    <SitePage active="groups">
      <GroupHead g={g} w2={w2} viewer={viewer} tab="feed" />
      <PageNote sp={sp} w2={w2} />
      {!canRead ? (
        <Empty icon="lock" text={w2.privateGroupNote} />
      ) : (
        <>
          {viewer && member ? (
            <>
              <Composer w2={w2} back={back} groupId={g.id} viewer={viewer} />
              <div className="cm-row" style={{ marginBottom: 14 }}>
                <Link href={`${cmLinks.ask()}?group=${encodeURIComponent(g.id)}`} className="cm-btn g"><span className="ms" aria-hidden="true">help</span>{w2.askInGroup}</Link>
              </div>
            </>
          ) : null}
          {items.items.length ? <FeedList items={items.items} w={w} w2={w2} back={back} /> : <Empty icon="dynamic_feed" text={w2.noPosts} />}
          <More href={withCursor(back, items.next)} w2={w2} />
        </>
      )}
    </SitePage>
  );
}
