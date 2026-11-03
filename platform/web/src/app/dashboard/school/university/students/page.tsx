import type { Metadata } from "next";
import { Pager, SearchForm } from "@/components/page-kit-c";
import { importUniStudentsAction, saveUniStudentAction } from "@/app/actions/university";
import { Field } from "@/components/form";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { STUDENTS_CSV_EXAMPLE, UNI_LIMITS } from "@/lib/university/forms";
import { loadUniSettings } from "@/lib/university/settings";
import { Choice, SchoolForm } from "../../forms";
import { EditSheet, FirstNote, isSchool, NotSchool, Panel, UNI_BASE, UniHead } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("university.tabStudents") };
}

const PER_PAGE = 50;

/** 113.9 Each student's program, advisor (one of the lecturers) and the year they started; one by one or from a sheet. */
export default async function UniversityStudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("university.tabStudents")} t={t} />;
  const params = await searchParams;
  const store = await getStore();
  const [settings, students, teachers, programs, rows, plan] = await Promise.all([
    loadUniSettings(store, app.id),
    store.listSchoolPeople(app.id, { role: "student" }),
    store.listSchoolPeople(app.id, { role: "teacher" }),
    store.listUniPrograms(app.id),
    store.listUniStudents(app.id),
    appPlan(store, license, new Date()),
  ]);
  const q = (params.q ?? "").trim().toLowerCase();
  const shown = students.filter((s) => !q || s.name.toLowerCase().includes(q) || (s.code ?? "").toLowerCase().includes(q));
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const list = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const rowOf = new Map(rows.map((r) => [r.studentId, r]));
  const programOptions = programs.map((p) => ({ value: String(p.id), label: `${p.degree} ${p.name}` }));
  const advisorOptions = teachers.filter((p) => p.active).map((p) => ({ value: String(p.id), label: p.name }));
  const programName = new Map(programs.map((p) => [p.id, `${p.degree} ${p.name}`]));
  const teacherName = new Map(teachers.map((p) => [p.id, p.name]));
  const link = (p: number) => `${UNI_BASE}/students?${q ? `q=${encodeURIComponent(q)}&` : ""}page=${p}`;

  return (
    <div className="flex flex-col gap-6">
      <UniHead title={t("university.tabStudents")} intro={t("university.studentsIntro")} current="/students" t={t} app={app} plan={plan} settings={settings} />
      {students.length === 0 ? <FirstNote text={t("university.peopleFirst")} href="/dashboard/school/people" /> : null}
      {programs.length === 0 ? <FirstNote text={t("university.programsFirst")} href={`${UNI_BASE}/programs`} /> : null}
      <div className="rounded-2xl border border-line bg-white px-5 py-3 sm:px-6">
        <SearchForm label={t("university.search")} placeholder={t("university.searchStudents")} defaultValue={params.q ?? ""} button={t("university.search")} />
      </div>
      <Panel id="h-uni-students" title={t("university.studentsCount", { count: students.length })}>
        {list.length === 0 && students.length ? <p className="m-0 text-[15px] text-muted">{t("university.noMatch")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {list.map((student) => {
            const row = rowOf.get(student.id);
            return (
              <li key={student.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{student.name}</span>
                  <span className="text-[13px] text-muted">
                    {[
                      student.code ? t("university.codeIs", { code: student.code }) : null,
                      row?.programId ? programName.get(row.programId) : t("university.noProgram"),
                      row?.advisorId ? t("university.advisorIs", { name: teacherName.get(row.advisorId) ?? "" }) : t("university.noAdvisor"),
                      row?.startYear ? t("university.startedIn", { year: row.startYear }) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <EditSheet title={t("university.edit", { name: student.name })}>
                    <SchoolForm action={saveUniStudentAction} submit={t("university.save")} sheet>
                      <input type="hidden" name="studentId" value={student.id} />
                      <div className="grid gap-4 sm:grid-cols-3">
                        <Choice id={`f-program-${student.id}`} name="programId" label={t("university.program")} options={programOptions} defaultValue={row?.programId ? String(row.programId) : ""} empty={t("university.none")} />
                        <Choice id={`f-advisor-${student.id}`} name="advisorId" label={t("university.advisor")} options={advisorOptions} defaultValue={row?.advisorId ? String(row.advisorId) : ""} empty={t("university.none")} />
                        <Field id={`f-start-${student.id}`} label={t("university.startYear")} name="startYear" dir="ltr" defaultValue={row?.startYear ?? ""} maxLength={UNI_LIMITS.year} placeholder="2026/2027" />
                      </div>
                    </SchoolForm>
                  </EditSheet>
              </li>
            );
          })}
        </ul>
        {pages > 1 ? (
          <Pager
            label={t("university.pages")}
            prev={page > 1 ? { href: link(page - 1), label: t("university.previous") } : null}
            next={page < pages ? { href: link(page + 1), label: t("university.next") } : null}
            text={t("university.pageOf", { page, pages })}
          />
        ) : null}
      </Panel>
      <Panel id="h-import-students" title={t("university.importStudents")} intro={t("university.importStudentsIntro")}>
        <pre dir="ltr" className="m-0 overflow-x-auto rounded-xl bg-sand p-3 text-[13px] leading-relaxed">
          {STUDENTS_CSV_EXAMPLE}
        </pre>
        <SchoolForm action={importUniStudentsAction} submit={t("university.import")} reset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-students-file" className="text-sm font-semibold">
              {t("university.csvFile")}
            </label>
            <input id="f-students-file" type="file" name="file" accept=".csv,text/csv" className="text-sm" />
          </div>
        </SchoolForm>
      </Panel>
    </div>
  );
}
