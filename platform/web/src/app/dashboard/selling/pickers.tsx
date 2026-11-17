"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useDashT, useKnownText } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { kit } from "@/components/studio-page/classes";
import { slotProblems } from "@/lib/selling/delivery";

/**
 * 132.170 Delivery & offers made easy: the day's delivery times as rows (a
 * break between two is two times, "Add another time" right under them), the
 * countries from every country with a search, each with its own cities
 * typed in place, and the flash sale's products with their pictures.
 */

const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const minutes = (t: string) => (TIME.test(t) ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) : null);
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
/** Letters as people search them: no case, accents, Arabic short vowels or alef forms. */
const fold = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/\s+/g, " ")
    .trim();

const input = "input input-sm";
const small = "text-xs font-semibold text-(--sp-muted)";

// Delivery times

export type SlotRow = { key: number; id: string; start: string; end: string; capacity: string; fee: string };

/** The day's times from the form's values (`slotStart{i}`…), as rows. */
export function slotRowsOf(v: Record<string, string>, max: number): SlotRow[] {
  const rows: SlotRow[] = [];
  for (let i = 0; i < max; i += 1) {
    const start = v[`slotStart${i}`] ?? "";
    const end = v[`slotEnd${i}`] ?? "";
    if (start === "" && end === "") continue;
    rows.push({ key: i, id: v[`slotId${i}`] ?? "", start, end, capacity: v[`slotCapacity${i}`] ?? "", fee: v[`slotFee${i}`] ?? "" });
  }
  return rows;
}

export function SlotList({
  initial,
  max,
  currency,
  errors,
  submitted,
  note,
}: {
  initial: SlotRow[];
  max: number;
  currency: string;
  errors: Record<string, string>;
  /** The values last sent: the server's message on a row shows until the row changes. */
  submitted?: Record<string, string>;
  note: string;
}) {
  const t = useDashT();
  const known = useKnownText();
  const [rows, setRows] = useState<SlotRow[]>(initial);
  const next = useRef(initial.reduce((n, r) => Math.max(n, r.key), -1) + 1);
  const problems = slotProblems(rows);
  const change = (key: number, part: Partial<SlotRow>) => setRows((list) => list.map((r) => (r.key === key ? { ...r, ...part } : r)));
  // Sorted by when they start once the start reads as a time.
  const sort = () => setRows((list) => (list.every((r) => minutes(r.start) !== null) ? [...list].sort((a, b) => minutes(a.start)! - minutes(b.start)!) : list));
  const add = () => {
    const last = rows.reduce<number | null>((m, r) => {
      const end = minutes(r.end);
      return end !== null && (m === null || end > m) ? end : m;
    }, null);
    // After the last one, an hour's break, three hours long (when the day has room).
    const start = last === null ? 10 * 60 : last + 60;
    const row: SlotRow = { key: next.current++, id: "", start: start + 60 <= 23 * 60 + 59 ? hhmm(start) : "", end: start + 60 <= 23 * 60 + 59 ? hhmm(Math.min(start + 180, 23 * 60 + 59)) : "", capacity: "", fee: "" };
    setRows((list) => [...list, row]);
    requestAnimationFrame(() => document.getElementById(`f-slot-start-${row.key}`)?.focus());
  };
  const label = (row: SlotRow) => (TIME.test(row.start) && TIME.test(row.end) ? `${row.start}–${row.end}` : null);
  const preview = rows.map(label).filter(Boolean);
  return (
    <div className="flex flex-col gap-2" data-slot-list="">
      <div aria-hidden="true" className={`hidden gap-2 px-3 sm:grid sm:grid-cols-[1fr_1fr_96px_120px_36px] ${small}`}>
        <span>{t("selling.slotFrom")}</span>
        <span>{t("selling.slotTo")}</span>
        <span>{t("selling.slotCapacity")}</span>
        <span>{t("selling.slotFee", { currency })}</span>
        <span />
      </div>
      {rows.length === 0 ? <p className="m-0 rounded-xl border border-dashed border-(--sp-line) p-3 text-[13px] text-(--sp-muted)">{t("selling.slotsEmpty")}</p> : null}
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row, i) => {
          const p = problems[i];
          const local = p?.kind === "order" ? t("selling.slotOrder") : p?.kind === "overlap" ? known(`This time overlaps ${label(rows[p.with]!) ?? ""}: let one end before the next starts.`) : null;
          const sent = submitted ?? {};
          const unchanged = sent[`slotStart${i}`] === row.start && sent[`slotEnd${i}`] === row.end && (sent[`slotCapacity${i}`] ?? "") === row.capacity && (sent[`slotFee${i}`] ?? "") === row.fee;
          const server = unchanged ? errors[`slot${i}`] : undefined;
          const message = local ?? (server ? known(server) : null);
          const n = i + 1;
          const id = (part: string) => `f-slot-${part}-${row.key}`;
          return (
            <li key={row.key} className={`rounded-xl border p-2.5 sm:p-2 ${message ? "border-danger" : "border-(--sp-line)"} bg-(--sp-surface)`} data-slot-row={i}>
              <input type="hidden" name={`slotId${i}`} value={row.id} />
              <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_96px_120px_36px]">
                <label className="flex min-w-0 flex-col gap-1">
                  <span className={`${small} sm:sr-only`}>{t("selling.slotFrom")}</span>
                  <input
                    id={id("start")}
                    type="time"
                    name={`slotStart${i}`}
                    value={row.start}
                    onChange={(e) => change(row.key, { start: e.target.value })}
                    onBlur={sort}
                    aria-label={t("selling.slotFromN", { n })}
                    aria-invalid={message ? true : undefined}
                    className={input}
                    dir="ltr"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className={`${small} sm:sr-only`}>{t("selling.slotTo")}</span>
                  <input
                    id={id("end")}
                    type="time"
                    name={`slotEnd${i}`}
                    value={row.end}
                    onChange={(e) => change(row.key, { end: e.target.value })}
                    aria-label={t("selling.slotToN", { n })}
                    aria-invalid={message ? true : undefined}
                    className={input}
                    dir="ltr"
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1">
                  <span className={`${small} sm:sr-only`}>{t("selling.slotCapacity")}</span>
                  <input name={`slotCapacity${i}`} inputMode="numeric" value={row.capacity} onChange={(e) => change(row.key, { capacity: e.target.value })} aria-label={t("selling.slotCapacityN", { n })} placeholder="—" className={input} />
                </label>
                <div className="flex items-end gap-2 max-sm:col-span-1">
                  <label className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className={`${small} sm:sr-only`}>{t("selling.slotFee", { currency })}</span>
                    <input name={`slotFee${i}`} inputMode="decimal" value={row.fee} onChange={(e) => change(row.key, { fee: e.target.value })} aria-label={t("selling.slotFeeN", { n, currency })} placeholder="—" className={input} />
                  </label>
                  <button type="button" className={`${kit.icon} sm:hidden`} aria-label={t("selling.slotRemove", { time: label(row) ?? String(n) })} onClick={() => setRows((list) => list.filter((r) => r.key !== row.key))}>
                    <Icon name="delete" size={19} />
                  </button>
                </div>
                <button type="button" className={`${kit.icon} max-sm:hidden`} aria-label={t("selling.slotRemove", { time: label(row) ?? String(n) })} onClick={() => setRows((list) => list.filter((r) => r.key !== row.key))} data-slot-remove="">
                  <Icon name="delete" size={19} />
                </button>
              </div>
              {message ? (
                <p className="m-0 mt-1.5 px-1 text-[13px] font-semibold text-danger" role="alert">
                  {message}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={kit.quiet} onClick={add} disabled={rows.length >= max} data-slot-add="">
          <Icon name="add" size={18} />
          {t("selling.slotAdd")}
        </button>
        <span className="text-[13px] text-(--sp-muted)">{rows.length >= max ? t("selling.slotsMax", { max }) : t("selling.slotsBreak")}</span>
      </div>
      {preview.length ? (
        <p className="m-0 text-[13px] text-(--sp-ink-2)" data-slots-preview="">
          {t("selling.slotsPreview")}{" "}
          {preview.map((p, n) => (
            <bdi key={n} dir="ltr" className="me-1.5 inline-block rounded-md bg-(--sp-soft) px-1.5 font-sans tabular-nums">
              {p}
            </bdi>
          ))}
        </p>
      ) : null}
      <p className="m-0 text-[13px] text-(--sp-muted)">{note}</p>
    </div>
  );
}

// Where it delivers

export type CityRow = { key: number; name: string; price: string };
export type AreaCard = { key: number; country: string; allCities: boolean; cities: CityRow[] };
export type AreasStart = { scope: "all" | "some"; areas: { country: string; allCities: boolean; cities: { name: string; price: string }[] }[]; anywhere: { name: string; price: string }[] };
export type CountryChoice = { code: string; name: string; en: string; first: boolean };

let keys = 1;
const keyed = (cities: { name: string; price: string }[]): CityRow[] => cities.map((c) => ({ key: keys++, ...c }));
const sameCity = (a: string, b: string) => fold(a) === fold(b);

/** Every country with a search: the platform's first ones on top. */
function CountryPicker({ countries, taken, onPick, onClose }: { countries: CountryChoice[]; taken: Set<string>; onPick: (code: string) => void; onClose: () => void }) {
  const t = useDashT();
  const [q, setQ] = useState("");
  const listId = useId();
  const shown = useMemo(() => {
    const f = fold(q);
    return countries.filter((c) => !taken.has(c.code) && (f === "" || fold(c.name).includes(f) || fold(c.en).includes(f) || c.code.toLowerCase() === f));
  }, [countries, taken, q]);
  const first = q === "" ? shown.filter((c) => c.first) : [];
  const rest = q === "" ? shown.filter((c) => !c.first) : shown;
  const keyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter") {
      e.preventDefault();
      if (shown[0]) onPick(shown[0].code);
    }
  };
  const option = (c: CountryChoice) => (
    <li key={c.code}>
      <button type="button" className={`${kit.menuItem} justify-between`} onClick={() => onPick(c.code)} data-country-option={c.code}>
        <span className="truncate">{c.name}</span>
        <span className="font-sans text-xs text-(--sp-muted)">{c.code}</span>
      </button>
    </li>
  );
  return (
    <div className={`${kit.card} flex flex-col gap-2 p-3 shadow-(--sp-lift)`} data-country-picker="">
      <div className="flex items-center gap-2">
        <span className="relative flex min-w-0 flex-1 items-center">
          <Icon name="search" size={18} className="pointer-events-none absolute start-3 text-(--sp-muted)" />
          <input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={keyDown}
            aria-label={t("selling.countrySearch")}
            aria-controls={listId}
            placeholder={t("selling.countrySearch")}
            className={`${input} w-full ps-9`}
            data-country-search=""
          />
        </span>
        <button type="button" className={kit.icon} aria-label={t("common.close")} onClick={onClose}>
          <Icon name="close" size={19} />
        </button>
      </div>
      <div id={listId} className="flex max-h-72 flex-col gap-1 overflow-y-auto">
        {first.length ? (
          <>
            <p className={`m-0 px-3 pt-1 ${small}`}>{t("selling.countryFirst")}</p>
            <ul className="m-0 list-none p-0">{first.map(option)}</ul>
            <p className={`m-0 px-3 pt-2 ${small}`}>{t("selling.countryAll")}</p>
          </>
        ) : null}
        <ul className="m-0 list-none p-0">{rest.map(option)}</ul>
        {shown.length === 0 ? <p className="m-0 p-3 text-[13px] text-(--sp-muted)">{t("selling.countryNoMatch", { q })}</p> : null}
      </div>
    </div>
  );
}

/** A country's card: all its cities or the owner's own, each with an optional price; the starter cities as one-tap chips. */
function CountryCard({
  card,
  index,
  name,
  starters,
  currency,
  errors,
  onChange,
  onRemove,
}: {
  card: AreaCard;
  index: number;
  name: string;
  starters: string[];
  currency: string;
  errors: Record<string, string>;
  onChange: (card: AreaCard) => void;
  onRemove: () => void;
}) {
  const t = useDashT();
  const known = useKnownText();
  const [typed, setTyped] = useState("");
  const addId = `f-city-add-${card.key}`;
  const addCity = (city: string) => {
    const clean = city.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!clean || card.cities.some((c) => sameCity(c.name, clean))) return;
    onChange({ ...card, cities: [...card.cities, { key: keys++, name: clean, price: "" }] });
  };
  const offered = starters.filter((s) => !card.cities.some((c) => sameCity(c.name, s)));
  const setCity = (key: number, part: Partial<CityRow>) => onChange({ ...card, cities: card.cities.map((c) => (c.key === key ? { ...c, ...part } : c)) });
  const named = card.cities.filter((c) => c.name.trim() !== "");
  const errorText = [errors[`country${index}`], errors[`cities${index}`], errors[`cityPrices${index}`]].filter(Boolean).map((e) => known(e!));
  return (
    <li className={`${kit.card} flex flex-col gap-3 p-3.5`} data-area-card={card.country}>
      <input type="hidden" name={`country${index}`} value={card.country} />
      {card.allCities ? <input type="hidden" name={`allCities${index}`} value="on" /> : null}
      <input type="hidden" name={`cities${index}`} value={card.allCities ? "" : named.map((c) => c.name.trim()).join("\n")} />
      <input type="hidden" name={`cityPrices${index}`} value={named.filter((c) => c.price.trim() !== "").map((c) => `${c.name.trim()}: ${c.price.trim()}`).join("\n")} />
      <div className="flex items-center gap-2.5">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-(--sp-tile) text-(--sp-muted)">
          <Icon name="flag" size={19} />
        </span>
        <h3 className="m-0 min-w-0 flex-1 truncate text-[15.5px] font-bold">{name}</h3>
        <button type="button" className={kit.icon} aria-label={t("selling.countryRemove", { country: name })} onClick={onRemove} data-country-remove="">
          <Icon name="delete" size={19} />
        </button>
      </div>
      <div role="radiogroup" aria-label={t("selling.cities")} className="flex flex-wrap gap-2">
        <button type="button" role="radio" aria-checked={!card.allCities} className={kit.chip(!card.allCities)} onClick={() => onChange({ ...card, allCities: false })}>
          {t("selling.citiesSome")}
        </button>
        <button type="button" role="radio" aria-checked={card.allCities} className={kit.chip(card.allCities)} onClick={() => onChange({ ...card, allCities: true })}>
          {t("selling.citiesAll", { country: name })}
        </button>
      </div>
      {card.allCities ? <p className="m-0 text-[13px] text-(--sp-muted)">{t("selling.citiesPriced")}</p> : null}
      {card.cities.length ? (
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0" aria-label={t("selling.cities")}>
          {card.cities.map((c) => (
            <li key={c.key} className="grid grid-cols-[minmax(0,1fr)_112px_36px] items-center gap-2" data-city-row={c.name}>
              <input value={c.name} onChange={(e) => setCity(c.key, { name: e.target.value })} maxLength={60} aria-label={t("selling.cityName")} className={input} dir="auto" />
              <input value={c.price} onChange={(e) => setCity(c.key, { price: e.target.value })} inputMode="decimal" placeholder={t("selling.cityPriceShort", { currency })} aria-label={t("selling.cityPrice", { city: c.name || t("selling.cityName"), currency })} className={input} />
              <button type="button" className={kit.icon} aria-label={t("selling.cityRemove", { city: c.name })} onClick={() => onChange({ ...card, cities: card.cities.filter((x) => x.key !== c.key) })}>
                <Icon name="close" size={18} />
              </button>
            </li>
          ))}
        </ul>
      ) : !card.allCities ? (
        <p className="m-0 text-[13px] text-(--sp-muted)">{t("selling.citiesNoneYet", { country: name })}</p>
      ) : null}
      <div className="flex gap-2">
        <label htmlFor={addId} className="sr-only">
          {t("selling.cityAdd")}
        </label>
        <input
          id={addId}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCity(typed);
              setTyped("");
            }
          }}
          maxLength={60}
          placeholder={t("selling.cityPlaceholder")}
          className={`${input} min-w-0 flex-1`}
          dir="auto"
          data-city-input=""
        />
        <button
          type="button"
          className={kit.quiet}
          onClick={() => {
            addCity(typed);
            setTyped("");
            document.getElementById(addId)?.focus();
          }}
        >
          <Icon name="add" size={18} />
          {t("selling.cityAdd")}
        </button>
      </div>
      {offered.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={small}>{t("selling.cityStarters")}</span>
          {offered.map((s) => (
            <button key={s} type="button" className={`${kit.chip(false)} h-8`} onClick={() => addCity(s)} data-city-starter={s}>
              <Icon name="add" size={15} />
              {s}
            </button>
          ))}
        </div>
      ) : null}
      {errorText.map((e) => (
        <p key={e} className="m-0 text-[13px] font-semibold text-danger" role="alert">
          {e}
        </p>
      ))}
    </li>
  );
}

/** Every country or only some, each with its cities; the hidden fields are the form's (`country{i}`, `cities{i}`, `allCities{i}`, `cityPrices{i}`). */
export function AreasEditor({ start, countries, starters, currency, errors }: { start: AreasStart; countries: CountryChoice[]; starters: Record<string, string[]>; currency: string; errors: Record<string, string> }) {
  const t = useDashT();
  const known = useKnownText();
  const [scope, setScope] = useState(start.scope);
  const [cards, setCards] = useState<AreaCard[]>(() => start.areas.map((a) => ({ key: keys++, country: a.country, allCities: a.allCities, cities: keyed(a.cities) })));
  const [anywhere, setAnywhere] = useState<CityRow[]>(() => keyed(start.anywhere));
  const [picking, setPicking] = useState(false);
  const nameOf = useMemo(() => new Map(countries.map((c) => [c.code, c.name])), [countries]);
  const taken = useMemo(() => new Set(cards.map((c) => c.country)), [cards]);
  const pick = (code: string) => {
    setCards((list) => [{ key: keys++, country: code, allCities: false, cities: [] }, ...list]);
    setPicking(false);
    // Its cities right away.
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-area-card="${code}"] [data-city-input]`)?.focus());
  };
  const scopeOption = (value: "all" | "some", icon: "public" | "travel_explore", title: string, hint: string) => (
    <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${scope === value ? "border-(--sp-ink)" : "border-(--sp-line)"}`}>
      <input type="radio" name="areasScope" value={value} checked={scope === value} onChange={() => setScope(value)} className="mt-1 h-4 w-4 accent-midnight" />
      <span className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-[15px] font-semibold">
          <Icon name={icon} size={18} />
          {title}
        </span>
        <span className="text-[13px] text-(--sp-muted)">{hint}</span>
      </span>
    </label>
  );
  const anywhereNamed = anywhere.filter((c) => c.name.trim() !== "" && c.price.trim() !== "");
  return (
    <div className="flex flex-col gap-3" data-areas-editor="">
      <div className="grid gap-3 sm:grid-cols-2">
        {scopeOption("some", "travel_explore", t("selling.scopeSome"), t("selling.scopeSomeHint"))}
        {scopeOption("all", "public", t("selling.scopeAll"), t("selling.scopeAllHint"))}
      </div>
      {scope === "some" ? (
        <>
          {picking ? (
            <CountryPicker countries={countries} taken={taken} onPick={pick} onClose={() => setPicking(false)} />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={kit.quiet} onClick={() => setPicking(true)} data-country-add="">
                <Icon name="add" size={18} />
                {t("selling.countryAdd")}
              </button>
              <span className="text-[13px] text-(--sp-muted)">{cards.length ? t("selling.countriesCount", { count: cards.length }) : t("selling.countriesNone")}</span>
            </div>
          )}
          {cards.length ? (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {cards.map((card, i) => (
                <CountryCard
                  key={card.key}
                  card={card}
                  index={i}
                  name={nameOf.get(card.country) ?? card.country}
                  starters={starters[card.country] ?? []}
                  currency={currency}
                  errors={errors}
                  onChange={(next) => setCards((list) => list.map((c) => (c.key === card.key ? next : c)))}
                  onRemove={() => setCards((list) => list.filter((c) => c.key !== card.key))}
                />
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <div className="flex flex-col gap-2">
          <input type="hidden" name="cityPrices" value={anywhereNamed.map((c) => `${c.name.trim()}: ${c.price.trim()}`).join("\n")} />
          <p className="m-0 text-sm font-semibold">{t("selling.cityPrices")}</p>
          <p className="m-0 text-[13px] text-(--sp-muted)">{t("selling.cityPriceHint")}</p>
          {anywhere.map((c) => (
            <div key={c.key} className="grid grid-cols-[minmax(0,1fr)_112px_36px] items-center gap-2">
              <input value={c.name} onChange={(e) => setAnywhere((l) => l.map((x) => (x.key === c.key ? { ...x, name: e.target.value } : x)))} maxLength={60} aria-label={t("selling.cityName")} placeholder={t("selling.cityPlaceholder")} className={input} dir="auto" />
              <input value={c.price} onChange={(e) => setAnywhere((l) => l.map((x) => (x.key === c.key ? { ...x, price: e.target.value } : x)))} inputMode="decimal" placeholder={t("selling.cityPriceShort", { currency })} aria-label={t("selling.cityPrice", { city: c.name || t("selling.cityName"), currency })} className={input} />
              <button type="button" className={kit.icon} aria-label={t("selling.cityRemove", { city: c.name })} onClick={() => setAnywhere((l) => l.filter((x) => x.key !== c.key))}>
                <Icon name="close" size={18} />
              </button>
            </div>
          ))}
          <div>
            <button type="button" className={kit.quiet} onClick={() => setAnywhere((l) => [...l, { key: keys++, name: "", price: "" }])}>
              <Icon name="add" size={18} />
              {t("selling.cityAdd")}
            </button>
          </div>
          {errors.cityPrices ? <p className="m-0 text-[13px] font-semibold text-danger">{known(errors.cityPrices)}</p> : null}
        </div>
      )}
      {errors.areas ? (
        <p className="m-0 text-[13px] font-semibold text-danger" role="alert">
          {known(errors.areas)}
        </p>
      ) : null}
    </div>
  );
}

// A flash sale's products

export type ProductChoice = { id: number; name: string; image: string | null; price: string };

/** The shop's products with their pictures and prices, searchable; each a `product` checkbox. */
export function ProductPicker({ products, chosen, legend }: { products: ProductChoice[]; chosen: Set<string>; legend: string }) {
  const t = useDashT();
  const [q, setQ] = useState("");
  const [count, setCount] = useState(() => products.filter((p) => chosen.has(String(p.id))).length);
  const f = fold(q);
  const shown = (p: ProductChoice) => f === "" || fold(p.name).includes(f);
  const visible = products.filter(shown).length;
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0" data-product-picker="">
      <legend className="mb-1 flex w-full items-center justify-between gap-2 text-sm font-semibold">
        <span>{legend}</span>
        <span className="text-xs font-semibold text-(--sp-muted)" data-products-chosen="">
          {t("selling.productsChosen", { count })}
        </span>
      </legend>
      {products.length > 5 ? (
        <span className="relative flex items-center">
          <Icon name="search" size={18} className="pointer-events-none absolute start-3 text-(--sp-muted)" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("selling.productSearch")} placeholder={t("selling.productSearch")} className={`${input} w-full ps-9`} />
        </span>
      ) : null}
      <ul className="m-0 flex max-h-72 list-none flex-col gap-1 overflow-y-auto rounded-xl border border-(--sp-line) p-1.5" onChange={(e) => {
          if (e.target instanceof HTMLInputElement && e.target.name === "product") setCount(e.currentTarget.querySelectorAll('input[name="product"]:checked').length);
        }}>
        {products.map((p) => (
          // Hidden, not removed, while searching: a chosen product stays in the form.
          <li key={p.id} hidden={!shown(p)} className="flex items-center gap-3 rounded-[10px] px-2 py-1.5 hover:bg-(--sp-soft)">
            <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <input type="checkbox" name="product" value={p.id} defaultChecked={chosen.has(String(p.id))} className="h-4 w-4 shrink-0 accent-midnight" />
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- An uploaded picture, already sized by the platform.
                <img src={p.image} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-(--sp-tile) text-(--sp-muted)">
                  <Icon name="inventory_2" size={19} />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold" dir="auto">
                {p.name}
              </span>
            </label>
            <span className="shrink-0 font-sans text-[13px] text-(--sp-muted) tabular-nums" aria-hidden="true">
              {p.price}
            </span>
          </li>
        ))}
        {visible === 0 ? <li className="p-3 text-[13px] text-(--sp-muted)">{t("selling.productNoMatch", { q })}</li> : null}
      </ul>
    </fieldset>
  );
}
