import "server-only";
import type { DataStore } from "@/lib/data/store";
import { yallappFirebaseEnv } from "@/lib/env";
import { poolLow, poolOf, poolRoom } from "@/lib/firebase/pool";
import type { PageState } from "../summary";

/** 136 The Firebase pool's card on the first settings page: set up or not, the room left, and a project the platform couldn't make. */
export async function firebaseSummary(store: DataStore): Promise<PageState> {
  if (!yallappFirebaseEnv()) return { now: "Not set up: every app uses its own Firebase, as before.", attention: false };
  const projects = await store.listFirebaseProjects();
  const pool = poolOf(projects, await store.countAppFirebaseAppsByProject());
  const stuck = projects.find((p) => p.status === "creating" && p.creation?.problem);
  const room = poolRoom(pool);
  return {
    now: `${projects.filter((p) => p.status !== "creating").length} in the pool, room for ${room} more ${room === 1 ? "app" : "apps"}${stuck ? `; ${stuck.projectId} couldn't be made yet` : ""}.`,
    attention: Boolean(stuck) || poolLow(pool),
  };
}
