import { redirect } from "next/navigation";
import { cmLinks } from "@/components/community/site/links";
import { cmTarget } from "@/components/community/site/redirect";

/** 234 A job's applicants (the notification's link): they're on the job's own page, for its poster. */
export default async function JobApplicantsPage({ params }: { params: Promise<{ id: string }> }) {
  redirect(await cmTarget(cmLinks.job((await params).id)));
}
