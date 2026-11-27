import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { job, jobApplications } from "@/components/community/site/next";
import { ApiButton, ApiForm, PageNote, Who } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { ago } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";
import { JobFields } from "../job-form";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string; error?: string; pending?: string; done?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const j = await job((await params).id);
  return j ? { title: j.title, description: j.description.slice(0, 160) } : {};
}

/** 234 A job: apply with a message and portfolio links; its poster sees the applicants, shortlists or declines, and closes it. */
export default async function JobPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const j = await job(id);
  if (!j) notFound();
  const poster = viewer?.id === j.poster.id;
  const apps = poster ? await jobApplications(j.id) : { items: [], next: null };
  const back = cmLinks.job(j.id);
  const p = `/jobs/${encodeURIComponent(j.id)}`;
  const st = { sent: w2.app_sent, shortlisted: w2.app_shortlisted, declined: w2.app_declined, withdrawn: w2.app_withdrawn };
  return (
    <SitePage active="jobs">
      <PageNote sp={sp} w2={w2} pendingText={w2.jobPending} doneText={{ applied: w2.applied }} />
      <article className="cm-card">
        <Who member={j.poster} w={w} sub={ago(w, j.created_at)} size={36} />
        <h1 style={{ marginTop: 10 }}>{j.title}</h1>
        <div className="cm-row" style={{ gap: 6, marginTop: 8 }}>
          <span className="pill p-gy">{w2[`jt_${j.type}`]}</span>
          {j.remote ? <span className="pill p-gy">{w2.remote}</span> : null}
          {j.location ? <span className="pill p-gy"><span className="ms" aria-hidden="true">location_on</span>{j.location}</span> : null}
          {j.budget ? <span className="pill p-gy">{j.budget}</span> : null}
          {j.status !== "open" ? <span className="pill p-or">{j.status === "closed" ? w2.closed : w2.status_pending}</span> : null}
        </div>
        <p className="cm-body">{j.description}</p>
        {j.skills.length ? <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{j.skills.map((s) => <span key={s} className="cm-tag">{s}</span>)}</div> : null}
        {poster ? (
          <div className="cm-row" style={{ marginTop: 16 }}>
            <Link href={`${back}?edit=1`} className="cm-btn g"><span className="ms" aria-hidden="true">edit</span>{w2.edit}</Link>
            <ApiButton call={{ m: "PATCH", p, back }} fields={{ status: j.status === "closed" ? "open" : "closed" }} className="cm-btn g" label={j.status === "closed" ? w2.reopenJob : w2.closeJob} />
            <ApiButton call={{ m: "DELETE", p, back, to: cmLinks.jobsMine() }} className="cm-link" icon="delete" label={w2.delete} />
          </div>
        ) : null}
      </article>
      {poster && sp.edit ? (
        <ApiForm call={{ m: "PATCH", p, back, done: "saved" }} className="cm-card"><JobFields w2={w2} job={j} /><div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.saveChanges}</button></div></ApiForm>
      ) : null}
      {!poster && j.status === "open" ? (
        j.applied ? <div className="cm-note ok"><span className="ms" aria-hidden="true">check_circle</span>{w2.applied}</div> : viewer ? (
          <ApiForm call={{ m: "POST", p: `${p}/applications`, back, done: "applied" }} className="cm-card">
            <h2>{w2.apply}</h2>
            <label className="cm-field">{w2.applyMessage}<textarea name="message" required minLength={10} maxLength={4000} /></label>
            <label className="cm-field">{w2.applyLinks}<textarea name="l:links" rows={3} placeholder="https://" /></label>
            <div className="cm-row" style={{ marginTop: 12 }}><button type="submit" className="cm-btn o">{w2.apply}</button></div>
          </ApiForm>
        ) : <Link href={cmLinks.signIn(back)} className="cm-btn o">{w2.apply}</Link>
      ) : null}
      {poster ? (
        <section className="cm-card">
          <h2>{w2.applicants}</h2>
          {apps.items.length ? apps.items.map((a) => (
            <div key={a.id} className="cm-app-row">
              <div className="cm-row"><div style={{ flex: 1, minWidth: 0 }}><Who member={a.applicant} w={w} sub={ago(w, a.created_at)} size={32} /></div><span className="pill p-gy">{st[a.status]}</span></div>
              <p className="cm-body">{a.message}</p>
              {a.links.length ? <ul className="cm-links">{a.links.map((l) => <li key={l}><a href={l} target="_blank" rel="noopener nofollow ugc" className="cm-link"><span className="ms" aria-hidden="true">link</span>{l}</a></li>)}</ul> : null}
              {a.status === "sent" ? (
                <div className="cm-row">
                  <ApiButton call={{ m: "PATCH", p: `${p}/applications/${encodeURIComponent(a.id)}`, back }} fields={{ status: "shortlisted" }} className="cm-btn o sm" label={w2.shortlist} />
                  <ApiButton call={{ m: "PATCH", p: `${p}/applications/${encodeURIComponent(a.id)}`, back }} fields={{ status: "declined" }} className="cm-btn g sm" label={w2.decline} />
                </div>
              ) : null}
            </div>
          )) : <p className="cm-muted">{w2.noApplicants}</p>}
        </section>
      ) : null}
    </SitePage>
  );
}
