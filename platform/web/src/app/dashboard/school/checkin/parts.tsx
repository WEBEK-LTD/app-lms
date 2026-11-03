import { correctCheckinAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { LinkCards } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { utcToLocal } from "@/lib/bookings/time";
import type { SchoolCheckin, SchoolCheckinMethod } from "@/lib/data/types";
import type { BoardRow, CheckinState } from "@/lib/school/checkin";
import { SchoolForm } from "../forms";

/** 113.2 What the check-in pages share. */

export const STATE_KEYS: Record<CheckinState, DashKey> = {
  not_yet: "school.stateNotYet",
  in: "school.stateIn",
  left: "school.stateLeft",
  absent: "school.stateAbsent",
  excused: "school.stateExcused",
  leave: "school.stateLeave",
  off: "school.stateOff",
};

export const STATE_TONES: Record<CheckinState, "success" | "warn" | "danger" | "neutral" | "info"> = {
  not_yet: "neutral",
  in: "success",
  left: "info",
  absent: "danger",
  excused: "warn",
  leave: "warn",
  off: "neutral",
};

const METHOD_KEYS: Record<SchoolCheckinMethod, DashKey> = { qr: "school.byQr", location: "school.byLocation", office: "school.byOffice" };

/** 113.2 The day's record of a person: in and out (how), late, left early, and the office's corrections. */
export function DayRecord({ row, timezone, t }: { row: SchoolCheckin | null; timezone: string; t: DashT }) {
  const at = (d: Date | null) => (d ? utcToLocal(d, timezone).time : null);
  const inTime = at(row?.inAt ?? null);
  const outTime = at(row?.outAt ?? null);
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted" dir="auto">
      {inTime ? <span>{[t("school.inAt", { time: inTime }), row?.inMethod ? t(METHOD_KEYS[row.inMethod]) : null].filter(Boolean).join(" · ")}</span> : null}
      {outTime ? <span>{[t("school.outAt", { time: outTime }), row?.outMethod ? t(METHOD_KEYS[row.outMethod]) : null].filter(Boolean).join(" · ")}</span> : null}
    </span>
  );
}

/** 113.2 The office's corrections of a day, newest first, with who made them. */
export function Corrections({ row, timezone, t }: { row: SchoolCheckin | null; timezone: string; t: DashT }) {
  if (!row || row.corrections.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] font-bold">{t("school.corrections")}</span>
      <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13px] text-ink-4" dir="auto">
        {[...row.corrections].reverse().map((c) => {
          const local = utcToLocal(new Date(c.at), timezone);
          return <li key={c.at}>{t("school.correctionLine", { at: `${local.date} ${local.time}`, by: c.by, change: c.change, reason: c.reason })}</li>;
        })}
      </ul>
    </div>
  );
}

/** 113.2 The correction form of a person's day. */
export function CorrectForm({ entry, date, timezone, t }: { entry: Pick<BoardRow, "person" | "row" | "state">; date: string; timezone: string; t: DashT }) {
  const at = (d: Date | null | undefined) => (d ? utcToLocal(d, timezone).time : "");
  const id = `${entry.person.id}-${date}`;
  const mark = entry.row?.mark ?? (entry.row?.inAt ? "present" : entry.state === "absent" ? "absent" : "present");
  return (
    <>
      {/* The page kit: the correction in a Sheet, opened from the person's entry. */}
      <SheetButton target={`correct-${id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
        {t("school.correct")}
      </SheetButton>
      <Sheet id={`correct-${id}`} title={entry.person.name} description={date}>
        <Corrections row={entry.row} timezone={timezone} t={t} />
        <SchoolForm action={correctCheckinAction} submit={t("school.saveCorrection")} sheet>
          <input type="hidden" name="personId" value={entry.person.id} />
          <input type="hidden" name="date" value={date} />
          <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
            <legend className="mb-1.5 text-sm font-semibold">{t("school.dayMark")}</legend>
            {(["present", "absent", "excused"] as const).map((m) => (
              <label key={m} className="flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white px-3 text-sm has-[:checked]:border-midnight has-[:checked]:bg-midnight has-[:checked]:font-bold has-[:checked]:text-ivory">
                <input type="radio" name="mark" value={m} defaultChecked={mark === m} className="h-4 w-4 accent-ember" />
                {t(m === "present" ? "school.markPresent" : m === "absent" ? "school.markAbsent" : "school.markExcused")}
              </label>
            ))}
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`f-in-${id}`} label={t("school.cameIn")} name="inTime" type="time" dir="ltr" defaultValue={at(entry.row?.inAt)} />
            <Field id={`f-out-${id}`} label={t("school.leftAt")} name="outTime" type="time" dir="ltr" defaultValue={at(entry.row?.outAt)} />
            <Field id={`f-reason-${id}`} label={t("school.reason")} name="reason" maxLength={300} hint={t("school.reasonHint")} className="sm:col-span-2" />
          </div>
        </SchoolForm>
      </Sheet>
    </>
  );
}

/** 113.2 Links between the check-in pages: the kit's cards, but for the page they're on. */
export function CheckinLinks({ t, current }: { t: DashT; current?: string }) {
  const links = [
    { href: "/dashboard/school/checkin", label: t("school.checkin"), icon: "qr_code_2" as const },
    { href: "/dashboard/school/checkin/gate", label: t("school.gate"), icon: "tablet" as const },
    { href: "/dashboard/school/checkin/report", label: t("school.monthReport"), icon: "calendar_month" as const },
    { href: "/dashboard/school/checkin/settings", label: t("school.checkinSettings"), icon: "tune" as const },
  ];
  return <LinkCards label={t("school.checkin")} items={links.filter((l) => l.href !== current)} />;
}
