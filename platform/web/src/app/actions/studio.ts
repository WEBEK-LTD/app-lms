"use server";

import { redirect } from "next/navigation";
import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { newId } from "@/lib/crypto/tokens";
import { currentPlanId } from "@/lib/billing/plan-change";
import { getStore } from "@/lib/data";
import { effectivePlans } from "@/lib/entitlements";
import { hasFeature } from "@/lib/plans";
import type { StudioTemplate } from "@/lib/data/types";
import { loadLayout } from "@/lib/pages/layout";
import { parseStudioPage } from "@/lib/pages/validate";
import { getBlobStore } from "@/lib/blobs";
import { FIGMA_IMAGE_BYTES, saveFigmaImage } from "@/lib/figma/images";
import { assetUrl } from "@/lib/assets";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { loadOwnDesign, ownDesignView, removeOwnDesign, saveOwnDesign, type OwnDesignError, type OwnDesignView } from "@/lib/studio/own-designs";

/** 103R Yallapp Studio: an account's own templates. */

/** At most this many own templates per account. */
const MAX_STUDIO_TEMPLATES = 50;

export type StudioTemplateView = Pick<StudioTemplate, "id" | "name" | "page">;

async function requireStudioApp() {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard/app-type");
  return { ...context, app: context.app };
}

/** Saves a Studio page as one of the account's own templates. */
export async function saveStudioTemplateAction(name: string, pageJson: string): Promise<{ ok: true; template: StudioTemplateView } | { ok: false; error: string }> {
  const { app, user, staff, license } = await requireStudioApp();
  const store = await getStore();
  // 103R Own templates with "Save pages as own templates" on the plan; before activation, to try.
  const planId = license ? currentPlanId(license, new Date()) : null;
  if (planId && !hasFeature((await effectivePlans(store))[planId], "studio_templates")) return { ok: false, error: "Saving pages as your own templates isn't on your plan." };
  const title = typeof name === "string" ? name.trim() : "";
  if (!title || title.length > 60) return { ok: false, error: "Give the template a name of up to 60 characters." };
  if ((await store.listStudioTemplates(app.clientId)).length >= MAX_STUDIO_TEMPLATES) return { ok: false, error: `You can keep up to ${MAX_STUDIO_TEMPLATES} templates. Delete one first.` };
  let value: unknown = null;
  try {
    value = typeof pageJson === "string" && pageJson.length <= 300_000 ? JSON.parse(pageJson) : null;
  } catch {
    value = null;
  }
  const now = new Date();
  const layout = await loadLayout(store, app, now);
  const parsed = parseStudioPage(value, app, layout.draft.languages);
  if (!parsed.ok) return { ok: false, error: parsed.errors[0] ?? "The page isn't valid." };
  const template: StudioTemplate = { id: newId(), clientId: app.clientId, name: title, page: parsed.value, createdAt: now, createdBy: (staff ?? user).email };
  await store.createStudioTemplate(template);
  return { ok: true, template: { id: template.id, name: template.name, page: template.page } };
}

/** Deletes one of the account's own templates. */
export async function deleteStudioTemplateAction(id: string): Promise<{ ok: boolean }> {
  const { app } = await requireStudioApp();
  return { ok: typeof id === "string" && (await (await getStore()).deleteStudioTemplate(app.clientId, id)) };
}

/** 108.2 A picture of a design brought into Studio, kept as the account's file; its address for the page. */
export async function uploadDesignPictureAction(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: "type" | "size" | "busy" }> {
  const { app } = await requireStudioApp();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "type" };
  if (file.size > FIGMA_IMAGE_BYTES) return { ok: false, error: "size" };
  const store = await getStore();
  if (!(await hitRateLimit(store, RATE_LIMITS.designPictures, app.clientId)).allowed) return { ok: false, error: "busy" };
  const saved = await saveFigmaImage({ store, blobs: getBlobStore(), now: new Date() }, app, Buffer.from(await file.arrayBuffer()), "design_image");
  if (!saved.ok) return saved;
  return { ok: true, url: assetUrl(saved.assetId) };
}

/** 108.7 Keeps a whole design (saved from the project, or kept from an import) as one of the account's own. */
export async function saveStudioDesignAction(name: string, source: "saved" | "imported", text: string): Promise<{ ok: true; design: OwnDesignView } | { ok: false; error: OwnDesignError | "plan" }> {
  const { app, user, staff, license } = await requireStudioApp();
  const store = await getStore();
  // With "Save pages as own templates" on the plan, like own templates; before activation, to try.
  const planId = license ? currentPlanId(license, new Date()) : null;
  if (planId && !hasFeature((await effectivePlans(store))[planId], "studio_templates")) return { ok: false, error: "plan" };
  if (typeof name !== "string" || typeof text !== "string") return { ok: false, error: "not_ours" };
  const saved = await saveOwnDesign({ store, blobs: getBlobStore(), now: new Date() }, app.clientId, { name, source: source === "imported" ? "imported" : "saved", text, by: (staff ?? user).email });
  return saved.ok ? { ok: true, design: ownDesignView(saved.design) } : saved;
}

/** 108.7 One of the account's own whole designs, as its design file's text. */
export async function loadStudioDesignAction(id: string): Promise<{ ok: true; text: string } | { ok: false }> {
  const { app } = await requireStudioApp();
  const text = typeof id === "string" ? await loadOwnDesign({ store: await getStore(), blobs: getBlobStore() }, app.clientId, id) : null;
  return text ? { ok: true, text } : { ok: false };
}

/** 108.7 Deletes one of the account's own whole designs. */
export async function deleteStudioDesignAction(id: string): Promise<{ ok: boolean }> {
  const { app } = await requireStudioApp();
  return { ok: typeof id === "string" && (await removeOwnDesign({ store: await getStore(), blobs: getBlobStore() }, app.clientId, id)) };
}
