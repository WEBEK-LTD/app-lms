/* eslint-disable @next/next/no-img-element -- members' photos and covers come from the community's own file store, already sized. */
import Link from "next/link";
import type { ReactNode } from "react";
import { apiAction } from "@/app/community/(site)/next-actions";
import { Avatar } from "./avatar";
import { MemberName } from "./cards";
import type { MemberRef, Viewer } from "./data";
import { cmLinks } from "./links";
import type { Comment, FeedItem, Post, ShowcaseSummary, StoryRing } from "./next";
import { CopyLink, LocalTime } from "./next-client";
import { ago, compact, fill, type CmWords } from "./words";
import type { CmWords2 } from "./words2";

/** 232–234 The website's shared pieces for phases 2 to 4: forms that call the API, notes, posts, the feed, stories, comments and cards. */

type Call = { m: "POST" | "PUT" | "PATCH" | "DELETE"; p: string; back: string; to?: string; done?: string; multipart?: boolean };

/** A form that makes one API call through the site's server action (fields inside are the body). */
export function ApiForm({ call, children, className, id }: { call: Call; children: ReactNode; className?: string; id?: string }) {
  return (
    <form action={apiAction} className={className} id={id}>
      <input type="hidden" name="_m" value={call.m} />
      <input type="hidden" name="_p" value={call.p} />
      <input type="hidden" name="_back" value={call.back} />
      {call.to ? <input type="hidden" name="_to" value={call.to} /> : null}
      {call.done ? <input type="hidden" name="_done" value={call.done} /> : null}
      {call.multipart ? <input type="hidden" name="_multipart" value="1" /> : null}
      {children}
    </form>
  );
}

/** One button that makes one call (like, join, RSVP…). */
export function ApiButton({ call, className = "cm-btn g", icon, label, pressed, fields, title }: { call: Call; className?: string; icon?: string; label: string; pressed?: boolean; fields?: Record<string, string>; title?: string }) {
  return (
    <ApiForm call={call} className="cm-inline-form">
      {fields ? Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />) : null}
      <button type="submit" className={className} aria-pressed={pressed} title={title}>
        {icon ? <span className={`ms${pressed ? " f" : ""}`} aria-hidden="true">{icon}</span> : null}
        {label}
      </button>
    </ApiForm>
  );
}

/** What a form left on the page: pending review, done, or the API's error. */
export function PageNote({ sp, w2, pendingText, doneText }: { sp: { error?: string; pending?: string; done?: string }; w2: CmWords2; pendingText?: string; doneText?: Record<string, string> }) {
  if (sp.error) return <div className="cm-note err" role="alert"><span className="ms" aria-hidden="true">error</span>{sp.error === "not_allowed" || sp.error === "error" ? w2.error : `${w2.error} (${sp.error})`}</div>;
  if (sp.pending) return <div className="cm-note" role="status"><span className="ms" aria-hidden="true">schedule</span>{pendingText ?? w2.postPending}</div>;
  if (sp.done) return <div className="cm-note ok" role="status"><span className="ms" aria-hidden="true">check_circle</span>{doneText?.[sp.done] ?? w2.saved}</div>;
  return null;
}

export function Empty({ icon, text, children }: { icon: string; text: string; children?: ReactNode }) {
  return (
    <div className="cm-empty">
      <span className="ms" aria-hidden="true">{icon}</span>
      <p>{text}</p>
      {children}
    </div>
  );
}

export function More({ href, w2 }: { href: string | null; w2: CmWords2 }) {
  return href ? <div className="cm-row" style={{ justifyContent: "center", marginTop: 8 }}><Link href={href} className="cm-btn g">{w2.more}</Link></div> : null;
}

export function withCursor(href: string, cursor: string | null): string | null {
  if (!cursor) return null;
  return `${href}${href.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}`;
}

/** A page's title block: heading, intro and the page's main action. */
export function PageHead({ title, intro, children }: { title: string; intro?: string; children?: ReactNode }) {
  return (
    <div className="cm-card cm-ph">
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1>{title}</h1>
        {intro ? <p className="cm-muted">{intro}</p> : null}
      </div>
      {children ? <div className="cm-row">{children}</div> : null}
    </div>
  );
}

export function Who({ member, w, sub, size = 40 }: { member: MemberRef; w: CmWords; sub?: ReactNode; size?: number }) {
  return (
    <div className="cm-who">
      <Avatar member={member} size={size} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <MemberName member={member} w={w} />
        {sub ? <div className="m">{sub}</div> : null}
      </div>
    </div>
  );
}

/** The home's "share something" box: text, photos or one video (with its poster frame). */
export function Composer({ w2, back, groupId, viewer }: { w2: CmWords2; back: string; groupId?: string; viewer: Viewer }) {
  return (
    <ApiForm call={{ m: "POST", p: "/posts", back, multipart: true }} className="cm-card cm-composer">
      {groupId ? <input type="hidden" name="group_id" value={groupId} /> : null}
      <div className="cm-row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
        <Avatar member={viewer} size={40} />
        <label className="cm-sr" htmlFor="cm-post-body">{w2.writePost}</label>
        <textarea id="cm-post-body" name="body" required maxLength={10000} rows={2} placeholder={w2.writePost} />
      </div>
      <div className="cm-row cm-composer-bar">
        <label className="cm-pick"><span className="ms" aria-hidden="true">image</span>{w2.addPhotos}<input type="file" name="photos" accept="image/png,image/jpeg,image/webp" multiple /></label>
        <label className="cm-pick"><span className="ms" aria-hidden="true">movie</span>{w2.addVideo}<input type="file" name="video" accept="video/mp4,video/quicktime,video/webm" /></label>
        <label className="cm-pick"><span className="ms" aria-hidden="true">photo_frame</span>{w2.posterFrame}<input type="file" name="poster" accept="image/png,image/jpeg,image/webp" /></label>
        <span className="sp" />
        <button type="submit" className="cm-btn o">{w2.post}</button>
      </div>
      <small className="cm-muted">{w2.photosHint}</small>
    </ApiForm>
  );
}

function Media({ post }: { post: Post }) {
  if (!post.media.length) return null;
  const video = post.media.find((m) => m.kind === "video");
  if (video) return <video className="cm-media-video" src={video.url} poster={video.poster_url ?? undefined} controls preload="none" playsInline />;
  const photos = post.media.slice(0, 10);
  return (
    <div className={`cm-media n${Math.min(photos.length, 4)}`}>
      {photos.slice(0, 4).map((m, i) => (
        <a key={m.url} href={m.url} target="_blank" rel="noopener" className="ph">
          <img src={m.url} alt="" loading="lazy" />
          {i === 3 && photos.length > 4 ? <span className="more">+{photos.length - 4}</span> : null}
        </a>
      ))}
    </div>
  );
}

/** A member's post: text, photos or video, a link preview, likes, comments, save, share and report. */
export function PostCard({ post, w, w2, back, full = false }: { post: Post; w: CmWords; w2: CmWords2; back: string; full?: boolean }) {
  const p = `/posts/${encodeURIComponent(post.id)}`;
  return (
    <article className="cm-post" data-testid="cm-post">
      <Who member={post.author} w={w} sub={<Link href={cmLinks.post(post.id)}>{ago(w, post.created_at)}</Link>} />
      {post.status === "pending" ? <div className="cm-note" style={{ marginTop: 10 }}><span className="ms" aria-hidden="true">schedule</span>{w2.postPending}</div> : null}
      {post.body ? <p className={full ? "cm-body" : "cm-body clamp"}>{post.body}</p> : null}
      <Media post={post} />
      {post.link_preview ? (
        <a className="cm-lp" href={post.link_preview.url} target="_blank" rel="noopener nofollow ugc">
          {post.link_preview.image_url ? <img src={post.link_preview.image_url} alt="" loading="lazy" /> : null}
          <span>
            <small>{post.link_preview.site_name ?? new URL(post.link_preview.url).hostname}</small>
            <b>{post.link_preview.title}</b>
            {post.link_preview.description ? <em>{post.link_preview.description}</em> : null}
          </span>
        </a>
      ) : null}
      <div className="cm-acts">
        <ApiButton call={{ m: post.liked ? "DELETE" : "PUT", p: `${p}/like`, back }} className={`cm-act${post.liked ? " on" : ""}`} icon="favorite" pressed={post.liked} label={compact(post.like_count)} title={post.liked ? w2.liked : w2.like} />
        <Link href={`${cmLinks.post(post.id)}#comments`} className="cm-act"><span className="ms" aria-hidden="true">chat_bubble</span>{compact(post.comment_count)}<span className="cm-sr">{w2.comments}</span></Link>
        <span className="sp" />
        <CopyLink url={post.share_url} label={w2.share} copied={w2.linkCopied} />
        <ApiButton call={{ m: post.saved ? "DELETE" : "PUT", p: `${p}/save`, back }} className={`cm-act${post.saved ? " on" : ""}`} icon="bookmark" pressed={post.saved} label={post.saved ? w2.savedItem : w2.save} />
      </div>
    </article>
  );
}

export function ShowcaseCard({ item, w, w2 }: { item: ShowcaseSummary; w: CmWords; w2: CmWords2 }) {
  return (
    <Link href={cmLinks.showcaseItem(item.id)} className="cm-sc">
      <span className="pic">{item.cover_url ? <img src={item.cover_url} alt="" loading="lazy" /> : <span className="ms" aria-hidden="true">apps</span>}</span>
      <span className="txt">
        <b>{item.title}</b>
        <span className="cm-muted">{item.author.name}</span>
      </span>
      <span className="cm-row" style={{ gap: 8 }}>
        {item.made_with_yallapp ? <span className="pill p-gr" title={w2.madeWithYallappHint}><span className="ms f" aria-hidden="true">verified</span>{w2.madeWithYallapp}</span> : null}
        <span className="cm-muted cm-small"><span className="ms" aria-hidden="true">favorite</span>{compact(item.like_count)}</span>
      </span>
      <span className="cm-sr">{w2.viewAll}</span>
    </Link>
  );
}

/** The home feed: posts, questions and showcase apps, mixed. */
export function FeedList({ items, w, w2, back }: { items: FeedItem[]; w: CmWords; w2: CmWords2; back: string }) {
  return (
    <>
      {items.map((it) => {
        if (it.kind === "post") return <PostCard key={`p-${it.id}`} post={it.post} w={w} w2={w2} back={back} />;
        if (it.kind === "showcase") {
          return (
            <article key={`s-${it.id}`} className="cm-post">
              <Who member={it.showcase.author} w={w} sub={<><span className="pill p-gy">{w2.showcaseLabel}</span> {ago(w, it.created_at)}</>} />
              <div style={{ marginTop: 12 }}><ShowcaseCard item={it.showcase} w={w} w2={w2} /></div>
            </article>
          );
        }
        const q = it.question;
        return (
          <article key={`q-${it.id}`} className="cm-post">
            {q.author ? <Who member={q.author} w={w} sub={ago(w, it.created_at)} /> : null}
            <div className="cm-q" style={{ marginTop: 12 }}>
              <div className="tg"><span className="pill p-or">{w2.questionLabel}</span></div>
              <h4><Link href={cmLinks.question(q.slug || q.id)}>{q.title}</Link></h4>
              {q.excerpt ? <p className="cm-muted" style={{ margin: "6px 0 0", fontSize: 14.5 }}>{q.excerpt}</p> : null}
            </div>
          </article>
        );
      })}
    </>
  );
}

/** The ring row: the viewer's own story first, then the members they follow. */
export function StoryRow({ rings, viewer, w2, back }: { rings: StoryRing[]; viewer: Viewer | null; w2: CmWords2; back: string }) {
  const mine = viewer ? rings.find((r) => r.member.id === viewer.id) : undefined;
  const others = rings.filter((r) => r.member.id !== viewer?.id);
  if (!viewer && !others.length) return null;
  return (
    <section className="cm-stories" aria-label={w2.stories}>
      {viewer ? (
        mine ? (
          <Link href={cmLinks.stories(viewer.handle)} className="ring">
            <span className="r"><Avatar member={viewer} size={58} /></span>
            <span className="l">{w2.yourStory}</span>
          </Link>
        ) : (
          <details className="ring add">
            <summary>
              <span className="r plus"><Avatar member={viewer} size={58} /><span className="ms" aria-hidden="true">add</span></span>
              <span className="l">{w2.addStory}</span>
            </summary>
            <ApiForm call={{ m: "POST", p: "/stories", back, multipart: true }} className="cm-card cm-story-add">
              <label className="cm-field">{w2.addPhotos}<input type="file" name="photo" accept="image/png,image/jpeg,image/webp" /></label>
              <label className="cm-field">{w2.addVideo}<input type="file" name="video" accept="video/mp4,video/quicktime,video/webm" /></label>
              <label className="cm-field">{w2.posterFrame}<input type="file" name="poster" accept="image/png,image/jpeg,image/webp" /></label>
              <small className="cm-muted">{w2.storyHint}</small>
              <div className="cm-row" style={{ marginTop: 10 }}><button type="submit" className="cm-btn o">{w2.post}</button></div>
            </ApiForm>
          </details>
        )
      ) : null}
      {others.map((r) => (
        <Link key={r.member.id} href={cmLinks.stories(r.member.handle ?? r.member.id)} className={`ring${r.all_seen ? " seen" : ""}`}>
          <span className="r"><Avatar member={r.member} size={58} /></span>
          <span className="l">{r.member.name.split(" ")[0]}</span>
        </Link>
      ))}
    </section>
  );
}

/** Comments with one level of replies, and the forms to write them. */
export function Comments({ items, w, w2, back, path, canWrite }: { items: Comment[]; w: CmWords; w2: CmWords2; back: string; path: string; canWrite: boolean }) {
  return (
    <section className="cm-card" id="comments">
      <h2>{w2.comments}</h2>
      {canWrite ? (
        <ApiForm call={{ m: "POST", p: path, back }} className="cm-cmt-form">
          <label className="cm-sr" htmlFor="cm-cmt">{w2.writeComment}</label>
          <textarea id="cm-cmt" name="body" required maxLength={4000} rows={2} placeholder={w2.writeComment} />
          <button type="submit" className="cm-btn o">{w2.comment}</button>
        </ApiForm>
      ) : null}
      {items.length ? (
        <ul className="cm-cmts">
          {items.map((c) => (
            <li key={c.id}>
              <CommentItem c={c} w={w} w2={w2} back={back} />
              {c.replies.length ? (
                <ul>
                  {c.replies.map((r) => <li key={r.id}><CommentItem c={r} w={w} w2={w2} back={back} /></li>)}
                </ul>
              ) : null}
              {canWrite ? (
                <details className="cm-reply">
                  <summary>{w2.reply}</summary>
                  <ApiForm call={{ m: "POST", p: path, back }} className="cm-cmt-form">
                    <input type="hidden" name="parent_id" value={c.id} />
                    <textarea name="body" required maxLength={4000} rows={2} placeholder={w2.writeReply} aria-label={w2.writeReply} />
                    <button type="submit" className="cm-btn g">{w2.reply}</button>
                  </ApiForm>
                </details>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="cm-muted" style={{ marginTop: 10 }}>{w2.noComments}</p>
      )}
    </section>
  );
}

function CommentItem({ c, w, w2, back }: { c: Comment; w: CmWords; w2: CmWords2; back: string }) {
  return (
    <div className="cm-cmt">
      <Avatar member={c.author} size={32} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="cm-row" style={{ gap: 8 }}>
          <MemberName member={c.author} w={w} />
          <span className="cm-muted cm-small">{ago(w, c.created_at)}</span>
        </div>
        <p>{c.body}</p>
        <ApiButton call={{ m: c.liked ? "DELETE" : "PUT", p: `/comments/${encodeURIComponent(c.id)}/like`, back }} className={`cm-act sm${c.liked ? " on" : ""}`} icon="favorite" pressed={c.liked} label={c.like_count ? compact(c.like_count) : w2.like} />
      </div>
    </div>
  );
}

/** A date and time in the viewer's own time zone (the server can't know it). */
export function When({ at, lang }: { at: string; lang: string }) {
  return <LocalTime at={at} lang={lang} />;
}

export function Stat({ n, label }: { n: number | string; label: string }) {
  return <span className="cm-stat-i"><b className="num">{typeof n === "number" ? compact(n) : n}</b> {label}</span>;
}

export { fill };
