import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { EmptyState, Notice, PageHeader } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { replyFromQueueAction, saveReplyColoursAction } from "@/app/actions/market-complaints";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import type { App } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { mediaLink } from "@/lib/media/files";
import { complaintItems } from "@/lib/market/complaint-queue";
import { assigneeName } from "@/lib/market/complaint-team";
import { queueTimers, READY_REPLIES, threadMessages } from "@/lib/market/complaints";
import { formatMinor } from "@/lib/market/currency";
import { complaintReference, firstName, marketOrderReference } from "@/lib/market/json";
import { QUEUES, type Queue } from "@/lib/market/support";
import { isFood } from "../../shipments/parts";
import { ComplaintStatusBadge, NotMarket } from "../parts";
import { loadQueue } from "./data";
import { ReplyBox } from "./reply-box";
import { Avatar, clock, ReplyWait, TakeIt } from "./view";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.complaints") };
}

const QUEUE_KEYS: Record<Queue, DashKey> = {
  open: "market.queueOpen",
  customer: "market.queueCustomer",
  mine: "market.queueMine",
  closed: "market.queueClosed",
  all: "market.queueAll",
};
const COUNTED: Queue[] = ["open", "customer", "mine"];

const photoUrl = (id: string) => (id.startsWith("media:") ? mediaLink(appUrl(), id.slice(6)) : assetUrl(id));
const card = "rounded-[18px] border border-line bg-white";

/**
 * 115.53 The support team's queue (design 11): the day's numbers, the queues
 * with their counts, a search and the place, the table with who has each
 * ticket and both timers ("since last reply" amber and red by the owner's
 * minutes), and the chosen ticket at the side with the ready replies, which
 * go into the reply box and are sent only with Send.
 */
export default async function ComplaintsPage({ searchParams }: { searchParams: Promise<{ queue?: string; q?: string; place?: string; sort?: string; c?: string; error?: string }> }) {
  const context = await requireClient("orders");
  const { app } = context;
  const { t, lang } = await dashboardText();
  if (!isFood(app)) return <NotMarket title={t("market.complaints")} t={t} />;
  const params = await searchParams;
  const now = new Date();
  const data = await loadQueue(context as typeof context & { app: App }, params, now);
  const { queue, items, chosen, orders, counts, stats, team, colours } = data;
  const money = (minor: number, currency = data.currency) => formatMinor(minor, currency, lang);
  const keep = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const all = { queue, q: data.q || undefined, place: data.place !== null ? String(data.place) : undefined, sort: params.sort, ...extra };
    for (const [k, v] of Object.entries(all)) if (v) p.set(k, v);
    return `?${p.toString()}`;
  };
  const back = { from: "queue", queue };
  const replies = READY_REPLIES[lang === "ar" || lang === "tr" ? lang : "en"];
  const longestOrder = stats.longest ? orders.get(stats.longest.complaint.orderId) : undefined;

  const statTile = (label: string, value: React.ReactNode, hint: React.ReactNode, tone?: "danger") => (
    <div className={`${card} flex flex-col px-4 py-3.5`}>
      <span className="text-[13px] text-muted">{label}</span>
      <span className={`mt-1 text-[26px] leading-tight font-bold tracking-[-0.5px] tabular-nums ${tone === "danger" ? "text-danger" : ""}`}>{value}</span>
      <span className="mt-0.5 text-[12px] text-muted">{hint}</span>
    </div>
  );

  const chosenOrder = chosen ? orders.get(chosen.orderId) : undefined;
  const chosenTimers = chosen ? queueTimers(chosen, now) : null;
  const lastCustomer = chosen ? [...threadMessages(chosen)].reverse().find((m) => m.from === "customer") : undefined;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={t("market.complaints")}
        description={t("market.complaintsIntro")}
        actions={
          <>
            <a href={`/dashboard/market/complaints/export${keep({ c: undefined })}`} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold no-underline hover:border-line-strong">
              <Icon name="download" size={20} />
              {t("complaints.export")}
            </a>
            <a href="#ready-replies" className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold no-underline hover:border-line-strong">
              <Icon name="bolt" size={20} />
              {t("complaints.readyReplies")}
            </a>
          </>
        }
      />
      {params.error ? (
        <Notice tone="danger" icon="error">
          {params.error === "colours" ? t("complaints.coloursError") : params.error}
        </Notice>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statTile(t("complaints.statWaiting"), stats.waiting, t("complaints.statNotAssigned", { count: stats.notAssigned }))}
        {statTile(
          t("complaints.statLongest"),
          stats.longest ? clock(stats.longest.minutes, t) : "—",
          stats.longest ? (
            <>
              <bdi dir="ltr">{complaintReference(stats.longest.complaint)}</bdi>
              {longestOrder ? ` · ${longestOrder.vendorName}` : ""}
            </>
          ) : (
            t("complaints.statLongestNone")
          ),
          stats.longest && stats.longest.minutes >= colours.redMinutes ? "danger" : undefined,
        )}
        {statTile(t("complaints.statFirstReply"), stats.firstReplyTypical !== null ? clock(stats.firstReplyTypical, t) : "—", stats.firstReplyTypical !== null ? t("complaints.statTarget", { minutes: colours.amberMinutes }) : t("complaints.statFirstReplyNone"))}
        {statTile(t("complaints.statDecided"), stats.decidedToday, t("complaints.statRefunded", { amount: money(stats.refundedToday) }))}
      </div>

      <div className="flex flex-col items-start gap-4 xl:flex-row">
        <section aria-labelledby="h-queue" className={`${card} w-full min-w-0 flex-1 overflow-hidden`}>
          <h2 id="h-queue" className="sr-only">
            {t(QUEUE_KEYS[queue])}
          </h2>
          <nav aria-label={t("market.complaints")} className="flex flex-wrap gap-2 border-b border-line px-3.5 pt-3.5 pb-3">
            {QUEUES.map((k) => {
              const on = k === queue;
              return (
                <Link
                  key={k}
                  href={keep({ queue: k, c: undefined })}
                  aria-current={on ? "page" : undefined}
                  className={`inline-flex h-[34px] items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-semibold no-underline ${on ? "border-midnight bg-midnight text-ivory" : "border-line text-midnight hover:border-line-strong"}`}
                >
                  {t(QUEUE_KEYS[k])}
                  {COUNTED.includes(k) && counts[k] > 0 ? <b className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11.5px] ${on ? "bg-ember text-white" : "bg-step text-ink-2"}`}>{counts[k]}</b> : null}
                </Link>
              );
            })}
          </nav>
          <form method="get" className="flex flex-wrap gap-2 border-b border-line-soft px-3 py-2.5">
            <input type="hidden" name="queue" value={queue} />
            <label className="flex h-9 min-w-[200px] flex-1 items-center gap-2 rounded-[10px] border border-line bg-sand px-2.5 text-[13px]">
              <Icon name="search" size={18} className="text-faint" />
              <span className="sr-only">{t("complaints.searchLabel")}</span>
              <input type="search" name="q" defaultValue={data.q} placeholder={t("complaints.searchPlaceholder")} className="h-full w-full bg-transparent outline-none placeholder:text-faint" />
            </label>
            <label className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line px-2.5 text-[13px]">
              <Icon name="storefront" size={18} />
              <span className="sr-only">{t("complaints.placeLabel")}</span>
              <select name="place" defaultValue={data.place !== null ? String(data.place) : ""} className="h-full bg-transparent font-semibold outline-none">
                <option value="">{t("complaints.everyPlace")}</option>
                {data.places.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line px-2.5 text-[13px]">
              <Icon name="list" size={18} />
              <span className="sr-only">{t("complaints.sortLabel")}</span>
              <select name="sort" defaultValue={data.sort} className="h-full bg-transparent font-semibold outline-none">
                <option value="longest">{t("complaints.sortLongest")}</option>
                <option value="newest">{t("complaints.sortNewest")}</option>
              </select>
            </label>
            <button type="submit" className="h-9 rounded-[10px] border border-line px-3 text-[13px] font-semibold hover:border-line-strong">
              {t("complaints.apply")}
            </button>
          </form>

          {items.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState icon="support_agent" title={t("market.noComplaints")}>
                {t("market.noComplaintsText")}
              </EmptyState>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="text-start text-[11.5px] font-semibold text-muted">
                    {(["colComplaint", "colPlace", "colReason", "colStatus", "colAssigned", "colOpened", "colLastReply"] as const).map((k) => (
                      <th key={k} scope="col" className="border-b border-line-soft px-2.5 py-2.5 text-start font-semibold whitespace-nowrap">
                        {t(`complaints.${k}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => {
                    const order = orders.get(c.orderId);
                    const timers = queueTimers(c, now);
                    const what = complaintItems(c, order);
                    const sel = chosen?.id === c.id;
                    const name = assigneeName(team, c.assignee);
                    const cell = `border-b border-line-soft px-2.5 py-2.5 align-middle whitespace-nowrap ${sel ? "bg-peach-soft" : ""}`;
                    return (
                      <tr key={c.id} className="group">
                        <td className={`${cell} ${sel ? "shadow-[inset_3px_0_0_var(--color-ember)] rtl:shadow-[inset_-3px_0_0_var(--color-ember)]" : ""}`}>
                          <Link href={keep({ c: String(c.id) })} aria-current={sel ? "true" : undefined} className="block font-bold text-midnight no-underline hover:underline">
                            <bdi dir="ltr">{complaintReference(c)}</bdi>
                          </Link>
                          <span className="text-[12px] text-muted">
                            {t("complaints.whoOrder", { name: order ? firstName(order.customerName) : "—", reference: marketOrderReference({ id: c.orderId }) })}
                          </span>
                        </td>
                        <td className={cell}>
                          <span className="block">{order?.vendorName ?? "—"}</span>
                          <span className="text-[12px] text-muted tabular-nums">{what.total !== null && what.total > 0 ? money(what.total, order?.currency) : "—"}</span>
                        </td>
                        <td className={cell}>
                          <span className="block">{t(`market.r_${c.reason}` as DashKey)}</span>
                          <span className="text-[12px] text-muted">
                            {what.whole ? t("complaints.wholeOrder") : t("complaints.itemsCount", { count: what.count })}
                            {c.photoAssetIds.length ? ` · ${t("complaints.photosCount", { count: c.photoAssetIds.length })}` : ""}
                          </span>
                        </td>
                        <td className={cell}>
                          <ComplaintStatusBadge status={c.status} t={t} />
                        </td>
                        <td className={cell}>
                          {name ? (
                            <span className="inline-flex items-center gap-2">
                              <Avatar name={name} />
                              {name}
                            </span>
                          ) : (
                            <TakeIt id={c.id} hidden={{ ...back }} t={t} />
                          )}
                        </td>
                        <td className={`${cell} tabular-nums text-ink-4`}>{clock(timers.openMinutes, t)}</td>
                        <td className={`${cell} tabular-nums`}>
                          <ReplyWait minutes={timers.waitingMinutes} waitingOn={timers.waitingOn} colours={colours} t={t} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5 text-[13px] text-muted">
            <span>{t("complaints.waitingCount", { count: counts.open })}</span>
            <details className="group relative">
              <summary className="cursor-pointer list-none">
                {t("complaints.colours", { amber: clock(colours.amberMinutes, t), red: clock(colours.redMinutes, t) })} · <span className="font-semibold text-accent underline">{t("complaints.coloursChange")}</span>
              </summary>
              <form action={saveReplyColoursAction} className="absolute end-0 bottom-full z-10 mb-2 flex w-[280px] flex-col gap-2 rounded-xl border border-line bg-white p-3 text-ink-2 shadow-lg">
                <input type="hidden" name="from" value="queue" />
                <input type="hidden" name="queue" value={queue} />
                <span className="text-[13px] font-semibold">{t("complaints.coloursTitle")}</span>
                <label className="flex items-center justify-between gap-2 text-[13px]">
                  {t("complaints.coloursAmber")}
                  <input name="amber" type="number" min={1} max={10079} required defaultValue={colours.amberMinutes} className="input h-9 w-20" />
                </label>
                <label className="flex items-center justify-between gap-2 text-[13px]">
                  {t("complaints.coloursRed")}
                  <input name="red" type="number" min={2} max={10080} required defaultValue={colours.redMinutes} className="input h-9 w-20" />
                </label>
                <button type="submit" className="h-9 rounded-[10px] bg-midnight text-sm font-semibold text-ivory">
                  {t("complaints.coloursSave")}
                </button>
              </form>
            </details>
          </div>
        </section>

        <aside aria-labelledby="h-chosen" className={`${card} w-full shrink-0 p-4 xl:sticky xl:top-4 xl:w-[340px]`}>
          {chosen ? (
            <div className="flex flex-col gap-3.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 id="h-chosen" className="m-0 text-[17px] font-bold">
                    {t("complaints.colComplaint")} <bdi dir="ltr">{complaintReference(chosen)}</bdi>
                  </h2>
                  <span className="text-[13px] text-muted">
                    {t("complaints.panelWho", { name: chosenOrder ? firstName(chosenOrder.customerName) : "—", reference: marketOrderReference({ id: chosen.orderId }), place: chosenOrder?.vendorName ?? "—" })}
                  </span>
                </div>
                <ComplaintStatusBadge status={chosen.status} t={t} />
              </div>
              <div className="rounded-xl border border-line-soft bg-sand p-3 text-[13px]">
                <span className="text-[12.5px] font-bold">
                  {t("complaints.panelCustomer")}
                  {chosenTimers?.waitingOn === "support" && chosenTimers.waitingMinutes !== null ? (
                    <>
                      {" · "}
                      <span className="text-danger">{t("complaints.panelCustomerWaiting", { time: clock(chosenTimers.waitingMinutes, t) })}</span>
                    </>
                  ) : null}
                </span>
                <p className="m-0 mt-1 leading-relaxed whitespace-pre-line">{lastCustomer?.text ?? chosen.text}</p>
                {chosen.photoAssetIds.length ? (
                  <div className="mt-2 flex items-center gap-2">
                    {chosen.photoAssetIds.slice(0, 3).map((p, i) => (
                      // eslint-disable-next-line @next/next/no-img-element -- the customer's photo, at its own size
                      <img key={p} src={photoUrl(p)} alt={`${t("complaints.photosHeading")} ${i + 1}`} className="h-12 w-16 rounded-lg object-cover" loading="lazy" />
                    ))}
                    <span className="text-[12px] text-muted">{t("complaints.photosCount", { count: chosen.photoAssetIds.length })}</span>
                  </div>
                ) : null}
              </div>
              <div id="ready-replies">
                <ReplyBox
                  action={replyFromQueueAction}
                  hidden={{ id: String(chosen.id), ...back }}
                  replies={replies.slice(0, 4)}
                  labels={{ readyReplies: t("complaints.readyReplies"), placeholder: t("complaints.writeToCustomer"), send: t("complaints.send") }}
                  variant="panel"
                  extra={
                    <>
                      {!chosen.assignee ? <TakeIt id={chosen.id} hidden={{ ...back }} t={t} /> : null}
                      <span className="flex-1" />
                      <Link href={`/dashboard/market/complaints/${chosen.id}`} className="inline-flex h-10 items-center rounded-[10px] border border-line px-4 text-sm font-semibold no-underline hover:border-line-strong">
                        {t("complaints.open")}
                      </Link>
                    </>
                  }
                />
              </div>
            </div>
          ) : (
            <p id="h-chosen" className="m-0 text-[14px] text-muted">
              {t("complaints.pickOne")}
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
