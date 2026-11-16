import "server-only";
import { notFound, redirect } from "next/navigation";
import { getAdminRole, getClientContext, getCurrentUser, mayUseDashboard, signInPath, teamOutsideClientPath, type ClientContext } from "@/lib/auth/session";
import type { DemoId } from "@/lib/demo/constants";
import { demoOfSlug } from "@/lib/demo/picker";

/**
 * 127 A demo's page and its "Make it yours" (/start/<demo>): for a signed-in
 * client whose account is active, and 132.110 our team working in a
 * client's account; an account with apps already adds one.
 */
export async function pickerContext(slug: string): Promise<{ context: ClientContext; demo: DemoId; adding: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect(await signInPath());
  const context = await getClientContext();
  // 132.110 Our team works in a client's account as the client does (any account, active or not); outside one, the admin says why.
  if (!context && (await getAdminRole())) redirect(await teamOutsideClientPath());
  if (!context || !mayUseDashboard(context)) redirect("/pending");
  const demo = demoOfSlug(slug);
  if (!demo) notFound();
  return { context, demo, adding: context.apps.length > 0 };
}
