import { parsePhoneNumberFromString } from "libphonenumber-js";
import { decrypt, encrypt } from "../crypto/encryption";
import type { DataStore } from "../data/store";
import type { ContactSettings, ContactTwilio } from "../data/types";
import { contactSettingsOf } from "./thread";
import { testTwilio, type TwilioCredentials } from "./twilio";

/**
 * 184.4 and 184.5 Settings › Calls: the owner's three switches, how app calls
 * cross strict networks, and their own Twilio account for masked phone calls.
 *
 * The Twilio secret (an API key's secret, or the auth token) is sealed with
 * the platform's key, bound to the app (the rekey job knows the context:
 * lib/jobs/rekey.ts), as the designers' payout details are (106.11). It's
 * never shown again, never sent back to the form and never logged: the form
 * shows that one is saved, and a new one replaces it. The SIDs are shown
 * masked. Yallapp's team sees no more than that.
 */

export const twilioSecretContext = (appId: string) => `contact_settings.twilio_secret:${appId}`;

const ACCOUNT_SID = /^AC[0-9a-fA-F]{32}$/;
const KEY_SID = /^SK[0-9a-fA-F]{32}$/;
/** Twilio's API key secrets and auth tokens are 32 letters and digits. */
const SECRET = /^[A-Za-z0-9]{32}$/;

/** "AC••••••••3f2a": the first two letters and the last four. */
export function maskSid(sid: string): string {
  return `${sid.slice(0, 2)}${"•".repeat(Math.max(0, sid.length - 6))}${sid.slice(-4)}`;
}

/** The credentials to call Twilio with, opened only to make a call or a test; null without an account. */
export function twilioCredentials(appId: string, twilio: ContactTwilio | null | undefined, key: Buffer): TwilioCredentials | null {
  if (!twilio) return null;
  return { accountSid: twilio.accountSid, keySid: twilio.keySid, secret: decrypt(twilio.secretEncrypted, key, twilioSecretContext(appId)) };
}

/** What Settings › Calls shows: never the secret, the SIDs masked. */
export function callSettingsView(settings: ContactSettings) {
  const t = settings.twilio ?? null;
  return {
    chat: settings.chat,
    appCall: settings.appCall,
    phoneCall: settings.phoneCall,
    turn: settings.turn ?? "direct",
    twilio: t ? { accountSid: maskSid(t.accountSid), keySid: t.keySid ? maskSid(t.keySid) : null, usesAuthToken: t.keySid === null, secretSaved: true, number: t.number } : null,
    check: settings.twilioCheck ?? null,
    pausedAt: settings.phonePausedAt ?? null,
  };
}

export interface CallSettingsForm {
  chat?: string;
  appCall?: string;
  phoneCall?: string;
  turn?: string;
  accountSid?: string;
  keySid?: string;
  /** Left empty: the saved one stays. */
  secret?: string;
  /** "auth_token": the secret is the account's auth token, and no API key is used. */
  auth?: string;
  number?: string;
  /** "on": forget the Twilio account. */
  removeTwilio?: string;
}

export type CallSettingsField = "accountSid" | "keySid" | "secret" | "number" | "phoneCall" | "turn";

/** Reads Settings › Calls and seals the secret; the errors by field, in English (the page has its own words for each code). */
export function readCallSettings(
  appId: string,
  form: CallSettingsForm,
  saved: ContactSettings,
  key: Buffer,
  now: Date,
): { ok: true; value: ContactSettings; changedAccount: boolean } | { ok: false; errors: Partial<Record<CallSettingsField, string>> } {
  const errors: Partial<Record<CallSettingsField, string>> = {};
  const on = (v: string | undefined) => v === "on" || v === "true" || v === "1";
  const turn = form.turn === "twilio" ? "twilio" : "direct";
  let twilio: ContactTwilio | null = saved.twilio ?? null;
  let changedAccount = false;

  if (on(form.removeTwilio)) {
    twilio = null;
    changedAccount = saved.twilio != null;
  } else {
    const accountSid = (form.accountSid ?? "").trim();
    const useAuthToken = form.auth === "auth_token";
    const keySid = useAuthToken ? "" : (form.keySid ?? "").trim();
    const secret = (form.secret ?? "").trim();
    const numberText = (form.number ?? "").trim();
    const typed = Boolean(accountSid || keySid || secret || numberText);
    // A field left as it shows (masked) or empty keeps what's saved.
    const same = (typedValue: string, savedValue: string | null | undefined) => !typedValue || typedValue.includes("•") ? (savedValue ?? "") : typedValue;
    if (typed || twilio) {
      const sid = same(accountSid, twilio?.accountSid);
      const ksid = useAuthToken ? null : same(keySid, twilio?.keySid ?? null) || null;
      if (!ACCOUNT_SID.test(sid)) errors.accountSid = "Paste the Account SID from Twilio's console: AC and 32 letters and digits.";
      if (!useAuthToken && (!ksid || !KEY_SID.test(ksid))) errors.keySid = "Paste the API key's SID: SK and 32 letters and digits.";
      const switchedKind = twilio !== null && (twilio.keySid === null) !== useAuthToken;
      const keyChanged = twilio !== null && (sid !== twilio.accountSid || ksid !== twilio.keySid);
      if (secret && !SECRET.test(secret)) errors.secret = useAuthToken ? "Paste the auth token: 32 letters and digits." : "Paste the API key's secret: 32 letters and digits.";
      // A new account or key needs its own secret.
      if (!secret && (!twilio || switchedKind || keyChanged)) errors.secret = useAuthToken ? "Paste the account's auth token." : "Paste the API key's secret (Twilio shows it once, when the key is made).";
      const parsed = parsePhoneNumberFromString(same(numberText, twilio?.number), "US");
      if (!parsed?.isValid()) errors.number = "Enter your Twilio number with its country code, like +1 415 555 0100.";
      if (Object.keys(errors).length === 0) {
        const number = parsed!.number;
        const secretEncrypted = secret ? encrypt(secret, key, twilioSecretContext(appId)) : twilio!.secretEncrypted;
        changedAccount = !twilio || sid !== twilio.accountSid || ksid !== twilio.keySid || number !== twilio.number || Boolean(secret);
        twilio = { accountSid: sid, keySid: ksid, secretEncrypted, number };
      }
    }
  }

  // A changed account is tested again before phone calls go on: until then they're off.
  const check = changedAccount ? null : (saved.twilioCheck ?? null);
  let phoneCall = on(form.phoneCall);
  if (phoneCall && (!twilio || !check?.ok)) {
    if (Object.keys(errors).length === 0 && !changedAccount) errors.phoneCall = twilio ? "Test the connection first: phone calls go on once it passes." : "Add your Twilio account first.";
    phoneCall = false;
  }
  if (turn === "twilio" && !twilio && Object.keys(errors).length === 0) errors.turn = "Add your Twilio account first, or choose Direct only.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    changedAccount,
    value: {
      appId,
      chat: on(form.chat),
      appCall: on(form.appCall),
      phoneCall,
      turn,
      twilio,
      twilioCheck: check,
      phonePausedAt: changedAccount ? null : (saved.phonePausedAt ?? null),
      updatedAt: now,
    },
  };
}

/** Saves Settings › Calls. */
export async function saveCallSettings(store: DataStore, appId: string, form: CallSettingsForm, key: Buffer, now: Date) {
  const saved = contactSettingsOf(appId, await store.getContactSettings(appId));
  const read = readCallSettings(appId, form, saved, key, now);
  if (!read.ok) return read;
  await store.saveContactSettings(read.value);
  return read;
}

/** Test the connection: keeps what it found; a pass ends a pause, and phone calls the owner turned on stay on. */
export async function testCallSettings(store: DataStore, appId: string, key: Buffer, fetcher: typeof fetch, now: Date) {
  const saved = contactSettingsOf(appId, await store.getContactSettings(appId));
  const credentials = twilioCredentials(appId, saved.twilio, key);
  if (!credentials || !saved.twilio) return null;
  const check = await testTwilio(fetcher, credentials, saved.twilio.number, { relay: (saved.turn ?? "direct") === "twilio", now });
  await store.saveContactSettings({ ...saved, twilioCheck: check, phonePausedAt: check.ok ? null : (saved.phonePausedAt ?? null), updatedAt: now });
  return check;
}

/** Whether masked phone calls can be placed now: switched on, an account that passed its test, not paused. */
export function phoneCallsReady(settings: ContactSettings): boolean {
  return settings.phoneCall && Boolean(settings.twilio) && settings.twilioCheck?.ok === true && !settings.phonePausedAt;
}
