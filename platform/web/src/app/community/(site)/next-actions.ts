"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cmTarget } from "@/components/community/site/redirect";
import { siteContext } from "@/components/community/site/context";
import { cmHref, cmLinks } from "@/components/community/site/links";
import { send } from "@/components/community/site/next";
import { communityApi } from "@/lib/community/site-client";

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
  /^\/academy\/courses\/[^/]+\/(checkout|lessons\/[^/]+\/complete|quizzes\/[^/]+\/attempts)$/,
  /^\/challenges\/[^/]+\/entries(\/[^/]+\/vote)?$/,
  /^\/pros\/[^/]+\/hire$/, /^\/pros\/requests\/[^/]+(\/review)?$/, /^\/me\/pro$/,
  /^\/jobs(\/[^/]+(\/applications(\/[^/]+)?)?)?$/,
  /^\/events\/[^/]+\/(rsvp|comments)$/,
  /^\/admin\/(points|challenges(\/[^/]+(\/winners)?)?|events(\/[^/]+)?|academy\/courses(\/[^/]+)?)$/,
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

function list(v: string): string[] {
  return v.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
}

/** A date and time from a datetime-local field, read in the given time zone, as UTC ISO. */
function zonedToUtc(local: string, tz: string): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  const asUtc = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!);
  // The zone's offset at that moment: format the UTC instant in the zone and compare.
  const zoned = (ms: number) => {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
    return Date.UTC(+parts.year!, +parts.month! - 1, +parts.day!, +parts.hour!, +parts.minute!);
  };
  try {
    const offset = zoned(asUtc) - asUtc;
    return new Date(asUtc - offset).toISOString();
  } catch {
    return null;
  }
}

function jsonBody(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const names = new Set<string>();
  for (const [k] of form.entries()) if (!k.startsWith("_") && !k.startsWith("$ACTION")) names.add(k);
  for (const k of names) {
    const all = form.getAll(k).filter((v): v is string => typeof v === "string").map((v) => v.trim());
    const [kind, name] = k.includes(":") ? (k.split(":", 2) as [string, string]) : ["s", k];
    if (kind === "d") out[name] = all[0] ? zonedToUtc(all[0], str(form, "time_zone") || str(form, "_tz") || "UTC") : null;
    else if (kind === "n") out[name] = all[0] === "" || all[0] === undefined ? null : Number(all[0]);
    else if (kind === "b") out[name] = all.includes("1");
    else if (kind === "l") out[name] = all.flatMap(list);
    else if (kind === "o") out[name] = all[0] ? JSON.parse(all[0]) : null;
    else out[name] = all.length > 1 ? all : (all[0] ?? "");
  }
  return out;
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
  // A checkout answers with the gateway's address: the browser goes there.
  if (typeof body.url === "string" && /^https:\/\//.test(body.url) && path.endsWith("/checkout")) redirect(body.url);
  const to = str(form, "_to");
  const done = str(form, "_done");
  let target = to ? to.replace("{id}", encodeURIComponent(String(body.id ?? ""))).replace("{slug}", encodeURIComponent(String(body.slug ?? body.id ?? ""))) : back;
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
