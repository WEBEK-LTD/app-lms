import "server-only";
import { DEFAULT_LANG, isLang, type Lang } from "@/i18n/config";
import type { ClientContext } from "../auth/session";
import { dashboardLang } from "../dashboard-lang";

/**
 * 132.40 The language of the person a new app is made for
 * (lib/app/start-language.ts): the one the account's owner chose for the
 * dashboard (an Arabic or Turkish sign-up saves it), else the one this
 * dashboard speaks now; our team, working on a client's account, uses the
 * owner's or English, never their own.
 */
export async function ownerLang(context: Pick<ClientContext, "user" | "staff">): Promise<Lang> {
  if (isLang(context.user.language)) return context.user.language;
  return context.staff ? DEFAULT_LANG : dashboardLang();
}
