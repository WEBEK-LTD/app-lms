/**
 * 160 App sign-in's Studio ways as the dashboard's form keeps them: a phone
 * number or an email address signs in with a code every time ("Phone
 * number and a code", "Email address and a code": no password) or with a
 * password ("… and password", or usernames checked by that channel), never
 * both. Turning one on turns the other off, so the form can't ask for a
 * code where a password is expected. The save action checks the same
 * (`conflictingCodes` in sign-in-methods.ts).
 */

export type StudioWayName = "code_phone" | "code_email" | "password_email" | "password_phone" | "password_username";
export type StudioWays = Partial<Record<StudioWayName, boolean>>;
type Channel = "email" | "phone";

const PAIR: Partial<Record<StudioWayName, StudioWayName>> = {
  code_phone: "password_phone",
  password_phone: "code_phone",
  code_email: "password_email",
  password_email: "code_email",
};

const codeOf = (c: Channel): StudioWayName => (c === "email" ? "code_email" : "code_phone");

/** The ways, and the channel usernames are checked on, after [name] was turned on or off. */
export function studioWaysAfter(on: StudioWays, recovery: Channel, name: StudioWayName, checked: boolean, emailPossible: boolean): { on: StudioWays; recovery: Channel } {
  const next: StudioWays = { ...on, [name]: checked };
  let rec = recovery;
  if (!checked) return { on: next, recovery: rec };
  const pair = PAIR[name];
  if (pair) next[pair] = false;
  if (next.password_username && next[codeOf(rec)]) {
    const other: Channel = rec === "email" ? "phone" : "email";
    const free = !next[codeOf(other)] && (other === "phone" || emailPossible);
    // Usernames move to the channel no code signs in on; else the newer choice wins.
    if (free) rec = other;
    else if (name === "password_username") next[codeOf(rec)] = false;
    else next.password_username = false;
  }
  return { on: next, recovery: rec };
}

/** Usernames now checked on [recovery]: its code way goes off. */
export function studioRecoveryAfter(on: StudioWays, recovery: Channel): StudioWays {
  return on.password_username ? { ...on, [codeOf(recovery)]: false } : on;
}
