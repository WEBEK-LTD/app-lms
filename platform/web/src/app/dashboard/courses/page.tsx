import { plansIn } from "@/lib/marketing-lang";
import type { Metadata } from "next";
import Link from "next/link";
import { deleteCourseCategoryAction } from "@/app/actions/courses";
import { SubmitButton } from "@/components/form";
import { Notice, PageHeader, Section } from "@/components/ui";
import { ItemRow, LinkCards, PageGroup, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList, Sheet, SheetButton } from "@/components/page-kit-client";
import { assetUrl } from "@/lib/assets";
import { bundlesOf } from "@/lib/courses/bundles";
import { Icon } from "@/components/icon";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { courseSetup, lessonsOf } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import { CouponsPanel } from "../catalog/coupons-panel";
import { CardPayments, OtherPayments } from "../catalog/payments";
import { UpgradeHint } from "@/components/upgrade";
import { currentPlanId } from "@/lib/billing/plan-change";
import { downloadsFormValue, offersDownloads } from "@/lib/courses/downloads";
import { effectivePlans } from "@/lib/entitlements";
import { hasFeature, lowestPlanWith } from "@/lib/plans";
import type { App, License } from "@/lib/data/types";
import { CourseCategoryForm, CourseForm, CurrencyForm, OfflineDownloadsForm } from "./forms";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { courseStage, isTeachersApp } from "@/lib/teachers/service";
import { StageBadge } from "../teachers/parts";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("courses.title") };
}

/** 45 Offline downloads: on or off for the app's students, with offline mode in the plan. */
async function OfflineDownloads({ app, license }: { app: App; license: License | null }) {
  if (!offersDownloads(app)) return null;
  const effective = plansIn((await dashboardText()).lang, await effectivePlans(await getStore()));
  const planId = license ? currentPlanId(license, new Date()) : null;
  const plan = planId ? effective[planId] : null;
  const included = hasFeature(plan, "offline_downloads");
  const { t } = await dashboardText();
  const to = lowestPlanWith(effective, (p) => hasFeature(p, "offline_downloads"), planId);
  return (
    <section aria-labelledby="h-offline" className="flex max-w-[720px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="h-offline" className="m-0 text-lg font-bold">
          {t("courses.offline")}
        </h2>
        <p className="m-0 text-sm leading-relaxed text-muted">{t("courses.offlineText")}</p>
      </div>
      {included ? null : (
        <UpgradeHint title={t("courses.offline")} to={to} cta={to ? t("overview.upgradeTo", { plan: to.name }) : undefined}>
          {t("courses.offlineUpgrade")}
        </UpgradeHint>
      )}
      <OfflineDownloadsForm current={downloadsFormValue(app)} wordpress={app.connector?.kind !== "courses"} disabled={!included} />
    </section>
  );
}

/** Courses, categories and payments for Academy apps without a website. */
export default async function CoursesPage({ searchParams }: { searchParams: Promise<SampleQuery> }) {
  const { app, license } = await requireClient("catalog");
  const { t } = await dashboardText();
  if (!app || app.connector?.kind !== "courses") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("courses.title")} description={richText(t("courses.fromSite"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })} />
        {app ? <OfflineDownloads app={app} license={license} /> : null}
      </div>
    );
  }
  const setup = courseSetup(app);
  const enrollments = await (await getStore()).listCourseEnrollments({ appId: app.id });
  const students = (id: number) => enrollments.filter((e) => e.courseId === id).length;
  const paid = setup.courses.some((c) => c.priceCents > 0);
  const teacherNames = new Map(isTeachersApp(app) ? (await (await getStore()).listTeachers(app.id)).map((teacher) => [teacher.id, teacher.name]) : []);
  const published = setup.courses.filter((c) => courseStage(c) === "published").length;
  const waiting = setup.courses.filter((c) => courseStage(c) === "in_review").length;
  const lessons = setup.courses.reduce((sum, c) => sum + lessonsOf(c).length, 0);
  const has = setup.courses.length > 0;
  const bundles = bundlesOf(setup).length;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its one main action, the numbers, the sub-pages, the list, then the settings. */}
      <PageHeader
        title={t("courses.title")}
        description={t("courses.intro")}
        actions={
          has ? (
            <SheetButton target="new-course" icon="add">
              {t("courses.addCourse")}
            </SheetButton>
          ) : null
        }
      />
      {/* 110.2 */}
      <SampleEntries app={app} list="courses" query={await searchParams} />
      {paid && !app.catalogSettings?.payment ? (
        <Notice tone="warn" icon="warning">
          {richText(t("courses.paidNoPayments"), { link: (chunk) => <a href="#h-payments">{chunk}</a> })}
        </Notice>
      ) : null}

      {has ? (
        <StatRow label={t("courses.title")}>
          <Stat icon="school" label={t("courses.title")} value={setup.courses.length} />
          <Stat icon="check_circle" tone="success" label={t("courses.statPublished")} value={published} />
          <Stat icon="visibility_off" tone="warn" label={t("courses.statNotPublished")} value={setup.courses.length - published} hint={waiting ? t("teachers.stage_in_review") + `: ${waiting}` : undefined} />
          <Stat icon="groups" tone="accent" label={t("courses.statStudents")} value={enrollments.length} hint={`${t("courses.statLessons")}: ${lessons}`} />
        </StatRow>
      ) : null}

      <LinkCards
        label={t("courses.toolsLabel")}
        items={[
          // 113.1
          { href: "/dashboard/courses/bundles", icon: "inventory_2", label: t("lms.bundlesOpen"), hint: t("lms.bundlesCount", { count: bundles }) },
          // 113.7 Learning paths, and points and badges.
          { href: "/dashboard/courses/paths", icon: "route", label: t("learning.pathsLink") },
          // 81.4
          { href: "/dashboard/courses/import", icon: "upload", label: t("imports.open") },
        ]}
      />

      {has ? (
        <Section titleId="h-courses" title={t("courses.count", { count: setup.courses.length })} flush>
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("courses.search")}
            noMatch={t("courses.noMatch")}
            filters={[
              { value: "published", label: t("courses.statPublished") },
              { value: "in_review", label: t("teachers.stage_in_review") },
              { value: "other", label: t("courses.statNotPublished") },
            ]}
            items={setup.courses.map((c, i) => {
              const stage = courseStage(c);
              const teacher = c.teacherId ? teacherNames.get(c.teacherId) : null;
              return {
                id: c.id,
                text: [c.title, c.instructorName, teacher].filter(Boolean).join(" "),
                group: stage === "published" || stage === "in_review" ? stage : "other",
                node: (
                  <ItemRow
                    href={`/dashboard/courses/${c.id}`}
                    media={<Thumb src={c.imageAssetId ? assetUrl(c.imageAssetId) : null} icon="school" tint={i} />}
                    title={c.title}
                    badges={<SampleBadge sample={c.sample} />}
                    meta={t("courses.courseLine", {
                      price: c.priceCents ? formatCents(c.priceCents, setup.currency) : t("common.free"),
                      lessons: lessonsOf(c).length,
                      students: students(c.id),
                    })}
                    // 105.3 A teacher's course shows its teacher and where it is.
                    extra={
                      teacher || c.instructorName ? (
                        <span className="flex items-center gap-1">
                          <Icon name="person" size={16} className="text-muted" />
                          {teacher ?? c.instructorName}
                        </span>
                      ) : null
                    }
                    aside={<StageBadge stage={stage} t={t} />}
                  />
                ),
              };
            })}
          />
        </Section>
      ) : null}

      <Sheet id="new-course" inline={!has} title={t("courses.addCourse")} description={has ? t("courses.addCourseHint") : t("courses.noCourses")}>
        <CourseForm
          current={{ title: "", description: "", price: "", instructor: "", level: "", categoryIds: "", active: "on", restart: "on" }}
          others={setup.courses.map((c) => ({ id: c.id, title: c.title }))}
          categories={setup.categories}
          currency={setup.currency}
          imageUrl={null}
          submit={t("courses.addCourseButton")}
        />
      </Sheet>

      <PageGroup title={t("courses.groupSettings")}>
        <div className="flex flex-wrap items-start gap-5">
          <Section titleId="h-course-categories" title={t("courses.categories")} className="flex-[1_1_320px]">
            {setup.categories.length ? (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {setup.categories.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 rounded-full border border-line bg-sand py-1 ps-3.5 pe-1 text-sm font-semibold">
                    {c.name}
                    <form action={deleteCourseCategoryAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <SubmitButton variant="secondary" className="h-7 px-2.5 text-xs">
                        {t("common.delete")}
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}
            <CourseCategoryForm />
          </Section>
          <Section titleId="h-course-currency" title={t("courses.prices")} className="flex-[1_1_260px]">
            <CurrencyForm currency={setup.currency} />
          </Section>
        </div>
      </PageGroup>

      <PageGroup title={t("courses.groupSelling")}>
        <CardPayments app={app} currency={setup.currency} />
        {/* 112.5 Coupons for the paid courses (113.1 and bundles), taken on the payment page; one of 100% enrols at once. */}
        <CouponsPanel coupons={await (await getStore()).listCatalogCoupons(app.id)} currency={setup.currency} intro={t("lms.couponsIntro")} />
        <OtherPayments app={app} />
        <OfflineDownloads app={app} license={license} />
      </PageGroup>
    </div>
  );
}
