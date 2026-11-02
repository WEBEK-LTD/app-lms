import type { Metadata } from "next";
import Link from "next/link";
import { markTopicAction, unmarkTopicAction } from "@/app/actions/school-reports";
import { Field } from "@/components/form";
import { Badge, btn, ProgressBar } from "@/components/ui";
import type { DashKey, DashT } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { classProgress, schoolProgress, SYLLABUS_LIMITS, type ProgressStatus, type SubjectProgress } from "@/lib/school/syllabus";
import { SchoolForm } from "../forms";
import { FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("reports.progress") };
}

const pill = (current: boolean) =>
  `flex h-9 items-center rounded-full border px-3.5 text-sm no-underline ${current ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-ink-3 hover:border-midnight hover:text-midnight"}`;

const STATUS: Record<ProgressStatus, { key: DashKey; tone: "danger" | "success" | "info" }> = {
  behind: { key: "reports.behind", tone: "danger" },
  on_plan: { key: "reports.onPlan", tone: "success" },
  ahead: { key: "reports.ahead", tone: "info" },
};

function StatusBadge({ progress, t }: { progress: SubjectProgress; t: DashT }) {
  const s = STATUS[progress.status];
  return <Badge tone={s.tone}>{progress.status === "behind" ? t("reports.behindBy", { count: progress.behindBy }) : t(s.key)}</Badge>;
}

/**
 * 113.5 Where each class is in the syllabus: per class and subject the share
 * covered against where the plan says it should be, the classes behind the
 * plan first; a class's topics, marked covered (on a day, with a note) by
 * its teachers in the app or here.
 */
export default async function ProgressPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("reports.progress")} t={t} />;
  const params = await searchParams;
  const store = await getStore();
  const now = new Date();
  const [classes, saved, people, plan] = await Promise.all([store.listSchoolClasses(app.id), store.getSchoolSettings(app.id), store.listSchoolPeople(app.id, { role: "teacher" }), appPlan(store, license, now)]);
  const today = schoolToday(schoolSettingsOf(saved, app), now);
  const klass = classes.find((c) => c.id === Number(params.class)) ?? null;
  const teacherName = new Map(people.map((p) => [p.id, p.name]));
  const base = "/dashboard/school/progress";
  const head = "py-2 pe-4 text-start font-semibold";
  const cell = "md:py-2.5 md:pe-4";

  const rows = classes.length && !klass ? await schoolProgress(store, app, today) : null;
  const progress = klass ? await classProgress(store, app, klass, today) : null;
  const summary = (p: SubjectProgress) => t("reports.progressLine", { covered: p.covered, total: p.total, percent: p.percent, planned: p.plannedPercent });

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("reports.progress")} intro={t("reports.progressIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {classes.length === 0 ? <FirstNote text={t("school.classesFirst")} href="/dashboard/school/classes" /> : null}
      {classes.length ? (
        <nav aria-label={t("school.classes")} className="flex max-w-[860px] flex-wrap gap-1.5">
          {[{ id: 0, name: t("reports.wholeSchool") }, ...classes].map((c) => (
            <Link key={c.id} href={c.id ? `${base}?class=${c.id}` : base} aria-current={(klass?.id ?? 0) === c.id ? "page" : undefined} className={pill((klass?.id ?? 0) === c.id)}>
              {c.name}
            </Link>
          ))}
        </nav>
      ) : null}
      {rows ? (
        <Panel id="h-school-progress" title={t("reports.wholeSchool")} intro={t("reports.wholeSchoolIntro", { date: today })}>
          {rows.length === 0 ? (
            <FirstNote text={t("reports.syllabusFirst")} href="/dashboard/school/syllabus" />
          ) : (
            <table className="table-cards w-full border-collapse text-sm" data-school-progress="">
              <thead>
                <tr className="text-muted">
                  <th scope="col" className={head}>{t("school.class")}</th>
                  <th scope="col" className={head}>{t("school.subject")}</th>
                  <th scope="col" className={head}>{t("reports.covered")}</th>
                  <th scope="col" className={head}>{t("reports.plan")}</th>
                  <th scope="col" className="py-2 text-start font-semibold">{t("reports.status")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ klass: c, progress: p }) => (
                  <tr key={`${c.id}-${p.subject.id}`} className={`align-top md:border-t md:border-line-soft ${p.status === "behind" ? "bg-danger-bg/40" : ""}`} data-row={`${c.name} · ${p.subject.name}`}>
                    <td data-label={t("school.class")} className={`${cell} font-semibold`}>
                      <Link href={`${base}?class=${c.id}`}>{c.name}</Link>
                    </td>
                    <td data-label={t("school.subject")} className={cell}>
                      {p.subject.name}
                    </td>
                    <td data-label={t("reports.covered")} className={cell}>
                      {t("reports.coveredOf", { covered: p.covered, total: p.total, percent: p.percent })}
                    </td>
                    <td data-label={t("reports.plan")} className={cell}>
                      {t("reports.planPercent", { percent: p.plannedPercent })}
                    </td>
                    <td data-label={t("reports.status")} className="md:py-2.5">
                      <StatusBadge progress={p} t={t} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      ) : null}
      {progress && progress.subjects.length === 0 ? <FirstNote text={t("reports.syllabusFirstFor", { grade: progress.grade })} href={`/dashboard/school/syllabus?grade=${encodeURIComponent(progress.grade)}`} /> : null}
      {progress ? (
        <>
          {progress.subjects.map((p) => (
            <Panel key={p.subject.id} id={`h-progress-${p.subject.id}`} title={`${progress.klass.name} · ${p.subject.name}`} intro={summary(p)}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-[200px] flex-1">
                  <ProgressBar value={p.covered} max={Math.max(1, p.total)} label={t("reports.covered")} tone={p.status === "behind" ? "danger" : "success"} />
                </div>
                <StatusBadge progress={p} t={t} />
              </div>
              {p.planned ? <p className="m-0 text-[14px] text-ink-4">{t("reports.planSays", { topic: p.planned.title })}</p> : null}
              {p.units.map((u) => (
                <section key={u.unit.id} aria-label={u.unit.title} className="flex flex-col gap-1">
                  <h3 className="m-0 text-[15px] font-bold">{u.unit.title}</h3>
                  <ul className="m-0 flex list-none flex-col p-0">
                    {u.topics.map((x) => (
                      <li key={x.topic.id} className={`flex flex-col gap-2 border-t border-line-soft py-2.5 first:border-t-0 ${x.due && !x.covered ? "rounded-lg bg-danger-bg/40 px-2" : ""}`} data-topic={x.topic.title}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="text-[15px] font-semibold">{x.topic.title}</span>
                            <span className="text-[13px] text-muted">
                              {[
                                t("reports.plannedDays", { from: x.topic.startsOn, to: x.topic.endsOn }),
                                x.covered ? t("reports.coveredOn", { date: x.covered.coveredOn }) : x.due ? t("reports.notCoveredDue") : null,
                                x.covered?.teacherId ? teacherName.get(x.covered.teacherId) : null,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                            {x.covered?.note ? <span className="text-[14px] whitespace-pre-line text-ink-4">{x.covered.note}</span> : null}
                          </span>
                          {x.covered ? (
                            <>
                              <Badge tone="success">{t("reports.coveredBadge")}</Badge>
                              <form action={unmarkTopicAction}>
                                <input type="hidden" name="classId" value={progress.klass.id} />
                                <input type="hidden" name="topicId" value={x.topic.id} />
                                <button type="submit" className={`${btn.secondary} h-8 px-3 text-sm`}>
                                  {t("reports.unmark")}
                                </button>
                              </form>
                            </>
                          ) : null}
                        </div>
                        {x.covered ? null : (
                          <details className="rounded-lg border border-line-soft px-3 py-2">
                            <summary className="cursor-pointer text-sm font-semibold">{t("reports.markCovered")}</summary>
                            <div className="pt-3">
                              <SchoolForm action={markTopicAction} submit={t("reports.markCovered")}>
                                <input type="hidden" name="classId" value={progress.klass.id} />
                                <input type="hidden" name="topicId" value={x.topic.id} />
                                <div className="grid gap-4 sm:grid-cols-3">
                                  <Field id={`f-covered-${x.topic.id}`} label={t("reports.coveredDay")} name="coveredOn" type="date" dir="ltr" defaultValue={today} max={today} />
                                  <Field id={`f-note-${x.topic.id}`} label={t("reports.noteOptional")} name="note" maxLength={SYLLABUS_LIMITS.note} className="sm:col-span-2" />
                                </div>
                              </SchoolForm>
                            </div>
                          </details>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </Panel>
          ))}
        </>
      ) : null}
    </div>
  );
}
