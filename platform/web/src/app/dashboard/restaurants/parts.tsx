import { Badge } from "@/components/ui";
import type { DashKey, DashT } from "@/i18n/dashboard";
import type { FoodOrderStatus } from "@/lib/data/types";

/** 105.1 What the Restaurants and Food orders pages share. */

export const FOOD_STATUS_KEYS: Record<FoodOrderStatus, DashKey> = {
  awaiting_payment: "food.status_awaiting_payment",
  placed: "food.status_placed",
  accepted: "food.status_accepted",
  ready: "food.status_ready",
  picked_up: "food.status_picked_up",
  on_the_way: "food.status_on_the_way",
  delivered: "food.status_delivered",
  rejected: "food.status_rejected",
  cancelled: "food.status_cancelled",
  failed: "food.status_failed",
};

const TONES: Record<FoodOrderStatus, "neutral" | "info" | "success" | "danger" | "warn"> = {
  awaiting_payment: "neutral",
  placed: "warn",
  accepted: "info",
  ready: "info",
  picked_up: "info",
  on_the_way: "info",
  delivered: "success",
  rejected: "danger",
  cancelled: "neutral",
  failed: "danger",
};

export function FoodStatusBadge({ status, t }: { status: FoodOrderStatus; t: DashT }) {
  return <Badge tone={TONES[status]}>{t(FOOD_STATUS_KEYS[status])}</Badge>;
}

/** The page for apps that aren't food delivery apps. */
export function NotFood({ title, t }: { title: string; t: DashT }) {
  return (
    <div className="flex max-w-[620px] flex-col gap-3">
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{title}</h1>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("food.notHere")}</p>
    </div>
  );
}

/** "12.5" for 1250 basis points. */
export function percentOf(bp: number): string {
  return String(Math.round(bp) / 100);
}
