import { Icon } from "@/components/icon";

/**
 * 115 Where a marketplace place delivers, in its forms (the dashboard's
 * place, the places' panel, accepting an application): up to a distance
 * from its address, or in some of the marketplace's named areas. The
 * fields are lib/market/areas.ts `parseVendorAreaForm`'s. No hooks, so
 * both server and client forms use it.
 */

export interface DeliveryAreaWords {
  title: string;
  hint: string;
  byKm: string;
  km: string;
  byAreas: string;
  /** Shown instead of the areas while the marketplace has none. */
  noAreas: string;
  /** "Set its delivery area": saved before places had to set one. */
  setArea: string;
  /** Its address isn't on the map: it can't deliver by distance. */
  noPosition: string;
}

export function DeliveryAreaFields({
  words,
  values,
  areas,
  warning,
  error,
  idPrefix = "f-area",
}: {
  words: DeliveryAreaWords;
  values: Record<string, string>;
  areas: { id: string; name: string; km: number }[];
  warning: "set_area" | "no_position" | null;
  error?: string;
  idPrefix?: string;
}) {
  const kind = values.area_kind === "areas" && areas.length ? "areas" : "km";
  const option = "flex items-start gap-3 rounded-2xl border border-line bg-sand/40 px-4 py-3 has-[:checked]:border-midnight has-[:checked]:bg-white";
  return (
    <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" aria-describedby={error ? `${idPrefix}-error` : undefined}>
      <legend className="mb-1 text-sm font-semibold">{words.title}</legend>
      <p className="m-0 text-[13px] text-muted">{words.hint}</p>
      {warning ? (
        <p role="note" className="m-0 flex items-start gap-2 rounded-xl bg-peach-soft px-4 py-3 text-[14px] leading-relaxed">
          <Icon name="warning" size={18} className="mt-0.5 shrink-0" />
          {warning === "set_area" ? words.setArea : words.noPosition}
        </p>
      ) : null}
      <div className={option}>
        <input type="radio" id={`${idPrefix}-by-km`} name="area_kind" value="km" defaultChecked={kind === "km"} className="mt-1 h-4 w-4 accent-midnight" />
        <span className="flex flex-1 flex-col gap-2">
          <label htmlFor={`${idPrefix}-by-km`} className="cursor-pointer text-[15px] font-semibold">
            {words.byKm}
          </label>
          <span className="flex items-center gap-2 text-sm">
            <input id={`${idPrefix}-km`} name="area_km" inputMode="decimal" dir="ltr" defaultValue={values.area_km ?? ""} className="input h-10 w-28" />
            <label htmlFor={`${idPrefix}-km`}>{words.km}</label>
          </span>
        </span>
      </div>
      <div className={option}>
        <input type="radio" id={`${idPrefix}-by-areas`} name="area_kind" value="areas" defaultChecked={kind === "areas"} disabled={!areas.length} className="mt-1 h-4 w-4 accent-midnight" />
        <span className="flex flex-1 flex-col gap-2">
          <label htmlFor={`${idPrefix}-by-areas`} className="cursor-pointer text-[15px] font-semibold">
            {words.byAreas}
          </label>
          {areas.length ? (
            <span className="flex flex-wrap gap-x-5 gap-y-2">
              {areas.map((a) => (
                <span key={a.id} className="flex items-center gap-2 text-[15px]">
                  <input type="checkbox" id={`${idPrefix}-${a.id}`} name={`area-${a.id}`} defaultChecked={values[`area-${a.id}`] === "on"} className="h-4 w-4 accent-midnight" />
                  <label htmlFor={`${idPrefix}-${a.id}`}>{a.name}</label>
                </span>
              ))}
            </span>
          ) : (
            <span className="text-[13px] text-muted">{words.noAreas}</span>
          )}
        </span>
      </div>
      {error ? (
        <p id={`${idPrefix}-error`} role="alert" className="m-0 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
