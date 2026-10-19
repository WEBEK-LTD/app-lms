import type { IconName } from "./icon-names";
import type { AccountTopic, UpdateKind } from "@/lib/updates-words";

/** 57 How an item of the dashboard's bell looks: its icon and its chip's colors (for the bell and the full list). */

const KIND_ICON: Record<UpdateKind, IconName> = {
  update: "upgrade",
  announcement: "campaign",
  maintenance: "build",
  offer: "local_offer",
  account: "account_circle",
};

const TOPIC_ICON: Record<AccountTopic, IconName> = {
  notice: "info",
  plan: "schedule",
  users: "group",
  storage: "photo_library",
  site: "web",
  build_ready: "download",
  build_failed: "error",
  payment: "receipt_long",
};

export function updateIcon(item: { kind: UpdateKind; topic: AccountTopic | null }): IconName {
  return item.topic ? TOPIC_ICON[item.topic] : KIND_ICON[item.kind];
}

/** The chip: dark text on a light tint, one tint per kind. */
export const KIND_CHIP: Record<UpdateKind, string> = {
  update: "bg-tile-2 text-midnight",
  announcement: "bg-tile-3 text-midnight",
  maintenance: "bg-warn-bg text-warn",
  offer: "bg-peach text-accent",
  account: "bg-line-soft text-ink-3",
};

/** The icon's round background, matching the chip. */
export const KIND_ICON_BG: Record<UpdateKind, string> = {
  update: "bg-tile-2 text-midnight",
  announcement: "bg-tile-3 text-midnight",
  maintenance: "bg-warn-bg text-warn",
  offer: "bg-peach text-accent",
  account: "bg-ivory text-ink-3",
};
