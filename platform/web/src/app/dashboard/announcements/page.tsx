import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Markdown } from "@/components/markdown";
import { EmptyState, PageHeader } from "@/components/ui";
import { KIND_CHIP, KIND_ICON_BG, updateIcon } from "@/components/update-look";
import { UpdatesSeen } from "@/components/updates-seen";
import { requireClient } from "@/lib/auth/session";
import { dashboardText, type DashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { loadUpdates, type UpdateItem } from "@/lib/updates";
import { itemWords, readerOf } from "@/lib/updates-view";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("nav.updates") };
}

const KIND_KEY = {
  update: "nav.kindUpdate",
  announcement: "nav.kindAnnouncement",
  maintenance: "nav.kindMaintenance",
  offer: "nav.kindOffer",
  account: "nav.kindAccount",
} as const;

const BODY = "flex flex-col gap-2 text-[15px] leading-relaxed text-ink-2 [&_ol]:m-0 [&_ol]:ps-5 [&_p]:m-0 [&_ul]:m-0 [&_ul]:ps-5";

function ItemLink({ item, label, text }: { item: UpdateItem; label: string | null; text: DashboardText }) {
  if (!item.linkUrl || !label) return null;
  return item.linkUrl.startsWith("/") ? (
    <Link href={item.linkUrl} className="flex items-center gap-1 self-start font-semibold">
      {label}
      <Icon name="arrow_forward" size={18} />
    </Link>
  ) : (
    <a href={item.linkUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 self-start font-semibold">
      {label}
      <Icon name="open_in_new" size={18} />
      <span className="sr-only">{text.t("common.opensInNewTab")}</span>
    </a>
  );
}

/**
 * 57 The full list behind the dashboard's bell (the Announcements page
 * before): every announcement from the team for this account, live or
 * ended, also the ones closed on the overview, and the account's own items,
 * newest first. Opening it marks them read for whoever is reading.
 */
export default async function UpdatesPage() {
  const context = await requireClient("dashboard");
  const text = await dashboardText();
  const { t } = text;
  const words = { lang: text.lang, k: text.k, date: (at: Date) => text.date(at), kind: (kind: UpdateItem["kind"]) => t(KIND_KEY[kind]) };
  const updates = await loadUpdates(await getStore(), readerOf(context, text.lang), new Date());
  const unread = updates.all.filter((item) => item.unread).map((item) => item.key);
  return (
    <>
      <PageHeader
        title={t("nav.updates")}
        description={t("nav.updatesText")}
      />
      <UpdatesSeen keys={unread} />
      {updates.all.length ? (
        <ol aria-label={t("nav.updates")} className="m-0 flex list-none flex-col gap-3 p-0">
          {updates.all.map((item) => {
            const titleId = `update-${item.key.replace(/[^a-z0-9]/gi, "-")}`;
            const shown = itemWords(item, words);
            const dir = shown.lang === "ar" ? "rtl" : "ltr";
            return (
              <li key={item.key}>
                <article
                  aria-labelledby={titleId}
                  data-update={item.key}
                  data-new={item.unread ? "" : undefined}
                  className={`flex gap-3.5 rounded-2xl border px-4 py-4 sm:px-5 ${item.unread ? "border-line-strong bg-white shadow-[0_1px_0_rgba(14,13,36,0.04)]" : "border-line bg-white/70"}`}
                >
                  <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-full ${KIND_ICON_BG[item.kind]}`}>
                    <Icon name={updateIcon(item)} size={22} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${KIND_CHIP[item.kind]}`}>{words.kind(item.kind)}</span>
                      <time dateTime={item.at.toISOString()}>{text.date(item.at)}</time>
                      {item.app ? <span>{item.app}</span> : null}
                      {item.current ? null : <span>{t("nav.ended")}</span>}
                      {item.unread ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-accent">
                          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-ember" />
                          {t("nav.new")}
                        </span>
                      ) : null}
                    </div>
                    <h2 id={titleId} lang={shown.lang} dir={dir} className="m-0 text-base font-bold text-midnight">
                      {shown.title}
                    </h2>
                    <div lang={shown.lang} dir={dir} className={BODY}>
                      {item.kind === "account" ? <p>{shown.body}</p> : <Markdown source={shown.body} />}
                    </div>
                    <ItemLink item={item} label={shown.linkLabel} text={text} />
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      ) : (
        <EmptyState icon="campaign" title={t("nav.noUpdates")}>
          {t("nav.noUpdatesText")}
        </EmptyState>
      )}
    </>
  );
}
