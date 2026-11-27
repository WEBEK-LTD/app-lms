import type { Metadata } from "next";
import Link from "next/link";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { groups } from "@/components/community/site/next";
import { Empty, More, PageHead, withCursor } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { CM_WORDS2 } from "@/components/community/site/words2";
import { GroupCard } from "./group-card";

export const metadata: Metadata = { title: "Groups" };


/** 232 Groups: all of them (most active first) or the member's own. */
export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ mine?: string; cursor?: string }> }) {
  const sp = await searchParams;
  const { lang, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const mine = sp.mine === "1" && !!viewer;
  const list = await groups({ mine, cursor: sp.cursor });
  const here = cmLinks.groups(mine ? { mine: "1" } : undefined);
  return (
    <SitePage active="groups">
      <PageHead title={w2.groupsTitle} intro={w2.groupsIntro}>
        <Link href={viewer ? cmLinks.groupNew() : cmLinks.signIn(cmLinks.groupNew())} className="cm-btn o"><span className="ms" aria-hidden="true">add</span>{w2.createGroup}</Link>
      </PageHead>
      {viewer ? (
        <div className="cm-tabs">
          <Link href={cmLinks.groups()} className={mine ? "" : "on"} aria-current={mine ? undefined : "page"}>{w2.allGroups}</Link>
          <Link href={cmLinks.groups({ mine: "1" })} className={mine ? "on" : ""} aria-current={mine ? "page" : undefined}>{w2.myGroups}</Link>
        </div>
      ) : null}
      {list.items.length ? <div className="cm-grid2">{list.items.map((g) => <GroupCard key={g.id} g={g} w2={w2} />)}</div> : <Empty icon="groups" text={mine ? w2.noMyGroups : w2.noGroups} />}
      <More href={withCursor(here, list.next)} w2={w2} />
    </SitePage>
  );
}
