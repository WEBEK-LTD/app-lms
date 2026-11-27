/**
 * 232–234 How the website's API forms become a JSON body (the server action
 * in app/community/(site)/next-actions.ts): `n:x` a number, `b:x` yes/no,
 * `l:x` a list (one a line or comma-separated), `d:x` a datetime-local in
 * the form's `time_zone` (or `_tz`) as UTC; a repeated name an array
 * (a yes/no box follows a hidden "0" so an unticked box still says no); an empty `…_url` null.
 * Fields starting with `_` are the form's own.
 */

function field(form: FormData, name: string): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim() : "";
}

export function list(v: string): string[] {
  return v.split(/\r?\n|,/).map((x) => x.trim()).filter(Boolean);
}

/** A date and time from a datetime-local field, read in the given time zone, as UTC ISO. */
export function zonedToUtc(local: string, tz: string): string | null {
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

export function jsonBody(form: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const names = new Set<string>();
  for (const [k] of form.entries()) if (!k.startsWith("_") && !k.startsWith("$ACTION")) names.add(k);
  for (const k of names) {
    const all = form.getAll(k).filter((v): v is string => typeof v === "string").map((v) => v.trim());
    // A file field with no file chosen sends nothing in a JSON body.
    if (!all.length) continue;
    const [kind, name] = k.includes(":") ? (k.split(":", 2) as [string, string]) : ["s", k];
    if (kind === "d") out[name] = all[0] ? zonedToUtc(all[0], field(form, "time_zone") || field(form, "_tz") || "UTC") : null;
    else if (kind === "n") out[name] = all[0] === "" || all[0] === undefined ? null : Number(all[0]);
    else if (kind === "b") out[name] = all.includes("1");
    else if (kind === "l") out[name] = all.flatMap(list);
    // An optional link left empty is "no link" (null): the API takes an https address or nothing.
    else if (name.endsWith("_url") && all.length === 1 && all[0] === "") out[name] = null;
    else out[name] = all.length > 1 ? all : (all[0] ?? "");
  }
  return out;
}

