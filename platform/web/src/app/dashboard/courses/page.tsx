import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Notice, PageHeader, btn } from "@/components/ui";
import { Stat, StatRow } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { assetUrl } from "@/lib/assets";
import { Icon } from "@/components/icon";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { courseSetup, lessonsOf } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import { CourseForm } from "./forms";
import { OfflineDownloads } from "./offline";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";
import { courseStage, isTeachersApp } from "@/lib/teachers/service";
import { SampleEntries, type SampleQuery } from "@/components/samples";
import { DEMO_BRANDS } from "@/lib/demo/content";
import { startedFromDemo } from "@/lib/demo/start";
import type { DashKey } from "@/i18n/dashboard";
import { CoursesAnchors, CoursesTabs } from "./tabs";
import { CoursesBrowser, type CourseRowData } from "./courses-browser";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("courses.title") };
}

const STAGE_TONES = { draft: "neutral", in_review: "warn", returned: "info", published: "success", hidden: "neutral" } as const;

/**
 * Courses for Academy apps without a website. 132.13 Only the courses here,
 * found, filtered and opened in their editor; their categories, bundles,
 * learning paths, coupons, payments and the academy's settings each have
 * their own page (the tabs).
 */
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
  const demo = startedFromDemo(app);
  const sampleLabel = demo ? { label: t("start.first.from", { demo: DEMO_BRANDS[demo].appName }), demo } : { label: t("samples.badge"), demo: null };
  const rows: CourseRowData[] = setup.courses.map((c) => {
    const stage = courseStage(c);
    return {
      id: c.id,
      title: c.title,
      image: c.imageAssetId ? assetUrl(c.imageAssetId) : null,
      teacher: (c.teacherId ? teacherNames.get(c.teacherId) : null) ?? c.instructorName ?? null,
      price: c.priceCents ? formatCents(c.priceCents, setup.currency) : t("common.free"),
      cents: c.priceCents,
      lessons: lessonsOf(c).length,
      sections: c.topics.length,
      students: students(c.id),
      stage,
      stageLabel: t(`teachers.stage_${stage}` as DashKey),
      stageTone: STAGE_TONES[stage],
      categoryIds: c.categoryIds,
      created: Date.parse(c.createdAt) || c.id,
      sample: c.sample ? sampleLabel : null,
    };
  });

  return (
    <div className="flex flex-col gap-5">
      <CoursesAnchors />
      <PageHeader
        title={t("courses.title")}
        description={t("courses.intro")}
        actions={
          <>
            {/* 81.4 */}
            <Link href="/dashboard/courses/import" className={`${btn.secondary} h-11`}>
              <Icon name="upload" size={20} />
              {t("imports.title")}
            </Link>
            {has ? (
              <SheetButton target="new-course" icon="add">
                {t("courses.addCourse")}
              </SheetButton>
            ) : null}
          </>
        }
      />
      <CoursesTabs app={app} />
      {/* 110.2 */}
      <SampleEntries app={app} list="courses" query={await searchParams} />
      {paid && !app.catalogSettings?.payment ? (
        <Notice tone="warn" icon="warning">
          {richText(t("manage.paidNoPayments"), { link: (chunk) => <Link href="/dashboard/courses/payments">{chunk}</Link> })}
        </Notice>
      ) : null}

      {has ? (
        <>
          <StatRow label={t("courses.title")}>
            <Stat icon="school" label={t("courses.title")} value={setup.courses.length} />
            <Stat icon="check_circle" tone="success" label={t("courses.statPublished")} value={published} />
            <Stat icon="visibility_off" tone="warn" label={t("courses.statNotPublished")} value={setup.courses.length - published} hint={waiting ? t("teachers.stage_in_review") + `: ${waiting}` : undefined} />
            <Stat icon="groups" tone="accent" label={t("courses.statStudents")} value={enrollments.length} hint={`${t("courses.statLessons")}: ${lessons}`} />
          </StatRow>
          <CoursesBrowser courses={rows} categories={setup.categories} />
        </>
      ) : (
        <div className="rounded-2xl border border-line bg-white p-5 sm:p-6">
          <EmptyState icon="school" title={t("manage.noCoursesTitle")}>
            {t("manage.noCoursesText")}
          </EmptyState>
        </div>
      )}

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
    </div>
  );
}
