import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { cmTarget } from "@/components/community/site/redirect";
import { jobs, myApplications } from "@/components/community/site/next";
import { ApiButton, PageHead, PageNote } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { ago } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "My jobs" };

/** 234 The member's jobs (with their applicants' counts) and their own applications (withdraw). */
export default async function MyJobsPage({ searchParams }: { searchParams: Promise<{ error?: string; done?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(cmLinks.jobsMine())));
  const w2 = CM_WORDS2[lang];
  const [mine, apps] = await Promise.all([jobs({ mine: true }), myApplications()]);
  const st = { sent: w2.app_sent, shortlisted: w2.app_shortlisted, declined: w2.app_declined, withdrawn: w2.app_withdrawn };
  return (
    <SitePage active="jobs">
      <PageHead title={w2.myJobs}><Link href={cmLinks.jobNew()} className="cm-btn o">{w2.postJob}</Link></PageHead>
      <PageNote sp={sp} w2={w2} />
      <section className="cm-card">
        {mine.items.length ? (
          <ul className="cm-hist">
            {mine.items.map((j) => <li key={j.id}><Link href={cmLinks.job(j.id)}>{j.title}</Link><span className="pill p-gy">{j.status === "open" ? w2.openNow : j.status === "closed" ? w2.closed : w2.status_pending}</span><span className="cm-muted cm-small">{w2.applicants}: {j.application_count}</span></li>)}
          </ul>
        ) : <p className="cm-muted">{w2.noJobs}</p>}
      </section>
      <h2 className="cm-h2">{w2.myApplications}</h2>
      <section className="cm-card">
        {apps.items.length ? (
          <ul className="cm-hist">
            {apps.items.map((a) => (
              <li key={a.id}>
                <Link href={cmLinks.job(a.job_id)}>{a.job_title}</Link>
                <span className="pill p-gy">{st[a.status]}</span>
                <span className="cm-muted cm-small">{ago(w, a.created_at)}</span>
                {a.status === "sent" || a.status === "shortlisted" ? <ApiButton call={{ m: "PATCH", p: `/jobs/${encodeURIComponent(a.job_id)}/applications/${encodeURIComponent(a.id)}`, back: cmLinks.jobsMine() }} fields={{ status: "withdrawn" }} className="cm-link" label={w2.withdraw} /> : null}
              </li>
            ))}
          </ul>
        ) : <p className="cm-muted">{w2.noApplications}</p>}
      </section>
    </SitePage>
  );
}
