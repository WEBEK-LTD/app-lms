import type { FirebaseProject } from "../data/types";

/**
 * 136 Yallapp's pool of Firebase projects. Firebase advises at most 30 apps
 * a project (`maxApps` is 28 by default, under it); each client takes up to
 * six (lib/firebase/mode.ts firebaseSlotsFor). A new client goes in the
 * first open project with room for all its possible apps; an app keeps its
 * project. When the room left across the open projects falls under
 * POOL_LOW_ROOM, the platform creates the next project itself
 * (lib/firebase/projects.ts) and the Admin page says so.
 */

/** The room (in apps) under which the platform makes the next project: two more clients of six. */
export const POOL_LOW_ROOM = 12;
export const DEFAULT_MAX_APPS = 28;
/** Firebase's own advice: projects with more apps may slow down. */
export const FIREBASE_APP_LIMIT = 30;

export interface PoolProject {
  project: FirebaseProject;
  used: number;
  /** Apps it can still take: 0 unless open. */
  room: number;
}

export function poolOf(projects: readonly FirebaseProject[], counts: Record<string, number>): PoolProject[] {
  return projects.map((project) => {
    const used = counts[project.projectId] ?? 0;
    return { project, used, room: project.status === "open" ? Math.max(0, project.maxApps - used) : 0 };
  });
}

/** The first open project with room for the app's possible apps. */
export function chooseProject(pool: readonly PoolProject[], slots: number): FirebaseProject | null {
  return pool.find((p) => p.project.status === "open" && p.project.apiKeyId && p.room >= slots)?.project ?? null;
}

/** The room left across the open projects. */
export function poolRoom(pool: readonly PoolProject[]): number {
  return pool.reduce((sum, p) => sum + p.room, 0);
}

/** Whether the pool needs its next project. */
export function poolLow(pool: readonly PoolProject[]): boolean {
  return poolRoom(pool) < POOL_LOW_ROOM;
}
