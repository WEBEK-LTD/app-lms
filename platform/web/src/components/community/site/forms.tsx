"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/app/community/(site)/actions";
import { answerAction, askAction, replyAction, reportAction, similarAction } from "@/app/community/(site)/actions";
import { cmLinks } from "./links";
import type { CmWords } from "./words";

export function Note({ state }: { state: FormState }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <div className={`cm-note ${state.error ? "err" : "ok"}`} role={state.error ? "alert" : "status"}>
      <span className="ms f" aria-hidden="true">{state.error ? "error" : "check_circle"}</span>
      {state.error ?? state.ok}
    </div>
  );
}

/** Ask: section, title (with similar questions as it is typed), details and tags. */
export function AskForm({ w, sections, section: initial }: { w: CmWords; sections: { slug: string; name: string }[]; section?: string }) {
  const [state, action, pending] = useActionState(askAction, undefined);
  const [title, setTitle] = useState("");
  const [section, setSection] = useState(initial ?? "");
  const [similar, setSimilar] = useState<Awaited<ReturnType<typeof similarAction>>>([]);
  useEffect(() => {
    const t = setTimeout(() => {
      similarAction(title, section).then(setSimilar, () => setSimilar([]));
    }, 400);
    return () => clearTimeout(t);
  }, [title, section]);
  return (
    <form action={action} className="cm-card">
      <h1>{w.askTitle}</h1>
      <p className="cm-muted" style={{ marginTop: 6 }}>{w.askIntro}</p>
      <label className="cm-field">
        {w.section}
        <select name="section" required value={section} onChange={(e) => setSection(e.target.value)}>
          <option value="" disabled>{w.chooseSection}</option>
          {sections.map((s) => (
            <option key={s.slug} value={s.slug}>{s.name}</option>
          ))}
        </select>
      </label>
      <label className="cm-field">
        {w.questionTitle}
        <input name="title" required minLength={12} maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={w.questionTitleHint} />
      </label>
      {similar.length ? (
        <div className="cm-note" aria-live="polite">
          <span className="ms f" aria-hidden="true">lightbulb</span>
          <div>
            <b>{w.similarTitle}</b>
            <ul className="cm-similar">
              {similar.map((s) => (
                <li key={s.slug}>
                  <Link href={cmLinks.question(s.slug)} target="_blank">{s.title}</Link>
                  {s.accepted ? <span className="ok"><span className="ms f">check_circle</span></span> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      <label className="cm-field">
        {w.questionBody}
        <textarea name="body" required minLength={20} maxLength={20000} placeholder={w.questionBodyHint} />
        <small>{w.markdownHint}</small>
      </label>
      <label className="cm-field">
        {w.tags}
        <input name="tags" placeholder={w.tagsHint} maxLength={120} />
      </label>
      <Note state={state} />
      <div className="cm-row" style={{ marginTop: 18 }}>
        <button type="submit" className="cm-btn o" disabled={pending}><span className="ms">send</span>{w.postQuestion}</button>
        <small className="cm-muted">{w.reviewNote}</small>
      </div>
    </form>
  );
}

export function AnswerForm({ w, questionId, slug }: { w: CmWords; questionId: string; slug: string }) {
  const [state, action, pending] = useActionState(answerAction, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="cm-card" id="answer">
      <h2>{w.yourAnswer}</h2>
      <input type="hidden" name="questionId" value={questionId} />
      <input type="hidden" name="slug" value={slug} />
      <label className="cm-field">
        <span className="cm-sr">{w.yourAnswer}</span>
        <textarea name="body" required minLength={20} maxLength={20000} placeholder={w.answerHint} />
        <small>{w.markdownHint}</small>
      </label>
      <Note state={state} />
      <div className="cm-row" style={{ marginTop: 14 }}>
        <button type="submit" className="cm-btn o" disabled={pending}><span className="ms">reply</span>{w.postAnswer}</button>
      </div>
    </form>
  );
}

export function ReplyForm({ w, answerId, slug }: { w: CmWords; answerId: string; slug: string }) {
  const [state, action, pending] = useActionState(replyAction, undefined);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      setOpen(false);
    }
  }, [state]);
  if (!open) {
    return (
      <>
        <button type="button" className="cm-link" onClick={() => setOpen(true)}><span className="ms">reply</span>{w.reply}</button>
        <Note state={state} />
      </>
    );
  }
  return (
    <form ref={ref} action={action} className="cm-reply-form">
      <input type="hidden" name="answerId" value={answerId} />
      <input type="hidden" name="slug" value={slug} />
      <label className="cm-field">
        <span className="cm-sr">{w.reply}</span>
        <textarea name="body" required maxLength={2000} style={{ minHeight: 70 }} placeholder={w.replyHint} autoFocus />
      </label>
      <Note state={state} />
      <div className="cm-row" style={{ marginTop: 8 }}>
        <button type="submit" className="cm-btn n" style={{ height: 38 }} disabled={pending}>{w.reply}</button>
        <button type="button" className="cm-btn g" style={{ height: 38 }} onClick={() => setOpen(false)}>{w.cancel}</button>
      </div>
    </form>
  );
}

const REASONS = ["spam", "abuse", "harassment", "off_topic", "inappropriate", "copyright", "other"] as const;

/** Report: a small form under a menu; the moderators get it in their queue. */
export function ReportButton({ w, kind, id, back }: { w: CmWords; kind: "question" | "answer" | "reply" | "member" | "tutorial"; id: string; back: string }) {
  const [state, action, pending] = useActionState(reportAction, undefined);
  const [open, setOpen] = useState(false);
  if (state?.ok) return <Note state={state} />;
  return (
    <>
      <button type="button" className="cm-link" onClick={() => setOpen((o) => !o)} aria-expanded={open}><span className="ms">flag</span>{w.report}</button>
      {open ? (
        <form action={action} className="cm-report">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="back" value={back} />
          <fieldset>
            <legend>{w.reportWhy}</legend>
            {REASONS.map((r) => (
              <label key={r}><input type="radio" name="reason" value={r} required /> {w[`reason_${r}`]}</label>
            ))}
          </fieldset>
          <label className="cm-field">
            {w.reportNote}
            <input name="note" maxLength={500} />
          </label>
          <Note state={state} />
          <button type="submit" className="cm-btn n" style={{ height: 38, marginTop: 10 }} disabled={pending}>{w.sendReport}</button>
        </form>
      ) : null}
    </>
  );
}
