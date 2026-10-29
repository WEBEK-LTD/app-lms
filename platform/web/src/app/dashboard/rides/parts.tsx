import Link from "next/link";
import { Badge } from "@/components/ui";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { richText } from "@/i18n/rich";
import type { App, RideStatus } from "@/lib/data/types";
import { hasFeature, type PlanInfo } from "@/lib/plans";

/** 105.2 What the Rides, Drivers, Vehicle types and Ride settings pages share. */

export const RIDE_STATUS_KEYS: Record<RideStatus, DashKey> = {
  scheduled: "rides.status_scheduled",
  searching: "rides.status_searching",
  accepted: "rides.status_accepted",
  arrived: "rides.status_arrived",
  in_progress: "rides.status_in_progress",
  completed: "rides.status_completed",
  cancelled: "rides.status_cancelled",
  no_driver: "rides.status_no_driver",
};

const TONES: Record<RideStatus, "neutral" | "info" | "success" | "danger" | "warn"> = {
  scheduled: "neutral",
  searching: "warn",
  accepted: "info",
  arrived: "info",
  in_progress: "info",
  completed: "success",
  cancelled: "neutral",
  no_driver: "danger",
};

export function RideStatusBadge({ status, t }: { status: RideStatus; t: DashT }) {
  return <Badge tone={TONES[status]}>{t(RIDE_STATUS_KEYS[status])}</Badge>;
}

/** 105.2 Ride hailing apps. */
export const isRides = (app: App | null): app is App => app?.connector?.kind === "rides";

/** The page for apps that aren't ride apps. */
export function NotRides({ title, t }: { title: string; t: DashT }) {
  return (
    <div className="flex max-w-[620px] flex-col gap-3">
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{title}</h1>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{t("rides.notHere")}</p>
    </div>
  );
}

/** Ride hailing isn't in the plan yet: everything can be set up, the app takes rides once it is. */
export function RidesPlanNotice({ plan, t }: { plan: PlanInfo | null; t: DashT }) {
  if (!plan || hasFeature(plan, "rides")) return null;
  return (
    <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
      {richText(t("rides.notOnPlan"), { link: (chunk) => <Link href="/dashboard/license">{chunk}</Link> })}
    </p>
  );
}

/** No vehicle type with fares yet: the app can't take rides. */
export function TypesFirst({ t }: { t: DashT }) {
  return (
    <p role="note" className="m-0 rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
      {richText(t("rides.typesFirst"), { link: (chunk) => <Link href="/dashboard/vehicle-types">{chunk}</Link> })}
    </p>
  );
}

export function PageHead({ title, intro }: { title: string; intro: string }) {
  return (
    <div className="flex max-w-[640px] flex-col gap-2">
      <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{title}</h1>
      <p className="m-0 text-[15px] leading-relaxed text-ink-4">{intro}</p>
    </div>
  );
}
