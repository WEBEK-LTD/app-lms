import type { Metadata } from "next";
import { addSchoolHomeworkAction, deleteSchoolHomeworkAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { EmptyState, btn } from "@/components/ui";
import { ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList, Sheet, SheetButton } from "@/components/page-kit-client";
import { ListBar } from "@/components/page-kit-c";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { SCHOOL_LIMITS } from "@/lib/school/forms";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { ConfirmButton } from "../../chat/forms";
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

  const handedIn = (id: number) => submissions.filter((s) => s.homeworkId === id && s.submittedAt !== null).length;
  const markedOf = (id: number) => submissions.filter((s) => s.homeworkId === id && s.mark !== null).length;
  const canGive = klass !== null && subjects.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the class's numbers, its homework, then giving some. */}
      <PageHead
        title={t("school.homework")}
        intro={t("school.homeworkIntro")}
        actions={
          canGive && list.length ? (
            <SheetButton target="new-homework" icon="add">
              {t("school.giveHomework")}
            </SheetButton>
          ) : null
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {classes.length === 0 ? <FirstNote text={t("school.classesFirst")} href="/dashboard/school/classes" /> : null}
      {klass ? (
        <>
          {list.length ? (
            <StatRow label={t("school.homeworkOf", { name: klass.name })}>
              <Stat icon="assignment" tone="accent" label={t("school.homework")} value={list.length} hint={t("school.statUpcoming", { count: list.filter((h) => h.dueOn >= today).length })} />
              <Stat icon="upload" label={t("school.statHandedIn")} value={submissions.filter((s) => s.submittedAt !== null).length} />
              <Stat icon="check_circle" tone="success" label={t("school.statMarked")} value={submissions.filter((s) => s.mark !== null).length} />
              <Stat icon="groups" label={t("school.students")} value={students} />
            </StatRow>
          ) : null}
          <Panel id="h-homework" title={t("school.homeworkOf", { name: klass.name })} flush>
            <ListBar>
              <ClassTabs classes={classes} current={klass.id} base="/dashboard/school/homework" label={t("school.classes")} />
            </ListBar>
            {list.length === 0 ? (
              <div className="p-5 sm:p-6">
                <EmptyState icon="assignment" title={t("school.noHomework")} />
              </div>
            ) : (
              <FilterList
                allLabel={t("common.all")}
                searchLabel={t("school.searchHomework")}
                noMatch={t("school.noHomeworkMatch")}
                filters={subjects.map((s) => ({ value: String(s.id), label: s.name }))}
                items={list.map((h, i) => ({
                  id: h.id,
                  text: [h.title, subjectName.get(h.subjectId), h.teacherId ? personName.get(h.teacherId) : null, h.text].filter(Boolean).join(" "),
                  group: String(h.subjectId),
                  node: (
                    <ItemRow
                      media={<Thumb icon="assignment" shape="square" tint={i} />}
                      title={h.title}
                      meta={[subjectName.get(h.subjectId), t("school.dueOn", { date: h.dueOn }), h.teacherId ? personName.get(h.teacherId) : t("school.fromSchool")].filter(Boolean).join(" · ")}
                      extra={h.text ? <span className="line-clamp-2">{h.text}</span> : null}
                      aside={
                        <>
                          <span className="rounded-full bg-sand px-2.5 py-1 text-xs font-bold text-ink-3">{t("school.handedIn", { done: handedIn(h.id), total: students })}</span>
                          <span className="rounded-full bg-success-bg px-2.5 py-1 text-xs font-bold text-success">{t("school.marked", { count: markedOf(h.id) })}</span>
                        </>
                      }
                      actions={
                        <form action={deleteSchoolHomeworkAction}>
                          <input type="hidden" name="id" value={h.id} />
                          <ConfirmButton confirm={t("school.deleteHomework", { title: h.title })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                            {t("school.delete")}
                          </ConfirmButton>
                        </form>
                      }
                    />
                  ),
                }))}
              />
            )}
          </Panel>
          {subjects.length === 0 ? (
            <FirstNote text={t("school.subjectsFirst")} href="/dashboard/school/classes" />
          ) : (
            // Keyed by the class, so another class's first homework shows its form in place.
            <Sheet key={klass.id} id="new-homework" inline={list.length === 0} title={t("school.giveHomework")}>
              <SchoolForm action={addSchoolHomeworkAction} submit={t("school.give")} reset sheet>
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
            </Sheet>
          )}
        </>
      ) : null}
    </div>
  );
}
