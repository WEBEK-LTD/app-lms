import { getStore } from "../data";
import type { DataStore } from "../data/store";
import type { AuditChanges, AuditEntry, User } from "../data/types";
import type { AuditAction, AuditTargetType } from "./audit-actions";

/**
 * The audit log (roadmap 11.7): every change made in the admin, with who
 * made it and the fields it changed. Secret values are never stored: fields
 * whose names look secret are replaced by REDACTED before saving.
 */

export const REDACTED = "[redacted]";

/** Field names that hold secrets, encrypted secrets or their hashes. */
const SECRET_FIELD =
  /(secret|password|passwd|^pass$|token|encrypted|api_?key|private_?key|merchant_?key|license_?key|signing|credential|hash|review_?code|^p8$|iban)/i;

export function isSecretField(name: string): boolean {
  return SECRET_FIELD.test(name);
}

/**
 * A copy of `value` safe to store: secret fields replaced, dates as ISO
 * strings, long strings cut. Arrays and objects are walked (up to 6 levels).
 */
export function redactSecrets(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  if (typeof value !== "object") return typeof value === "bigint" ? String(value) : value;
  if (depth >= 6) return "…";
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactSecrets(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === "function") continue;
    out[key] = isSecretField(key) ? (item === null || item === undefined || item === "" ? null : REDACTED) : redactSecrets(item, depth + 1);
  }
  return out;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  const redacted = redactSecrets(value);
  return typeof redacted === "object" && redacted !== null && !Array.isArray(redacted) ? (redacted as Record<string, unknown>) : { value: redacted };
}

/**
 * The fields that differ between `before` and `after` (top-level keys),
 * redacted. A secret that changed shows as REDACTED on both sides, so the
 * log says it changed without saying what to. Null when nothing differs.
 */
export function auditChanges(before: unknown, after: unknown): AuditChanges | null {
  const b = asRecord(before);
  const a = asRecord(after);
  if (!b || !a) return b || a ? { before: b, after: a } : null;
  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};
  const rawBefore = before as Record<string, unknown>;
  const rawAfter = after as Record<string, unknown>;
  for (const key of new Set([...Object.keys(b), ...Object.keys(a)])) {
    const secretChanged = isSecretField(key) && JSON.stringify(rawBefore?.[key] ?? null) !== JSON.stringify(rawAfter?.[key] ?? null);
    if (!secretChanged && JSON.stringify(b[key] ?? null) === JSON.stringify(a[key] ?? null)) continue;
    changedBefore[key] = b[key] ?? null;
    changedAfter[key] = a[key] ?? null;
  }
  return Object.keys(changedAfter).length ? { before: changedBefore, after: changedAfter } : null;
}

export interface AuditInput {
  /** The team member who made the change. */
  actor: Pick<User, "id" | "email">;
  action: AuditAction;
  target: { type: AuditTargetType; id?: string | number | null };
  /** The client the change concerns, so it shows on their page. */
  clientId?: string | null;
  /** One line for people, like "Activated on Pro until 31 Mar 2027". No secrets. */
  summary: string;
  /** The changed thing before and after; only the fields that differ are kept, redacted. */
  before?: unknown;
  after?: unknown;
}

/**
 * Writes an entry to the audit log. Call it after every change made in the
 * admin. A failure is logged, never thrown: the change itself already happened.
 */
export async function recordAudit(input: AuditInput, options: { store?: DataStore; now?: Date } = {}): Promise<AuditEntry | null> {
  try {
    const store = options.store ?? (await getStore());
    return await store.createAuditEntry({
      at: options.now ?? new Date(),
      actorId: input.actor.id,
      actorEmail: input.actor.email,
      action: input.action,
      targetType: input.target.type,
      targetId: input.target.id === null || input.target.id === undefined ? null : String(input.target.id).slice(0, 64),
      clientId: input.clientId ?? null,
      summary: input.summary.slice(0, 500),
      changes: input.before === undefined && input.after === undefined ? null : auditChanges(input.before, input.after),
    });
  } catch (error) {
    console.error("[audit] the entry couldn't be saved", input.action, error);
    return null;
  }
}

/**
 * Logs a change the team made from a client's own dashboard (staff managing
 * it); nothing for the client's own changes.
 */
export async function recordStaffChange(
  context: { staff: Pick<User, "id" | "email"> | null; client: { id: string }; app?: { id: string } | null },
  summary: string,
  before?: unknown,
  after?: unknown,
): Promise<void> {
  if (!context.staff) return;
  await recordAudit({
    actor: context.staff,
    action: "client.app_settings",
    target: context.app ? { type: "app", id: context.app.id } : { type: "client", id: context.client.id },
    clientId: context.client.id,
    summary,
    before,
    after,
  });
}
