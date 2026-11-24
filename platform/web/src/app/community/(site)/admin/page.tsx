import { notFound, redirect } from "next/navigation";
import { adminTabs } from "@/components/community/site/admin";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";

/** 231 The admin opens on its first tab: the verification requests for an admin, the moderation queue for a moderator. */
export default async function AdminIndex() {
  const { viewer } = await siteContext();
  if (!viewer) redirect(cmLinks.signIn(cmLinks.admin()));
  const first = adminTabs(viewer.role)[0];
  if (!first) notFound();
  redirect(cmLinks.admin(first));
}
