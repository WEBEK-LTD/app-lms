import { redirect } from "next/navigation";
import type { ClientContext } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { importKindOf } from "@/lib/import/kinds";
import type { ImportKind } from "@/lib/import/plan";
import { ImportForm } from "./import-form";
import { PageHeader } from "./ui";

const LIST: Record<ImportKind, string> = { products: "/dashboard/catalog", services: "/dashboard/services", courses: "/dashboard/courses" };

/**
 * 81.4 Import, as Products, Services and Courses each show it (their own
 * address and permission): a shop's products (a restaurant's menu), a
 * bookings app's services, an academy's courses, from a CSV file or a feed.
 */
export async function ImportView({ context, kind }: { context: ClientContext; kind: ImportKind }) {
  const { t } = await dashboardText();
  const app = context.app;
  // Another kind of app, or one whose content comes from its website: back to its list.
  if (!app || importKindOf(app) !== kind) redirect(app && importKindOf(app) ? LIST[importKindOf(app)!] : "/dashboard");
  const title =
    kind === "services" ? t("imports.titleServices") : kind === "courses" ? t("imports.titleCourses") : app.vertical === "restaurant" ? t("imports.titleMenu") : t("imports.titleProducts");
  const columns = kind === "services" ? t("imports.columnsServices") : kind === "courses" ? t("imports.columnsCourses") : t("imports.columnsProducts");
  const kindWord = app.vertical === "clinic" ? "clinic" : app.vertical === "fitness" ? "fitness" : "other";
  const back = kind === "services" ? t("bookings.page", { kind: kindWord }) : kind === "courses" ? t("courses.backToCourses") : t("shop.page", { kind: app.vertical === "restaurant" ? "restaurant" : "shop" });
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header with the way back to the list, then the steps. */}
      <PageHeader
        back={{ href: LIST[kind], label: back }}
        title={title}
        description={
          <>
            <p className="m-0">{t("imports.intro")}</p>
            <p className="m-0 mt-1.5">
              {columns} {t("imports.columnsLanguages")}
            </p>
          </>
        }
      />
      <ImportForm />
    </div>
  );
}
