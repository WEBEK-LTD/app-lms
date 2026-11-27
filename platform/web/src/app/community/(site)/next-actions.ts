"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cmTarget } from "@/components/community/site/redirect";
import { siteContext } from "@/components/community/site/context";
import { cmHref, cmLinks } from "@/components/community/site/links";
import { send } from "@/components/community/site/next";

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

function jsonBody(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const names = new Set<string>();
  for (const [k] of form.entries()) if (!k.startsWith("_") && !k.startsWith("$ACTION")) names.add(k);
  for (const k of names) {
    const all = form.getAll(k).filter((v): v is string => typeof v === "string").map((v) => v.trim());
    const [kind, name] = k.includes(":") ? (k.split(":", 2) as [string, string]) : ["s", k];
    if (kind === "n") out[name] = all[0] === "" || all[0] === undefined ? null : Number(all[0]);
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
