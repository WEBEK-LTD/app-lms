"use client";

/* eslint-disable @next/next/no-img-element -- map tiles come from the company's own tile server, drawn as they are. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Icon } from "@/components/icon";

/**
 * 105.9 The live map: the company's tiles with its taxis and the rides
 * waiting on them. Drawn here (Web Mercator, 256-pixel tiles) so the
 * dashboard needs no map library and works with Google's tiles and any
 * OpenStreetMap tile server alike.
 */

export type MarkerKind = "free" | "on_ride" | "waiting";

export interface MapMarker {
  id: string;
  kind: MarkerKind;
  lat: number;
  lng: number;
  label: string;
  href: string | null;
}

export interface MapLabels {
  map: string;
  zoomIn: string;
  zoomOut: string;
  fitAll: string;
  legend: Record<MarkerKind, string>;
}

const TILE = 256;
const MIN_ZOOM = 2;
const MAX_ZOOM = 18;
const MAX_LAT = 85.05112878;
const PADDING = 56;

export const MARKER_COLORS: Record<MarkerKind, string> = { free: "#1c9d55", on_ride: "#f2650f", waiting: "#e3a500" };

const worldSize = (zoom: number) => TILE * 2 ** zoom;

export function project(lat: number, lng: number, zoom: number): { x: number; y: number } {
  const size = worldSize(zoom);
  const φ = (Math.max(-MAX_LAT, Math.min(MAX_LAT, lat)) * Math.PI) / 180;
  return { x: ((lng + 180) / 360) * size, y: ((1 - Math.log(Math.tan(φ) + 1 / Math.cos(φ)) / Math.PI) / 2) * size };
}

export function unproject(x: number, y: number, zoom: number): { lat: number; lng: number } {
  const size = worldSize(zoom);
  const lng = (x / size) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / size;
  return { lat: (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lng };
}

/** The view showing every point in a box of this size: their middle, at the closest zoom they fit. */
export function fitView(points: { lat: number; lng: number }[], width: number, height: number): { lat: number; lng: number; zoom: number } {
  if (points.length === 0) return { lat: 20, lng: 20, zoom: MIN_ZOOM };
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const box = { north: Math.max(...lats), south: Math.min(...lats), east: Math.max(...lngs), west: Math.min(...lngs) };
  let zoom = points.length === 1 ? 15 : MAX_ZOOM - 1;
  for (; zoom > MIN_ZOOM; zoom--) {
    const ne = project(box.north, box.east, zoom);
    const sw = project(box.south, box.west, zoom);
    if (ne.x - sw.x <= Math.max(width - 2 * PADDING, 1) && sw.y - ne.y <= Math.max(height - 2 * PADDING, 1)) break;
  }
  const ne = project(box.north, box.east, zoom);
  const sw = project(box.south, box.west, zoom);
  return { ...unproject((ne.x + sw.x) / 2, (ne.y + sw.y) / 2, zoom), zoom };
}

function tileUrl(template: string, z: number, x: number, y: number): string {
  return template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
}

export function LiveMap({ tilesUrl, attribution, markers, labels }: { tilesUrl: string | null; attribution: string | null; markers: MapMarker[]; labels: MapLabels }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [view, setView] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
  /** Fitted to the markers until they first show or the person moves the map; then the view is theirs. */
  const auto = useRef(true);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!size || !auto.current) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the first view waits for the box's size and the first markers.
    setView(fitView(markers, size.width, size.height));
    if (markers.length > 0) auto.current = false;
  }, [size, markers]);

  const zoomBy = (step: number) => {
    auto.current = false;
    setView((v) => (v ? { ...v, zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom + step)) } : v));
  };
  const fitAll = () => {
    if (size) setView(fitView(markers, size.width, size.height));
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, moved: false };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !view) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) e.currentTarget.setPointerCapture(e.pointerId);
    d.moved = true;
    auto.current = false;
    d.x = e.clientX;
    d.y = e.clientY;
    const c = project(view.lat, view.lng, view.zoom);
    setView({ ...unproject(c.x - dx, c.y - dy, view.zoom), zoom: view.zoom });
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    // A drag isn't a tap on the marker under it.
    if (d?.moved) {
      const swallow = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
      };
      window.addEventListener("click", swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
    }
  };

  const tiles: { key: string; src: string; left: number; top: number }[] = [];
  let origin = { x: 0, y: 0 };
  if (size && view) {
    const c = project(view.lat, view.lng, view.zoom);
    origin = { x: c.x - size.width / 2, y: c.y - size.height / 2 };
    const count = 2 ** view.zoom;
    if (tilesUrl) {
      for (let tx = Math.floor(origin.x / TILE); tx * TILE < origin.x + size.width; tx++) {
        for (let ty = Math.max(0, Math.floor(origin.y / TILE)); ty * TILE < origin.y + size.height && ty < count; ty++) {
          const wx = ((tx % count) + count) % count;
          tiles.push({ key: `${view.zoom}/${tx}/${ty}`, src: tileUrl(tilesUrl, view.zoom, wx, ty), left: tx * TILE - origin.x, top: ty * TILE - origin.y });
        }
      }
    }
  }

  const control = "grid size-9 place-items-center rounded-lg border-0 bg-white text-ink-2 shadow-[0_1px_4px_rgba(14,13,36,0.18)] hover:bg-sand";

  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-line bg-[#eef0ea] h-[min(68vh,600px)]" dir="ltr">
      <div
        ref={box}
        role="region"
        aria-label={labels.map}
        className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => zoomBy(1)}
        data-live-map
      >
        {tiles.map((t) => (
          <img key={t.key} src={t.src} alt="" width={TILE} height={TILE} draggable={false} className="pointer-events-none absolute max-w-none" style={{ left: t.left, top: t.top }} />
        ))}
        {view
          ? markers.map((m) => {
              const p = project(m.lat, m.lng, view.zoom);
              const style = { left: p.x - origin.x, top: p.y - origin.y, backgroundColor: MARKER_COLORS[m.kind] };
              const className = "absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[3px] border-white text-white no-underline shadow-[0_2px_6px_rgba(14,13,36,0.3)]";
              const icon = <Icon name={m.kind === "waiting" ? "person" : "local_taxi"} size={18} />;
              return m.href ? (
                <Link key={m.id} href={m.href} title={m.label} aria-label={m.label} className={className} style={style} data-marker={m.kind}>
                  {icon}
                </Link>
              ) : (
                <span key={m.id} role="img" title={m.label} aria-label={m.label} className={className} style={style} data-marker={m.kind}>
                  {icon}
                </span>
              );
            })
          : null}
      </div>

      <div className="absolute top-3 right-3 flex flex-col gap-2">
        <button type="button" className={control} onClick={() => zoomBy(1)} aria-label={labels.zoomIn} title={labels.zoomIn}>
          <Icon name="add" size={20} />
        </button>
        <button type="button" className={`${control} text-lg font-bold`} onClick={() => zoomBy(-1)} aria-label={labels.zoomOut} title={labels.zoomOut}>
          <span aria-hidden="true">−</span>
        </button>
        <button type="button" className={control} onClick={fitAll} aria-label={labels.fitAll} title={labels.fitAll}>
          <Icon name="crop_free" size={20} />
        </button>
      </div>

      <ul className="absolute right-3 bottom-3 m-0 flex list-none flex-wrap gap-x-4 gap-y-1 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-ink-2 shadow-[0_1px_4px_rgba(14,13,36,0.18)]" dir="auto">
        {(Object.keys(MARKER_COLORS) as MarkerKind[]).map((kind) => (
          <li key={kind} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: MARKER_COLORS[kind] }} />
            {labels.legend[kind]}
          </li>
        ))}
      </ul>

      {attribution ? <p className="absolute bottom-1 left-1 m-0 rounded bg-white/85 px-1.5 py-0.5 text-[11px] text-ink-4">{attribution}</p> : null}
    </div>
  );
}

/** Asks the server for the page again every few seconds while it is shown. */
export function Refresher({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
