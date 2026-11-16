import type { DataStore } from "../data/store";
import type { App, PrimeGift } from "../data/types";
import { appLabel } from "../app/label";
import { recordAudit } from "./audit";

/**
 * 132 Prime as a gift from Yallapp's team (Admin › client › Prime as a
 * gift): one app or all the client's apps count as Prime everywhere Prime
 * is checked (lib/owner/sales.ts `ownerAreas`, the Owner API, Yallapp
 * Business, the smart alerts' job) while it lasts, until its end date or
 * until it is removed; then the app is what its plan makes it. It never
 * charges anything and never changes the client's plan or invoices. Each
 * change is in the audit log; only the team members with `prime.gift` may.
 */

export const GIFT_NOTE_MAX = 300;

/** Whether a gift is on now: no end, or an end still ahead. */
export function primeGiftActive(
  gift: Pick<PrimeGift, "until"> | null | undefined,
  now: Date,
): boolean {
  return (
    Boolean(gift) &&
    (gift!.until === null || gift!.until.getTime() > now.getTime())
  );
}

export type GiftForm =
  | { ok: true; until: Date | null; note: string | null }
  | { ok: false; errors: Record<string, string> };

/** The form: an optional last day (the gift ends at its end, UTC) and a note for the team. */
export function readGiftForm(
  values: { until?: string | null; note?: string | null },
  now: Date,
): GiftForm {
  const errors: Record<string, string> = {};
  const day = (values.until ?? "").trim();
  let until: Date | null = null;
  if (day) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      Number.isNaN(Date.parse(`${day}T00:00:00Z`))
    )
      errors.until = "Enter the last day as a date, or leave it empty.";
    else {
      until = new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000);
      if (until.getTime() <= now.getTime())
        errors.until = "The last day can't be in the past.";
    }
  }
  const note = (values.note ?? "").replace(/\s+/g, " ").trim();
  if ([...note].length > GIFT_NOTE_MAX)
    errors.note = `Keep the note under ${GIFT_NOTE_MAX} characters.`;
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, until, note: note || null };
}

/** Gives Prime to the apps (one, or all the client's), keeping when each was first given. */
export async function givePrimeGift(
  store: DataStore,
  input: {
    admin: { id: string; email: string };
    clientId: string;
    apps: App[];
    until: Date | null;
    note: string | null;
  },
  now: Date,
): Promise<PrimeGift[]> {
  const out: PrimeGift[] = [];
  for (const app of input.apps) {
    const before = await store.getPrimeGift(app.id);
    const gift: PrimeGift = {
      appId: app.id,
      clientId: input.clientId,
      until: input.until,
      note: input.note,
      givenBy: input.admin.email,
      createdAt: before?.createdAt ?? now,
      updatedAt: now,
    };
    await store.savePrimeGift(gift);
    out.push(gift);
    await recordAudit(
      {
        actor: input.admin,
        action: "client.prime_gift",
        target: { type: "app", id: app.id },
        clientId: input.clientId,
        summary: `Prime given as a gift to ${appLabel(app)}${input.until ? ` until ${input.until.toISOString().slice(0, 10)}` : " until removed"}`,
        before: before
          ? { until: before.until?.toISOString() ?? null, note: before.note }
          : null,
        after: { until: input.until?.toISOString() ?? null, note: input.note },
      },
      { store, now },
    );
  }
  return out;
}

/** Takes the gift back: the app is what its plan makes it again. */
export async function removePrimeGift(
  store: DataStore,
  input: {
    admin: { id: string; email: string };
    clientId: string;
    apps: App[];
  },
  now: Date,
): Promise<number> {
  let removed = 0;
  for (const app of input.apps) {
    const before = await store.getPrimeGift(app.id);
    if (
      !before ||
      before.clientId !== input.clientId ||
      !(await store.deletePrimeGift(app.id))
    )
      continue;
    removed += 1;
    await recordAudit(
      {
        actor: input.admin,
        action: "client.prime_gift_remove",
        target: { type: "app", id: app.id },
        clientId: input.clientId,
        summary: `Prime gift removed from ${appLabel(app)}`,
        before: {
          until: before.until?.toISOString() ?? null,
          note: before.note,
        },
        after: null,
      },
      { store, now },
    );
  }
  return removed;
}
