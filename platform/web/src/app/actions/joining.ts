"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard, requestIp, type ClientContext } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import type { App, AssetKind } from "@/lib/data/types";
import { deliverySettingsOf } from "@/lib/delivery/settings";
import { imageType } from "@/lib/images";
import { sendMail } from "@/lib/mail";
import { acceptApplication, answerApplication, JOINING_LIMITS, joiningMail, newFormToken, submitApplication } from "@/lib/market/joining";
import { addQuestion, answersFromForm, chosenKind, FILE_KINDS, moveQuestion, parseJoinFormMeta, parseQuestion, removeQuestion, replaceQuestion } from "@/lib/market/joining-forms";
import { parseVendorAreaForm, serviceAreasOf } from "@/lib/market/areas";
import { hitRateLimit } from "@/lib/rate-limit";
import { siteUrl } from "@/lib/seo";

/**
 * 115.12 Studio › Joining: the owner's forms and the applications they
 * bring, and the public page vendors fill in (on Yallapp's site only).
 */

const FILE_MAX_BYTES = 4 * 1024 * 1024;
const formOf = (formData: FormData) => Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string").map(([k, v]) => [k, v as string]));
const idOf = (formData: FormData, name = "id") => {
  const id = Number(formData.get(name));
  return Number.isInteger(id) && id > 0 ? id : null;
};

async function requireJoiningApp(): Promise<ClientContext & { app: App }> {
  const context = await clientFor("orders");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app || context.app.connector?.kind !== "restaurants") redirect("/dashboard");
  return context as ClientContext & { app: App };
}

const whoOf = (context: ClientContext) => (context.member ?? context.staff ?? context.user).email;

function backToForm(id: number, message?: string): never {
  revalidatePath("/dashboard/market/joining", "layout");
  revalidatePath("/studio/project/market/joining", "layout");
  redirect(`/dashboard/market/joining/${id}${message ? `?error=${encodeURIComponent(message)}` : ""}`);
}

export async function createJoinFormAction(formData: FormData): Promise<void> {
  const context = await requireJoiningApp();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120) || "Join us";
  const now = new Date();
  const form = await (await getStore()).createMarketApplicationForm({ appId: context.app.id, title, intro: null, kinds: [], fields: [], token: newFormToken(), open: false, createdAt: now, updatedAt: now });
  await recordStaffChange(context, `Added the joining form ${title}`);
  backToForm(form.id);
}

async function formFor(context: ClientContext & { app: App }, formData: FormData) {
  const id = idOf(formData);
  const form = id ? await (await getStore()).getMarketApplicationForm(context.app.id, id) : null;
  if (!form) redirect("/dashboard/market/joining");
  return form;
}

export async function saveJoinFormAction(formData: FormData): Promise<void> {
  const context = await requireJoiningApp();
  const form = await formFor(context, formData);
  const parsed = parseJoinFormMeta(formOf(formData));
  if (!parsed.ok) backToForm(form.id, parsed.error);
  if (parsed.value.open && form.fields.length === 0) backToForm(form.id, "Add at least one question before opening the form.");
  await (await getStore()).updateMarketApplicationForm(context.app.id, form.id, { ...parsed.value, updatedAt: new Date() });
  await recordStaffChange(context, `Changed the joining form ${parsed.value.title}`);
  backToForm(form.id);
}

export async function newJoinLinkAction(formData: FormData): Promise<void> {
  const context = await requireJoiningApp();
  const form = await formFor(context, formData);
  await (await getStore()).updateMarketApplicationForm(context.app.id, form.id, { token: newFormToken(), updatedAt: new Date() });
  await recordStaffChange(context, `Made a new link for the joining form ${form.title}`);
  backToForm(form.id);
}

/** Add, edit, remove or move a question. */
export async function questionAction(formData: FormData): Promise<void> {
  const context = await requireJoiningApp();
  const form = await formFor(context, formData);
  const op = String(formData.get("op") ?? "");
  const index = Number(formData.get("index"));
  let fields = form.fields;
  if (op === "add" || op === "edit") {
    const result = op === "add" ? addQuestion(fields, parseQuestion(formOf(formData))) : replaceQuestion(fields, index, parseQuestion(formOf(formData)));
    if (!result.ok) backToForm(form.id, result.error);
    fields = result.fields;
  } else if (op === "remove") fields = removeQuestion(fields, index);
  else if (op === "up" || op === "down") fields = moveQuestion(fields, index, op === "up" ? -1 : 1);
  await (await getStore()).updateMarketApplicationForm(context.app.id, form.id, { fields, open: fields.length ? form.open : false, updatedAt: new Date() });
  backToForm(form.id);
}

/** Accept, ask for more, or turn down an application; the vendor is emailed each time. */
export async function decideApplicationAction(formData: FormData): Promise<void> {
  const context = await requireJoiningApp();
  const store = await getStore();
  const id = idOf(formData);
  const application = id ? await store.getMarketApplication(context.app.id, id) : null;
  if (!application) redirect("/dashboard/market/joining");
  const back = (message?: string): never => {
    revalidatePath("/dashboard/market/joining", "layout");
    redirect(`/dashboard/market/joining/applications/${application.id}${message ? `?error=${encodeURIComponent(message)}` : ""}`);
  };
  const form = await store.getMarketApplicationForm(context.app.id, application.formId);
  if (!form) return back("This application's form was deleted.");
  const decision = String(formData.get("decision") ?? "");
  const message = String(formData.get("message") ?? "");
  const now = new Date();
  // 115 Every place sets where it delivers: the owner chooses it on accepting.
  const area = decision === "accept" ? parseVendorAreaForm(formOf(formData), serviceAreasOf(deliverySettingsOf(await store.getDeliverySettings(context.app.id)))) : null;
  if (area && !area.ok) return back(area.error);
  const result =
    decision === "accept"
      ? await acceptApplication(store, form, application, whoOf(context), now, area?.ok ? area.value : undefined)
      : decision === "more_info" || decision === "rejected"
        ? await answerApplication(store, application, { status: decision, message, by: whoOf(context) }, now)
        : ({ ok: false, error: "Choose what to do." } as const);
  if (!result.ok) return back(result.error);
  const kind = decision === "accept" ? "accepted" : (decision as "more_info" | "rejected");
  const mail = joiningMail(kind, { appName: context.app.appName ?? "", businessName: application.businessName, email: application.email, message: result.application.message, panelUrl: `${siteUrl()}/partner/${context.app.id}` });
  await sendMail(mail, { fromName: context.app.appName ?? undefined });
  await recordStaffChange(context, `${kind === "accepted" ? "Accepted" : kind === "rejected" ? "Turned down" : "Asked for more from"} ${application.businessName}'s application`);
  back();
}

// The public page

async function saveFile(clientId: string, file: File, kind: AssetKind, now: Date): Promise<string | { error: string }> {
  if (file.size > FILE_MAX_BYTES) return { error: "Each file can be up to 4 MB." };
  const data = Buffer.from(await file.arrayBuffer());
  const image = imageType(data);
  const pdf = data.subarray(0, 5).toString("latin1") === "%PDF-";
  if (!image && (kind === "product_image" || !pdf)) return { error: kind === "product_image" ? "The logo must be a PNG or JPEG picture." : "Files must be PDF, PNG or JPEG." };
  const assetId = newId();
  const extension = image ? image.extension : "pdf";
  const contentType = image ? image.contentType : "application/pdf";
  const blobKey = `assets/${clientId}/${assetId}.${extension}`;
  await getBlobStore().put(blobKey, data, contentType);
  await (await getStore()).createAsset({ id: assetId, clientId, kind, blobKey, contentType, size: data.length, createdAt: now });
  return assetId;
}

/** A vendor sends the form by its link. */
export async function submitJoinAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const back = (query: string): never => redirect(`/join/${encodeURIComponent(token)}?${query}`);
  const store = await getStore();
  const form = token ? await store.findMarketApplicationFormByToken(token) : null;
  if (!form) redirect("/");
  const now = new Date();
  const ip = await requestIp();
  const byIp = await hitRateLimit(store, JOINING_LIMITS.ip, ip, now);
  const byForm = await hitRateLimit(store, JOINING_LIMITS.form, String(form.id), now);
  if (!byIp.allowed || !byForm.allowed) return back(`error=${encodeURIComponent("Too many applications from here. Try again later.")}`);
  const app = await store.getAppById(form.appId);
  if (!app) redirect("/");
  const files: Record<string, string[]> = {};
  for (const f of form.fields.filter((q) => FILE_KINDS.includes(q.kind))) {
    const picked = formData.getAll(f.key).filter((v): v is File => typeof v !== "string" && v.size > 0).slice(0, f.kind === "documents" ? 10 : 1);
    for (const file of picked) {
      const saved = await saveFile(app.clientId, file, f.kind === "logo" ? "product_image" : "driver_document", now);
      if (typeof saved !== "string") return back(`error=${encodeURIComponent(saved.error)}`);
      (files[f.key] ??= []).push(saved);
    }
  }
  const values = formOf(formData);
  const result = await submitApplication(store, form, { businessName: values.business_name ?? "", email: values.email ?? "", kind: chosenKind(form, values.kind), answers: answersFromForm(form.fields, values, files) }, now);
  if (!result.ok) return back(`error=${encodeURIComponent(result.error)}`);
  back("sent=1");
}
