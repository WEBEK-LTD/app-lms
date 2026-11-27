import type { Metadata } from "next";
import Link from "next/link";
import { AdminPage, adminContext } from "@/components/community/site/admin";
import { cmLinks } from "@/components/community/site/links";
import { ApiButton, ApiForm, PageNote } from "@/components/community/site/next-ui";
import { communityApi } from "@/lib/community/site-client";
import { CM_WORDS2 } from "@/components/community/site/words2";
import { quizAuthorAction } from "../../next-actions";
import { PriceForm } from "./amount";

export const metadata: Metadata = { title: "Academy", robots: { index: false } };

type QuizQuestion = { prompt: string; options: string[]; answer: number };
type AdminLesson = { id: string; title: string; kind: "video" | "article"; body?: string; video_url?: string; duration_seconds?: number; position?: number; quiz: QuizQuestion[] };
type AdminCourse = { id: string; slug: string; title: string; summary: string; cover_url: string | null; level: "beginner" | "intermediate" | "advanced"; language: string; status: "draft" | "published"; free: boolean; lessons: AdminLesson[] };
type CourseRow = { id: string; slug: string; title: string; status: "draft" | "published"; free: boolean; lesson_count: number; updated_at: string };

const quizText = (q: QuizQuestion[]) => q.map((x) => [x.prompt, ...x.options.map((o, i) => (i === x.answer ? `*${o}` : o))].join(" | ")).join("\n");

/** 233 The admin's academy: courses (draft or published, free or priced), their lessons (video or article) and each lesson's quiz. */
export default async function AdminAcademyPage({ searchParams }: { searchParams: Promise<{ id?: string; error?: string; done?: string }> }) {
  const sp = await searchParams;
  const { lang, w } = await adminContext("academy");
  const w2 = CM_WORDS2[lang];
  const back = cmLinks.admin("academy");
  const list = await communityApi<{ items: CourseRow[] }>("GET", "/admin/academy/courses");
  const rows = list.status === 200 ? list.body.items : [];
  const open = sp.id ? await communityApi<AdminCourse>("GET", `/admin/academy/courses/${encodeURIComponent(sp.id)}`) : null;
  const c = open && open.status === 200 ? open.body : null;
  const here = c ? `${back}?id=${encodeURIComponent(c.id)}` : back;
  const courseFields = (x?: AdminCourse) => (
    <>
      <label className="cm-field">{w2.title}<input name="title" required minLength={3} maxLength={160} defaultValue={x?.title ?? ""} /></label>
      <label className="cm-field">{w2.tutorialSummary}<textarea name="summary" maxLength={2000} defaultValue={x?.summary ?? ""} /></label>
      <div className="cm-row" style={{ gap: 14 }}>
        <label className="cm-field" style={{ flex: 1 }}>{w2.level}<select name="level" defaultValue={x?.level ?? "beginner"}>{(["beginner", "intermediate", "advanced"] as const).map((l) => <option key={l} value={l}>{w[`level_${l}`]}</option>)}</select></label>
        <label className="cm-field" style={{ flex: 1 }}>{w.language}<select name="language" defaultValue={x?.language ?? "en"}><option value="en">English</option><option value="ar">العربية</option><option value="tr">Türkçe</option></select></label>
        <label className="cm-field" style={{ flex: 1 }}>{w2.status}<select name="status" defaultValue={x?.status ?? "draft"}><option value="draft">{w2.inReview}</option><option value="published">{w2.published}</option></select></label>
      </div>
      <label className="cm-field">{w2.cover}<input type="url" name="cover_url" defaultValue={x?.cover_url ?? ""} placeholder="https://" /></label>
      <input type="hidden" name="b:free" value="0" />
      <label className="cm-check" style={{ marginTop: 12 }}><input type="checkbox" name="b:free" value="1" defaultChecked={x?.free ?? false} /> {w2.courseFree}</label>
    </>
  );
  const lessonFields = (l?: AdminLesson) => (
    <>
      <label className="cm-field">{w2.title}<input name="title" required minLength={3} maxLength={160} defaultValue={l?.title ?? ""} /></label>
      <div className="cm-row" style={{ gap: 14 }}>
        <label className="cm-field" style={{ flex: 1 }}>{w2.eventKind}<select name="kind" defaultValue={l?.kind ?? "video"}><option value="video">{w.videoKind}</option><option value="article">{w.article}</option></select></label>
        <label className="cm-field" style={{ flex: 2 }}>{w2.videoUrl}<input type="url" name="video_url" defaultValue={l?.video_url ?? ""} placeholder="https://" /></label>
        <label className="cm-field" style={{ flex: 1 }}>{w2.minutes.replace("{n} ", "")}<input type="number" name="n:duration_seconds" min={0} defaultValue={l?.duration_seconds ?? ""} /></label>
      </div>
      <label className="cm-field">{w2.tutorialBody}<textarea name="body" maxLength={50000} defaultValue={l?.body ?? ""} /></label>
    </>
  );
  return (
    <AdminPage w={w} tab="academy">
      <PageNote sp={sp} w2={w2} />
      {c ? (
        <>
          <ApiForm call={{ m: "PATCH", p: `/admin/academy/courses/${encodeURIComponent(c.id)}`, back: here, done: "saved" }} className="cm-card">
            <div className="cm-row"><h2 style={{ flex: 1 }}>{c.title}</h2><Link href={cmLinks.course(c.slug)} className="cm-link">{w2.viewAll}</Link><Link href={back} className="cm-link">{w2.cancel}</Link></div>
            {courseFields(c)}
            <div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.saveChanges}</button></div>
          </ApiForm>
          {!c.free ? <PriceForm courseId={c.id} lang={lang} save={w2.saveChanges} /> : null}
          {c.lessons.map((l, i) => (
            <details key={l.id} className="cm-card">
              <summary className="cm-row" style={{ cursor: "pointer" }}><b>{i + 1}. {l.title}</b><span className="pill p-gy">{l.kind === "video" ? w.videoKind : w.article}</span>{l.quiz.length ? <span className="pill p-gy">{w2.quiz}: {l.quiz.length}</span> : null}</summary>
              <ApiForm call={{ m: "PATCH", p: `/admin/academy/lessons/${encodeURIComponent(l.id)}`, back: here, done: "saved" }}>
                {lessonFields(l)}
                <div className="cm-row" style={{ marginTop: 14 }}>
                  <button type="submit" className="cm-btn o">{w2.saveChanges}</button>
                </div>
              </ApiForm>
              <form action={quizAuthorAction} style={{ marginTop: 16 }}>
                <input type="hidden" name="_back" value={here} />
                <input type="hidden" name="lesson_id" value={l.id} />
                <label className="cm-field">{w2.quiz}<textarea name="quiz" rows={5} defaultValue={quizText(l.quiz)} placeholder="Which page sells? | Home | *Product | About" /><small>Question | option | *right option | option</small></label>
                <div className="cm-row" style={{ marginTop: 10 }}><button type="submit" className="cm-btn g">{w2.saveChanges}</button></div>
              </form>
              <div className="cm-row" style={{ marginTop: 10 }}><ApiButton call={{ m: "DELETE", p: `/admin/academy/lessons/${encodeURIComponent(l.id)}`, back: here }} className="cm-link" icon="delete" label={w2.delete} /></div>
            </details>
          ))}
          <ApiForm call={{ m: "POST", p: `/admin/academy/courses/${encodeURIComponent(c.id)}/lessons`, back: here, done: "saved" }} className="cm-card">
            <h2>+ {w2.lessons.replace("{n} ", "")}</h2>
            {lessonFields()}
            <div className="cm-row" style={{ marginTop: 14 }}><button type="submit" className="cm-btn o">{w2.post}</button></div>
          </ApiForm>
        </>
      ) : (
        <details className="cm-card">
          <summary className="cm-btn o" style={{ display: "inline-flex" }}><span className="ms" aria-hidden="true">add</span>{w2.adminAcademy}</summary>
          <ApiForm call={{ m: "POST", p: "/admin/academy/courses", back, to: `${back}?id={id}` }}>
            {courseFields()}
            <div className="cm-row" style={{ marginTop: 18 }}><button type="submit" className="cm-btn o">{w2.post}</button></div>
          </ApiForm>
        </details>
      )}
      <div className="cm-card" style={{ overflowX: "auto" }}>
        <table className="cm-table">
          <thead><tr><th>{w2.title}</th><th>{w2.status}</th><th>{w2.lessons.replace("{n} ", "")}</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.title}{r.free ? <span className="pill p-gr" style={{ marginInlineStart: 8 }}>{w2.free}</span> : null}</td>
                <td>{r.status === "published" ? w2.published : w2.inReview}</td>
                <td>{r.lesson_count}</td>
                <td><Link href={`${back}?id=${encodeURIComponent(r.id)}`} className="cm-link">{w2.edit}</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}
