import Link from "next/link";
import { Badge } from "@/components/ui";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import type { App, ShipmentStatus } from "@/lib/data/types";
import { hasFeature, type PlanInfo } from "@/lib/plans";

/** 104 What the Shipments, Couriers and Delivery settings pages share. */

export const STATUS_KEYS: Record<ShipmentStatus, DashKey> = {
  awaiting_payment: "delivery.status_awaiting_payment",
  pending: "delivery.status_pending",
  assigned: "delivery.status_assigned",
  picked_up: "delivery.status_picked_up",
  on_the_way: "delivery.status_on_the_way",
  delivered: "delivery.status_delivered",
  failed: "delivery.status_failed",
  cancelled: "delivery.status_cancelled",
};

const TONES: Record<ShipmentStatus, "neutral" | "info" | "success" | "danger" | "warn"> = {
  awaiting_payment: "neutral",
  pending: "warn",
  assigned: "info",
  picked_up: "info",
  on_the_way: "info",
  delivered: "success",
  failed: "danger",
  cancelled: "neutral",
};

export function ShipmentStatusBadge({ status, t }: { status: ShipmentStatus; t: DashT }) {
  return <Badge tone={TONES[status]}>{t(STATUS_KEYS[status])}</Badge>;
}

/** The page for apps that aren't delivery apps. */
export function NotDelivery({ title, t }: { title: string; t: DashT }) {
  return (
    <div className="flex max-w-[620px] flex-col gap-3">
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{title}</h1>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{richText(t("delivery.notHere"), { link: (chunk) => <Link href="/dashboard/app-type">{chunk}</Link> })}</p>
    </div>
  );
}

/** Delivery isn't in the plan yet: everything can be set up, the app takes shipments once it is. */
export function PlanNotice({ plan, t }: { plan: PlanInfo | null; t: DashT }) {
  if (!plan || hasFeature(plan, "delivery")) return null;
  return (
    <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
      {richText(t("delivery.notOnPlan"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}
    </p>
  );
}

export const isDelivery = (app: App | null): app is App => app?.connector?.kind === "deliveries";

/** Google Maps at a place, for the team. */
export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
