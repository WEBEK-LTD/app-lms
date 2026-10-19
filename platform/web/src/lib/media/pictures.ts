import { MEDIA_ASSET_PREFIX } from "../assets";
import type { DataStore } from "../data/store";
import { isMediaId } from "./files";

/**
 * 51 Pictures chosen from the Media library for a product's or listing's
 * photos (the form's `mediaImage` fields): the app's own ready pictures, as
 * "media:<id>" asset IDs, in the order chosen.
 */
export async function chosenPictures(store: DataStore, appId: string, formData: FormData): Promise<string[]> {
  const ids = [...new Set(formData.getAll("mediaImage").map(String))].filter(isMediaId);
  const chosen: string[] = [];
  for (const id of ids) {
    const file = await store.getMediaFile(appId, id);
    if (file?.kind === "image" && file.status === "ready") chosen.push(`${MEDIA_ASSET_PREFIX}${id}`);
  }
  return chosen;
}
