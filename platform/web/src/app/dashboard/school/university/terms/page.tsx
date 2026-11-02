import type { Metadata } from "next";
import { deleteSectionAction, deleteTermAction, saveSectionAction, saveTermAction } from "@/app/actions/university";
import { Field } from "@/components/form";
import { btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { timeOf } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { UniSection, UniTerm } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { meetingsText, UNI_LIMITS } from "@/lib/university/forms";
import { seatsTaken } from "@/lib/university/records";
import { currentTerm, loadUniSettings } from "@/lib/university/settings";
import { ConfirmButton } from "../../../chat/forms";
import { AddServiceBox } from "../../../delivery/forms";
import { Choice, SchoolForm } from "../../forms";
import { WEEKDAY_KEYS } from "../../parts";
import { FirstNote, isSchool, NotSchool, Panel, TermTabs, UNI_BASE, UniHead } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("university.tabTerms") };
}

/** 113.9 The academic year's terms (registration window, drop date) and each term's sections, with the week as a timetable. */
export default async function UniversityTermsPage({ searchParams }: { searchParams: Promise<{ term?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("university.tabTerms")} t={t} />;
  const store = await getStore();
  const [settings, terms, courses, teachers, school, plan] = await Promise.all([
    loadUniSettings(store, app.id),
    store.listUniTerms(app.id),
    store.listUniCourses(app.id),
    store.listSchoolPeople(app.id, { role: "teacher" }),
    store.getSchoolSettings(app.id),
    appPlan(store, license, new Date()),
  ]);
  const today = schoolToday(schoolSettingsOf(school, app), new Date());
  const wanted = Number((await searchParams).term);
  const term = terms.find((x) => x.id === wanted) ?? currentTerm(terms, settings, today);
  const [sections, taken] = term ? await Promise.all([store.listUniSections(app.id, { termId: term.id }), seatsTaken(store, app.id, term.id)]) : [[], new Map<number, number>()];
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const teacherName = new Map(teachers.map((p) => [p.id, p.name]));
  const courseOptions = courses.map((c) => ({ value: String(c.id), label: `${c.code} ${c.title}` }));
  const lecturerOptions = teachers.filter((p) => p.active).map((p) => ({ value: String(p.id), label: p.name }));
  const label = (s: UniSection) => `${courseById.get(s.courseId)?.code ?? "?"}-${s.code}`;
  const ordered = [...sections].sort((a, b) => label(a).localeCompare(label(b)));

  const termFields = (suffix: string, x: UniTerm | null) => (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field id={`f-tname${suffix}`} label={t("university.termName")} name="name" defaultValue={x?.name ?? ""} maxLength={80} placeholder={t("university.termNameExample")} required />
      <Field id={`f-tyear${suffix}`} label={t("university.academicYear")} name="academicYear" dir="ltr" defaultValue={x?.academicYear ?? ""} maxLength={UNI_LIMITS.year} placeholder="2026/2027" required />
      <span />
      <Field id={`f-tstart${suffix}`} label={t("university.termStarts")} name="startsOn" type="date" dir="ltr" defaultValue={x?.startsOn ?? ""} required />
      <Field id={`f-tend${suffix}`} label={t("university.termEnds")} name="endsOn" type="date" dir="ltr" defaultValue={x?.endsOn ?? ""} required />
      <span />
      <Field id={`f-topen${suffix}`} label={t("university.registrationOpens")} name="registrationOpens" type="date" dir="ltr" defaultValue={x?.registrationOpens ?? ""} required />
      <Field id={`f-tclose${suffix}`} label={t("university.registrationCloses")} name="registrationCloses" type="date" dir="ltr" defaultValue={x?.registrationCloses ?? ""} required />
      <Field id={`f-tdrop${suffix}`} label={t("university.dropUntil")} name="dropUntil" type="date" dir="ltr" defaultValue={x?.dropUntil ?? ""} required />
    </div>
  );

  const sectionFields = (suffix: string, s: UniSection | null) => (
    <div className="grid gap-4 sm:grid-cols-3">
      <Choice id={`f-scourse${suffix}`} name="courseId" label={t("university.course")} options={courseOptions} defaultValue={s ? String(s.courseId) : ""} empty={t("university.choose")} className="sm:col-span-2" />
      <Field id={`f-scode${suffix}`} label={t("university.sectionCode")} name="code" dir="ltr" defaultValue={s?.code ?? "01"} maxLength={UNI_LIMITS.code} required />
      <Choice id={`f-slect${suffix}`} name="lecturerId" label={t("university.lecturer")} options={lecturerOptions} defaultValue={s?.lecturerId ? String(s.lecturerId) : ""} empty={t("university.none")} />
      <Field id={`f-sseats${suffix}`} label={t("university.seats")} name="seats" type="number" min={1} max={UNI_LIMITS.seats} dir="ltr" defaultValue={s ? String(s.seats) : "40"} required />
      <span />
      <div className="flex flex-col gap-1.5 sm:col-span-3">
        <label htmlFor={`f-smeet${suffix}`} className="text-sm font-semibold">
          {t("university.lectures")}
        </label>
        <textarea id={`f-smeet${suffix}`} name="meetings" rows={3} dir="ltr" defaultValue={s ? meetingsText(s.meetings) : ""} placeholder="1 09:00-10:30 B2" className="input min-h-20 py-3 font-mono text-[14px]" />
        <span className="text-[13px] text-muted">{t("university.lecturesHint")}</span>
      </div>
    </div>
  );

  // The week: each day's lectures by time.
  const week = WEEKDAY_KEYS.map((key, i) => ({
    key,
    lectures: ordered
      .flatMap((s) => s.meetings.filter((m) => m.weekday === i + 1).map((m) => ({ s, m })))
      .sort((a, b) => a.m.startMinute - b.m.startMinute || label(a.s).localeCompare(label(b.s))),
  })).filter((d) => d.lectures.length);

  return (
    <div className="flex flex-col gap-6">
      <UniHead title={t("university.tabTerms")} intro={t("university.termsIntro")} current="/terms" t={t} app={app} plan={plan} settings={settings} />
      <Panel id="h-terms" title={t("university.terms")}>
        {terms.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("university.noTerms")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {terms.map((x) => (
            <li key={x.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">
                    {x.name} · {x.academicYear}
                  </span>
                  <span className="text-[13px] text-muted">{t("university.termFacts", { starts: x.startsOn, ends: x.endsOn, opens: x.registrationOpens, closes: x.registrationCloses, drop: x.dropUntil })}</span>
                </span>
                <form action={deleteTermAction}>
                  <input type="hidden" name="id" value={x.id} />
                  <ConfirmButton confirm={t("university.deleteTerm", { name: x.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                    {t("university.delete")}
                  </ConfirmButton>
                </form>
              </div>
              <details className="rounded-xl border border-line p-4">
                <summary className="cursor-pointer text-[15px] font-semibold">{t("university.edit", { name: x.name })}</summary>
                <div className="pt-3">
                  <SchoolForm action={saveTermAction} submit={t("university.save")}>
                    <input type="hidden" name="id" value={x.id} />
                    {termFields(`-${x.id}`, x)}
                  </SchoolForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <AddServiceBox title={t("university.addTerm")} open={terms.length === 0}>
          <SchoolForm action={saveTermAction} submit={t("university.add")} reset>
            {termFields("-new", null)}
          </SchoolForm>
        </AddServiceBox>
      </Panel>

      <TermTabs terms={terms} current={term?.id ?? null} base={`${UNI_BASE}/terms`} label={t("university.terms")} />
      {term && courses.length === 0 ? <FirstNote text={t("university.coursesFirst")} href={`${UNI_BASE}/courses`} /> : null}
      {term ? (
        <Panel id="h-sections" title={t("university.sectionsOf", { name: term.name })}>
          {ordered.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("university.noSections")}</p> : null}
          <ul className="m-0 flex list-none flex-col p-0">
            {ordered.map((s) => {
              const course = courseById.get(s.courseId);
              return (
                <li key={s.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span dir="ltr" className="w-[100px] shrink-0 text-[14px] font-bold">
                      {label(s)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-semibold">{course?.title ?? ""}</span>
                      <span className="text-[13px] text-muted">
                        {[
                          s.lecturerId ? teacherName.get(s.lecturerId) : t("university.noLecturer"),
                          t("university.seatsTaken", { taken: taken.get(s.id) ?? 0, seats: s.seats }),
                          s.meetings.map((m) => `${t(WEEKDAY_KEYS[m.weekday - 1]!)} ${timeOf(m.startMinute)}–${timeOf(m.endMinute)}${m.room ? ` (${m.room})` : ""}`).join(", "),
                          s.resultsPublishedAt ? t("university.resultsOut") : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <form action={deleteSectionAction}>
                      <input type="hidden" name="id" value={s.id} />
                      <ConfirmButton confirm={t("university.deleteSection", { name: label(s) })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("university.delete")}
                      </ConfirmButton>
                    </form>
                  </div>
                  <details className="rounded-xl border border-line p-4">
                    <summary className="cursor-pointer text-[15px] font-semibold">{t("university.edit", { name: label(s) })}</summary>
                    <div className="pt-3">
                      <SchoolForm action={saveSectionAction} submit={t("university.save")}>
                        <input type="hidden" name="id" value={s.id} />
                        <input type="hidden" name="termId" value={term.id} />
                        {sectionFields(`-${s.id}`, s)}
                      </SchoolForm>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
          {courses.length ? (
            <AddServiceBox title={t("university.addSection")} open={ordered.length === 0}>
              <SchoolForm action={saveSectionAction} submit={t("university.add")} reset>
                <input type="hidden" name="termId" value={term.id} />
                {sectionFields("-new", null)}
              </SchoolForm>
            </AddServiceBox>
          ) : null}
        </Panel>
      ) : null}

      {term && week.length ? (
        <Panel id="h-week" title={t("university.timetableOf", { name: term.name })}>
          <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))]">
            {week.map((day) => (
              <div key={day.key} className="flex flex-col gap-2 rounded-xl border border-line p-3">
                <h3 className="m-0 text-[14px] font-bold">{t(day.key)}</h3>
                {day.lectures.map(({ s, m }, i) => (
                  <div key={`${s.id}-${i}`} className="flex flex-col rounded-lg bg-sand px-2.5 py-2 text-[13px]">
                    <span dir="ltr" className="font-semibold tabular-nums">
                      {timeOf(m.startMinute)}–{timeOf(m.endMinute)}
                    </span>
                    <span dir="ltr" className="font-bold">
                      {label(s)}
                    </span>
                    <span className="text-muted">{[s.lecturerId ? teacherName.get(s.lecturerId) : null, m.room].filter(Boolean).join(" · ")}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
