import type { Metadata } from "next";
import Link from "next/link";
import { addSchoolAssessmentAction, deleteSchoolAssessmentAction, saveSchoolScoresAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { btn } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { SCHOOL_ASSESSMENT_KINDS, type SchoolAssessmentKind } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { SCHOOL_LIMITS } from "@/lib/school/forms";
import { trimScore } from "@/lib/school/flow";
import { ConfirmButton } from "../../chat/forms";
import { AddServiceBox } from "../../delivery/forms";
import { Choice, SchoolForm } from "../forms";
import { ClassTabs, FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.grades") };
}

const KIND_KEYS: Record<SchoolAssessmentKind, DashKey> = { exam: "school.exam", quiz: "school.quiz", assignment: "school.assignment" };

/** 105.4 Each class's exams, quizzes and assignments, and their scores; students and families see them in the app. */
export default async function SchoolGradesPage({ searchParams }: { searchParams: Promise<{ class?: string; assessment?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.grades")} t={t} />;
  const params = await searchParams;
  const store = await getStore();
  const [classes, subjects, plan] = await Promise.all([store.listSchoolClasses(app.id), store.listSchoolSubjects(app.id), appPlan(store, license, new Date())]);
  const wanted = Number(params.class);
  const klass = classes.find((c) => c.id === wanted) ?? classes[0] ?? null;
  const assessments = klass ? await store.listSchoolAssessments(app.id, { classId: klass.id }) : [];
  const open = assessments.find((a) => a.id === Number(params.assessment)) ?? null;
  const [students, scores] = klass && open ? await Promise.all([store.listSchoolPeople(app.id, { role: "student", classId: klass.id }), store.listSchoolScores(app.id, { assessmentId: open.id })]) : [[], []];
  const scored = await Promise.all(assessments.map(async (a) => (await store.listSchoolScores(app.id, { assessmentId: a.id })).length));
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const scoreOf = new Map(scores.map((s) => [s.studentId, s.score]));

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("school.grades")} intro={t("school.gradesIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {classes.length === 0 ? <FirstNote text={t("school.classesFirst")} href="/dashboard/school/classes" /> : null}
      {klass ? (
        <>
          <ClassTabs classes={classes} current={klass.id} base="/dashboard/school/grades" label={t("school.classes")} />
          {open ? (
            <Panel id="h-scores" title={open.title} intro={`${t(KIND_KEYS[open.kind])} · ${subjectName.get(open.subjectId) ?? ""} · ${open.date} · ${t("school.outOf", { max: trimScore(open.maxScore) })}`}>
              <Link href={`/dashboard/school/grades?class=${klass.id}`} className="text-[15px]">
                {t("school.backToList")}
              </Link>
              {students.filter((s) => s.active).length === 0 ? (
                <FirstNote text={t("school.studentsFirst")} href="/dashboard/school/people" />
              ) : (
                <SchoolForm action={saveSchoolScoresAction} submit={t("school.saveScores")}>
                  <input type="hidden" name="id" value={open.id} />
                  <ul className="m-0 flex list-none flex-col p-0">
                    {students
                      .filter((s) => s.active)
                      .map((student) => (
                        <li key={student.id} className="flex items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
                          <label htmlFor={`f-score-${student.id}`} className="min-w-0 flex-1 text-[15px] font-semibold">
                            {student.name}
                          </label>
                          <input
                            id={`f-score-${student.id}`}
                            name={`score-${student.id}`}
                            inputMode="decimal"
                            dir="ltr"
                            defaultValue={scoreOf.has(student.id) ? trimScore(scoreOf.get(student.id)!) : ""}
                            className="input input-sm w-[100px] text-center"
                          />
                          <span dir="ltr" className="w-[56px] text-[14px] text-muted">
                            / {trimScore(open.maxScore)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </SchoolForm>
              )}
            </Panel>
          ) : (
            <Panel id="h-assessments" title={t("school.assessmentsOf", { name: klass.name })}>
              {assessments.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("school.noAssessments")}</p> : null}
              <ul className="m-0 flex list-none flex-col p-0">
                {assessments.map((a, i) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-bold">{a.title}</span>
                      <span className="text-[13px] text-muted">
                        {[t(KIND_KEYS[a.kind]), subjectName.get(a.subjectId), a.date, t("school.outOf", { max: trimScore(a.maxScore) }), t("school.scoredCount", { count: scored[i]! })].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <Link href={`/dashboard/school/grades?class=${klass.id}&assessment=${a.id}`} className={`${btn.secondary} h-9 px-3.5 text-sm no-underline`}>
                      {t("school.enterScores")}
                    </Link>
                    <form action={deleteSchoolAssessmentAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmButton confirm={t("school.deleteAssessment", { title: a.title })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("school.delete")}
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
              {subjects.length === 0 ? (
                <FirstNote text={t("school.subjectsFirst")} href="/dashboard/school/classes" />
              ) : (
                <AddServiceBox title={t("school.addAssessment")} open={assessments.length === 0}>
                  <SchoolForm action={addSchoolAssessmentAction} submit={t("school.add")} reset>
                    <input type="hidden" name="classId" value={klass.id} />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Choice id="f-kind" name="kind" label={t("school.kind")} options={SCHOOL_ASSESSMENT_KINDS.map((k) => ({ value: k, label: t(KIND_KEYS[k]) }))} defaultValue="exam" />
                      <Choice id="f-subject" name="subjectId" label={t("school.subject")} options={subjects.map((s) => ({ value: String(s.id), label: s.name }))} empty={t("school.choose")} />
                      <Field id="f-title" label={t("school.title")} name="title" maxLength={SCHOOL_LIMITS.title} required />
                      <Field id="f-date" label={t("school.date")} name="date" type="date" dir="ltr" required />
                      <Field id="f-max" label={t("school.fullMark")} name="maxScore" inputMode="decimal" dir="ltr" defaultValue="100" required />
                    </div>
                  </SchoolForm>
                </AddServiceBox>
              )}
            </Panel>
          )}
        </>
      ) : null}
    </div>
  );
}
