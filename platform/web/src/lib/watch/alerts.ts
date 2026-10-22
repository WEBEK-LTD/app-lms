import type { DataStore } from "../data/store";
import type { TeamAlert } from "../data/types";

/**
 * 78.3 Team alerts: something the team should look at, in the admin's bell
 * (Admin › Watching) and, when it opens, by email to the team. One open alert
 * per key: seen again, it is counted, not sent again.
 */

/** Emails the team about a new alert (the super admins): wired in lib/watch/env.ts. */
export type TeamMail = (alert: TeamAlert) => Promise<void>;

export type AlertInput = Pick<TeamAlert, "kind" | "key" | "title" | "detail" | "link">;

/** Opens or counts an alert; a new one is emailed when `mail` is given. Never throws. */
export async function raiseAlert(store: DataStore, input: AlertInput, now: Date, mail?: TeamMail | null): Promise<TeamAlert | null> {
  try {
    const { alert, created } = await store.raiseTeamAlert(
      { ...input, title: input.title.slice(0, 200), detail: input.detail.slice(0, 4000), link: input.link?.slice(0, 300) ?? null },
      now,
    );
    if (created && mail) {
      try {
        await mail(alert);
        await store.markTeamAlertEmailed(alert.id, now);
      } catch (error) {
        console.error("[watch] alert email", error instanceof Error ? error.message : String(error));
      }
    }
    return alert;
  } catch (error) {
    console.error("[watch] alert", error instanceof Error ? error.message : String(error));
    return null;
  }
}

/** Closes the open alerts of these keys: the problem they name went. */
export async function closeAlerts(store: DataStore, keys: string[], now: Date): Promise<number> {
  if (keys.length === 0) return 0;
  const open = await store.listTeamAlerts({ open: true, limit: 500 });
  let closed = 0;
  for (const alert of open) if (keys.includes(alert.key) && (await store.resolveTeamAlert(alert.id, "watch", now))) closed++;
  return closed;
}
