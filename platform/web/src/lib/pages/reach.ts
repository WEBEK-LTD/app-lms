import { addDays, dayOf } from "../analytics/days";
import type { DataStore } from "../data/store";
import { appShowsBlock } from "./blocks";
import type { BlockType } from "./types";

/**
 * 83.2 The app's versions on people's phones, from its usage statistics: the
 * devices that opened the app in the last `REACH_DAYS` days, each counted
 * by the version it last used. The editor says how many of them won't show a
 * block until they update.
 */

export const REACH_DAYS = 30;

export interface AppVersionCount {
  version: string;
  installs: number;
}

export async function appVersionsInUse(store: DataStore, appId: string, now: Date): Promise<AppVersionCount[]> {
  return store.countAnalyticsVersions(appId, addDays(dayOf(now), -(REACH_DAYS - 1)));
}

/** How many of those devices leave blocks of `type` out until they update. */
export function devicesWithout(type: BlockType, versions: readonly AppVersionCount[]): number {
  return versions.reduce((n, v) => (appShowsBlock(type, v.version) ? n : n + v.installs), 0);
}
