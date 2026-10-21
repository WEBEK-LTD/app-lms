import "server-only";
import type { Lang } from "@/i18n/config";
import { localePath } from "@/i18n/paths";
import { getStore } from "../data";
import type { User } from "../data/types";
import { homeFor, startSession, startTwoStep } from "./session";
import { hasTwoStep } from "./two-step";

/**
 * 70 The way in after a right password, for every sign-in on the website
 * (the sign-in page, a password reset, a team invitation): a session at
 * once, or, when the person has two-step sign-in, the code page first
 * (`/sign-in/code`, in the page's language). Returns where to send them;
 * `next` is where they go once signed in (their home when null).
 */
export async function afterPassword(user: User, options: { lang: Lang; next?: string | null }): Promise<string> {
  if (await hasTwoStep(await getStore(), user.id)) {
    await startTwoStep({ userId: user.id, sessionVersion: user.sessionVersion, next: options.next ?? null });
    return localePath(options.lang, "/sign-in/code");
  }
  await startSession(user);
  return options.next ?? (await homeFor(user));
}
