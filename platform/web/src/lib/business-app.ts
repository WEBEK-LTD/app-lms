/**
 * 203 Yallapp Business, the owners' own app (their dashboard on the phone:
 * orders, chat, notifications, sales, the phones signed in), on the two
 * stores. The one place its store links live: the home page, the footer,
 * the docs article, the dashboard's Your phones and Studio's account menu
 * all read them from here.
 *
 * The App Store link has no country in it, so each visitor's own store opens;
 * the Google Play link carries no tracking.
 */
export const BUSINESS_APP_STORE_URL = "https://apps.apple.com/app/yallapp-business/id6827042925";
export const BUSINESS_APP_PLAY_URL = "https://play.google.com/store/apps/details?id=tr.com.yallapp.business";

/** Both links, in the order the buttons show them, each with its Material Symbols icon. */
export const BUSINESS_APP_LINKS = [
  { store: "appStore", url: BUSINESS_APP_STORE_URL, icon: "phone_iphone" },
  { store: "googlePlay", url: BUSINESS_APP_PLAY_URL, icon: "android" },
] as const;

export type BusinessAppStore = (typeof BUSINESS_APP_LINKS)[number]["store"];
