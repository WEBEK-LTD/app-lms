"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/data";
import { sendAppMail } from "@/lib/email/send";
import { CODE_MINUTES, endPanelSession, finishPanelSignIn, normalEmail, panelCookie, startPanelSignIn } from "@/lib/market/panel";
import { hitRateLimit } from "@/lib/rate-limit";

/** 115.7 The vendors' panel sign-in: an emailed code, then a session cookie for this app only. */

const PENDING = (appId: string) => `${panelCookie(appId)}_pending`;

export async function requestPanelCode(appId: string, lang: string, form: FormData): Promise<void> {
  const store = await getStore();
  const app = await store.getAppById(appId);
  const email = normalEmail(String(form.get("email") ?? ""));
  const back = `/partner/${encodeURIComponent(appId)}?lang=${lang}`;
  if (!app || !email) redirect(`${back}&error=email`);
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const allowed = (await hitRateLimit(store, { name: "partner-code", limit: 8, windowSeconds: 3600 }, `${appId}:${ip}`)).allowed;
  if (allowed) {
    const started = await startPanelSignIn(store, app, email, new Date());
    if (started) {
      await sendAppMail(store, app, {
        to: email,
        subject: `${started.code} is your ${app.appName ?? "partner"} panel code`,
        text: `Your partner panel code is ${started.code}.\n\nIt works for ${CODE_MINUTES} minutes. Don't share it with anyone.`,
      }).catch(() => undefined);
      (await cookies()).set(PENDING(appId), `${started.token}|${email}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: CODE_MINUTES * 60 });
    } else {
      // Said the same way whether or not the email works at one of the app's places.
      (await cookies()).set(PENDING(appId), `none|${email}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: CODE_MINUTES * 60 });
    }
  }
  redirect(`${back}&step=code`);
}

export async function verifyPanelCode(appId: string, lang: string, form: FormData): Promise<void> {
  const store = await getStore();
  const app = await store.getAppById(appId);
  const jar = await cookies();
  const [token] = (jar.get(PENDING(appId))?.value ?? "").split("|");
  const back = `/partner/${encodeURIComponent(appId)}?lang=${lang}`;
  if (!app || !token || token === "none") redirect(`${back}&step=code&error=wrong`);
  const result = await finishPanelSignIn(store, app, token, String(form.get("code") ?? ""), new Date());
  if (!result.ok) redirect(`${back}&step=code&error=${result.error}`);
  jar.delete(PENDING(appId));
  jar.set(panelCookie(appId), result.sessionId, { httpOnly: true, secure: true, sameSite: "lax", path: "/", expires: result.expiresAt });
  redirect(back);
}

export async function signOutOfPanel(appId: string, lang: string): Promise<void> {
  const jar = await cookies();
  await endPanelSession(await getStore(), jar.get(panelCookie(appId))?.value);
  jar.delete(panelCookie(appId));
  redirect(`/partner/${encodeURIComponent(appId)}?lang=${lang}`);
}
