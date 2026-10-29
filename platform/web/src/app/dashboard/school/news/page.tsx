import type { Metadata } from "next";
import { deleteSchoolNewsAction, postSchoolNewsAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { SCHOOL_LIMITS } from "@/lib/school/forms";
import { ConfirmButton } from "../../chat/forms";
import { Choice, SchoolForm } from "../forms";
import { isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.news") };
}

/** 105.4 The school's news, to everyone, a class or one student's family; each is told in the app. */
export default async function SchoolNewsPage() {
  const { app, license } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.news")} t={t} />;
  const store = await getStore();
  const [news, classes, people, plan] = await Promise.all([store.listSchoolAnnouncements(app.id, { limit: 100 }), store.listSchoolClasses(app.id), store.listSchoolPeople(app.id), appPlan(store, license, new Date())]);
  const className = new Map(classes.map((c) => [c.id, c.name]));
  const personName = new Map(people.map((p) => [p.id, p.name]));
  const students = people.filter((p) => p.role === "student" && p.active);
  const toOptions = [
    { value: "school", label: t("school.everyone") },
    ...classes.map((c) => ({ value: `class:${c.id}`, label: t("school.wholeClass", { name: c.name }) })),
    ...students.map((s) => ({ value: `student:${s.id}`, label: t("school.familyOf", { name: s.name }) })),
  ];
  const audience = (a: (typeof news)[number]) =>
    a.audience === "school" ? t("school.everyone") : a.audience === "class" ? t("school.wholeClass", { name: className.get(a.classId ?? 0) ?? "—" }) : t("school.familyOf", { name: personName.get(a.studentId ?? 0) ?? "—" });

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("school.news")} intro={t("school.newsIntro")} />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />

      <Panel id="h-post" title={t("school.postNews")}>
        <SchoolForm action={postSchoolNewsAction} submit={t("school.post")} reset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Choice id="f-to" name="to" label={t("school.newsFor")} options={toOptions} defaultValue="school" />
            <Field id="f-title" label={t("school.title")} name="title" maxLength={SCHOOL_LIMITS.title} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-body" className="text-sm font-semibold">
              {t("school.message")}
            </label>
            <textarea id="f-body" name="body" rows={4} maxLength={SCHOOL_LIMITS.body} className="input min-h-24 py-3" />
          </div>
        </SchoolForm>
      </Panel>

      <Panel id="h-news" title={t("school.posted")}>
        {news.length === 0 ? <p className="m-0 text-[15px] text-muted">{t("school.noNews")}</p> : null}
        <ul className="m-0 flex list-none flex-col p-0">
          {news.map((a) => (
            <li key={a.id} className="flex flex-wrap items-start gap-3 border-t border-line-soft py-3 first:border-t-0 first:pt-0">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-bold">{a.title}</span>
                <span className="text-[13px] text-muted">
                  {[audience(a), a.teacherId ? personName.get(a.teacherId) : t("school.fromSchool"), a.createdAt.toISOString().slice(0, 10)].filter(Boolean).join(" · ")}
                </span>
                <span className="text-[14px] whitespace-pre-line text-ink-4">{a.body}</span>
              </span>
              <form action={deleteSchoolNewsAction}>
                <input type="hidden" name="id" value={a.id} />
                <ConfirmButton confirm={t("school.deleteNews", { title: a.title })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                  {t("school.delete")}
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
