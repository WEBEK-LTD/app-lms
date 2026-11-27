import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { MemberMarkdown } from "@/components/community/site/markdown";
import { cmLinks } from "@/components/community/site/links";
import { cmTarget } from "@/components/community/site/redirect";
import { course, lesson, quiz as readQuiz } from "@/components/community/site/next";
import { ApiForm, PageNote } from "@/components/community/site/next-ui";
import { quizAction } from "../../../next-actions";
import { SitePage } from "@/components/community/site/page";
import { fill } from "@/components/community/site/words";
import { CM_WORDS2 } from "@/components/community/site/words2";

export const metadata: Metadata = { title: "Lesson" };

/** An embed address for YouTube or Vimeo links (others play as a file). */
function embed(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  return vm ? `https://player.vimeo.com/video/${vm[1]}` : null;
}

/** 233 A lesson (video or article) with "Mark as done", or a quiz (`quiz-{id}`); a locked course sends the member back to the course. */
export default async function LessonPage({ params, searchParams }: { params: Promise<{ course: string; lesson: string }>; searchParams: Promise<{ error?: string; score?: string; passed?: string }> }) {
  const { course: rawSlug, lesson: rawLesson } = await params;
  const slug = decodeURIComponent(rawSlug);
  const lessonId = decodeURIComponent(rawLesson);
  const sp = await searchParams;
  const { lang, viewer } = await siteContext();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(cmLinks.lesson(slug, lessonId))));
  const w2 = CM_WORDS2[lang];
  const c = await course(slug);
  if (!c) notFound();
  if (c.access !== "open") redirect(await cmTarget(cmLinks.course(c.slug)));
  const back = cmLinks.lesson(c.slug, lessonId);
  const steps = [...c.lessons.map((l) => l.id), ...c.quizzes.map((q) => `quiz-${q.id}`)];
  const at = steps.indexOf(lessonId);
  const nextStep = at >= 0 ? steps[at + 1] : undefined;
  const nav = (
    <div className="cm-row" style={{ justifyContent: "space-between", marginTop: 14 }}>
      <Link href={cmLinks.course(c.slug)} className="cm-btn g"><span className="ms" aria-hidden="true">arrow_back</span>{c.title}</Link>
      {nextStep ? <Link href={cmLinks.lesson(c.slug, nextStep)} className="cm-btn g">{w2.next}<span className="ms" aria-hidden="true">arrow_forward</span></Link> : null}
    </div>
  );
  if (lessonId.startsWith("quiz-")) {
    const summary = c.quizzes.find((q) => `quiz-${q.id}` === lessonId);
    if (!summary) notFound();
    const quiz = await readQuiz(c.slug, summary.id);
    return (
      <SitePage active="academy">
        <section className="cm-card">
          <h1>{w2.quiz}: {summary.title}</h1>
          {sp.score ? <div className={`cm-note ${sp.passed === "1" ? "ok" : "err"}`} role="status">{fill(sp.passed === "1" ? w2.quizPassed : w2.quizFailed, { score: sp.score })}</div> : null}
          <PageNote sp={{ error: sp.error }} w2={w2} />
          <form action={quizAction}>
            <input type="hidden" name="_back" value={back} />
            <input type="hidden" name="course_id" value={c.id} />
            <input type="hidden" name="quiz_id" value={summary.id} />
            {(quiz?.questions ?? []).map((q, i) => (
              <fieldset key={q.id} className="cm-field cm-radios">
                <legend>{i + 1}. {q.text}</legend>
                {q.options.map((o) => <label key={o.id}><input type="radio" name={`q:${q.id}`} value={o.id} required /> {o.text}</label>)}
              </fieldset>
            ))}
            <div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.submitQuiz}</button></div>
          </form>
        </section>
        {nav}
      </SitePage>
    );
  }
  const r = await lesson(c.slug, lessonId);
  if (!r.lesson) notFound();
  const l = r.lesson;
  const src = l.video_url ? embed(l.video_url) : null;
  return (
    <SitePage active="academy">
      <article className="cm-card">
        <div className="cm-muted cm-small">{c.title}</div>
        <h1>{l.title}</h1>
        {l.video_url ? (src ? <div className="cm-player"><iframe src={src} title={l.title} allow="fullscreen; picture-in-picture" allowFullScreen loading="lazy" /></div> : <video className="cm-media-video" src={l.video_url} controls />) : null}
        {l.body ? <MemberMarkdown source={l.body} /> : null}
        <div className="cm-row" style={{ marginTop: 16 }}>
          {l.done ? (
            <span className="pill p-gr"><span className="ms f" aria-hidden="true">check_circle</span>{w2.lessonIsDone}</span>
          ) : (
            <ApiForm call={{ m: "POST", p: `/academy/courses/${encodeURIComponent(c.id)}/lessons/${encodeURIComponent(l.id)}/complete`, back, to: nextStep ? cmLinks.lesson(c.slug, nextStep) : cmLinks.course(c.slug) }}>
              <button type="submit" className="cm-btn o"><span className="ms" aria-hidden="true">check</span>{w2.lessonDone}</button>
            </ApiForm>
          )}
        </div>
      </article>
      {nav}
    </SitePage>
  );
}
