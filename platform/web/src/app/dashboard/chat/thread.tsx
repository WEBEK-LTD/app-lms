import Link from "next/link";
import type { ReactNode } from "react";
import { blockChatMemberAction, clearChatConversationAction, deleteChatMessageAction, keepChatConversationAction } from "@/app/actions/chat";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { KitCallout, KitStatus, kit } from "@/components/studio-page";
import { KitInspectorPart } from "@/components/studio-page/parts";
import type { DashKey } from "@/i18n/dashboard";
import type { ChatDeps } from "@/lib/chat/service";
import { expiresOn, ownerMessages, ownerRead, type OwnerMessageView } from "@/lib/chat/owner";
import type { App } from "@/lib/data/types";
import type { DashboardText } from "@/lib/dashboard-lang";
import { ChatReplyForm, ConfirmButton } from "./forms";

const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" };
const ATTACHMENT: Record<"image" | "video" | "audio" | "file", DashKey> = { image: "chat.photo", video: "chat.video", audio: "chat.voice", file: "chat.file" };

export interface ChatThread {
  title: string;
  kind: "direct" | "group";
  /** The person or the group, in one line. */
  line: string;
  blocked: boolean;
  /** The messages, the answer and what to do with the conversation. */
  body: ReactNode;
}

/**
 * 77 One conversation: its messages (opening it marks it read for the
 * business), the answer, keeping it, stopping the person and deleting it.
 * 132.160 Drawn for the list's inspector (`inList`: a change comes back to
 * the list with it open, older messages on its own page) and for its own
 * page alike.
 */
export async function chatThread({ deps, app, id, before, text, inList }: { deps: ChatDeps; app: App; id: string; before: string | null; text: DashboardText; inList: boolean }): Promise<ChatThread | null> {
  const { t, date } = text;
  const page = await ownerMessages(deps, app, id, new URLSearchParams(before ? { before, limit: "50" } : { limit: "50" }));
  if (!page.ok) return null;
  const { conversation } = page.value;
  const store = deps.store;
  const messages = [...page.value.items].reverse();
  if (!before && messages.length) await ownerRead(deps, app, conversation.id, messages[messages.length - 1]!.id);
  const member = conversation.memberId ? await store.getChatMember(app.id, conversation.memberId) : null;
  const oldest = (await store.listChatMessages(conversation.id, { after: 0, limit: 1 }))[0]?.createdAt ?? null;
  const expires = expiresOn(oldest, conversation.keepUntil);
  const memberCount = conversation.kind === "group" ? (await store.listChatParticipants(conversation.id)).length : 0;
  const when = (iso: string) => t("listings.utc", { time: date(new Date(iso), WHEN) });
  const title = conversation.kind === "direct" ? (member?.name ?? "—") : conversation.title || t("chat.group");
  const kept = conversation.keepUntil && expires && conversation.keepUntil.getTime() >= expires.getTime();
  const backField = inList ? <input type="hidden" name="back" value="list" /> : null;
  const older = `/dashboard/chat/${conversation.id}`;

  const Attachment = ({ a }: { a: NonNullable<OwnerMessageView["attachment"]> }) => {
    if (a.kind === "image") {
      // eslint-disable-next-line @next/next/no-img-element -- a signed link to the media gate
      return <img src={a.url} alt={a.name} className="max-h-72 max-w-full rounded-xl object-contain" />;
    }
    if (a.kind === "video") return <video src={a.url} controls preload="metadata" className="max-h-72 max-w-full rounded-xl" aria-label={a.name} />;
    if (a.kind === "audio") return <audio src={a.url} controls preload="metadata" aria-label={t(ATTACHMENT.audio)} />;
    return (
      <a href={a.url} className="inline-flex items-center gap-2 font-semibold underline" download={a.name}>
        <Icon name="description" size={20} />
        {a.name}
      </a>
    );
  };
  const Message = ({ m }: { m: OwnerMessageView }) => {
    const ours = m.sender.kind === "business";
    const who = ours ? (m.sender.team_member ? t("chat.fromTeam", { business: m.sender.name, name: m.sender.team_member }) : m.sender.name) : m.sender.name;
    return (
      <li className={`flex flex-col gap-1 ${ours ? "items-end" : "items-start"}`}>
        <span className="flex flex-wrap items-center gap-2 text-[12.5px] text-(--sp-muted)">
          {who} · {when(m.created_at)}
          {m.reported ? <KitStatus tone="warn">{t("chat.reported")}</KitStatus> : null}
        </span>
        <div className={`flex max-w-[88%] flex-col gap-2 rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-relaxed ${ours ? "rounded-ee-md bg-(--sp-ink) text-(--sp-surface)" : "rounded-es-md bg-(--sp-soft) text-(--sp-ink)"}`}>
          {m.deleted ? (
            <em className="opacity-80">{t("chat.deleted")}</em>
          ) : (
            <>
              {m.attachment ? <Attachment a={m.attachment} /> : null}
              {m.text ? (
                <p className="m-0 break-words whitespace-pre-wrap" dir="auto">
                  {m.text}
                </p>
              ) : null}
            </>
          )}
        </div>
        {!m.deleted ? (
          <form action={deleteChatMessageAction}>
            <input type="hidden" name="conversation" value={conversation.id} />
            <input type="hidden" name="message" value={m.id} />
            {backField}
            <ConfirmButton confirm={t("chat.deleteConfirm")} label={t("chat.deleteMessageLabel")} className="cursor-pointer border-0 bg-transparent p-0 text-[12.5px] font-semibold text-danger">
              {t("chat.deleteMessage")}
            </ConfirmButton>
          </form>
        ) : null}
      </li>
    );
  };

  const body = (
    <div className="flex min-w-0 flex-col gap-5" data-chat-thread={conversation.id}>
      {member?.blockedAt ? (
        <KitCallout icon="block" tone="warn">
          {t("chat.blockedText", { name: member.name })}
        </KitCallout>
      ) : null}
      <KitInspectorPart
        title={t("chat.messages")}
        aside={
          inList ? (
            page.value.has_more ? (
              <Link href={messages[0] ? `${older}?before=${messages[0].id}` : older} className="text-[13px] font-semibold">
                {t("chat.older")}
              </Link>
            ) : null
          ) : page.value.has_more || before ? (
            <span className="flex gap-4 text-[13px]">
              {page.value.has_more && messages[0] ? <Link href={`${older}?before=${messages[0].id}`}>{t("chat.older")}</Link> : null}
              {before ? <Link href={older}>{t("chat.newest")}</Link> : null}
            </span>
          ) : null
        }
      >
        {messages.length === 0 ? (
          <p className="m-0 text-[14.5px] text-(--sp-muted)">{t("chat.noMessages")}</p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {messages.map((m) => (
              <Message key={m.id} m={m} />
            ))}
          </ol>
        )}
      </KitInspectorPart>
      {!before ? <ChatReplyForm conversationId={conversation.id} business={deps.business.name} /> : null}
      <KitInspectorPart title={t("chat.thisConversation")}>
        <div className="flex flex-col gap-4 rounded-[14px] border border-(--sp-line) p-4">
          {expires ? (
            <div className="flex flex-col items-start gap-2.5">
              <span className="text-[13.5px] leading-relaxed text-(--sp-muted)">{kept ? t("chat.retentionKept", { date: date(expires) }) : t("chat.retention", { date: date(expires) })}</span>
              <form action={keepChatConversationAction}>
                <input type="hidden" name="conversation" value={conversation.id} />
                {backField}
                <SubmitButton variant="pill" className="h-9" pendingText={t("chat.saving")}>
                  <Icon name="bookmark" size={18} />
                  {t("chat.keep")}
                </SubmitButton>
              </form>
            </div>
          ) : null}
          {member ? (
            <form action={blockChatMemberAction} className={`flex flex-col items-start gap-2.5 ${expires ? "border-t border-(--sp-line) pt-4" : ""}`}>
              <input type="hidden" name="conversation" value={conversation.id} />
              <input type="hidden" name="member" value={member.id} />
              <input type="hidden" name="blocked" value={member.blockedAt ? "0" : "1"} />
              {backField}
              <SubmitButton variant="pill" className="h-9" pendingText={t("chat.saving")}>
                <Icon name="block" size={18} />
                {member.blockedAt ? t("chat.unblock") : t("chat.block")}
              </SubmitButton>
            </form>
          ) : null}
          <form action={clearChatConversationAction} className={`flex flex-col items-start gap-2.5 ${expires || member ? "border-t border-(--sp-line) pt-4" : ""}`}>
            <input type="hidden" name="conversation" value={conversation.id} />
            {backField}
            <span className="text-[13.5px] leading-relaxed text-(--sp-muted)">{t("chat.clearText")}</span>
            <ConfirmButton confirm={t("chat.clearConfirm")} className={`${kit.row} text-danger hover:text-danger`}>
              <Icon name="delete" size={18} />
              {t("chat.clear")}
            </ConfirmButton>
          </form>
        </div>
      </KitInspectorPart>
    </div>
  );
  return {
    title,
    kind: conversation.kind === "group" ? "group" : "direct",
    line: conversation.kind === "group" ? `${t("chat.group")} · ${t("chat.members", { count: memberCount })}` : t("chat.person"),
    blocked: Boolean(member?.blockedAt),
    body,
  };
}
