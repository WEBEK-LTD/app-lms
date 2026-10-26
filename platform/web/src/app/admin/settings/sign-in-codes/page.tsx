import type { Metadata } from "next";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { PlatformSetting } from "@/lib/data/types";
import { platformSettings } from "@/lib/settings/platform";
import { OtpSettingForm, TestCodeForm } from "../forms";
import { otpFallback } from "../summary";
import { Section, Source } from "../parts";

export const metadata: Metadata = { title: "Sign-in codes · Settings" };
export const dynamic = "force-dynamic";

/** 95.1 Settings › Sign-in codes: the sender of the hosted API's codes (waabek, WhatsApp or a webhook), and a test code. */
export default async function SignInCodeSettingsPage() {
  const { adminRole } = await requireAdmin();
  const settings = await platformSettings(await getStore(), { fresh: true });
  const otp = settings.get("otp") as PlatformSetting<"otp"> | undefined;
  const value = otp?.value;
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change platform settings">
      <Section id="h-otp" title="Sign-in codes" text="How apps on the hosted API send customers their 6-digit sign-in codes.">
        <Source setting={otp} settingKey="otp" fallback={otpFallback()} />
        <OtpSettingForm
          current={{
            kind: value?.kind ?? null,
            phoneNumberId: value?.kind === "whatsapp" ? value.phoneNumberId : "",
            template: value?.kind === "whatsapp" ? value.template : "",
            language: value?.kind === "whatsapp" ? value.language : "",
            url: value?.kind === "webhook" ? value.url : "",
            baseUrl: value?.kind === "waabek" ? value.baseUrl : "",
            instanceId: value?.kind === "waabek" ? (value.instanceId ?? "") : "",
          }}
        />
        <TestCodeForm />
      </Section>
    </ReadOnly>
  );
}
