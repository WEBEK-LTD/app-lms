import Link from "next/link";
import { correctCheckinAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
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
    <details className="rounded-xl border border-line p-3">
      <summary className="cursor-pointer text-sm font-semibold">{t("school.correct")}</summary>
      <div className="flex flex-col gap-3 pt-3">
        <Corrections row={entry.row} timezone={timezone} t={t} />
        <SchoolForm action={correctCheckinAction} submit={t("school.saveCorrection")}>
          <input type="hidden" name="personId" value={entry.person.id} />
          <input type="hidden" name="date" value={date} />
          <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
            <legend className="mb-1.5 text-sm font-semibold">{t("school.dayMark")}</legend>
            {(["present", "absent", "excused"] as const).map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-midnight has-[:checked]:bg-sand has-[:checked]:font-bold">
                <input type="radio" name="mark" value={m} defaultChecked={mark === m} className="h-4 w-4 accent-midnight" />
                {t(m === "present" ? "school.markPresent" : m === "absent" ? "school.markAbsent" : "school.markExcused")}
              </label>
            ))}
          </fieldset>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field id={`f-in-${id}`} label={t("school.cameIn")} name="inTime" type="time" dir="ltr" defaultValue={at(entry.row?.inAt)} />
            <Field id={`f-out-${id}`} label={t("school.leftAt")} name="outTime" type="time" dir="ltr" defaultValue={at(entry.row?.outAt)} />
            <Field id={`f-reason-${id}`} label={t("school.reason")} name="reason" maxLength={300} hint={t("school.reasonHint")} />
          </div>
        </SchoolForm>
      </div>
    </details>
  );
}

/** 113.2 Links between the check-in pages. */
export function CheckinLinks({ t }: { t: DashT }) {
  const links = [
    { href: "/dashboard/school/checkin", label: t("school.checkin"), icon: "qr_code_2" as const },
    { href: "/dashboard/school/checkin/gate", label: t("school.gate"), icon: "tablet" as const },
    { href: "/dashboard/school/checkin/report", label: t("school.monthReport"), icon: "calendar_month" as const },
    { href: "/dashboard/school/checkin/settings", label: t("school.checkinSettings"), icon: "tune" as const },
  ];
  return (
    <nav aria-label={t("school.checkin")} className="flex max-w-[860px] flex-wrap gap-2">
      {links.map((l) => (
        <Link key={l.href} href={l.href} className={`${btn.secondary} h-10 px-4 text-sm`}>
          <Icon name={l.icon} size={18} />
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
