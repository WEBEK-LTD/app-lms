import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { blockChatMemberAction, clearChatConversationAction, deleteChatMessageAction, keepChatConversationAction } from "@/app/actions/chat";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn, Notice, Section } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { chatAvailable } from "@/lib/chat/access";
import { dashboardChatDeps } from "@/lib/chat/dashboard";
import { expiresOn, ownerMessages, ownerRead, type OwnerMessageView } from "@/lib/chat/owner";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { appPlan } from "@/lib/entitlements";
import { AutoRefresh } from "../../orders/refresh";
import { ChatReplyForm, ConfirmButton } from "../forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("chat.title") };
}
export const dynamic = "force-dynamic";

const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" };
const ATTACHMENT: Record<"image" | "video" | "audio" | "file", DashKey> = { image: "chat.photo", video: "chat.video", audio: "chat.voice", file: "chat.file" };

/** 77 One conversation: opening it marks it read for the business. New messages show every few seconds. */
export default async function ChatConversationPage({ params, searchParams }: PageProps<"/dashboard/chat/[id]">) {
  const { app, license } = await requireClient("chat");
  if (!app) redirect("/dashboard/app-type");
  const store = await getStore();
  const now = new Date();
  const plan = await appPlan(store, license, now);
  if (!chatAvailable(app, plan)) redirect("/dashboard/chat");
  const { id } = await params;
  const query = await searchParams;
  const before = typeof query.before === "string" && /^[1-9][0-9]{0,15}$/.test(query.before) ? query.before : null;
  const deps = dashboardChatDeps(store, app, plan, now);
  const page = await ownerMessages(deps, app, id, new URLSearchParams(before ? { before, limit: "50" } : { limit: "50" }));
  if (!page.ok) notFound();
  const { conversation } = page.value;
  const messages = [...page.value.items].reverse();
  if (!before && messages.length) await ownerRead(deps, app, conversation.id, messages[messages.length - 1]!.id);
  const member = conversation.memberId ? await store.getChatMember(app.id, conversation.memberId) : null;
  const oldest = (await store.listChatMessages(conversation.id, { after: 0, limit: 1 }))[0]?.createdAt ?? null;
  const expires = expiresOn(oldest, conversation.keepUntil);
  const memberCount = conversation.kind === "group" ? (await store.listChatParticipants(conversation.id)).length : 0;
  const { t, date } = await dashboardText();
  const when = (iso: string) => t("listings.utc", { time: date(new Date(iso), WHEN) });
  const title = conversation.kind === "direct" ? (member?.name ?? "—") : conversation.title || t("chat.group");
  const kept = conversation.keepUntil && expires && conversation.keepUntil.getTime() >= expires.getTime();

  return (
    <div className="flex max-w-[820px] flex-col gap-6">
      {!before ? <AutoRefresh seconds={5} /> : null}
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/chat" className="text-sm font-semibold">
          {t("chat.back")}
        </Link>
        <h1 className="m-0 flex flex-wrap items-center gap-2 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">
          {title}
          {member?.blockedAt ? <Badge tone="neutral">{t("chat.blocked")}</Badge> : null}
        </h1>
        <p className="m-0 text-[15px] text-ink-4">
          {conversation.kind === "group" ? `${t("chat.group")} · ${t("chat.members", { count: memberCount })}` : t("chat.person")}
        </p>
      </div>

      {member?.blockedAt ? <Notice icon="block">{t("chat.blockedText", { name: member.name })}</Notice> : null}

      <Section title={t("chat.messages")} titleId="h-chat-messages">
        {page.value.has_more || before ? (
          <nav className="flex justify-between text-sm">
            {page.value.has_more && messages[0] ? <Link href={`/dashboard/chat/${conversation.id}?before=${messages[0].id}`}>{t("chat.older")}</Link> : <span />}
            {before ? <Link href={`/dashboard/chat/${conversation.id}`}>{t("chat.newest")}</Link> : null}
          </nav>
        ) : null}
        {messages.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("chat.noMessages")}</p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-3 p-0">
            {messages.map((m) => (
              <Message key={m.id} m={m} />
            ))}
          </ol>
        )}
        {!before ? <ChatReplyForm conversationId={conversation.id} business={deps.business.name} /> : null}
      </Section>

      <Section title={t("chat.thisConversation")} titleId="h-chat-conversation">
        {expires ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[15px] text-ink-4">{kept ? t("chat.retentionKept", { date: date(expires) }) : t("chat.retention", { date: date(expires) })}</span>
            <form action={keepChatConversationAction}>
              <input type="hidden" name="conversation" value={conversation.id} />
              <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm" pendingText={t("chat.saving")}>
                <Icon name="bookmark" size={18} />
                {t("chat.keep")}
              </SubmitButton>
            </form>
          </div>
        ) : null}
        {member ? (
          <form action={blockChatMemberAction} className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
            <input type="hidden" name="conversation" value={conversation.id} />
            <input type="hidden" name="member" value={member.id} />
            <input type="hidden" name="blocked" value={member.blockedAt ? "0" : "1"} />
            <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm" pendingText={t("chat.saving")}>
              <Icon name="block" size={18} />
              {member.blockedAt ? t("chat.unblock") : t("chat.block")}
            </SubmitButton>
          </form>
        ) : null}
        <form action={clearChatConversationAction} className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
          <input type="hidden" name="conversation" value={conversation.id} />
          <span className="max-w-[520px] text-sm text-muted">{t("chat.clearText")}</span>
          <ConfirmButton confirm={t("chat.clearConfirm")} className={`${btn.danger} h-9 px-3.5 text-sm`}>
            <Icon name="delete" size={18} />
            {t("chat.clear")}
          </ConfirmButton>
        </form>
      </Section>
    </div>
  );

  function Message({ m }: { m: OwnerMessageView }) {
    const ours = m.sender.kind === "business";
    const who = ours ? (m.sender.team_member ? t("chat.fromTeam", { business: m.sender.name, name: m.sender.team_member }) : m.sender.name) : m.sender.name;
    return (
      <li className={`flex flex-col gap-1 ${ours ? "items-end" : "items-start"}`}>
        <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          {who} · {when(m.created_at)}
          {m.reported ? <Badge tone="warn">{t("chat.reported")}</Badge> : null}
        </span>
        <div className={`flex max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${ours ? "bg-midnight text-white" : "bg-sand text-ink-2"}`}>
          {m.deleted ? (
            <em className="opacity-80">{t("chat.deleted")}</em>
          ) : (
            <>
              {m.attachment ? <Attachment a={m.attachment} /> : null}
              {m.text ? <p className="m-0 whitespace-pre-wrap break-words">{m.text}</p> : null}
            </>
          )}
        </div>
        {!m.deleted ? (
          <form action={deleteChatMessageAction}>
            <input type="hidden" name="conversation" value={conversation.id} />
            <input type="hidden" name="message" value={m.id} />
            <ConfirmButton confirm={t("chat.deleteConfirm")} label={t("chat.deleteMessageLabel")} className="text-[13px] font-semibold text-danger">
              {t("chat.deleteMessage")}
            </ConfirmButton>
          </form>
        ) : null}
      </li>
    );
  }

  function Attachment({ a }: { a: NonNullable<OwnerMessageView["attachment"]> }) {
    if (a.kind === "image") {
      // eslint-disable-next-line @next/next/no-img-element
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
  }
}
