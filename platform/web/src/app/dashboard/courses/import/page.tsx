import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ImportForm } from "@/components/import-form";
import { Notice, PageHeader } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { importKindOf } from "@/lib/import/kinds";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("imports.title") };
}

/** 81.4 Import courses from a CSV file or a feed; the page kit's header, with the columns read in a note. */
export default async function ImportCoursesPage() {
  const { app } = await requireClient("catalog");
  const { t } = await dashboardText();
  // Another kind of app, or one whose courses come from its website: back to its list (as ImportView does).
  if (!app || importKindOf(app) !== "courses") redirect(app && importKindOf(app) === "products" ? "/dashboard/catalog" : app && importKindOf(app) === "services" ? "/dashboard/services" : "/dashboard");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader back={{ href: "/dashboard/courses", label: t("courses.backToCourses") }} title={t("imports.titleCourses")} description={t("imports.intro")} />
      <div className="max-w-[720px]">
        <Notice tone="neutral" icon="list">
          {t("imports.columnsCourses")} {t("imports.columnsLanguages")}
        </Notice>
      </div>
      <ImportForm />
    </div>
  );
}
