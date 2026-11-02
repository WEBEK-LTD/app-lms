import type { Metadata } from "next";
import Link from "next/link";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { hubReviewCompany } from "@/lib/courier-hub/review";
import { getStore } from "@/lib/data";
import type { PlatformSetting } from "@/lib/data/types";
import { platformSettings } from "@/lib/settings/platform";
import { CourierHubSettingForm } from "../forms";
import { SavedBy, Section } from "../parts";

export const metadata: Metadata = { title: "Yallapp Courier · Settings" };
export const dynamic = "force-dynamic";

/**
 * 104.8.2 Settings › Yallapp Courier: the review number (or email) and fixed
 * code the stores' reviewers sign in with (no message is sent; they are a
 * courier of Studio's demo delivery company with a sample job), and 104.8.3
 * the app's store links once it is published.
 */
export default async function YallappCourierSettingsPage() {
  const { adminRole } = await requireAdmin();
  const store = await getStore();
  const [settings, company] = await Promise.all([platformSettings(store, { fresh: true }), hubReviewCompany(store)]);
  const setting = settings.get("courierHub") as PlatformSetting<"courierHub"> | undefined;
  const value = setting?.value;
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change platform settings">
      <Section
        id="h-courier-hub"
        title="Yallapp Courier"
        text="The one courier app for every delivery company that chooses it in Delivery settings. Its couriers sign in with the number (or email) a company added and a code from Yallapp's own sender. The stores' reviewers sign in with the review account below: no message is sent, and their only company is Studio's demo delivery company, where they are a test courier with a sample job."
      >
        <SavedBy setting={setting} settingKey="courierHub" reset="Remove the review account and links" fallback="no review account: the stores can't review Yallapp Courier." />
        {company ? null : (
          <p className="m-0 text-sm font-semibold text-danger">
            Studio&apos;s demo delivery company isn&apos;t there yet, so reviewers would see no company. Make the demos on <Link href="/admin/demos">Demo apps</Link>.
          </p>
        )}
        <CourierHubSettingForm
          current={{ reviewPhone: value?.reviewPhone ?? "", reviewEmail: value?.reviewEmail ?? "", reviewCode: value?.reviewCode ?? "", playUrl: value?.playUrl ?? "", appStoreUrl: value?.appStoreUrl ?? "" }}
        />
        <p className="m-0 text-sm text-muted">
          The notes for the reviewers of Yallapp Courier&apos;s own listing are on <Link href="/admin/publishing#yallapp-courier">Publishing</Link>.
        </p>
      </Section>
    </ReadOnly>
  );
}
