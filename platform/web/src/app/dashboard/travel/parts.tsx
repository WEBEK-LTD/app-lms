import Link from "next/link";
import { Badge } from "@/components/ui";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import type { App, TravelBookingStatus, TravelPaymentStatus } from "@/lib/data/types";
import { hasFeature, type PlanInfo } from "@/lib/plans";

/** 126 What the Hotels, Flights, Bookings and Travel settings pages share. */

export const isTravel = (app: App | null): app is App => app?.connector?.kind === "travel";

export function NotTravel({ title, t }: { title: string; t: DashT }) {
  return (
    <div className="flex max-w-[620px] flex-col gap-3">
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{title}</h1>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("travel.notHere")}</p>
    </div>
  );
}

/** Travel isn't in the plan yet: everything can be set up, the app takes bookings once it is. */
export function TravelPlanNotice({ app, plan, t }: { app: App; plan: PlanInfo | null; t: DashT }) {
  if (!plan || hasFeature(plan, "travel") || app.demo) return null;
  return (
    <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
      {richText(t("travel.notOnPlan"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}
    </p>
  );
}

/** A part Yallapp switched off for the project. */
export function PartOff({ text }: { text: string }) {
  return (
    <p role="note" className="m-0 rounded-xl bg-sand px-4 py-3 text-[15px] leading-relaxed">
      {text}
    </p>
  );
}

const STATUS_TONES: Record<TravelBookingStatus, "neutral" | "info" | "success" | "danger" | "warn"> = {
  awaiting_payment: "warn",
  confirmed: "success",
  cancelled: "neutral",
  completed: "info",
};

export const STATUS_KEYS: Record<TravelBookingStatus, DashKey> = {
  awaiting_payment: "travel.status_awaiting_payment",
  confirmed: "travel.status_confirmed",
  cancelled: "travel.status_cancelled",
  completed: "travel.status_completed",
};

export const PAY_KEYS: Record<TravelPaymentStatus, DashKey> = {
  unpaid: "travel.pay_unpaid",
  paid: "travel.pay_paid",
  at_hotel: "travel.pay_at_hotel",
  refund_due: "travel.pay_refund_due",
  refunded: "travel.pay_refunded",
};

export function BookingStatusBadge({ status, t }: { status: TravelBookingStatus; t: DashT }) {
  return <Badge tone={STATUS_TONES[status]}>{t(STATUS_KEYS[status])}</Badge>;
}

export function PaymentBadge({ status, t }: { status: TravelPaymentStatus; t: DashT }) {
  return <Badge tone={status === "refund_due" ? "danger" : status === "paid" ? "success" : "neutral"}>{t(PAY_KEYS[status])}</Badge>;
}
