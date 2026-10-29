import type { Metadata } from "next";
import { addSchoolHomeworkAction, deleteSchoolHomeworkAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { SCHOOL_LIMITS } from "@/lib/school/forms";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { ConfirmButton } from "../../chat/forms";
import { AddServiceBox } from "../../delivery/forms";
import { Choice, SchoolForm } from "../forms";
import { ClassTabs, FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.homework") };
}

/** 105.4 Homework given to each class (by its teachers in the app, or here), with how many handed it in and were marked. */
export default async function SchoolHomeworkPage({ searchParams }: { searchParams: Promise<{ class?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.homework")} t={t} />;
  const store = await getStore();
  const now = new Date();
  const [classes, subjects, people, saved, plan] = await Promise.all([
    store.listSchoolClasses(app.id),
    store.listSchoolSubjects(app.id),
    store.listSchoolPeople(app.id),
    store.getSchoolSettings(app.id),
    appPlan(store, license, now),
  ]);
  const today = schoolToday(schoolSettingsOf(saved, app), now);
  const wanted = Number((await searchParams).class);
  const klass = classes.find((c) => c.id === wanted) ?? classes[0] ?? null;
  const list = klass ? (await store.listSchoolHomework(app.id, { classId: klass.id })).slice(0, 100) : [];
  const submissions = list.length ? await store.listSchoolSubmissions(app.id, { homeworkIds: list.map((h) => h.id) }) : [];
  const students = klass ? people.filter((p) => p.role === "student" && p.active && p.classId === klass.id).length : 0;
  const subjectName = new Map(subjects.map((s) => [s.id, s.name]));
  const personName = new Map(people.map((p) => [p.id, p.name]));

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("school.homework")} intro={t("school.homeworkIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {classes.length === 0 ? <FirstNote text={t("school.classesFirst")} href="/dashboard/school/classes" /> : null}
      {klass ? (
        <>
          <ClassTabs classes={classes} current={klass.id} base="/dashboard/school/homework" label={t("school.classes")} />
          <Panel id="h-homework" title={t("school.homeworkOf", { name: klass.name })}>
            {list.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("school.noHomework")}</p> : null}
            <ul className="m-0 flex list-none flex-col p-0">
              {list.map((h) => {
                const mine = submissions.filter((s) => s.homeworkId === h.id);
                return (
                  <li key={h.id} className="flex flex-wrap items-center gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-bold">{h.title}</span>
                      <span className="text-[13px] text-muted">
                        {[
                          subjectName.get(h.subjectId),
                          t("school.dueOn", { date: h.dueOn }),
                          h.teacherId ? personName.get(h.teacherId) : t("school.fromSchool"),
                          t("school.handedIn", { done: mine.filter((s) => s.submittedAt !== null).length, total: students }),
                          t("school.marked", { count: mine.filter((s) => s.mark !== null).length }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {h.text ? <span className="line-clamp-2 text-[14px] text-ink-4">{h.text}</span> : null}
                    </span>
                    <form action={deleteSchoolHomeworkAction}>
                      <input type="hidden" name="id" value={h.id} />
                      <ConfirmButton confirm={t("school.deleteHomework", { title: h.title })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("school.delete")}
                      </ConfirmButton>
                    </form>
                  </li>
                );
              })}
            </ul>
            {subjects.length === 0 ? (
              <FirstNote text={t("school.subjectsFirst")} href="/dashboard/school/classes" />
            ) : (
              <AddServiceBox title={t("school.giveHomework")} open={list.length === 0}>
                <SchoolForm action={addSchoolHomeworkAction} submit={t("school.give")} reset>
                  <input type="hidden" name="classId" value={klass.id} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Choice id="f-subject" name="subjectId" label={t("school.subject")} options={subjects.map((s) => ({ value: String(s.id), label: s.name }))} empty={t("school.choose")} />
                    <Field id="f-due" label={t("school.due")} name="dueOn" type="date" dir="ltr" min={today} required />
                    <Field id="f-title" label={t("school.title")} name="title" maxLength={SCHOOL_LIMITS.homeworkTitle} required className="sm:col-span-2" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="f-text" className="text-sm font-semibold">
                      {t("school.instructions")}
                    </label>
                    <textarea id="f-text" name="text" rows={4} maxLength={SCHOOL_LIMITS.text} className="input min-h-24 py-3" />
                  </div>
                </SchoolForm>
              </AddServiceBox>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
