import type { Metadata } from "next";
import { deleteProgramAction, saveProgramAction } from "@/app/actions/university";
import { Field } from "@/components/form";
import { btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { UniProgram } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { planText, UNI_LIMITS } from "@/lib/university/forms";
import { loadUniSettings } from "@/lib/university/settings";
import { ConfirmButton } from "../../../chat/forms";
import { Choice, SchoolForm } from "../../forms";
import { AddSheet, credits, EditSheet, FirstNote, isSchool, NotSchool, Panel, UNI_BASE, UniHead } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("university.tabPrograms") };
}

/** 113.9 The programs: degree, credits to graduate, years, credits per term and the study plan. */
export default async function UniversityProgramsPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("university.tabPrograms")} t={t} />;
  const store = await getStore();
  const [settings, faculties, departments, programs, courses, students, plan] = await Promise.all([
    loadUniSettings(store, app.id),
    store.listUniFaculties(app.id),
    store.listUniDepartments(app.id),
    store.listUniPrograms(app.id),
    store.listUniCourses(app.id),
    store.listUniStudents(app.id),
    appPlan(store, license, new Date()),
  ]);
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const facultyName = new Map(faculties.map((f) => [f.id, f.name]));
  const departmentOptions = departments.map((d) => ({ value: String(d.id), label: `${d.name} · ${facultyName.get(d.facultyId) ?? ""}` }));

  const fields = (suffix: string, program: UniProgram | null) => (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id={`f-name${suffix}`} label={t("university.programName")} name="name" defaultValue={program?.name ?? ""} maxLength={UNI_LIMITS.name} required className="sm:col-span-2" />
        <Field id={`f-code${suffix}`} label={t("university.codeOptional")} name="code" dir="ltr" defaultValue={program?.code ?? ""} maxLength={UNI_LIMITS.code} />
        <Choice id={`f-dept${suffix}`} name="departmentId" label={t("university.department")} options={departmentOptions} defaultValue={program ? String(program.departmentId) : ""} empty={t("university.choose")} />
        <Field id={`f-degree${suffix}`} label={t("university.degree")} name="degree" defaultValue={program?.degree ?? ""} maxLength={UNI_LIMITS.degree} hint={t("university.degreeHint")} required />
        <Field id={`f-years${suffix}`} label={t("university.years")} name="years" type="number" min={1} max={10} dir="ltr" defaultValue={program ? String(program.years) : "4"} required />
        <Field id={`f-credits${suffix}`} label={t("university.creditsRequired")} name="creditsRequired" inputMode="decimal" dir="ltr" defaultValue={program ? String(program.creditsRequired) : ""} required />
        <Field id={`f-min${suffix}`} label={t("university.minTermCredits")} name="minTermCredits" inputMode="decimal" dir="ltr" defaultValue={program ? String(program.minTermCredits) : "12"} required />
        <Field id={`f-max${suffix}`} label={t("university.maxTermCredits")} name="maxTermCredits" inputMode="decimal" dir="ltr" defaultValue={program ? String(program.maxTermCredits) : "18"} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`f-plan${suffix}`} className="text-sm font-semibold">
          {t("university.studyPlan")}
        </label>
        <textarea id={`f-plan${suffix}`} name="plan" rows={6} dir="ltr" defaultValue={program ? planText(program.plan, courseById) : ""} className="input min-h-28 py-3 font-mono text-[14px]" />
        <span className="text-[13px] text-muted">{t("university.studyPlanHint")}</span>
      </div>
    </>
  );

  return (
    <div className="flex flex-col gap-6">
      <UniHead title={t("university.tabPrograms")} intro={t("university.programsIntro")} current="/programs" t={t} app={app} plan={plan} settings={settings} />
      {departments.length === 0 ? <FirstNote text={t("university.departmentsFirst")} href={`${UNI_BASE}/structure`} /> : null}
      <Panel id="h-programs" title={t("university.programs")}>
        {programs.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("university.noPrograms")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {programs.map((program) => {
            const department = departments.find((d) => d.id === program.departmentId);
            return (
              <li key={program.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-bold">
                      {program.degree} {program.name}
                    </span>
                    <span className="text-[13px] text-muted">
                      {[
                        department?.name,
                        t("university.programFacts", { credits: credits(program.creditsRequired), years: program.years, min: credits(program.minTermCredits), max: credits(program.maxTermCredits) }),
                        t("university.planCourses", { count: program.plan.length }),
                        t("university.studentsCount", { count: students.filter((s) => s.programId === program.id).length }),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  <form action={deleteProgramAction}>
                    <input type="hidden" name="id" value={program.id} />
                    <ConfirmButton confirm={t("university.deleteProgram", { name: program.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                      {t("university.delete")}
                    </ConfirmButton>
                  </form>
                </div>
                <EditSheet title={t("university.edit", { name: program.name })}>
                    <SchoolForm action={saveProgramAction} submit={t("university.save")} sheet>
                      <input type="hidden" name="id" value={program.id} />
                      {fields(`-${program.id}`, program)}
                    </SchoolForm>
                  </EditSheet>
              </li>
            );
          })}
        </ul>
        {departments.length ? (
          <AddSheet title={t("university.addProgram")} inline={programs.length === 0}>
            <SchoolForm action={saveProgramAction} submit={t("university.add")} reset sheet>
              {fields("-new", null)}
            </SchoolForm>
          </AddSheet>
        ) : null}
      </Panel>
    </div>
  );
}
