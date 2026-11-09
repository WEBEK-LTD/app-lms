import type { Metadata } from "next";
import { SampleEntries, type SampleQuery } from "@/components/samples";
import Link from "next/link";
import { deleteSchoolPersonAction, importSchoolPeopleAction, saveSchoolPersonAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { Badge, EmptyState, btn } from "@/components/ui";
import { ItemList, ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { ChipLinks, ListBar, Pager, SearchForm } from "@/components/page-kit-c";
import type { DashKey } from "@/i18n/dashboard";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { SchoolPerson, SchoolRole } from "@/lib/data/types";
import { appPlan } from "@/lib/entitlements";
import { PEOPLE_CSV_EXAMPLE, personFormValues, SCHOOL_LIMITS } from "@/lib/school/forms";
import { STAFF_LIMITS, workFormValues } from "@/lib/school/staff";
import { WorkFields } from "../staff/parts";
import { ConfirmButton } from "../../chat/forms";
import { Choice, SchoolForm } from "../forms";
import { FirstNote, isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.people") };
}

const ROLES = ["student", "parent", "teacher", "staff"] as const;
const ROLE_KEYS: Record<SchoolRole, DashKey> = { student: "school.students", parent: "school.parents", teacher: "school.teachers", staff: "school.staff" };
const ADD_KEYS: Record<SchoolRole, DashKey> = { student: "school.addStudent", parent: "school.addParent", teacher: "school.addTeacher", staff: "school.addStaff" };
const ROLE_ICONS = { student: "school", parent: "child_care", teacher: "menu_book", staff: "home_work" } as const;
const PER_PAGE = 50;

/**
 * 105.4 The school's students, parents and teachers. Whoever signs in to the
 * app with a number (or email) on this list is that person; a parent sees
 * their children.
 */
export default async function SchoolPeoplePage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string; page?: string } & SampleQuery> }) {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.people")} t={t} />;
  const params = await searchParams;
  const role: SchoolRole = params.role === "parent" || params.role === "teacher" || params.role === "staff" ? params.role : "student";
  const q = (params.q ?? "").trim().toLowerCase();
  const store = await getStore();
  const [people, classes, family, plan] = await Promise.all([store.listSchoolPeople(app.id), store.listSchoolClasses(app.id), store.listSchoolFamily(app.id, {}), appPlan(store, license, new Date())]);
  const byId = new Map(people.map((p) => [p.id, p]));
  const className = new Map(classes.map((c) => [c.id, c.name]));
  const ofRole = people.filter((p) => p.role === role);
  const shown = ofRole.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.phone ?? "").includes(q) || (p.email ?? "").includes(q) || (p.code ?? "").toLowerCase().includes(q));
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const list = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const childrenOf = (parent: SchoolPerson) => family.filter((l) => l.parentId === parent.id).map((l) => byId.get(l.studentId)).filter((s) => s !== undefined);
  const parentsOf = (student: SchoolPerson) => family.filter((l) => l.studentId === student.id).map((l) => byId.get(l.parentId)).filter((p) => p !== undefined);
  const classOptions = classes.map((c) => ({ value: String(c.id), label: c.name }));
  const link = (r: SchoolRole, p = 1) => `/dashboard/school/people?role=${r}${q ? `&q=${encodeURIComponent(q)}` : ""}${p > 1 ? `&page=${p}` : ""}`;
  const count = (r: SchoolRole) => people.filter((p) => p.role === r).length;
  const has = ofRole.length > 0;

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
        {/* 113.3 A teacher's or staff member's job, department, working hours and duties. */}
        {role === "teacher" || role === "staff" ? <WorkFields suffix={suffix} values={workFormValues(person)} t={t} limits={STAFF_LIMITS} /> : null}
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
      {/* The page kit: the header and its main action, the numbers, the list by role, then the import. */}
      <PageHead
        title={t("school.people")}
        intro={t("school.peopleIntro")}
        actions={
          has ? (
            <SheetButton target="new-person" icon="add">
              {t(ADD_KEYS[role])}
            </SheetButton>
          ) : null
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {/* Templates = demos: the school demo's classes, subjects and people as samples. */}
      <SampleEntries app={app} list="school" query={params} />
      {classes.length === 0 ? <FirstNote text={t("school.classesFirst")} href="/dashboard/school/classes" /> : null}

      {people.length ? (
        <StatRow label={t("school.people")}>
          <Stat icon="school" tone="accent" label={t("school.students")} value={count("student")} href={link("student")} />
          <Stat icon="child_care" label={t("school.parents")} value={count("parent")} href={link("parent")} />
          <Stat icon="menu_book" label={t("school.teachers")} value={count("teacher")} href={link("teacher")} hint={`${t("school.staff")}: ${count("staff")}`} />
          <Stat icon="smartphone" tone="success" label={t("school.statUsesApp")} value={people.filter((p) => p.userId !== null).length} />
        </StatRow>
      ) : null}

      <Panel id="h-people" title={t(ROLE_KEYS[role])} flush>
        <ListBar>
          <ChipLinks label={t("school.people")} items={ROLES.map((r) => ({ href: link(r), label: t(ROLE_KEYS[r]), count: count(r), current: r === role }))} />
          {has ? <SearchForm label={t("school.search")} placeholder={t("school.searchPeople")} defaultValue={params.q ?? ""} keep={{ role }} button={t("school.search")} /> : null}
        </ListBar>
        {list.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon={q ? "search" : ROLE_ICONS[role]} title={q ? t("school.noMatch") : t("school.noPeople")} />
          </div>
        ) : (
          <ItemList>
            {list.map((person, i) => {
              const related = person.role === "parent" ? childrenOf(person) : person.role === "student" ? parentsOf(person) : [];
              return (
                <ItemRow
                  key={person.id}
                  // 113.4 The student's page: pick-up, excuses, slips.
                  href={person.role === "student" ? `/dashboard/school/people/${person.id}` : undefined}
                  media={<Thumb icon="person" shape="round" tint={i} />}
                  title={person.name}
                  badges={
                    <>
                      {person.userId !== null ? <Badge tone="success">{t("school.usesApp")}</Badge> : null}
                      {person.active ? null : <Badge tone="neutral">{t("school.inactive")}</Badge>}
                    </>
                  }
                  meta={[person.phone, person.email, person.code ? t("school.codeIs", { code: person.code }) : null].filter(Boolean).join(" · ")}
                  extra={
                    [
                      person.classId ? className.get(person.classId) : null,
                      person.jobTitle ?? null,
                      person.department ?? null,
                      related.length ? (person.role === "parent" ? t("school.childrenAre", { names: related.map((s) => s.name).join(", ") }) : t("school.parentsAre", { names: related.map((s) => s.name).join(", ") })) : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || null
                  }
                  actions={
                    <>
                      {/* 113.5 The teachers' reports on the student. */}
                      {person.role === "student" ? (
                        <Link href={`/dashboard/school/teacher-reports?student=${person.id}`} className={`${btn.ghost} h-9 px-3 text-sm hover:bg-sand`}>
                          {t("reports.inbox")}
                        </Link>
                      ) : null}
                      <SheetButton target={`person-${person.id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
                        {t("school.edit")}
                      </SheetButton>
                      <form action={deleteSchoolPersonAction}>
                        <input type="hidden" name="id" value={person.id} />
                        <ConfirmButton confirm={t("school.deletePerson", { name: person.name })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                          {t("school.remove")}
                        </ConfirmButton>
                      </form>
                      <Sheet id={`person-${person.id}`} title={t("school.editPerson", { name: person.name })}>
                        <SchoolForm action={saveSchoolPersonAction} submit={t("school.save")} sheet>
                          <input type="hidden" name="id" value={person.id} />
                          {fields(`-${person.id}`, person)}
                        </SchoolForm>
                      </Sheet>
                    </>
                  }
                />
              );
            })}
          </ItemList>
        )}
        {pages > 1 ? (
          <Pager
            label={t("school.pages")}
            prev={page > 1 ? { href: link(role, page - 1), label: t("school.previous") } : null}
            next={page < pages ? { href: link(role, page + 1), label: t("school.next") } : null}
            text={t("school.pageOf", { page, pages })}
          />
        ) : null}
      </Panel>

      {/* One place in the page either way (a role of its own), so the form that adds the first one keeps its message. */}
      <Sheet key={role} id="new-person" inline={!has && !q} title={t(ADD_KEYS[role])}>
        <SchoolForm action={saveSchoolPersonAction} submit={t("school.add")} reset sheet>
          {fields("-new", null)}
        </SchoolForm>
      </Sheet>

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
