import { BLOCK_DEFINITIONS, BLOCK_GROUP_ORDER } from "./blocks";
import { BLOCK_TYPES, type AppTemplateName, type BlockType, type CardStyle, type Corners, type NoticeTone, type ScreenName, type SocialNetwork, type ThemeMode, type Weekday } from "./types";

/** Names shown in the dashboard and the admin for the look's options. */

export const TEMPLATE_LABELS: Record<AppTemplateName, string> = { classic: "Classic", bold: "Bold", minimal: "Minimal" };
export const THEME_MODE_LABELS: Record<ThemeMode, string> = { system: "Same as the phone", light: "Light", dark: "Dark" };
export const CORNER_LABELS: Record<Corners, string> = { sharp: "Sharp", soft: "Soft", round: "Round" };
export const CARD_LABELS: Record<CardStyle, string> = { flat: "Flat", outlined: "Outlined", elevated: "Raised" };

// 83.1 From each block's definition (lib/pages/blocks.ts).
const blockField = <K extends "label" | "hint" | "icon">(key: K) =>
  Object.fromEntries(BLOCK_TYPES.map((type) => [type, BLOCK_DEFINITIONS[type][key]])) as Record<BlockType, string>;

export const BLOCK_LABELS: Record<BlockType, string> = blockField("label");
export const BLOCK_HINTS: Record<BlockType, string> = blockField("hint");
/** 33 The block's icon in "Add a block" and the block list (Material Symbols, in the site's icon font). */
export const BLOCK_ICONS: Record<BlockType, string> = blockField("icon");

/** 33 "Add a block" in groups, in this order; a group shows the blocks the app has. */
export const BLOCK_GROUPS: { name: string; types: BlockType[] }[] = BLOCK_GROUP_ORDER.map((name) => ({
  name,
  types: BLOCK_TYPES.filter((type) => BLOCK_DEFINITIONS[type].group === name),
}));

export const NOTICE_TONE_LABELS: Record<NoticeTone, string> = { info: "Information", success: "Good news", warning: "Warning" };
export const WEEKDAY_LABELS: Record<Weekday, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  snapchat: "Snapchat",
  telegram: "Telegram",
  whatsapp_channel: "WhatsApp channel",
};

export const SCREEN_LABELS: Record<ScreenName, string> = {
  courses: "All courses",
  my_courses: "My courses",
  search: "Search",
  favorites: "Favorites",
  messages: "Messages",
  account: "Account",
  settings: "Settings",
  notifications: "Notifications",
  cart: "Cart",
  orders: "Orders",
  services: "Services",
  appointments: "Appointments",
  articles: "All articles",
  bookmarks: "Saved articles",
  // 27 A gym's or studio's classes and membership.
  classes: "Class timetable",
  memberships: "Membership",
  events: "All events",
  tickets: "My tickets",
  campaigns: "All campaigns",
  my_donations: "My donations",
  send_parcel: "Send a parcel",
  shipments: "My shipments",
  courier: "Courier",
};
