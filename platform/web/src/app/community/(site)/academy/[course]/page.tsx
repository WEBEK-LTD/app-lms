import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import { course } from "@/components/community/site/next";
import { Poll } from "@/components/community/site/next-client";
import { ApiForm, PageNote } from "@/components/community/site/next-ui";
import { SitePage } from "@/components/community/site/page";
import { fill } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

type Props = { params: Promise<{ course: string }>; searchParams: Promise<{ checkout?: string; error?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await course(decodeURIComponent((await params).course));
  return c ? { title: c.title, description: c.summary } : {};
}

/** 233 A course: its lessons and quizzes, progress, the certificate, and (locked) the website's checkout. */
export default async function CoursePage({ params, searchParams }: Props) {
  const slug = decodeURIComponent((await params).course);
  const sp = await searchParams;
  const { lang, w, viewer } = await siteContext();
  const w2 = CM_WORDS2[lang];
  const c = await course(slug);
  if (!c) notFound();
  const open = c.access === "open";
  const pending = sp.checkout === "done" && !open;
  const back = cmLinks.course(c.slug);
  const first = c.lessons.find((l) => !l.done) ?? c.lessons[0];
  const pct = Math.round((c.progress ?? 0) * 100);
  return (
    <SitePage active="academy">
      {pending ? <Poll seconds={3} /> : null}
      <section className="cm-card cm-course-head">
        <div className="cm-row" style={{ gap: 6 }}>
          <span className="pill p-gy">{w[`level_${c.level}`]}</span>
          <span className="pill p-gy">{fill(w2.lessons, { n: c.lesson_count })}</span>
          {open ? <span className="pill p-gr">{c.free ? w2.free : w2.open}</span> : null}
        </div>
        <h1>{c.title}</h1>
        <p className="cm-body">{c.description || c.summary}</p>
        {pending ? <div className="cm-note" role="status"><span className="ms" aria-hidden="true">hourglass_top</span>{w2.paymentPending}</div> : null}
        {sp.checkout === "cancelled" ? <div className="cm-note" role="status">{w2.paymentCancelled}</div> : null}
        <PageNote sp={{ error: sp.error }} w2={w2} />
        {open ? (
          <>
            {pct > 0 ? <div className="cm-bar lg" aria-label={fill(w2.progress, { n: pct })}><i style={{ width: `${pct}%` }} /></div> : null}
            {first ? <Link href={cmLinks.lesson(c.slug, first.id)} className="cm-btn o">{pct > 0 ? w2.continueCourse : w2.startCourse}</Link> : null}
          </>
        ) : !viewer ? (
          <Link href={cmLinks.signIn(back)} className="cm-btn o">{w2.signInToBuy}</Link>
        ) : (
          <ApiForm call={{ m: "POST", p: `/academy/courses/${encodeURIComponent(c.id)}/checkout`, back }}>
            <button type="submit" className="cm-btn o"><span className="ms" aria-hidden="true">lock_open</span>{c.price_label ? fill(w2.buyCourse, { price: c.price_label }) : w2.startCourse}</button>
          </ApiForm>
        )}
        {c.certificate ? (
          <div className="cm-note ok" style={{ marginTop: 14 }}>
            <span className="ms" aria-hidden="true">workspace_premium</span>{w2.certificateEarned}
            <Link href={cmLinks.certificate(c.certificate.code)} className="cm-link">{w2.verifyLink}</Link>
            <a href={c.certificate.pdf_url} className="cm-link">{w2.downloadPdf}</a>
          </div>
        ) : null}
      </section>
      <section className="cm-card">
        <ol className="cm-lessons">
          {c.lessons.map((l, i) => (
            <li key={l.id} className={l.done ? "done" : ""}>
              <span className="n">{l.done ? <span className="ms f" aria-label={w2.lessonIsDone}>check_circle</span> : i + 1}</span>
              {open ? <Link href={cmLinks.lesson(c.slug, l.id)}>{l.title}</Link> : <span>{l.title} <span className="ms" aria-label={w2.locked}>lock</span></span>}
              <span className="cm-muted cm-small"><span className="ms" aria-hidden="true">{l.kind === "video" ? "play_circle" : "article"}</span>{fill(w2.minutes, { n: l.minutes })}</span>
            </li>
          ))}
          {c.quizzes.map((q) => (
            <li key={q.id} className={q.passed ? "done" : ""}>
              <span className="n"><span className={`ms${q.passed ? " f" : ""}`} aria-hidden="true">{q.passed ? "check_circle" : "quiz"}</span></span>
              {open ? <Link href={`${cmLinks.lesson(c.slug, `quiz-${q.id}`)}`}>{w2.quiz}: {q.title}</Link> : <span>{w2.quiz}: {q.title}</span>}
            </li>
          ))}
        </ol>
      </section>
    </SitePage>
  );
}
