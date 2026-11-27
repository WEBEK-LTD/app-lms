/* eslint-disable @next/next/no-img-element -- a story's photo, from the community's file store. */
import { notFound } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/community/site/avatar";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { stories, storyViewers } from "@/components/community/site/next";
import { ApiButton, ApiForm } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { ago, fill } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

/** 232 A member's stories (24 hours), one at a time; the author sees who saw each. */
export default async function StoriesPage({ params, searchParams }: { params: Promise<{ handle: string }>; searchParams: Promise<{ i?: string }> }) {
  const handle = decodeURIComponent((await params).handle);
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const rings = await stories();
  const at = rings.findIndex((r) => r.member.handle === handle || r.member.id === handle);
  const ring = rings[at];
  if (!ring || !ring.stories.length) notFound();
  const i = Math.min(Math.max(0, Number(sp.i) || 0), ring.stories.length - 1);
  const story = ring.stories[i]!;
  const mine = viewer?.id === ring.member.id;
  const viewers = mine ? await storyViewers(story.id) : null;
  const back = `${cmLinks.stories(handle)}${i ? `?i=${i}` : ""}`;
  const nextRing = rings[at + 1];
  const next = i + 1 < ring.stories.length ? `${cmLinks.stories(handle)}?i=${i + 1}` : nextRing ? cmLinks.stories(nextRing.member.handle ?? nextRing.member.id) : cmLinks.home();
  const prev = i > 0 ? `${cmLinks.stories(handle)}?i=${i - 1}` : null;
  return (
    <SitePage active="home">
      <section className="cm-story" aria-label={w2.stories}>
        <div className="bars">{ring.stories.map((s, k) => <i key={s.id} className={k <= i ? "on" : ""} />)}</div>
        <div className="top">
          <Avatar member={ring.member} size={36} />
          <b>{ring.member.name}</b>
          <span className="cm-muted">{ago(w, story.created_at)}</span>
          <span className="sp" />
          <Link href={cmLinks.home()} className="cm-icb" aria-label={w2.close}><span className="ms" aria-hidden="true">close</span></Link>
        </div>
        <div className="media">
          {story.media.kind === "video" ? <video src={story.media.url} poster={story.media.poster_url ?? undefined} controls autoPlay muted playsInline /> : <img src={story.media.url} alt="" />}
        </div>
        <div className="nav">
          {prev ? <Link href={prev} className="cm-btn g" aria-label={w2.previous}><span className="ms" aria-hidden="true">chevron_left</span></Link> : <span />}
          {!mine && !story.seen ? (
            <ApiForm call={{ m: "POST", p: `/stories/${encodeURIComponent(story.id)}/view`, back: next }}>
              <button type="submit" className="cm-btn o">{w2.next}<span className="ms" aria-hidden="true">chevron_right</span></button>
            </ApiForm>
          ) : (
            <Link href={next} className="cm-btn o">{w2.next}<span className="ms" aria-hidden="true">chevron_right</span></Link>
          )}
        </div>
      </section>
      {mine ? (
        <section className="cm-card">
          <div className="cm-row">
            <h2 style={{ flex: 1 }}>{fill(w2.storyViewers, { n: story.view_count })}</h2>
            <ApiButton call={{ m: "DELETE", p: `/stories/${encodeURIComponent(story.id)}`, back: cmLinks.home(), to: cmLinks.home() }} className="cm-link" icon="delete" label={w2.delete} />
          </div>
          {viewers?.items.length ? (
            <ul className="cm-people-list">
              {viewers.items.map((v) => (
                <li key={v.member.id}><Avatar member={v.member} size={32} /><span>{v.member.name}</span><span className="cm-muted cm-small">{ago(w, v.viewed_at)}</span></li>
              ))}
            </ul>
          ) : <p className="cm-muted">{w2.noViewers}</p>}
        </section>
      ) : null}
    </SitePage>
  );
}
