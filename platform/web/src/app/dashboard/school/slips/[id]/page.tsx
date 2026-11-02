import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteSlipAction, saveSlipAction } from "@/app/actions/school-parent";
import { Badge, btn } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { utcToLocal } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { slipCounts, slipFor, slipForName, slipOpen } from "@/lib/school/parent";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { ConfirmButton } from "../../../chat/forms";
import { SchoolForm } from "../../forms";
import { isSchool, NotSchool, Panel } from "../../parts";
import { SlipFields } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("parents.answers") };
}

const SHOWS = ["all", "yes", "no", "waiting"] as const;
const SHOW_KEYS: Record<(typeof SHOWS)[number], DashKey> = { all: "parents.all", yes: "parents.signedYes", no: "parents.declined", waiting: "parents.notAnswered" };

/** 113.4 A permission slip's answers: each student it is for, signed yes, declined or not yet, with who signed and when. */
export default async function SchoolSlipPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ show?: string }> }) {
  const { app } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("parents.slips")} t={t} />;
  const { id } = await params;
  const store = await getStore();
  const slip = /^\d{1,15}$/.test(id) ? await store.getSchoolSlip(app.id, Number(id)) : null;
  if (!slip) notFound();
  const wanted = (await searchParams).show ?? "";
  const show = (SHOWS as readonly string[]).includes(wanted) ? (wanted as (typeof SHOWS)[number]) : "all";
  const now = new Date();
  const [saved, classes, students, answers] = await Promise.all([
    store.getSchoolSettings(app.id),
    store.listSchoolClasses(app.id),
    store.listSchoolPeople(app.id, { role: "student" }),
    store.listSchoolSlipAnswers(app.id, { slipId: slip.id }),
  ]);
  const settings = schoolSettingsOf(saved, app);
  const today = schoolToday(settings, now);
  const byClass = new Map(classes.map((c) => [c.id, c]));
  const forThem = students.filter((s) => s.active && slipFor(slip, s, byClass)).sort((a, b) => a.name.localeCompare(b.name));
  const answerOf = new Map(answers.map((a) => [a.studentId, a]));
  const counts = slipCounts(forThem, answers);
  const shown = forThem.filter((s) => show === "all" || (show === "waiting" ? !answerOf.has(s.id) : answerOf.get(s.id)?.answer === show));
  const open = slipOpen(slip, today);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard/school/slips" className="inline-flex items-center gap-1 text-sm font-semibold no-underline">
        {t("parents.back")}
      </Link>
      <div className="flex max-w-[860px] flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">{slip.title}</h1>
          <Badge tone={open ? "success" : "neutral"}>{t(open ? "parents.open" : "parents.closed")}</Badge>
        </div>
        <p className="m-0 text-[15px] text-muted">{[t("parents.dueLine", { date: slip.dueOn }), slipForName(slip, byClass) ?? t("schoolLife.forSchool"), slip.feeNote ? t("parents.feeIs", { note: slip.feeNote }) : null].filter(Boolean).join(" · ")}</p>
        {slip.details ? <p className="m-0 text-[15px] leading-relaxed whitespace-pre-line text-ink-4">{slip.details}</p> : null}
      </div>

      <Panel id="h-answers" title={t("parents.answers")} intro={t("parents.counts", counts)}>
        <nav aria-label={t("parents.answers")} className="flex flex-wrap gap-1.5">
          {SHOWS.map((s) => (
            <Link
              key={s}
              href={`/dashboard/school/slips/${slip.id}${s === "all" ? "" : `?show=${s}`}`}
              aria-current={s === show ? "page" : undefined}
              className={`flex h-9 items-center rounded-full border px-3.5 text-sm no-underline ${
                s === show ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-ink-3 hover:border-midnight hover:text-midnight"
              }`}
            >
              {t(SHOW_KEYS[s])}
            </Link>
          ))}
        </nav>
        {forThem.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("parents.noStudents")}</p> : null}
        {forThem.length > 0 && shown.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("parents.noMatch")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0" data-slip-answers>
          {shown.map((student) => {
            const answer = answerOf.get(student.id);
            const local = answer ? utcToLocal(answer.answeredAt, settings.timezone) : null;
            return (
              <li key={student.id} data-student={student.id} className="flex flex-wrap items-center gap-2 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
                <span className="flex min-w-[180px] flex-1 flex-col gap-0.5">
                  <Link href={`/dashboard/school/people/${student.id}`} className="text-[15px] font-bold">
                    {student.name}
                  </Link>
                  <span className="text-[13px] text-muted">
                    {[student.classId ? byClass.get(student.classId)?.name : null, answer && local ? t("parents.signedBy", { name: answer.signedName, date: `${local.date} ${local.time}` }) : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <Badge tone={!answer ? "neutral" : answer.answer === "yes" ? "success" : "danger"}>{t(!answer ? "parents.notAnswered" : answer.answer === "yes" ? "parents.signedYes" : "parents.declined")}</Badge>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel id="h-edit" title={t("parents.editSlip")}>
        <SchoolForm action={saveSlipAction} submit={t("parents.save")}>
          <SlipFields slip={slip} classes={classes} today={today} t={t} />
        </SchoolForm>
        <form action={deleteSlipAction} className="flex justify-end">
          <input type="hidden" name="id" value={slip.id} />
          <ConfirmButton confirm={t("parents.deleteSlip", { title: slip.title })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
            {t("parents.remove")}
          </ConfirmButton>
        </form>
      </Panel>
    </div>
  );
}
