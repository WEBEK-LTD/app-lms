import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { stopManagingAction } from "@/app/actions/admin";
import { openStudioProjectAction } from "@/app/actions/studio-projects";
import { SubmitButton } from "@/components/form";
import { richText } from "@/i18n/rich";
import { contentNavOf, kindOf } from "@/lib/app/kinds";
import { contextCan, requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { isStudioProject } from "@/lib/studio/section";
import { pathPermission } from "@/lib/team/permissions";
import { C, Glyph, StudioBar, StudioScreen } from "../chrome";
import { ProjectNav, type ProjectNavGroup } from "./project-nav";

/** A dashboard address in the project's own frame. */
const inStudio = (href: string) => href.replace(/^\/dashboard/, "/studio/project");

/**
 * 103R.3 A Studio project's dashboard: the project switcher, its preview and
 * editor on top, its own side menu, and the dashboard's pages for the
 * project in Studio's frame.
 */
export default async function StudioProjectLayout({ children }: { children: React.ReactNode }) {
  const context = await requireClient();
  const { app, staff, user } = context;
  if (!app || !isStudioProject(app)) redirect("/studio");
  const { t, k, lang, dir } = await dashboardText();
  const projects = context.apps.filter(isStudioProject);
  const content = contentNavOf(app);
  // Each link as the dashboard's page it shows, so the team's permissions apply as there.
  const item = (dashboardHref: string, label: string, icon: string) => ({ dashboardHref, href: inStudio(dashboardHref), label, icon });
  const groups = [
    { items: [item("/dashboard", t("studio.overview"), "space_dashboard"), { ...item("/dashboard/pages", t("studio.navEditor"), "draw"), href: "/studio/editor" }] },
    ...(app.appType === "delivery"
      ? // 104 A delivery company's group, in the approved design's words.
        [
          {
            label: t("studio.navDelivery"),
            items: [
              item("/dashboard/shipments", t("studio.navShipments"), "package_2"),
              item("/dashboard/couriers", t("studio.navCouriers"), "two_wheeler"),
              item("/dashboard/orders", t("studio.navPaidOrders"), "receipt_long"),
              item("/dashboard/delivery", t("studio.navDeliverySettings"), "local_shipping"),
            ],
          },
        ]
      : content
        ? [{ label: k(content.label), items: content.items.map((i) => item(i.href, k(i.label), i.icon)) }]
        : []),
    {
      label: t("studio.groupApp"),
      items: [
        item("/dashboard/setup?step=website", t("studio.navSource"), "hub"),
        item("/dashboard/setup?step=branding", t("studio.navIdentity"), "palette"),
        item("/dashboard/languages", t("studio.navLanguages"), "translate"),
        ...(app.backend === "hosted"
          ? [item("/dashboard/notifications", t("studio.navNotifications"), "notifications")]
          : app.backend === "wordpress"
            ? [item("/dashboard/notifications/campaigns", t("studio.navNotifications"), "notifications")]
            : []),
        item("/dashboard/analytics", t("studio.navAnalytics"), "monitoring"),
      ],
    },
    {
      label: t("studio.groupPublish"),
      items: [
        item("/dashboard/publishing", t("studio.navStores"), "storefront"),
        item("/dashboard/builds", t("studio.navBuilds"), "build"),
        item("/dashboard/license", t("studio.navPlan"), "workspace_premium"),
        item("/dashboard/invoices", t("studio.navInvoices"), "receipt_long"),
        item("/dashboard/setup", t("studio.navSettings"), "settings"),
      ],
    },
  ];
  const allowed: ProjectNavGroup[] = groups
    .map((group) => ({ ...group, items: group.items.filter((i) => contextCan(context, pathPermission(i.dashboardHref))).map(({ href, label, icon }) => ({ href, label, icon })) }))
    .filter((group) => group.items.length);
  const name = app.appName ?? t("studio.untitledProject");
  const bold = { b: (chunk: string) => <strong>{chunk}</strong> };
  return (
    <StudioScreen dir={dir} lang={lang}>
      <StudioBar>
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm" style={{ background: C.barSoft }} aria-label={t("studio.switchProject")}>
            <Glyph name={kindOf(app).icon} size={18} />
            <span>{name}</span>
            <Glyph name="expand_more" size={18} />
          </summary>
          <div className="absolute start-0 top-[calc(100%+6px)] z-20 flex min-w-[240px] flex-col gap-0.5 rounded-xl bg-white p-1.5 shadow-lg" style={{ border: `1px solid ${C.line}`, color: C.ink }}>
            {projects.map((p) => (
              <form key={p.id} action={openStudioProjectAction}>
                <input type="hidden" name="appId" value={p.id} />
                <button
                  type="submit"
                  aria-current={p.id === app.id ? "true" : undefined}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg border-0 px-3 py-2 text-start text-sm hover:bg-[#F4EFE6]"
                  style={{ background: p.id === app.id ? C.ivory : "transparent", fontWeight: p.id === app.id ? 700 : 400, color: C.ink, fontFamily: "inherit" }}
                >
                  <Glyph name={kindOf(p).icon} size={18} />
                  {p.appName ?? t("studio.untitledProject")}
                </button>
              </form>
            ))}
            <Link href="/studio" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline hover:bg-[#F4EFE6]" style={{ color: C.ink }}>
              <Glyph name="apps" size={18} />
              {t("studio.yourProjects")}
            </Link>
          </div>
        </details>
        <div className="flex-[1_1_20px]" />
        <Link href="/studio/project/preview" className="flex h-[38px] items-center gap-1.5 rounded-[10px] px-3.5 text-sm font-semibold no-underline" style={{ border: `1px solid ${C.barLine}`, color: C.ivory }}>
          <Glyph name="play_arrow" size={18} />
          {t("studio.previewOnPhone")}
        </Link>
        <Link href="/studio/editor" className="flex h-[38px] items-center gap-1.5 rounded-[10px] px-[18px] text-sm font-extrabold no-underline" style={{ background: C.accent, color: C.ink }}>
          <Glyph name="draw" size={18} />
          {t("studio.openEditor")}
        </Link>
      </StudioBar>

      <div className="flex flex-1 flex-wrap items-stretch">
        <Suspense>
          <ProjectNav label={t("studio.projectDashboard")} groups={allowed} />
        </Suspense>
        <main id="main" tabIndex={-1} className="box-border flex min-w-0 flex-[999_1_560px] flex-col gap-5 p-6 outline-none">
          {staff ? (
            <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm text-white" style={{ background: C.ink }}>
              <span className="flex items-center gap-2">
                <Glyph name="key" />
                <span>{richText(t("nav.staffApp", { name: user.name, app: name }), bold)}</span>
              </span>
              <form action={stopManagingAction}>
                <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                  {t("nav.backToAdmin")}
                </SubmitButton>
              </form>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </StudioScreen>
  );
}
