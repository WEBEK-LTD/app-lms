/**
 * A readable cookie set next to the session (lib/auth/session.ts) that only
 * says someone is signed in on this browser, so the public pages, which are
 * the same for everyone, can show "Dashboard" instead of "Sign in" and "Get
 * started". It carries no identity and grants nothing: the session cookie
 * stays HttpOnly, and the dashboard checks the session as before.
 */
export const SIGNED_IN_COOKIE = "yallapp_signed_in";
