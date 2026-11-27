import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { cmTarget } from "@/components/community/site/redirect";

/** 234 "My pro profile" (the notifications' link): one's hire requests, signed out the log-in first. */
export default async function MyProPage() {
  const { viewer } = await siteContext();
  redirect(await cmTarget(viewer ? cmLinks.hireRequests() : cmLinks.signIn(cmLinks.hireRequests())));
}
