"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cmTarget } from "@/components/community/site/redirect";
import { siteContext } from "@/components/community/site/context";
import { cmHref, cmLinks } from "@/components/community/site/links";
import { jsonBody, list } from "@/components/community/site/form-body";
import { send } from "@/components/community/site/next";
import { setCoursePrice } from "@/lib/community/academy/service";
import { communityDeps } from "@/lib/community/deps";
import { startCourseCheckout } from "@/lib/community/engage/checkout";
import { ipFromHeaders } from "@/lib/http";
import { communityApi } from "@/lib/community/site-client";
import { getCommunityStore } from "@/lib/community/store/server";
import { YALLAPP_TENANT } from "@/lib/community/types";

/**
 * 232–234 One server action for the website's phase 2–4 forms. A form names
 * the API call in hidden fields: `_m` the method, `_p` the path, `_back` the
 * page to return to, and `_to` where to go on success (`{id}` and `{slug}`
 * take the answer's). The rest is the body:
 * - with a file, the form as it is (multipart);
 * - otherwise JSON, where `n:x` is a number, `b:x` a yes/no ("1"), `l:x` a list
 *   (one a line or comma-separated) and a repeated name an array.
 * Only the community API paths below can be named; the API itself checks who
 * may do what, as it does for the app.
 */

const PATHS = [
  /^\/feed$/, /^\/posts(\/[^/]+(\/(like|save|comments))?)?$/, /^\/posts\/link-preview$/, /^\/comments\/[^/]+(\/like)?$/,
  /^\/stories(\/[^/]+(\/view)?)?$/,
  /^\/showcase(\/[^/]+(\/(like|comments))?)?$/,
  /^\/messages\/conversations(\/[^/]+(\/(members\/me|members|messages(\/[^/]+)?|read|report))?)?$/,
  /^\/groups(\/[^/]+(\/(cover|membership|members\/[^/]+|requests\/[^/]+\/(accept|decline)))?)?$/,
  /^\/tutorials\/drafts(\/[^/]+)?$/,
  /^\/academy\/courses\/[^/]+\/(lessons\/[^/]+\/complete|quizzes\/[^/]+\/attempts)$/,
  /^\/challenges\/[^/]+\/entries(\/[^/]+\/vote)?$/,
  /^\/pros\/[^/]+\/hire$/, /^\/pros\/requests\/[^/]+(\/review)?$/, /^\/me\/pro$/,
  /^\/jobs(\/[^/]+(\/applications(\/[^/]+)?)?)?$/,
  /^\/events\/[^/]+\/(rsvp|comments)$/,
  /^\/admin\/(points|challenges(\/[^/]+(\/winners)?)?|events(\/[^/]+)?|academy\/courses(\/[^/]+(\/lessons)?)?|academy\/lessons\/[^/]+)$/,
  /^\/admin\/(moderation|reports)\/[^/]+$/,
];
const METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const;

function str(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

/** A site path to come back to: only the Community's own pages. */
function sitePath(p: string, fallback: string): string {
  return p.startsWith(cmHref("/")) && !p.startsWith("//") ? p : fallback;
}

function multipart(form: FormData): FormData {
  const out = new FormData();
  for (const [k, v] of form.entries()) {
    if (k.startsWith("_") || k.startsWith("$ACTION")) continue;
    if (typeof v !== "string" && v.size === 0) continue;
    out.append(k.includes(":") ? (k.split(":", 2)[1] ?? k) : k, v);
  }
  return out;
}

function withParam(path: string, key: string, value: string): string {
  const u = new URL(path, "http://site.local");
  u.searchParams.set(key, value);
  return `${u.pathname}${u.search}${u.hash}`;
}

export async function apiAction(form: FormData): Promise<void> {
  const { viewer } = await siteContext();
  const back = sitePath(str(form, "_back"), cmLinks.home());
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(back)));
  const method = METHODS.find((m) => m === str(form, "_m").toUpperCase());
  const path = str(form, "_p");
  if (!method || !PATHS.some((re) => re.test(path))) redirect(await cmTarget(withParam(back, "error", "not_allowed")));
  const hasFile = [...form.values()].some((v) => typeof v !== "string" && v.size > 0);
  const result = await send(method, path, hasFile || str(form, "_multipart") === "1" ? { form: multipart(form) } : { body: jsonBody(form) });
  revalidatePath(back.split("?")[0] ?? back);
  if (!result.ok) {
    if (result.status === 401) redirect(await cmTarget(cmLinks.signIn(back)));
    redirect(await cmTarget(withParam(back, "error", result.code)));
  }
  const body = (result.body ?? {}) as Record<string, unknown>;
  const to = str(form, "_to");
  const done = str(form, "_done");
  // `{id}` and `{slug}` take the answer's (written plainly or as a link helper encoded them).
  const fillIn = (t: string) => t.replace(/\{id\}|%7Bid%7D/gi, encodeURIComponent(String(body.id ?? ""))).replace(/\{slug\}|%7Bslug%7D/gi, encodeURIComponent(String(body.slug ?? body.id ?? "")));
  let target = to ? fillIn(to) : back;
  if (typeof body.status === "string" && body.status === "pending") target = withParam(target, "pending", "1");
  else if (done) target = withParam(target, "done", done);
  redirect(await cmTarget(sitePath(target, back)));
}

/** 232 A new conversation from usernames (the API takes member ids). */
export async function startConversationAction(form: FormData): Promise<void> {
  const { viewer } = await siteContext();
  const back = cmLinks.messages();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(back)));
  const names = list(str(form, "to")).map((n) => n.replace(/^@/, "")).slice(0, 9);
  const ids: string[] = [];
  for (const n of names) {
    const r = await communityApi<{ id?: string }>("GET", `/members/${encodeURIComponent(`@${n}`)}`).catch(() => null);
    if (!r || r.status !== 200 || !r.body?.id) redirect(await cmTarget(withParam(back, "error", "member_not_found")));
    ids.push(r.body.id);
  }
  if (!ids.length) redirect(await cmTarget(withParam(back, "error", "member_not_found")));
  const title = str(form, "title");
  const result = await send("POST", "/messages/conversations", { body: { member_ids: ids, ...(title ? { title } : {}), body: str(form, "body") || undefined } });
  if (!result.ok) redirect(await cmTarget(withParam(back, "error", result.code)));
  const id = String((result.body as { id?: string })?.id ?? "");
  redirect(await cmTarget(id ? cmLinks.conversation(id) : back));
}

/** 233 A quiz attempt: the chosen option for each question, then the score on the same page. */
export async function quizAction(form: FormData): Promise<void> {
  const { viewer } = await siteContext();
  const back = sitePath(str(form, "_back"), cmLinks.academy());
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(back)));
  const courseId = str(form, "course_id");
  const quizId = str(form, "quiz_id");
  const answers: Record<string, string[]> = {};
  for (const [k, v] of form.entries()) if (k.startsWith("q:") && typeof v === "string") (answers[k.slice(2)] ??= []).push(v);
  const result = await send("POST", `/academy/courses/${encodeURIComponent(courseId)}/quizzes/${encodeURIComponent(quizId)}/attempts`, { body: { answers } });
  if (!result.ok) redirect(await cmTarget(withParam(back, "error", result.code)));
  const r = (result.body ?? {}) as { score?: number; passed?: boolean };
  const u = new URL(back, "http://site.local");
  u.searchParams.set("score", String(Math.round((r.score ?? 0) * (r.score !== undefined && r.score <= 1 ? 100 : 1))));
  u.searchParams.set("passed", r.passed ? "1" : "0");
  redirect(await cmTarget(`${u.pathname}${u.search}`));
}

/** 234 Open or change one's pro profile: headline, about, services (title, rate as text, description), skills, availability and portfolio. */
export async function proAction(form: FormData): Promise<void> {
  const { viewer } = await siteContext();
  const back = cmLinks.proEdit();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(back)));
  const titles = form.getAll("service_title").map(String);
  const rates = form.getAll("service_rate").map(String);
  const descs = form.getAll("service_description").map(String);
  const services = titles.map((t, i) => ({ title: t.trim(), rate: (rates[i] ?? "").trim(), description: (descs[i] ?? "").trim() })).filter((s) => s.title);
  const body = {
    headline: str(form, "headline"),
    about: str(form, "about"),
    services,
    skills: list(str(form, "skills")).slice(0, 20),
    availability: ["available", "busy", "unavailable"].find((a) => a === str(form, "availability")) ?? "available",
    showcase_ids: form.getAll("showcase_ids").map(String).filter(Boolean).slice(0, 12),
  };
  const result = await send("PUT", "/me/pro", { body });
  if (!result.ok) redirect(await cmTarget(withParam(back, "error", result.code)));
  redirect(await cmTarget(cmLinks.pro(viewer.handle)));
}

/** 233 The admin's points table: points and a daily cap for each action, and the levels (from points, named in each language). */
export async function pointsAction(form: FormData): Promise<void> {
  const back = cmLinks.admin("points");
  const { viewer } = await siteContext();
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(back)));
  const num = (v: FormDataEntryValue | undefined) => (typeof v === "string" && v.trim() !== "" ? Math.trunc(Number(v)) : null);
  const actions = form.getAll("action").map((a, i) => ({ action: String(a), points: num(form.getAll("points")[i]) ?? 0, daily_cap: num(form.getAll("daily_cap")[i]) }));
  const keys = form.getAll("level_key").map(String);
  const levels = keys
    .map((key, i) => ({ key: key.trim(), min_points: num(form.getAll("level_min")[i]) ?? 0, name: { en: String(form.getAll("level_en")[i] ?? "").trim(), ar: String(form.getAll("level_ar")[i] ?? "").trim(), tr: String(form.getAll("level_tr")[i] ?? "").trim() } }))
    .filter((l) => l.key && l.name.en);
  const result = await send("PUT", "/admin/points", { body: { actions, levels } });
  redirect(await cmTarget(withParam(back, result.ok ? "done" : "error", result.ok ? "saved" : result.code)));
}

/** 233 The admin sets a course's price (on the website only), or clears it. */
export async function coursePriceAction(form: FormData): Promise<void> {
  const { viewer } = await siteContext();
  const courseId = str(form, "course_id");
  const back = `${cmLinks.admin("academy")}?id=${encodeURIComponent(courseId)}`;
  if (!viewer || viewer.role !== "admin") redirect(await cmTarget(cmLinks.signIn(back)));
  const amount = str(form, "amount").replace(",", ".");
  const currency = str(form, "currency").toUpperCase();
  const price = amount ? { priceMinor: Math.round(Number(amount) * 100), currency } : null;
  const ok = await setCoursePrice((await getCommunityStore(YALLAPP_TENANT)).qa.academy, YALLAPP_TENANT, courseId, price).catch(() => false);
  redirect(await cmTarget(withParam(back, ok ? "done" : "error", ok ? "saved" : "invalid_request")));
}

/** 233 A lesson's quiz, written one question a line: "Question? | option | *right option | option". */
export async function quizAuthorAction(form: FormData): Promise<void> {
  const { viewer } = await siteContext();
  const back = sitePath(str(form, "_back"), cmLinks.admin("academy"));
  if (!viewer || viewer.role !== "admin") redirect(await cmTarget(cmLinks.signIn(back)));
  const questions = str(form, "quiz")
    .split(/\r?\n/)
    .map((line) => line.split("|").map((x) => x.trim()).filter(Boolean))
    .filter((parts) => parts.length >= 3)
    .map(([prompt, ...opts]) => ({ prompt: prompt!, options: opts.map((o) => o.replace(/^\*/, "").trim()), answer: Math.max(0, opts.findIndex((o) => o.startsWith("*"))) }));
  const result = await send("PUT", `/admin/academy/lessons/${encodeURIComponent(str(form, "lesson_id"))}/quiz`, { body: { questions } });
  redirect(await cmTarget(withParam(back, result.ok ? "done" : "error", result.ok ? "saved" : result.code)));
}

/** 233 Buy a course on the website: Yallapp's own checkout (area C), signed in on the site only; back on the course's page with ?checkout=. */
export async function courseCheckoutAction(form: FormData): Promise<void> {
  const { viewer } = await siteContext();
  const slug = str(form, "slug");
  const back = cmLinks.course(slug);
  if (!viewer) redirect(await cmTarget(cmLinks.signIn(back)));
  const ip = ipFromHeaders(await headers());
  const deps = await communityDeps({ ip });
  const result = await startCourseCheckout({ deps, store: deps.store, now: deps.now }, viewer.id, str(form, "course_id"), { ip }).catch(() => null);
  if (result && result.ok && /^https:\/\//.test(result.url)) redirect(result.url);
  redirect(await cmTarget(withParam(back, "error", result && !result.ok ? result.code : "checkout_failed")));
}
