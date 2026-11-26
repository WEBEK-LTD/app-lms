/**
 * 231 Deleting an account on the website: what the form must hold before
 * area A's DELETE /me is called. Everyone types DELETE. A member with a
 * password gives it (the API checks it); an Apple or Google member must
 * have signed in on this browser within the last few minutes, so a
 * forgotten open session can't be used to delete the account.
 */

export const FRESH_SIGN_IN_MS = 10 * 60 * 1000;

export type DeleteInput = { hasPassword: boolean; password: string; confirm: string; signedInAt: Date | null; now: Date };

export type DeleteCheck =
  | { ok: true; body: { password: string } | { confirm: "DELETE" } }
  | { ok: false; error: "confirm" | "password" | "fresh" };

export function isFreshSignIn(signedInAt: Date | null, now: Date): boolean {
  if (!signedInAt) return false;
  const age = now.getTime() - signedInAt.getTime();
  return age >= -60_000 && age <= FRESH_SIGN_IN_MS;
}

export function checkDelete(input: DeleteInput): DeleteCheck {
  if (input.confirm.trim() !== "DELETE") return { ok: false, error: "confirm" };
  if (input.hasPassword) {
    if (!input.password) return { ok: false, error: "password" };
    return { ok: true, body: { password: input.password } };
  }
  if (!isFreshSignIn(input.signedInAt, input.now)) return { ok: false, error: "fresh" };
  return { ok: true, body: { confirm: "DELETE" } };
}
