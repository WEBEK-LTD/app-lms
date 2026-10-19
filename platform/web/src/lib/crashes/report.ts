import { newId } from "../crypto/tokens";
import type { CrashIssue, CrashReportInput } from "../data/types";

/**
 * 46 Crash reports from the apps (docs/api/openapi.yaml, tag Crash reports):
 * checking a batch, scrubbing what could be personal, and grouping reports
 * by fingerprint. No I/O here, so the memory and MySQL stores group the same way.
 */

export const CRASH_LIMITS = {
  reportsPerCall: 10,
  error: 300,
  stack: 8000,
  frames: 40,
  /** App versions kept on a group. */
  versions: 20,
  runsPerCall: 10_000,
} as const;

/** Values that never belong in a report: replaced wherever they appear. */
const SCRUBBERS: [RegExp, string][] = [
  // Addresses: keep the scheme, host and path, never a user name, query or fragment.
  [/\b(https?|wss?):\/\/(?:[^\s/@]+@)?([^\s/?#"'<>]+)([^\s?#"'<>]*)(?:\?[^\s#"'<>]*)?(?:#[^\s"'<>]*)?/gi, "$1://$2$3"],
  // Tokens: JWTs, "Bearer …", long hex or base64 runs (keys, refresh tokens, signatures).
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+)?/g, "<token>"],
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi, "$1 <token>"],
  [/\b(token|code|password|secret|key|signature|sig|otp|pin)(["']?\s*[:=]\s*["']?)[^\s"',;&)}\]]+/gi, "$1$2<redacted>"],
  // Email addresses.
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "<email>"],
  // Phone numbers and other long numbers (7 digits or more, with spaces, dashes or a leading +).
  [/\+?\d(?:[\s-]?\d){6,}/g, "<number>"],
  [/\b[A-Fa-f0-9]{24,}\b/g, "<hex>"],
  [/\b[A-Za-z0-9+/_-]{32,}={0,2}/g, "<redacted>"],
];

/** Removes what could identify a person or open an account. Applied by the app and again here. */
export function scrubCrashText(text: string): string {
  let out = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  for (const [pattern, replacement] of SCRUBBERS) out = out.replace(pattern, replacement);
  return out;
}

/** The stack's first frames, scrubbed. */
export function trimStack(stack: string): string {
  const lines = scrubCrashText(stack)
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "");
  return lines.slice(0, CRASH_LIMITS.frames).join("\n").slice(0, CRASH_LIMITS.stack);
}

/** A route's pattern only: numbers and ids become `:id`, never a query. */
export function screenPattern(screen: string): string {
  const path = screen.split(/[?#]/)[0] ?? "";
  return path
    .split("/")
    .map((part) => (/^\d+$/.test(part) || /^[A-Za-z0-9_-]{16,}$/.test(part) || part.includes("%") ? ":id" : part))
    .join("/")
    .slice(0, 80);
}

export interface CrashBatch {
  reports: CrashReportInput[];
  sessions: number;
  crashed: number;
}

const FINGERPRINT = /^[0-9a-f]{16,64}$/;

function str(value: unknown, max: number): string | null {
  return typeof value === "string" && value.length <= max ? value : null;
}

function count(value: unknown): number | null {
  if (value === undefined) return 0;
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= CRASH_LIMITS.runsPerCall ? (value as number) : null;
}

/** Checks a `CrashReportBatch` and scrubs it; the message is for the 400 answer. */
export function parseCrashBatch(body: unknown, now: Date): { ok: true; batch: CrashBatch } | { ok: false; message: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, message: "Send a JSON object with reports." };
  const input = body as Record<string, unknown>;
  if (!Array.isArray(input.reports) || input.reports.length > CRASH_LIMITS.reportsPerCall) {
    return { ok: false, message: `reports must be a list of at most ${CRASH_LIMITS.reportsPerCall}.` };
  }
  const sessions = count(input.sessions);
  const crashed = count(input.crashed_sessions);
  if (sessions === null || crashed === null) return { ok: false, message: "sessions and crashed_sessions must be whole numbers." };
  const reports: CrashReportInput[] = [];
  for (const [index, raw] of input.reports.entries()) {
    const bad = (field: string) => ({ ok: false as const, message: `reports[${index}].${field} is missing or invalid.` });
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return bad("report");
    const r = raw as Record<string, unknown>;
    const fingerprint = str(r.fingerprint, 64);
    if (!fingerprint || !FINGERPRINT.test(fingerprint)) return bad("fingerprint");
    const error = str(r.error, CRASH_LIMITS.error);
    if (!error?.trim()) return bad("error");
    const stack = str(r.stack, CRASH_LIMITS.stack);
    if (stack === null) return bad("stack");
    const version = str(r.app_version, 32);
    if (!version || !/^[0-9A-Za-z.+-]+$/.test(version)) return bad("app_version");
    if (!Number.isInteger(r.build_number) || (r.build_number as number) < 0) return bad("build_number");
    if (r.platform !== "android" && r.platform !== "ios") return bad("platform");
    const osVersion = r.os_version === undefined || r.os_version === null ? null : str(r.os_version, 40);
    if (osVersion === null && r.os_version !== undefined && r.os_version !== null) return bad("os_version");
    if (r.device !== undefined && r.device !== null && r.device !== "phone" && r.device !== "tablet") return bad("device");
    const library = r.library === undefined || r.library === null ? null : str(r.library, 60);
    const screen = r.screen === undefined || r.screen === null ? null : str(r.screen, 80);
    if (r.fatal !== undefined && typeof r.fatal !== "boolean") return bad("fatal");
    const at = typeof r.at === "string" ? new Date(r.at) : null;
    if (!at || Number.isNaN(at.getTime())) return bad("at");
    reports.push({
      fingerprint,
      title: scrubCrashText(error.trim()).slice(0, CRASH_LIMITS.error),
      stack: trimStack(stack),
      library: library ? scrubCrashText(library) : null,
      screen: screen ? screenPattern(screen) : null,
      fatal: r.fatal === true,
      platform: r.platform,
      version: `${version} (${r.build_number as number})`,
      os: osVersion ? `${r.platform === "ios" ? "iOS" : "Android"} ${scrubCrashText(osVersion).slice(0, 40)}` : null,
      // A phone's clock may be wrong: never later than now.
      at: at.getTime() > now.getTime() ? now : at,
    });
  }
  return { ok: true, batch: { reports, sessions, crashed: Math.min(crashed, sessions) } };
}

/** The UTC day of a time, as the run counts are kept. */
export function crashDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}

/**
 * Adds one report to its group (or starts it). A resolved group reported
 * again after it was resolved opens again. Versions keep their order of first sighting, the newest 20.
 */
export function mergeCrash(existing: CrashIssue | null, appId: string, report: CrashReportInput): CrashIssue {
  if (!existing) {
    return {
      id: newId(),
      appId,
      fingerprint: report.fingerprint,
      title: report.title,
      stack: report.stack,
      library: report.library,
      screen: report.screen,
      fatal: report.fatal,
      platforms: [report.platform],
      versions: [report.version],
      lastOs: report.os,
      count: 1,
      status: "open",
      firstSeenAt: report.at,
      lastSeenAt: report.at,
      resolvedAt: null,
    };
  }
  const newer = report.at.getTime() >= existing.lastSeenAt.getTime();
  const versions = existing.versions.includes(report.version) ? existing.versions : [...existing.versions, report.version].slice(-CRASH_LIMITS.versions);
  return {
    ...existing,
    // The latest report's details describe the group.
    ...(newer ? { title: report.title, stack: report.stack, library: report.library, screen: report.screen, lastOs: report.os } : {}),
    fatal: existing.fatal || report.fatal,
    platforms: existing.platforms.includes(report.platform) ? existing.platforms : [...existing.platforms, report.platform].sort(),
    versions,
    count: existing.count + 1,
    // Reported again after it was marked resolved (not a report kept on a phone from before).
    ...(existing.status === "resolved" && existing.resolvedAt && report.at.getTime() > existing.resolvedAt.getTime()
      ? { status: "open" as const, resolvedAt: null }
      : {}),
    firstSeenAt: report.at.getTime() < existing.firstSeenAt.getTime() ? report.at : existing.firstSeenAt,
    lastSeenAt: newer ? report.at : existing.lastSeenAt,
  };
}

/** Crash-free runs in percent, with one decimal; null without runs. */
export function crashFreeShare(totals: { sessions: number; crashed: number }): number | null {
  if (totals.sessions <= 0) return null;
  return Math.round((1 - Math.min(totals.crashed, totals.sessions) / totals.sessions) * 1000) / 10;
}
