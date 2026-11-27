/* eslint-disable @next/next/no-img-element -- event covers, from the community's file store. */
import type { Metadata } from "next";
import Link from "next/link";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { events } from "@/components/community/site/next";
import { Empty, More, PageHead, When, withCursor } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { fill } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Events" };

/** 234 Events and live sessions: upcoming (soonest first) or past (with replays); times in the viewer's time zone. */
export default async function EventsPage({ searchParams }: { searchParams: Promise<{ when?: string; cursor?: string }> }) {
  const sp = await searchParams;
  const { lang } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const when = sp.when === "past" ? "past" : "upcoming";
  const list = await events({ when, cursor: sp.cursor });
  const kind = { online: w2.online, in_person: w2.inPerson, live: w2.live };
  return (
    <SitePage active="events">
      <PageHead title={w2.eventsTitle} intro={w2.eventsIntro} />
      <div className="cm-tabs">
        <Link href={cmLinks.events()} className={when === "upcoming" ? "on" : ""}>{w2.upcomingEvents}</Link>
        <Link href={cmLinks.events("past")} className={when === "past" ? "on" : ""}>{w2.pastEvents}</Link>
        <span className="flt cm-muted cm-small">{w2.timesLocal}</span>
      </div>
      {list.items.length ? (
        <div className="cm-grid2">
          {list.items.map((e) => (
            <Link key={e.id} href={cmLinks.event(e.id)} className={`cm-evcard${e.status === "cancelled" ? " off" : ""}`}>
              <span className="cov">{e.cover_url ? <img src={e.cover_url} alt="" loading="lazy" /> : <span className="ms" aria-hidden="true">{e.kind === "live" ? "sensors" : "event"}</span>}{e.live_now ? <span className="tag live">{w2.liveNow}</span> : null}</span>
              <span className="txt">
                <span className="pill p-gy">{kind[e.kind]}</span>
                <b>{e.title}</b>
                <span className="cm-muted cm-small"><When at={e.starts_at} lang={lang} /></span>
                <span className="cm-muted cm-small">{e.location ?? ""}{e.location ? " · " : ""}{fill(w2.attendees, { n: e.going_count })}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : <Empty icon="event" text={w2.noEvents} />}
      <More href={withCursor(cmLinks.events(when === "past" ? "past" : undefined), list.next)} w2={w2} />
    </SitePage>
  );
}
