import type { Metadata } from "next";
import Link from "next/link";
import { btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { hmacSha256 } from "@/lib/crypto/tokens";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { signingSecret } from "@/lib/env";
import { academicRecord, termsOf, uniData } from "@/lib/university/records";
import { gpaOf, gradeOf } from "@/lib/university/rules";
import { transcriptCode } from "@/lib/university/transcript";
import { credits, gpa, isSchool, NotSchool, Panel, UNI_BASE, UniHead } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("university.tabTranscripts") };
}

/** 113.9 A student's transcript: each term's published grades and GPA, the cumulative GPA, and its PDF. */
export default async function UniversityTranscriptsPage({ searchParams }: { searchParams: Promise<{ q?: string; student?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t, lang } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("university.tabTranscripts")} t={t} />;
  const params = await searchParams;
  const store = await getStore();
  const [data, students, plan] = await Promise.all([uniData(store, app.id), store.listSchoolPeople(app.id, { role: "student" }), appPlan(store, license, new Date())]);
  const q = (params.q ?? "").trim().toLowerCase();
  const found = q ? students.filter((s) => s.name.toLowerCase().includes(q) || (s.code ?? "").toLowerCase().includes(q)).slice(0, 50) : [];
  const chosen = students.find((s) => s.id === Number(params.student)) ?? null;
  const record = chosen ? await academicRecord(store, data, chosen) : null;
  const pdf = chosen ? `/a/${app.id}/transcript/${transcriptCode(hmacSha256(signingSecret(), "hosted-api"), app.id, chosen.id, new Date())}/pdf?lang=${lang}` : null;

  return (
    <div className="flex flex-col gap-6">
      <UniHead title={t("university.tabTranscripts")} intro={t("university.transcriptsIntro")} current="/transcripts" t={t} app={app} plan={plan} settings={data.settings} />
      <form method="get" className="flex items-end gap-2">
        <label htmlFor="f-q" className="sr-only">
          {t("university.search")}
        </label>
        <input id="f-q" name="q" type="search" defaultValue={params.q ?? ""} placeholder={t("university.searchStudents")} className="input input-sm w-[240px]" />
        <button type="submit" className={`${btn.secondary} h-10`}>
          {t("university.search")}
        </button>
      </form>
      {q ? (
        <Panel id="h-found" title={t("university.found", { count: found.length })}>
          <ul className="m-0 flex list-none flex-col p-0">
            {found.map((s) => (
              <li key={s.id} className="border-t border-line-soft py-2 first:border-t-0 first:pt-0">
                <Link href={`${UNI_BASE}/transcripts?student=${s.id}`} className="text-[15px] font-semibold">
                  {s.name}
                  {s.code ? ` · ${s.code}` : ""}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      {chosen && record ? (
        <Panel id="h-transcript" title={t("university.transcriptOf", { name: chosen.name })}>
          <p className="m-0 text-[15px]" data-transcript-gpa="">
            {t("university.cumulative", { gpa: gpa(record.standing.gpa), earned: credits(record.standing.creditsEarned), required: record.program ? credits(record.program.creditsRequired) : "—" })}
          </p>
          {record.program ? <p className="m-0 text-[14px] text-muted">{`${record.program.degree} ${record.program.name}`}</p> : null}
          {termsOf(record, data).length === 0 ? <p className="m-0 text-[15px] text-muted">{t("university.noResults")}</p> : null}
          {termsOf(record, data).map(({ term, rows }) => (
            <div key={term.id} className="flex flex-col gap-2">
              <h3 className="m-0 text-[15px] font-bold">
                {term.name} · {term.academicYear} · {t("university.termGpa", { gpa: gpa(gpaOf(rows, data.settings.scale)) })}
              </h3>
              <table className="w-full border-collapse text-[14px]">
                <thead>
                  <tr className="text-[13px] text-muted">
                    <th className="py-1.5 text-start font-semibold">{t("university.course")}</th>
                    <th className="w-[80px] py-1.5 text-start font-semibold">{t("university.credits")}</th>
                    <th className="w-[80px] py-1.5 text-start font-semibold">{t("university.grade")}</th>
                    <th className="w-[80px] py-1.5 text-start font-semibold">{t("university.points")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const grade = gradeOf(data.settings.scale, row.grade);
                    return (
                      <tr key={`${row.sectionId}`} className="border-t border-line-soft">
                        <td className="py-1.5">
                          <span dir="ltr" className="font-semibold">
                            {row.code}
                          </span>{" "}
                          {row.title}
                        </td>
                        <td className="py-1.5">{credits(row.credits)}</td>
                        <td className="py-1.5 font-bold">{row.grade}</td>
                        <td className="py-1.5">{grade?.gpa ? grade.points.toFixed(2) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
          {pdf ? (
            <div>
              <a href={pdf} className={`${btn.secondary} h-10`} data-transcript-pdf="">
                {t("university.downloadPdf")}
              </a>
            </div>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}
