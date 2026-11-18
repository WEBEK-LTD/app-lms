import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { Badge, formatDateTime, Notice } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { decideComplaintAction, noteComplaintAction, replyComplaintAction, shareComplaintAction, statusComplaintAction } from "@/app/actions/market";
import { assignComplaintAction } from "@/app/actions/market-complaints";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { MarketOrderLine } from "@/lib/data/types";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { appUrl } from "@/lib/env";
import { mediaLink } from "@/lib/media/files";
import { complaintItems } from "@/lib/market/complaint-queue";
import { assigneeName, supportTeam } from "@/lib/market/complaint-team";
import { complaintWindow, decidedAt, queueTimers, READY_REPLIES, refundable, refundableToPayment, threadMessages } from "@/lib/market/complaints";
import { currencyDecimals, fromMinor, formatMinor } from "@/lib/market/currency";
import { complaintReference, firstName, marketOrderReference } from "@/lib/market/json";
import { marketTimezone } from "@/lib/market/settings";
import { isFood } from "../../../shipments/parts";
import { NotMarket, OrderStatusBadge } from "../../parts";
import { ReplyBox, SaveOnChange } from "../reply-box";
import { Avatar, clock } from "../view";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.complaints") };
}

const photoUrl = (id: string) => (id.startsWith("media:") ? mediaLink(appUrl(), id.slice(6)) : assetUrl(id));
const card = "rounded-[18px] border border-line bg-white";
const eyebrow = "m-0 text-[13px] font-bold tracking-[0.12em] text-ink-3 uppercase";
const label = "text-[14px] font-semibold text-ink-2";
const segment = "flex flex-1 cursor-pointer items-center justify-center px-3 py-2.5 text-center text-[14px] has-[:checked]:bg-midnight has-[:checked]:text-ivory";

function lineAmount(l: MarketOrderLine): string {
  const q = l.pickedQuantity ?? l.quantity;
  if (l.unit === "kg") return `${Math.round(q * 1000)} g`;
  if (l.unit === "g") return `${q} g`;
  if (l.unit === "l") return `${q} l`;
  return `×${q}`;
}

const time = (d: Date, lang: string, timeZone: string) => new Intl.DateTimeFormat(lang, { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone }).format(d);

/** "tomorrow 19:52", "today 19:52", else the date and time. */
function untilText(until: Date, now: Date, lang: "en" | "ar" | "tr", timeZone: string): string {
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(d);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const diff = Math.round((Date.parse(day(until)) - Date.parse(day(now))) / 86_400_000);
  if (diff === 0 || diff === 1) return `${rtf.format(diff, "day")} ${time(until, lang, timeZone)}`;
  return formatDateTime(until, lang, timeZone);
}

/**
 * 115.53 One complaint (design 12): its status and who has it at the top
 * with its timers and how long its order still takes complaints; the order
 * with the items it's about, the photos and sharing with the place; the
 * conversation in the app's chat with the ready replies (into the box, sent
 * only with Send); the decision and the team's notes.
 */
export default async function ComplaintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const context = await requireClient("orders");
  const { app } = context;
  const { t, lang } = await dashboardText();
  if (!isFood(app)) return <NotMarket title={t("market.complaints")} t={t} />;
  const { id } = await params;
  if (!/^\d{1,15}$/.test(id)) notFound();
  const store = await getStore();
  const c = await store.getMarketComplaint(app.id, Number(id));
  if (!c) notFound();
  const [order, settings, team] = await Promise.all([store.getMarketOrder(app.id, c.orderId), store.getDeliverySettings(app.id).then(deliverySettingsOf), supportTeam(store, context.client.id, context.user)]);
  const job = order?.shipmentId != null ? await store.getShipment(app.id, order.shipmentId) : null;
  const others = order ? (await store.listMarketComplaints({ appId: app.id, orderId: order.id, limit: 50, offset: 0 })).items.filter((x) => x.id !== c.id) : [];
  const left = order ? refundable(order, others) : 0;
  const error = (await searchParams).error;
  const now = new Date();
  const zone = marketTimezone(settings);
  const timers = queueTimers(c, now);
  const window = order ? complaintWindow(order, now, job) : null;
  const currency = order?.currency ?? "EGP";
  const money = (minor: number) => formatMinor(minor, currency, lang);
  const replies = READY_REPLIES[lang === "ar" || lang === "tr" ? lang : "en"];
  const what = complaintItems(c, order ?? undefined);
  const named = order ? order.lines.filter((l) => c.lineIds.includes(l.id)).map((l) => l.name) : [];
  const arrived = job?.status === "delivered" ? [...job.timeline].reverse().find((s) => s.status === "delivered")?.at : null;
  const arrivedAt = arrived ? new Date(arrived) : (order?.completedAt ?? null);
  const courier = job?.courierName ? firstName(job.courierName) : null;
  const refundedBefore = order ? order.money.total - left : 0;
  const cardLeft = order ? refundableToPayment(order, others) : 0;
  const thread = c.messages;
  const assignee = assigneeName(team, c.assignee);
  const sinceText =
    timers.waitingOn === "support" && timers.waitingMinutes !== null
      ? threadMessages(c).some((m) => m.from === "customer")
        ? t("complaints.customerReplied", { time: clock(timers.waitingMinutes, t) })
        : t("complaints.waitingOnYou", { time: clock(timers.waitingMinutes, t) })
      : timers.waitingOn === "customer" && timers.waitingMinutes !== null
        ? t("complaints.supportReplied", { time: clock(timers.waitingMinutes, t) })
        : null;

  const supportLabel = (name: string | null | undefined) => (name ? `${t("complaints.fromSupport")} · ${name}` : t("complaints.fromSupport"));

  return (
    <div className="flex flex-col gap-5">
      <Link href="/dashboard/market/complaints" className="inline-flex w-fit items-center gap-1.5 text-[15px] text-ink-3 no-underline hover:text-midnight">
        <Icon name="arrow_back" size={18} />
        {t("market.backToQueue")}
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2.5">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] sm:text-[30px]">{t("market.complaint", { reference: complaintReference(c) })}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[14px] text-ink-3">
            <Badge tone="warn">{t(`market.r_${c.reason}` as DashKey)}</Badge>
            <span className="inline-flex items-center gap-1">
              <Icon name="schedule" size={18} />
              {t("complaints.openSince", { time: clock(timers.openMinutes, t) })}
            </span>
            {sinceText ? (
              <span className={`inline-flex items-center gap-1 ${timers.waitingOn === "support" ? "text-success" : ""}`}>
                <Icon name="chat" size={18} />
                {sinceText}
              </span>
            ) : null}
            {window ? (
              <span className="inline-flex items-center gap-1">
                <Icon name="timer" size={18} />
                {window.open ? (window.until ? t("complaints.canOpenUntil", { date: untilText(window.until, now, lang, zone) }) : null) : t("complaints.windowClosed")}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {c.decision ? (
            <span className="inline-flex h-11 items-center rounded-xl border border-line px-3.5 text-[14px]">
              {t("complaints.statusLabel")}&nbsp;<b>{t(`market.cs_${c.status}` as DashKey)}</b>
            </span>
          ) : (
            <SaveOnChange
              action={statusComplaintAction}
              hidden={{ id: String(c.id) }}
              name="status"
              value={c.status}
              label={t("market.status")}
              prefix={<span>{t("complaints.statusLabel")}</span>}
              options={(["open", "in_review", "waiting_for_customer"] as const).map((s) => ({ value: s, label: t(`market.cs_${s}`) }))}
              save={t("market.saveStatus")}
            />
          )}
          <SaveOnChange
            action={assignComplaintAction}
            hidden={{ id: String(c.id) }}
            name="assignee"
            value={c.assignee ?? ""}
            label={t("complaints.assignTo")}
            prefix={assignee ? <Avatar name={assignee} size={24} /> : <Icon name="person" size={20} />}
            options={[
              { value: "", label: t("complaints.notAssigned") },
              ...team.map((p) => ({ value: p.email, label: t("complaints.assignedTo", { name: p.firstName }) })),
              ...(c.assignee && !team.some((p) => p.email === c.assignee) ? [{ value: c.assignee, label: t("complaints.assignedTo", { name: assignee ?? c.assignee }) }] : []),
            ]}
            save={t("market.saveStatus")}
          />
        </div>
      </header>
      {error ? (
        <Notice tone="danger" icon="error">
          {error}
        </Notice>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* The order and the photos */}
        <div className="flex flex-col gap-5">
          {order ? (
            <section aria-labelledby="h-order" className={`${card} overflow-hidden`}>
              <div className="flex items-center justify-between gap-2 px-5 pt-5">
                <h2 id="h-order" className={eyebrow}>
                  {t("complaints.orderHeading")}
                </h2>
                <OrderStatusBadge status={order.status} t={t} />
              </div>
              <div className="px-5 pt-3 pb-3">
                <p className="m-0 text-[17px] font-bold">{t("complaints.orderTitle", { reference: marketOrderReference(order), place: order.vendorName })}</p>
                <p className="m-0 text-[14px] text-ink-3">
                  {t("complaints.orderWho", { name: firstName(order.customerName), placed: time(order.createdAt, lang, zone) })}
                  {arrivedAt ? ` · ${t("complaints.orderArrived", { time: time(arrivedAt, lang, zone) })}` : ""}
                  {courier ? ` · ${courier}` : ""}
                </p>
              </div>
              <ul className="m-0 list-none p-0">
                {order.lines.map((l) => {
                  const inIt = c.lineIds.includes(l.id);
                  return (
                    <li key={l.id} className={`flex items-center gap-3 border-t border-line-soft px-5 py-3 ${inIt ? "bg-peach-soft" : ""}`}>
                      {l.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- the product's photo
                        <img src={l.imageUrl} alt="" className="h-11 w-11 shrink-0 rounded-[10px] object-cover" loading="lazy" />
                      ) : (
                        <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-sand">
                          <Icon name="grocery" size={20} className="text-faint" />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px]">{l.name}</span>
                        <span className="text-[13px] text-ink-4">
                          <bdi dir="ltr">{lineAmount(l)}</bdi>
                          {inIt ? (
                            <>
                              {" · "}
                              <b className="font-semibold text-ember">{t("complaints.inTheComplaint")}</b>
                            </>
                          ) : null}
                        </span>
                      </span>
                      <span className="text-[15px] tabular-nums">{money(l.substitute?.total ?? l.total)}</span>
                    </li>
                  );
                })}
              </ul>
              <dl className="m-0 mx-5 flex flex-col gap-2.5 border-t border-line py-4 text-[15px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-3">{t("complaints.orderTotal")}</dt>
                  <dd className="m-0 tabular-nums">{money(order.money.total)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-3">{t("complaints.paidWith")}</dt>
                  <dd className="m-0">{t(`market.pay_${order.paymentMethod}`)}</dd>
                </div>
                {refundedBefore > 0 ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-3">{t("complaints.refundedBefore")}</dt>
                    <dd className="m-0 tabular-nums">{money(refundedBefore)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-3">{t("complaints.canStillRefund")}</dt>
                  <dd className="m-0 font-semibold text-success tabular-nums">{money(left)}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          <section aria-labelledby="h-photos" className={`${card} p-5`}>
            <div className="flex items-center justify-between">
              <h2 id="h-photos" className={eyebrow}>
                {t("complaints.photosHeading")}
              </h2>
              <span className="text-[14px] text-ink-3 tabular-nums">{c.photoAssetIds.length}</span>
            </div>
            {c.photoAssetIds.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {c.photoAssetIds.map((p, i) => (
                  <a key={p} href={photoUrl(p)} target="_blank" rel="noopener noreferrer" className="block h-[84px] w-[110px] overflow-hidden rounded-[10px] border border-line-soft">
                    {/* eslint-disable-next-line @next/next/no-img-element -- the customer's photo, at its own size */}
                    <img src={photoUrl(p)} alt={`${t("complaints.photosHeading")} ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            ) : null}
            <form action={shareComplaintAction} className="mt-4 flex items-center justify-between gap-3">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="share" value={c.sharedWithVendor ? "0" : "1"} />
              <span>
                <span className="block text-[15px]">{t("complaints.sharePlace")}</span>
                <span className="text-[13px] text-ink-4">{t(c.sharedWithVendor ? "complaints.sharedHint" : "complaints.notSharedHint")}</span>
              </span>
              <button type="submit" role="switch" aria-checked={c.sharedWithVendor} aria-label={t("complaints.sharePlace")} className={`relative h-7 w-12 shrink-0 rounded-full border border-line transition-colors ${c.sharedWithVendor ? "bg-success" : "bg-step"}`}>
                <span className={`absolute top-0.5 h-5.5 w-5.5 rounded-full bg-white shadow transition-all ${c.sharedWithVendor ? "end-0.5" : "start-0.5"}`} />
              </button>
            </form>
          </section>
        </div>

        {/* The conversation */}
        <section aria-labelledby="h-talk" className={`${card} flex flex-col overflow-hidden`}>
          <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-4">
            <h2 id="h-talk" className="m-0 flex items-center gap-2 text-[16px] font-bold">
              <Icon name="forum" size={22} filled className="text-success" />
              {t("complaints.conversation")}
            </h2>
            <span className="text-[13px] text-ink-4">{t("complaints.inAppChat")}</span>
          </div>
          <ol className="m-0 flex list-none flex-col gap-3 px-5 py-5">
            <Bubble from="customer" who={t("complaints.fromCustomer")} at={formatTime(c.createdAt, lang, zone)}>
              {c.text ? <span className="whitespace-pre-line">{c.text}</span> : <span className="text-ink-4">{t(`market.r_${c.reason}` as DashKey)}</span>}
              {c.photoAssetIds.length ? (
                <span className="mt-2 flex gap-2">
                  {c.photoAssetIds.slice(0, 3).map((p, i) => (
                    // eslint-disable-next-line @next/next/no-img-element -- the customer's photo
                    <img key={p} src={photoUrl(p)} alt={`${t("complaints.photosHeading")} ${i + 1}`} className="h-16 w-[88px] rounded-[10px] object-cover" loading="lazy" />
                  ))}
                </span>
              ) : null}
            </Bubble>
            {thread.map((m) =>
              m.kind === "taken" ? (
                <li key={m.id} className="flex items-center justify-center gap-1.5 text-[13px] text-ink-3">
                  <Icon name="how_to_reg" size={17} />
                  {t("complaints.tookIt", { name: m.name ?? assigneeName(team, m.by) ?? "", time: formatTime(new Date(m.at), lang, zone) })}
                </li>
              ) : (
                <Bubble key={m.id} from={m.from} who={m.from === "support" ? supportLabel(m.name ?? assigneeName(team, m.by)) : t("complaints.fromCustomer")} at={formatTime(new Date(m.at), lang, zone)}>
                  <span className="whitespace-pre-line">{m.text}</span>
                </Bubble>
              ),
            )}
          </ol>
          <div className="mt-auto border-t border-line px-5 py-4">
            {c.decision ? <p className="m-0 mb-2 text-[13px] text-ink-4">{t("complaints.afterDecision")}</p> : null}
            <ReplyBox
              action={replyComplaintAction}
              hidden={{ id: String(c.id) }}
              replies={[replies[2]!, replies[4]!, replies[1]!]}
              labels={{ readyReplies: t("complaints.readyReplies"), placeholder: t("complaints.writeToCustomer"), send: t("complaints.send") }}
              variant="page"
            />
          </div>
        </section>

        {/* The decision and the team's notes */}
        <div className="flex flex-col gap-5 lg:col-span-2 xl:col-span-1">
          <section aria-labelledby="h-decision" className={`${card} ${c.decision ? "" : "border-[1.5px] border-midnight"} p-5`}>
            <h2 id="h-decision" className={eyebrow}>
              {t("complaints.decisionHeading")}
            </h2>
            {c.decision ? (
              <div className="mt-3 flex flex-col gap-1.5 text-[14px]">
                <span className="text-[17px] font-bold">
                  {t(`market.o_${c.decision.outcome}`)}
                  {c.decision.amount ? ` · ${money(c.decision.amount)}` : ""}
                </span>
                {c.decision.to ? <span>{t(`market.to_${c.decision.to}`)}</span> : null}
                {c.decision.couponCode ? (
                  <span>
                    <bdi dir="ltr">{c.decision.couponEndsAt ? t("complaints.couponUntil", { code: c.decision.couponCode, date: formatDateTime(new Date(c.decision.couponEndsAt), lang, zone) }) : t("market.decisionCoupon", { code: c.decision.couponCode })}</bdi>
                  </span>
                ) : null}
                {c.decision.reason ? <span className="text-ink-4 whitespace-pre-line">{c.decision.reason}</span> : null}
                <span className="text-[12px] text-ink-4">{t("complaints.decidedBy", { date: formatDateTime(decidedAt(c.decision), lang, zone), by: c.decision.byName ?? c.decision.by })}</span>
              </div>
            ) : order ? (
              <form action={decideComplaintAction} className="mt-3 flex flex-col gap-4">
                <input type="hidden" name="id" value={c.id} />
                <fieldset className="m-0 border-0 p-0">
                  <legend className={`${label} mb-2`}>{t("complaints.whatYouDecide")}</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["refund", "partial_refund", "compensation", "no_refund"] as const).map((o, i) => (
                      <label key={o} className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-[15px] has-[:checked]:border-[1.5px] has-[:checked]:border-midnight">
                        <input type="radio" name="outcome" value={o} defaultChecked={what.whole ? i === 0 : o === "partial_refund"} className="h-4.5 w-4.5 accent-midnight" />
                        {t(`market.o_${o}`)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="d-amount" className={label}>
                    {t("complaints.amount", { currency })}
                  </label>
                  <span className="relative flex items-center">
                    <input id="d-amount" name="amount" inputMode="decimal" dir="ltr" defaultValue={!what.whole && what.total ? fromMinor(Math.min(what.total, left), currencyDecimals(currency)) : ""} placeholder={fromMinor(left, currencyDecimals(currency))} className="input h-12 w-full text-[16px] font-semibold" />
                    {named.length ? <span className="pointer-events-none absolute end-3 max-w-[50%] truncate text-[13px] text-ink-4">{named.join(" + ")}</span> : null}
                  </span>
                  <span className="text-[12px] text-ink-4">{t("complaints.amountHint")}</span>
                </div>
                <fieldset className="m-0 border-0 p-0">
                  <legend className={`${label} mb-2`}>{t("complaints.giveIt")}</legend>
                  <div className="flex overflow-hidden rounded-xl border border-line">
                    {(["payment", "wallet", "coupon"] as const).map((to) => {
                      const off = to === "payment" && (order.paymentMethod === "cash" || cardLeft <= 0);
                      return (
                        <label key={to} className={`${segment} ${off ? "cursor-not-allowed opacity-45" : ""} border-line not-first:border-s`}>
                          <input type="radio" name="to" value={to} disabled={off} defaultChecked={to === (order.paymentMethod === "cash" || cardLeft <= 0 ? "wallet" : "payment")} className="sr-only" />
                          {t(`market.to_${to}`)}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <fieldset className="m-0 border-0 p-0">
                  <legend className={`${label} mb-2`}>{t("complaints.whoBears")}</legend>
                  <div className="flex overflow-hidden rounded-xl border border-line">
                    {(["owner", "vendor"] as const).map((f) => (
                      <label key={f} className={`${segment} border-line not-first:border-s`}>
                        <input type="radio" name="funder" value={f} defaultChecked={f === "owner"} className="sr-only" />
                        {t(`market.f_${f}`)}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="d-reason" className={label}>
                    {t("complaints.customerReads")}
                  </label>
                  <textarea id="d-reason" name="reason" rows={3} maxLength={500} className="input w-full" />
                  <span className="text-[12px] text-ink-4">{t("complaints.customerReadsHint")}</span>
                </div>
                <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#1B644C] text-[16px] font-semibold text-white hover:opacity-90">
                  <Icon name="task_alt" size={20} />
                  {t("complaints.decide")}
                </button>
              </form>
            ) : null}
          </section>

          <section aria-labelledby="h-notes" className={`${card} p-5`}>
            <div className="flex items-center justify-between gap-2">
              <h2 id="h-notes" className={eyebrow}>
                {t("complaints.notesHeading")}
              </h2>
              <span className="text-[13px] text-ink-4">{t("complaints.notesHint")}</span>
            </div>
            {c.notes.length ? (
              <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
                {c.notes.map((n, i) => (
                  <li key={i} className="rounded-xl bg-peach-soft px-4 py-3 text-[15px]">
                    <span className="block text-[13px] text-ink-4">
                      {assigneeName(team, n.by) ?? n.by} · {formatTime(new Date(n.at), lang, zone)}
                    </span>
                    <span className="whitespace-pre-line">{n.text}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <form action={noteComplaintAction} className="mt-3 flex flex-col gap-2">
              <input type="hidden" name="id" value={c.id} />
              <textarea name="text" rows={2} maxLength={2000} required aria-label={t("complaints.addNote")} placeholder={t("complaints.notePlaceholder")} className="input w-full" />
              <div className="flex justify-end">
                <button type="submit" className="inline-flex h-9 items-center rounded-[10px] border border-line px-3.5 text-[13px] font-semibold hover:border-line-strong">
                  {t("complaints.addNote")}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function formatTime(d: Date, lang: string, zone: string): string {
  return time(d, lang, zone);
}

function Bubble({ from, who, at, children }: { from: "customer" | "support"; who: string; at: string; children: React.ReactNode }) {
  const support = from === "support";
  return (
    <li className={`flex flex-col gap-1 ${support ? "items-end" : "items-start"}`}>
      <span className="text-[13px] text-ink-4">
        <b className="font-semibold text-ink-2">{who}</b> · {at}
      </span>
      <span className={`flex max-w-[88%] flex-col rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${support ? "bg-[#1B644C] text-white" : "border border-line-soft bg-sand"}`}>{children}</span>
    </li>
  );
}

