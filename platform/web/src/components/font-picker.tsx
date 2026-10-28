"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

/**
 * 97.1 Choose any free font: type to search the catalog (GET /api/v1/fonts),
 * each font shown in itself, with an Arabic-only filter and a sample line in
 * the chosen font. The files come from Yallapp, never from Google.
 */

interface FoundFont {
  family: string;
  arabic: boolean;
  preview_url: string;
}

export interface FontPickerLabels {
  arabicOnly: string;
  none: string;
  sample: string;
  hint?: string;
  /** 97.2 The tag on the owner's own fonts. */
  mine?: string;
}

const NO_FONTS: readonly { family: string; previewUrl: string }[] = [];

/** Fonts already added to the page, by family. */
const loaded = new Map<string, Promise<boolean>>();

/** The CSS family a free font is shown in here (never the dashboard's own fonts). */
function cssFamily(family: string): string {
  return `yp-font-${family.replace(/[^A-Za-z0-9]/g, "-")}`;
}

function loadFont(font: FoundFont): Promise<boolean> {
  let done = loaded.get(font.family);
  if (!done) {
    done =
      typeof FontFace === "undefined"
        ? Promise.resolve(false)
        : new FontFace(cssFamily(font.family), `url("${font.preview_url}")`)
            .load()
            .then((face) => {
              document.fonts.add(face);
              return true;
            })
            .catch(() => false);
    loaded.set(font.family, done);
  }
  return done;
}

/** A font's name, drawn in that font once its file is here. */
function FontName({ font }: { font: FoundFont }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let live = true;
    // Only the names scrolled into view load their font.
    const watch = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      watch.disconnect();
      void loadFont(font).then((ok) => live && setReady(ok));
    });
    watch.observe(el);
    return () => {
      live = false;
      watch.disconnect();
    };
  }, [font]);
  return (
    <span ref={ref} style={ready ? { fontFamily: `"${cssFamily(font.family)}", sans-serif` } : undefined}>
      {font.family}
    </span>
  );
}

export function FontPicker({
  id,
  name,
  label,
  value,
  onChange,
  labels,
  arabicOnly = false,
  own = NO_FONTS,
  compact = false,
  placeholder,
}: {
  id: string;
  /** The form field holding the chosen family, when inside a form. */
  name?: string;
  label: string;
  value: string;
  onChange?: (family: string) => void;
  labels: FontPickerLabels;
  /** Only fonts drawing Arabic (the Arabic text's font). */
  arabicOnly?: boolean;
  /** 97.2 The owner's own fonts, listed first. */
  own?: readonly { family: string; previewUrl: string }[];
  /** 103R One line, as in Yallapp Studio's inspector: the field alone, its label read out only. */
  compact?: boolean;
  /** Shown while no font is chosen. */
  placeholder?: string;
}) {
  const listId = useId();
  const hintId = useId();
  const [chosen, setChosen] = useState(value);
  const [query, setQuery] = useState<string | null>(null);
  const [arabic, setArabic] = useState(arabicOnly);
  const [found, setFound] = useState<FoundFont[] | null>(null);
  const [active, setActive] = useState(0);
  const [preview, setPreview] = useState<FoundFont | null>(null);
  const open = query !== null;
  const mine = useMemo(() => own.map((f) => ({ family: f.family, arabic: true, preview_url: f.previewUrl })), [own]);
  const isMine = (family: string) => mine.some((f) => f.family === family);

  // A new value from outside (a design chosen) replaces the shown one.
  const [given, setGiven] = useState(value);
  if (value !== given) {
    setGiven(value);
    setChosen(value);
  }

  // The search, as the owner types.
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ q: query, limit: "30", ...(arabic ? { arabic: "1" } : {}) });
    const timer = setTimeout(() => {
      fetch(`/api/v1/fonts?${params}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : { fonts: [] }))
        .then((body: { fonts: FoundFont[] }) => {
          // 97.2 The owner's own fonts first (by name), whatever the Arabic filter.
          const words = query.trim().toLowerCase();
          setFound([...mine.filter((f) => f.family.toLowerCase().includes(words)), ...body.fonts]);
          setActive(0);
        })
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, arabic, mine]);

  // The sample line in the chosen font.
  const chosenOwn = mine.find((f) => f.family === chosen);
  useEffect(() => {
    let live = true;
    if (chosenOwn) {
      void loadFont(chosenOwn).then((ok) => live && ok && setPreview(chosenOwn));
      return () => {
        live = false;
      };
    }
    fetch(`/api/v1/fonts?${new URLSearchParams({ q: chosen, limit: "1" })}`)
      .then((r) => (r.ok ? r.json() : { fonts: [] }))
      .then((body: { fonts: FoundFont[] }) => {
        const font = body.fonts.find((f) => f.family === chosen);
        if (!font) return;
        void loadFont(font).then((ok) => live && ok && setPreview(font));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [chosen, chosenOwn]);

  function choose(font: FoundFont) {
    setChosen(font.family);
    setQuery(null);
    onChange?.(font.family);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    const list = found ?? [];
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setQuery("");
      else setActive((i) => Math.min(i + 1, list.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (list[active]) choose(list[active]!);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      setQuery(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={compact ? "sr-only" : "text-sm font-semibold"}>
        {label}
      </label>
      {name ? <input type="hidden" name={name} value={chosen} /> : null}
      <div className="relative">
        <input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && found?.[active] ? `${listId}-${active}` : undefined}
          aria-describedby={labels.hint ? hintId : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          className={compact ? "h-[34px] w-full rounded-lg border bg-white ps-2.5 pe-7 text-[13px]" : "input input-sm w-full"}
          style={compact ? { borderColor: "var(--studio-line)" } : undefined}
          value={open ? query : chosen}
          onFocus={(e) => {
            e.target.select();
            if (!open) setQuery("");
          }}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => setTimeout(() => setQuery(null), 150)}
        />
        {compact ? (
          // The arrow's wrapper keeps the field's direction (the icon font is left to right).
          <span aria-hidden="true" className="pointer-events-none absolute end-2 top-1/2 flex -translate-y-1/2">
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>
              expand_more
            </span>
          </span>
        ) : null}
        {open ? (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto m-0 list-none rounded-2xl border border-line bg-white p-1 shadow-[0_16px_40px_rgba(14,13,36,0.14)]"
          >
            {found && found.length === 0 ? <li className="px-3 py-2 text-sm text-muted">{labels.none}</li> : null}
            {(found ?? []).map((font, i) => (
              <li
                key={font.family}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={font.family === chosen}
                className={`cursor-pointer rounded-lg px-3 py-2 text-[15px] ${i === active ? "bg-midnight/5" : ""}`}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(font)}
              >
                <FontName font={font} />
                {labels.mine && isMine(font.family) ? (
                  <>
                    {" "}
                    <span className="ms-1 text-xs text-muted">{labels.mine}</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {!arabicOnly && !compact ? (
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={arabic} onChange={(e) => setArabic(e.target.checked)} className="h-3.5 w-3.5 accent-midnight" />
          {labels.arabicOnly}
        </label>
      ) : null}
      {compact ? null : (
        <span
          aria-hidden="true"
          className="truncate text-[15px]"
          style={preview && preview.family === chosen ? { fontFamily: `"${cssFamily(preview.family)}", sans-serif` } : undefined}
        >
          {labels.sample}
        </span>
      )}
      {labels.hint && !compact ? (
        <span id={hintId} className="text-xs text-muted">
          {labels.hint}
        </span>
      ) : null}
    </div>
  );
}
