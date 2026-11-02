import type { Metadata } from "next";
import { deleteCourseAction, importCoursesAction, saveCourseAction } from "@/app/actions/university";
import { Field } from "@/components/form";
import { btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { UniCourse } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { COURSES_CSV_EXAMPLE, UNI_LIMITS } from "@/lib/university/forms";
import { loadUniSettings } from "@/lib/university/settings";
import { ConfirmButton } from "../../../chat/forms";
import { AddServiceBox } from "../../../delivery/forms";
import { Choice, SchoolForm } from "../../forms";
import { credits, isSchool, NotSchool, Panel, UniHead } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("university.tabCourses") };
}

/** 113.9 The university's courses: code, title, credits, department and prerequisites; one by one or from a sheet. */
export default async function UniversityCoursesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("university.tabCourses")} t={t} />;
  const store = await getStore();
  const [settings, departments, courses, plan] = await Promise.all([loadUniSettings(store, app.id), store.listUniDepartments(app.id), store.listUniCourses(app.id), appPlan(store, license, new Date())]);
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const shown = courses.filter((c) => !q || c.code.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)).slice(0, 300);
  const departmentName = new Map(departments.map((d) => [d.id, d.name]));
  const departmentOptions = departments.map((d) => ({ value: String(d.id), label: d.name }));

  const fields = (suffix: string, course: UniCourse | null) => (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field id={`f-code${suffix}`} label={t("university.courseCode")} name="code" dir="ltr" defaultValue={course?.code ?? ""} maxLength={UNI_LIMITS.code} required />
      <Field id={`f-title${suffix}`} label={t("university.courseTitle")} name="title" defaultValue={course?.title ?? ""} maxLength={UNI_LIMITS.title} required className="sm:col-span-2" />
      <Field id={`f-credits${suffix}`} label={t("university.credits")} name="credits" inputMode="decimal" dir="ltr" defaultValue={course ? String(course.credits) : "3"} required />
      <Choice id={`f-dept${suffix}`} name="departmentId" label={t("university.department")} options={departmentOptions} defaultValue={course?.departmentId ? String(course.departmentId) : ""} empty={t("university.none")} />
      <Field id={`f-pre${suffix}`} label={t("university.prerequisites")} name="prerequisites" dir="ltr" defaultValue={course?.prerequisites.join(", ") ?? ""} hint={t("university.prerequisitesHint")} />
      <div className="flex flex-col gap-1.5 sm:col-span-3">
        <label htmlFor={`f-desc${suffix}`} className="text-sm font-semibold">
          {t("university.descriptionOptional")}
        </label>
        <textarea id={`f-desc${suffix}`} name="description" rows={2} maxLength={UNI_LIMITS.description} defaultValue={course?.description ?? ""} className="input min-h-16 py-3" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <UniHead title={t("university.tabCourses")} intro={t("university.coursesIntro")} current="/courses" t={t} app={app} plan={plan} settings={settings} />
      <form method="get" className="flex items-end gap-2">
        <label htmlFor="f-q" className="sr-only">
          {t("university.search")}
        </label>
        <input id="f-q" name="q" type="search" defaultValue={q} placeholder={t("university.searchCourses")} className="input input-sm w-[240px]" />
        <button type="submit" className={`${btn.secondary} h-10`}>
          {t("university.search")}
        </button>
      </form>
      <Panel id="h-courses" title={t("university.coursesCount", { count: courses.length })}>
        {shown.length === 0 ? <p className="m-0 text-[15px] text-muted">{q ? t("university.noMatch") : t("university.noCourses")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {shown.map((course) => (
            <li key={course.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                <span dir="ltr" className="w-[90px] shrink-0 text-[14px] font-bold">
                  {course.code}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{course.title}</span>
                  <span className="text-[13px] text-muted">
                    {[
                      t("university.creditsIs", { credits: credits(course.credits) }),
                      course.departmentId ? departmentName.get(course.departmentId) : null,
                      course.prerequisites.length ? t("university.prerequisitesAre", { codes: course.prerequisites.join(", ") }) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <form action={deleteCourseAction}>
                  <input type="hidden" name="id" value={course.id} />
                  <ConfirmButton confirm={t("university.deleteCourse", { code: course.code })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                    {t("university.delete")}
                  </ConfirmButton>
                </form>
              </div>
              <details className="rounded-xl border border-line p-4">
                <summary className="cursor-pointer text-[15px] font-semibold">{t("university.edit", { name: course.code })}</summary>
                <div className="pt-3">
                  <SchoolForm action={saveCourseAction} submit={t("university.save")}>
                    <input type="hidden" name="id" value={course.id} />
                    {fields(`-${course.id}`, course)}
                  </SchoolForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <AddServiceBox title={t("university.addCourse")} open={courses.length === 0}>
          <SchoolForm action={saveCourseAction} submit={t("university.add")} reset>
            {fields("-new", null)}
          </SchoolForm>
        </AddServiceBox>
      </Panel>
      <Panel id="h-import-courses" title={t("university.importCourses")} intro={t("university.importCoursesIntro")}>
        <pre dir="ltr" className="m-0 overflow-x-auto rounded-xl bg-sand p-3 text-[13px] leading-relaxed">
          {COURSES_CSV_EXAMPLE}
        </pre>
        <SchoolForm action={importCoursesAction} submit={t("university.import")} reset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-courses-file" className="text-sm font-semibold">
              {t("university.csvFile")}
            </label>
            <input id="f-courses-file" type="file" name="file" accept=".csv,text/csv" className="text-sm" />
          </div>
        </SchoolForm>
      </Panel>
    </div>
  );
}
