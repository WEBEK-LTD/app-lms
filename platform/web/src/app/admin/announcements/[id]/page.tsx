import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteAnnouncementAction, emailAnnouncementAction, endAnnouncementAction } from "@/app/actions/admin-announcements";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Notice, formatDateTime } from "@/components/ui";
import { announcementFormValues, audienceOptions, audienceRecipients, describeAudience, isLive } from "@/lib/announcements";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { getPlans } from "@/lib/settings/platform";
import { AnnouncementForm } from "../forms";

export const metadata: Metadata = { title: "Announcement" };
export const dynamic = "force-dynamic";

function doneNotice(done: string): string | null {
  if (done === "created") return "Announcement published. Its clients see it on their dashboard.";
  if (done === "ended") return "Announcement ended. It's no longer on any dashboard.";
  const emailed = /^(created-)?emailed-(\d+)(?:-failed-(\d+))?$/.exec(done);
  if (!emailed) return null;
  const sent = `${emailed[2]} ${emailed[2] === "1" ? "client" : "clients"}`;
  return `${emailed[1] ? "Announcement published and emailed" : "Emailed"} to ${sent}.${emailed[3] ? ` ${emailed[3]} emails couldn't be sent.` : ""}`;
}

export default async function AnnouncementPage({ params, searchParams }: PageProps<"/admin/announcements/[id]">) {
  await requireAdmin();
  const store = await getStore();
  const announcement = await store.getAnnouncement((await params).id);
  if (!announcement) notFound();
  const { done } = await searchParams;
  const now = new Date();
  const [plans, recipients] = await Promise.all([getPlans(store), audienceRecipients(store, announcement.audience, now)]);
  const planNames = { starter: plans.starter.name, pro: plans.pro.name };
  const notice = typeof done === "string" ? doneNotice(done) : null;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Link href="/admin/announcements" className="flex items-center gap-1 self-start text-sm font-semibold no-underline">
          <Icon name="arrow_back" size={18} />
          Announcements
        </Link>
        <h1 className="m-0 text-[28px] font-extrabold">{announcement.title}</h1>
        <span className="text-[15px] text-muted">
          {describeAudience(announcement.audience, planNames)} ({recipients.length} {recipients.length === 1 ? "client" : "clients"} now) · created{" "}
          {formatDateTime(announcement.createdAt)} by {announcement.createdBy}
          {announcement.emailedAt ? ` · emailed ${formatDateTime(announcement.emailedAt)}, ${announcement.emailedCount} sent in all` : ""}
        </span>
      </div>
      {notice ? (
        <Notice tone="success" icon="check_circle" role="status">
          {notice}
        </Notice>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <form action={emailAnnouncementAction}>
          <input type="hidden" name="id" value={announcement.id} />
          <SubmitButton variant="secondary" className="h-10" pendingText="Sending…">
            <Icon name="mail" size={18} />
            {announcement.emailedAt ? "Email it again" : "Email it to these clients"}
          </SubmitButton>
        </form>
        {isLive(announcement, now) ? (
          <form action={endAnnouncementAction}>
            <input type="hidden" name="id" value={announcement.id} />
            <SubmitButton variant="secondary" className="h-10" pendingText="Ending…">
              End it now
            </SubmitButton>
          </form>
        ) : null}
        <form action={deleteAnnouncementAction}>
          <input type="hidden" name="id" value={announcement.id} />
          <SubmitButton variant="danger" className="h-10" pendingText="Deleting…">
            <Icon name="delete" size={18} />
            Delete
          </SubmitButton>
        </form>
      </div>
      <section aria-label="Announcement" className="max-w-[900px] rounded-2xl border border-line bg-white p-5 sm:p-6">
        <AnnouncementForm
          key={String(done ?? "")}
          id={announcement.id}
          announcement={announcementFormValues(announcement)}
          {...audienceOptions(planNames)}
        />
      </section>
    </>
  );
}
