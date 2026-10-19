import Link from "next/link";
import { dismissAnnouncementAction } from "@/app/actions/announcements";
import { announcementsFor, announcementText } from "@/lib/announcements";
import type { ClientContext } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { Announcement } from "@/lib/data/types";
import { Icon } from "./icon";
import { Markdown } from "./markdown";
import { SubmitButton } from "./form";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";

/** A client's live announcements (for the whole account), and the ones still on their banner. */
export async function clientAnnouncements(context: Pick<ClientContext, "client" | "licenses" | "apps" | "account">) {
  const store = await getStore();
  const [all, dismissed] = await Promise.all([store.listAnnouncements(), store.listDismissedAnnouncementIds(context.client.id)]);
  // The whole account: a plan or app type audience matches when any of its apps does.
  return announcementsFor(all, { state: context.account, license: null, app: null, licenses: context.licenses, apps: context.apps }, dismissed, new Date());
}

function AnnouncementLink({ announcement, text }: { announcement: Announcement; text: DashboardText }) {
  if (!announcement.linkUrl) return null;
  const label = announcement.linkLabel ?? text.t("common.learnMore");
  return announcement.linkUrl.startsWith("/") ? (
    <Link href={announcement.linkUrl} className="flex items-center gap-1 self-start font-semibold">
      {label}
      <Icon name="arrow_forward" size={18} />
    </Link>
  ) : (
    <a href={announcement.linkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 self-start font-semibold">
      {label}
      <Icon name="open_in_new" size={18} />
      <span className="sr-only">{text.t("common.opensInNewTab")}</span>
    </a>
  );
}

const BODY = "flex flex-col gap-2 text-[15px] leading-relaxed text-ink-2 [&_ol]:m-0 [&_ol]:ps-5 [&_p]:m-0 [&_ul]:m-0 [&_ul]:ps-5";

/** One announcement on the dashboard's banner (with a close button) or the waiting page; 56 in the dashboard's language when the team wrote it in it, else in English. */
export async function AnnouncementCard({ announcement, dismissible = false }: { announcement: Announcement; dismissible?: boolean }) {
  const words = await dashboardText();
  const warning = announcement.severity === "warning";
  const text = announcementText(announcement, words.lang);
  const dir = text.lang === "ar" ? "rtl" : "ltr";
  return (
    <section
      aria-label={words.t("nav.announcementLabel", { title: text.title })}
      className={`flex gap-3 rounded-xl px-4 py-3.5 ${warning ? "bg-warn-bg" : "bg-peach"}`}
    >
      <Icon name={warning ? "warning" : "notifications"} size={22} className={`flex-none ${warning ? "text-warn" : "text-accent"}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <h2 lang={text.lang} dir={dir} className="m-0 text-base font-bold text-midnight">
            {text.title}
          </h2>
          {dismissible ? (
            <form action={dismissAnnouncementAction} className="-me-2 -mt-1">
              <input type="hidden" name="id" value={announcement.id} />
              <SubmitButton variant="ghost" className="h-8 w-8 !px-0" pendingText="">
                <Icon name="close" size={20} />
                <span className="sr-only">{words.t("nav.dismiss", { title: text.title })}</span>
              </SubmitButton>
            </form>
          ) : (
            <span className="flex-none text-xs text-muted">{words.date(announcement.startsAt)}</span>
          )}
        </div>
        <div lang={text.lang} dir={dir} className={BODY}>
          <Markdown source={text.body} />
        </div>
        <AnnouncementLink announcement={announcement} text={words} />
      </div>
    </section>
  );
}

/** The dashboard's banner: announcements shown as a banner (57) that the client hasn't closed. */
export async function AnnouncementBanner({ context }: { context: Pick<ClientContext, "client" | "licenses" | "apps" | "account"> }) {
  const { banner, live } = await clientAnnouncements(context);
  if (!banner.length) return null;
  const { t } = await dashboardText();
  return (
    <div className="flex flex-col gap-2.5">
      {banner.map((a) => (
        <AnnouncementCard key={a.id} announcement={a} dismissible />
      ))}
      {/* Only active clients have the dashboard with the full list. */}
      {live.length > 1 && context.client.status === "active" ? (
        <Link href="/dashboard/announcements" className="self-end text-sm font-semibold">
          {t("nav.allUpdates")}
        </Link>
      ) : null}
    </div>
  );
}
