import type { Metadata } from "next";
import Link from "next/link";
import { deleteSyllabusTopicAction, deleteSyllabusUnitAction, importSyllabusAction, moveSyllabusAction, saveSyllabusTopicAction, saveSyllabusUnitAction } from "@/app/actions/school-reports";
import { Field } from "@/components/form";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolSyllabusTopic } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { schoolGrades, SYLLABUS_CSV_EXAMPLE, SYLLABUS_LIMITS } from "@/lib/school/syllabus";
import { ConfirmButton } from "../../chat/forms";
import { AddServiceBox } from "../../delivery/forms";
import { SchoolForm } from "../forms";
import { FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("reports.syllabus") };
}

const pill = (current: boolean) =>
  `flex h-9 items-center rounded-full border px-3.5 text-sm no-underline ${current ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-ink-3 hover:border-midnight hover:text-midnight"}`;

/**
 * 113.5 The syllabus of each subject per grade: its units, and their lessons
 * or topics with the days the plan gives each; written here or from a sheet.
 * Each class follows its grade's, and its teachers mark what it covered.
 */
export default async function SyllabusPage({ searchParams }: { searchParams: Promise<{ grade?: string; subject?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("reports.syllabus")} t={t} />;
  const params = await searchParams;
  const store = await getStore();
  const [classes, subjects, plan] = await Promise.all([store.listSchoolClasses(app.id), store.listSchoolSubjects(app.id), appPlan(store, license, new Date())]);
  const grades = schoolGrades(classes);
  const grade = grades.find((g) => g === params.grade) ?? grades[0] ?? null;
  const subject = subjects.find((s) => s.id === Number(params.subject)) ?? subjects[0] ?? null;
  const units = grade && subject ? await store.listSchoolSyllabusUnits(app.id, { subjectId: subject.id, grade }) : [];
  const topics = await store.listSchoolSyllabusTopics(app.id, { unitIds: units.map((u) => u.id) });
  const base = "/dashboard/school/syllabus";
  const link = (g: string, s: number) => `${base}?grade=${encodeURIComponent(g)}&subject=${s}`;

  const topicFields = (suffix: string, topic: SchoolSyllabusTopic | null) => (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field id={`f-topic${suffix}`} label={t("reports.topicTitle")} name="title" defaultValue={topic?.title ?? ""} maxLength={SYLLABUS_LIMITS.title} placeholder={t("reports.topicExample")} required />
      <Field id={`f-starts${suffix}`} label={t("reports.plannedFrom")} name="startsOn" type="date" dir="ltr" defaultValue={topic?.startsOn ?? ""} required />
      <Field id={`f-ends${suffix}`} label={t("reports.plannedTo")} name="endsOn" type="date" dir="ltr" defaultValue={topic?.endsOn ?? ""} hint={t("reports.plannedHint")} required />
    </div>
  );

  const move = (kind: "unit" | "topic", id: number, by: "up" | "down", disabled: boolean) => (
    <form action={moveSyllabusAction}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="by" value={by} />
      <button type="submit" disabled={disabled} aria-label={t(by === "up" ? "reports.moveUp" : "reports.moveDown")} className={`${btn.ghost} h-8 px-2`}>
        <Icon name={by === "up" ? "arrow_upward" : "arrow_downward"} size={18} />
      </button>
    </form>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("reports.syllabus")} intro={t("reports.syllabusIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {classes.length === 0 ? <FirstNote text={t("school.classesFirst")} href="/dashboard/school/classes" /> : null}
      {subjects.length === 0 ? <FirstNote text={t("school.subjectsFirst")} href="/dashboard/school/classes" /> : null}
      {grade && subject ? (
        <>
          <nav aria-label={t("reports.grades")} className="flex max-w-[860px] flex-wrap gap-1.5">
            {grades.map((g) => (
              <Link key={g} href={link(g, subject.id)} aria-current={g === grade ? "page" : undefined} className={pill(g === grade)}>
                {g}
              </Link>
            ))}
          </nav>
          <nav aria-label={t("school.subjects")} className="flex max-w-[860px] flex-wrap gap-1.5">
            {subjects.map((s) => (
              <Link key={s.id} href={link(grade, s.id)} aria-current={s.id === subject.id ? "page" : undefined} className={pill(s.id === subject.id)}>
                {s.name}
              </Link>
            ))}
          </nav>
          <Panel id="h-syllabus" title={t("reports.syllabusOf", { subject: subject.name, grade })} intro={t("reports.syllabusOfIntro")}>
            {units.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("reports.noUnits")}</p> : null}
            <ol className="m-0 flex list-none flex-col gap-4 p-0">
              {units.map((unit, ui) => {
                const own = topics.filter((x) => x.unitId === unit.id);
                return (
                  <li key={unit.id} className="flex flex-col gap-2 rounded-xl border border-line p-4" data-unit={unit.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 flex-1 text-[16px] font-bold">{t("reports.unitLine", { n: ui + 1, title: unit.title })}</span>
                      {move("unit", unit.id, "up", ui === 0)}
                      {move("unit", unit.id, "down", ui === units.length - 1)}
                      <form action={deleteSyllabusUnitAction}>
                        <input type="hidden" name="id" value={unit.id} />
                        <ConfirmButton confirm={t("reports.deleteUnit", { title: unit.title })} className={`${btn.danger} h-8 px-3 text-sm`}>
                          {t("school.delete")}
                        </ConfirmButton>
                      </form>
                    </div>
                    {own.length === 0 ? <p className="m-0 text-[14px] text-muted">{t("reports.noTopics")}</p> : null}
                    <ul className="m-0 flex list-none flex-col p-0">
                      {own.map((topic, ti) => (
                        <li key={topic.id} className="flex flex-col gap-1 border-t border-line-soft py-2 first:border-t-0" data-topic={topic.id}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="text-[15px] font-semibold">{topic.title}</span>
                              <span className="text-[13px] text-muted" dir="ltr">
                                {t("reports.plannedDays", { from: topic.startsOn, to: topic.endsOn })}
                              </span>
                            </span>
                            {move("topic", topic.id, "up", ti === 0)}
                            {move("topic", topic.id, "down", ti === own.length - 1)}
                            <form action={deleteSyllabusTopicAction}>
                              <input type="hidden" name="id" value={topic.id} />
                              <ConfirmButton confirm={t("reports.deleteTopic", { title: topic.title })} className={`${btn.danger} h-8 px-3 text-sm`}>
                                {t("school.delete")}
                              </ConfirmButton>
                            </form>
                          </div>
                          <details className="rounded-lg border border-line-soft px-3 py-2">
                            <summary className="cursor-pointer text-sm font-semibold">{t("reports.editTopic")}</summary>
                            <div className="pt-3">
                              <SchoolForm action={saveSyllabusTopicAction} submit={t("school.save")}>
                                <input type="hidden" name="id" value={topic.id} />
                                <input type="hidden" name="unitId" value={unit.id} />
                                {topicFields(`-${topic.id}`, topic)}
                              </SchoolForm>
                            </div>
                          </details>
                        </li>
                      ))}
                    </ul>
                    <AddServiceBox title={t("reports.addTopic")} open={own.length === 0}>
                      <SchoolForm action={saveSyllabusTopicAction} submit={t("school.add")} reset>
                        <input type="hidden" name="unitId" value={unit.id} />
                        {topicFields(`-new-${unit.id}`, null)}
                      </SchoolForm>
                    </AddServiceBox>
                    <details className="rounded-lg border border-line-soft px-3 py-2">
                      <summary className="cursor-pointer text-sm font-semibold">{t("reports.renameUnit")}</summary>
                      <div className="pt-3">
                        <SchoolForm action={saveSyllabusUnitAction} submit={t("school.save")}>
                          <input type="hidden" name="id" value={unit.id} />
                          <input type="hidden" name="subjectId" value={subject.id} />
                          <input type="hidden" name="grade" value={grade} />
                          <Field id={`f-unit-${unit.id}`} label={t("reports.unitTitle")} name="title" defaultValue={unit.title} maxLength={SYLLABUS_LIMITS.title} />
                        </SchoolForm>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ol>
            <AddServiceBox title={t("reports.addUnit")} open={units.length === 0}>
              <SchoolForm action={saveSyllabusUnitAction} submit={t("school.add")} reset>
                <input type="hidden" name="subjectId" value={subject.id} />
                <input type="hidden" name="grade" value={grade} />
                <Field id="f-unit-new" label={t("reports.unitTitle")} name="title" maxLength={SYLLABUS_LIMITS.title} placeholder={t("reports.unitExample")} required />
              </SchoolForm>
            </AddServiceBox>
          </Panel>
          <Panel id="h-syllabus-import" title={t("reports.importTitle")} intro={t("reports.importIntro")}>
            <pre dir="ltr" className="m-0 overflow-x-auto rounded-xl bg-sand p-3 text-[13px] leading-relaxed">
              {SYLLABUS_CSV_EXAMPLE}
            </pre>
            <SchoolForm action={importSyllabusAction} submit={t("school.import")} reset>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="f-syllabus-file" className="text-sm font-semibold">
                  {t("school.csvFile")}
                </label>
                <input id="f-syllabus-file" type="file" name="file" accept=".csv,text/csv" className="text-sm" />
              </div>
            </SchoolForm>
          </Panel>
        </>
      ) : null}
    </div>
  );
}
