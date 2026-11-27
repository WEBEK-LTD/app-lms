/* eslint-disable @next/next/no-img-element -- photos sent in a conversation, from the community's file store. */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/community/site/avatar";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { cmTarget } from "@/components/community/site/redirect";
import { conversation, conversations, messages, send } from "@/components/community/site/next";
import { Poll, ScrollEnd } from "@/components/community/site/next-client";
import { ApiButton, ApiForm, PageNote } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { ago, fill } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";
import { conversationName, Inbox } from "../inbox";

export const metadata: Metadata = { title: "Messages" };

/** 232 A conversation: messages oldest first, replies, photos and read state; polled every few seconds. */
export default async function ConversationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ reply?: string; error?: string; done?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(cmLinks.conversation(id))));
  const w2 = CM_WORDS2[lang];
  const [c, page, inbox] = await Promise.all([conversation(id), messages(id), conversations()]);
  if (!c) notFound();
  const list = [...page.items].reverse();
  const newest = list[list.length - 1];
  if (newest && c.unread) await send("POST", `/messages/conversations/${encodeURIComponent(c.id)}/read`, { body: { message_id: newest.id } });
  const back = cmLinks.conversation(c.id);
  const p = `/messages/conversations/${encodeURIComponent(c.id)}`;
  const replyTo = sp.reply ? list.find((m) => m.id === sp.reply) : undefined;
  const others = c.members.filter((m) => m.id !== viewer.id);
  return (
    <SitePage active="messages">
      <Poll seconds={5} />
      <div className="cm-chat">
        <aside className="cm-card cm-chat-list" aria-label={w2.messagesTitle}><Inbox items={inbox.items} viewer={viewer} w={w} w2={w2} current={c.id} /></aside>
        <section className="cm-card cm-chat-main" aria-label={conversationName(c, viewer, w2)}>
          <header className="cm-chat-head">
            <Link href={cmLinks.messages()} className="cm-icb cm-only-phone" aria-label={w2.messagesTitle}><span className="ms" aria-hidden="true">arrow_back</span></Link>
            {others[0] ? <Avatar member={others[0]} size={36} /> : null}
            <div style={{ flex: 1, minWidth: 0 }}>
              <b>{conversationName(c, viewer, w2)}</b>
              {c.kind === "group" ? <div className="cm-muted cm-small">{fill(w2.groupMembers, { n: c.members.length })}</div> : null}
            </div>
            <details className="cm-more">
              <summary className="cm-icb" aria-label={w2.more}><span className="ms" aria-hidden="true">more_vert</span></summary>
              <div className="cm-more-menu">
                <ApiButton call={{ m: "POST", p: `${p}/report`, back, done: "reported" }} className="cm-am-row" icon="flag" label={w2.reportChat} fields={{ reason: "other" }} />
                <ApiButton call={{ m: "DELETE", p: `${p}/members/me`, back, to: cmLinks.messages() }} className="cm-am-row" icon="logout" label={w2.leaveChat} />
              </div>
            </details>
          </header>
          <PageNote sp={sp} w2={w2} doneText={{ reported: w2.reportChatSent }} />
          <ol className="cm-msgs">
            {list.map((m) => {
              const mine = m.author.id === viewer.id;
              return (
                <li key={m.id} className={mine ? "me" : ""}>
                  {!mine && c.kind !== "direct" ? <span className="who">{m.author.name}</span> : null}
                  <div className="bubble">
                    {m.reply_to ? <blockquote>{m.reply_to.author_name}: {m.reply_to.excerpt}</blockquote> : null}
                    {m.deleted ? <em className="cm-muted">{w2.deletedMessage}</em> : m.body ? <p>{m.body}</p> : null}
                    {!m.deleted && m.photos.length ? <div className="pics">{m.photos.map((src) => <a key={src} href={src} target="_blank" rel="noopener"><img src={src} alt="" loading="lazy" /></a>)}</div> : null}
                  </div>
                  <span className="meta">
                    {ago(w, m.created_at)}
                    {!m.deleted ? <Link href={`${back}?reply=${encodeURIComponent(m.id)}#cm-compose`} className="cm-link">{w2.reply}</Link> : null}
                    {mine && !m.deleted ? <ApiButton call={{ m: "DELETE", p: `${p}/messages/${encodeURIComponent(m.id)}`, back }} className="cm-link" label={w2.delete} /> : null}
                  </span>
                </li>
              );
            })}
            <ScrollEnd dep={newest?.id ?? ""} />
          </ol>
          {c.blocked ? (
            <p className="cm-note">{w2.blockedChat}</p>
          ) : (
            <ApiForm call={{ m: "POST", p: `${p}/messages`, back }} className="cm-compose" id="cm-compose">
              {replyTo ? (
                <div className="cm-replying">
                  <span>{fill(w2.replyingTo, { name: replyTo.author.name })}: {replyTo.body.slice(0, 80)}</span>
                  <Link href={back} className="cm-link">{w2.cancel}</Link>
                  <input type="hidden" name="reply_to_id" value={replyTo.id} />
                </div>
              ) : null}
              <div className="cm-row" style={{ flexWrap: "nowrap" }}>
                <label className="cm-icb cm-pick" aria-label={w2.addPhotos}><span className="ms" aria-hidden="true">image</span><input type="file" name="photos" accept="image/png,image/jpeg,image/webp" multiple /></label>
                <label className="cm-sr" htmlFor="cm-msg">{w2.typeMessage}</label>
                <textarea id="cm-msg" name="body" maxLength={4000} rows={1} placeholder={w2.typeMessage} />
                <button type="submit" className="cm-btn o" aria-label={w2.send}><span className="ms" aria-hidden="true">send</span></button>
              </div>
            </ApiForm>
          )}
        </section>
      </div>
    </SitePage>
  );
}
