import Link from "next/link";
import { Avatar } from "./avatar";
import { ActiveBox, ChallengeBox, EventsBox, QuestionCard, QuestionPost, TutorialCard, WaitingBox } from "./cards";
import { GoSelect } from "./client";
import type { FeedTab, QuestionSummary, Section, TutorialSummary, Viewer } from "./data";
import { cmLinks } from "./links";
import { activeMembers, waiting } from "./source";
import { compact, fill, type CmLang, type CmWords } from "./words";
import { challenges, events } from "./next";
import { CM_WORDS2 } from "./words2";

export const FEED_TABS: FeedTab[] = ["for_you", "latest", "active", "unanswered"];

export function feedTab(value: string | undefined): FeedTab {
  return (FEED_TABS as string[]).includes(value ?? "") ? (value as FeedTab) : "for_you";
}

export function tabLabel(w: CmWords, tab: FeedTab): string {
  return tab === "for_you" ? w.tabForYou : tab === "latest" ? w.tabLatest : tab === "active" ? w.tabActive : w.tabUnanswered;
}

/** The feed's tabs and its sections filter. */
export function FeedTabs({ w, tab, section, sections, base }: { w: CmWords; tab: FeedTab; section?: string; sections: Section[]; base: (q: { tab?: string; section?: string }) => string }) {
  return (
    <div className="cm-tabs" role="tablist">
      {FEED_TABS.map((t) => (
        <Link key={t} href={base({ tab: t === "for_you" ? undefined : t, section })} className={t === tab ? "on" : ""} role="tab" aria-selected={t === tab}>
          {tabLabel(w, t)}
        </Link>
      ))}
      <GoSelect
        label={w.allSections}
        value={section ?? ""}
        options={[
          { value: "", label: w.allSections, href: base({ tab: tab === "for_you" ? undefined : tab }) },
          ...sections.map((s) => ({ value: s.slug, label: s.name, href: base({ tab: tab === "for_you" ? undefined : tab, section: s.slug }) })),
        ]}
      />
    </div>
  );
}

/** The home's hero: a greeting and the questions waiting in the member's section, with the community's figures. */
export function Hero({ w, viewer, waitingCount, topSection, stats }: { w: CmWords; viewer: Viewer | null; waitingCount: number; topSection: string | null; stats: { members: number; answeredRate: number; apps: number } }) {
  return (
    <section className="cm-hero">
      <div>
        {viewer ? (
          <>
            <h2>{fill(w.heroHi, { name: viewer.name.split(" ")[0] ?? viewer.name })}</h2>
            <p>{waitingCount ? (topSection ? fill(w.heroWaiting, { n: waitingCount, section: topSection }) : fill(w.heroWaitingAny, { n: waitingCount })) : w.heroAllAnswered}</p>
            <Link href={cmLinks.questions({ tab: "unanswered" })} className="btn"><span className="ms" style={{ fontSize: 20 }} aria-hidden="true">reply</span>{w.answerNow}</Link>
          </>
        ) : (
          <>
            <h2>{w.heroGuest}</h2>
            <p>{w.heroGuestText}</p>
            <Link href={cmLinks.signUp()} className="btn"><span className="ms" style={{ fontSize: 20 }} aria-hidden="true">person_add</span>{w.joinNow}</Link>
          </>
        )}
      </div>
      {/* Only the figures there are: a new community shows no "0 members". */}
      <div className="stats">
        {stats.members > 0 ? <div className="cm-stat"><b className="num">{compact(stats.members)}</b><span>{w.statMembers}</span></div> : null}
        {stats.answeredRate > 0 ? <div className="cm-stat"><b className="num">{Math.round(stats.answeredRate)}%</b><span>{w.statAnswered}</span></div> : null}
        {stats.apps > 0 ? <div className="cm-stat"><b className="num">{compact(stats.apps)}</b><span>{w.statApps}</span></div> : null}
      </div>
    </section>
  );
}

/** The composer: asking is phase 1; photos, videos and showing an app come later. */
export function Composer({ w, viewer }: { w: CmWords; viewer: Viewer | null }) {
  const ask = viewer ? cmLinks.ask() : cmLinks.signIn(cmLinks.ask());
  return (
    <div className="cm-comp">
      {viewer ? <Avatar member={viewer} size={42} /> : <span className="av a1" style={{ width: 42, height: 42 }}><span className="ms" aria-hidden="true">person</span></span>}
      <Link href={ask} className="in">{w.composerPlaceholder}</Link>
      <div className="t">
        <Link href={viewer ? "#cm-post-body" : cmLinks.signIn(cmLinks.home())}><span className="ms" style={{ color: "#18A56B" }} aria-hidden="true">image</span>{w.photo}</Link>
        <Link href={viewer ? "#cm-post-body" : cmLinks.signIn(cmLinks.home())}><span className="ms" style={{ color: "#E23F72" }} aria-hidden="true">videocam</span>{w.video}</Link>
        <Link href={ask}><span className="ms" style={{ color: "#FF5A1F" }} aria-hidden="true">help</span>{w.question}</Link>
        <Link href={viewer ? cmLinks.showcaseNew() : cmLinks.signIn(cmLinks.showcaseNew())}><span className="ms" style={{ color: "#6B5BFF" }} aria-hidden="true">apps</span>{w.showApp}</Link>
      </div>
    </div>
  );
}

/** The feed: questions as posts, with the newest tutorials as the two-column cards between them. */
export function Feed({ w, questions, tutorials }: { w: CmWords; questions: QuestionSummary[]; tutorials: TutorialSummary[] }) {
  if (!questions.length && !tutorials.length) {
    return (
      <div className="cm-empty">
        <span className="ms f" aria-hidden="true">forum</span>
        {w.emptyFeed}
      </div>
    );
  }
  const [first, second, ...rest] = questions;
  return (
    <>
      {first ? <QuestionPost q={first} w={w} /> : null}
      {second || tutorials[0] ? (
        <div className="cm-two">
          {second ? <QuestionCard q={second} w={w} /> : null}
          {tutorials[0] ? <TutorialCard t={tutorials[0]} w={w} /> : null}
        </div>
      ) : null}
      {rest.map((q, i) => {
        // After every third question, the next two tutorials.
        const pair = i % 3 === 2 ? tutorials.slice(1 + 2 * Math.floor(i / 3), 3 + 2 * Math.floor(i / 3)) : [];
        return (
          <div key={q.id}>
            <QuestionPost q={q} w={w} />
            {pair.length ? (
              <div className="cm-two">
                {pair.map((t) => <TutorialCard key={t.id} t={t} w={w} />)}
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

/** The rail of the home and the lists. */
export async function Rail({ w, lang, viewer }: { w: CmWords; lang: CmLang; viewer: Viewer | null }) {
  const w2 = CM_WORDS2[lang];
  const [wq, active, open, next] = await Promise.all([
    waiting({ viewerId: viewer?.id ?? null, lang, limit: 3 }),
    activeMembers({ limit: 3 }),
    challenges("open").then((p) => p.items[0] ?? null),
    events({ when: "upcoming" }).then((p) => p.items.slice(0, 2)),
  ]);
  return (
    <>
      <ChallengeBox w={w} w2={w2} challenge={open} />
      <WaitingBox items={wq.items} w={w} />
      <ActiveBox items={active} w={w} />
      <EventsBox w2={w2} events={next} lang={lang} />
    </>
  );
}
