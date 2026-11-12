import type { DataStore } from "../data/store";
import type { OccasionRecord } from "../data/types";
import { platformSetting } from "../settings/platform";

/** 124 The occasions the team saved (Admin › Occasions); none until it saves one. */
export async function occasionsOf(store: DataStore, options: { fresh?: boolean } = {}): Promise<OccasionRecord[]> {
  return (await platformSetting(store, "occasions", options))?.value.items ?? [];
}
