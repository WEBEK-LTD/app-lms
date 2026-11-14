"use client";

import { useDashT } from "@/components/dashboard-i18n";
import { MediaPicker } from "@/components/media-picker";
import type { DashKey } from "@/i18n/dashboard";
import { IconPicker } from "@/app/dashboard/pages/controls";
import { STUDIO_TRACKING_KINDS, STUDIO_TRACKING_STYLES, type StudioMapDrawing, type StudioNode } from "@/lib/pages/types";
import { RangeField } from "./controls";
import { MAP_COLORS } from "@/components/studio/covers";
// 129.21–129.24 The map's premium looks.
import { MapLooksControls } from "./map-looks-controls";
// 130 The live cards' premium looks.
import { LiveLookControls } from "./live-look-controls";

/**
 * 128 The inspector's part for the cover layouts and the live card: a
 * photo hero's photo (the shade over it is any picture's, the inspector's
 * ScrimFields), a map header's markers, how
 * far either's last element hangs over its foot, and what a live card
 * follows and how it looks. Their colours, size, corners and space are the
 * inspector's usual ones; what they hold is edited element by element.
 */

type Change = (patch: Partial<StudioNode>) => void;

const FIELD = { border: "1px solid var(--studio-line)" } as const;

function ColorIn({ label, value, onChange }: { label: string; value: string | null | undefined; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <input type="color" value={value ?? "#000000"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-7 w-10 cursor-pointer rounded-md bg-white p-0.5" style={FIELD} />
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex items-center gap-1">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: "#1F8A4C" }} />
      {label}
    </label>
  );
}

/** Spots for `count` markers around the map, the ones kept where they were. */
function markersFor(count: number, kept: StudioMapDrawing["markers"]): NonNullable<StudioMapDrawing["markers"]> {
  const spots = [
    { x: 15, y: 23 },
    { x: 85, y: 36 },
    { x: 34, y: 76 },
    { x: 71, y: 74 },
    { x: 58, y: 29 },
    { x: 24, y: 50 },
    { x: 88, y: 60 },
    { x: 46, y: 12 },
  ];
  return Array.from({ length: count }, (_, i) => kept?.[i] ?? spots[i % spots.length]!);
}

export function CoverControls({ node, onChange }: { node: StudioNode; onChange: Change }) {
  const t = useDashT();
  const overlap = <RangeField label={t("studio.coverOverlap")} value={node.overlap ?? 0} min={0} max={200} step={2} unit="px" fallback={0} onChange={(v) => onChange({ overlap: v || undefined })} />;
  if (node.type === "map_header") {
    const drawing: StudioMapDrawing = node.map_drawing ?? {};
    const set = (patch: Partial<StudioMapDrawing>) => onChange({ map_drawing: { ...drawing, ...patch } });
    return (
      <div className="flex flex-col gap-2" data-cover-controls="map">
        <RangeField label={t("studio.mapMarkers")} value={drawing.markers?.length ?? 0} min={0} max={8} fallback={0} onChange={(n) => set({ markers: n ? markersFor(n, drawing.markers) : undefined })} />
        <IconPicker id={`map-icon-${node.id}`} label={t("studio.mapIcon")} value={drawing.icon ?? "local_taxi"} onChange={(icon) => set({ icon: icon ?? undefined })} />
        <ColorIn label={t("studio.mapAccent")} value={drawing.accent ?? "#F5B700"} onChange={(accent) => set({ accent })} />
        <ColorIn label={t("studio.mapChip")} value={drawing.chip ?? "#1C2541"} onChange={(chip) => set({ chip })} />
        {/* 128.10 Its land by day and by night (the element's background and dark background; missing, the map's own). */}
        <ColorIn label={t("studio.mapLand")} value={node.background ?? MAP_COLORS.light.land} onChange={(background) => onChange({ background })} />
        <ColorIn label={t("studio.mapLandDark")} value={node.dark_background ?? MAP_COLORS.dark.land} onChange={(dark_background) => onChange({ dark_background })} />
        <Toggle label={t("studio.mapMe")} checked={drawing.me === true} onChange={(me) => set({ me: me || undefined })} />
        <Toggle label={t("studio.mapLive")} checked={drawing.live === true} onChange={(live) => set({ live: live || undefined })} />
        {/* 129.21–129.24 Its premium look, pins, words and route. */}
        <MapLooksControls drawing={drawing} set={set} id={node.id} />
        {overlap}
        <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
          {t("studio.coverHint")}
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2" data-cover-controls="photo">
      <div className="flex items-center gap-2">
        <MediaPicker kind="image" share library onPick={(url) => onChange({ image_url: url })} label={t("studio.choosePicture")} />
        {node.image_url ? (
          <button type="button" onClick={() => onChange({ image_url: null })} className="rounded-md bg-white px-2 py-0.5" style={FIELD}>
            {t("studio.removePicture")}
          </button>
        ) : null}
      </div>
      {overlap}
      <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
        {t("studio.coverHint")}
      </span>
    </div>
  );
}

export function TrackingControls({ node, onChange }: { node: StudioNode; onChange: Change }) {
  const t = useDashT();
  const tracking = node.tracking ?? { kind: "shipment" as const };
  return (
    <div className="flex flex-col gap-2" data-tracking-controls="">
      <label className="flex flex-col gap-1 font-bold">
        {t("studio.trackingKind")}
        <select value={tracking.kind} onChange={(e) => onChange({ tracking: { ...tracking, kind: e.target.value as typeof tracking.kind } })} className="h-9 rounded-lg px-2 font-normal" style={FIELD}>
          {STUDIO_TRACKING_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`studio.tracking_${k}` as DashKey)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 font-bold">
        {t("studio.trackingStyle")}
        <select value={tracking.style ?? "card"} onChange={(e) => onChange({ tracking: { ...tracking, style: e.target.value === "card" ? undefined : (e.target.value as NonNullable<typeof tracking.style>) } })} className="h-9 rounded-lg px-2 font-normal" style={FIELD}>
          {STUDIO_TRACKING_STYLES.map((s) => (
            <option key={s} value={s}>
              {t(`studio.trackingStyle_${s}` as DashKey)}
            </option>
          ))}
        </select>
      </label>
      {(tracking.style ?? "card") === "driver" ? (
        <div className="flex items-center gap-2">
          <MediaPicker kind="image" share library onPick={(url) => onChange({ image_url: url })} label={t("studio.trackingPhoto")} />
          {node.image_url ? (
            <button type="button" onClick={() => onChange({ image_url: null })} className="rounded-md bg-white px-2 py-0.5" style={FIELD}>
              {t("studio.removePicture")}
            </button>
          ) : null}
        </div>
      ) : null}
      {/* 130 The live cards' premium looks: their accent and photo. */}
      <LiveLookControls node={node} onChange={onChange} />
      <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
        {t("studio.trackingHint")}
      </span>
    </div>
  );
}
