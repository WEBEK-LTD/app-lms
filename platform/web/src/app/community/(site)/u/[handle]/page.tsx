/* eslint-disable @next/next/no-img-element -- the logo, avatars and app icons, small files the site and the platform serve already sized. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/community/site/avatar";
import { BadgeChip, BadgePill, highestBadge } from "@/components/community/site/badge";
import { QuestionCard, TutorialCard } from "@/components/community/site/cards";
import { siteContext } from "@/components/community/site/context";
import type { LinkedApp, Profile } from "@/components/community/site/data";
import { ReportButton } from "@/components/community/site/forms";
import { cmLinks } from "@/components/community/site/links";
import { SitePage } from "@/components/community/site/page";
import { profile } from "@/components/community/site/source";
import { fill, type CmLang, type CmWords } from "@/components/community/site/words";
import { blockAction, followAction, friendAction } from "../../social-actions";

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<{ tab?: string }> };

const TABS = ["overview", "questions", "answers", "tutorials"] as const;
type Tab = (typeof TABS)[number];

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

/** Follow (one way), friends (asked, then accepted) and Message (soon), as one group. */
function Relation({ p, w, back }: { p: Profile; w: CmWords; back: string }) {
  const base = { memberId: p.member.id, back };
  const r = p.relation;
  if (r.blocked) return <Act action={blockAction} fields={{ ...base, on: "0" }} className="g" icon="block" label={w.unblock} />;
  return (
    <>
      <Act action={followAction} fields={{ ...base, on: r.following ? "0" : "1" }} className={r.following ? "g" : "o"} icon={r.following ? "check" : "person_add"} label={r.following ? w.followingMember : w.follow} />
      {r.friend === "none" ? <Act action={friendAction} fields={{ ...base, act: "request" }} className="g" icon="group_add" label={w.addFriend} /> : null}
      {r.friend === "requested" ? <Act action={friendAction} fields={{ ...base, act: "cancel" }} className="g" icon="schedule" label={w.friendRequested} /> : null}
      {r.friend === "incoming" ? (
        <>
          <Act action={friendAction} fields={{ ...base, act: "accept" }} className="g" icon="how_to_reg" label={w.acceptFriend} />
          <Act action={friendAction} fields={{ ...base, act: "decline", requestId: r.friendRequestId ?? "" }} className="g" icon="close" label={w.decline} />
        </>
      ) : null}
      {r.friend === "friends" ? <Act action={friendAction} fields={{ ...base, act: "remove" }} className="g" icon="diversity_3" label={w.friendsNow} /> : null}
      <Message w={w} />
    </>
  );
}

function Message({ w }: { w: CmWords }) {
  return (
    <button type="button" className="cm-btn g" disabled aria-disabled="true" title={w.messagesSoon}>
      <span className="ms" aria-hidden="true">chat_bubble</span>{w.messageMember}
    </button>
  );
}

function joined(at: string, lang: CmLang): string {
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(lang === "ar" ? "ar-EG-u-nu-latn" : lang, { month: "long", year: "numeric" });
}

function platformLabel(w: CmWords, a: LinkedApp): string {
  return a.platform === "both" ? w.platformBoth : a.platform === "ios" ? w.platformIos : a.platform === "android" ? w.platformAndroid : w.platformNone;
}

function AppCard({ a, w }: { a: LinkedApp; w: CmWords }) {
  const inner = (
    <>
      <span className="ic">{a.iconUrl ? <img src={a.iconUrl} alt="" width={48} height={48} /> : <span className="ms" aria-hidden="true">apps</span>}</span>
      <span className="txt">
        <b>{a.name}</b>
        <span className="cm-muted">{platformLabel(w, a)}</span>
      </span>
      {a.green ? <BadgePill kind="green" w={w} /> : null}
    </>
  );
  return a.url ? <a className="cm-appcard" href={a.url} target="_blank" rel="noopener nofollow ugc">{inner}</a> : <div className="cm-appcard">{inner}</div>;
}

/** 231 A member's profile: a plain cover, the name with its highest badge, bio, skills, links, quiet counts, tabs, and their apps as cards. */
export default async function MemberPage({ params, searchParams }: Props) {
  const handle = decodeURIComponent((await params).handle);
  const sp = await searchParams;
  const tab: Tab = TABS.includes(sp.tab as Tab) ? (sp.tab as Tab) : "overview";
  const { lang, w, viewer } = await siteContext();
  const p = await profile(handle, { viewerId: viewer?.id ?? null, lang });
  if (!p) notFound();
  const back = cmLinks.member(p.member.handle);
  const since = joined(p.joinedAt, lang);
  const tabLabel: Record<Tab, string> = { overview: w.tabOverview, questions: w.tabQuestions, answers: w.tabAnswers, tutorials: w.tabTutorials };
  const n = (x: number) => x.toLocaleString("en-US");
  return (
    <SitePage active="none">
      <section className="cm-card cm-profile">
        <div className="cover" aria-hidden="true" />
        <div className="top">
          <Avatar member={p.member} size={104} className="big" />
          <div className="cm-row acts">
            {p.relation.self ? (
              <Link href={cmLinks.editProfile()} className="cm-btn g"><span className="ms" aria-hidden="true">edit</span>{w.editProfile}</Link>
            ) : viewer ? (
              <Relation p={p} w={w} back={back} />
            ) : (
              <>
                <Link href={cmLinks.signIn(back)} className="cm-btn o"><span className="ms" aria-hidden="true">person_add</span>{w.follow}</Link>
                <Message w={w} />
              </>
            )}
          </div>
        </div>
        <div className="who">
          <h1>
            <span>{p.member.name}</span>
            <BadgeChip kind={p.member.badge ?? highestBadge(p.badges.map((b) => b.kind))} w={w} />
            {p.member.staff ? <span className="cm-chip b-team"><span className="ms f" aria-hidden="true">verified_user</span>{w.team}</span> : null}
          </h1>
          <div className="handle">@{p.member.handle}{since ? <> · {fill(w.joinedOn, { date: since })}</> : null}</div>
        </div>
        {p.bio ? <p className="bio">{p.bio}</p> : null}
        {p.skills.length ? (
          <div className="skills">
            {p.skills.map((s) => <span key={s} className="cm-tag">{s}</span>)}
          </div>
        ) : null}
        {p.links.length ? (
          <ul className="links" aria-label={w.profileLinks}>
            {p.links.map((l) => (
              <li key={l.url}><a href={l.url} target="_blank" rel="noopener nofollow ugc"><span className="ms" aria-hidden="true">link</span>{l.label}</a></li>
            ))}
          </ul>
        ) : null}
        <div className="counts">
          <Link href={cmLinks.memberList(p.member.handle, "followers")}><b className="num">{n(p.followers)}</b> {w.followers}</Link>
          <Link href={cmLinks.memberList(p.member.handle, "following")}><b className="num">{n(p.following)}</b> {w.followingList}</Link>
          <Link href={cmLinks.memberList(p.member.handle, "friends")}><b className="num">{n(p.friends)}</b> {w.navFriends}</Link>
          <span><b className="num">{n(p.answersCount)}</b> {w.answerWord}</span>
          <span>{fill(w.points, { n: n(p.points) })}</span>
        </div>
        {viewer && !p.relation.self ? (
          <div className="cm-row quiet">
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
        <nav className="cm-pf-tabs" aria-label={p.member.name}>
          {TABS.map((t) => (
            <Link key={t} href={t === "overview" ? back : `${back}?tab=${t}`} aria-current={t === tab ? "page" : undefined} className={t === tab ? "on" : undefined} scroll={false}>
              {tabLabel[t]}
              {t === "questions" ? <span className="n">{n(p.questionsCount)}</span> : t === "answers" ? <span className="n">{n(p.answersCount)}</span> : null}
            </Link>
          ))}
        </nav>
      </section>

      {tab === "overview" ? (
        <>
          <section className="cm-card">
            <h2>{w.linkedApps}</h2>
            {p.linkedApps.length ? (
              <div className="cm-appgrid cm-apps">{p.linkedApps.map((a) => <AppCard key={a.id} a={a} w={w} />)}</div>
            ) : (
              <div className="cm-empty">
                <span className="ms" aria-hidden="true">apps</span>
                <b>{w.appsEmptyTitle}</b>
                <p className="cm-muted">{p.relation.self ? (p.linked ? w.noAppsLinked : w.noAppsSelf) : w.noApps}</p>
                {p.relation.self && !p.linked ? <Link href={cmLinks.settings()} className="cm-btn g">{w.appsEmptyLink}</Link> : null}
              </div>
            )}
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
        </>
      ) : null}
      {tab === "questions" ? <List empty={w.noQuestionsYet}>{p.questions.map((q) => <QuestionCard key={q.id} q={q} w={w} />)}</List> : null}
      {tab === "answers" ? <List empty={w.noAnswersYet}>{p.answered.map((q) => <QuestionCard key={q.id} q={q} w={w} />)}</List> : null}
      {tab === "tutorials" ? <List empty={w.noTutorialsYet}>{p.tutorials.map((t) => <TutorialCard key={t.id} t={t} w={w} />)}</List> : null}
    </SitePage>
  );
}

function List({ children, empty }: { children: React.ReactNode[]; empty: string }) {
  return children.length ? <div className="cm-two">{children}</div> : <div className="cm-card cm-empty"><p className="cm-muted">{empty}</p></div>;
}

function badgeWhy(w: CmWords, kind: "gold" | "green" | "blue"): string {
  return kind === "gold" ? w.goldWhy : kind === "green" ? w.greenWhy : w.blueWhy;
}
