import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { StudioConsole } from "../console";

/**
 * 132.50 The account's own pages (Your account, Team) in Studio's frame,
 * so someone working in Studio never lands in the regular dashboard's menu
 * to change their password or invite their team. 132.150 In Studio's
 * console, as a project's pages: the account's group open in the panel
 * (Your account and Team among the account's pages), the way back to the
 * project in the bar.
 */
export default async function StudioAccountLayout({ children }: { children: React.ReactNode }) {
  const context = await requireClient();
  const text = await dashboardText();
  return (
    <StudioConsole context={context} text={text}>
      {children}
    </StudioConsole>
  );
}
