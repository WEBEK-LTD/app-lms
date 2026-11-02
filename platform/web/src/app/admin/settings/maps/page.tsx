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

/** 104 Settings › Maps: the map tiles delivery apps draw live tracking on; 112 ride hailing apps without their own map and food apps too, with its search and routing servers. */
export default async function MapsSettingsPage() {
  const { adminRole } = await requireAdmin();
  const settings = await platformSettings(await getStore(), { fresh: true });
  const maps = settings.get("maps") as PlatformSetting<"maps"> | undefined;
  return (
    <ReadOnly when={!can(adminRole, "settings.edit")} what="change platform settings">
      <Section
        id="h-maps"
        title="Map tiles"
        text="Ride hailing apps without a map of their own open on this map (riders, drivers and the trip), and delivery and food apps show the courier, the pickup, the drop-off and the route on it; Studio's demo apps use it too. Until it's set, the apps draw the places on a plain background and open the phone's maps app for directions. OpenStreetMap's own tile, search and routing servers don't allow use in apps: use a provider such as MapTiler, Stadia Maps or Thunderforest, on a plan that fits the apps' traffic."
      >
        <SavedBy setting={maps} settingKey="maps" reset="Remove the map" fallback="no map: apps draw the places without one." />
        <MapsSettingForm tilesUrl={maps?.value.tilesUrl ?? ""} attribution={maps?.value.attribution ?? ""} searchUrl={maps?.value.searchUrl ?? ""} routingUrl={maps?.value.routingUrl ?? ""} />
      </Section>
    </ReadOnly>
  );
}
