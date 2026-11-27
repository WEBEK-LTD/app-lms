import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/community/site/avatar";
import { MemberName } from "@/components/community/site/cards";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { group, groupMembers, groupRequests } from "@/components/community/site/next";
import { ApiButton, Empty, PageNote } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { CM_WORDS2 } from "@/components/community/site/words2";
import { GroupHead } from "../head";

export const metadata: Metadata = { title: "Group members" };

/** 232 A group's members (owner and moderators first), and, for its managers, the requests to join and member roles. */
export default async function GroupMembersPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; done?: string }> }) {
  const slug = decodeURIComponent((await params).slug);
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const g = await group(slug);
  if (!g) notFound();
  const manager = g.standing.role === "owner" || g.standing.role === "moderator";
  const canRead = g.visibility === "public" || !!g.standing.role;
  const [members, requests] = await Promise.all([canRead ? groupMembers(g.slug) : Promise.resolve({ items: [], next: null }), manager ? groupRequests(g.slug) : Promise.resolve({ items: [], next: null })]);
  const back = cmLinks.group(g.slug, "members");
  const p = `/groups/${encodeURIComponent(g.slug)}`;
  const roleLabel = { owner: w2.owner, moderator: w2.moderator, member: w2.member };
  return (
    <SitePage active="groups">
      <GroupHead g={g} w2={w2} viewer={viewer} tab="members" />
      <PageNote sp={sp} w2={w2} />
      {manager && requests.items.length ? (
        <section className="cm-card">
          <h2>{w2.requests}</h2>
          <ul className="cm-people-list">
            {requests.items.map((r) => (
              <li key={r.member.id}>
                <Avatar member={r.member} size={36} />
                <MemberName member={r.member} w={w} />
                <span className="sp" />
                <ApiButton call={{ m: "POST", p: `${p}/requests/${encodeURIComponent(r.member.id)}/accept`, back }} className="cm-btn o sm" label={w2.accept} />
                <ApiButton call={{ m: "POST", p: `${p}/requests/${encodeURIComponent(r.member.id)}/decline`, back }} className="cm-btn g sm" label={w2.decline} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {!canRead ? (
        <Empty icon="lock" text={w2.privateGroupNote} />
      ) : (
        <section className="cm-card">
          <h2>{w2.members}</h2>
          <ul className="cm-people-list">
            {members.items.map((m) => (
              <li key={m.member.id}>
                <Avatar member={m.member} size={36} />
                <MemberName member={m.member} w={w} />
                {m.role !== "member" ? <span className="pill p-gy">{roleLabel[m.role]}</span> : null}
                <span className="sp" />
                {manager && m.role !== "owner" && m.member.id !== viewer?.id ? (
                  <>
                    {g.standing.role === "owner" ? (
                      <ApiButton call={{ m: "PATCH", p: `${p}/members/${encodeURIComponent(m.member.id)}`, back }} fields={{ role: m.role === "moderator" ? "member" : "moderator" }} className="cm-link" label={m.role === "moderator" ? w2.makeMember : w2.makeModerator} />
                    ) : null}
                    <ApiButton call={{ m: "DELETE", p: `${p}/members/${encodeURIComponent(m.member.id)}`, back }} className="cm-link" label={w2.remove} />
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </SitePage>
  );
}
