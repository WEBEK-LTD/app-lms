import type { Metadata } from "next";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { PlatformSetting } from "@/lib/data/types";
import { appUrl } from "@/lib/env";
import { platformSettings } from "@/lib/settings/platform";
import { PartnerAppForm } from "../forms";
import { SavedBy, Section } from "../parts";

export const metadata: Metadata = { title: "Store platforms · Settings" };
export const dynamic = "force-dynamic";

/** 95.1 Settings › Store platforms (25): stores on Salla and Zid connect with OAuth through Yallapp's partner apps. */
export default async function StorePlatformSettingsPage() {
  const { adminRole } = await requireAdmin();
  const settings = await platformSettings(await getStore(), { fresh: true });
  const partnerApps = [
    {
      key: "sallaApp" as const,
      id: "salla",
      name: "Salla",
      setting: settings.get("sallaApp") as PlatformSetting<"sallaApp"> | undefined,
      webhook: `${appUrl()}/api/webhooks/salla`,
      help: (
        <>
          In the Salla Partners portal, create an app (Apps, then Create App) and choose the custom mode for its authorization. Set its callback URL to{" "}
          <code className="break-all">{appUrl()}/oauth/salla</code>, give it read access to the store, products, categories, orders and customers,
          and turn on offline access. For webhooks, set <code className="break-all">{appUrl()}/api/webhooks/salla</code> with the Signature
          security strategy. Copy its Client ID, Client Secret and Webhook Secret here.
        </>
      ),
    },
    {
      key: "zidApp" as const,
      id: "zid",
      name: "Zid",
      setting: settings.get("zidApp") as PlatformSetting<"zidApp"> | undefined,
      webhook: null,
      help: (
        <>
          In the Zid Partner Dashboard, create an app with the redirect URL <code className="break-all">{appUrl()}/oauth/zid</code> and read
          access to the store, products, categories, orders and customers. Copy its Client ID and Client Secret here.
        </>
      ),
    },
  ];
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change platform settings">
      {partnerApps.map((p) => (
        <Section
          key={p.key}
          id={`h-${p.id}`}
          title={`${p.name} partner app`}
          text={`Store apps connect a ${p.name} store with "Connect with ${p.name}" on their Website step, through this app. Until it's set, ${p.name} shows as not available yet.`}
        >
          <SavedBy setting={p.setting} settingKey={p.key} reset="Remove the app" fallback={`not set. Store apps can't connect a ${p.name} store yet.`} />
          <p className="m-0 text-sm leading-relaxed text-ink-4">{p.help}</p>
          <PartnerAppForm
            settingKey={p.key}
            name={p.name}
            clientId={p.setting?.value.clientId ?? ""}
            saved={{ clientSecret: Boolean(p.setting), webhookSecret: Boolean(p.setting?.value.webhookSecretEncrypted) }}
            webhook={p.webhook}
          />
        </Section>
      ))}
    </ReadOnly>
  );
}
