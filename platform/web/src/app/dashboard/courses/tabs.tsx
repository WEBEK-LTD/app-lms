import type { App } from "@/lib/data/types";
import { bundlesOf } from "@/lib/courses/bundles";
import { courseSetup } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { AnchorRedirect, SectionTabs } from "@/components/manage-kit-client";

/**
 * 132.13 Courses, each job on its own page: the courses, their categories,
 * bundles, learning paths, coupons, payments and the academy's settings.
 * The tabs under each page's header.
 */
export async function CoursesTabs({ app }: { app: App }) {
  const { t } = await dashboardText();
  const setup = courseSetup(app);
  const coupons = await (await getStore()).listCatalogCoupons(app.id);
  return (
    <SectionTabs
      label={t("courses.title")}
      items={[
        { href: "/dashboard/courses", label: t("courses.title"), icon: "school", count: setup.courses.length },
        { href: "/dashboard/courses/categories", label: t("courses.categories"), icon: "category", count: setup.categories.length },
        { href: "/dashboard/courses/bundles", label: t("manage.bundles"), icon: "inventory_2", count: bundlesOf(setup).length },
        { href: "/dashboard/courses/paths", label: t("learning.paths"), icon: "route", count: (setup.paths ?? []).length },
        { href: "/dashboard/courses/coupons", label: t("shop.coupons"), icon: "local_offer", count: coupons.length },
        // 132.120 The one Payments page, a tab away (it isn't a copy).
        { href: "/dashboard/payments", label: t("manage.payments"), icon: "payments" },
        { href: "/dashboard/courses/settings", label: t("manage.settings"), icon: "settings" },
      ]}
    />
  );
}

/** 132.13 The old long page's parts, at their own pages now (`/dashboard/courses#h-payments`). */
export function CoursesAnchors() {
  return (
    <AnchorRedirect
      map={{
        "h-course-categories": "/dashboard/courses/categories",
        "h-course-currency": "/dashboard/courses/settings",
        "h-offline": "/dashboard/courses/settings",
        "h-payments": "/dashboard/payments",
        "h-other-payments": "/dashboard/payments",
        "h-coupons": "/dashboard/courses/coupons",
        "new-coupon": "/dashboard/courses/coupons",
      }}
    />
  );
}
