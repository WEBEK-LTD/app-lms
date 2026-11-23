import { redirect } from "next/navigation";
import { MovedAppNotice } from "@/components/moved-app";
import { ShopPauseNotice } from "@/components/shop-pause";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { isStudioProject } from "@/lib/studio/section";
import { StudioConsole } from "../console";
import { LiabilityNotice } from "@/components/liability-notice";

/**
 * 103R.3 A Studio project's dashboard: the dashboard's pages for the
 * project in Studio's frame. 132.1 The menu has every page of the dashboard
 * that applies to the project (lib/studio/project-nav.ts), 132.2 a quick
 * search, and 132.4 the frame is light or dark like the dashboard. 132.150
 * The frame is Studio's console (../console.tsx): the rail of the menu's
 * groups, the panel of the group open, the page on its canvas.
 */
export default async function StudioProjectLayout({ children }: { children: React.ReactNode }) {
  const context = await requireClient();
  const { app } = context;
  if (!app || !isStudioProject(app)) redirect("/studio");
  const text = await dashboardText();
  return (
    // 132.112 An app that moved to another account stays to read.
    <StudioConsole context={context} text={text} notice={
        <>
          <MovedAppNotice app={app} text={text} />
          {/* 214 Paused from Yallapp Business, with Reopen now. */}
          <ShopPauseNotice app={app} text={text} />
        </>
      }>
      {children}
      {/* 208 A shop type's liability notice, until the owner accepts it. */}
      <LiabilityNotice app={app} text={text} member={context.member !== null} />
    </StudioConsole>
  );
}
