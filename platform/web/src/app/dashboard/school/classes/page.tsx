import type { Metadata } from "next";
import { deleteSchoolClassAction, deleteSchoolSubjectAction, saveSchoolClassAction, saveSchoolSubjectAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { EmptyState, btn } from "@/components/ui";
import { LinkCards, PageGroup, ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList, Sheet, SheetButton } from "@/components/page-kit-client";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { classFormValues, SCHOOL_LIMITS } from "@/lib/school/forms";
import { ConfirmButton } from "../../chat/forms";
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
  const studentsIn = (id: number) => students.filter((s) => s.active && s.classId === id).length;
  const grades = [...new Set(classes.map((c) => c.grade).filter((g): g is string => !!g))];
  const has = classes.length > 0;

  const classFields = (suffix: string, values: Record<string, string>) => (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field id={`f-name${suffix}`} label={t("school.className")} name="name" defaultValue={values.name} maxLength={SCHOOL_LIMITS.className} placeholder={t("school.classNameExample")} required />
      <Field id={`f-grade${suffix}`} label={t("school.grade")} name="grade" defaultValue={values.grade} maxLength={SCHOOL_LIMITS.grade} hint={t("school.gradeHint")} />
      <Choice id={`f-teacher${suffix}`} name="homeroomTeacherId" label={t("school.classTeacher")} options={teacherOptions} defaultValue={values.homeroomTeacherId} empty={t("school.none")} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, the class pages, the classes, then the subjects. */}
      <PageHead
        title={t("school.classes")}
        intro={t("school.classesIntro")}
        actions={
          has ? (
            <SheetButton target="new-class" icon="add">
              {t("school.addClass")}
            </SheetButton>
          ) : null
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />

      {has ? (
        <>
          <StatRow label={t("school.classes")}>
            <Stat icon="school" label={t("school.classes")} value={classes.length} hint={grades.length ? t("school.statGrades", { count: grades.length }) : undefined} />
            <Stat icon="groups" tone="accent" label={t("school.students")} value={students.filter((s) => s.active && s.classId !== null).length} href="/dashboard/school/people" />
            <Stat icon="menu_book" label={t("school.subjects")} value={subjects.length} />
            <Stat icon="person" tone={classes.every((c) => c.homeroomTeacherId) ? "success" : "warn"} label={t("school.statWithTeacher")} value={classes.filter((c) => c.homeroomTeacherId).length} />
          </StatRow>
          <LinkCards
            label={t("school.classPages")}
            items={[
              { href: "/dashboard/school/timetable", icon: "calendar_month", label: t("school.timetable") },
              { href: "/dashboard/school/attendance", icon: "task_alt", label: t("school.attendance") },
              { href: "/dashboard/school/homework", icon: "assignment", label: t("school.homework") },
              { href: "/dashboard/school/grades", icon: "quiz", label: t("school.grades") },
            ]}
          />
          <Panel id="h-classes" title={t("school.classCount", { count: classes.length })} flush>
            <FilterList
              allLabel={t("common.all")}
              searchLabel={t("school.searchClasses")}
              noMatch={t("school.noClassMatch")}
              filters={grades.map((g) => ({ value: g, label: g }))}
              items={classes.map((klass, i) => ({
                id: klass.id,
                text: [klass.name, klass.grade, klass.homeroomTeacherId ? teacherName.get(klass.homeroomTeacherId) : null].filter(Boolean).join(" "),
                group: klass.grade ?? undefined,
                node: (
                  <ItemRow
                    media={<Thumb icon="school" shape="square" tint={i} />}
                    title={klass.name}
                    meta={[klass.grade, t("school.studentCount", { count: studentsIn(klass.id) })].filter(Boolean).join(" · ")}
                    extra={klass.homeroomTeacherId ? <span>{t("school.classTeacherIs", { name: teacherName.get(klass.homeroomTeacherId) ?? "—" })}</span> : null}
                    actions={
                      <>
                        <SheetButton target={`class-${klass.id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
                          {t("school.edit")}
                        </SheetButton>
                        <form action={deleteSchoolClassAction}>
                          <input type="hidden" name="id" value={klass.id} />
                          <ConfirmButton confirm={t("school.deleteClass", { name: klass.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                            {t("school.delete")}
                          </ConfirmButton>
                        </form>
                        <Sheet id={`class-${klass.id}`} title={t("school.editClass", { name: klass.name })}>
                          <SchoolForm action={saveSchoolClassAction} submit={t("school.save")} sheet>
                            <input type="hidden" name="id" value={klass.id} />
                            {classFields(`-${klass.id}`, classFormValues(klass))}
                          </SchoolForm>
                        </Sheet>
                      </>
                    }
                  />
                ),
              }))}
            />
          </Panel>
        </>
      ) : null}

      {/* One place in the page either way, so the form that adds the first class keeps its message. */}
      <Sheet id="new-class" inline={!has} title={t("school.addClass")} description={has ? t("school.addClassHint") : t("school.noClasses")}>
        <SchoolForm action={saveSchoolClassAction} submit={t("school.add")} reset sheet>
          {classFields("-new", classFormValues(null))}
        </SchoolForm>
      </Sheet>

      <PageGroup title={t("school.groupSubjects")}>
        <Panel id="h-subjects" title={t("school.subjects")} intro={t("school.subjectsIntro")}>
          {subjects.length === 0 ? (
            <EmptyState icon="menu_book" title={t("school.noSubjects")} />
          ) : (
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
          )}
          <div className="flex flex-col gap-3 rounded-xl bg-sand p-4">
            <p className="m-0 text-[15px] font-bold">{t("school.addSubject")}</p>
            <SchoolForm action={saveSchoolSubjectAction} submit={t("school.add")} reset className="sm:flex-row sm:items-end">
              <Field id="f-subject-new" label={t("school.subjectName")} name="name" maxLength={SCHOOL_LIMITS.subjectName} placeholder={t("school.subjectExample")} required className="flex-1" />
            </SchoolForm>
          </div>
        </Panel>
      </PageGroup>
    </div>
  );
}
