import Link from "next/link";
import { answerExcuseAction } from "@/app/actions/school-parent";
import { Badge } from "@/components/ui";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { utcToLocal } from "@/lib/bookings/time";
import type { SchoolExcuse, SchoolExcuseStatus, SchoolPerson } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { mediaLink } from "@/lib/media/files";
import { PARENT_LIMITS } from "@/lib/school/parent";
import { daysBetween } from "@/lib/school/staff";
import { SchoolForm } from "../forms";

export const EXCUSE_KEYS: Record<SchoolExcuseStatus, DashKey> = { pending: "parents.pending", accepted: "parents.accepted", declined: "parents.declinedStatus", cancelled: "parents.cancelled" };
export const EXCUSE_TONES: Record<SchoolExcuseStatus, "success" | "warn" | "danger" | "neutral"> = { pending: "warn", accepted: "success", declined: "danger", cancelled: "neutral" };

/** 113.4 One excuse: the child, the days, the reason and its document, who sent it; the answer form while it waits. */
export function ExcuseItem({ excuse, student, parent, className, t, timezone }: { excuse: SchoolExcuse; student: SchoolPerson | undefined; parent: SchoolPerson | undefined; className: string | null; t: DashT; timezone: string }) {
  const sent = utcToLocal(excuse.createdAt, timezone).date;
  const answered = excuse.answeredAt ? utcToLocal(excuse.answeredAt, timezone).date : null;
  return (
    <li data-excuse={excuse.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex min-w-[180px] flex-1 flex-col gap-0.5">
          {student ? (
            <Link href={`/dashboard/school/people/${student.id}`} className="text-[15px] font-bold">
              {student.name}
            </Link>
          ) : (
            <span className="text-[15px] font-bold">—</span>
          )}
          <span className="text-[13px] text-muted">{[className, t("parents.excuseLine", { from: excuse.startsOn, to: excuse.endsOn, days: daysBetween(excuse.startsOn, excuse.endsOn) })].filter(Boolean).join(" · ")}</span>
          <span className="text-[14px] whitespace-pre-line text-ink-4">{excuse.reason}</span>
          {excuse.file ? (
            <a href={mediaLink(appUrl(), excuse.file.fileId)} target="_blank" rel="noreferrer" className="text-[14px]">
              {t("parents.document")}: {excuse.file.name}
            </a>
          ) : null}
          <span className="text-[13px] text-muted">{t("parents.sentBy", { name: parent?.name ?? "—", date: sent })}</span>
          {answered ? <span className="text-[13px] text-muted">{[t("parents.answeredBy", { by: excuse.answeredBy ?? "—", date: answered }), excuse.answer].filter(Boolean).join(" · ")}</span> : null}
        </span>
        <Badge tone={EXCUSE_TONES[excuse.status]}>{t(EXCUSE_KEYS[excuse.status])}</Badge>
      </div>
      {excuse.status === "pending" ? (
        <SchoolForm action={answerExcuseAction} submit={t("parents.save")} className="rounded-xl border border-line p-3">
          <input type="hidden" name="id" value={excuse.id} />
          <fieldset className="m-0 flex flex-wrap gap-1.5 border-0 p-0">
            <legend className="sr-only">{student?.name ?? ""}</legend>
            {(["accepted", "declined"] as const).map((a) => (
              <label key={a} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm has-[:checked]:border-midnight has-[:checked]:bg-sand has-[:checked]:font-bold">
                <input type="radio" name="answer" value={a} defaultChecked={a === "accepted"} className="h-4 w-4 accent-midnight" />
                {t(a === "accepted" ? "parents.accept" : "parents.decline")}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`f-note-${excuse.id}`} className="text-sm font-semibold">
              {t("parents.answerNote")}
            </label>
            <textarea id={`f-note-${excuse.id}`} name="note" rows={2} maxLength={PARENT_LIMITS.answer} className="input min-h-16 py-3" />
          </div>
        </SchoolForm>
      ) : null}
    </li>
  );
}

