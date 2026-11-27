import type { Metadata } from "next";
import Link from "next/link";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { jobs } from "@/components/community/site/next";
import { Empty, More, PageHead, Who, withCursor } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { ago } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";
import { JOB_TYPES } from "./job-form";

export const metadata: Metadata = { title: "Jobs" };

/** 234 Open jobs, newest first, by type and remote, with search. */
export default async function JobsPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; remote?: string; cursor?: string }> }) {
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const type = JOB_TYPES.find((t) => t === sp.type);
  const remote = sp.remote === "1";
  const list = await jobs({ q: sp.q, type, remote: remote || undefined, cursor: sp.cursor });
  const here = cmLinks.jobs({ q: sp.q, type, remote: remote ? "1" : undefined });
  return (
    <SitePage active="jobs">
      <PageHead title={w2.jobsTitle} intro={w2.jobsIntro}>
        {viewer ? <Link href={cmLinks.jobsMine()} className="cm-btn g">{w2.myJobs}</Link> : null}
        <Link href={viewer ? cmLinks.jobNew() : cmLinks.signIn(cmLinks.jobNew())} className="cm-btn o"><span className="ms" aria-hidden="true">add</span>{w2.postJob}</Link>
      </PageHead>
      <form className="cm-tabs cm-filter" action={cmLinks.jobs()} role="search">
        <input type="search" name="q" defaultValue={sp.q ?? ""} placeholder={w2.search} aria-label={w2.search} />
        <select name="type" defaultValue={type ?? ""} aria-label={w2.jobType}><option value="">{w2.allTypes}</option>{JOB_TYPES.map((t) => <option key={t} value={t}>{w2[`jt_${t}`]}</option>)}</select>
        <label className="cm-check"><input type="checkbox" name="remote" value="1" defaultChecked={remote} /> {w2.remote}</label>
        <button type="submit" className="cm-btn g">{w2.search}</button>
      </form>
      {list.items.length ? (
        list.items.map((j) => (
          <Link key={j.id} href={cmLinks.job(j.id)} className="cm-post cm-job">
            <Who member={j.poster} w={w} sub={ago(w, j.created_at)} size={36} />
            <h3>{j.title}</h3>
            <div className="cm-row" style={{ gap: 6 }}>
              <span className="pill p-gy">{w2[`jt_${j.type}`]}</span>
              {j.remote ? <span className="pill p-gy">{w2.remote}</span> : null}
              {j.location ? <span className="pill p-gy"><span className="ms" aria-hidden="true">location_on</span>{j.location}</span> : null}
              {j.budget ? <span className="pill p-gy">{j.budget}</span> : null}
              <span className="cm-muted cm-small">{w2.applicants}: {j.application_count}</span>
            </div>
            {j.skills.length ? <div className="cm-muted cm-small" style={{ marginTop: 8 }}>{j.skills.slice(0, 6).join(" · ")}</div> : null}
          </Link>
        ))
      ) : <Empty icon="business_center" text={w2.noJobs} />}
      <More href={withCursor(here, list.next)} w2={w2} />
    </SitePage>
  );
}
