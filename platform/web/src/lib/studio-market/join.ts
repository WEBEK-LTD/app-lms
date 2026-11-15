/**
 * 106.1 Someone signed out who chose "Become a designer": a cookie for an
 * hour, so signing up (or in) brings them back to finish it.
 */
export const DESIGNER_JOIN_COOKIE = "yallapp_designer_join";

/** Where to go after signing up or in: back to "Become a designer" when they came from it. */
export function afterSignInFor(cookie: string | undefined): string | null {
  return cookie === "1" ? "/designer/join" : null;
}
