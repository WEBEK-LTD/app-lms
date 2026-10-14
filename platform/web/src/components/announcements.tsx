import Link from "next/link";
import { dismissAnnouncementAction } from "@/app/actions/announcements";
import { announcementsFor } from "@/lib/announcements";
import type { ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { Announcement } from "@/lib/data/types";
import { Icon } from "./icon";
import { Markdown } from "./markdown";
import { SubmitButton } from "./form";
import { formatDate } from "./ui";

/** A client's live announcements, and the ones still on their banner. */
export async function clientAnnouncements(context: Pick<ClientContext, "client" | "license" | "app" | "state">) {
  const store = await getStore();
  const [all, dismissed] = await Promise.all([store.listAnnouncements(), store.listDismissedAnnouncementIds(context.client.id)]);
  return announcementsFor(all, { state: context.state, license: context.license, app: context.app }, dismissed, new Date());
}

function AnnouncementLink({ announcement }: { announcement: Announcement }) {
  if (!announcement.linkUrl) return null;
  const label = announcement.linkLabel ?? "Learn more";
  return announcement.linkUrl.startsWith("/") ? (
    <Link href={announcement.linkUrl} className="flex items-center gap-1 self-start font-semibold">
      {label}
      <Icon name="arrow_forward" size={18} />
    </Link>
  ) : (
    <a href={announcement.linkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 self-start font-semibold">
      {label}
      <Icon name="open_in_new" size={18} />
    </a>
  );
}

const BODY = "flex flex-col gap-2 text-[15px] leading-relaxed text-ink-2 [&_ol]:m-0 [&_ol]:pl-5 [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-5";

/** One announcement: on the dashboard's banner (with a close button) or in the list. */
export function AnnouncementCard({ announcement, dismissible = false }: { announcement: Announcement; dismissible?: boolean }) {
  const warning = announcement.severity === "warning";
  return (
    <section
      aria-label={`Announcement: ${announcement.title}`}
      className={`flex gap-3 rounded-xl px-4 py-3.5 ${warning ? "bg-warn-bg" : "bg-peach"}`}
    >
      <Icon name={warning ? "warning" : "notifications"} size={22} className={`flex-none ${warning ? "text-warn" : "text-accent"}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="m-0 text-base font-bold text-midnight">{announcement.title}</h2>
          {dismissible ? (
            <form action={dismissAnnouncementAction} className="-mt-1 -mr-2">
              <input type="hidden" name="id" value={announcement.id} />
              <SubmitButton variant="ghost" className="h-8 w-8 !px-0" pendingText="">
                <Icon name="close" size={20} />
                <span className="sr-only">Dismiss {announcement.title}</span>
              </SubmitButton>
            </form>
          ) : (
            <span className="flex-none text-xs text-muted">{formatDate(announcement.startsAt)}</span>
          )}
        </div>
        <div className={BODY}>
          <Markdown source={announcement.body} />
        </div>
        <AnnouncementLink announcement={announcement} />
      </div>
    </section>
  );
}

/** The dashboard's banner: announcements the client hasn't closed. */
export async function AnnouncementBanner({ context }: { context: Pick<ClientContext, "client" | "license" | "app" | "state"> }) {
  const { banner, live } = await clientAnnouncements(context);
  if (!banner.length) return null;
  return (
    <div className="flex flex-col gap-2.5">
      {banner.map((a) => (
        <AnnouncementCard key={a.id} announcement={a} dismissible />
      ))}
      {/* Only active clients have the dashboard with the full list. */}
      {live.length > 1 && context.client.status === "active" ? (
        <Link href="/dashboard/announcements" className="self-end text-sm font-semibold">
          All announcements ({live.length})
        </Link>
      ) : null}
    </div>
  );
}
