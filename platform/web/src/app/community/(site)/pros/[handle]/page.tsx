import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/community/site/avatar";
import { MemberName } from "@/components/community/site/cards";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { pro, proReviews } from "@/components/community/site/next";
import { ApiForm, PageNote, ShowcaseCard } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { ago, fill } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<{ error?: string; done?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await pro(decodeURIComponent((await params).handle));
  return p ? { title: `${p.member.name}: ${p.headline}` } : {};
}

/** 234 A pro profile: services and rates (as text), skills, availability, portfolio from the showcase, reviews, and a hire request (it becomes a message thread). */
export default async function ProPage({ params, searchParams }: Props) {
  const handle = decodeURIComponent((await params).handle);
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const [p, reviews] = await Promise.all([pro(handle), proReviews(handle)]);
  if (!p) notFound();
  const back = cmLinks.pro(handle);
  const self = viewer?.id === p.member.id;
  const avail = { available: w2.available, busy: w2.busy, unavailable: w2.unavailable };
  return (
    <SitePage active="pros">
      <section className="cm-card cm-pro-head">
        <Avatar member={p.member} size={72} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <MemberName member={p.member} w={w} />
          <h1>{p.headline}</h1>
          <div className="cm-row" style={{ gap: 8 }}>
            <span className={`pill ${p.availability === "available" ? "p-gr" : "p-gy"}`}>{avail[p.availability]}</span>
            {p.rating !== null ? <span className="cm-small"><span className="ms f" aria-hidden="true">star</span>{p.rating.toFixed(1)} · {p.review_count} {w2.reviews}</span> : null}
            <span className="cm-muted cm-small">{fill(w2.jobsDone, { n: p.done_count })}</span>
          </div>
        </div>
        {self ? <Link href={cmLinks.proEdit()} className="cm-btn g">{w2.editPro}</Link> : null}
      </section>
      <PageNote sp={sp} w2={w2} doneText={{ hired: w2.hireSent }} />
      {p.about ? <section className="cm-card"><h2>{w2.about}</h2><p className="cm-body">{p.about}</p></section> : null}
      <section className="cm-card">
        <h2>{w2.services}</h2>
        <ul className="cm-services">
          {p.services.map((s, i) => (
            <li key={i}><b>{s.title}</b>{s.rate ? <span className="pill p-gy">{s.rate}</span> : null}{s.description ? <p className="cm-muted">{s.description}</p> : null}</li>
          ))}
        </ul>
        {p.skills.length ? <div className="skills" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>{p.skills.map((s) => <span key={s} className="cm-tag">{s}</span>)}</div> : null}
      </section>
      {p.portfolio.length ? (
        <section className="cm-card"><h2>{w2.portfolio}</h2><div className="cm-grid3" style={{ marginTop: 12 }}>{p.portfolio.map((it) => <ShowcaseCard key={it.id} item={it} w2={w2} />)}</div></section>
      ) : null}
      {!self ? (
        viewer ? (
          <ApiForm call={{ m: "POST", p: `/pros/${encodeURIComponent(p.member.id)}/hire`, back, to: cmLinks.hireRequests("sent"), done: "hired" }} className="cm-card">
            <h2>{w2.hire}</h2>
            {p.services.length ? <label className="cm-field">{w2.serviceTitle}<select name="service">{p.services.map((s, i) => <option key={i} value={s.title}>{s.title}</option>)}</select></label> : null}
            <label className="cm-field">{w2.hireMessage}<textarea name="message" required minLength={10} maxLength={4000} /></label>
            <p className="cm-muted cm-small">{w2.noMoneyNote}</p>
            <div className="cm-row" style={{ marginTop: 12 }}><button type="submit" className="cm-btn o"><span className="ms" aria-hidden="true">send</span>{w2.hire}</button></div>
          </ApiForm>
        ) : <Link href={cmLinks.signIn(back)} className="cm-btn o">{w2.hire}</Link>
      ) : null}
      <section className="cm-card">
        <h2>{w2.reviews}</h2>
        {reviews.items.length ? (
          <ul className="cm-cmts">
            {reviews.items.map((r, i) => (
              <li key={i}><div className="cm-cmt">{r.client ? <Avatar member={r.client} size={32} /> : null}<div><div className="cm-row" style={{ gap: 6 }}>{r.client ? <MemberName member={r.client} w={w} /> : null}<span className="cm-stars" aria-label={`${r.rating}/5`}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span><span className="cm-muted cm-small">{ago(w, r.created_at)}</span></div>{r.text ? <p>{r.text}</p> : null}</div></div></li>
            ))}
          </ul>
        ) : <p className="cm-muted">{w2.noReviews}</p>}
      </section>
    </SitePage>
  );
}
