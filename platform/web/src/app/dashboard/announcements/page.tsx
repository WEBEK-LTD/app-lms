import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Markdown } from "@/components/markdown";
import { KitEmpty, KitHeader, KitHero, KitPage, KitSection, KitStat, KitStatus, kit } from "@/components/studio-page";
import { KitInspectorHead, KitTable, KitTableRow } from "@/components/studio-page/table";
import { updateIcon } from "@/components/update-look";
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

/** 132.143 Each kind's pill, and its icon's colour on the kit's tile (light and dark). */
const KIND_TONE = { update: "info", announcement: "info", maintenance: "warn", offer: "success", account: "neutral" } as const;
const KIND_ICON = { update: "text-accent", announcement: "text-accent", maintenance: "text-warn", offer: "text-success", account: "text-(--sp-muted)" } as const;

const BODY = "flex flex-col gap-2 text-[15px] leading-relaxed text-(--sp-ink) [&_ol]:m-0 [&_ol]:ps-5 [&_p]:m-0 [&_ul]:m-0 [&_ul]:ps-5";

function ItemLink({ item, label, text }: { item: UpdateItem; label: string | null; text: DashboardText }) {
  if (!item.linkUrl || !label) return null;
  return item.linkUrl.startsWith("/") ? (
    <Link href={item.linkUrl} className={`${kit.main} w-full`}>
      {label}
      <Icon name="arrow_forward" size={18} />
    </Link>
  ) : (
    <a href={item.linkUrl} target="_blank" rel="noreferrer" className={`${kit.main} w-full`}>
      {label}
      <Icon name="open_in_new" size={18} />
      <span className="sr-only">{text.t("common.opensInNewTab")}</span>
    </a>
  );
}

/** "New": an update the reader hasn't seen. */
function NewBadge({ text }: { text: DashboardText }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-[7px] bg-(--sp-peach) px-2 text-xs font-bold text-(--sp-peach-ink)">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-ember" />
      {text.t("nav.new")}
    </span>
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
  const kinds = [...new Set(updates.all.map((item) => item.kind))];
  // 132.177 The console's look: the numbers as tiles, then every update as a table (its title, its date, its kind),
  // the new ones marked; an update's words and its link open in the inspector.
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
                <KitStat icon="schedule" tone="success" label={t("nav.liveNow")} value={num(updates.all.filter((item) => item.current).length)} />
              </>
            }
          />
          <KitSection titleId="h-updates" title={t("nav.updatesCount", { count: updates.all.length })} flush>
            <KitTable
              label={t("nav.updates")}
              closeLabel={t("common.close")}
              media
              name={t("nav.colTitle")}
              columns={[{ label: t("nav.colDate"), width: "150px" }]}
              end={{ label: t("nav.colKind"), width: "130px" }}
              search={{ label: t("nav.updatesSearch"), noMatch: t("nav.updatesNoMatch") }}
              groups={{ all: t("common.all"), items: kinds.map((kind) => ({ value: kind, label: words.kind(kind) })) }}
            >
              {updates.all.map((item) => {
                const shown = itemWords(item, words);
                const dir = shown.lang === "ar" ? "rtl" : "ltr";
                return (
                  <KitTableRow
                    key={item.key}
                    id={item.key}
                    data-update={item.key}
                    data-new={item.unread ? "" : undefined}
                    text={`${shown.title} ${shown.body}`}
                    group={item.kind}
                    media={
                      <span aria-hidden="true" className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-(--sp-tile) ${KIND_ICON[item.kind]}`}>
                        <Icon name={updateIcon(item)} size={21} />
                      </span>
                    }
                    name={
                      <>
                        <span lang={shown.lang} dir={dir} className="min-w-0 truncate">
                          {shown.title}
                        </span>
                        {item.unread ? <NewBadge text={text} /> : null}
                      </>
                    }
                    line={
                      <>
                        <time dateTime={item.at.toISOString()}>{text.date(item.at)}</time>
                        {item.current ? null : ` · ${t("nav.ended")}`}
                      </>
                    }
                    cells={[
                      <span key="d" className="flex flex-col">
                        <time dateTime={item.at.toISOString()}>{text.date(item.at)}</time>
                        {item.app || !item.current ? (
                          <span className="truncate text-[12.5px] text-(--sp-muted)">
                            {[item.app, item.current ? null : t("nav.ended")].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                      </span>,
                    ]}
                    end={<KitStatus tone={KIND_TONE[item.kind]}>{words.kind(item.kind)}</KitStatus>}
                    inspector={{ label: shown.title, title: words.kind(item.kind), footer: <ItemLink item={item} label={shown.linkLabel} text={text} /> }}
                  >
                    <article aria-label={shown.title} data-inspector-update={item.key} className="flex flex-col gap-4">
                      <KitInspectorHead
                        top={
                          <>
                            <KitStatus tone={KIND_TONE[item.kind]}>{words.kind(item.kind)}</KitStatus>
                            {item.unread ? <NewBadge text={text} /> : null}
                          </>
                        }
                        title={
                          <span lang={shown.lang} dir={dir} className="block">
                            {shown.title}
                          </span>
                        }
                        line={[text.date(item.at), item.app, item.current ? null : t("nav.ended")].filter(Boolean).join(" · ")}
                      />
                      <div lang={shown.lang} dir={dir} className={BODY}>
                        {item.kind === "account" ? <p>{shown.body}</p> : <Markdown source={shown.body} />}
                      </div>
                    </article>
                  </KitTableRow>
                );
              })}
            </KitTable>
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
