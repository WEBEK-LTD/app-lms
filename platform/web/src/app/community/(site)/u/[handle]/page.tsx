/* eslint-disable @next/next/no-img-element -- the logo, avatars and app icons, small files the site and the platform serve already sized. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/community/site/avatar";
import { BadgeMark, BadgePill } from "@/components/community/site/badge";
import { QuestionCard } from "@/components/community/site/cards";
import { siteContext } from "@/components/community/site/context";
import type { Profile } from "@/components/community/site/data";
import { ReportButton } from "@/components/community/site/forms";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { profile } from "@/components/community/site/source";
import { fill, type CmWords } from "@/components/community/site/words";
import { blockAction, followAction, friendAction } from "../../social-actions";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const { lang, viewer } = await siteContext();
  const p = await profile(decodeURIComponent(handle), { viewerId: viewer?.id ?? null, lang });
  return p ? { title: `${p.member.name} (@${p.member.handle})`, description: p.bio.slice(0, 160) } : {};
}

function Act({ action, fields, className, icon, label }: { action: (f: FormData) => Promise<void>; fields: Record<string, string>; className: string; icon: string; label: string }) {
  return (
    <form action={action}>
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button type="submit" className={`cm-btn ${className}`}><span className="ms" aria-hidden="true">{icon}</span>{label}</button>
    </form>
  );
}

/** Follow (one way) and friends (asked, then accepted), as the profile's buttons. */
function Relation({ p, w, back }: { p: Profile; w: CmWords; back: string }) {
  const base = { memberId: p.member.id, back };
  const r = p.relation;
  if (r.blocked) return <Act action={blockAction} fields={{ ...base, on: "0" }} className="g" icon="block" label={w.unblock} />;
  return (
    <>
      <Act action={followAction} fields={{ ...base, on: r.following ? "0" : "1" }} className={r.following ? "g" : "o"} icon={r.following ? "check" : "person_add"} label={r.following ? w.followingMember : w.follow} />
      {r.friend === "none" ? <Act action={friendAction} fields={{ ...base, act: "request" }} className="n" icon="group_add" label={w.addFriend} /> : null}
      {r.friend === "requested" ? <Act action={friendAction} fields={{ ...base, act: "cancel" }} className="g" icon="schedule" label={w.friendRequested} /> : null}
      {r.friend === "incoming" ? (
        <>
          <Act action={friendAction} fields={{ ...base, act: "accept" }} className="n" icon="how_to_reg" label={w.acceptFriend} />
          <Act action={friendAction} fields={{ ...base, act: "decline", requestId: r.friendRequestId ?? "" }} className="g" icon="close" label={w.decline} />
        </>
      ) : null}
      {r.friend === "friends" ? <Act action={friendAction} fields={{ ...base, act: "remove" }} className="g" icon="diversity_3" label={w.friendsNow} /> : null}
    </>
  );
}

/** 231 A member's profile: badges (the highest beside the name, all of them listed), bio, skills, counts, linked apps and questions. */
export default async function MemberPage({ params }: Props) {
  const handle = decodeURIComponent((await params).handle);
  const { lang, w, viewer } = await siteContext();
  const p = await profile(handle, { viewerId: viewer?.id ?? null, lang });
  if (!p) notFound();
  const back = cmLinks.member(p.member.handle);
  return (
    <SitePage active="none">
      <section className="cm-card cm-profile">
        <div className="cover" aria-hidden="true" />
        <div className="top">
          <Avatar member={p.member} size={96} className="big" />
          <div className="who">
            <h1>
              {p.member.name} <BadgeMark kind={p.member.badge} w={w} />
              {p.member.staff ? <span className="badge-team"><span className="ms f" style={{ fontSize: 12 }} aria-hidden="true">verified_user</span>{w.team}</span> : null}
            </h1>
            <div className="cm-muted">@{p.member.handle} · {fill(w.points, { n: p.points.toLocaleString("en-US") })}</div>
          </div>
          <div className="cm-row acts">
            {p.relation.self ? (
              <Link href={cmLinks.editProfile()} className="cm-btn n"><span className="ms" aria-hidden="true">edit</span>{w.editProfile}</Link>
            ) : viewer ? (
              <Relation p={p} w={w} back={back} />
            ) : (
              <Link href={cmLinks.signIn(back)} className="cm-btn o"><span className="ms" aria-hidden="true">person_add</span>{w.follow}</Link>
            )}
          </div>
        </div>
        {p.bio ? <p className="bio">{p.bio}</p> : null}
        {p.skills.length ? (
          <div className="cm-row" style={{ gap: 6, marginTop: 10 }}>
            {p.skills.map((s) => <span key={s} className="pill p-gy">{s}</span>)}
          </div>
        ) : null}
        <div className="counts">
          <Link href={cmLinks.memberList(p.member.handle, "followers")}><b className="num">{p.followers}</b>{w.followers}</Link>
          <Link href={cmLinks.memberList(p.member.handle, "following")}><b className="num">{p.following}</b>{w.followingList}</Link>
          <Link href={cmLinks.memberList(p.member.handle, "friends")}><b className="num">{p.friends}</b>{w.navFriends}</Link>
          <span><b className="num">{p.answersCount}</b>{w.answerWord}</span>
        </div>
        {viewer && !p.relation.self ? (
          <div className="cm-row cm-answer-acts">
            {!p.relation.blocked ? (
              <form action={blockAction}>
                <input type="hidden" name="memberId" value={p.member.id} />
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="on" value="1" />
                <button type="submit" className="cm-link"><span className="ms" aria-hidden="true">block</span>{w.block}</button>
              </form>
            ) : null}
            <ReportButton w={w} kind="member" id={p.member.id} back={back} />
          </div>
        ) : null}
      </section>
      <section className="cm-card">
        <h2>{w.badges}</h2>
        {p.badges.length ? (
          <ul className="cm-badges">
            {p.badges.map((b) => (
              <li key={b.kind}>
                <BadgePill kind={b.kind} w={w} />
                <span className="cm-muted">{badgeWhy(w, b.kind)}</span>
                {b.kind === "green" && b.detail ? (
                  <span>{b.detail}{b.link ? <> · <a href={b.link} target="_blank" rel="noopener nofollow ugc">{w.viewApp}</a></> : null}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="cm-muted" style={{ marginTop: 8 }}>{w.noBadges}</p>
        )}
        {p.relation.self ? <Link href={cmLinks.verify()} className="cm-link" style={{ marginTop: 12 }}><span className="ms" aria-hidden="true">workspace_premium</span>{w.goldHow}</Link> : null}
      </section>
      <section className="cm-card">
        <h2>{w.linkedApps}</h2>
        {p.linkedApps.length ? (
          <div className="cm-apps">
            {p.linkedApps.map((a) => {
              const inner = (
                <>
                  <span className="ic">{a.iconUrl ? <img src={a.iconUrl} alt="" /> : <span className="ms" aria-hidden="true">apps</span>}</span>
                  <b>{a.name}</b>
                </>
              );
              return a.url ? <a key={a.id} href={a.url} target="_blank" rel="noopener nofollow ugc">{inner}</a> : <span key={a.id}>{inner}</span>;
            })}
          </div>
        ) : (
          <p className="cm-muted" style={{ marginTop: 8 }}>{p.relation.self ? (p.linked ? w.noAppsLinked : w.noAppsSelf) : w.noApps}</p>
        )}
      </section>
      {p.questions.length ? (
        <>
          <h2 className="cm-h2">{w.navQuestions}</h2>
          <div className="cm-two">{p.questions.map((q) => <QuestionCard key={q.id} q={q} w={w} />)}</div>
        </>
      ) : null}
    </SitePage>
  );
}

function badgeWhy(w: CmWords, kind: "gold" | "green" | "blue"): string {
  return kind === "gold" ? w.goldWhy : kind === "green" ? w.greenWhy : w.blueWhy;
}
