import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { cmTarget } from "@/components/community/site/redirect";
import { ApiForm, PageHead, PageNote } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { CM_WORDS2 } from "@/components/community/site/words2";
import { JobFields } from "../job-form";

export const metadata: Metadata = { title: "Post a job" };

/** 234 Post a job (a new member's first ones are checked by a moderator). */
export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const { lang, viewer } = await siteContext();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(cmLinks.jobNew())));
  const w2 = CM_WORDS2[lang];
  return (
    <SitePage active="jobs">
      <PageHead title={w2.postJob} />
      <PageNote sp={sp} w2={w2} />
      <ApiForm call={{ m: "POST", p: "/jobs", back: cmLinks.jobNew(), to: cmLinks.job("{id}") }} className="cm-card">
        <JobFields w2={w2} />
        <div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.postJob}</button></div>
      </ApiForm>
    </SitePage>
  );
}
