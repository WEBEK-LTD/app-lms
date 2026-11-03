import type { Metadata } from "next";
import { deleteSchoolNewsAction, postSchoolNewsAction } from "@/app/actions/school";
import { Field } from "@/components/form";
import { btn } from "@/components/ui";
import { ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList, Sheet, SheetButton } from "@/components/page-kit-client";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { SCHOOL_LIMITS } from "@/lib/school/forms";
import { ConfirmButton } from "../../chat/forms";
import { Choice, SchoolForm } from "../forms";
import { isSchool, NotSchool, PageHead, Panel, SchoolPlanNotice } from "../parts";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.news") };
}

/** 105.4 The school's news, to everyone, a class or one student's family; each is told in the app. */
export default async function SchoolNewsPage({ searchParams }: { searchParams: Promise<SampleQuery> }) {
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
    // 113.3 The staff's own news.
    { value: "staff", label: t("school.staffOnly") },
    ...classes.map((c) => ({ value: `class:${c.id}`, label: t("school.wholeClass", { name: c.name }) })),
    ...students.map((s) => ({ value: `student:${s.id}`, label: t("school.familyOf", { name: s.name }) })),
  ];
  const audience = (a: (typeof news)[number]) =>
    a.audience === "school" ? t("school.everyone") : a.audience === "staff" ? t("school.staffOnly") : a.audience === "class" ? t("school.wholeClass", { name: className.get(a.classId ?? 0) ?? "—" }) : t("school.familyOf", { name: personName.get(a.studentId ?? 0) ?? "—" });

  const has = news.length > 0;
  const month = new Date();
  month.setDate(month.getDate() - 30);

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, then what was posted. */}
      <PageHead
        title={t("school.news")}
        intro={t("school.newsIntro")}
        actions={
          has ? (
            <SheetButton target="new-news" icon="campaign">
              {t("school.postNews")}
            </SheetButton>
          ) : null
        }
      />
      <SchoolPlanNotice plan={plan} demo={app.demo === true} t={t} />
      {/* 110.2 */}
      <SampleEntries app={app} list="school_news" query={await searchParams} />

      {has ? (
        <StatRow label={t("school.news")}>
          <Stat icon="campaign" tone="accent" label={t("school.posted")} value={news.length} hint={t("school.statLastMonth", { count: news.filter((a) => a.createdAt >= month).length })} />
          <Stat icon="groups" label={t("school.everyone")} value={news.filter((a) => a.audience === "school").length} />
          <Stat icon="school" label={t("school.statForClasses")} value={news.filter((a) => a.audience === "class" || a.audience === "student").length} />
          <Stat icon="home_work" label={t("school.staffOnly")} value={news.filter((a) => a.audience === "staff").length} />
        </StatRow>
      ) : null}

      {/* One place in the page either way, so the form that posts the first news keeps its message. */}
      <Sheet id="new-news" inline={!has} title={t("school.postNews")} description={has ? undefined : t("school.noNews")}>
        <SchoolForm action={postSchoolNewsAction} submit={t("school.post")} reset sheet>
          <div className="grid gap-4 sm:grid-cols-2">
            <Choice id="f-to" name="to" label={t("school.newsFor")} options={toOptions} defaultValue="school" />
            <Field id="f-title" label={t("school.title")} name="title" maxLength={SCHOOL_LIMITS.title} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="f-body" className="text-sm font-semibold">
              {t("school.message")}
            </label>
            <textarea id="f-body" name="body" rows={6} maxLength={SCHOOL_LIMITS.body} className="input min-h-24 py-3" />
          </div>
        </SchoolForm>
      </Sheet>

      {has ? (
        <Panel id="h-news" title={t("school.posted")} flush>
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("school.searchNews")}
            noMatch={t("school.noNewsMatch")}
            filters={[
              { value: "school", label: t("school.everyone") },
              { value: "class", label: t("school.statForClasses") },
              { value: "staff", label: t("school.staffOnly") },
            ]}
            items={news.map((a, i) => ({
              id: a.id,
              text: [a.title, a.body, audience(a)].join(" "),
              group: a.audience === "student" ? "class" : a.audience,
              node: (
                <ItemRow
                  media={<Thumb icon={a.audience === "staff" ? "home_work" : "campaign"} shape="square" tint={i} />}
                  title={a.title}
                  badges={<SampleBadge sample={a.sample} />}
                  meta={[audience(a), a.teacherId ? personName.get(a.teacherId) : t("school.fromSchool"), a.createdAt.toISOString().slice(0, 10)].filter(Boolean).join(" · ")}
                  extra={<span className="line-clamp-3 whitespace-pre-line text-ink-4">{a.body}</span>}
                  actions={
                    <form action={deleteSchoolNewsAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <ConfirmButton confirm={t("school.deleteNews", { title: a.title })} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("school.delete")}
                      </ConfirmButton>
                    </form>
                  }
                />
              ),
            }))}
          />
        </Panel>
      ) : null}
    </div>
  );
}
