/* eslint-disable @next/next/no-img-element -- the event's cover, from the community's file store. */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/community/site/avatar";
import { siteContext } from "@/components/community/site/context";
import { MemberMarkdown } from "@/components/community/site/markdown";
import { cmHref, cmLinks } from "@/components/community/site/links";
import { attendees, event, eventComments } from "@/components/community/site/next";
import { Poll } from "@/components/community/site/next-client";
import { ApiButton, ApiForm, PageNote, When } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { ago, fill } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; done?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await event((await params).id);
  return e ? { title: e.title, description: e.description.slice(0, 160) } : {};
}

/** Only embed addresses we know (YouTube, Vimeo, and the meeting services' own embeds) go in the frame. */
function safeEmbed(url: string | null): string | null {
  if (!url) return null;
  try {
    new URL(url);
    const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
    if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
    const vm = url.match(/vimeo\.com\/(?:event\/)?(\d+)/);
    if (vm) return url.includes("/event/") ? `https://vimeo.com/event/${vm[1]}/embed` : `https://player.vimeo.com/video/${vm[1]}`;
    return null;
  } catch {
    return null;
  }
}

/** 234 An event: date and time in the viewer's zone, RSVP, add to calendar, attendees; a live session's embed and comments (polled), and the replay after. */
export default async function EventPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const e = await event(id);
  if (!e) notFound();
  const [going, comments] = await Promise.all([attendees(e.id), e.kind === "live" ? eventComments(e.id) : Promise.resolve({ items: [], next: null })]);
  const back = cmLinks.event(e.id);
  const p = `/events/${encodeURIComponent(e.id)}`;
  const embed = e.live_now ? safeEmbed(e.embed_url) : null;
  const replay = !e.live_now && e.replay_url ? safeEmbed(e.replay_url) : null;
  const kind = { online: w2.online, in_person: w2.inPerson, live: w2.live };
  return (
    <SitePage active="events">
      {e.live_now ? <Poll seconds={8} /> : null}
      <PageNote sp={sp} w2={w2} />
      <article className="cm-card cm-event">
        {e.cover_url && !embed ? <img src={e.cover_url} alt="" className="cov" /> : null}
        <div className="cm-row" style={{ gap: 6 }}>
          <span className="pill p-gy">{kind[e.kind]}</span>
          {e.live_now ? <span className="pill p-or">{w2.liveNow}</span> : null}
          {e.status === "cancelled" ? <span className="pill p-gy">{w2.cancelledEvent}</span> : null}
        </div>
        <h1>{e.title}</h1>
        <div className="cm-row cm-muted" style={{ gap: 14 }}>
          <span><span className="ms" aria-hidden="true">schedule</span> <When at={e.starts_at} lang={lang} />{e.ends_at ? <> – <When at={e.ends_at} lang={lang} /></> : null}</span>
          {e.location ? <span><span className="ms" aria-hidden="true">location_on</span> {e.location}</span> : null}
          <span><span className="ms" aria-hidden="true">group</span> {fill(w2.attendees, { n: e.going_count })}</span>
        </div>
        <p className="cm-muted cm-small">{w2.timesLocal}</p>
        {embed ? <div className="cm-player"><iframe src={embed} title={e.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div> : null}
        {replay ? <div className="cm-player"><iframe src={replay} title={e.title} allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy" /></div> : null}
        {e.status !== "cancelled" ? (
          <div className="cm-row" style={{ marginTop: 14 }}>
            {viewer ? (
              <ApiButton call={{ m: e.going ? "DELETE" : "PUT", p: `${p}/rsvp`, back }} className={e.going ? "cm-btn g" : "cm-btn o"} icon={e.going ? "event_busy" : "event_available"} pressed={e.going} label={e.going ? w2.notGoing : w2.rsvp} />
            ) : <Link href={cmLinks.signIn(back)} className="cm-btn o">{w2.rsvp}</Link>}
            <a href={`${cmHref(`/events/${encodeURIComponent(e.id)}/ics`)}`} className="cm-btn g" download><span className="ms" aria-hidden="true">calendar_add_on</span>{w2.addToCalendar}</a>
            {e.join_url && e.going ? <a href={e.join_url} target="_blank" rel="noopener" className="cm-btn g"><span className="ms" aria-hidden="true">open_in_new</span>{w2.joinLink}</a> : null}
            {e.replay_url && !replay ? <a href={e.replay_url} target="_blank" rel="noopener" className="cm-btn g"><span className="ms" aria-hidden="true">play_circle</span>{w2.replay}</a> : null}
          </div>
        ) : null}
        {e.description ? <MemberMarkdown source={e.description} /> : null}
      </article>
      {e.kind === "live" ? (
        <section className="cm-card">
          <h2>{w2.liveChat}</h2>
          {viewer && e.live_now ? (
            <ApiForm call={{ m: "POST", p: `${p}/comments`, back }} className="cm-cmt-form">
              <input name="body" required maxLength={500} placeholder={w2.writeComment} aria-label={w2.writeComment} />
              <button type="submit" className="cm-btn o">{w2.send}</button>
            </ApiForm>
          ) : null}
          <ul className="cm-live-cmts">
            {comments.items.map((c) => <li key={c.id}><Avatar member={c.author} size={24} /><b>{c.author.name}</b><span>{c.body}</span><span className="cm-muted cm-small">{ago(w, c.created_at)}</span></li>)}
          </ul>
        </section>
      ) : null}
      {going.items.length ? (
        <section className="cm-card">
          <h2>{fill(w2.attendees, { n: e.going_count })}</h2>
          <div className="cm-faces">{going.items.map((a) => <Link key={a.member.id} href={cmLinks.member(a.member.handle ?? a.member.id)} title={a.member.name}><Avatar member={a.member} size={36} /></Link>)}</div>
        </section>
      ) : null}
    </SitePage>
  );
}
