"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { isLang, LANG_COOKIE, LANG_COOKIE_MAX_AGE } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import { setLangForThisRequest } from "@/lib/dashboard-lang";

/**
 * 56 The dashboard's language switcher: saved on the signed-in person (our
 * team member managing a client's dashboard changes their own, not the
 * client's), so it follows them to other devices, and in the `yallapp_lang`
 * cookie that the website's switcher uses too. The page renders again in it:
 * only the page on screen (`refresh`), so the browser doesn't fetch every
 * link of the menu again at once; the next pages render in the new language.
 */
export async function setDashboardLanguageAction(formData: FormData): Promise<void> {
  const lang = formData.get("lang");
  if (!isLang(lang)) return;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  await (await getStore()).updateUser(user.id, { language: lang }, new Date());
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: LANG_COOKIE_MAX_AGE, sameSite: "lax", httpOnly: false });
  setLangForThisRequest(lang);
  refresh();
}
