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
import { useDashFormat, useDashLang, useDashT, useKnownText } from "@/components/dashboard-i18n";
import { appLanguageName } from "@/lib/i18n/language-names";
import type { DashT } from "@/i18n/dashboard";

/** 56 "Home › block 2 › heading": each part in the dashboard's language when its words are known (page names are the owner's). */
function whereIn(where: string, known: (english: string) => string): string {
  return where
    .split(" › ")
    .map((part) => {
      const entry = part.match(/^(Slide|Link|Quote|Question|Person|Number) (\d+) (.+)$/);
      return entry ? `${known(entry[1]!)} ${entry[2]} ${known(entry[3]!)}` : known(part);
    })
    .join(" › ");
}

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
  const t = useDashT();
  const known = useKnownText();
  const { num } = useDashFormat();
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

  const dashLang = useDashLang();
  const englishName = appLanguageName("en", dashLang);
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
      setMessage({ text: known(r.message), ok: true });
      setStatus({ changes: r.changes, savedAt: r.savedAt, published: r.published });
      if (!keepEdits) setEdits({});
      router.refresh();
    } else {
      setErrors(r.errors);
      setMessage({ text: t("languages.notSaved"), ok: false });
    }
  }

  async function save() {
    if (!pending || blocking) return;
    setBusy(true);
    try {
      after(await saveTranslationsAction(lang.code, edits));
    } catch {
      setMessage({ text: t("languages.cantSave"), ok: false });
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    if (pending && !window.confirm(t("languages.unsavedPublish"))) return;
    setBusy(true);
    try {
      after(await publishTranslationsAction(), true);
    } catch {
      setMessage({ text: t("languages.cantPublish"), ok: false });
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
      setMessage({ text: t("languages.cantSaveLanguages"), ok: false });
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
      setMessage({ text: t("languages.fileLarge"), ok: false });
      return;
    }
    const result = parseImport(file.name, await file.text());
    if (result.error) {
      setMessage({ text: known(result.error), ok: false });
      return;
    }
    const byId = new Map(rows.map((r) => [r.id, r]));
    const next = { ...edits };
    let used = 0;
    let unknown = 0;
    for (const [id, text] of Object.entries(result.translations)) {
      const row = byId.get(id);
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
    const other = result.language && result.language !== lang.code ? t("languages.otherLanguage", { file: result.language, language: lang.name }) : "";
    setMessage({
      text: `${unknown ? t("languages.importedUnknown", { count: used, unknown }) : t("languages.imported", { count: used })}${other}`,
      ok: true,
    });
    setFilter("all");
  }

  return (
    <div className="flex flex-col gap-6">
      <Section id="app-languages" titleId="h-app-languages" title={t("languages.yourLanguages")} description={t("languages.orderText")}>
        <LanguageList languages={languages} onChange={(next) => void changeLanguages(next)} full={full} max={MAX_LANGUAGES} />
        {full && plan.languages !== null ? (
          <UpgradeHint title={t("pages.moreLanguages")} to={plan.upgrade} cta={plan.upgrade ? t("overview.upgradeTo", { plan: plan.upgrade.name }) : undefined}>
            {t("pages.planLanguages", { plan: plan.name, count: plan.languages })}
          </UpgradeHint>
        ) : null}
      </Section>

      <section aria-label={t("languages.draftSection")} className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <p role="status" className="m-0 text-[15px] font-semibold">
              {busy
                ? t("languages.working")
                : pending
                  ? t("languages.unsaved", { count: pending })
                  : t("languages.savedAt", { date: formatDateTime(new Date(status.savedAt), dashLang) })}
            </p>
            <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-muted">
              {status.published ? t("languages.publishedVersion", { version: status.published }) : t("languages.notPublished")}
              {status.changes ? <Badge tone="warn">{t("languages.unpublished")}</Badge> : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={previewHref} target="_blank" rel="noopener" className={`${btn.secondary} h-9 px-3.5 text-sm`}>
              <Icon name="visibility" size={18} />
              {t("languages.previewIn", { language: lang.name })}
              <Icon name="open_in_new" size={16} />
              <span className="sr-only">{t("common.opensInNewTab")}</span>
            </a>
            <button type="button" className={`${btn.secondary} h-9 px-3.5 text-sm`} disabled={busy || !pending || blocking > 0} onClick={() => void save()}>
              {t("languages.saveTranslations")}
            </button>
            <button type="button" className={`${btn.primary} h-9 px-4 text-sm`} disabled={busy} onClick={() => void publish()}>
              {t("languages.publish")}
            </button>
          </div>
        </div>
        {previewDraft ? null : <p className="m-0 text-sm text-muted">{t("languages.previewPublished")}</p>}
        {errors.length ? (
          <div role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-[15px] text-danger">
            <p className="m-0 font-semibold">{t("languages.fix")}</p>
            <ul className="m-0 mt-1 list-disc ps-5">
              {errors.map((e, i) => (
                <li key={i}>{known(e)}</li>
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

      <Section id="translations" titleId="h-translations" title={t("languages.translations")} description={t("languages.translationsText")}>
        <nav aria-label={t("languages.toTranslate")} className="flex flex-wrap gap-2">
          {summaries.map((s) => {
            const current = s.code === lang.code;
            return (
              <Link
                key={s.code}
                href={`/dashboard/languages?lang=${encodeURIComponent(s.code)}`}
                aria-current={current ? "page" : undefined}
                onClick={(e) => {
                  if (pending && !current && !window.confirm(t("common.leaveUnsaved"))) e.preventDefault();
                }}
                className={`flex flex-col items-start gap-0.5 rounded-xl border px-3.5 py-2 text-sm no-underline ${current ? "border-midnight bg-midnight text-white hover:text-white" : "border-line-strong bg-white text-midnight hover:border-midnight"}`}
              >
                <span className="font-semibold">{s.name}</span>
                <span className={current ? "text-white/80" : "text-muted"}>{t("languages.doneOf", { done: s.done, total: s.total })}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex flex-col gap-2">
          <p className="m-0 text-[15px] font-semibold" id="progress-label">
            {t("languages.progress", {
              language: lang.name,
              done: summary?.done ?? 0,
              total: summary?.total ?? rows.length,
              percent: summary && summary.total ? Math.floor((summary.done / summary.total) * 100) : 0,
            })}
          </p>
          <ProgressBar value={summary?.done ?? 0} max={summary?.total ?? rows.length} label={t("languages.progressLabel", { language: lang.name })} tone={summary && summary.done >= summary.total ? "success" : "accent"} />
          <p className="m-0 text-sm text-muted">
            {lang.isDefault
              ? t("languages.isDefault", { language: lang.name })
              : lang.builtIn
                ? t("languages.builtIn", { language: lang.name, default: defaultName })
                : languages.default === "en"
                  ? t("languages.fallbackEnglish")
                  : t("languages.fallbackDefault", { default: defaultName })}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
            <label htmlFor="tr-search" className="text-sm font-semibold">
              {t("languages.search")}
            </label>
            <input
              id="tr-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder={t("languages.searchPlaceholder")}
              className="input input-sm"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tr-group" className="text-sm font-semibold">
              {t("languages.texts")}
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
              <option value="all">{t("languages.allTexts")}</option>
              <option value="content">{t("languages.yourTexts", { count: contentCount })}</option>
              <option value="interface">{t("languages.appTexts", { count: rows.length - contentCount })}</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tr-filter" className="text-sm font-semibold">
              {t("languages.show")}
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
              <option value="missing">{t("languages.missing")}</option>
              <option value="all">{t("languages.all")}</option>
              <option value="mine">{t("languages.mine")}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted">{t("languages.export")}</span>
          {(["csv", "json", "xliff"] as const).map((f) => (
            <button key={f} type="button" className={`${btn.secondary} h-9 px-3 text-sm`} onClick={() => exportAs(f)}>
              <Icon name="download" size={18} />
              {f === "xliff" ? "XLIFF" : f.toUpperCase()}
            </button>
          ))}
          <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} onClick={() => fileInput.current?.click()}>
            <Icon name="upload" size={18} />
            {t("languages.importFile")}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.json,.xlf,.xliff,.xml,text/csv,application/json"
            className="sr-only"
            aria-label={t("languages.importLabel")} onChange={(e) => void importFile(e)} />
        </div>

        {visible.length === 0 ? (
          <p className="m-0 rounded-xl bg-sand px-4 py-6 text-center text-[15px] text-muted">
            {filter === "missing" && !query ? t("languages.allDone", { language: lang.name }) : t("languages.noMatch")}
          </p>
        ) : (
          <ol className="m-0 flex list-none flex-col gap-3 p-0" aria-label={t("languages.textsIn", { language: lang.name })}>
            {visible.map((row) => (
              <RowEditor
                key={row.id}
                row={row}
                value={valueOf(row)}
                edited={row.id in edits}
                lang={lang}
                defaultName={defaultName}
                englishName={englishName}
                problem={problems[row.id]}
                onChange={(v) => edit(row.id, v)}
                t={t}
                known={known}
              />
            ))}
          </ol>
        )}

        {pages > 1 ? (
          <nav aria-label={t("languages.pagesOf")} className="flex flex-wrap items-center justify-between gap-2">
            <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} disabled={at === 0} onClick={() => setPage(at - 1)}>
              {t("common.previous")}
            </button>
            <span className="text-sm text-muted">{t("languages.range", { from: at * PAGE_SIZE + 1, to: Math.min(shown.length, (at + 1) * PAGE_SIZE), total: shown.length })}</span>
            <button type="button" className={`${btn.secondary} h-9 px-3 text-sm`} disabled={at >= pages - 1} onClick={() => setPage(at + 1)}>
              {t("common.next")}
            </button>
          </nav>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {blocking ? <span className="text-sm font-semibold text-danger">{t("languages.fixBefore", { count: blocking })}</span> : null}
          <button type="button" className={`${btn.primary} h-10 px-4 text-sm`} disabled={busy || !pending || blocking > 0} onClick={() => void save()}>
            {pending ? t("languages.saveCount", { count: num(pending) }) : t("languages.saveTranslations")}
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
  englishName,
  problem,
  onChange,
  t,
  known,
}: {
  row: TranslationRow;
  value: string;
  edited: boolean;
  lang: LangInfo;
  defaultName: string;
  /** "English" in the dashboard's language: the app's own texts come in it. */
  englishName: string;
  problem?: { errors: string[]; warnings: string[] };
  onChange: (value: string) => void;
  t: DashT;
  known: (english: string) => string;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const id = `row-${row.id.replace(/[^A-Za-z0-9_-]/g, "_")}`;
  const sourceName = row.kind === "content" ? defaultName : englishName;
  const where = row.kind === "content" ? whereIn(row.where, known) : row.where;
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
          {row.kind === "content" ? where : <code className="font-mono">{row.id}</code>}
          {row.kind === "interface" && row.where ? (
            <span className="font-normal" lang="en" dir="ltr">
              {" "}
              · {row.where}
            </span>
          ) : null}
        </span>
        <span className="flex flex-wrap gap-1.5">
          {edited ? <Badge tone="info">{t("languages.notSavedBadge")}</Badge> : null}
          {value.trim() ? (
            <Badge tone="success">{t("languages.yours")}</Badge>
          ) : row.builtin ? (
            <Badge tone="neutral">{t("languages.yallappsTranslation")}</Badge>
          ) : (
            <Badge tone="warn">{t("languages.missingBadge")}</Badge>
          )}
        </span>
      </div>
      <p className="m-0 rounded-lg bg-sand px-3 py-2 text-[15px] break-words whitespace-pre-wrap" id={`${id}-source`} dir="auto">
        <span className="sr-only">{sourceName}: </span>
        {row.source}
      </p>
      <label htmlFor={id} className="sr-only">
        {t("languages.forRow", { language: lang.name, where: row.kind === "content" ? where : row.id })}
      </label>
      <textarea
        ref={field}
        id={id}
        value={value}
        dir={lang.rtl ? "rtl" : "ltr"}
        lang={lang.code}
        rows={row.source.length > 80 || row.html ? 3 : 1}
        placeholder={row.builtin ?? t("languages.showsUntil", { language: sourceName })}
        aria-describedby={`${id}-source${problem ? ` ${id}-problem` : ""}`}
        aria-invalid={problem?.errors.length ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="input min-h-[44px] py-2.5"
      />
      {problem ? (
        <div id={`${id}-problem`} className="flex flex-col gap-0.5 text-sm">
          {problem.errors.map((e) => (
            <span key={e} role="alert" className="font-semibold text-danger">
              {known(e)}
            </span>
          ))}
          {problem.warnings.map((w) => (
            <span key={w} className="text-muted">
              {known(w)}
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {placeholders.length ? (
          <span className="flex flex-wrap items-center gap-1.5" aria-label={t("languages.placeholders")}>
            {placeholders.map((p) => (
              <button
                key={p}
                type="button"
                className="rounded-full border border-line-strong bg-ivory px-2.5 py-0.5 font-mono text-xs font-semibold text-midnight hover:border-midnight"
                onClick={() => insert(p)}
                title={row.placeholders?.[p] === "int" ? t("languages.insertNumber", { placeholder: `{${p}}` }) : t("languages.insertValue", { placeholder: `{${p}}` })}
              >
                {`{${p}}`}
              </button>
            ))}
          </span>
        ) : null}
        <button type="button" className="text-sm font-semibold text-accent underline-offset-2 hover:underline" onClick={() => onChange(row.source)}>
          <Icon name="content_copy" size={16} className="me-1 align-[-3px]" />
          {t("languages.copySource", { language: sourceName })}
        </button>
        {row.builtin && !value.trim() ? (
          <button type="button" className="text-sm font-semibold text-accent underline-offset-2 hover:underline" onClick={() => onChange(row.builtin!)}>
            {t("languages.changeYallapps")}
          </button>
        ) : null}
        {value ? (
          <button type="button" className="text-sm font-semibold text-muted underline-offset-2 hover:underline" onClick={() => onChange("")}>
            {t("languages.clear")}
          </button>
        ) : null}
      </div>
    </li>
  );
}
