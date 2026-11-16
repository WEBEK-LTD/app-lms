import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Markdown } from "@/components/markdown";
import { KitDisclosure, KitEmpty, KitHeader, KitHero, KitPage, KitSection, KitStat, KitStatus, kit } from "@/components/studio-page";
import { KIND_ICON_BG, updateIcon } from "@/components/update-look";
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

/** 132.143 Each kind's pill. */
const KIND_TONE = { update: "info", announcement: "info", maintenance: "warn", offer: "success", account: "neutral" } as const;

const BODY = "flex flex-col gap-2 text-[15px] leading-relaxed text-(--sp-ink) [&_ol]:m-0 [&_ol]:ps-5 [&_p]:m-0 [&_ul]:m-0 [&_ul]:ps-5";

function ItemLink({ item, label, text }: { item: UpdateItem; label: string | null; text: DashboardText }) {
  if (!item.linkUrl || !label) return null;
  return item.linkUrl.startsWith("/") ? (
    <Link href={item.linkUrl} className={`${kit.quiet} self-start`}>
      {label}
      <Icon name="arrow_forward" size={18} className="rtl:-scale-x-100" />
    </Link>
  ) : (
    <a href={item.linkUrl} target="_blank" rel="noreferrer" className={`${kit.quiet} self-start`}>
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
  const { t, num } = text;
  const words = { lang: text.lang, k: text.k, date: (at: Date) => text.date(at), kind: (kind: UpdateItem["kind"]) => t(KIND_KEY[kind]) };
  const updates = await loadUpdates(await getStore(), readerOf(context, text.lang), new Date());
  const unread = updates.all.filter((item) => item.unread).map((item) => item.key);
  // 132.143 The premium kit: the numbers in one hero card, then every update as a row of one list: the new ones open, the rest open on demand.
  return (
    <KitPage>
      <KitHeader icon="campaign" title={t("nav.updates")} description={t("nav.updatesText")} />
      <UpdatesSeen keys={unread} />
      {updates.all.length ? (
        <>
          <KitHero
            label={t("nav.updates")}
            stats={
              <>
                <KitStat icon="campaign" label={t("nav.updates")} value={num(updates.all.length)} />
                <KitStat icon="notifications" tone="accent" label={t("nav.new")} value={num(unread.length)} />
              </>
            }
          />
          <KitSection titleId="h-updates" title={t("nav.updatesCount", { count: updates.all.length })} flush>
            <ol aria-label={t("nav.updates")} className="m-0 flex list-none flex-col p-0">
              {updates.all.map((item) => {
                const titleId = `update-${item.key.replace(/[^a-z0-9]/gi, "-")}`;
                const shown = itemWords(item, words);
                const dir = shown.lang === "ar" ? "rtl" : "ltr";
                return (
                  <li key={item.key} className="border-t border-(--sp-line-soft) first:border-t-0">
                    <article aria-labelledby={titleId} data-update={item.key} data-new={item.unread ? "" : undefined} className="relative">
                      {item.unread ? <span aria-hidden="true" className="absolute start-0 top-5 bottom-5 w-[3px] rounded-full bg-ember" /> : null}
                      <KitDisclosure
                        defaultOpen={item.unread}
                        media={
                          <span aria-hidden="true" className={`flex h-11 w-11 flex-none items-center justify-center rounded-2xl ${KIND_ICON_BG[item.kind]}`}>
                            <Icon name={updateIcon(item)} size={22} />
                          </span>
                        }
                        summary={
                          <>
                            <span id={titleId} lang={shown.lang} dir={dir} className="text-[15px] leading-snug font-semibold break-words text-(--sp-ink)">
                              {shown.title}
                            </span>
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-(--sp-muted)">
                              <time dateTime={item.at.toISOString()}>{text.date(item.at)}</time>
                              {item.app ? <span>· {item.app}</span> : null}
                              {item.current ? null : <span>· {t("nav.ended")}</span>}
                            </span>
                          </>
                        }
                        aside={
                          <>
                            <KitStatus tone={KIND_TONE[item.kind]}>{words.kind(item.kind)}</KitStatus>
                            {item.unread ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-peach px-2.5 py-1 text-xs font-bold text-accent">
                                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ember" />
                                {t("nav.new")}
                              </span>
                            ) : null}
                          </>
                        }
                      >
                        <div className="flex flex-col gap-3 sm:ps-15">
                          <div lang={shown.lang} dir={dir} className={BODY}>
                            {item.kind === "account" ? <p>{shown.body}</p> : <Markdown source={shown.body} />}
                          </div>
                          <ItemLink item={item} label={shown.linkLabel} text={text} />
                        </div>
                      </KitDisclosure>
                    </article>
                  </li>
                );
              })}
            </ol>
          </KitSection>
        </>
      ) : (
        <div className={kit.card}>
          <KitEmpty icon="campaign" title={t("nav.noUpdates")}>
            {t("nav.noUpdatesText")}
          </KitEmpty>
        </div>
      )}
    </KitPage>
  );
}
