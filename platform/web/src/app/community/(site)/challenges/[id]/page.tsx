/* eslint-disable @next/next/no-img-element -- a challenge's cover, from the community's file store. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberMarkdown } from "@/components/community/site/markdown";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { challenge, challengeEntries, showcase, type ChallengeEntry } from "@/components/community/site/next";
import { ApiButton, ApiForm, PageNote, ShowcaseCard, When, Who } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { fill, type CmWords } from "@/components/community/site/words";
import { CM_WORDS2, type CmWords2 } from "@/components/community/site/words2";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; pending?: string; done?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await challenge((await params).id);
  return c ? { title: c.title } : {};
}

function Entry({ e, w, w2, back, p, voting, mine }: { e: ChallengeEntry; w: CmWords; w2: CmWords2; back: string; p: string; voting: boolean; mine: boolean }) {
  return (
    <article className="cm-card cm-entry">
      <Who member={e.member} w={w} size={32} />
      {e.showcase ? <ShowcaseCard item={e.showcase} w2={w2} /> : null}
      {e.url ? <a href={e.url} target="_blank" rel="noopener nofollow ugc" className="cm-link"><span className="ms" aria-hidden="true">link</span>{e.url}</a> : null}
      {e.note ? <p className="cm-muted">{e.note}</p> : null}
      <div className="cm-acts">
        {voting && !mine ? (
          <ApiButton call={{ m: e.voted ? "DELETE" : "PUT", p: `${p}/entries/${encodeURIComponent(e.id)}/vote`, back }} className={`cm-act${e.voted ? " on" : ""}`} icon="how_to_vote" pressed={e.voted} label={`${e.voted ? w2.voted : w2.vote} · ${e.vote_count}`} />
        ) : (
          <span className="cm-act"><span className="ms" aria-hidden="true">how_to_vote</span>{e.vote_count}</span>
        )}
      </div>
    </article>
  );
}

/** 233 A challenge: its rules and dates, entering (a showcase app or a link), voting, and the winners. */
export default async function ChallengePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const c = await challenge(id);
  if (!c) notFound();
  const [entries, myApps] = await Promise.all([challengeEntries(c.id), viewer && c.status === "open" && !c.entered ? showcase({ member: `@${viewer.handle}` }) : Promise.resolve({ items: [], next: null })]);
  const back = cmLinks.challenge(c.id);
  const p = `/challenges/${encodeURIComponent(c.id)}`;
  const status = { upcoming: w2.upcoming, open: w2.openNow, voting: w2.voting, closed: w2.closed };
  return (
    <SitePage active="challenges">
      <section className="cm-card cm-chal-head">
        {c.cover_url ? <img src={c.cover_url} alt="" className="cov" /> : null}
        <span className={`pill ${c.status === "open" || c.status === "voting" ? "p-or" : "p-gy"}`}>{status[c.status]}</span>
        <h1>{c.title}</h1>
        <div className="cm-row cm-muted cm-small">
          <span>{w2.startsAt}: <When at={c.starts_at} lang={lang} /></span>
          <span>{w2.endsAt}: <When at={c.ends_at} lang={lang} /></span>
          <span>{w2.votingEndsAt}: <When at={c.voting_ends_at} lang={lang} /></span>
        </div>
        <p><b>{fill(w2.reward, { points: c.reward_points })}</b>{c.reward_badge ? ` ${w2.rewardBadge}` : ""}</p>
        <MemberMarkdown source={c.rules} />
      </section>
      <PageNote sp={sp} w2={w2} />
      {c.winners.length ? (
        <>
          <h2 className="cm-h2"><span className="ms f" aria-hidden="true">emoji_events</span> {w2.winners}</h2>
          <div className="cm-grid2">{c.winners.map((e) => <Entry key={e.id} e={e} w={w} w2={w2} back={back} p={p} voting={false} mine={false} />)}</div>
        </>
      ) : null}
      {c.status === "open" && viewer && !c.entered ? (
        <ApiForm call={{ m: "POST", p: `${p}/entries`, back, done: "entered" }} className="cm-card">
          <h2>{w2.enter}</h2>
          {myApps.items.length ? (
            <label className="cm-field">{w2.entryWith}
              <select name="showcase_id" defaultValue=""><option value="">—</option>{myApps.items.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}</select>
            </label>
          ) : null}
          <label className="cm-field">{w2.entryLink}<input name="url" type="url" placeholder="https://" /></label>
          <label className="cm-field">{w2.entryNote}<textarea name="note" maxLength={1000} rows={3} /></label>
          <div className="cm-row" style={{ marginTop: 14 }}><button type="submit" className="cm-btn o">{w2.enter}</button></div>
        </ApiForm>
      ) : c.entered ? <div className="cm-note ok"><span className="ms" aria-hidden="true">check_circle</span>{w2.entered}</div> : null}
      <h2 className="cm-h2">{fill(w2.entries, { n: c.entry_count })}</h2>
      <div className="cm-grid2">{entries.items.map((e) => <Entry key={e.id} e={e} w={w} w2={w2} back={back} p={p} voting={c.status === "voting" && !!viewer} mine={e.member.id === viewer?.id} />)}</div>
    </SitePage>
  );
}
