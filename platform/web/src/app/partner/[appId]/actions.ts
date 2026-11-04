"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getStore } from "@/lib/data";
import { sendAppMail } from "@/lib/email/send";
import { CODE_MINUTES, endPanelSession, finishPanelSignIn, normalEmail, panelCookie, panelStaff, startPanelSignIn } from "@/lib/market/panel";
import { addStaff, bulkPhotos, can, deletePhoto, fetchLinksNow, IMPORT_MAX_BYTES, importCatalog, panelContext, saveDelivery, setStaffActive, setStock, uploadPhoto, type PanelTab } from "@/lib/market/panel-pages";
import type { BulkPhotoOutcome } from "@/lib/market/photos";
import { safeFetcher } from "@/lib/net/safe-fetch";
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

// 115.7 The panel's pages: each checks the signed-in staff member and their role, on their own vendor only.

async function withPanel(appId: string, tab: PanelTab) {
  const store = await getStore();
  const app = await store.getAppById(appId);
  if (!app || app.connector?.kind !== "restaurants") return null;
  const staff = await panelStaff(store, app, (await cookies()).get(panelCookie(appId))?.value, new Date());
  if (!staff || !can(staff, tab)) return null;
  return panelContext(store, app, staff);
}

const back = (appId: string, tab: string, lang: string, extra = "") => `/partner/${encodeURIComponent(appId)}?tab=${tab}&lang=${lang}${extra}`;

export async function saveStockAction(appId: string, lang: string, form: FormData): Promise<void> {
  const ctx = await withPanel(appId, "catalog");
  if (ctx) {
    const raw = String(form.get("stock") ?? "").trim();
    const stock = raw === "" ? null : Math.max(0, Math.floor(Number(raw)) || 0);
    const toggle = form.get("toggle") === "1";
    const current = form.get("in_stock") !== "1";
    await setStock(ctx, Number(form.get("id")), toggle ? !current : stock === 0 ? false : current || (stock ?? 0) > 0, form.has("stock") ? stock : null, new Date());
  }
  redirect(back(appId, "catalog", lang, form.get("page") ? `&page=${form.get("page")}` : ""));
}

export async function importAction(appId: string, lang: string, form: FormData): Promise<void> {
  const ctx = await withPanel(appId, "import");
  if (!ctx) redirect(back(appId, "orders", lang));
  const file = form.get("file");
  const apply = form.get("apply") === "1";
  let result;
  if (!(file instanceof File) || file.size === 0) result = { ok: false as const, error: "Choose a file." };
  else if (file.size > IMPORT_MAX_BYTES) result = { ok: false as const, error: "Files can be up to 5 MB. Split a bigger catalog into several files." };
  else result = await importCatalog(ctx, { bytes: new Uint8Array(await file.arrayBuffer()), name: file.name, type: file.type }, apply, new Date());
  const small = result.ok ? { ...result, errors: result.errors.slice(0, 12).map((e) => ({ line: e.line, errors: e.errors.slice(0, 2).map((x) => x.slice(0, 80)) })) } : result;
  (await cookies()).set(`${panelCookie(appId)}_import`, JSON.stringify(small).slice(0, 3800), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 120 });
  redirect(back(appId, "import", lang));
}

export async function saveDeliveryAction(appId: string, lang: string, form: FormData): Promise<void> {
  const ctx = await withPanel(appId, "delivery");
  if (!ctx) redirect(back(appId, "orders", lang));
  const values: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string" && !k.startsWith("$")) values[k] = v;
  const saved = await saveDelivery(ctx, values, new Date());
  redirect(back(appId, "delivery", lang, saved.ok ? "&saved=1" : `&error=${encodeURIComponent(saved.error)}`));
}

export async function addStaffAction(appId: string, lang: string, form: FormData): Promise<void> {
  const ctx = await withPanel(appId, "staff");
  if (!ctx) redirect(back(appId, "orders", lang));
  const made = await addStaff(ctx, { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), role: String(form.get("role") ?? "") }, new Date());
  redirect(back(appId, "staff", lang, made.ok ? "" : `&error=${encodeURIComponent(made.error)}`));
}

export async function toggleStaffAction(appId: string, lang: string, form: FormData): Promise<void> {
  const ctx = await withPanel(appId, "staff");
  if (ctx) await setStaffActive(ctx, Number(form.get("id")), form.get("active") === "1", new Date());
  redirect(back(appId, "staff", lang));
}

// 115 Products' photos: one at a time from Menu & stock, in bulk and from picture links on the Import page.

export async function uploadPhotoAction(appId: string, lang: string, form: FormData): Promise<void> {
  const ctx = await withPanel(appId, "catalog");
  const page = form.get("page") ? `&page=${form.get("page")}` : "";
  if (!ctx) redirect(back(appId, "orders", lang));
  const file = form.get("photo");
  const as = form.get("as") === "extra" ? "extra" : "main";
  let error: string | null = null;
  if (!(file instanceof File) || file.size === 0) error = "Choose a photo.";
  else {
    const added = await uploadPhoto(ctx, Number(form.get("id")), new Uint8Array(await file.arrayBuffer()), as, new Date());
    if (!added.ok) error = added.error;
  }
  redirect(back(appId, "catalog", lang, `${page}${error ? `&photo_error=${encodeURIComponent(error)}&photo_id=${Number(form.get("id"))}` : ""}`));
}

export async function removePhotoAction(appId: string, lang: string, form: FormData): Promise<void> {
  const ctx = await withPanel(appId, "catalog");
  if (ctx) await deletePhoto(ctx, Number(form.get("id")), String(form.get("asset") ?? ""), new Date());
  redirect(back(appId, "catalog", lang, form.get("page") ? `&page=${form.get("page")}` : ""));
}

/** A few bulk photos (the browser sends a ZIP's pictures or the chosen files in small batches). */
export async function bulkPhotosAction(appId: string, form: FormData): Promise<BulkPhotoOutcome[] | { error: string }> {
  const ctx = await withPanel(appId, "import");
  if (!ctx) return { error: "Sign in again." };
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 20);
  return bulkPhotos(ctx, await Promise.all(files.map(async (f) => ({ name: f.name, data: new Uint8Array(await f.arrayBuffer()) }))), new Date());
}

export async function fetchLinksAction(appId: string): Promise<{ fetched: number; failed: number; left: number } | { error: string }> {
  const ctx = await withPanel(appId, "import");
  if (!ctx) return { error: "Sign in again." };
  return fetchLinksNow(ctx, safeFetcher());
}
