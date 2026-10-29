import type { Metadata } from "next";
import Link from "next/link";
import { deleteSchoolPersonAction, importSchoolPeopleAction, saveSchoolPersonAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { Badge, btn } from "@/components/ui";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolPerson, SchoolRole } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { PEOPLE_CSV_EXAMPLE, personFormValues, SCHOOL_LIMITS } from "@/lib/school/forms";
import { ConfirmButton } from "../../chat/forms";
import { AddServiceBox } from "../../delivery/forms";
import { Choice, SchoolForm } from "../forms";
import { FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.people") };
}

const ROLE_KEYS: Record<SchoolRole, DashKey> = { student: "school.students", parent: "school.parents", teacher: "school.teachers" };
const ADD_KEYS: Record<SchoolRole, DashKey> = { student: "school.addStudent", parent: "school.addParent", teacher: "school.addTeacher" };
const PER_PAGE = 50;

/**
 * 105.4 The school's students, parents and teachers. Whoever signs in to the
 * app with a number (or email) on this list is that person; a parent sees
 * their children.
 */
export default async function SchoolPeoplePage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string; page?: string }> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.people")} t={t} />;
  const params = await searchParams;
  const role: SchoolRole = params.role === "parent" || params.role === "teacher" ? params.role : "student";
  const q = (params.q ?? "").trim().toLowerCase();
  const store = await getStore();
  const [people, classes, family, plan] = await Promise.all([store.listSchoolPeople(app.id), store.listSchoolClasses(app.id), store.listSchoolFamily(app.id, {}), appPlan(store, license, new Date())]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const className = new Map(classes.map((c) => [c.id, c.name]));
  const shown = people
    .filter((p) => p.role === role)
    .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.phone ?? "").includes(q) || (p.email ?? "").includes(q) || (p.code ?? "").toLowerCase().includes(q));
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const list = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const childrenOf = (parent: SchoolPerson) => family.filter((l) => l.parentId === parent.id).map((l) => byId.get(l.studentId)).filter((s) => s !== undefined);
  const parentsOf = (student: SchoolPerson) => family.filter((l) => l.studentId === student.id).map((l) => byId.get(l.parentId)).filter((p) => p !== undefined);
  const classOptions = classes.map((c) => ({ value: String(c.id), label: c.name }));
  const link = (r: SchoolRole, p = 1) => `/dashboard/school/people?role=${r}${q ? `&q=${encodeURIComponent(q)}` : ""}${p > 1 ? `&page=${p}` : ""}`;

  const fields = (suffix: string, person: SchoolPerson | null) => {
    const values = personFormValues(person, role);
    const children = person ? childrenOf(person).map((s) => s.code ?? s.name) : [];
    return (
      <>
        {person ? null : <input type="hidden" name="role" value={role} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`f-name${suffix}`} label={t("school.name")} name="name" defaultValue={values.name} maxLength={SCHOOL_LIMITS.personName} required />
          <Field id={`f-phone${suffix}`} label={t("school.phone")} name="phone" type="tel" dir="ltr" defaultValue={values.phone} hint={t("school.phoneHint")} />
          <Field id={`f-email${suffix}`} label={t("school.emailOptional")} name="email" type="email" dir="ltr" defaultValue={values.email} />
          {role === "student" ? (
            <>
              <Choice id={`f-class${suffix}`} name="classId" label={t("school.class")} options={classOptions} defaultValue={values.classId} empty={t("school.noClass")} />
              <Field id={`f-code${suffix}`} label={t("school.studentCode")} name="code" defaultValue={values.code} maxLength={SCHOOL_LIMITS.code} hint={t("school.studentCodeHint")} />
            </>
          ) : null}
          {role === "parent" ? (
            <Field id={`f-children${suffix}`} label={t("school.children")} name="children" defaultValue={children.join(", ")} hint={t("school.childrenHint")} className="sm:col-span-2" />
          ) : null}
        </div>
        {person ? (
          <label className="flex items-center gap-2 text-[15px] font-semibold">
            <input type="checkbox" name="active" defaultChecked={values.active === "on"} className="h-4 w-4 accent-midnight" />
            {t("school.active")}
          </label>
        ) : null}
      </>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("school.people")} intro={t("school.peopleIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {classes.length === 0 ? <FirstNote text={t("school.classesFirst")} href="/dashboard/school/classes" /> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <nav aria-label={t("school.people")} className="flex flex-wrap gap-1.5">
          {(["student", "parent", "teacher"] as const).map((r) => (
            <Link
              key={r}
              href={link(r)}
              aria-current={r === role ? "page" : undefined}
              className={`flex h-9 items-center rounded-full border px-3.5 text-sm no-underline ${
                r === role ? "border-midnight bg-midnight font-bold text-white hover:text-white" : "border-line bg-white text-ink-3 hover:border-midnight hover:text-midnight"
              }`}
            >
              {t(ROLE_KEYS[r])} ({people.filter((p) => p.role === r).length})
            </Link>
          ))}
        </nav>
        <form method="get" className="flex items-end gap-2">
          <input type="hidden" name="role" value={role} />
          <label htmlFor="f-q" className="sr-only">
            {t("school.search")}
          </label>
          <input id="f-q" name="q" type="search" defaultValue={params.q ?? ""} placeholder={t("school.searchPeople")} className="input input-sm w-[220px]" />
          <button type="submit" className={`${btn.secondary} h-10`}>
            {t("school.search")}
          </button>
        </form>
      </div>

      <Panel id="h-people" title={t(ROLE_KEYS[role])}>
        {list.length === 0 ? <p className="m-0 text-[15px] text-muted">{q ? t("school.noMatch") : t("school.noPeople")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {list.map((person) => {
            const related = person.role === "parent" ? childrenOf(person) : person.role === "student" ? parentsOf(person) : [];
            return (
              <li key={person.id} className="flex flex-col gap-2 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[15px] font-bold">{person.name}</span>
                    <span className="text-[13px] text-muted" dir="auto">
                      {[
                        person.phone,
                        person.email,
                        person.classId ? className.get(person.classId) : null,
                        person.code ? t("school.codeIs", { code: person.code }) : null,
                        related.length ? (person.role === "parent" ? t("school.childrenAre", { names: related.map((s) => s.name).join(", ") }) : t("school.parentsAre", { names: related.map((s) => s.name).join(", ") })) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {person.userId !== null ? <Badge tone="success">{t("school.usesApp")}</Badge> : null}
                  {person.active ? null : <Badge tone="neutral">{t("school.inactive")}</Badge>}
                  <form action={deleteSchoolPersonAction}>
                    <input type="hidden" name="id" value={person.id} />
                    <ConfirmButton confirm={t("school.deletePerson", { name: person.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                      {t("school.remove")}
                    </ConfirmButton>
                  </form>
                </div>
                <details className="rounded-xl border border-line p-4">
                  <summary className="cursor-pointer text-[15px] font-semibold">{t("school.editPerson", { name: person.name })}</summary>
                  <div className="pt-3">
                    <SchoolForm action={saveSchoolPersonAction} submit={t("school.save")}>
                      <input type="hidden" name="id" value={person.id} />
                      {fields(`-${person.id}`, person)}
                    </SchoolForm>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        {pages > 1 ? (
          <nav aria-label={t("school.pages")} className="flex items-center justify-between gap-3 text-[15px]">
            {page > 1 ? <Link href={link(role, page - 1)}>{t("school.previous")}</Link> : <span />}
            <span className="text-muted">{t("school.pageOf", { page, pages })}</span>
            {page < pages ? <Link href={link(role, page + 1)}>{t("school.next")}</Link> : <span />}
          </nav>
        ) : null}
        <AddServiceBox title={t(ADD_KEYS[role])} open={shown.length === 0 && !q}>
          <SchoolForm action={saveSchoolPersonAction} submit={t("school.add")} reset>
            {fields("-new", null)}
          </SchoolForm>
        </AddServiceBox>
      </Panel>

      <Panel id="h-import" title={t("school.importTitle")} intro={t("school.importIntro")}>
        <pre dir="ltr" className="m-0 overflow-x-auto rounded-xl bg-sand p-3 text-[13px] leading-relaxed">
          {PEOPLE_CSV_EXAMPLE}
        </pre>
        <SchoolForm action={importSchoolPeopleAction} submit={t("school.import")} reset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-file" className="text-sm font-semibold">
              {t("school.csvFile")}
            </label>
            <input id="f-file" type="file" name="file" accept=".csv,text/csv" className="text-sm" />
          </div>
        </SchoolForm>
      </Panel>
    </div>
  );
}
