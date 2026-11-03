import type { Metadata } from "next";
import { deleteDepartmentAction, deleteFacultyAction, saveDepartmentAction, saveFacultyAction } from "@/app/actions/university";
import { Field } from "@/components/form";
import { btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { UniDepartment, UniFaculty } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { UNI_LIMITS } from "@/lib/university/forms";
import { loadUniSettings } from "@/lib/university/settings";
import { ConfirmButton } from "../../../chat/forms";
import { Choice, SchoolForm } from "../../forms";
import { AddSheet, EditSheet, FirstNote, isSchool, NotSchool, Panel, UNI_BASE, UniHead } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("university.tabStructure") };
}

/** 113.9 The university's faculties and each one's departments. */
export default async function UniversityStructurePage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("university.tabStructure")} t={t} />;
  const store = await getStore();
  const [settings, faculties, departments, plan] = await Promise.all([loadUniSettings(store, app.id), store.listUniFaculties(app.id), store.listUniDepartments(app.id), appPlan(store, license, new Date())]);
  const facultyOptions = faculties.map((f) => ({ value: String(f.id), label: f.name }));

  const unitFields = (suffix: string, unit: UniFaculty | UniDepartment | null, faculty: boolean) => (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field id={`f-name${suffix}`} label={t("university.name")} name="name" defaultValue={unit?.name ?? ""} maxLength={UNI_LIMITS.name} required className="sm:col-span-2" />
      <Field id={`f-code${suffix}`} label={t("university.codeOptional")} name="code" dir="ltr" defaultValue={unit?.code ?? ""} maxLength={UNI_LIMITS.code} />
      {faculty ? null : (
        <Choice id={`f-faculty${suffix}`} name="facultyId" label={t("university.faculty")} options={facultyOptions} defaultValue={unit && "facultyId" in unit ? String(unit.facultyId) : ""} empty={t("university.choose")} />
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <UniHead title={t("university.tabStructure")} intro={t("university.structureIntro")} current="/structure" t={t} app={app} plan={plan} settings={settings} />
      <Panel id="h-faculties" title={t("university.faculties")}>
        {faculties.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("university.noFaculties")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {faculties.map((faculty) => (
            <li key={faculty.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{faculty.name}</span>
                  <span className="text-[13px] text-muted">
                    {[faculty.code, t("university.departmentsCount", { count: departments.filter((d) => d.facultyId === faculty.id).length })].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <form action={deleteFacultyAction}>
                  <input type="hidden" name="id" value={faculty.id} />
                  <ConfirmButton confirm={t("university.deleteFaculty", { name: faculty.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                    {t("university.delete")}
                  </ConfirmButton>
                </form>
              </div>
              <EditSheet title={t("university.edit", { name: faculty.name })}>
                  <SchoolForm action={saveFacultyAction} submit={t("university.save")} sheet>
                    <input type="hidden" name="id" value={faculty.id} />
                    {unitFields(`-f${faculty.id}`, faculty, true)}
                  </SchoolForm>
                </EditSheet>
            </li>
          ))}
        </ul>
        <AddSheet title={t("university.addFaculty")} inline={faculties.length === 0}>
          <SchoolForm action={saveFacultyAction} submit={t("university.add")} reset sheet>
            {unitFields("-f-new", null, true)}
          </SchoolForm>
        </AddSheet>
      </Panel>

      <Panel id="h-departments" title={t("university.departments")}>
        {faculties.length === 0 ? <FirstNote text={t("university.facultiesFirst")} href={`${UNI_BASE}/structure`} /> : null}
        {faculties.map((faculty) => {
          const list = departments.filter((d) => d.facultyId === faculty.id);
          if (!list.length) return null;
          return (
            <div key={faculty.id} className="flex flex-col gap-2">
              <h3 className="m-0 text-[15px] font-bold">{faculty.name}</h3>
              <ul className="m-0 flex list-none flex-col p-0">
                {list.map((department) => (
                  <li key={department.id} className="flex flex-col gap-2 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="text-[15px] font-semibold">{department.name}</span>
                        {department.code ? <span className="text-[13px] text-muted">{department.code}</span> : null}
                      </span>
                      <form action={deleteDepartmentAction}>
                        <input type="hidden" name="id" value={department.id} />
                        <ConfirmButton confirm={t("university.deleteDepartment", { name: department.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                          {t("university.delete")}
                        </ConfirmButton>
                      </form>
                    </div>
                    <EditSheet title={t("university.edit", { name: department.name })}>
                        <SchoolForm action={saveDepartmentAction} submit={t("university.save")} sheet>
                          <input type="hidden" name="id" value={department.id} />
                          {unitFields(`-d${department.id}`, department, false)}
                        </SchoolForm>
                      </EditSheet>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {faculties.length ? (
          <AddSheet title={t("university.addDepartment")} inline={departments.length === 0}>
            <SchoolForm action={saveDepartmentAction} submit={t("university.add")} reset sheet>
              {unitFields("-d-new", null, false)}
            </SchoolForm>
          </AddSheet>
        ) : null}
      </Panel>
    </div>
  );
}
