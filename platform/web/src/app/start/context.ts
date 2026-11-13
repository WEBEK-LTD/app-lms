import "server-only";
import { notFound, redirect } from "next/navigation";
import { getAdminRole, getClientContext, getCurrentUser, signInPath, type ClientContext } from "@/lib/auth/session";
import type { DemoId } from "@/lib/demo/constants";
import { demoOfSlug } from "@/lib/demo/picker";

/**
 * 127 A demo's page and its "Make it yours" (/start/<demo>): for a signed-in
 * client whose account is active; an account with apps already adds one.
 */
export async function pickerContext(slug: string): Promise<{ context: ClientContext; demo: DemoId; adding: boolean }> {
  const user = await getCurrentUser();
  if (!user) redirect(await signInPath());
  if (await getAdminRole()) redirect("/admin");
  const context = await getClientContext();
  if (!context || context.client.status !== "active") redirect("/pending");
  const demo = demoOfSlug(slug);
  if (!demo) notFound();
  return { context, demo, adding: context.apps.length > 0 };
}
