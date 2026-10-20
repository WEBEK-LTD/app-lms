import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { LANG_COOKIE, preferredLang, type Lang } from "@/i18n/config";
import { getCurrentUser } from "./auth/session";
import { dashboardTextFor, type DashboardText } from "./dashboard-words";

/**
 * 56 The client dashboard's language on the server: the signed-in person's
 * choice (`users.language`; our team member managing a client's dashboard
 * sees it in their own), else the `yallapp_lang` cookie, else English.
 * Cached for one request, like the session.
 *
 *   const { t, k, lang } = await dashboardText();
 *   t("nav.overview")           // a text of the dashboard's catalogs (src/i18n/dashboard)
 *   k(notice.title)             // an English text from shared code (a notice, a label), translated when known
 */
/** A choice made in this request (the language switcher's action), ahead of the user read earlier in it. */
const chosenNow = cache((): { lang: Lang | null } => ({ lang: null }));

/** The language switcher saved `lang`: the page it renders again is in it. */
export function setLangForThisRequest(lang: Lang): void {
  chosenNow().lang = lang;
}

export const dashboardLang = cache(async (): Promise<Lang> => {
  const chosen = chosenNow().lang;
  if (chosen) return chosen;
  const user = await getCurrentUser();
  const cookie = (await cookies()).get(LANG_COOKIE)?.value;
  return preferredLang(user?.language, cookie);
});

export { bellWords, dashboardTextFor, SHORT_DATE, type DashboardText } from "./dashboard-words";

export const dashboardText = cache(async (): Promise<DashboardText> => dashboardTextFor(await dashboardLang()));
