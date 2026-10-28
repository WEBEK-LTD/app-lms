import { keyContext as licenseKeyContext } from "../admin/clients";
import { twoStepContext } from "../auth/two-step";
import { keyContext as signingContext } from "../builds/signing";
import { paymentContext } from "../catalog/settings";
import { keyId, oldKeysOf } from "../crypto/encryption";
import { rekeyText } from "../crypto/rekey";
import type { DataStore } from "../data/store";
import { context as appMailContext } from "../email/app-mail";
import { keyContext as appAuthContext } from "../hosted/app-auth";
import { context as whatsappContext } from "../hosted/app-sender";
import { context as connectorContext } from "../hosted/connectors";
import { SERVICE_ACCOUNT_CONTEXT } from "../hosted/notify";
import { reviewAccountContext } from "../publishing/review-account";
import { settingContext } from "../settings/platform";
import type { PlatformSettingKey } from "../data/types";
import { recordJobRun } from "../watch/runs";

/**
 * 79.2 The rekey job: every encrypted value in the database that isn't on the
 * current key (sealed with a key now in ENCRYPTION_KEY_OLD, or before 79.2
 * without a key ID) is sealed again with ENCRYPTION_KEY. The frequent job runs
 * a few seconds of it each time there is work, and remembers where it got to
 * in its run (`job_runs`, job `rekey`); a pass that finished for the current
 * keys isn't started again until they change (or its run is purged, 30 days
 * later, when one more pass checks again). A value whose context isn't found
 * stays as it is and is counted as failed: ENCRYPTION_KEY_OLD must stay set
 * for it (Admin › Watching says so).
 */

/** Every context the platform seals stored values with, built from one of the row's strings (an ID or a setting's key). */
export const CONTEXT_TEMPLATES: ((id: string) => string)[] = [
  licenseKeyContext,
  twoStepContext,
  paymentContext,
  appMailContext,
  appAuthContext,
  whatsappContext,
  connectorContext,
  // 102 The store review account's password.
  reviewAccountContext,
  (id) => `${SERVICE_ACCOUNT_CONTEXT}:${id}`,
  (id) => settingContext(id as PlatformSettingKey),
  ...Object.values(signingContext),
];

export interface RekeyState {
  /** The current key's ID and the old keys' IDs this pass is for. */
  keyId: string;
  oldKeyIds: string[];
  /** Where the pass got to (null: from the start). */
  cursor: string | null;
  done: boolean;
  moved: number;
  failed: number;
}

const PAGE = 100;

export function rekeyTarget(key: Buffer): Pick<RekeyState, "keyId" | "oldKeyIds"> {
  return { keyId: keyId(key), oldKeyIds: oldKeysOf(key).map(keyId).sort() };
}

const sameTarget = (a: Pick<RekeyState, "keyId" | "oldKeyIds">, b: Pick<RekeyState, "keyId" | "oldKeyIds">) =>
  a.keyId === b.keyId && a.oldKeyIds.join(",") === b.oldKeyIds.join(",");

/** The last recorded state of the job, or null. */
export async function lastRekeyState(store: DataStore): Promise<RekeyState | null> {
  for (const run of await store.listJobRuns({ job: "rekey", limit: 10 })) {
    if (!run.ok || !run.summary) continue;
    try {
      const state = JSON.parse(run.summary) as RekeyState;
      if (typeof state.keyId === "string" && Array.isArray(state.oldKeyIds)) return state;
    } catch {
      // Not a state.
    }
  }
  return null;
}

/** Every context a value in this cell may have been sealed with. */
export function contextsFor(candidates: string[]): string[] {
  const contexts = new Set<string>([""]);
  for (const id of candidates) for (const template of CONTEXT_TEMPLATES) contexts.add(template(id));
  return [...contexts];
}

/**
 * Moves values for at most `budgetMs` (one page at least), when there is work:
 * the current keys differ from those of the last finished pass. Returns the
 * state recorded, or null when there was nothing to do.
 */
export async function runRekey(store: DataStore, key: Buffer, options: { clock?: () => Date; budgetMs?: number } = {}): Promise<RekeyState | null> {
  const clock = options.clock ?? (() => new Date());
  const target = rekeyTarget(key);
  const last = await lastRekeyState(store);
  if (last && last.done && sameTarget(last, target)) return null;
  const resume = last && !last.done && sameTarget(last, target) ? last : null;
  const started = clock().getTime();
  const budget = options.budgetMs ?? 8000;
  return recordJobRun(store, "rekey", clock, async () => {
    const state: RekeyState = { ...target, cursor: resume?.cursor ?? null, done: false, moved: resume?.moved ?? 0, failed: resume?.failed ?? 0 };
    do {
      const page = await store.listCellsToRekey({ currentKeyId: target.keyId, after: state.cursor, limit: PAGE });
      for (const cell of page.cells) {
        const result = rekeyText(cell.text, key, contextsFor(cell.candidates), target.keyId);
        state.failed += result.failed;
        if (result.moved > 0 && (await store.updateRekeyedCell(cell, result.text))) state.moved += result.moved;
      }
      state.cursor = page.next;
      if (page.next === null) state.done = true;
    } while (!state.done && clock().getTime() - started < budget);
    return state;
  });
}
