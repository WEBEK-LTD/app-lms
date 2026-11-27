/* eslint-disable @next/next/no-img-element -- the group's cover, from the community's file store. */
import Link from "next/link";
import type { Viewer } from "@/components/community/site/data";
import { cmLinks } from "@/components/community/site/links";
import type { Group } from "@/components/community/site/next";
import { ApiButton } from "@/components/community/site/next-ui";
import { fill } from "@/components/community/site/words";
import type { CmWords2 } from "@/components/community/site/words2";

/** The top of a group's pages: cover, name, counts, join or leave, and its tabs. */
export function GroupHead({ g, w2, viewer, tab }: { g: Group; w2: CmWords2; viewer: Viewer | null; tab: "feed" | "members" | "settings" }) {
  const p = `/groups/${encodeURIComponent(g.slug)}`;
  const back = cmLinks.group(g.slug, tab === "feed" ? "" : tab);
  const role = g.standing.role;
  const manager = role === "owner" || role === "moderator";
  return (
    <section className="cm-card cm-profile cm-grp-head">
      <div className="cover" aria-hidden="true">{g.cover_url ? <img src={g.cover_url} alt="" /> : null}</div>
      <div className="who" style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1>{g.name}{g.visibility === "private" ? <span className="cm-chip b-team"><span className="ms" aria-hidden="true">lock</span>{w2.groupPrivate.split(":")[0]}</span> : null}</h1>
          <div className="handle">{fill(w2.groupMembers, { n: g.member_count })} · {fill(w2.groupPosts, { n: g.post_count })}</div>
        </div>
        <div className="cm-row">
          {!viewer ? (
            <Link href={cmLinks.signIn(back)} className="cm-btn o">{w2.join}</Link>
          ) : role ? (
            role !== "owner" ? <ApiButton call={{ m: "DELETE", p: `${p}/membership`, back }} className="cm-btn g" icon="logout" label={w2.leave} /> : null
          ) : g.standing.requested ? (
            <ApiButton call={{ m: "DELETE", p: `${p}/membership`, back }} className="cm-btn g" icon="schedule" label={w2.requested} />
          ) : (
            <ApiButton call={{ m: "PUT", p: `${p}/membership`, back }} className="cm-btn o" icon="group_add" label={g.visibility === "private" ? w2.requestToJoin : w2.join} />
          )}
        </div>
      </div>
      {g.description ? <p className="bio">{g.description}</p> : null}
      {g.status === "pending" ? <p className="cm-note" style={{ margin: "12px 24px 0" }} role="status"><span className="ms" aria-hidden="true">schedule</span>{w2.groupPending}</p> : null}
      <nav className="cm-pf-tabs" aria-label={g.name}>
        <Link href={cmLinks.group(g.slug)} className={tab === "feed" ? "on" : undefined} aria-current={tab === "feed" ? "page" : undefined}>{w2.feedLatest}</Link>
        <Link href={cmLinks.group(g.slug, "members")} className={tab === "members" ? "on" : undefined} aria-current={tab === "members" ? "page" : undefined}>{w2.members}</Link>
        {manager ? <Link href={cmLinks.group(g.slug, "settings")} className={tab === "settings" ? "on" : undefined} aria-current={tab === "settings" ? "page" : undefined}>{w2.groupSettings}</Link> : null}
      </nav>
    </section>
  );
}
