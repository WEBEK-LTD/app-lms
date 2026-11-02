import type { Metadata } from "next";
import { deleteBehaviourAction, deleteBehaviourCategoryAction, saveBehaviourAlertsAction, saveBehaviourCategoryAction, writeBehaviourAction } from "@/app/actions/school-calendar";
import { Field } from "@/components/form";
import { EmptyState, btn } from "@/components/ui";
import { ItemRow, PageGroup, Stat, StatRow } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { requireClient } from "@/lib/auth/session";
import { addDays, isDate, localToUtc } from "@/lib/bookings/time";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolBehaviourCategory } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { BEHAVIOUR_LIMITS, behaviourAlertsOf, behaviourCategories, behaviourTotals } from "@/lib/school/behaviour";
import { schoolToday } from "@/lib/school/service";
import { schoolSettingsOf } from "@/lib/school/settings";
import { ConfirmButton } from "../../chat/forms";
import { Choice, SchoolForm } from "../forms";
import { FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("schoolLife.behaviour") };
}

/** 113.8 Behaviour: whom parents are told of, the school's categories, a merit or a note from the school, and the report over a period. */
export default async function SchoolBehaviourPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("schoolLife.behaviour")} t={t} />;
  const query = await searchParams;
  const store = await getStore();
  const now = new Date();
  const [categories, classes, people, saved, plan] = await Promise.all([
    behaviourCategories(store, app, now),
    store.listSchoolClasses(app.id),
    store.listSchoolPeople(app.id),
    store.getSchoolSettings(app.id),
    appPlan(store, license, now),
  ]);
  const settings = schoolSettingsOf(saved, app);
  const today = schoolToday(settings, now);
  const from = query.from && isDate(query.from) ? query.from : (settings.term?.startsOn && settings.term.startsOn <= today ? settings.term.startsOn : addDays(today, -29));
  const to = query.to && isDate(query.to) && query.to >= from ? query.to : today;
  const notes = await store.listSchoolBehaviour(app.id, { since: localToUtc(from, "00:00", settings.timezone), until: localToUtc(addDays(to, 1), "00:00", settings.timezone) });
  const students = people.filter((p) => p.role === "student" && p.active);
  const personName = new Map(people.map((p) => [p.id, p.name]));
  const className = new Map(classes.map((c) => [c.id, c.name]));
  const studentClass = new Map(students.map((s) => [s.id, s.classId]));
  const head = "py-2 pe-4 text-start font-semibold";
  const cell = "md:py-2.5 md:pe-4";

  const byClass = classes
    .map((c) => ({ klass: c, ...behaviourTotals(notes.filter((n) => (n.classId ?? studentClass.get(n.studentId)) === c.id)) }))
    .filter((r) => r.positive + r.negative > 0);
  const byStudent = [...new Set(notes.map((n) => n.studentId))]
    .map((id) => ({ id, ...behaviourTotals(notes.filter((n) => n.studentId === id)) }))
    .sort((a, b) => b.points - a.points || b.positive - a.positive)
    .slice(0, 30);
  const byCategory = [...new Set(notes.map((n) => n.categoryName))]
    .map((name) => {
      const list = notes.filter((n) => n.categoryName === name);
      return { name, kind: list[0]!.kind, times: list.length, points: list.reduce((s, n) => s + n.points, 0) };
    })
    .sort((a, b) => b.times - a.times);
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
  const active = categories.filter((c) => c.active);
  const totals = behaviourTotals(notes);
  const period = (
      <form method="get" className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          {t("schoolLife.reportFrom")}
          <input type="date" name="from" defaultValue={from} className="input input-sm" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          {t("schoolLife.reportTo")}
          <input type="date" name="to" defaultValue={to} className="input input-sm" />
        </label>
        <button type="submit" className={`${btn.secondary} h-10 px-3.5 text-sm`}>
          {t("schoolLife.show")}
        </button>
      </form>
  );

  const categoryFields = (suffix: string, c: SchoolBehaviourCategory | null) => (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field id={`f-name${suffix}`} label={t("schoolLife.categoryName")} name="name" defaultValue={c?.name ?? ""} maxLength={BEHAVIOUR_LIMITS.name} required />
      <Choice
        id={`f-kind${suffix}`}
        name="kind"
        label={t("schoolLife.categoryKind")}
        options={[
          { value: "positive", label: t("schoolLife.positive") },
          { value: "negative", label: t("schoolLife.negative") },
        ]}
        defaultValue={c?.kind ?? "positive"}
      />
      <Field id={`f-points${suffix}`} label={t("schoolLife.points")} name="points" type="number" min={0} max={BEHAVIOUR_LIMITS.points} dir="ltr" defaultValue={String(Math.abs(c?.points ?? 1))} required />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header, the period's numbers, writing a merit or a note, the report, then the settings. */}
      <PageHead title={t("schoolLife.behaviour")} intro={t("schoolLife.behaviourIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {students.length === 0 ? <FirstNote text={t("school.studentsFirst")} href="/dashboard/school/people" /> : null}

      {notes.length ? (
        <StatRow label={t("schoolLife.report")}>
          <Stat icon="star" tone="success" label={t("schoolLife.merits")} value={totals.positive} hint={t("schoolLife.dayRange", { from, to })} />
          <Stat icon="flag" tone="warn" label={t("schoolLife.notesCount")} value={totals.negative} />
          <Stat icon="emoji_events" tone="accent" label={t("schoolLife.points")} value={signed(totals.points)} />
          <Stat icon="groups" label={t("schoolLife.statStudents")} value={new Set(notes.map((n) => n.studentId)).size} />
        </StatRow>
      ) : null}

      {students.length > 0 && active.length > 0 ? (
        <Panel id="h-write" title={t("schoolLife.write")}>
          <SchoolForm action={writeBehaviourAction} submit={t("school.add")} reset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Choice
                id="f-student"
                name="studentId"
                label={t("schoolLife.student")}
                options={students.map((s) => ({ value: String(s.id), label: s.classId ? `${s.name} · ${className.get(s.classId) ?? ""}` : s.name }))}
                empty={t("school.choose")}
              />
              <Choice
                id="f-category"
                name="categoryId"
                label={t("schoolLife.category")}
                options={active.map((c) => ({ value: String(c.id), label: `${c.name} (${signed(c.points)})` }))}
                empty={t("school.choose")}
              />
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label htmlFor="f-note" className="text-sm font-semibold">
                  {t("schoolLife.note")}
                </label>
                <textarea id="f-note" name="note" rows={2} maxLength={BEHAVIOUR_LIMITS.note} className="input min-h-16 py-3" />
              </div>
            </div>
          </SchoolForm>
        </Panel>
      ) : null}

      <PageGroup title={t("schoolLife.report")}>
      <Panel id="h-report" title={t("schoolLife.report")} intro={t("schoolLife.dayRange", { from, to })} actions={period}>
        {notes.length === 0 ? <EmptyState icon="star" title={t("schoolLife.noBehaviour")} /> : null}
        {byClass.length > 0 ? (
          <>
            <h3 className="m-0 text-base font-bold">{t("schoolLife.byClass")}</h3>
            <table className="table-cards w-full border-collapse text-sm" data-report="classes">
              <thead>
                <tr className="text-muted">
                  <th scope="col" className={head}>{t("schoolLife.className")}</th>
                  <th scope="col" className={head}>{t("schoolLife.points")}</th>
                  <th scope="col" className={head}>{t("schoolLife.merits")}</th>
                  <th scope="col" className={head}>{t("schoolLife.notesCount")}</th>
                </tr>
              </thead>
              <tbody>
                {byClass.map((r) => (
                  <tr key={r.klass.id} className="md:border-t md:border-line-soft">
                    <td data-label={t("schoolLife.className")} className={`${cell} font-semibold`}>{r.klass.name}</td>
                    <td data-label={t("schoolLife.points")} className={`${cell} tabular-nums`}>{signed(r.points)}</td>
                    <td data-label={t("schoolLife.merits")} className={`${cell} tabular-nums`}>{r.positive}</td>
                    <td data-label={t("schoolLife.notesCount")} className={`${cell} tabular-nums`}>{r.negative}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
        {byStudent.length > 0 ? (
          <>
            <h3 className="m-0 text-base font-bold">{t("schoolLife.topStudents")}</h3>
            <table className="table-cards w-full border-collapse text-sm" data-report="students">
              <thead>
                <tr className="text-muted">
                  <th scope="col" className={head}>{t("schoolLife.student")}</th>
                  <th scope="col" className={head}>{t("schoolLife.className")}</th>
                  <th scope="col" className={head}>{t("schoolLife.points")}</th>
                  <th scope="col" className={head}>{t("schoolLife.merits")}</th>
                  <th scope="col" className={head}>{t("schoolLife.notesCount")}</th>
                </tr>
              </thead>
              <tbody>
                {byStudent.map((r) => (
                  <tr key={r.id} data-student={r.id} className="md:border-t md:border-line-soft">
                    <td data-label={t("schoolLife.student")} className={`${cell} font-semibold`}>{personName.get(r.id) ?? "—"}</td>
                    <td data-label={t("schoolLife.className")} className={cell}>{className.get(studentClass.get(r.id) ?? 0) ?? "—"}</td>
                    <td data-label={t("schoolLife.points")} className={`${cell} tabular-nums`}>{signed(r.points)}</td>
                    <td data-label={t("schoolLife.merits")} className={`${cell} tabular-nums`}>{r.positive}</td>
                    <td data-label={t("schoolLife.notesCount")} className={`${cell} tabular-nums`}>{r.negative}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
        {byCategory.length > 0 ? (
          <>
            <h3 className="m-0 text-base font-bold">{t("schoolLife.byCategory")}</h3>
            <table className="table-cards w-full border-collapse text-sm" data-report="categories">
              <thead>
                <tr className="text-muted">
                  <th scope="col" className={head}>{t("schoolLife.category")}</th>
                  <th scope="col" className={head}>{t("schoolLife.times")}</th>
                  <th scope="col" className={head}>{t("schoolLife.points")}</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((r) => (
                  <tr key={r.name} className="md:border-t md:border-line-soft">
                    <td data-label={t("schoolLife.category")} className={`${cell} font-semibold`}>{r.name}</td>
                    <td data-label={t("schoolLife.times")} className={`${cell} tabular-nums`}>{r.times}</td>
                    <td data-label={t("schoolLife.points")} className={`${cell} tabular-nums`}>{signed(r.points)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
        {notes.length > 0 ? (
          <>
            <h3 className="m-0 text-base font-bold">{t("schoolLife.latest")}</h3>
            <ul className="m-0 flex list-none flex-col p-0" data-notes="">
              {notes.slice(0, 40).map((n) => (
                <li key={n.id} data-note={n.id} className="flex flex-wrap items-start gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-bold">
                      {personName.get(n.studentId) ?? "—"} · {n.categoryName} ({signed(n.points)})
                    </span>
                    <span className="text-[13px] text-muted">
                      {[n.teacherId ? personName.get(n.teacherId) : t("schoolLife.fromSchool"), n.classId ? className.get(n.classId) : null, n.createdAt.toISOString().slice(0, 10)].filter(Boolean).join(" · ")}
                    </span>
                    {n.note ? <span className="text-[14px] whitespace-pre-line text-ink-4">{n.note}</span> : null}
                  </span>
                  <form action={deleteBehaviourAction}>
                    <input type="hidden" name="id" value={n.id} />
                    <ConfirmButton confirm={t("schoolLife.deleteNote")} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                      {t("schoolLife.delete")}
                    </ConfirmButton>
                  </form>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Panel>
      </PageGroup>

      <PageGroup title={t("schoolLife.groupSettings")}>
      <Panel id="h-alerts" title={t("schoolLife.alerts")}>
        <SchoolForm action={saveBehaviourAlertsAction} submit={t("schoolLife.save")}>
          <Choice
            id="f-alerts"
            name="behaviourAlerts"
            label={t("schoolLife.alerts")}
            options={[
              { value: "all", label: t("schoolLife.alertsAll") },
              { value: "negative", label: t("schoolLife.alertsNegative") },
              { value: "none", label: t("schoolLife.alertsNone") },
            ]}
            defaultValue={behaviourAlertsOf(settings)}
          />
        </SchoolForm>
      </Panel>

        <Panel
          id="h-categories"
          title={t("schoolLife.categories")}
          intro={t("schoolLife.categoriesIntro")}
          flush
          actions={
            categories.length ? (
              <SheetButton target="new-category" icon="add" variant="secondary" className="h-10 px-3.5 text-sm">
                {t("schoolLife.addCategory")}
              </SheetButton>
            ) : null
          }
        >
          {categories.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState icon="category" title={t("schoolLife.noCategories")} />
            </div>
          ) : null}
          <ul className="m-0 flex list-none flex-col p-0" data-categories="">
            {categories.map((c) => (
              <ItemRow
                key={c.id}
                data-category={c.id}
                media={
                  <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[14px] font-extrabold tabular-nums ${c.kind === "positive" ? "bg-success-bg text-success" : "bg-warn-bg text-warn"}`}>
                    {signed(c.points)}
                  </span>
                }
                title={c.name}
                meta={`${c.kind === "positive" ? t("schoolLife.positive") : t("schoolLife.negative")} · ${t("schoolLife.pointsSigned", { points: signed(c.points) })}`}
                actions={
                  <>
                    <SheetButton target={`category-${c.id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
                      {t("schoolLife.edit")}
                    </SheetButton>
                    <form action={deleteBehaviourCategoryAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmButton confirm={t("schoolLife.deleteCategory", { name: c.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("schoolLife.delete")}
                      </ConfirmButton>
                    </form>
                    <Sheet id={`category-${c.id}`} title={c.name}>
                      <SchoolForm action={saveBehaviourCategoryAction} submit={t("school.save")} sheet>
                        <input type="hidden" name="id" value={c.id} />
                        {categoryFields(`-${c.id}`, c)}
                      </SchoolForm>
                    </Sheet>
                  </>
                }
              />
            ))}
          </ul>
          <Sheet id="new-category" inline={categories.length === 0} title={t("schoolLife.addCategory")}>
            <SchoolForm action={saveBehaviourCategoryAction} submit={t("school.add")} reset sheet>
              {categoryFields("-new", null)}
            </SchoolForm>
          </Sheet>
        </Panel>
      </PageGroup>
    </div>
  );
}
