import type { AppTemplateName, BlockType, CardStyle, Corners, NoticeTone, ScreenName, SocialNetwork, ThemeMode, Weekday } from "./types";

/** Names shown in the dashboard and the admin for the look's options. */

export const TEMPLATE_LABELS: Record<AppTemplateName, string> = { classic: "Classic", bold: "Bold", minimal: "Minimal" };
export const THEME_MODE_LABELS: Record<ThemeMode, string> = { system: "Same as the phone", light: "Light", dark: "Dark" };
export const CORNER_LABELS: Record<Corners, string> = { sharp: "Sharp", soft: "Soft", round: "Round" };
export const CARD_LABELS: Record<CardStyle, string> = { flat: "Flat", outlined: "Outlined", elevated: "Raised" };

export const BLOCK_LABELS: Record<BlockType, string> = {
  banner: "Banner",
  text: "Text",
  image: "Image",
  video: "Video",
  button: "Button",
  items: "List",
  categories: "Categories",
  search: "Search box",
  continue_learning: "Continue learning",
  embed: "Web page",
  spacer: "Space",
  slider: "Slider",
  quick_links: "Quick links",
  testimonials: "Testimonials",
  faq: "Questions",
  countdown: "Countdown",
  contact: "Contact",
  hours: "Opening hours",
  social: "Social links",
  team: "Team",
  stats: "Numbers",
  notice: "Notice",
};

export const BLOCK_HINTS: Record<BlockType, string> = {
  slider: "Banners people swipe through",
  quick_links: "Icon tiles that open screens and pages",
  testimonials: "What your customers say",
  faq: "Questions with answers that open",
  countdown: "Time left until a date",
  contact: "Call, WhatsApp, email, directions",
  hours: "Your hours, with Open now",
  social: "Buttons to your social profiles",
  team: "People with a photo and a role",
  stats: "Two to four big numbers",
  notice: "A colored announcement bar",
  banner: "A wide image with a heading",
  text: "Paragraphs, headings and links",
  image: "One image, optionally a link",
  video: "An MP4, YouTube or Vimeo video",
  button: "A button that opens something",
  // 31 The editor names this app's own lists instead (lib/pages/sources.ts, listHint).
  items: "Entries from your app",
  categories: "Category chips or tiles",
  search: "A search box",
  continue_learning: "The course a student is taking",
  embed: "A web page inside the app",
  spacer: "Empty space between blocks",
};

/** 33 The block's icon in "Add a block" and the block list (Material Symbols, in the site's icon font). */
export const BLOCK_ICONS: Record<BlockType, string> = {
  banner: "image",
  slider: "view_carousel",
  text: "title",
  image: "photo_library",
  video: "smart_display",
  button: "touch_app",
  notice: "campaign",
  items: "list",
  categories: "category",
  search: "search",
  continue_learning: "play_circle",
  quick_links: "apps",
  team: "groups",
  stats: "monitoring",
  testimonials: "format_quote",
  faq: "help",
  countdown: "timer",
  contact: "call",
  hours: "schedule",
  social: "share",
  embed: "web",
  spacer: "space_bar",
};

/** 33 "Add a block" in groups, in this order; a group shows the blocks the app has. */
export const BLOCK_GROUPS: { name: string; types: BlockType[] }[] = [
  { name: "Content", types: ["banner", "slider", "text", "image", "video", "button", "notice"] },
  { name: "Lists", types: ["items", "categories", "search", "continue_learning", "quick_links", "team", "stats"] },
  { name: "Engage", types: ["testimonials", "faq", "countdown"] },
  { name: "Contact", types: ["contact", "hours", "social"] },
  { name: "Layout", types: ["embed", "spacer"] },
];

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
};
