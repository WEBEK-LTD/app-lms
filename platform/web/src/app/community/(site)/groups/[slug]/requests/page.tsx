import { redirect } from "next/navigation";
import { cmLinks } from "@/components/community/site/links";
import { cmTarget } from "@/components/community/site/redirect";

/** 232 A private group's requests to join (the notification's link): on its members' page, for its owner and moderators. */
export default async function GroupRequestsPage({ params }: { params: Promise<{ slug: string }> }) {
  redirect(await cmTarget(cmLinks.group(decodeURIComponent((await params).slug), "members")));
}
