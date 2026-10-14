import type { AppTemplateName, BlockType, CardStyle, Corners, ScreenName, ThemeMode } from "./types";

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
};

export const BLOCK_HINTS: Record<BlockType, string> = {
  banner: "A wide image with a heading",
  text: "Paragraphs, headings and links",
  image: "One image, optionally a link",
  video: "An MP4, YouTube or Vimeo video",
  button: "A button that opens something",
  items: "Courses, products, services, listings or articles",
  categories: "Category chips or tiles",
  search: "A search box",
  continue_learning: "The course a student is taking",
  embed: "A web page inside the app",
  spacer: "Empty space between blocks",
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
};
