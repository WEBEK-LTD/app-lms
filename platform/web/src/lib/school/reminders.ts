import type { DataStore } from "../data/store";
import type { sendPush } from "../hosted/push";
import { remindExams } from "./flow";
import { remindSlips } from "./parent";

/**
 * 113.8 The frequent job's part for schools: tomorrow's published exams,
 * from 17:00 in each school's time zone, to their students and families.
 * 113.4 Permission slips due tomorrow, from 17:00, to the parents who
 * haven't answered. Demo apps are left out (their school day is made again
 * each day).
 */
export async function runSchoolReminders(deps: { store: DataStore; now: Date; send?: typeof sendPush }): Promise<{ exams: number; slips: number }> {
  let exams = 0;
  let slips = 0;
  for (const app of await deps.store.listApps()) {
    if (app.connector?.kind !== "school" || app.demo || app.backend !== "hosted") continue;
    try {
      exams += await remindExams({ store: deps.store, app, now: deps.now, send: deps.send });
    } catch (error) {
      // One school's trouble never stops the others'.
      console.error("[school] exam reminders", app.id, error instanceof Error ? error.message : String(error));
    }
    try {
      slips += await remindSlips({ store: deps.store, app, now: deps.now, send: deps.send });
    } catch (error) {
      console.error("[school] slip reminders", app.id, error instanceof Error ? error.message : String(error));
    }
  }
  return { exams, slips };
}
