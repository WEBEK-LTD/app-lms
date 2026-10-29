import type { Metadata } from "next";
import { deleteSchoolClassAction, deleteSchoolSubjectAction, saveSchoolClassAction, saveSchoolSubjectAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { classFormValues, SCHOOL_LIMITS } from "@/lib/school/forms";
import { ConfirmButton } from "../../chat/forms";
import { AddServiceBox } from "../../delivery/forms";
import { Choice, SchoolForm } from "../forms";
import { isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.classes") };
}

/** 105.4 The school's classes (each with its own teacher) and the subjects it teaches. */
export default async function SchoolClassesPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.classes")} t={t} />;
  const store = await getStore();
  const [classes, subjects, teachers, students, plan] = await Promise.all([
    store.listSchoolClasses(app.id),
    store.listSchoolSubjects(app.id),
    store.listSchoolPeople(app.id, { role: "teacher" }),
    store.listSchoolPeople(app.id, { role: "student" }),
    appPlan(store, license, new Date()),
  ]);
  const teacherOptions = teachers.filter((p) => p.active).map((p) => ({ value: String(p.id), label: p.name }));
  const teacherName = new Map(teachers.map((p) => [p.id, p.name]));

  const classFields = (suffix: string, values: Record<string, string>) => (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field id={`f-name${suffix}`} label={t("school.className")} name="name" defaultValue={values.name} maxLength={SCHOOL_LIMITS.className} placeholder={t("school.classNameExample")} required />
      <Field id={`f-grade${suffix}`} label={t("school.grade")} name="grade" defaultValue={values.grade} maxLength={SCHOOL_LIMITS.grade} hint={t("school.gradeHint")} />
      <Choice id={`f-teacher${suffix}`} name="homeroomTeacherId" label={t("school.classTeacher")} options={teacherOptions} defaultValue={values.homeroomTeacherId} empty={t("school.none")} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("school.classes")} intro={t("school.classesIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />

      <Panel id="h-classes" title={t("school.classes")}>
        {classes.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("school.noClasses")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {classes.map((klass) => (
            <li key={klass.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{klass.name}</span>
                  <span className="text-[13px] text-muted">
                    {[
                      klass.grade,
                      t("school.studentCount", { count: students.filter((s) => s.active && s.classId === klass.id).length }),
                      klass.homeroomTeacherId ? t("school.classTeacherIs", { name: teacherName.get(klass.homeroomTeacherId) ?? "—" }) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <form action={deleteSchoolClassAction}>
                  <input type="hidden" name="id" value={klass.id} />
                  <ConfirmButton confirm={t("school.deleteClass", { name: klass.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                    {t("school.delete")}
                  </ConfirmButton>
                </form>
              </div>
              <details className="rounded-xl border border-line p-4">
                <summary className="cursor-pointer text-[15px] font-semibold">{t("school.editClass", { name: klass.name })}</summary>
                <div className="pt-3">
                  <SchoolForm action={saveSchoolClassAction} submit={t("school.save")}>
                    <input type="hidden" name="id" value={klass.id} />
                    {classFields(`-${klass.id}`, classFormValues(klass))}
                  </SchoolForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <AddServiceBox title={t("school.addClass")} open={classes.length === 0}>
          <SchoolForm action={saveSchoolClassAction} submit={t("school.add")} reset>
            {classFields("-new", classFormValues(null))}
          </SchoolForm>
        </AddServiceBox>
      </Panel>

      <Panel id="h-subjects" title={t("school.subjects")} intro={t("school.subjectsIntro")}>
        {subjects.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("school.noSubjects")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {subjects.map((subject) => (
            <li key={subject.id} className="flex flex-wrap items-end gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
              <SchoolForm action={saveSchoolSubjectAction} submit={t("school.rename")} className="min-w-0 flex-1 sm:flex-row sm:items-end">
                <input type="hidden" name="id" value={subject.id} />
                <Field id={`f-subject-${subject.id}`} label={t("school.subjectName")} name="name" defaultValue={subject.name} maxLength={SCHOOL_LIMITS.subjectName} className="flex-1" />
              </SchoolForm>
              <form action={deleteSchoolSubjectAction} className="pb-0.5">
                <input type="hidden" name="id" value={subject.id} />
                <ConfirmButton confirm={t("school.deleteSubject", { name: subject.name })} className={`${btn.danger} h-10 px-3.5 text-sm`}>
                  {t("school.delete")}
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
        <AddServiceBox title={t("school.addSubject")} open={subjects.length === 0}>
          <SchoolForm action={saveSchoolSubjectAction} submit={t("school.add")} reset>
            <Field id="f-subject-new" label={t("school.subjectName")} name="name" maxLength={SCHOOL_LIMITS.subjectName} placeholder={t("school.subjectExample")} required />
          </SchoolForm>
        </AddServiceBox>
      </Panel>
    </div>
  );
}
