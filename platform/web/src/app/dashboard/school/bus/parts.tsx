import { Field } from "@/components/form";
import { Badge } from "@/components/ui";
import type { DashT } from "@/i18n/dashboard";
import type { SchoolBusMarkStatus } from "@/lib/data/types";
import { BUS_LIMITS } from "@/lib/school/bus";
import { Choice } from "../forms";

/** 113.10 What the bus pages share: a route's fields, a stop's fields, a student's mark on a trip. */

export function RouteFields({ suffix, values, crew, t }: { suffix: string; values: Record<string, string>; crew: { value: string; label: string }[]; t: DashT }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={`f-route-name${suffix}`} label={t("bus.routeName")} name="name" defaultValue={values.name} maxLength={BUS_LIMITS.name} placeholder={t("bus.routeNameExample")} required />
      <Field id={`f-route-plate${suffix}`} label={t("bus.plate")} name="plate" defaultValue={values.plate} maxLength={BUS_LIMITS.plate} dir="ltr" required />
      <Field id={`f-route-seats${suffix}`} label={t("bus.capacity")} name="capacity" type="number" min={1} max={BUS_LIMITS.maxCapacity} defaultValue={values.capacity} dir="ltr" required />
      <Choice id={`f-route-driver${suffix}`} name="driverId" label={t("bus.driver")} options={crew} defaultValue={values.driverId} empty={t("bus.none")} />
      <Choice id={`f-route-supervisor${suffix}`} name="supervisorId" label={t("bus.supervisor")} options={crew} defaultValue={values.supervisorId} empty={t("bus.none")} />
      <label className="flex items-center gap-2 self-end pb-2 text-[15px]">
        <input type="checkbox" name="active" defaultChecked={values.active === "on"} className="size-4" />
        {t("bus.active")}
      </label>
    </div>
  );
}

export function StopFields({ suffix, values, t }: { suffix: string; values: Record<string, string>; t: DashT }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={`f-stop-name${suffix}`} label={t("bus.stopName")} name="name" defaultValue={values.name} maxLength={BUS_LIMITS.name} placeholder={t("bus.stopNameExample")} required />
      <Field id={`f-stop-place${suffix}`} label={t("bus.stopPlace")} name="place" defaultValue={values.place} hint={t("bus.stopPlaceHint")} dir="ltr" required />
      <Field id={`f-stop-morning${suffix}`} label={t("bus.morningTime")} name="morning" type="time" defaultValue={values.morning} dir="ltr" />
      <Field id={`f-stop-afternoon${suffix}`} label={t("bus.afternoonTime")} name="afternoon" type="time" defaultValue={values.afternoon} dir="ltr" />
    </div>
  );
}

export function MarkBadge({ status, t }: { status: SchoolBusMarkStatus | null; t: DashT }) {
  if (status === "boarded") return <Badge tone="success">{t("bus.markBoarded")}</Badge>;
  if (status === "off") return <Badge tone="info">{t("bus.markOff")}</Badge>;
  if (status === "absent") return <Badge tone="warn">{t("bus.markAbsent")}</Badge>;
  return <Badge tone="neutral">{t("bus.markNone")}</Badge>;
}
