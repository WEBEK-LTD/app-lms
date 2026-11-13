"use client";

import { useActionState, useState } from "react";
import { setTravelPartsAction } from "@/app/actions/admin-clients";
import { FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { initialFormState } from "@/lib/forms";

/**
 * 126 Admin › client › Travel, as the approved Admin board: Hotels and
 * Flights each switched on or off with where they come from (a source not
 * connected yet shows as coming soon), the app's tabs live as they change,
 * and what selling means for the client. At least one part stays on.
 */

interface Source {
  id: string;
  title: string;
  text: string;
  connected: boolean;
}

const TABS = {
  both: ["Explore", "Stays", "Flights", "Trips", "Account"],
  hotels: ["Explore", "Saved", "Bookings", "Messages", "Account"],
  flights: ["Search", "Alerts", "Trips", "Help", "Account"],
} as const;

const NOTES = {
  both: "Home offers stay + flight together, with one price and one trip.",
  hotels: "No flight screens anywhere. One hotel? The app opens on its own page.",
  flights: "No hotel screens anywhere. Alerts get their own tab.",
} as const;

function Toggle({ name, label, on, onChange }: { name: string; label: string; on: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center">
      <input type="checkbox" name={name} checked={on} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" aria-label={label} />
      <span className="absolute inset-0 rounded-full bg-[#c9c2b4] transition peer-checked:bg-midnight peer-focus-visible:ring-2 peer-focus-visible:ring-midnight peer-focus-visible:ring-offset-2" />
      <span className="absolute start-1 h-6 w-6 rounded-full bg-white transition-[inset-inline-start] peer-checked:start-7" />
    </label>
  );
}

function Sources({ name, legend, sources, chosen, onPick, faded }: { name: string; legend: string; sources: Source[]; chosen: string; onPick: (id: string) => void; faded: boolean }) {
  return (
    <fieldset className={`m-0 flex flex-col gap-2 border-0 p-0 ${faded ? "opacity-40" : ""}`}>
      <legend className="mb-2 text-xs font-extrabold tracking-[0.1em] text-muted uppercase">{legend}</legend>
      {sources.map((s) => (
        <label key={s.id} className={`flex items-center gap-3 rounded-[14px] border bg-white px-3.5 py-3 ${s.id === chosen ? "border-2 border-midnight" : "border-line"} ${s.connected ? "cursor-pointer" : "cursor-not-allowed"}`}>
          <input type="radio" name={name} value={s.id} checked={s.id === chosen} disabled={!s.connected} onChange={() => onPick(s.id)} className="h-4 w-4 shrink-0 accent-midnight" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-extrabold">{s.title}</span>
            <span className="text-[12.5px] text-muted">{s.text}</span>
          </span>
          {s.connected ? null : <span className="shrink-0 rounded-md bg-sand px-2 py-0.5 text-[11px] font-bold text-muted">Coming soon · ask Yallapp</span>}
        </label>
      ))}
    </fieldset>
  );
}

export function TravelPartsForm({
  clientId,
  appId,
  hotels: hotelsOn,
  flights: flightsOn,
  hotelSource,
  flightSource,
  hotelSources,
  flightSources,
  currency,
  languages,
}: {
  clientId: string;
  appId: string;
  hotels: boolean;
  flights: boolean;
  hotelSource: string;
  flightSource: string;
  hotelSources: Source[];
  flightSources: Source[];
  currency: string;
  languages: string;
}) {
  const [state, action] = useActionState(setTravelPartsAction, initialFormState);
  const [hotels, setHotels] = useState(hotelsOn);
  const [flights, setFlights] = useState(flightsOn);
  const [hotelFrom, setHotelFrom] = useState(hotelSource);
  const [flightFrom, setFlightFrom] = useState(flightSource);
  const mode = hotels && flights ? "both" : hotels ? "hotels" : flights ? "flights" : null;
  const tabs = mode ? TABS[mode] : [];
  return (
    <form action={action} noValidate className="flex flex-col gap-4" data-travel-parts="">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="appId" value={appId} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex max-w-[620px] flex-col gap-1">
          <p className="m-0 text-[15px] font-extrabold">Travel: what this app does</p>
          <p className="m-0 text-sm text-muted">Turn on hotels, flights or both. The app builds its tabs and home from what is on; changes reach the app on its next start.</p>
        </div>
        <SubmitButton className="h-10 px-5" pendingText="Saving…" disabled={!mode}>
          Save
        </SubmitButton>
      </div>
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        <div className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-5">
          <div className="flex items-center gap-3.5">
            <span aria-hidden="true" className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] bg-[#f3e8d4] text-[#7f5b1c]">
              <Icon name="bed" size={24} />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-lg font-extrabold">Hotels</span>
              <span className="text-[13px] text-muted">Search, rooms, checkout, bookings, messages</span>
            </span>
            <Toggle name="hotels" label="Hotels" on={hotels} onChange={setHotels} />
          </div>
          <Sources name="hotelSource" legend="Where the hotels come from" sources={hotelSources} chosen={hotelFrom} onPick={setHotelFrom} faded={!hotels} />
        </div>
        <div className="flex flex-col gap-4 rounded-[20px] border border-line bg-white p-5">
          <div className="flex items-center gap-3.5">
            <span aria-hidden="true" className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-[14px] bg-[#e1f0f4] text-[#1f6f8b]">
              <Icon name="flight" size={24} />
            </span>
            <span className="flex flex-1 flex-col">
              <span className="text-lg font-extrabold">Flights</span>
              <span className="text-[13px] text-muted">Search, fares, seats, boarding passes, price alerts</span>
            </span>
            <Toggle name="flights" label="Flights" on={flights} onChange={setFlights} />
          </div>
          <Sources name="flightSource" legend="Where the flights come from" sources={flightSources} chosen={flightFrom} onPick={setFlightFrom} faded={!flights} />
        </div>
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
        <div className="flex flex-col gap-3.5 rounded-[20px] bg-midnight p-5 text-white">
          <div className="flex items-center justify-between">
            <span className="text-base font-extrabold">The app&apos;s tabs, live</span>
            <span className="text-[13px] font-extrabold text-[#c9a063]" data-travel-mode={mode ?? "none"}>
              {mode === "both" ? "Hotels + Flights" : mode === "hotels" ? "Hotels only" : mode === "flights" ? "Flights only" : "Nothing on"}
            </span>
          </div>
          <ol className="m-0 flex list-none justify-around rounded-2xl bg-[#1b2338] px-2.5 py-3.5" aria-label="The app's tabs">
            {tabs.map((label, i) => (
              <li key={label} className={`flex flex-col items-center gap-1.5 text-xs font-bold ${i === 0 ? "text-white" : "text-[#9aa0b2]"}`}>
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${i === 0 ? "bg-[#ff6b3d]" : "bg-transparent"}`} />
                {label}
              </li>
            ))}
          </ol>
          {mode ? null : <span className="text-[13px] font-bold text-[#ffd2c2]">At least one part stays on: the app needs hotels or flights.</span>}
          <span className="text-[13px] text-[#b4b8c6]">{mode ? NOTES[mode] : ""}</span>
        </div>
        <div className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-5 text-sm">
          <span className="text-base font-extrabold">Selling</span>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Payments</span>
            <b>The client&apos;s own gateway</b>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Yallapp commission</span>
            <b>None</b>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Currencies</span>
            <b>{currency}</b>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted">Languages</span>
            <b>{languages}</b>
          </div>
        </div>
      </div>
    </form>
  );
}
