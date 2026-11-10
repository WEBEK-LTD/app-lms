import PHOTOS from "./photos.json";
import type { StoryId } from "./types";

/**
 * The story pages' photos: freely licensed ones, copied to
 * public/stories/<story>/<slot>.jpg with their credits (./photos.json).
 * A photo is listed only with its creator, licence and source, and a slot
 * without a photo is drawn without one.
 */

export interface PhotoCredit {
  creator: string | null;
  license: string | null;
  licenseUrl: string | null;
  source: string | null;
  title: string | null;
}

export interface StoryPhoto {
  slot: string;
  src: string;
  width: number;
  height: number;
  credit: PhotoCredit;
}

const BY_STORY = PHOTOS as Record<StoryId, StoryPhoto[]>;

/** The story's photo in a slot, or null when there is none. */
export function photoOf(story: StoryId, slot: string | undefined): StoryPhoto | null {
  if (!slot) return null;
  return BY_STORY[story]?.find((p) => p.slot === slot) ?? null;
}

/** Every photo a story has, for its credits. */
export function photosOf(story: StoryId): StoryPhoto[] {
  return BY_STORY[story] ?? [];
}
