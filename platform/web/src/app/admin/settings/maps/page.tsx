import type { Metadata } from "next";
import { ReadOnly } from "@/components/read-only";
import { can } from "@/lib/admin/permissions";
import { requireAdmin } from "@/lib/auth/session";
import { getStore } from "@/lib/data";
import type { PlatformSetting } from "@/lib/data/types";
import { platformSettings } from "@/lib/settings/platform";
import { MapsSettingForm } from "../forms";
import { SavedBy, Section } from "../parts";

export const metadata: Metadata = { title: "Maps · Settings" };
export const dynamic = "force-dynamic";

/** 104 Settings › Maps: the map tiles delivery apps draw live tracking on. */
export default async function MapsSettingsPage() {
  const { adminRole } = await requireAdmin();
  const settings = await platformSettings(await getStore(), { fresh: true });
  const maps = settings.get("maps") as PlatformSetting<"maps"> | undefined;
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change platform settings">
      <Section
        id="h-maps"
        title="Map tiles"
        text="Delivery apps with live tracking show where the courier is on this map. Until it's set, they show the courier's position with a button that opens the phone's maps app. OpenStreetMap's own tile servers don't allow use in apps: use a provider such as MapTiler, Stadia Maps or Thunderforest, on a plan that fits the apps' traffic."
      >
        <SavedBy setting={maps} settingKey="maps" reset="Remove the map" fallback="no map: apps show the position without one." />
        <MapsSettingForm tilesUrl={maps?.value.tilesUrl ?? ""} attribution={maps?.value.attribution ?? ""} />
      </Section>
    </ReadOnly>
  );
}
