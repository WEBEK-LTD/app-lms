import Link from "next/link";
import { contextCan, requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { isStudioProject } from "@/lib/studio/section";
import { StudioAccountMenu } from "../account-menu";
import { C, Glyph, StudioBar, StudioScreen } from "../chrome";
import { StudioDashboardLinks } from "../project/dashboard-links";
import { AccountTabs } from "./tabs";

/**
 * 132.50 The account's own pages (Your account, Team) in Studio's frame:
 * the dark bar with the way back to the project, and the dashboard's page
 * below, so someone working in Studio never lands in the regular
 * dashboard's menu to change their password or invite their team.
 */
export default async function StudioAccountLayout({ children }: { children: React.ReactNode }) {
  const context = await requireClient();
  const { t, lang, dir } = await dashboardText();
  const project = context.app && isStudioProject(context.app) ? context.app : null;
  return (
    // 132.4 Light or dark like the project's frame and the dashboard.
    <StudioScreen dir={dir} lang={lang} themed>
      {/* The pages' links to the dashboard open the same page in Studio's frame. */}
      {project ? <StudioDashboardLinks /> : null}
      <StudioBar>
        <Link
          href={project ? "/studio/project" : "/studio"}
          className="flex h-[34px] min-w-0 items-center gap-1.5 rounded-[10px] px-3 text-sm no-underline"
          style={{ background: C.barSoft, color: C.ivory }}
          data-studio-back=""
        >
          <Glyph name="arrow_back" size={18} flip />
          <span className="max-w-[40vw] truncate">{project ? (project.appName ?? t("studio.untitledProject")) : t("studio.yourProjects")}</span>
        </Link>
        <div className="flex-[1_1_20px]" />
        <StudioAccountMenu />
      </StudioBar>
      <main id="main" tabIndex={-1} className="mx-auto box-border flex w-full max-w-[1120px] flex-1 flex-col gap-6 px-4 pt-6 pb-12 outline-none sm:px-6">
        <AccountTabs labels={{ group: t("studioKit.accountPages"), account: t("account.nav"), team: t("team.nav") }} team={contextCan(context, "team")} />
        {children}
      </main>
    </StudioScreen>
  );
}
