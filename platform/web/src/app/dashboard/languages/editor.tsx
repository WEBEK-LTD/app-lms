"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { publishTranslationsAction, saveLanguagesAction, saveTranslationsAction, type TranslationsResult } from "@/app/actions/translations";
import { Icon } from "@/components/icon";
import { Badge, btn, formatDateTime, ProgressBar, Section } from "@/components/ui";
import { UpgradeHint } from "@/components/upgrade";
import { parseImport, toCsv, toJson, toXliff, type ExchangeFormat } from "@/lib/i18n/exchange";
import { checkTranslation } from "@/lib/i18n/icu";
import { MAX_LANGUAGES } from "@/lib/i18n/locales";
import type { TranslationRow } from "@/lib/i18n/translations";
import type { Plan } from "@/lib/plans";
import { LanguageList } from "./language-list";

/** 43 The Languages page: the app's languages, and every text in the one being translated. */

type Filter = "missing" | "all" | "mine";
type Group = "all" | "content" | "interface";

const PAGE_SIZE = 40;

interface LangInfo {
  code: string;
  name: string;
  rtl: boolean;
  /** Yallapp ships the app in it (English, Arabic, Turkish). */
  builtIn: boolean;
  isDefault: boolean;
}

export function LanguagesEditor({
  languages,
  lang,
  defaultName,
  rows,
  summaries,
  published,
  changes,
  savedAt,
  previewHref,
  previewDraft,
  plan,
}: {
  languages: { default: string; available: string[] };
  lang: LangInfo;
  defaultName: string;
  rows: TranslationRow[];
  summaries: { code: string; name: string; nativeName: string; done: number; total: number }[];
  published: string | null;
  changes: boolean;
  savedAt: string;
  previewHref: string;
  /** The preview shows the draft (hosted apps); otherwise only what's published. */
  previewDraft: boolean;
  plan: { name: string; languages: number | null; upgrade: { id: Plan; name: string } | null };
}) {
  const router = useRouter();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>(lang.builtIn ? "all" : "missing");
  const [group, setGroup] = useState<Group>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState({ changes, savedAt, published });
  const fileInput = useRef<HTMLInputElement>(null);
  // Another language: its own filter, page and unsaved texts (the messages stay).
  const [forLang, setForLang] = useState(lang.code);
  if (forLang !== lang.code) {
    setForLang(lang.code);
    setEdits({});
    setFilter(lang.builtIn ? "all" : "missing");
    setPage(0);
    setQuery("");
  }

  const full = plan.languages !== null && languages.available.length >= plan.languages;
  const pending = Object.keys(edits).length;
  const valueOf = (row: TranslationRow) => edits[row.id] ?? row.value;

  const problems = useMemo(() => {
    const out: Record<string, { errors: string[]; warnings: string[] }> = {};
    for (const row of rows) {
      const value = (edits[row.id] ?? row.value).trim();
      if (row.kind !== "interface" || !value) continue;
      const check = checkTranslation(row.source, value, row.placeholders ?? {});
      if (check.errors.length || check.warnings.length) out[row.id] = check;
    }
    return out;
  }, [rows, edits]);
  const blocking = Object.values(problems).filter((p) => p.errors.length).length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (group !== "all" && row.kind !== group) return false;
      const value = edits[row.id] ?? row.value;
      if (filter === "missing" && (value.trim() || row.builtin) && !(row.id in edits)) return false;
      if (filter === "mine" && !value.trim()) return false;
      if (!q) return true;
      return [row.id, row.where, row.source, value, row.builtin ?? ""].some((t) => t.toLowerCase().includes(q));
    });
  }, [rows, edits, filter, group, query]);
  const pages = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  const at = Math.min(page, pages - 1);
  const visible = shown.slice(at * PAGE_SIZE, at * PAGE_SIZE + PAGE_SIZE);

  const summary = summaries.find((s) => s.code === lang.code);
  const contentCount = rows.filter((r) => r.kind === "content").length;

  function edit(id: string, value: string) {
    setMessage(null);
    setEdits((current) => {
      const row = rows.find((r) => r.id === id);
      const next = { ...current };
      if (row && value === row.value) delete next[id];
      else next[id] = value;
      return next;
    });
  }

  function after(r: TranslationsResult, keepEdits = false) {
    if (r.ok) {
      setErrors([]);
      setMessage({ text: r.message, ok: true });
      setStatus({ changes: r.changes, savedAt: r.savedAt, published: r.published });
      if (!keepEdits) setEdits({});
      router.refresh();
    } else {
      setErrors(r.errors);
      setMessage({ text: "Not saved: fix the problems listed above.", ok: false });
    }
  }

  async function save() {
    if (!pending || blocking) return;
    setBusy(true);
    try {
      after(await saveTranslationsAction(lang.code, edits));
    } catch {
      setMessage({ text: "Couldn't save. Check your connection and try again.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (pending && !window.confirm("You have translations that aren't saved. Publish without them?")) return;
    setBusy(true);
    try {
      after(await publishTranslationsAction(), true);
    } catch {
      setMessage({ text: "Couldn't publish. Check your connection and try again.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function changeLanguages(next: { default: string; available: string[] }) {
    setBusy(true);
    try {
      const r = await saveLanguagesAction({ default: next.default, available: next.available });
      after(r, true);
    } catch {
      setMessage({ text: "Couldn't save the languages. Check your connection and try again.", ok: false });
    } finally {
      setBusy(false);
    }
  }

  function exportAs(format: ExchangeFormat) {
    const list = rows.map((r) => ({ id: r.id, source: r.source, translation: valueOf(r) || (r.builtin ?? ""), where: r.where || undefined }));
    const body = format === "csv" ? toCsv(list) : format === "json" ? toJson(list, lang.code) : toXliff(list, "en", lang.code);
    const type = format === "csv" ? "text/csv" : format === "json" ? "application/json" : "application/xml";
    const url = URL.createObjectURL(new Blob([body], { type: `${type};charset=utf-8` }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `translations-${lang.code}.${format === "xliff" ? "xlf" : format}`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 3_000_000) {
      setMessage({ text: "The file is too large.", ok: false });
      return;
    }
    const result = parseImport(file.name, await file.text());
    if (result.error) {
      setMessage({ text: result.error, ok: false });
      return;
    }
    const known = new Map(rows.map((r) => [r.id, r]));
    const next = { ...edits };
    let used = 0;
    let unknown = 0;
    for (const [id, text] of Object.entries(result.translations)) {
      const row = known.get(id);
      if (!row) {
        unknown += 1;
        continue;
      }
      // Yallapp's own text, exported back unchanged, isn't the owner's.
      if (text === row.value || (text === row.builtin && !row.value)) continue;
      next[id] = text;
      used += 1;
    }
    setEdits(next);
    const other = result.language && result.language !== lang.code ? ` The file is for ${result.language}; its texts were added to ${lang.name}.` : "";
    setMessage({
      text: `${used} translation${used === 1 ? "" : "s"} imported${unknown ? `, ${unknown} didn't match a text of this app` : ""}. Check them, then save.${other}`,
      ok: true,
    });
    setFilter("all");
  }

  return (
    <div className="flex flex-col gap-6">
      <Section id="app-languages" titleId="h-app-languages" title="Your app's languages" description="The order here is the order of the language picker in the app.">
        <LanguageList languages={languages} onChange={(next) => void changeLanguages(next)} full={full} max={MAX_LANGUAGES} />
        {full && plan.languages !== null ? (
          <UpgradeHint title="More app languages" to={plan.upgrade}>
            The {plan.name} plan includes {plan.languages} app language{plan.languages === 1 ? "" : "s"}.
          </UpgradeHint>
        ) : null}
      </Section>

      <section aria-label="Draft and publishing" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p role="status" className="m-0 text-[15px] font-semibold">
              {busy ? "Working…" : pending ? `${pending} unsaved change${pending === 1 ? "" : "s"}` : `Draft saved ${formatDateTime(new Date(status.savedAt))}`}
            </p>
            <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-muted">
              {status.published ? `Published version ${status.published}.` : "Not published yet."}
              {status.changes ? <Badge tone="warn">Unpublished changes</Badge> : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={previewHref} target="_blank" rel="noopener" className={`${btn.secondary} h-9 px-3.5 text-sm`}>
              <Icon name="visibility" size={18} />
              Preview in {lang.name}
              <Icon name="open_in_new" size={16} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            <button type="button" className={`${btn.secondary} h-9 px-3.5 text-sm`} disabled={busy || !pending || blocking > 0} onClick={() => void save()}>
              Save translations
            </button>
            <button type="button" className={`${btn.primary} h-9 px-4 text-sm`} disabled={busy} onClick={() => void publish()}>
              Publish
            </button>
          </div>
        </div>
        {previewDraft ? null : <p className="m-0 text-sm text-muted">The preview shows what&apos;s published: publish to see your changes there.</p>}
        {errors.length ? (
          <div role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-[15px] text-danger">
            <p className="m-0 font-semibold">Fix these to save and publish:</p>
            <ul className="m-0 mt-1 list-disc pl-5">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {message ? (
          <p role={message.ok ? "status" : "alert"} className={`m-0 rounded-xl px-4 py-3 text-[15px] font-semibold ${message.ok ? "bg-success-bg text-success" : "bg-danger-bg text-danger"}`}>
            {message.text}
          </p>
        ) : null}
      </section>

      <Section id="translations" titleId="h-translations" title="Translations" description="Choose a language, then write each text in it. Empty texts show the language's fallback.">
        <nav aria-label="Language to translate" className="flex flex-wrap gap-2">
          {summaries.map((s) => {
            const current = s.code === lang.code;
            return (
              <Link
                key={s.code}
                href={`/dashboard/languages?lang=${encodeURIComponent(s.code)}`}
                aria-current={current ? "page" : undefined}
                onClick={(e) => {
                  if (pending && !current && !window.confirm("Leave without saving your changes?")) e.preventDefault();
                }}
                className={`flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2 text-sm no-underline ${current ? "border-midnight bg-midnight text-white hover:text-white" : "border-line-strong bg-white text-midnight hover:border-midnight"}`}
              >
                <span className="font-semibold">{s.name}</span>
                <span className={current ? "text-white/80" : "text-muted"}>
                  {s.done} of {s.total}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2">
          <p className="m-0 text-[15px] font-semibold" id="progress-label">
            {lang.name}: {summary?.done ?? 0} of {summary?.total ?? rows.length} translated ({summary && summary.total ? Math.floor((summary.done / summary.total) * 100) : 0}%)
          </p>
          <ProgressBar value={summary?.done ?? 0} max={summary?.total ?? rows.length} label={`${lang.name} translated`} tone={summary && summary.done >= summary.total ? "success" : "accent"} />
          <p className="m-0 text-sm text-muted">
            {lang.isDefault
              ? `${lang.name} is your default language: you write your pages in it on Pages & look. Here you can change the app's own texts in it.`
              : lang.builtIn
                ? `Yallapp's ${lang.name} is filled in for the app and for the texts Yallapp wrote. Write your own wherever you like; yours always wins. Empty texts show Yallapp's, else the ${defaultName} text.`
                : `A text you haven't translated shows in ${defaultName === "English" ? "English" : `${defaultName} (your pages) or English (the app's own texts)`}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
            <label htmlFor="tr-search" className="text-sm font-semibold">
              Search
            </label>
            <input
              id="tr-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="A word, a text or a key"
              className="input input-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tr-group" className="text-sm font-semibold">
              Texts
            </label>
            <select
              id="tr-group"
              value={group}
              onChange={(e) => {
                setGroup(e.target.value as Group);
                setPage(0);
              }}
              className="input input-sm"
            >
              <option value="all">All texts</option>
              <option value="content">Your pages and tabs ({contentCount})</option>
              <option value="interface">The app&apos;s own texts ({rows.length - contentCount})</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tr-filter" className="text-sm font-semibold">
              Show
            </label>
            <select
              id="tr-filter"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as Filter);
                setPage(0);
              }}
              className="input input-sm"
            >
              <option value="missing">Missing</option>
              <option value="all">All</option>
              <option value="mine">Written by you</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted">Export:</span>
          {(["csv", "json", "xliff"] as const).map((f) => (
            <button key={f} type="button" className={`${btn.secondary} h-9 px-3 text-sm`} onClick={() => exportAs(f)}>
              <Icon name="download" size={18} />
              {f === "xliff" ? "XLIFF" : f.toUpperCase()}
            </button>
          ))}
          <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} onClick={() => fileInput.current?.click()}>
            <Icon name="upload" size={18} />
            Import a file
          </button>
          <input ref={fileInput} type="file" accept=".csv,.json,.xlf,.xliff,.xml,text/csv,application/json" className="sr-only" aria-label="Import translations" onChange={(e) => void importFile(e)} />
        </div>

        {visible.length === 0 ? (
          <p className="m-0 rounded-xl bg-sand px-4 py-6 text-center text-[15px] text-muted">
            {filter === "missing" && !query ? `Every text is translated into ${lang.name}.` : "No texts match."}
          </p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-3 p-0" aria-label={`Texts in ${lang.name}`}>
            {visible.map((row) => (
              <RowEditor key={row.id} row={row} value={valueOf(row)} edited={row.id in edits} lang={lang} defaultName={defaultName} problem={problems[row.id]} onChange={(v) => edit(row.id, v)} />
            ))}
          </ol>
        )}

        {pages > 1 ? (
          <nav aria-label="Pages of texts" className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} disabled={at === 0} onClick={() => setPage(at - 1)}>
              Previous
            </button>
            <span className="text-sm text-muted">
              {at * PAGE_SIZE + 1} to {Math.min(shown.length, (at + 1) * PAGE_SIZE)} of {shown.length}
            </span>
            <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} disabled={at >= pages - 1} onClick={() => setPage(at + 1)}>
              Next
            </button>
          </nav>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {blocking ? <span className="text-sm font-semibold text-danger">Fix {blocking === 1 ? "one text" : `${blocking} texts`} before saving.</span> : null}
          <button type="button" className={`${btn.primary} h-10 px-4 text-sm`} disabled={busy || !pending || blocking > 0} onClick={() => void save()}>
            Save translations{pending ? ` (${pending})` : ""}
          </button>
        </div>
      </Section>
    </div>
  );
}

function RowEditor({
  row,
  value,
  edited,
  lang,
  defaultName,
  problem,
  onChange,
}: {
  row: TranslationRow;
  value: string;
  edited: boolean;
  lang: LangInfo;
  defaultName: string;
  problem?: { errors: string[]; warnings: string[] };
  onChange: (value: string) => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const id = `row-${row.id.replace(/[^A-Za-z0-9_-]/g, "_")}`;
  const sourceName = row.kind === "content" ? defaultName : "English";
  const placeholders = Object.keys(row.placeholders ?? {});

  function insert(name: string) {
    const el = field.current;
    const token = `{${name}}`;
    if (!el) return onChange(value + token);
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-xl border border-line p-4" data-row-id={row.id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 text-xs font-semibold text-muted">
          {row.kind === "content" ? row.where : <code className="font-mono">{row.id}</code>}
          {row.kind === "interface" && row.where ? <span className="font-normal"> · {row.where}</span> : null}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {edited ? <Badge tone="info">Not saved</Badge> : null}
          {value.trim() ? <Badge tone="success">Yours</Badge> : row.builtin ? <Badge tone="neutral">Yallapp&apos;s translation</Badge> : <Badge tone="warn">Missing</Badge>}
        </span>
      </div>
      <p className="m-0 rounded-lg bg-sand px-3 py-2 text-[15px] break-words whitespace-pre-wrap" id={`${id}-source`}>
        <span className="sr-only">{sourceName}: </span>
        {row.source}
      </p>
      <label htmlFor={id} className="sr-only">
        {lang.name} for {row.kind === "content" ? row.where : row.id}
      </label>
      <textarea
        ref={field}
        id={id}
        value={value}
        dir={lang.rtl ? "rtl" : "ltr"}
        lang={lang.code}
        rows={row.source.length > 80 || row.html ? 3 : 1}
        placeholder={row.builtin ?? `Shows the ${sourceName} text until you translate it`}
        aria-describedby={`${id}-source${problem ? ` ${id}-problem` : ""}`}
        aria-invalid={problem?.errors.length ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="input min-h-[44px] py-2.5"
      />
      {problem ? (
        <div id={`${id}-problem`} className="flex flex-col gap-0.5 text-sm">
          {problem.errors.map((e) => (
            <span key={e} role="alert" className="font-semibold text-danger">
              {e}
            </span>
          ))}
          {problem.warnings.map((w) => (
            <span key={w} className="text-muted">
              {w}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {placeholders.length ? (
          <span className="flex flex-wrap items-center gap-1.5" aria-label="Placeholders the app fills in">
            {placeholders.map((p) => (
              <button
                key={p}
                type="button"
                className="rounded-full border border-line-strong bg-ivory px-2.5 py-0.5 font-mono text-xs font-semibold text-midnight hover:border-midnight"
                onClick={() => insert(p)}
                title={`Insert {${p}}: the app puts the ${row.placeholders?.[p] === "int" ? "number" : "value"} here`}
              >
                {`{${p}}`}
              </button>
            ))}
          </span>
        ) : null}
        <button type="button" className="text-sm font-semibold text-accent underline-offset-2 hover:underline" onClick={() => onChange(row.source)}>
          <Icon name="content_copy" size={16} className="mr-1 align-[-3px]" />
          Copy {sourceName}
        </button>
        {row.builtin && !value.trim() ? (
          <button type="button" className="text-sm font-semibold text-accent underline-offset-2 hover:underline" onClick={() => onChange(row.builtin!)}>
            Change Yallapp&apos;s
          </button>
        ) : null}
        {value ? (
          <button type="button" className="text-sm font-semibold text-muted underline-offset-2 hover:underline" onClick={() => onChange("")}>
            Clear
          </button>
        ) : null}
      </div>
    </li>
  );
}
