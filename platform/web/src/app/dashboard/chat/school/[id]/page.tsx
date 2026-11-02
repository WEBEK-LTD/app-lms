import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { closeSchoolConversationAction, deleteSchoolMessageAction } from "@/app/actions/chat";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, Notice, Section } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { chatAvailable } from "@/lib/chat/access";
import { dashboardChatDeps } from "@/lib/chat/dashboard";
import { ownerMessageViews, type OwnerMessageView } from "@/lib/chat/owner";
import { pageQuery } from "@/lib/chat/service";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { appPlan } from "@/lib/entitlements";
import { adminMayRead, schoolWorld, sharedStudents } from "@/lib/school/messages";
import { ConfirmButton } from "../../forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("chat.schoolConversations") };
}
export const dynamic = "force-dynamic";

const WHEN: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" };
const ATTACHMENT: Record<"image" | "video" | "audio" | "file", DashKey> = { image: "chat.photo", video: "chat.video", audio: "chat.voice", file: "chat.file" };

/**
 * 113.6 A teacher's conversation with a parent or student, as the
 * administration sees it: only when the school's settings let it read them
 * or a message in it was reported. It closes the conversation (or opens it
 * again) and deletes a message; it never writes in it.
 */
export default async function SchoolConversationPage({ params, searchParams }: PageProps<"/dashboard/chat/school/[id]">) {
  const { app, license } = await requireClient("chat");
  if (!app) redirect("/dashboard/app-type");
  const store = await getStore();
  const now = new Date();
  const plan = await appPlan(store, license, now);
  if (!chatAvailable(app, plan)) redirect("/dashboard/chat");
  const { id } = await params;
  const conversation = /^[0-9a-f-]{36}$/.test(id) ? await store.getChatConversation(app.id, id) : null;
  const world = conversation?.kind === "school" ? await schoolWorld(store, app) : null;
  if (!conversation || !world || !(await adminMayRead(store, app, conversation, world.messages))) notFound();
  const query = await searchParams;
  const before = typeof query.before === "string" && /^[1-9][0-9]{0,15}$/.test(query.before) ? query.before : null;
  const page = pageQuery(new URLSearchParams(before ? { before, limit: "50" } : { limit: "50" }))!;
  const rows = await store.listChatMessages(conversation.id, { ...page.range, limit: page.limit + 1 });
  const deps = dashboardChatDeps(store, app, plan, now);
  const messages = (await ownerMessageViews(deps, app, rows.slice(0, page.limit))).reverse();
  const hasMore = rows.length > page.limit;
  const teacher = world.dir.people.get(conversation.schoolTeacherId ?? 0) ?? null;
  const other = world.dir.people.get(conversation.schoolPersonId ?? 0) ?? null;
  const students = teacher && other ? sharedStudents(world, teacher, other).map((s) => s.name) : [];
  const teacherMember = teacher?.userId != null ? await store.findChatMember(app.id, "hosted", String(teacher.userId)) : null;
  const { t, date } = await dashboardText();
  const when = (iso: string) => t("listings.utc", { time: date(new Date(iso), WHEN) });

  return (
    <div className="flex max-w-[820px] flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/chat?view=school" className="text-sm font-semibold">
          {t("chat.backSchool")}
        </Link>
        <h1 className="m-0 flex flex-wrap items-center gap-2 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">
          {teacher?.name ?? "—"} · {other?.name ?? "—"}
          {conversation.closedAt ? <Badge tone="neutral">{t("chat.closed")}</Badge> : null}
        </h1>
        <p className="m-0 text-[15px] text-ink-4">{other?.role === "student" ? t("chat.teacherAndStudent") : t("chat.teacherAndParent", { names: students.join(", ") || "—" })}</p>
      </div>

      <Notice icon={world.messages.adminReads ? "visibility" : "lock"}>{world.messages.adminReads ? t("chat.schoolReads") : t("chat.schoolReportedOnly")}</Notice>

      <Section title={t("chat.messages")} titleId="h-school-messages">
        {hasMore || before ? (
          <nav className="flex justify-between text-sm">
            {hasMore && messages[0] ? <Link href={`/dashboard/chat/school/${conversation.id}?before=${messages[0].id}`}>{t("chat.older")}</Link> : <span />}
            {before ? <Link href={`/dashboard/chat/school/${conversation.id}`}>{t("chat.newest")}</Link> : null}
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
      </Section>

      <Section title={t("chat.thisConversation")} titleId="h-school-conversation">
        <form action={closeSchoolConversationAction} className="flex flex-wrap items-center justify-between gap-3">
          <input type="hidden" name="conversation" value={conversation.id} />
          <input type="hidden" name="closed" value={conversation.closedAt ? "0" : "1"} />
          <span className="max-w-[520px] text-sm text-muted">{conversation.closedAt ? t("chat.closedText") : t("chat.closeText")}</span>
          <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm" pendingText={t("chat.saving")}>
            <Icon name={conversation.closedAt ? "forum" : "lock"} size={18} />
            {conversation.closedAt ? t("chat.reopen") : t("chat.close")}
          </SubmitButton>
        </form>
      </Section>
    </div>
  );

  function Message({ m }: { m: OwnerMessageView }) {
    const fromTeacher = Boolean(teacherMember && m.sender.member_id === teacherMember.id);
    return (
      <li className={`flex flex-col gap-1 ${fromTeacher ? "items-end" : "items-start"}`}>
        <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
          {m.sender.name} · {when(m.created_at)}
          {m.reported ? <Badge tone="warn">{t("chat.reported")}</Badge> : null}
        </span>
        <div className={`flex max-w-[85%] flex-col gap-2 rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${fromTeacher ? "bg-ivory text-ink-2" : "bg-sand text-ink-2"}`}>
          {m.deleted ? (
            <em className="opacity-80">{t("chat.deleted")}</em>
          ) : (
            <>
              {m.attachment ? (
                <a href={m.attachment.url} className="inline-flex items-center gap-2 font-semibold underline" download={m.attachment.name}>
                  <Icon name="description" size={20} />
                  {t(ATTACHMENT[m.attachment.kind])}: {m.attachment.name}
                </a>
              ) : null}
              {m.text ? <p className="m-0 whitespace-pre-wrap break-words">{m.text}</p> : null}
            </>
          )}
        </div>
        {!m.deleted ? (
          <form action={deleteSchoolMessageAction}>
            <input type="hidden" name="conversation" value={conversation!.id} />
            <input type="hidden" name="message" value={m.id} />
            <ConfirmButton confirm={t("chat.deleteConfirm")} label={t("chat.deleteMessageLabel")} className="text-[13px] font-semibold text-danger">
              {t("chat.deleteMessage")}
            </ConfirmButton>
          </form>
        ) : null}
      </li>
    );
  }
}
