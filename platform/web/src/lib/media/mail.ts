import "server-only";
import { formatDate } from "@/components/ui";
import { appLabel } from "../app/label";
import type { PlanPaymentOutcome } from "../billing/plan-payment";
import type { DataStore } from "../data/store";
import type { Client } from "../data/types";
import { sendTemplate } from "../email/send";
import { effectivePlans } from "../entitlements";
import { appUrl } from "../env";
import { formatBytes } from "./quota";
import { appStorage } from "./usage";

/** 51 After a storage pack is paid: the email naming the app, the pack and its end. Never fails the payment. */
export async function sendStoragePaidMail(store: DataStore, client: Client, outcome: Extract<PlanPaymentOutcome, { kind: "storage_paid" }>): Promise<void> {
  const pack = outcome.packs[0];
  const appId = outcome.payment.appId;
  if (!pack || !appId) return;
  const [user, app] = await Promise.all([store.getUserById(client.userId), store.getAppById(appId)]);
  if (!user || !app) return;
  const now = new Date();
  const storage = await appStorage(store, app, await effectivePlans(store), now);
  await store.resolveOwnerNotices(app.id, storage.over ? [] : ["storage_pack_ended"], now);
  await sendTemplate("storage_pack_added", user.email, {
    name: user.name,
    app_name: appLabel(app),
    pack: `+${pack.gb} GB`,
    end_date: formatDate(pack.activeUntil),
    used: formatBytes(storage.usedBytes),
    storage: storage.limitBytes === null ? "unlimited" : formatBytes(storage.limitBytes),
    media_url: `${appUrl()}/dashboard/open?${new URLSearchParams({ app: app.id, to: "media" }).toString()}`,
  }).catch((error: unknown) => console.error("[mail] storage email failed", error));
}
