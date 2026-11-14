"use client";

import { useDashT } from "@/components/dashboard-i18n";
import { MediaPicker } from "@/components/media-picker";
import type { StudioNode } from "@/lib/pages/types";

/**
 * 130 The inspector's part for a live card's premium looks (`live_status`
 * and `tracking` drawn as `hero`, `ring`, `pill` or `steps`): the accent of
 * its live dot, stages and button by day and by night, and the photo a
 * ring or the steps' avatar shows. Shown under each element's own controls
 * once one of the looks is chosen.
 */

type Change = (patch: Partial<StudioNode>) => void;

const FIELD = { border: "1px solid var(--studio-line)" } as const;

export function LiveLookControls({ node, onChange }: { node: StudioNode; onChange: Change }) {
  const t = useDashT();
  const live = node.type === "live_status" ? node.live_status : node.tracking;
  const style = live?.style;
  if (!live || !style || !["hero", "ring", "pill", "steps"].includes(style)) return null;
  const set = (patch: { accent?: string | undefined; dark_accent?: string | undefined }) => {
    const next = { ...live, ...patch };
    if (!next.accent) delete next.accent;
    if (!next.dark_accent) delete next.dark_accent;
    onChange(node.type === "live_status" ? { live_status: next as NonNullable<StudioNode["live_status"]> } : { tracking: next as NonNullable<StudioNode["tracking"]> });
  };
  const color = (label: string, key: "accent" | "dark_accent") => (
    <label className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="flex items-center gap-1">
        <input type="color" value={live[key] ?? "#1F4E5F"} onChange={(e) => set({ [key]: e.target.value.toUpperCase() })} className="h-7 w-10 cursor-pointer rounded-md bg-white p-0.5" style={FIELD} />
        {live[key] ? (
          <button type="button" onClick={() => set({ [key]: undefined })} className="rounded-md bg-white px-2 py-0.5 text-xs" style={FIELD}>
            {t("studio.liveLookAccentReset")}
          </button>
        ) : null}
      </span>
    </label>
  );
  return (
    <div className="flex flex-col gap-2" data-live-look-controls="">
      {color(t("studio.liveLookAccent"), "accent")}
      {color(t("studio.liveLookDarkAccent"), "dark_accent")}
      {style === "ring" || style === "steps" ? (
        <div className="flex items-center gap-2">
          <MediaPicker kind="image" share library onPick={(url) => onChange({ image_url: url })} label={t("studio.liveLookPhoto")} />
          {node.image_url ? (
            <button type="button" onClick={() => onChange({ image_url: null })} className="rounded-md bg-white px-2 py-0.5" style={FIELD}>
              {t("studio.removePicture")}
            </button>
          ) : null}
        </div>
      ) : null}
      <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
        {t("studio.liveLookHint")}
      </span>
    </div>
  );
}
