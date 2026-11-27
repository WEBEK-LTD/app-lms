import Link from "next/link";
import { Avatar } from "@/components/community/site/avatar";
import type { Viewer } from "@/components/community/site/data";
import { cmLinks } from "@/components/community/site/links";
import type { Conversation } from "@/components/community/site/next";
import { ago, type CmWords } from "@/components/community/site/words";
import type { CmWords2 } from "@/components/community/site/words2";

/** A conversation's name: its title, or the other people in it. */
export function conversationName(c: Conversation, viewer: Viewer, w2: CmWords2): string {
  if (c.title) return c.title;
  const others = c.members.filter((m) => m.id !== viewer.id);
  return others.map((m) => m.name).join(", ") || w2.you;
}

/** 232 The inbox: conversations, latest message first, unread in bold. */
export function Inbox({ items, viewer, w, w2, current }: { items: Conversation[]; viewer: Viewer; w: CmWords; w2: CmWords2; current?: string }) {
  return (
    <ul className="cm-inbox">
      {items.map((c) => {
        const other = c.members.find((m) => m.id !== viewer.id) ?? c.members[0];
        const last = c.last_message;
        return (
          <li key={c.id}>
            <Link href={cmLinks.conversation(c.id)} className={`${c.unread ? "unread" : ""}${current === c.id ? " on" : ""}`} aria-current={current === c.id ? "page" : undefined}>
              {c.kind === "group" ? <span className="av grp"><span className="ms" aria-hidden="true">group</span></span> : other ? <Avatar member={other} size={44} /> : null}
              <span className="txt">
                <b>{conversationName(c, viewer, w2)}{c.kind === "hire" ? <span className="pill p-gy">{w2.hireThread}</span> : null}</b>
                <span className="cm-muted">{last ? (last.deleted ? w2.deletedMessage : `${last.author.id === viewer.id ? `${w2.you}: ` : ""}${last.body || (last.photos.length ? w2.addPhotos : "")}`) : ""}</span>
              </span>
              <span className="meta">
                {last ? <span className="cm-small cm-muted">{ago(w, last.created_at)}</span> : null}
                {c.unread ? <span className="dot" aria-label={String(c.unread)}>{c.unread}</span> : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
