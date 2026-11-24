"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { siteContext } from "@/components/community/site/context";
import { cmLinks } from "@/components/community/site/links";
import * as source from "@/components/community/site/source";
import { QaError } from "@/lib/community/qa";

/**
 * 231 The website's forms: each checks there is a signed-in member, passes
 * the request to the community modules (which check what the member may do,
 * and filter spam), and draws the page again.
 */

export type FormState = { error?: string; ok?: string; at?: number } | undefined;

async function member(next: string) {
  const { viewer, w, lang } = await siteContext();
  if (!viewer) redirect(cmLinks.signIn(next));
  return { viewer, w, lang };
}

function text(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

function failed(w: Awaited<ReturnType<typeof siteContext>>["w"], e: unknown): FormState {
  const at = Date.now();
  if (e instanceof QaError) {
    if (e.code === "too_many_attempts") return { error: w.errorRate, at };
    if (e.code === "conflict") return { error: w.errorDuplicate, at };
    if (e.code === "invalid_request") {
      if (e.field === "title") return { error: w.errorTitleShort, at };
      if (e.field === "body") return { error: w.errorBodyShort, at };
      if (e.field === "section") return { error: w.errorSection, at };
      if (e.field === "tags") return { error: w.errorTags, at };
    }
    if (e.code === "invalid_token") return { error: w.errorSignedOut, at };
    if (e.code === "not_allowed") return { error: w.errorForbidden, at };
  }
  const code = e instanceof Error ? e.message : "";
  return { error: code === "not_ready" ? w.errorNotReady : code === "spam" ? w.errorSpam : w.errorGeneric, at };
}

export async function askAction(_prev: FormState, form: FormData): Promise<FormState> {
  const { viewer, w, lang } = await member(cmLinks.ask());
  const title = text(form, "title");
  const body = text(form, "body");
  const section = text(form, "section");
  const tags = text(form, "tags").split(/[,\s]+/).map((t) => t.replace(/^#/, "").toLowerCase()).filter(Boolean).slice(0, 5);
  if (title.length < 12) return { error: w.errorTitleShort, at: Date.now() };
  if (body.length < 20) return { error: w.errorBodyShort, at: Date.now() };
  if (!section) return { error: w.errorSection, at: Date.now() };
  let result: source.AskResult;
  try {
    result = await source.askQuestion(viewer.id, { section, tags, title, body, lang });
  } catch (e) {
    return failed(w, e);
  }
  redirect(`${cmLinks.question(result.slug)}${result.status === "pending" ? "?pending=1" : ""}`);
}

export async function similarAction(title: string, section: string): Promise<{ slug: string; title: string; answers: number; accepted: boolean }[]> {
  if (title.trim().length < 8) return [];
  const { viewer, lang } = await siteContext();
  const list = await source.similar({ title: title.slice(0, 200), section: section || undefined, limit: 5, viewerId: viewer?.id ?? null, lang });
  return list.map((q) => ({ slug: q.slug, title: q.title, answers: q.answerCount, accepted: q.hasAccepted }));
}

export async function answerAction(_prev: FormState, form: FormData): Promise<FormState> {
  const slug = text(form, "slug");
  const { viewer, w, lang } = await member(cmLinks.question(slug));
  const body = text(form, "body");
  if (body.length < 20) return { error: w.errorBodyShort, at: Date.now() };
  try {
    const r = await source.answerQuestion(viewer.id, text(form, "questionId"), { body, lang });
    revalidatePath(cmLinks.question(slug));
    return { ok: r.status === "pending" ? w.answerPending : w.answerPosted, at: Date.now() };
  } catch (e) {
    return failed(w, e);
  }
}

export async function replyAction(_prev: FormState, form: FormData): Promise<FormState> {
  const slug = text(form, "slug");
  const { viewer, w, lang } = await member(cmLinks.question(slug));
  const body = text(form, "body");
  if (body.length < 2) return { error: w.errorBodyShort, at: Date.now() };
  try {
    await source.replyToAnswer(viewer.id, text(form, "answerId"), { body, lang });
    revalidatePath(cmLinks.question(slug));
    return { ok: w.replyPosted, at: Date.now() };
  } catch (e) {
    return failed(w, e);
  }
}

export async function voteAction(form: FormData): Promise<void> {
  const slug = text(form, "slug");
  const { viewer } = await member(cmLinks.question(slug));
  const kind = text(form, "kind") === "answer" ? "answer" : "question";
  const value = Number(text(form, "value"));
  await source.vote(viewer.id, { kind, id: text(form, "id"), value: value === 1 ? 1 : value === -1 ? -1 : 0 }).catch(() => undefined);
  revalidatePath(cmLinks.question(slug));
}

export async function acceptAction(form: FormData): Promise<void> {
  const slug = text(form, "slug");
  const { viewer, lang } = await member(cmLinks.question(slug));
  await source.acceptAnswer(viewer.id, text(form, "answerId"), text(form, "on") === "1", lang).catch(() => undefined);
  revalidatePath(cmLinks.question(slug));
}

export async function bookmarkAction(form: FormData): Promise<void> {
  const back = text(form, "back") || cmLinks.home();
  const { viewer } = await member(back);
  const kind = text(form, "kind") === "tutorial" ? "tutorial" : "question";
  await source.bookmark(viewer.id, { kind, id: text(form, "id") }, text(form, "on") === "1").catch(() => undefined);
  revalidatePath(back);
}

export async function reportAction(_prev: FormState, form: FormData): Promise<FormState> {
  const back = text(form, "back") || cmLinks.home();
  const { w } = await member(back);
  const kinds = ["question", "answer", "reply", "member", "tutorial"] as const;
  const kind = kinds.find((k) => k === text(form, "kind"));
  const reason = text(form, "reason");
  if (!kind || !reason) return { error: w.errorGeneric, at: Date.now() };
  try {
    await source.report({ kind, id: text(form, "id"), reason, note: text(form, "note").slice(0, 500) || undefined });
    return { ok: w.reportSent, at: Date.now() };
  } catch (e) {
    return failed(w, e);
  }
}

export async function followSectionAction(form: FormData): Promise<void> {
  const back = text(form, "back") || cmLinks.questions();
  const { viewer } = await member(back);
  await source.followSection(viewer.id, text(form, "slug"), text(form, "on") === "1").catch(() => undefined);
  revalidatePath(back);
}
