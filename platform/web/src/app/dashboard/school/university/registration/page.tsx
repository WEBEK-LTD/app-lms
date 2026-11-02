import type { Metadata } from "next";
import Link from "next/link";
import { decideRegistrationAction, officeAddSectionAction, officeDropSectionAction } from "@/app/actions/university";
import { Badge, btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolPerson } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { addProblemMessage } from "@/lib/university/flow";
import { academicRecord, registrationView, uniData } from "@/lib/university/records";
import { holdsSeat } from "@/lib/university/rules";
import { registrationTerm } from "@/lib/university/settings";
import { ConfirmButton } from "../../../chat/forms";
import { Choice, SchoolForm } from "../../forms";
import { credits, ENROLMENT_KEYS, isSchool, NotSchool, Panel, STATUS_KEYS, TermTabs, UNI_BASE, UniHead } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("university.tabRegistration") };
}

/**
 * 113.9 A term's registrations: those sent to an advisor to approve or send
 * back here too, every student's state, and one student's sections added
 * or dropped by the office (past the window, and past the rules when ticked).
 */
export default async function UniversityRegistrationPage({ searchParams }: { searchParams: Promise<{ term?: string; student?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t, k } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("university.tabRegistration")} t={t} />;
  const params = await searchParams;
  const store = await getStore();
  const [data, students, teachers, school, plan] = await Promise.all([
    uniData(store, app.id),
    store.listSchoolPeople(app.id, { role: "student" }),
    store.listSchoolPeople(app.id, { role: "teacher" }),
    store.getSchoolSettings(app.id),
    appPlan(store, license, new Date()),
  ]);
  const today = schoolToday(schoolSettingsOf(school, app), new Date());
  const term = data.termById.get(Number(params.term)) ?? registrationTerm(data.terms, data.settings, today);
  const [registrations, enrolments, uniRows] = term
    ? await Promise.all([store.listUniRegistrations(app.id, { termId: term.id }), store.listUniEnrolments(app.id, { termId: term.id }), store.listUniStudents(app.id)])
    : [[], [], []];
  const byStudent = new Map(registrations.map((r) => [r.studentId, r]));
  const advisorOf = new Map(uniRows.map((r) => [r.studentId, r.advisorId]));
  const teacherName = new Map(teachers.map((p) => [p.id, p.name]));
  const creditsOf = (id: number) => enrolments.filter((e) => e.studentId === id && holdsSeat(e)).reduce((sum, e) => sum + (data.courses.get(e.courseId)?.credits ?? 0), 0);
  const waiting = registrations.filter((r) => r.status === "submitted").map((r) => students.find((s) => s.id === r.studentId)).filter((s): s is SchoolPerson => s !== undefined);
  const chosen = students.find((s) => s.id === Number(params.student)) ?? null;
  const record = chosen && term ? await academicRecord(store, data, chosen) : null;
  const view = record && term ? await registrationView(store, data, record, term, today) : null;
  const link = (studentId: number) => `${UNI_BASE}/registration?term=${term?.id ?? ""}&student=${studentId}`;
  const sectionLabel = (sectionCourseId: number, code: string) => `${data.courses.get(sectionCourseId)?.code ?? "?"}-${code}`;

  return (
    <div className="flex flex-col gap-6">
      <UniHead title={t("university.tabRegistration")} intro={t("university.registrationIntro")} current="/registration" t={t} app={app} plan={plan} settings={data.settings} />
      <TermTabs terms={data.terms} current={term?.id ?? null} base={`${UNI_BASE}/registration`} label={t("university.terms")} />
      {!term ? <p className="m-0 text-[15px] text-muted">{t("university.noTerms")}</p> : null}
      {term ? (
        <>
          <p className="m-0 text-[15px] text-muted">{t("university.windowIs", { opens: term.registrationOpens, closes: term.registrationCloses, drop: term.dropUntil })}</p>
          <Panel id="h-waiting" title={t("university.waitingTitle", { count: waiting.length })} intro={t("university.waitingIntro")}>
            {waiting.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("university.noneWaiting")}</p> : null}
            <ul className="m-0 flex list-none flex-col p-0">
              {waiting.map((student) => (
                <li key={student.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Link href={link(student.id)} className="text-[15px] font-bold">
                        {student.name}
                      </Link>
                      <span className="text-[13px] text-muted">
                        {[
                          t("university.creditsIs", { credits: credits(creditsOf(student.id)) }),
                          enrolments
                            .filter((e) => e.studentId === student.id && e.status === "pending")
                            .map((e) => data.courses.get(e.courseId)?.code)
                            .filter(Boolean)
                            .join(", "),
                          advisorOf.get(student.id) ? t("university.advisorIs", { name: teacherName.get(advisorOf.get(student.id)!) ?? "" }) : t("university.noAdvisor"),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                  </div>
                  <SchoolForm action={decideRegistrationAction} submit={t("university.sendAnswer")}>
                    <input type="hidden" name="studentId" value={student.id} />
                    <input type="hidden" name="termId" value={term.id} />
                    <fieldset className="m-0 flex flex-wrap gap-4 border-0 p-0">
                      <legend className="sr-only">{t("university.answerFor", { name: student.name })}</legend>
                      <label className="flex items-center gap-2 text-[15px]">
                        <input type="radio" name="decision" value="approve" defaultChecked className="h-4 w-4 accent-midnight" />
                        {t("university.approve")}
                      </label>
                      <label className="flex items-center gap-2 text-[15px]">
                        <input type="radio" name="decision" value="return" className="h-4 w-4 accent-midnight" />
                        {t("university.sendBack")}
                      </label>
                    </fieldset>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor={`f-note-${student.id}`} className="text-sm font-semibold">
                        {t("university.noteOptional")}
                      </label>
                      <textarea id={`f-note-${student.id}`} name="note" rows={2} maxLength={500} className="input min-h-16 py-3" />
                    </div>
                  </SchoolForm>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel id="h-all-registrations" title={t("university.allStudents")}>
            {students.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("university.noStudents")}</p> : null}
            <ul className="m-0 flex list-none flex-col p-0">
              {students
                .filter((s) => s.active)
                .slice(0, 300)
                .map((student) => {
                  const status = byStudent.get(student.id)?.status ?? null;
                  return (
                    <li key={student.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
                      <Link href={link(student.id)} className="min-w-0 flex-1 text-[15px] font-semibold">
                        {student.name}
                        {student.code ? <span className="text-[13px] font-normal text-muted"> · {student.code}</span> : null}
                      </Link>
                      <span className="text-[13px] text-muted">{t("university.creditsIs", { credits: credits(creditsOf(student.id)) })}</span>
                      {status ? <Badge tone={status === "approved" ? "success" : status === "returned" ? "danger" : "neutral"}>{t(STATUS_KEYS[status])}</Badge> : null}
                    </li>
                  );
                })}
            </ul>
          </Panel>
        </>
      ) : null}

      {chosen && view && term ? (
        <Panel id="h-student-registration" title={t("university.registrationOf", { name: chosen.name, term: term.name })}>
          <p className="m-0 text-[15px] text-muted">
            {[
              view.registration ? t(STATUS_KEYS[view.registration.status]) : t("university.statusDraft"),
              t("university.creditsRange", { credits: credits(view.credits), min: credits(view.limits.min), max: credits(view.limits.max) }),
              record?.program ? `${record.program.degree} ${record.program.name}` : t("university.noProgram"),
            ].join(" · ")}
          </p>
          {view.registration?.note ? <p className="m-0 text-[15px]">{t("university.noteIs", { note: view.registration.note })}</p> : null}
          {view.mine.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("university.noSectionsYet")}</p> : null}
          <ul className="m-0 flex list-none flex-col p-0">
            {view.mine.map((row) => (
              <li key={row.enrolment.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
                <span dir="ltr" className="w-[100px] shrink-0 text-[14px] font-bold">
                  {sectionLabel(row.course.id, row.section.code)}
                </span>
                <span className="min-w-0 flex-1 text-[15px]">{row.course.title}</span>
                <Badge tone={row.enrolment.status === "enrolled" ? "success" : "neutral"}>{t(ENROLMENT_KEYS[row.enrolment.status])}</Badge>
                <form action={officeDropSectionAction}>
                  <input type="hidden" name="studentId" value={chosen.id} />
                  <input type="hidden" name="termId" value={term.id} />
                  <input type="hidden" name="sectionId" value={row.section.id} />
                  <ConfirmButton confirm={t("university.dropConfirm", { name: chosen.name, section: sectionLabel(row.course.id, row.section.code) })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                    {t("university.drop")}
                  </ConfirmButton>
                </form>
              </li>
            ))}
          </ul>
          <SchoolForm action={officeAddSectionAction} submit={t("university.addToSection")} reset>
            <input type="hidden" name="studentId" value={chosen.id} />
            <input type="hidden" name="termId" value={term.id} />
            <Choice
              id="f-office-section"
              name="sectionId"
              label={t("university.section")}
              options={view.offered
                .filter((o) => !view.mine.some((m) => m.section.id === o.section.id))
                .map((o) => ({
                  value: String(o.section.id),
                  label: `${o.course.code}-${o.section.code} · ${o.course.title} · ${t("university.seatsLeft", { count: o.left })}${o.check.problems.length ? ` · ${o.check.problems.map((p) => k(addProblemMessage(p.code, p.detail))).join(" ")}` : ""}`,
                }))}
              empty={t("university.choose")}
            />
            <label className="flex items-start gap-2 text-[15px]">
              <input type="checkbox" name="override" className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{t("university.override")}</span>
                <span className="text-[14px] text-muted">{t("university.overrideHint")}</span>
              </span>
            </label>
          </SchoolForm>
        </Panel>
      ) : null}
    </div>
  );
}
