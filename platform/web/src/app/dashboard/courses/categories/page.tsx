import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyState, PageHeader } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { courseSetup } from "@/lib/courses/setup";
import { dashboardText } from "@/lib/dashboard-lang";
import { CourseCategoryForm } from "../forms";
import { CoursesTabs } from "../tabs";
import { CourseCategoriesList, type CourseCategoryRow } from "./categories-list";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("courses.categories") };
}

/** 132.15 The academy's course categories on their own page: added, renamed, put in the app's order, each with its courses' count. */
export default async function CourseCategoriesPage() {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const { t } = await dashboardText();
  const setup = courseSetup(app);
  const rows: CourseCategoryRow[] = setup.categories.map((c) => {
    const inIt = setup.courses.filter((course) => course.categoryIds.includes(c.id));
    const pictured = inIt.find((course) => course.imageAssetId);
    return { id: c.id, name: c.name, count: inIt.length, image: pictured?.imageAssetId ? assetUrl(pictured.imageAssetId) : null };
  });
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={t("courses.categories")} description={t("manage.courseCategoriesIntro")} />
      <CoursesTabs app={app} />
      <section aria-labelledby="h-course-categories" className="flex min-w-0 flex-col rounded-2xl border border-line bg-white">
        <div className="flex flex-col gap-3 px-5 pt-5 pb-4 sm:px-6">
          <h2 id="h-course-categories" className="m-0 text-lg font-bold">
            {t("manage.categoriesCount", { count: rows.length })}
          </h2>
          <CourseCategoryForm />
        </div>
        {rows.length ? (
          <CourseCategoriesList categories={rows} />
        ) : (
          <div className="px-5 pb-6 sm:px-6">
            <EmptyState icon="category" title={t("manage.noCategories")}>
              {t("manage.noCourseCategoriesText")}
            </EmptyState>
          </div>
        )}
      </section>
    </div>
  );
}
