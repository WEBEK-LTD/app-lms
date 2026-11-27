/* eslint-disable @next/next/no-img-element -- group covers, from the community's file store. */
import Link from "next/link";
import { cmLinks } from "@/components/community/site/links";
import type { Group } from "@/components/community/site/next";
import { fill } from "@/components/community/site/words";
import type { CmWords2 } from "@/components/community/site/words2";

/** 232 A group in a list: cover, name, private mark, description and counts. */
export function GroupCard({ g, w2 }: { g: Group; w2: CmWords2 }) {
  return (
    <Link href={cmLinks.group(g.slug)} className="cm-grp">
      <span className="cov">{g.cover_url ? <img src={g.cover_url} alt="" loading="lazy" /> : <span className="ms" aria-hidden="true">groups</span>}</span>
      <span className="txt">
        <b>{g.name}{g.visibility === "private" ? <span className="ms" aria-label={w2.groupPrivate} title={w2.groupPrivate}>lock</span> : null}</b>
        <span className="cm-muted cm-clamp2">{g.description}</span>
        <span className="cm-muted cm-small">{fill(w2.groupMembers, { n: g.member_count })} · {fill(w2.groupPosts, { n: g.post_count })}</span>
      </span>
    </Link>
  );
}
