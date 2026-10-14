"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { activateClient, endOfDayUtc, regenerateLicenseKey, reinstateClient, suspendClient } from "@/lib/admin/clients";
import { recordAudit } from "@/lib/admin/audit";
import type { AdminPermission } from "@/lib/admin/permissions";
import { registerClient } from "@/lib/auth/accounts";
import { createPasswordReset } from "@/lib/auth/reset";
import { getClientContext, requireAdmin, startManaging, stopManaging, type AdminUser } from "@/lib/auth/session";
import { getBlobStore } from "@/lib/blobs";
import { newId } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { DuplicateEmailError } from "@/lib/data/store";
import type { App } from "@/lib/data/types";
import { appUrl, encryptionKey, iyzicoApiUrl, superAdminEmails } from "@/lib/env";
import { approvePayout } from "@/lib/catalog/payment";
import { accountForOrder, orderNumber } from "@/lib/catalog/settings";
import { fieldErrors, formValues, type FormState } from "@/lib/forms";
import { activationMail, renewalMail, resetPasswordMail, sendMail } from "@/lib/mail";
import { getPlans } from "@/lib/settings/platform";
import { formatDate } from "@/components/ui";
import { activateSchema, addClientSchema, clientDetailsSchema, releaseSchema } from "@/lib/validation";

const PLUGIN_MAX_BYTES = 5.5 * 1024 * 1024;

/**
 * Where a client action goes back to: the client's own page when the form
 * came from it (a hidden `from=client`), else their row in the client list.
 */
function clientUrl(clientId: string, done?: string, formData?: FormData): string {
  if (formData?.get("from") === "client") return `/admin/clients/${clientId}${done ? `?done=${done}` : ""}`;
  return `/admin/clients?client=${clientId}${done ? `&done=${done}` : ""}`;
}

function revalidateClient(clientId: string): void {
  revalidatePath("/admin", "layout");
  revalidatePath(`/admin/clients/${clientId}`);
}

async function clientName(clientId: string): Promise<string> {
  const store = await getStore();
  const client = await store.getClientById(clientId);
  const user = client ? await store.getUserById(client.userId) : null;
  return user?.name ?? "a client";
}

/** Where an app's content comes from, for the audit log. */
function websiteSummary(app: Pick<App, "backend" | "connector">) {
  return { backend: app.backend, connector: app.connector?.kind === "platform" ? app.connector.platform : (app.connector?.kind ?? null) };
}

export async function activateClientAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("clients.license");
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
  const before = await store.getLicenseByClientId(client.id);
  const outcome = await activateClient(
    store,
    { clientId: client.id, plan: parsed.data.plan, activeUntil, paymentNote: parsed.data.paymentNote },
    encryptionKey(),
    now,
  );
  const planLabel = (await getPlans(store))[parsed.data.plan].name;
  const until = formatDate(activeUntil);
  const activated = client.status === "pending" || outcome.created;
  await recordAudit({
    actor: admin,
    action: activated ? "client.activate" : "client.renew",
    target: { type: "client", id: client.id },
    clientId: client.id,
    summary: `${activated ? "Activated" : "Saved"} ${user?.name ?? "the client"} on ${planLabel} until ${until}${parsed.data.paymentNote ? ` (${parsed.data.paymentNote})` : ""}`,
    before: { status: client.status, plan: before?.plan ?? null, expiresAt: before?.expiresAt ?? null },
    after: { status: "active", plan: parsed.data.plan, expiresAt: activeUntil },
  });
  if (user) {
    const dashboard = `${appUrl()}/dashboard`;
    await sendMail(
      activated
        ? activationMail(user.email, user.name, planLabel, until, outcome.licenseKey, dashboard)
        : renewalMail(user.email, user.name, planLabel, until, dashboard),
    ).catch((error: unknown) => console.error("[mail] activation email failed", error));
  }
  revalidateClient(client.id);
  redirect(clientUrl(client.id, outcome.created ? "activated" : "renewed", formData));
}

async function clientIdFrom(formData: FormData, permission: AdminPermission): Promise<{ id: string; admin: AdminUser }> {
  const admin = await requireAdmin(permission);
  const id = String(formData.get("clientId") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/admin/clients");
  return { id, admin };
}

export async function suspendClientAction(formData: FormData): Promise<void> {
  const { id, admin } = await clientIdFrom(formData, "clients.suspend");
  await suspendClient(await getStore(), id, new Date());
  await recordAudit({
    actor: admin,
    action: "client.suspend",
    target: { type: "client", id },
    clientId: id,
    summary: `Suspended ${await clientName(id)}`,
    before: { status: "active" },
    after: { status: "suspended" },
  });
  revalidateClient(id);
  redirect(clientUrl(id, "suspended", formData));
}

export async function reinstateClientAction(formData: FormData): Promise<void> {
  const { id, admin } = await clientIdFrom(formData, "clients.suspend");
  await reinstateClient(await getStore(), id, new Date());
  await recordAudit({
    actor: admin,
    action: "client.reinstate",
    target: { type: "client", id },
    clientId: id,
    summary: `Reinstated ${await clientName(id)}`,
    before: { status: "suspended" },
    after: { status: "active" },
  });
  revalidateClient(id);
  redirect(clientUrl(id, "reinstated", formData));
}

/** Our team moves an app to the hosted API (no website needed), or back to the Website step. */
export async function setHostedApiAction(formData: FormData): Promise<void> {
  const { id, admin } = await clientIdFrom(formData, "clients.edit");
  const store = await getStore();
  const app = await store.getAppByClientId(id);
  if (!app) redirect(clientUrl(id, undefined, formData));
  const now = new Date();
  const hosted = formData.get("hosted") === "1";
  if (hosted) {
    await store.updateApp(app.id, { backend: "hosted", websiteDoneAt: now }, now);
  } else if (app.backend === "hosted") {
    await store.updateApp(app.id, { backend: "wordpress", connector: null, websiteDoneAt: null }, now);
  }
  const after = (await store.getAppById(app.id)) ?? app;
  await recordAudit({
    actor: admin,
    action: "client.hosted_api",
    target: { type: "app", id: app.id },
    clientId: id,
    summary: hosted ? `Moved ${await clientName(id)}'s app to the hosted API` : `Moved ${await clientName(id)}'s app off the hosted API`,
    before: websiteSummary(app),
    after: websiteSummary(after),
  });
  revalidateClient(id);
  redirect(clientUrl(id, hosted ? "hosted" : "unhosted", formData));
}

/** Name, WhatsApp number and website of a client. Their sign-in email stays as it is. */
export async function saveClientDetailsAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("clients.edit");
  const values = formValues(formData);
  const parsed = clientDetailsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values };
  const store = await getStore();
  const client = await store.getClientById(parsed.data.clientId);
  if (!client) return { message: "This client no longer exists." };
  const user = await store.getUserById(client.userId);
  const now = new Date();
  await store.updateUser(client.userId, { name: parsed.data.name }, now);
  await store.updateClient(client.id, { whatsapp: parsed.data.whatsapp, siteUrl: parsed.data.siteUrl }, now);
  await recordAudit({
    actor: admin,
    action: "client.details",
    target: { type: "client", id: client.id },
    clientId: client.id,
    summary: `Edited ${parsed.data.name}'s details`,
    before: { name: user?.name ?? null, whatsapp: client.whatsapp, siteUrl: client.siteUrl },
    after: { name: parsed.data.name, whatsapp: parsed.data.whatsapp, siteUrl: parsed.data.siteUrl },
  });
  revalidateClient(client.id);
  return { ok: true, message: "Details saved.", values };
}

/** Opens the client's own dashboard, where our team changes anything the client can. */
export async function manageClientAction(formData: FormData): Promise<void> {
  const { id, admin } = await clientIdFrom(formData, "clients.edit");
  const store = await getStore();
  if (!(await store.getClientById(id))) redirect("/admin/clients");
  await startManaging(id);
  await recordAudit({ actor: admin, action: "client.manage_app", target: { type: "client", id }, clientId: id, summary: `Opened ${await clientName(id)}'s dashboard` });
  redirect((await store.getAppByClientId(id)) ? "/dashboard" : "/dashboard/app-type");
}

/** Back from a client's dashboard to their page in the admin. */
export async function stopManagingAction(): Promise<void> {
  await requireAdmin();
  const context = await getClientContext();
  await stopManaging();
  redirect(context ? `/admin/clients/${context.client.id}` : "/admin/clients");
}

export async function regenerateKeyAction(formData: FormData): Promise<void> {
  const { id, admin } = await clientIdFrom(formData, "clients.license");
  await regenerateLicenseKey(await getStore(), id, encryptionKey(), new Date());
  await recordAudit({
    actor: admin,
    action: "client.license_key",
    target: { type: "client", id },
    clientId: id,
    summary: `New license key for ${await clientName(id)}; the old one stopped working`,
  });
  revalidateClient(id);
  redirect(clientUrl(id, "regenerated", formData));
}

export async function releaseClientSiteAction(formData: FormData): Promise<void> {
  const { id, admin } = await clientIdFrom(formData, "clients.license");
  const store = await getStore();
  const license = await store.getLicenseByClientId(id);
  const activation = license ? await store.getActivation(license.id) : null;
  if (license) await store.deleteActivation(license.id);
  await recordAudit({
    actor: admin,
    action: "client.release_site",
    target: { type: "client", id },
    clientId: id,
    summary: `Released ${await clientName(id)}'s license${activation ? ` from ${activation.siteUrl}` : ""}`,
    before: { site: activation?.siteUrl ?? null },
    after: { site: null },
  });
  revalidateClient(id);
  redirect(clientUrl(id, "released", formData));
}

/** Creates a client account for someone who contacted us directly. They get an email to set their password. */
export async function addClientAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("clients.edit");
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
  await recordAudit({
    actor: admin,
    action: "client.add",
    target: { type: "client", id: clientId },
    clientId,
    summary: `Added ${parsed.data.name} (${parsed.data.email})`,
    after: { name: parsed.data.name, email: parsed.data.email, whatsapp: parsed.data.whatsapp, siteUrl: parsed.data.siteUrl },
  });
  const reset = await createPasswordReset(store, parsed.data.email, now, { adminEmails: [] });
  if (reset) {
    const link = `${appUrl()}/reset-password?token=${encodeURIComponent(reset.token)}`;
    await sendMail(resetPasswordMail(reset.user.email, reset.user.name, link, true)).catch((error: unknown) =>
      console.error("[mail] set-password email failed", error),
    );
  }
  revalidatePath("/admin", "layout");
  redirect(clientUrl(clientId, "added"));
}

export async function uploadReleaseAction(_: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("releases.manage");
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
  const release = {
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
  };
  await store.createRelease(release);
  await recordAudit({
    actor: admin,
    action: "release.upload",
    target: { type: "release", id },
    summary: `Uploaded plugin ${release.version}${release.published ? " and published it" : " as a draft"}`,
    after: { version: release.version, published: release.published, size: release.size, sha256: release.sha256 },
  });
  revalidatePath("/admin/releases");
  return { ok: true, message: `Version ${parsed.data.version} uploaded${parsed.data.published ? " and published" : " as a draft"}.` };
}

export async function toggleReleaseAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("releases.manage");
  const store = await getStore();
  const release = await store.getRelease(String(formData.get("releaseId") ?? ""));
  if (release) {
    await store.updateRelease(release.id, { published: !release.published });
    await recordAudit({
      actor: admin,
      action: release.published ? "release.unpublish" : "release.publish",
      target: { type: "release", id: release.id },
      summary: `${release.published ? "Unpublished" : "Published"} plugin ${release.version}`,
      before: { published: release.published },
      after: { published: !release.published },
    });
  }
  revalidatePath("/admin/releases");
  redirect("/admin/releases");
}

export async function deleteReleaseAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("releases.manage");
  const store = await getStore();
  const release = await store.getRelease(String(formData.get("releaseId") ?? ""));
  if (release) {
    await store.deleteRelease(release.id);
    await getBlobStore().delete(release.blobKey);
    await recordAudit({
      actor: admin,
      action: "release.delete",
      target: { type: "release", id: release.id },
      summary: `Deleted plugin draft ${release.version}`,
      before: { version: release.version, published: release.published },
    });
  }
  revalidatePath("/admin/releases");
  redirect("/admin/releases");
}

/** Releases a marketplace order's share to the shop (when the shop didn't complete the order). */
export async function releasePayoutAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin("payments.manage");
  const store = await getStore();
  const appId = String(formData.get("appId") ?? "");
  const orderId = Number(formData.get("orderId"));
  const app = /^[0-9a-f-]{36}$/i.test(appId) ? await store.getAppById(appId) : null;
  const order = app && Number.isSafeInteger(orderId) ? await store.getCatalogOrder(app.id, orderId) : null;
  let done = "payout-failed";
  if (app && order && order.paidAt && order.commissionCents !== null) {
    const account = await accountForOrder(store, app, order, encryptionKey());
    if (account && (await approvePayout({ store, app, account, baseUrl: iyzicoApiUrl(), now: new Date(), order }))) done = "payout-released";
  }
  if (app && order) {
    await recordAudit({
      actor: admin,
      action: "payout.release",
      target: { type: "order", id: `${app.id}:${order.id}` },
      clientId: app.clientId,
      summary: `${done === "payout-released" ? "Released" : "Tried to release"} the payout of order ${orderNumber(order)} (${app.appName ?? "unnamed app"})`,
    });
  }
  revalidatePath("/admin/payments");
  redirect(`/admin/payments?done=${done}`);
}
