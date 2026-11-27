import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage, adminContext } from "@/components/community/site/admin";
import { cmLinks } from "@/components/community/site/links";
import { challenge, challengeEntries, challenges, type Challenge } from "@/components/community/site/next";
import { ApiButton, ApiForm, PageNote } from "@/components/community/site/next-ui";
import type { CmWords } from "@/components/community/site/words";
import { CM_WORDS2, type CmWords2 } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Challenges", robots: { index: false } };

const local = (iso: string | undefined) => (iso ? iso.slice(0, 16) : "");

function ChallengeFields({ w, w2, c }: { w: CmWords; w2: CmWords2; c?: Challenge }) {
  return (
    <>
      <input type="hidden" name="_tz" value="UTC" />
      <label className="cm-field">{w2.title}<input name="title" required maxLength={140} defaultValue={c?.title ?? ""} /></label>
      <label className="cm-field">{w2.rules}<textarea name="rules" required maxLength={8000} defaultValue={c?.rules ?? ""} /></label>
      <div className="cm-row" style={{ gap: 14 }}>
        <label className="cm-field" style={{ flex: 1 }}>{w2.startsAt} (UTC)<input type="datetime-local" name="d:starts_at" required defaultValue={local(c?.starts_at)} /></label>
        <label className="cm-field" style={{ flex: 1 }}>{w2.endsAt} (UTC)<input type="datetime-local" name="d:ends_at" required defaultValue={local(c?.ends_at)} /></label>
        <label className="cm-field" style={{ flex: 1 }}>{w2.votingEndsAt} (UTC)<input type="datetime-local" name="d:voting_ends_at" required defaultValue={local(c?.voting_ends_at)} /></label>
      </div>
      <div className="cm-row" style={{ gap: 14 }}>
        <label className="cm-field" style={{ flex: 1 }}>{w2.rewardPoints}<input type="number" name="n:reward_points" min={0} defaultValue={c?.reward_points ?? 100} /></label>
        <label className="cm-field" style={{ flex: 1 }}>{w2.rewardBadge}<select name="z:reward_badge" defaultValue={c?.reward_badge ?? ""}><option value="">—</option><option value="gold">{w.badgeGold}</option><option value="green">{w.badgeGreen}</option><option value="blue">{w.badgeBlue}</option></select></label>
        <label className="cm-field" style={{ flex: 2 }}>{w2.cover}<input type="url" name="cover_url" defaultValue={c?.cover_url ?? ""} placeholder="https://" /></label>
      </div>
    </>
  );
}

/** 233 The admin's challenges: post one with dates and rules, change it, and pick the winners (they get the reward). */
export default async function AdminChallengesPage({ searchParams }: { searchParams: Promise<{ id?: string; error?: string; done?: string }> }) {
  const sp = await searchParams;
  const { lang, w } = await adminContext("challenges");
  const w2 = CM_WORDS2[lang];
  const back = cmLinks.admin("challenges");
  const [list, open, entries] = await Promise.all([challenges(), sp.id ? challenge(sp.id) : Promise.resolve(null), sp.id ? challengeEntries(sp.id) : Promise.resolve({ items: [], next: null })]);
  const status = { upcoming: w2.upcoming, open: w2.openNow, voting: w2.voting, closed: w2.closed };
  return (
    <AdminPage w={w} tab="challenges">
      <PageNote sp={sp} w2={w2} />
      {open ? (
        <>
          <ApiForm call={{ m: "PATCH", p: `/admin/challenges/${encodeURIComponent(open.id)}`, back: `${back}?id=${encodeURIComponent(open.id)}`, done: "saved" }} className="cm-card">
            <h2>{open.title}</h2>
            <ChallengeFields w={w} w2={w2} c={open} />
            <div className="cm-row" style={{ marginTop: 18 }}>
              <button type="submit" className="cm-btn o">{w2.saveChanges}</button>
              <Link href={back} className="cm-btn g">{w2.cancel}</Link>
            </div>
          </ApiForm>
          <ApiForm call={{ m: "PUT", p: `/admin/challenges/${encodeURIComponent(open.id)}/winners`, back: `${back}?id=${encodeURIComponent(open.id)}`, done: "saved" }} className="cm-card">
            <h2>{w2.pickWinners}</h2>
            <fieldset className="cm-radios">
              {entries.items.map((e) => <label key={e.id}><input type="checkbox" name="l:entry_ids" value={e.id} defaultChecked={open.winners.some((x) => x.id === e.id)} /> {e.member.name} · {e.showcase?.title ?? e.url ?? ""} · {e.vote_count} {w2.vote}</label>)}
            </fieldset>
            <div className="cm-row" style={{ marginTop: 14 }}><button type="submit" className="cm-btn o">{w2.pickWinners}</button></div>
          </ApiForm>
        </>
      ) : (
        <details className="cm-card">
          <summary className="cm-btn o" style={{ display: "inline-flex" }}><span className="ms" aria-hidden="true">add</span>{w2.newChallenge}</summary>
          <ApiForm call={{ m: "POST", p: "/admin/challenges", back, done: "saved" }}>
            <ChallengeFields w={w} w2={w2} />
            <div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.newChallenge}</button></div>
          </ApiForm>
        </details>
      )}
      <div className="cm-card" style={{ overflowX: "auto" }}>
        <table className="cm-table">
          <thead><tr><th>{w2.title}</th><th>{w2.status}</th><th>{w2.entries.replace("{n} ", "")}</th><th /></tr></thead>
          <tbody>
            {list.items.map((c) => (
              <tr key={c.id}>
                <td><Link href={cmLinks.challenge(c.id)}>{c.title}</Link></td>
                <td>{status[c.status]}</td>
                <td>{c.entry_count}</td>
                <td className="cm-row" style={{ gap: 10 }}>
                  <Link href={`${back}?id=${encodeURIComponent(c.id)}`} className="cm-link">{w2.edit}</Link>
                  <ApiButton call={{ m: "DELETE", p: `/admin/challenges/${encodeURIComponent(c.id)}`, back }} className="cm-link" label={w2.delete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}
