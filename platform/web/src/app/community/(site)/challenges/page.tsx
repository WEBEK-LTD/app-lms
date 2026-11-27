/* eslint-disable @next/next/no-img-element -- challenge covers, from the community's file store. */
import type { Metadata } from "next";
import Link from "next/link";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { challenges } from "@/components/community/site/next";
import { Empty, PageHead, When } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { fill } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Challenges" };

/** 233 Challenges: the running one first, then upcoming and past ones with their winners. */
export default async function ChallengesPage() {
  const { lang } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const list = await challenges();
  const status = { upcoming: w2.upcoming, open: w2.openNow, voting: w2.voting, closed: w2.closed };
  return (
    <SitePage active="challenges">
      <PageHead title={w2.challengesTitle} intro={w2.challengesIntro} />
      {list.items.length ? (
        <div className="cm-grid2">
          {list.items.map((c) => (
            <Link key={c.id} href={cmLinks.challenge(c.id)} className="cm-chal">
              <span className="cov">{c.cover_url ? <img src={c.cover_url} alt="" loading="lazy" /> : <span className="ms" aria-hidden="true">emoji_events</span>}</span>
              <span className="txt">
                <span className={`pill ${c.status === "open" || c.status === "voting" ? "p-or" : "p-gy"}`}>{status[c.status]}</span>
                <b>{c.title}</b>
                <span className="cm-muted cm-small">{fill(w2.entries, { n: c.entry_count })} · {fill(w2.reward, { points: c.reward_points })}{c.reward_badge ? ` ${w2.rewardBadge}` : ""}</span>
                <span className="cm-muted cm-small">{c.status === "upcoming" ? w2.startsAt : c.status === "voting" ? w2.votingEndsAt : w2.endsAt}: <When at={c.status === "upcoming" ? c.starts_at : c.status === "voting" ? c.voting_ends_at : c.ends_at} lang={lang} /></span>
              </span>
            </Link>
          ))}
        </div>
      ) : <Empty icon="emoji_events" text={w2.noChallenges} />}
    </SitePage>
  );
}
