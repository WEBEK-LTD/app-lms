import type { IconName } from "@/components/icon-names";

/** 132.14 A section's kinds of items and their icons (the curriculum and an item's own page). */
export type ItemKind = "lesson" | "quiz" | "assignment" | "live";
export const ITEM_ICON: Record<ItemKind, IconName> = { lesson: "play_circle", quiz: "quiz", assignment: "assignment", live: "live_tv" };
