import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { cmTarget } from "@/components/community/site/redirect";
import { conversations } from "@/components/community/site/next";
import { Poll } from "@/components/community/site/next-client";
import { Empty, PageNote } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { CM_WORDS2 } from "@/components/community/site/words2";
import { startConversationAction } from "../next-actions";
import { Inbox } from "./inbox";

export const metadata: Metadata = { title: "Messages" };

/** 232 Messages: the inbox (updated by polling) and a new conversation, one to one or a small group. */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ to?: string; error?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(cmLinks.messages())));
  const w2 = CM_WORDS2[lang];
  const list = await conversations();
  return (
    <SitePage active="messages">
      <Poll seconds={15} />
      <div className="cm-card cm-ph">
        <h1 style={{ flex: 1 }}>{w2.messagesTitle}</h1>
      </div>
      <PageNote sp={sp.error === "member_not_found" ? {} : sp} w2={w2} />
      {sp.error === "member_not_found" ? <div className="cm-note err" role="alert">{w2.memberNotFound}</div> : null}
      <details className="cm-card cm-new-chat" open={!!sp.to || !list.items.length}>
        <summary><span className="ms" aria-hidden="true">edit_square</span>{w2.newMessage}</summary>
        <form action={startConversationAction}>
          <label className="cm-field">{w2.to}<input name="to" required defaultValue={sp.to ?? ""} placeholder="@username" /><small>{w2.toHint}</small></label>
          <label className="cm-field">{w2.chatName}<input name="title" maxLength={80} /></label>
          <label className="cm-field">{w2.message}<textarea name="body" maxLength={4000} rows={3} /></label>
          <div className="cm-row" style={{ marginTop: 12 }}><button type="submit" className="cm-btn o">{w2.send}</button></div>
        </form>
      </details>
      {list.items.length ? <div className="cm-card" style={{ padding: 8 }}><Inbox items={list.items} viewer={viewer} w={w} w2={w2} /></div> : <Empty icon="chat_bubble" text={w2.noConversations} />}
    </SitePage>
  );
}
