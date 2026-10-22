"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordStaffChange } from "@/lib/admin/audit";
import { clientFor, mayUseDashboard } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { IntegrationKey } from "@/lib/data/types";
import { encryptionKey, paymentApiUrls } from "@/lib/env";
import type { FormState } from "@/lib/forms";
import { testIntegration, withCheck } from "@/lib/integrations";
import { settleIntegration } from "@/lib/integrations/schedule";
import { hitRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const KEYS: IntegrationKey[] = ["website", "payments", "whatsapp", "mail", "push", "huawei_push", "google_play", "app_store", "galaxy", "appgallery", "xiaomi"];

/**
 * 80.1 "Test" on Dashboard › Integrations: asks the connection's other side
 * now, sending nothing to anyone (lib/integrations), and keeps the result.
 * Counted with the API checks (10 every 10 minutes per account).
 */
export async function testIntegrationAction(_: FormState, formData: FormData): Promise<FormState> {
  const context = await clientFor("settings");
  if (!context) redirect("/sign-in");
  if (!mayUseDashboard(context)) redirect("/pending");
  if (!context.app) redirect("/dashboard/app-type");
  const app = context.app;
  const key = String(formData.get("key") ?? "") as IntegrationKey;
  if (!KEYS.includes(key)) return { ok: false, message: "This connection can't be tested here." };
  const store = await getStore();
  const limited = await hitRateLimit(store, RATE_LIMITS.apiCheck, context.client.id);
  if (!limited.allowed) return { ok: false, message: "Too many checks. Try again in a few minutes." };
  const now = new Date();
  const check = await testIntegration(key, app, { store, encryptionKey: encryptionKey(), now, paymentUrls: paymentApiUrls() });
  if (!check) return { ok: false, message: "This connection can't be tested here." };
  const current = (await store.getAppById(app.id)) ?? app;
  await store.updateApp(app.id, { integrationChecks: withCheck(current, key, check) }, now);
  // 80.2 Working again: what the daily check told the owner and the team closes.
  if (check.ok) await settleIntegration(store, app, key, now);
  await recordStaffChange(context, `Tested a connection (${key}): ${check.ok ? "it works" : "it failed"}`);
  revalidatePath("/dashboard/integrations");
  return { ok: check.ok, message: check.ok ? "It works." : "It didn't work. The details are below." };
}
