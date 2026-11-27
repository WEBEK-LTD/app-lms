import Link from "next/link";
import type { Challenge, CmEvent } from "./next";
import { LocalTime } from "./next-client";
import type { CmWords2 } from "./words2";
import { Avatar } from "./avatar";
import { BadgeMark } from "./badge";
import type { ActiveMember, MemberRef, QuestionSummary, TutorialSummary } from "./data";
import { cmLinks } from "./links";
import { ago, fill, type CmWords } from "./words";

export function answersLabel(w: CmWords, n: number): string {
  return n === 1 ? w.oneAnswer : fill(w.answers, { n });
}

/** A member's name with their highest badge and, for the Yallapp team, the team's mark. */
export function MemberName({ member, w }: { member: MemberRef; w: CmWords }) {
  return (
    <span className="n">
      {member.handle ? <Link href={cmLinks.member(member.handle)}>{member.name}</Link> : member.name}
      <BadgeMark kind={member.badge} w={w} />
      {member.staff ? <span className="badge-team"><span className="ms f" style={{ fontSize: 12 }} aria-hidden="true">verified_user</span>{w.team}</span> : null}
    </span>
  );
}

/** A question in the feed, as the design's post: who asked, when and where, its title, excerpt and counts. */
export function QuestionPost({ q, w }: { q: QuestionSummary; w: CmWords }) {
  return (
    <article className="cm-post">
      <div className="cm-who">
        <Avatar member={q.author} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <MemberName member={q.author} w={w} />
          <div className="m">{ago(w, q.createdAt)} · {q.section.name}</div>
        </div>
      </div>
      <div className="cm-q" style={{ marginTop: 12 }}>
        <div className="tg">
          <span className="pill p-or">{w.question}</span>
          {q.author.rank === "expert" || q.author.rank === "pro" ? <span className="pill lvl-x">{w[`rank_${q.author.rank}`]}</span> : null}
          {q.tags.slice(0, 3).map((t) => (
            <Link key={t.slug} href={cmLinks.questions({ tag: t.slug })} className="pill p-gy">{t.name}</Link>
          ))}
        </div>
        <h4><Link href={cmLinks.question(q.slug)}>{q.title}</Link></h4>
        {q.excerpt ? <p className="cm-muted" style={{ margin: "6px 0 0", fontSize: 14.5 }}>{q.excerpt}</p> : null}
      </div>
      <div className="cm-acts">
        <span className={q.score > 0 ? "on" : ""}><span className="ms f" aria-hidden="true">arrow_upward</span><span className="num">{q.score}</span></span>
        <span><span className="ms" aria-hidden="true">chat_bubble</span>{answersLabel(w, q.answerCount)}</span>
        {q.hasAccepted ? <span className="ok"><span className="ms f" aria-hidden="true">check_circle</span>{w.acceptedAnswer}</span> : null}
        <span className="sp" />
        <span><span className="ms" aria-hidden="true">visibility</span>{(q.views === 1 ? w.oneView : fill(w.views, { n: q.views }))}</span>
      </div>
    </article>
  );
}

/** A question as the design's small card (the two-column row). */
export function QuestionCard({ q, w }: { q: QuestionSummary; w: CmWords }) {
  return (
    <Link href={cmLinks.question(q.slug)} className="cm-post cm-q">
      <div className="tg">
        <span className="pill p-or">{w.question}</span>
        <span className="pill p-gy">{q.section.name}</span>
      </div>
      <h4>{q.title}</h4>
      <div className="mm">
        <span>{answersLabel(w, q.answerCount)}</span>
        {q.hasAccepted ? (
          <>
            <span>·</span>
            <span className="ok"><span className="ms f" aria-hidden="true">check_circle</span>{w.acceptedAnswer}</span>
          </>
        ) : null}
        <span className="end">{ago(w, q.createdAt)}</span>
      </div>
    </Link>
  );
}

function duration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** A tutorial as the design's video card (an article's has its cover without the play button). */
export function TutorialCard({ t, w }: { t: TutorialSummary; w: CmWords }) {
  return (
    <Link href={cmLinks.tutorial(t.slug)} className="cm-post cm-q">
      <div className="cm-vid" style={t.coverUrl ? { backgroundImage: `url(${t.coverUrl})` } : undefined}>
        {t.kind === "video" ? (
          <>
            <div className="pl"><span><span className="ms f" style={{ fontSize: 28 }} aria-hidden="true">play_arrow</span></span></div>
            {t.durationSec ? <span className="du num">{duration(t.durationSec)}</span> : null}
          </>
        ) : (
          <div className="pl"><span><span className="ms f" style={{ fontSize: 24 }} aria-hidden="true">article</span></span></div>
        )}
      </div>
      <div className="tg">
        <span className="pill p-vi">{t.kind === "video" ? w.videoKind : w.tutorial}</span>
        <span className="pill p-gy">{t.section.name}</span>
        <span className="pill p-gr">{w[`level_${t.level}`]}</span>
      </div>
      <h4>{t.title}</h4>
    </Link>
  );
}

/** The rail's "Questions waiting for your answer". */
export function WaitingBox({ items, w }: { items: QuestionSummary[]; w: CmWords }) {
  return (
    <section className="cm-box">
      <h5>{w.waitingTitle}<Link href={cmLinks.questions({ tab: "unanswered" })}>{w.all}</Link></h5>
      {items.length ? (
        items.map((q) => (
          <Link key={q.id} href={cmLinks.question(q.slug)} className="cm-wq">
            <div className="n num">{q.answerCount}<small>{w.answerWord}</small></div>
            <div>
              <b>{q.title}</b>
              <div className="m">{q.section.name} · {ago(w, q.createdAt)}</div>
            </div>
          </Link>
        ))
      ) : (
        <p className="cm-muted" style={{ fontSize: 13 }}>{w.noneWaiting}</p>
      )}
    </section>
  );
}

/** The rail's "Most active members this week". */
export function ActiveBox({ items, w }: { items: ActiveMember[]; w: CmWords }) {
  return (
    <section className="cm-box">
      <h5>{w.activeTitle}</h5>
      {items.length ? (
        items.map((a, i) => (
          <Link key={a.member.id} href={a.member.handle ? cmLinks.member(a.member.handle) : cmLinks.home()} className="cm-lb">
            <span className={`r num${i === 0 ? " g" : ""}`}>{i + 1}</span>
            <Avatar member={a.member} size={36} />
            <div style={{ minWidth: 0 }}>
              <b>{a.member.name}</b>
              <div className="m">{fill(w.acceptedCount, { n: a.acceptedAnswers })}</div>
            </div>
            <span className="p num"><span className="ms f" aria-hidden="true">bolt</span>{a.points.toLocaleString("en-US")}</span>
          </Link>
        ))
      ) : (
        <p className="cm-muted" style={{ fontSize: 13 }}>{w.noneActive}</p>
      )}
    </section>
  );
}

/** 233 The rail's challenge card: the running challenge (or the next one), leading to it. */
export function ChallengeBox({ w, w2, challenge }: { w: CmWords; w2: CmWords2; challenge: Challenge | null }) {
  return (
    <section className="cm-box">
      <div className="cm-ch">
        <small>{w2.challengeCard}</small>
        {challenge ? (
          <>
            <h3><Link href={cmLinks.challenge(challenge.id)}>{challenge.title}</Link></h3>
            <span className="soon"><span className="ms f" style={{ fontSize: 16 }} aria-hidden="true">emoji_events</span>{fill(w2.entries, { n: challenge.entry_count })}</span>
          </>
        ) : (
          <>
            <h3>{w.challengeTitle}</h3>
            <Link href={cmLinks.challenges()} className="soon">{w2.noChallenges}</Link>
          </>
        )}
      </div>
    </section>
  );
}

/** 234 The rail's next events (a live first). */
export function EventsBox({ w2, events, lang }: { w2: CmWords2; events: CmEvent[]; lang: string }) {
  return (
    <section className="cm-box">
      <h3 className="cm-box-h"><Link href={cmLinks.events()}>{w2.eventsTitle}</Link></h3>
      {events.length ? (
        events.map((e) => (
          <Link key={e.id} href={cmLinks.event(e.id)} className="cm-ev">
            <div className="d"><span className="ms f" aria-hidden="true">{e.kind === "live" ? "sensors" : e.kind === "online" ? "videocam" : "location_on"}</span></div>
            <div style={{ minWidth: 0 }}>
              <b style={{ fontSize: 14 }}>{e.title}</b>
              <div style={{ fontSize: 12, color: "var(--cm-muted)" }}><LocalTime at={e.starts_at} lang={lang} /></div>
            </div>
            {e.live_now ? <span className="tag live">{w2.liveNow}</span> : null}
          </Link>
        ))
      ) : (
        <p className="cm-muted" style={{ fontSize: 13 }}>{w2.noEvents}</p>
      )}
    </section>
  );
}
