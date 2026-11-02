import type { Metadata } from "next";
import Link from "next/link";
import { publishSectionAction, saveSectionGradesAction } from "@/app/actions/university";
import { Badge } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { uniData } from "@/lib/university/records";
import { holdsSeat } from "@/lib/university/rules";
import { currentTerm } from "@/lib/university/settings";
import { SchoolForm } from "../../forms";
import { isSchool, NotSchool, Panel, TermTabs, UNI_BASE, UniHead } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("university.tabResults") };
}

/** 113.9 A term's sections and their grades: given here or by the lecturer in the app, then published to the students. */
export default async function UniversityResultsPage({ searchParams }: { searchParams: Promise<{ term?: string; section?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("university.tabResults")} t={t} />;
  const params = await searchParams;
  const store = await getStore();
  const [data, people, school, plan] = await Promise.all([uniData(store, app.id), store.listSchoolPeople(app.id), store.getSchoolSettings(app.id), appPlan(store, license, new Date())]);
  const today = schoolToday(schoolSettingsOf(school, app), new Date());
  const term = data.termById.get(Number(params.term)) ?? currentTerm(data.terms, data.settings, today);
  const [sections, enrolments] = term ? await Promise.all([store.listUniSections(app.id, { termId: term.id }), store.listUniEnrolments(app.id, { termId: term.id })]) : [[], []];
  const name = new Map(people.map((p) => [p.id, p]));
  const label = (courseId: number, code: string) => `${data.courses.get(courseId)?.code ?? "?"}-${code}`;
  const ordered = [...sections].sort((a, b) => label(a.courseId, a.code).localeCompare(label(b.courseId, b.code)));
  const section = ordered.find((s) => s.id === Number(params.section)) ?? null;
  const students = section
    ? enrolments
        .filter((e) => e.sectionId === section.id && e.status === "enrolled")
        .map((e) => ({ e, p: name.get(e.studentId) }))
        .filter((r) => r.p !== undefined)
        .sort((a, b) => a.p!.name.localeCompare(b.p!.name))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <UniHead title={t("university.tabResults")} intro={t("university.resultsIntro")} current="/results" t={t} app={app} plan={plan} settings={data.settings} />
      <TermTabs terms={data.terms} current={term?.id ?? null} base={`${UNI_BASE}/results`} label={t("university.terms")} />
      {term ? (
        <Panel id="h-result-sections" title={t("university.sectionsOf", { name: term.name })}>
          {ordered.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("university.noSections")}</p> : null}
          <ul className="m-0 flex list-none flex-col p-0">
            {ordered.map((s) => {
              const rows = enrolments.filter((e) => e.sectionId === s.id && holdsSeat(e));
              const graded = rows.filter((e) => e.grade !== null).length;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-2.5 first:border-t-0 first:pt-0">
                  <Link href={`${UNI_BASE}/results?term=${term.id}&section=${s.id}`} aria-current={s.id === section?.id ? "page" : undefined} className="min-w-0 flex-1 text-[15px] font-semibold">
                    <span dir="ltr">{label(s.courseId, s.code)}</span> · {data.courses.get(s.courseId)?.title}
                  </Link>
                  <span className="text-[13px] text-muted">{t("university.gradedOf", { graded, count: rows.length })}</span>
                  {s.resultsPublishedAt ? <Badge tone="success">{t("university.published")}</Badge> : null}
                </li>
              );
            })}
          </ul>
        </Panel>
      ) : (
        <p className="m-0 text-[15px] text-muted">{t("university.noTerms")}</p>
      )}
      {section ? (
        <Panel id="h-grades" title={t("university.gradesOf", { name: label(section.courseId, section.code) })} intro={t("university.gradesIntro", { letters: data.settings.scale.map((g) => g.letter).join(" ") })}>
          {students.length === 0 ? (
            <p className="m-0 text-[15px] text-muted">{t("university.noEnrolled")}</p>
          ) : (
            <SchoolForm action={saveSectionGradesAction} submit={t("university.saveGrades")}>
              <input type="hidden" name="sectionId" value={section.id} />
              <table className="w-full border-collapse text-[15px]">
                <thead>
                  <tr className="text-start text-[13px] text-muted">
                    <th className="py-2 text-start font-semibold">{t("university.student")}</th>
                    <th className="w-[120px] py-2 text-start font-semibold">{t("university.markPercent")}</th>
                    <th className="w-[120px] py-2 text-start font-semibold">{t("university.grade")}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(({ e, p }) => (
                    <tr key={e.id} className="border-t border-line-soft">
                      <td className="py-2">
                        {p!.name}
                        {p!.code ? <span className="text-[13px] text-muted"> · {p!.code}</span> : null}
                      </td>
                      <td className="py-2">
                        <label htmlFor={`f-mark-${p!.id}`} className="sr-only">
                          {t("university.markFor", { name: p!.name })}
                        </label>
                        <input id={`f-mark-${p!.id}`} name={`mark_${p!.id}`} inputMode="decimal" dir="ltr" defaultValue={e.mark ?? ""} className="input input-sm w-[100px]" />
                      </td>
                      <td className="py-2">
                        <label htmlFor={`f-grade-${p!.id}`} className="sr-only">
                          {t("university.gradeFor", { name: p!.name })}
                        </label>
                        <select id={`f-grade-${p!.id}`} name={`grade_${p!.id}`} defaultValue={e.grade ?? ""} className="input input-sm w-[100px]">
                          <option value="">{t("university.fromMark")}</option>
                          {data.settings.scale.map((g) => (
                            <option key={g.letter} value={g.letter}>
                              {g.letter}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SchoolForm>
          )}
          <SchoolForm action={publishSectionAction} submit={section.resultsPublishedAt ? t("university.publishAgain") : t("university.publish")}>
            <input type="hidden" name="sectionId" value={section.id} />
            <p className="m-0 text-[14px] text-muted">{section.resultsPublishedAt ? t("university.publishedOn", { date: section.resultsPublishedAt.toISOString().slice(0, 10) }) : t("university.publishHint")}</p>
          </SchoolForm>
        </Panel>
      ) : null}
    </div>
  );
}
