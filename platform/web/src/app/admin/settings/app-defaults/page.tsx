import type { Metadata } from "next";
import { resetAppDefaultsAction } from "@/app/actions/app-defaults";
import { SubmitButton } from "@/components/form";
import { formatDateTime } from "@/components/ui";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { PlatformSetting } from "@/lib/data/types";
import { BUILT_IN_APP_DEFAULTS } from "@/lib/pages/defaults";
import { platformSettings } from "@/lib/settings/platform";
import { AppDefaultsForm } from "../app-defaults-form";
import { Section } from "../parts";

export const metadata: Metadata = { title: "New apps · Settings" };
export const dynamic = "force-dynamic";

/** 95.1 Settings › New apps: the look and languages a new app starts with. */
export default async function AppDefaultsSettingsPage() {
  const { adminRole } = await requireAdmin();
  const settings = await platformSettings(await getStore(), { fresh: true });
  const appDefaults = settings.get("appDefaults") as PlatformSetting<"appDefaults"> | undefined;
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change platform settings">
      <Section
        id="h-app-defaults"
        title="Defaults for new apps"
        text="The look and languages a new app starts with. Clients change them on their Pages & look page; apps that already have pages keep theirs."
      >
        {appDefaults ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-muted">
              Set here by {appDefaults.updatedBy}, {formatDateTime(appDefaults.updatedAt)}.
            </p>
            <form action={resetAppDefaultsAction}>
              <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                Use the built-in defaults
              </SubmitButton>
            </form>
          </div>
        ) : (
          <p className="m-0 text-sm text-muted">Now: the built-in defaults.</p>
        )}
        <AppDefaultsForm current={appDefaults?.value ?? BUILT_IN_APP_DEFAULTS} />
      </Section>
    </ReadOnly>
  );
}
