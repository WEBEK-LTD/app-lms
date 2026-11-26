import { cmLinks } from "@/components/community/site/links";

/** 231 The website's "Continue with Yallapp" in progress: its state, its PKCE verifier and the page to go back to (an httpOnly cookie, 10 minutes). */
export const YALLAPP_COOKIE = "yc_yallapp";

/** Only the community site's own pages are gone back to. */
export function safeNext(value: string | null): string {
  return value && value.startsWith(cmLinks.home()) && !value.startsWith("//") ? value : cmLinks.home();
}
