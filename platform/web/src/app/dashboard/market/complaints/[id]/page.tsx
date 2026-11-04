import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/icon";
import { btn, formatDateTime, Notice, PageHeader, Section } from "@/components/ui";
import { DetailLayout } from "@/components/page-kit";
import { Facts, SideCard } from "@/components/page-kit-b";
import type { DashKey } from "@/i18n/dashboard";
import { decideComplaintAction, noteComplaintAction, replyComplaintAction, shareComplaintAction, statusComplaintAction, takeComplaintAction } from "@/app/actions/market";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appUrl } from "@/lib/env";
import { mediaLink } from "@/lib/media/files";
import { ACTIVE_COMPLAINT, READY_REPLIES, queueTimers, refundable } from "@/lib/market/complaints";
import { currencyDecimals, fromMinor, formatMinor } from "@/lib/market/currency";
import { complaintReference, marketOrderReference } from "@/lib/market/json";
import { SLA_MINUTES } from "@/lib/market/support";
import { isFood } from "../../../shipments/parts";
import { ComplaintStatusBadge, NotMarket, OrderStatusBadge, waitText } from "../../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("market.complaints") };
}

const photoUrl = (id: string) => (id.startsWith("media:") ? mediaLink(appUrl(), id.slice(6)) : assetUrl(id));
const field = "input w-full";
const label = "text-[13px] font-semibold text-ink-3";

/** 115.12 One complaint: the order it's about, the conversation and the team's notes, who has it, and the decision. */
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
  const order = await store.getMarketOrder(app.id, c.orderId);
  const others = order ? (await store.listMarketComplaints({ appId: app.id, orderId: order.id, limit: 50, offset: 0 })).items.filter((x) => x.id !== c.id) : [];
  const left = order ? refundable(order, others) : 0;
  const error = (await searchParams).error;
  const now = new Date();
  const timers = queueTimers(c, now);
  const active = ACTIVE_COMPLAINT.includes(c.status);
  const currency = order?.currency ?? "EGP";
  const money = (minor: number) => formatMinor(minor, currency, lang);
  const replies = READY_REPLIES[lang === "ar" || lang === "tr" ? lang : "en"];
  const me = (context.member ?? context.staff ?? context.user).email;
  const late = timers.waitingOn === "support" && (timers.waitingMinutes ?? 0) >= SLA_MINUTES;
  const lines = order ? (c.lineIds.length ? order.lines.filter((l) => c.lineIds.includes(l.id)) : []) : [];

  const main = (
    <>
      {error ? (
        <Notice tone="danger" icon="error">
          {error}
        </Notice>
      ) : null}
      <Section titleId="h-what" title={t(`market.r_${c.reason}` as DashKey)} actions={<ComplaintStatusBadge status={c.status} t={t} />}>
        <div className="flex flex-col gap-4">
          {c.text ? <p className="m-0 text-[15px] leading-relaxed whitespace-pre-line">{c.text}</p> : null}
          <div className="flex flex-col gap-2">
            <span className={label}>{t("market.itemsAffected")}</span>
            {lines.length ? (
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {lines.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-3 rounded-xl bg-sand px-3 py-2 text-[14px]">
                    <span className="min-w-0 truncate font-semibold">
                      <span className="tabular-nums text-ink-4">{l.quantity}× </span>
                      {l.name}
                    </span>
                    <span className="tabular-nums">{money(l.total)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-[14px] text-ink-4">{t("market.wholeOrder")}</span>
            )}
          </div>
          {c.photoAssetIds.length ? (
            <div className="flex flex-col gap-2">
              <span className={label}>{t("market.photos")}</span>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {c.photoAssetIds.map((p, i) => (
                  <a key={p} href={photoUrl(p)} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-xl border border-line bg-sand">
                    {/* eslint-disable-next-line @next/next/no-img-element -- the customer's photo, at its own size */}
                    <img src={photoUrl(p)} alt={`${t("market.photos")} ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Section>

      <Section titleId="h-talk" title={t("market.conversation")}>
        <div className="flex flex-col gap-3">
          <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
            {c.messages.map((m) => (
              <li key={m.id} className={`flex flex-col gap-1 rounded-2xl px-4 py-3 ${m.from === "support" ? "ms-8 bg-midnight text-white" : "me-8 bg-sand"}`}>
                <span className={`text-[12px] font-semibold ${m.from === "support" ? "text-white/70" : "text-ink-4"}`}>
                  {t(m.from === "support" ? "market.fromSupport" : "market.fromCustomer")}
                  {m.by ? ` · ${m.by}` : ""} · {formatDateTime(new Date(m.at), lang)}
                </span>
                <span className="text-[15px] leading-relaxed whitespace-pre-line">{m.text}</span>
              </li>
            ))}
          </ol>
          {active ? (
            <>
              <form action={replyComplaintAction} className="flex flex-col gap-2">
                <input type="hidden" name="id" value={c.id} />
                <label htmlFor="c-reply" className={label}>
                  {t("market.reply")}
                </label>
                <textarea id="c-reply" name="text" rows={3} maxLength={2000} required placeholder={t("market.replyPlaceholder")} className={field} />
                <div>
                  <button type="submit" className={`${btn.primary} h-10 px-5 text-sm`}>
                    <Icon name="send" size={18} />
                    {t("market.send")}
                  </button>
                </div>
              </form>
              <div className="flex flex-col gap-2">
                <span className={label}>{t("market.readyReplies")}</span>
                <div className="flex flex-wrap gap-2">
                  {replies.map((r) => (
                    <form key={r.key} action={replyComplaintAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="text" value={r.text} />
                      <button type="submit" className="rounded-full border border-line bg-white px-3 py-1.5 text-start text-[13px] text-ink-2 hover:border-line-strong" title={r.text}>
                        {r.text.length > 60 ? `${r.text.slice(0, 58)}…` : r.text}
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </Section>

      <Section titleId="h-notes" title={t("market.notes")} description={t("market.notesHint")}>
        <div className="flex flex-col gap-3">
          {c.notes.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {c.notes.map((n, i) => (
                <li key={i} className="rounded-xl border border-dashed border-line-strong bg-warn-bg/40 px-3.5 py-2.5 text-[14px]">
                  <span className="block text-[12px] font-semibold text-ink-4">
                    {n.by} · {formatDateTime(new Date(n.at), lang)}
                  </span>
                  <span className="whitespace-pre-line">{n.text}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <form action={noteComplaintAction} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="id" value={c.id} />
            <textarea name="text" rows={2} maxLength={2000} required aria-label={t("market.addNote")} placeholder={t("market.notePlaceholder")} className={`${field} sm:flex-1`} />
            <button type="submit" className={`${btn.secondary} h-10 px-4 text-sm`}>
              {t("market.addNote")}
            </button>
          </form>
        </div>
      </Section>
    </>
  );

  const side = (
    <>
      <SideCard title={t("market.status")} icon="support_agent" titleId="s-status">
        <div className="flex flex-col gap-3 text-[14px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-ink-4">
              <Icon name="schedule" size={16} />
              {t("market.openFor", { time: waitText(timers.openMinutes, t) })}
            </span>
            {timers.waitingMinutes !== null ? (
              <span className={`flex items-center gap-1 ${late ? "font-semibold text-danger" : "text-ink-4"}`}>
                <Icon name="timer" size={16} />
                {t("market.waitingFor", { time: waitText(timers.waitingMinutes, t) })}
              </span>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>
              <span className="block text-[12px] text-ink-4">{t("market.assignee")}</span>
              <span className="font-semibold">{c.assignee ?? t("market.unassigned")}</span>
            </span>
            {active && c.assignee !== me ? (
              <form action={takeComplaintAction}>
                <input type="hidden" name="id" value={c.id} />
                <button type="submit" className={`${btn.secondary} h-9 px-3 text-sm`}>
                  {t("market.takeIt")}
                </button>
              </form>
            ) : null}
          </div>
          {active ? (
            <form action={statusComplaintAction} className="flex items-end gap-2">
              <input type="hidden" name="id" value={c.id} />
              <select name="status" defaultValue={c.status} aria-label={t("market.status")} className="input h-10 flex-1">
                {(["open", "in_review", "waiting_for_customer"] as const).map((s) => (
                  <option key={s} value={s}>
                    {t(`market.cs_${s}`)}
                  </option>
                ))}
              </select>
              <button type="submit" className={`${btn.secondary} h-10 px-3 text-sm`}>
                {t("market.saveStatus")}
              </button>
            </form>
          ) : null}
          <div className="flex items-center justify-between gap-2 border-t border-line-soft pt-3">
            <span className="text-[13px] text-ink-4">{t(c.sharedWithVendor ? "market.sharedWithVendor" : "market.notShared")}</span>
            <form action={shareComplaintAction}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="share" value={c.sharedWithVendor ? "0" : "1"} />
              <button type="submit" className={`${btn.secondary} h-9 px-3 text-sm`}>
                {t(c.sharedWithVendor ? "market.unshare" : "market.share")}
              </button>
            </form>
          </div>
        </div>
      </SideCard>

      {order ? (
        <SideCard title={t("market.theOrder")} icon="receipt_long" titleId="s-order">
          <Facts
            columns={1}
            items={[
              { label: marketOrderReference(order), value: <OrderStatusBadge status={order.status} t={t} /> },
              { label: order.vendorName, value: order.customerName },
              { label: t("market.orderTotal"), value: money(order.money.total) },
              { label: t("market.paidWith", { method: t(`market.pay_${order.paymentMethod}`) }), value: formatDateTime(order.createdAt, lang) },
              { label: t("market.refundable"), value: money(left) },
            ]}
          />
        </SideCard>
      ) : null}

      <SideCard title={t("market.decision")} icon="check_circle" titleId="s-decision">
        {c.decision ? (
          <div className="flex flex-col gap-1.5 text-[14px]">
            <span className="text-[16px] font-bold">
              {t(`market.o_${c.decision.outcome}`)}
              {c.decision.amount ? ` · ${money(c.decision.amount)}` : ""}
            </span>
            {c.decision.to ? <span>{t(`market.to_${c.decision.to}`)}</span> : null}
            {c.decision.couponCode ? <span dir="ltr">{t("market.decisionCoupon", { code: c.decision.couponCode })}</span> : null}
            {c.decision.reason ? <span className="text-ink-4">{c.decision.reason}</span> : null}
            <span className="text-[12px] text-ink-4">{t("market.decided", { date: formatDateTime(c.decision.at, lang), by: c.decision.by })}</span>
          </div>
        ) : order ? (
          <form action={decideComplaintAction} className="flex flex-col gap-3 text-[14px]">
            <input type="hidden" name="id" value={c.id} />
            <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
              <legend className={`${label} mb-1`}>{t("market.outcome")}</legend>
              {(["refund", "partial_refund", "compensation", "no_refund"] as const).map((o, i) => (
                <label key={o} className="flex items-center gap-2">
                  <input type="radio" name="outcome" value={o} defaultChecked={i === 0} />
                  {t(`market.o_${o}`)}
                  {o === "refund" ? <span className="text-ink-4">· {money(left)}</span> : null}
                </label>
              ))}
            </fieldset>
            <div className="flex flex-col gap-1">
              <label htmlFor="d-amount" className={label}>
                {t("market.amount", { currency })}
              </label>
              <input id="d-amount" name="amount" inputMode="decimal" dir="ltr" placeholder={fromMinor(Math.min(left, order.money.total), currencyDecimals(currency))} className={field} />
              <span className="text-[12px] text-ink-4">{t("market.amountHint")}</span>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="d-to" className={label}>
                {t("market.refundTo")}
              </label>
              <select id="d-to" name="to" defaultValue={order.paymentMethod === "cash" ? "wallet" : "payment"} className="input h-10">
                {(["payment", "wallet", "coupon"] as const).map((to) => (
                  <option key={to} value={to} disabled={to === "payment" && order.paymentMethod === "cash"}>
                    {t(`market.to_${to}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="d-funder" className={label}>
                {t("market.funder")}
              </label>
              <select id="d-funder" name="funder" defaultValue="owner" className="input h-10">
                <option value="owner">{t("market.f_owner")}</option>
                <option value="vendor">{t("market.f_vendor")}</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="d-reason" className={label}>
                {t("market.reasonForCustomer")}
              </label>
              <textarea id="d-reason" name="reason" rows={2} maxLength={500} className={field} />
              <span className="text-[12px] text-ink-4">{t("market.reasonHint")}</span>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="share" value="1" defaultChecked={c.sharedWithVendor} />
              {t("market.shareWithVendor")}
            </label>
            <button type="submit" className={`${btn.primary} h-11 px-5 text-sm`}>
              {t("market.decide")}
            </button>
          </form>
        ) : null}
      </SideCard>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/market/complaints" className="inline-flex items-center gap-1 text-sm font-semibold">
        <Icon name="arrow_back" size={18} className="rtl:rotate-180" />
        {t("market.backToQueue")}
      </Link>
      <PageHeader title={t("market.complaint", { reference: complaintReference(c) })} description={c.text ? undefined : t(`market.r_${c.reason}` as DashKey)} />
      <DetailLayout main={main} side={side} />
    </div>
  );
}
