import { Badge } from "@/components/ui";
import type { DashKey, DashT } from "@/i18n/dashboard";
import type { ComplaintStatus, MarketApplicationStatus, MarketOrderStatus } from "@/lib/data/types";
import { waitParts } from "@/lib/market/support";

/** 115.12 What the marketplace's pages share: the statuses' words and colours, waits said shortly. */

type Tone = "neutral" | "info" | "success" | "danger" | "warn";

const ORDER_TONES: Record<MarketOrderStatus, Tone> = {
  awaiting_payment: "neutral",
  scheduled: "neutral",
  placed: "warn",
  accepted: "info",
  picking: "info",
  ready: "info",
  on_the_way: "info",
  delivered: "success",
  picked_up: "success",
  rejected: "danger",
  cancelled: "neutral",
};

export function OrderStatusBadge({ status, t }: { status: MarketOrderStatus; t: DashT }) {
  return <Badge tone={ORDER_TONES[status]}>{t(`market.st_${status}` as DashKey)}</Badge>;
}

const COMPLAINT_TONES: Record<ComplaintStatus, Tone> = {
  open: "warn",
  in_review: "info",
  waiting_for_customer: "neutral",
  resolved: "success",
  rejected: "danger",
};

export function ComplaintStatusBadge({ status, t }: { status: ComplaintStatus; t: DashT }) {
  return <Badge tone={COMPLAINT_TONES[status]}>{t(`market.cs_${status}` as DashKey)}</Badge>;
}

/** 115.12 An application's status colour. */
export const APPLICATION_TONES: Record<MarketApplicationStatus, "warn" | "info" | "success" | "neutral"> = { new: "warn", more_info: "info", accepted: "success", rejected: "neutral" };

export function waitText(minutes: number, t: DashT): string {
  const { unit, count } = waitParts(minutes);
  return t(`market.${unit}`, { count });
}

/** The page for apps that aren't marketplaces. */
export function NotMarket({ title, t }: { title: string; t: DashT }) {
  return (
    <div className="flex max-w-[620px] flex-col gap-3">
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{title}</h1>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("market.notMarket")}</p>
    </div>
  );
}
