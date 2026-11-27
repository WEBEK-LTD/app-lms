import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/community/site/avatar";
import { MemberName } from "@/components/community/site/cards";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { leaderboard, myPoints } from "@/components/community/site/next";
import { Empty, PageHead } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { ago, fill } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Leaderboard" };

/** 233 The leaderboard (this week from Monday, or all time), and the member's own points, level and recent points. */
export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const period = sp.period === "all" ? "all" : "week";
  const [board, mine] = await Promise.all([leaderboard(period), viewer ? myPoints() : Promise.resolve(null)]);
  const rows = board?.items ?? [];
  return (
    <SitePage active="leaderboard">
      <PageHead title={w2.leaderboardTitle} />
      {mine ? (
        <section className="cm-card cm-mypoints">
          <div><small className="cm-muted">{w2.yourPoints}</small><b className="num">{mine.points.toLocaleString("en-US")}</b></div>
          <div><small className="cm-muted">{fill(w2.levelWord, { n: mine.level })}</small><b>{mine.level_label}</b></div>
          {mine.next_level_at !== null ? <div className="cm-muted cm-small">{fill(w2.nextLevel, { n: Math.max(0, mine.next_level_at - mine.points) })}</div> : null}
        </section>
      ) : null}
      <div className="cm-tabs">
        <Link href={cmLinks.leaderboard()} className={period === "week" ? "on" : ""} aria-current={period === "week" ? "page" : undefined}>{w2.thisWeek}</Link>
        <Link href={cmLinks.leaderboard("all")} className={period === "all" ? "on" : ""} aria-current={period === "all" ? "page" : undefined}>{w2.allTime}</Link>
      </div>
      {rows.length ? (
        <section className="cm-card" style={{ padding: 8 }}>
          <ol className="cm-board">
            {rows.map((r) => (
              <li key={r.member.id} className={r.member.id === viewer?.id ? "me" : ""}>
                <span className="rk num">{r.rank}</span>
                <Avatar member={r.member} size={36} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <MemberName member={r.member} w={w} />
                  {r.level_label ? <span className="cm-muted cm-small"> · {r.level_label}</span> : null}
                </span>
                <b className="num">{r.points.toLocaleString("en-US")}</b>
              </li>
            ))}
          </ol>
        </section>
      ) : <Empty icon="leaderboard" text={w2.noLeaders} />}
      {mine?.history.items.length ? (
        <section className="cm-card">
          <h2>{w2.pointsHistory}</h2>
          <ul className="cm-hist">
            {mine.history.items.slice(0, 15).map((h, i) => (
              <li key={i}><span>{h.reason}</span><span className="cm-muted cm-small">{ago(w, h.created_at)}</span><b className={`num ${h.points < 0 ? "neg" : ""}`}>{h.points > 0 ? `+${h.points}` : h.points}</b></li>
            ))}
          </ul>
        </section>
      ) : null}
    </SitePage>
  );
}
