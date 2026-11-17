"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { useDashT } from "@/components/dashboard-i18n";
import { KitInspector, KitStatus, KitTableHead, kit } from "@/components/studio-page";
import { KitWayRow } from "@/components/studio-page/way-row";
import type { StorePlatformOrder } from "@/lib/data/types";
import { AttentionActions } from "./checkout-payment-form";

/**
 * 132.180 How customers pay as one setting row: the way in use at a glance,
 * the three ways and what paying inside the app needs under Change. A
 * region named "How customers pay".
 */
export function HowCustomersPayRow({ icon, title, status, description, change, children }: { icon: IconName; title: string; status: ReactNode; description: ReactNode; change: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <KitWayRow
      id="how-customers-pay"
      titleId="h-how-customers-pay"
      level={2}
      icon={icon}
      title={title}
      status={status}
      description={description}
      open={open}
      bodyId="how-customers-pay-ways"
      control={
        <button type="button" aria-expanded={open} aria-controls="how-customers-pay-ways" onClick={() => setOpen((o) => !o)} className={kit.quiet} data-how-change="">
          <Icon name="tune" size={17} />
          {change}
          <Icon name="expand_more" size={18} className={`text-(--sp-muted) transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      }
    >
      {children}
    </KitWayRow>
  );
}

/** 134 One payment made in the app, as the page shows it (its words already in the dashboard's language). */
export interface InAppPaymentRow {
  id: number;
  /** The Yallapp order the payment made. */
  orderId: number;
  status: StorePlatformOrder["status"];
  /** "Payment 1042". */
  title: string;
  when: string;
  amount: string;
  provider: string | null;
  /** "Order 701 created", "Paid, needs attention"… */
  statusLabel: string;
  /** "Your store said: …", while it needs attention. */
  problem: string | null;
  /** "Refunds ₺1,075.00 to the customer through Stripe.", when the gateway refunds by its API. */
  refund: string | null;
}

const TONE: Record<StorePlatformOrder["status"], "success" | "danger" | "neutral" | "info"> = {
  placed: "success",
  needs_attention: "danger",
  refunded: "neutral",
  placing: "info",
  awaiting_payment: "neutral",
};

/**
 * 132.180 Payments in the app as the console's table (the payment and when,
 * its total, its state as a pill); a row opens the payment in the inspector:
 * its total and state, when and through which gateway, the store's order,
 * and for one that needs attention what the store said, Retry and Refund.
 */
export function InAppTable({ rows, owner }: { rows: InAppPaymentRow[]; owner: boolean }) {
  const t = useDashT();
  const [openId, setOpenId] = useState<number | null>(null);
  const open = rows.find((r) => r.id === openId) ?? null;
  const columns = "minmax(0,1fr) 140px 200px 20px";
  return (
    <div className="flex min-w-0 flex-col [--kit-cols:minmax(0,1fr)_140px_200px_20px] max-sm:[--kit-cols:minmax(0,1fr)_auto]">
      <KitTableHead columns={columns}>
        <span>{t("inAppPay.colPayment")}</span>
        <span>{t("common.total")}</span>
        <span>{t("common.status")}</span>
        <span />
      </KitTableHead>
      <ul className="m-0 list-none border-t border-(--sp-line) p-0 sm:border-t-0">
        {rows.map((r) => (
          <li key={r.id} data-in-app-payment={r.status} data-open={r.id === openId ? "" : undefined} className="kit-tr last:rounded-b-[17px] max-sm:py-3">
            <span className="flex min-w-0 flex-col gap-0.5">
              <button
                type="button"
                onClick={() => setOpenId(r.id)}
                aria-haspopup="dialog"
                aria-expanded={r.id === openId}
                className="kit-tr-open flex min-w-0 cursor-pointer border-0 bg-transparent p-0 text-start text-[14.5px] font-bold text-(--sp-ink) focus-visible:outline-offset-4"
              >
                <span className="min-w-0 truncate">{r.title}</span>
              </button>
              <span className="text-[13px] text-(--sp-muted)">
                {r.when}
                {r.provider ? ` · ${r.provider}` : ""}
                <span className="sm:hidden">
                  {" · "}
                  <bdi dir="ltr">{r.amount}</bdi>
                </span>
              </span>
            </span>
            <span className="font-sans text-[14.5px] font-semibold text-(--sp-ink) tabular-nums max-sm:hidden">
              <bdi dir="ltr">{r.amount}</bdi>
            </span>
            <span className="flex min-w-0">
              <KitStatus tone={TONE[r.status]}>{r.statusLabel}</KitStatus>
            </span>
            <Icon name="chevron_right" size={20} className="text-(--sp-faint) max-sm:hidden" />
          </li>
        ))}
      </ul>
      <KitInspector open={open !== null} onClose={() => setOpenId(null)} label={open?.title ?? ""} title={t("inAppPay.inspectorTitle")} closeLabel={t("common.close")}>
        {open ? (
          <div className="flex flex-col" data-inspector-payment={open.status}>
            <div className="flex flex-wrap gap-1.5">
              <KitStatus tone={TONE[open.status]}>{open.statusLabel}</KitStatus>
            </div>
            <h2 className="m-0 mt-2.5 mb-0.5 text-[21px] leading-[1.25] font-bold break-words text-(--sp-ink)">{open.title}</h2>
            <p className="m-0 font-sans text-lg font-semibold text-(--sp-ink) tabular-nums">
              <bdi dir="ltr">{open.amount}</bdi>
            </p>
            <dl className="m-0 mt-4 rounded-xl border border-(--sp-line)">
              {([[t("common.date"), open.when], ...(open.provider ? [[t("gateways.sumGateway"), open.provider]] : [])] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4 border-b border-(--sp-line) px-3.5 py-2.5 text-[13.5px] last:border-b-0">
                  <dt className="text-(--sp-muted)">{label}</dt>
                  <dd className="m-0 min-w-0 text-end font-bold break-words" dir="auto">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            {open.status === "needs_attention" ? (
              <div className="mt-4 flex flex-col gap-3">
                {open.problem ? <p className="m-0 rounded-[14px] bg-danger-bg px-3.5 py-3 text-sm leading-relaxed text-danger">{open.problem}</p> : null}
                <p className="m-0 text-[13px] leading-relaxed text-(--sp-muted)">{t("inAppPay.attentionHelp")}</p>
                {owner ? <AttentionActions key={open.id} id={open.orderId} refund={open.refund} /> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </KitInspector>
    </div>
  );
}
