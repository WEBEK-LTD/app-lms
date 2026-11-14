"use client";

import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import type { DashKey } from "@/i18n/dashboard";
import { IconPicker } from "@/app/dashboard/pages/controls";
import { premiumAppWords } from "@/lib/studio/app-words";
import { STUDIO_MAP_LIMITS, STUDIO_MAP_MARKERS, STUDIO_MAP_ROUTE_LIVE, STUDIO_MAP_STYLES, type StudioMapDrawing, type StudioMapRoute, type StudioPlace } from "@/lib/pages/types";
import { RangeField } from "./controls";

/**
 * 129.21–129.24 The inspector's part for a map header's premium looks: its
 * look and its markers' look, the word on roof signs, where the person's
 * dot is, labelled pins, words on the map and a route (its points, where the
 * vehicle is, its chips and bubble, its colours, whether it drives on, and
 * what it follows live in the app).
 */

const FIELD = { border: "1px solid var(--studio-line)" } as const;
const INPUT = "h-8 min-w-0 rounded-lg px-2 font-normal";

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="flex flex-col gap-1 font-bold">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className={INPUT} style={FIELD}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextIn({ label, value, max, onChange }: { label: string; value: string | null | undefined; max: number; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1 font-bold">
      {label}
      <input type="text" value={value ?? ""} maxLength={max} onChange={(e) => onChange(e.target.value)} className={INPUT} style={FIELD} />
    </label>
  );
}

/** A spot across and down, in percent. */
function SpotIn({ label, value, onChange }: { label: string; value: StudioPlace; onChange: (v: StudioPlace) => void }) {
  const t = useDashT();
  const num = (v: number, set: (n: number) => void, what: string) => (
    <label className="flex flex-1 items-center gap-1">
      <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
        {what}
      </span>
      <input type="number" min={0} max={100} step={1} value={v} onChange={(e) => set(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className={`${INPUT} w-16`} style={FIELD} />
    </label>
  );
  return (
    <div className="flex flex-col gap-1">
      <span className="font-bold">{label}</span>
      <div className="flex gap-2">
        {num(value.x, (x) => onChange({ ...value, x }), t("studio.mapAcross"))}
        {num(value.y, (y) => onChange({ ...value, y }), t("studio.mapDown"))}
      </div>
    </div>
  );
}

function ColorIn({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-7 w-10 cursor-pointer rounded-md bg-white p-0.5" style={FIELD} />
    </label>
  );
}

/** Spots for new pins, words and route points, around the map. */
const SPOTS: StudioPlace[] = [
  { x: 24, y: 24 },
  { x: 70, y: 62 },
  { x: 40, y: 80 },
  { x: 76, y: 30 },
  { x: 16, y: 54 },
  { x: 58, y: 44 },
  { x: 30, y: 12 },
  { x: 84, y: 84 },
];

export function MapLooksControls({ drawing, set, id }: { drawing: StudioMapDrawing; set: (patch: Partial<StudioMapDrawing>) => void; id: string }) {
  const t = useDashT();
  // 128.11 A new pin's or word's sample is the app's (lib/studio/app-words.ts), in the dashboard's language.
  const sample = premiumAppWords(useDashLang(), "").map;
  const L = STUDIO_MAP_LIMITS;
  const places = drawing.places ?? [];
  const labels = drawing.labels ?? [];
  const route = drawing.route ?? null;
  const setRoute = (patch: Partial<StudioMapRoute>) => route && set({ route: { ...route, ...patch } });
  const sized = <T,>(list: T[], n: number, make: (i: number) => T) => Array.from({ length: n }, (_, i) => list[i] ?? make(i));
  return (
    <div className="flex flex-col gap-2" data-map-looks-controls="">
      <Select
        label={t("studio.mapStyle")}
        value={drawing.style ?? "plain"}
        options={[{ value: "plain", label: t("studio.mapStyle_plain") }, ...STUDIO_MAP_STYLES.map((s) => ({ value: s, label: t(`studio.mapStyle_${s}` as DashKey) }))]}
        onChange={(v) => set({ style: v === "plain" ? undefined : (v as StudioMapDrawing["style"]) })}
      />
      <Select
        label={t("studio.mapMarkerLook")}
        value={drawing.marker ?? "auto"}
        options={[{ value: "auto", label: t("studio.mapMarker_auto") }, ...STUDIO_MAP_MARKERS.map((m) => ({ value: m, label: t(`studio.mapMarker_${m}` as DashKey) }))]}
        onChange={(v) => set({ marker: v === "auto" ? undefined : (v as StudioMapDrawing["marker"]) })}
      />
      <TextIn label={t("studio.mapSign")} value={drawing.sign} max={L.sign} onChange={(sign) => set({ sign: sign.trim() ? sign : undefined })} />
      {drawing.style !== "lens" ? (
        <SpotIn label={t("studio.mapMeAt")} value={drawing.me_at ?? { x: 50, y: 56 }} onChange={(me_at) => set({ me_at })} />
      ) : null}

      <RangeField label={t("studio.mapPlaces")} value={places.length} min={0} max={L.places} fallback={0} onChange={(n) => set({ places: n ? sized(places, n, (i) => ({ ...SPOTS[i % SPOTS.length]!, label: sample("home"), icon: "place" })) : undefined })} />
      {places.map((pin, i) => (
        <fieldset key={`p${i}`} className="m-0 flex flex-col gap-1.5 rounded-lg p-2" style={FIELD} data-map-place={i}>
          <TextIn label={t("studio.mapPlaceLabel")} value={pin.label} max={L.label} onChange={(label) => set({ places: places.map((x, k) => (k === i ? { ...x, label } : x)) })} />
          <IconPicker id={`map-place-${id}-${i}`} label={t("studio.mapIcon")} value={pin.icon ?? "place"} onChange={(icon) => set({ places: places.map((x, k) => (k === i ? { ...x, icon: icon ?? undefined } : x)) })} />
          <SpotIn label={t("studio.mapSpot")} value={pin} onChange={(at) => set({ places: places.map((x, k) => (k === i ? { ...x, ...at } : x)) })} />
        </fieldset>
      ))}

      <RangeField label={t("studio.mapLabels")} value={labels.length} min={0} max={L.labels} fallback={0} onChange={(n) => set({ labels: n ? sized(labels, n, (i) => ({ ...SPOTS[(i + 3) % SPOTS.length]!, text: sample("downtown") })) : undefined })} />
      {labels.map((label, i) => (
        <fieldset key={`l${i}`} className="m-0 flex flex-col gap-1.5 rounded-lg p-2" style={FIELD} data-map-label={i}>
          <TextIn label={t("studio.mapLabelText")} value={label.text} max={L.label} onChange={(text) => set({ labels: labels.map((x, k) => (k === i ? { ...x, text } : x)) })} />
          <SpotIn label={t("studio.mapSpot")} value={label} onChange={(at) => set({ labels: labels.map((x, k) => (k === i ? { ...x, ...at } : x)) })} />
        </fieldset>
      ))}

      <label className="flex items-center gap-1">
        <input type="checkbox" checked={!!route} onChange={(e) => set({ route: e.target.checked ? { points: [{ x: 76, y: 30 }, { x: 76, y: 62 }, { x: 40, y: 62 }] } : undefined })} style={{ accentColor: "#1F8A4C" }} />
        {t("studio.mapRoute")}
      </label>
      {route ? (
        <fieldset className="m-0 flex flex-col gap-1.5 rounded-lg p-2" style={FIELD} data-map-route="">
          <RangeField label={t("studio.mapRoutePoints")} value={route.points.length} min={2} max={L.routePoints} fallback={2} onChange={(n) => setRoute({ points: sized(route.points, Math.max(2, n), (i) => SPOTS[i % SPOTS.length]!) })} />
          {route.points.map((at, i) => (
            <SpotIn key={i} label={`${t("studio.mapRoutePoint")} ${i + 1}`} value={at} onChange={(v) => setRoute({ points: route.points.map((x, k) => (k === i ? v : x)) })} />
          ))}
          <RangeField label={t("studio.mapRouteAt")} value={route.at ?? 0} min={0} max={100} unit="%" fallback={0} onChange={(v) => setRoute({ at: v || undefined })} />
          <TextIn label={t("studio.mapRouteFrom")} value={route.from_label} max={L.label} onChange={(v) => setRoute({ from_label: v.trim() ? v : undefined })} />
          <TextIn label={t("studio.mapRouteTo")} value={route.to_label} max={L.label} onChange={(v) => setRoute({ to_label: v.trim() ? v : undefined })} />
          <TextIn label={t("studio.mapRouteEta")} value={route.eta} max={L.label} onChange={(v) => setRoute({ eta: v.trim() ? v : undefined })} />
          <IconPicker id={`map-route-${id}`} label={t("studio.mapRouteIcon")} value={route.icon ?? drawing.icon ?? "local_taxi"} onChange={(icon) => setRoute({ icon: icon ?? undefined })} />
          <ColorIn label={t("studio.mapRouteColor")} value={route.color ?? drawing.accent ?? "#F5B700"} onChange={(color) => setRoute({ color })} />
          <ColorIn label={t("studio.mapRouteColorDark")} value={route.dark_color ?? route.color ?? drawing.accent ?? "#F5B700"} onChange={(dark_color) => setRoute({ dark_color })} />
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={route.moving === true} onChange={(e) => setRoute({ moving: e.target.checked || undefined })} style={{ accentColor: "#1F8A4C" }} />
            {t("studio.mapRouteMoving")}
          </label>
          <Select
            label={t("studio.mapRouteLive")}
            value={route.live ?? "none"}
            options={[{ value: "none", label: t("studio.mapRouteLive_none") }, ...STUDIO_MAP_ROUTE_LIVE.map((v) => ({ value: v, label: t(`studio.mapRouteLive_${v}` as DashKey) }))]}
            onChange={(v) => setRoute({ live: v === "none" ? undefined : (v as StudioMapRoute["live"]) })}
          />
        </fieldset>
      ) : null}
      <span className="text-xs" style={{ color: "var(--studio-muted)" }}>
        {t("studio.mapLooksHint")}
      </span>
    </div>
  );
}
