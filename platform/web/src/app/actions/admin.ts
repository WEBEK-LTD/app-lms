"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { activateClient, endOfDayUtc, regenerateLicenseKey, reinstateClient, suspendClient } from "@/lib/admin/clients";
import { registerClient } from "@/lib/auth/accounts";
import { createPasswordReset } from "@/lib/auth/reset";
import { requireAdmin } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { DuplicateEmailError } from "@/lib/data/store";
import { appUrl, encryptionKey, superAdminEmails } from "@/lib/env";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { activationMail, renewalMail, resetPasswordMail, sendMail } from "@/lib/mail";
import { PLAN_INFO } from "@/lib/plans";
import { formatDate } from "@/components/ui";
import { activateSchema, addClientSchema, releaseSchema } from "@/lib/validation";

const PLUGIN_MAX_BYTES = 5.5 * 1024 * 1024;

function clientUrl(clientId: string, extra = ""): string {
  return `/admin?client=${clientId}${extra}`;
}

export async function activateClientAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const parsed = activateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const now = new Date();
  const activeUntil = endOfDayUtc(parsed.data.activeUntil);
  if (activeUntil.getTime() <= now.getTime()) return { errors: { activeUntil: "Choose a date in the future." }, values };

  const store = await getStore();
  const client = await store.getClientById(parsed.data.clientId);
  if (!client) return { message: "This client no longer exists." };
  const user = await store.getUserById(client.userId);
  const outcome = await activateClient(
    store,
    { clientId: client.id, plan: parsed.data.plan, activeUntil, paymentNote: parsed.data.paymentNote },
    encryptionKey(),
    now,
  );
  if (user) {
    const planLabel = PLAN_INFO[parsed.data.plan].name;
    const until = formatDate(activeUntil);
    const dashboard = `${appUrl()}/dashboard`;
    await sendMail(
      client.status === "pending" || outcome.created
        ? activationMail(user.email, user.name, planLabel, until, outcome.licenseKey, dashboard)
        : renewalMail(user.email, user.name, planLabel, until, dashboard),
    ).catch((error: unknown) => console.error("[mail] activation email failed", error));
  }
  revalidatePath("/admin");
  redirect(clientUrl(client.id, outcome.created ? "&done=activated" : "&done=renewed"));
}

async function clientIdFrom(formData: FormData): Promise<string> {
  await requireAdmin();
  const id = String(formData.get("clientId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin");
  return id;
}

export async function suspendClientAction(formData: FormData): Promise<void> {
  const id = await clientIdFrom(formData);
  await suspendClient(await getStore(), id, new Date());
  revalidatePath("/admin");
  redirect(clientUrl(id, "&done=suspended"));
}

export async function reinstateClientAction(formData: FormData): Promise<void> {
  const id = await clientIdFrom(formData);
  await reinstateClient(await getStore(), id, new Date());
  revalidatePath("/admin");
  redirect(clientUrl(id, "&done=reinstated"));
}

export async function regenerateKeyAction(formData: FormData): Promise<void> {
  const id = await clientIdFrom(formData);
  await regenerateLicenseKey(await getStore(), id, encryptionKey(), new Date());
  revalidatePath("/admin");
  redirect(clientUrl(id, "&done=regenerated"));
}

export async function releaseClientSiteAction(formData: FormData): Promise<void> {
  const id = await clientIdFrom(formData);
  const store = await getStore();
  const license = await store.getLicenseByClientId(id);
  if (license) await store.deleteActivation(license.id);
  revalidatePath("/admin");
  redirect(clientUrl(id, "&done=released"));
}

/** Creates a client account for someone who contacted us directly. They get an email to set their password. */
export async function addClientAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const parsed = addClientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  if (superAdminEmails().includes(parsed.data.email)) return { errors: { email: "This is a super admin email." }, values };
  const store = await getStore();
  const now = new Date();
  let clientId: string;
  try {
    const { client } = await registerClient(store, { ...parsed.data, password: null }, now);
    clientId = client.id;
  } catch (error) {
    if (error instanceof DuplicateEmailError) return { errors: { email: "There's already an account with this email." }, values };
    throw error;
  }
  const reset = await createPasswordReset(store, parsed.data.email, now, { adminEmails: [] });
  if (reset) {
    const link = `${appUrl()}/reset-password?token=${encodeURIComponent(reset.token)}`;
    await sendMail(resetPasswordMail(reset.user.email, reset.user.name, link, true)).catch((error: unknown) =>
      console.error("[mail] set-password email failed", error),
    );
  }
  revalidatePath("/admin");
  redirect(clientUrl(clientId, "&done=added"));
}

export async function uploadReleaseAction(_: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const values = formValues(formData);
  const parsed = releaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const file = formData.get("file");
  if (!file || typeof file === "string" || file.size === 0) return { errors: { file: "Choose the plugin .zip file." }, values };
  if (file.size > PLUGIN_MAX_BYTES) return { errors: { file: "The file is larger than 5.5 MB." }, values };
  const data = Buffer.from(await file.arrayBuffer());
  if (data.length < 4 || data.readUInt32LE(0) !== 0x04034b50) return { errors: { file: "This isn't a .zip file." }, values };

  const store = await getStore();
  if (await store.getReleaseByVersion(parsed.data.version)) {
    return { errors: { version: "This version already exists." }, values };
  }
  const id = newId();
  const blobKey = `plugin/yallapp-${parsed.data.version}-${id}.zip`;
  await getBlobStore().put(blobKey, data, "application/zip");
  await store.createRelease({
    id,
    version: parsed.data.version,
    changelog: parsed.data.changelog,
    requiresWp: parsed.data.requiresWp,
    requiresPhp: parsed.data.requiresPhp,
    testedWp: parsed.data.testedWp,
    blobKey,
    size: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
    published: parsed.data.published,
    createdAt: new Date(),
  });
  revalidatePath("/admin/releases");
  return { ok: true, message: `Version ${parsed.data.version} uploaded${parsed.data.published ? " and published" : " as a draft"}.` };
}

export async function toggleReleaseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const store = await getStore();
  const release = await store.getRelease(String(formData.get("releaseId") ?? ""));
  if (release) await store.updateRelease(release.id, { published: !release.published });
  revalidatePath("/admin/releases");
  redirect("/admin/releases");
}

export async function deleteReleaseAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const store = await getStore();
  const release = await store.getRelease(String(formData.get("releaseId") ?? ""));
  if (release) {
    await store.deleteRelease(release.id);
    await getBlobStore().delete(release.blobKey);
  }
  revalidatePath("/admin/releases");
  redirect("/admin/releases");
}
