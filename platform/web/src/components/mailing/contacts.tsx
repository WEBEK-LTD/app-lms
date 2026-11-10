"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import {
  addMailContactAction,
  deleteMailContactsAction,
  importMailContactsAction,
  previewMailContactImportAction,
  tagMailContactsAction,
  updateMailContactAction,
  type ContactFieldErrors,
  type ImportPreview,
} from "@/app/actions/admin-mail-contacts";
import { Icon } from "@/components/icon";
import { Badge, Notice, btn } from "@/components/ui";
import type { ContactMailStatus, ContactRowStatus } from "@/lib/mailing/contacts";
import { MAIL_CONTACT_AGREEMENT, MAIL_CONTACT_SOURCES, type MailContactSource, type MailLang } from "@/lib/mailing/types";
import { Field, inputClass } from "./fields";

/** 114 Admin › Email campaigns › Contacts: adding one, importing a list or a CSV file (checked first), and the list itself. */

type Country = { code: string; name: string };

export interface ContactRow {
  id: string;
  email: string;
  name: string;
  company: string | null;
  lang: MailLang;
  country: string | null;
  tags: string[];
  source: MailContactSource;
  sourceNote: string | null;
  addedBy: string;
  addedAt: string;
  status: ContactMailStatus;
}

const LANGS: { value: MailLang; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic" },
  { value: "tr", label: "Turkish" },
];

const STATUS: Record<ContactMailStatus, { label: string; tone: "success" | "warn" | "danger" | "neutral" }> = {
  subscribed: { label: "Gets campaigns", tone: "success" },
  unsubscribed: { label: "Unsubscribed", tone: "warn" },
  bounced: { label: "Bounced", tone: "danger" },
  complained: { label: "Marked as spam", tone: "danger" },
  admin: { label: "Kept out", tone: "neutral" },
};

const ROW_STATUS: Record<ContactRowStatus, { label: string; tone: "success" | "warn" | "danger" | "neutral" | "info" }> = {
  new: { label: "Will be added", tone: "success" },
  duplicate: { label: "Listed twice", tone: "neutral" },
  contact: { label: "Already a contact", tone: "neutral" },
  account: { label: "Has an account", tone: "info" },
  error: { label: "Problem", tone: "danger" },
};

function FieldError({ text }: { text?: string }) {
  return text ? (
    <span className="text-[12.5px] text-danger" role="alert">
      {text}
    </span>
  ) : null;
}

function CountrySelect({ id, value, onChange, countries, empty }: { id?: string; value: string; onChange: (v: string) => void; countries: Country[]; empty: string }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} cursor-pointer`}>
      <option value="">{empty}</option>
      {countries.map((c) => (
        <option key={c.code} value={c.code}>
          {c.name}
        </option>
      ))}
    </select>
  );
}

function LangSelect({ id, value, onChange }: { id?: string; value: MailLang; onChange: (v: MailLang) => void }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as MailLang)} className={`${inputClass} cursor-pointer`}>
      {LANGS.map((l) => (
        <option key={l.value} value={l.value}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

/** Where the admin knows them from: required; "Other" needs words. */
function SourceFields({ source, note, onSource, onNote, errors, idPrefix }: { source: MailContactSource | ""; note: string; onSource: (v: MailContactSource | "") => void; onNote: (v: string) => void; errors: ContactFieldErrors; idPrefix: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Where you know them from" htmlFor={`${idPrefix}-source`}>
        <select id={`${idPrefix}-source`} value={source} onChange={(e) => onSource(e.target.value as MailContactSource | "")} className={`${inputClass} cursor-pointer`} data-testid="contact-source" aria-invalid={errors.source ? true : undefined}>
          <option value="">Choose…</option>
          {MAIL_CONTACT_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <FieldError text={errors.source} />
      </Field>
      <Field label={source === "other" ? "Where (required)" : "Detail (optional)"} htmlFor={`${idPrefix}-note`}>
        <input id={`${idPrefix}-note`} value={note} onChange={(e) => onNote(e.target.value)} maxLength={200} placeholder={source === "event" ? "Which event" : source === "other" ? "Where you know them from" : ""} className={inputClass} data-testid="contact-source-note" aria-invalid={errors.sourceNote ? true : undefined} />
        <FieldError text={errors.sourceNote} />
      </Field>
    </div>
  );
}

function AgreeBox({ checked, onChange, error, id }: { checked: boolean; onChange: (v: boolean) => void; error?: string; id: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 rounded-[12px] border border-line bg-sand/60 p-3 text-[14px] font-semibold text-midnight">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#0E0D24]" data-testid="contact-agree" />
        <span>
          {MAIL_CONTACT_AGREEMENT}.
          <span className="block text-[12.5px] font-normal text-muted">Kept with each contact, with your name and the time. Every email has an unsubscribe link, and addresses that unsubscribed, bounced or complained never get one.</span>
        </span>
      </label>
      <FieldError text={error} />
    </div>
  );
}

function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-[18px] font-extrabold text-midnight">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer border-0 bg-transparent p-1 text-muted hover:text-midnight">
          <Icon name="close" size={20} />
        </button>
      </div>
      {children}
    </section>
  );
}

/** The buttons above the list, and the add and import panels they open. */
export function ContactTools({ countries, tags }: { countries: Country[]; tags: string[] }) {
  const [open, setOpen] = useState<"none" | "add" | "import">("none");
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setOpen(open === "add" ? "none" : "add")} aria-expanded={open === "add"} className={`${btn.primary} h-10 cursor-pointer`} data-testid="open-add-contact">
          <Icon name="add" size={18} />
          Add a contact
        </button>
        <button type="button" onClick={() => setOpen(open === "import" ? "none" : "import")} aria-expanded={open === "import"} className={`${btn.secondary} h-10 cursor-pointer`} data-testid="open-import">
          <Icon name="upload" size={18} />
          Import a list or CSV
        </button>
      </div>
      {done ? (
        <Notice tone="success" icon="check_circle" role="status">
          {done}
        </Notice>
      ) : null}
      {open === "add" ? (
        <AddContact
          countries={countries}
          tags={tags}
          onClose={() => setOpen("none")}
          onDone={(text) => {
            setDone(text);
          }}
        />
      ) : null}
      {open === "import" ? (
        <ImportContacts
          countries={countries}
          tags={tags}
          onClose={() => setOpen("none")}
          onDone={(text) => {
            setDone(text);
            setOpen("none");
          }}
        />
      ) : null}
    </div>
  );
}

function TagsInput({ id, value, onChange, tags, placeholder }: { id: string; value: string; onChange: (v: string) => void; tags: string[]; placeholder?: string }) {
  return (
    <>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} list={`${id}-list`} placeholder={placeholder ?? "Separated by commas: lead, cairo"} className={inputClass} />
      <datalist id={`${id}-list`}>
        {tags.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </>
  );
}

function AddContact({ countries, tags, onClose, onDone }: { countries: Country[]; tags: string[]; onClose: () => void; onDone: (text: string) => void }) {
  const router = useRouter();
  const [f, setF] = useState({ email: "", name: "", company: "", lang: "en" as MailLang, country: "", tags: "" });
  const [source, setSource] = useState<MailContactSource | "">("");
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const put = (patch: Partial<typeof f>) => setF({ ...f, ...patch });
  return (
    <Panel title="Add a contact" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        data-testid="add-contact-form"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const r = await addMailContactAction({ ...f, source, sourceNote: note, agreed });
            if (r.ok) {
              onDone(`Added ${f.email.trim().toLowerCase()}.`);
              setF({ email: "", name: "", company: "", lang: f.lang, country: f.country, tags: f.tags });
              setErrors({});
              setError(null);
              router.refresh();
            } else {
              setErrors(r.errors ?? {});
              setError(r.error);
            }
          });
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Email" htmlFor="c-email">
            <input id="c-email" type="email" required value={f.email} onChange={(e) => put({ email: e.target.value })} dir="ltr" className={inputClass} data-testid="contact-email" aria-invalid={errors.email ? true : undefined} />
            <FieldError text={errors.email} />
          </Field>
          <Field label="Name" htmlFor="c-name">
            <input id="c-name" value={f.name} onChange={(e) => put({ name: e.target.value })} dir="auto" maxLength={120} className={inputClass} data-testid="contact-name" />
            <FieldError text={errors.name} />
          </Field>
          <Field label="Company" htmlFor="c-company">
            <input id="c-company" value={f.company} onChange={(e) => put({ company: e.target.value })} dir="auto" maxLength={160} className={inputClass} />
            <FieldError text={errors.company} />
          </Field>
          <Field label="Language of their emails" htmlFor="c-lang">
            <LangSelect id="c-lang" value={f.lang} onChange={(lang) => put({ lang })} />
          </Field>
          <Field label="Country" htmlFor="c-country">
            <CountrySelect id="c-country" value={f.country} onChange={(country) => put({ country })} countries={countries} empty="Not known" />
            <FieldError text={errors.country} />
          </Field>
          <Field label="Tags" htmlFor="c-tags">
            <TagsInput id="c-tags" value={f.tags} onChange={(v) => put({ tags: v })} tags={tags} />
          </Field>
        </div>
        <SourceFields source={source} note={note} onSource={setSource} onNote={setNote} errors={errors} idPrefix="c" />
        <AgreeBox id="c-agree" checked={agreed} onChange={setAgreed} error={errors.agreed} />
        {error ? (
          <Notice tone="danger" icon="error" role="alert">
            {error}
          </Notice>
        ) : null}
        <div>
          <button type="submit" disabled={pending} className={`${btn.primary} h-10 cursor-pointer`} data-testid="add-contact">
            <Icon name="person" size={18} />
            Add the contact
          </button>
        </div>
      </form>
    </Panel>
  );
}

const SHOWN = 300;

function ImportContacts({ countries, tags, onClose, onDone }: { countries: Country[]; tags: string[]; onClose: () => void; onDone: (text: string) => void }) {
  const router = useRouter();
  const [format, setFormat] = useState<"paste" | "csv">("paste");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [lang, setLang] = useState<MailLang>("en");
  const [country, setCountry] = useState("");
  const [extraTags, setExtraTags] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [only, setOnly] = useState<"all" | "problems">("all");
  const [source, setSource] = useState<MailContactSource | "">("");
  const [note, setNote] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Anything changed: check again before adding.
  const changed = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPreview(null);
  };
  const input = { text, format, lang, country, tags: extraTags };
  const rows = preview ? (only === "problems" ? preview.rows.filter((r) => r.status !== "new") : preview.rows) : [];
  return (
    <Panel title="Import contacts" onClose={onClose}>
      <div className="flex gap-1 rounded-[12px] bg-sand p-1 self-start" role="tablist" aria-label="How">
        {(
          [
            ["paste", "Paste a list", "content_paste"],
            ["csv", "Upload a CSV file", "upload"],
          ] as const
        ).map(([value, label, icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={format === value}
            onClick={() => {
              setFormat(value);
              setText("");
              setFileName(null);
              setPreview(null);
              setError(null);
            }}
            className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold ${format === value ? "bg-midnight text-ivory" : "text-ink-3"}`}
          >
            <Icon name={icon} size={18} />
            {label}
          </button>
        ))}
      </div>
      {format === "paste" ? (
        <Field label="One contact per line: email, name, company" hint="Name and company are optional. Quote a part that has a comma in it: “mona@example.com, Mona, &quot;Bakery, Cairo&quot;”." htmlFor="i-text">
          <textarea id="i-text" rows={7} value={text} onChange={(e) => changed(setText)(e.target.value)} placeholder={"mona@example.com, Mona Hassan, Mona's Bakery\nahmed@example.com, أحمد علي, شركة النور"} className={`${inputClass} h-auto py-2 font-mono text-[13px]`} dir="auto" data-testid="import-text" />
        </Field>
      ) : (
        <Field label="CSV file with a header row" hint="Columns: email (required), name, company, language (en, ar or tr), country (a two-letter code like EG), tags (separated by semicolons). Save from Excel or Google Sheets as “CSV UTF-8”. Up to 5,000 rows, 2 MB." htmlFor="i-file">
          <input
            id="i-file"
            type="file"
            accept=".csv,text/csv"
            data-testid="import-file"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              setPreview(null);
              setError(null);
              if (!file) return;
              if (file.size > 2_000_000) {
                setError("The file is over 2 MB. Split it into smaller files.");
                return;
              }
              try {
                setText(new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()));
                setFileName(file.name);
              } catch {
                setText("");
                setError("The file isn't UTF-8 text. In Excel, save it as “CSV UTF-8 (comma delimited)”.");
              }
            }}
            className="text-[14px]"
          />
          {fileName ? <span className="text-[13px] text-muted">{fileName}</span> : null}
        </Field>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Language, when a row has none" htmlFor="i-lang">
          <LangSelect id="i-lang" value={lang} onChange={changed(setLang)} />
        </Field>
        <Field label="Country, when a row has none" htmlFor="i-country">
          <CountrySelect id="i-country" value={country} onChange={changed(setCountry)} countries={countries} empty="Not known" />
        </Field>
        <Field label="Tags for all of them" htmlFor="i-tags">
          <TagsInput id="i-tags" value={extraTags} onChange={changed(setExtraTags)} tags={tags} placeholder="e.g. expo 2026, lead" />
        </Field>
      </div>
      <div>
        <button
          type="button"
          disabled={pending || !text.trim()}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await previewMailContactImportAction(input);
              if (r.ok) {
                setPreview({ rows: r.rows, summary: r.summary });
                setOnly("all");
              } else {
                setPreview(null);
                setError(r.error);
              }
            })
          }
          className={`${btn.secondary} h-10 cursor-pointer`}
          data-testid="check-import"
        >
          <Icon name="visibility" size={18} />
          Check the list
        </button>
      </div>
      {preview ? (
        <div className="flex flex-col gap-3" data-testid="import-preview">
          <p className="m-0 flex flex-wrap gap-2 text-[14px]">
            {(Object.keys(ROW_STATUS) as ContactRowStatus[])
              .filter((s) => preview.summary[s] > 0)
              .map((s) => (
                <Badge key={s} tone={ROW_STATUS[s].tone}>
                  {preview.summary[s].toLocaleString("en")} {ROW_STATUS[s].label.toLowerCase()}
                </Badge>
              ))}
          </p>
          <div className="flex gap-2 text-[13px]">
            <button type="button" aria-pressed={only === "all"} onClick={() => setOnly("all")} className={`cursor-pointer rounded-full border px-3 py-1 ${only === "all" ? "border-midnight bg-midnight text-ivory" : "border-line bg-white"}`}>
              Every row
            </button>
            <button type="button" aria-pressed={only === "problems"} onClick={() => setOnly("problems")} className={`cursor-pointer rounded-full border px-3 py-1 ${only === "problems" ? "border-midnight bg-midnight text-ivory" : "border-line bg-white"}`}>
              Not added ({(preview.rows.length - preview.summary.new).toLocaleString("en")})
            </button>
          </div>
          <div className="max-h-[420px] overflow-auto rounded-[12px] border border-line">
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 bg-sand text-muted">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">Line</th>
                  <th className="px-3 py-2 text-start font-semibold">Email</th>
                  <th className="px-3 py-2 text-start font-semibold">Name</th>
                  <th className="px-3 py-2 text-start font-semibold">Company</th>
                  <th className="px-3 py-2 text-start font-semibold">Lang · Country</th>
                  <th className="px-3 py-2 text-start font-semibold">Tags</th>
                  <th className="px-3 py-2 text-start font-semibold">What happens</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, SHOWN).map((r) => (
                  <tr key={r.line} className="border-t border-line-soft align-top" data-row-status={r.status}>
                    <td className="px-3 py-1.5 text-muted tabular-nums">{r.line}</td>
                    <td className="px-3 py-1.5" dir="ltr">
                      {r.email}
                    </td>
                    <td className="px-3 py-1.5" dir="auto">
                      {r.name}
                    </td>
                    <td className="px-3 py-1.5" dir="auto">
                      {r.company}
                    </td>
                    <td className="px-3 py-1.5 whitespace-nowrap">
                      {r.lang.toUpperCase()}
                      {r.country ? ` · ${r.country}` : ""}
                    </td>
                    <td className="px-3 py-1.5">{r.tags.join(", ")}</td>
                    <td className="px-3 py-1.5">
                      <Badge tone={ROW_STATUS[r.status].tone}>{ROW_STATUS[r.status].label}</Badge>
                      {r.message ? <span className="mt-1 block text-[12px] text-ink-3">{r.message}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > SHOWN ? <p className="m-0 px-3 py-2 text-[12.5px] text-muted">And {(rows.length - SHOWN).toLocaleString("en")} more rows.</p> : null}
          </div>
          {preview.summary.new > 0 ? (
            <>
              <SourceFields source={source} note={note} onSource={setSource} onNote={setNote} errors={errors} idPrefix="i" />
              <AgreeBox id="i-agree" checked={agreed} onChange={setAgreed} error={errors.agreed} />
              <div>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await importMailContactsAction({ ...input, source, sourceNote: note, agreed });
                      if (r.ok) {
                        onDone(`Added ${r.added.toLocaleString("en")} contacts.${r.summary.contact + r.summary.account + r.summary.duplicate + r.summary.error ? ` ${(r.summary.contact + r.summary.account + r.summary.duplicate + r.summary.error).toLocaleString("en")} rows weren't added (already contacts, accounts, listed twice or with problems).` : ""}`);
                        router.refresh();
                      } else {
                        setErrors(r.errors ?? {});
                        setError(r.error);
                      }
                    })
                  }
                  className={`${btn.primary} h-10 cursor-pointer`}
                  data-testid="import-contacts"
                >
                  <Icon name="group" size={18} />
                  Add {preview.summary.new.toLocaleString("en")} {preview.summary.new === 1 ? "contact" : "contacts"}
                </button>
              </div>
            </>
          ) : (
            <p className="m-0 text-[14px] text-muted">Nothing new to add.</p>
          )}
        </div>
      ) : null}
      {error ? (
        <Notice tone="danger" icon="error" role="alert">
          {error}
        </Notice>
      ) : null}
    </Panel>
  );
}

function sourceText(row: Pick<ContactRow, "source" | "sourceNote">): string {
  const label = MAIL_CONTACT_SOURCES.find((s) => s.value === row.source)?.label ?? row.source;
  if (!row.sourceNote) return label;
  return row.source === "other" ? row.sourceNote : `${label}: ${row.sourceNote}`;
}

/** The list: choose some to tag, untag or delete; edit one. */
export function ContactsTable({ rows, tags, countries }: { rows: ContactRow[]; tags: string[]; countries: Country[] }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [tag, setTag] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const all = rows.length > 0 && rows.every((r) => chosen.has(r.id));
  const toggle = (id: string) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setChosen(next);
  };
  const remove = (ids: string[], what: string) => {
    if (!window.confirm(`Delete ${what}? Addresses that unsubscribed, bounced or were kept out stay on the Never mailed list.`)) return;
    start(async () => {
      const r = await deleteMailContactsAction(ids);
      if (r.ok) {
        setMessage({ tone: "success", text: `Deleted ${r.deleted === 1 ? "1 contact" : `${r.deleted} contacts`}.` });
        setChosen(new Set());
        router.refresh();
      } else setMessage({ tone: "danger", text: r.error });
    });
  };
  const retag = (add: boolean) =>
    start(async () => {
      const r = await tagMailContactsAction([...chosen], tag, add);
      if (r.ok) {
        setMessage({ tone: "success", text: `${add ? "Tagged" : "Untagged"} ${r.changed === 1 ? "1 contact" : `${r.changed} contacts`}.` });
        router.refresh();
      } else setMessage({ tone: "danger", text: r.error });
    });
  return (
    <>
      {chosen.size ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-line-soft bg-sand/60 px-5 py-3 sm:px-6" data-testid="bulk-bar">
          <span className="text-[14px] font-semibold text-midnight">{chosen.size} chosen</span>
          <input value={tag} onChange={(e) => setTag(e.target.value)} list="bulk-tags" placeholder="Tag" aria-label="Tag" className={`${inputClass} h-9 max-w-[200px]`} data-testid="bulk-tag" />
          <datalist id="bulk-tags">
            {tags.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <button type="button" disabled={pending || !tag.trim()} onClick={() => retag(true)} className={`${btn.secondary} h-9 cursor-pointer px-3 text-[13px]`} data-testid="bulk-tag-add">
            <Icon name="label" size={17} />
            Add tag
          </button>
          <button type="button" disabled={pending || !tag.trim()} onClick={() => retag(false)} className={`${btn.secondary} h-9 cursor-pointer px-3 text-[13px]`}>
            Remove tag
          </button>
          <button type="button" disabled={pending} onClick={() => remove([...chosen], `${chosen.size === 1 ? "this contact" : `these ${chosen.size} contacts`}`)} className={`${btn.ghost} h-9 cursor-pointer px-3 text-[13px] text-danger`}>
            <Icon name="delete" size={17} />
            Delete
          </button>
        </div>
      ) : null}
      {message ? (
        <div className="px-5 pt-3 sm:px-6">
          <Notice tone={message.tone} icon={message.tone === "success" ? "check_circle" : "error"} role={message.tone === "success" ? "status" : "alert"}>
            {message.text}
          </Notice>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[14px]" data-testid="contacts-table">
          <thead className="border-b border-line-soft bg-sand text-[13px] text-muted">
            <tr>
              <th className="w-10 py-3 ps-5 sm:ps-6">
                <input type="checkbox" aria-label="Choose all on this page" checked={all} onChange={() => setChosen(all ? new Set() : new Set(rows.map((r) => r.id)))} className="h-4 w-4 cursor-pointer accent-[#0E0D24]" />
              </th>
              <th className="px-3 py-3 text-start font-semibold">Contact</th>
              <th className="px-3 py-3 text-start font-semibold">Language · Country</th>
              <th className="px-3 py-3 text-start font-semibold">Tags</th>
              <th className="px-3 py-3 text-start font-semibold">From</th>
              <th className="px-3 py-3 text-start font-semibold">Campaigns</th>
              <th className="px-3 py-3 pe-5 text-start font-semibold sm:pe-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <ContactLine key={r.id} row={r} chosen={chosen.has(r.id)} onChoose={() => toggle(r.id)} editing={editing === r.id} onEdit={() => setEditing(editing === r.id ? null : r.id)} onDelete={() => remove([r.id], r.email)} countries={countries} tags={tags} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ContactLine({ row, chosen, onChoose, editing, onEdit, onDelete, countries, tags }: { row: ContactRow; chosen: boolean; onChoose: () => void; editing: boolean; onEdit: () => void; onDelete: () => void; countries: Country[]; tags: string[] }) {
  return (
    <>
      <tr className="border-b border-line-soft align-top last:border-b-0" data-contact={row.email}>
        <td className="py-3 ps-5 sm:ps-6">
          <input type="checkbox" aria-label={`Choose ${row.email}`} checked={chosen} onChange={onChoose} className="h-4 w-4 cursor-pointer accent-[#0E0D24]" />
        </td>
        <td className="px-3 py-3">
          <span className="block font-semibold text-midnight" dir="ltr">
            {row.email}
          </span>
          {row.name || row.company ? (
            <span className="block text-[13px] text-ink-3" dir="auto">
              {[row.name, row.company].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </td>
        <td className="px-3 py-3 whitespace-nowrap">
          {LANGS.find((l) => l.value === row.lang)?.label}
          {row.country ? ` · ${countries.find((c) => c.code === row.country)?.name ?? row.country}` : ""}
        </td>
        <td className="px-3 py-3">
          <span className="flex flex-wrap gap-1">
            {row.tags.map((t) => (
              <span key={t} className="rounded-full bg-sand px-2 py-0.5 text-[12px] font-semibold text-ink-3" dir="auto">
                {t}
              </span>
            ))}
          </span>
        </td>
        <td className="px-3 py-3 text-[13px]">
          <span className="block text-midnight">{sourceText(row)}</span>
          <span className="block text-muted">
            {row.addedBy} · {row.addedAt.slice(0, 10)}
          </span>
        </td>
        <td className="px-3 py-3">
          <Badge tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Badge>
        </td>
        <td className="px-3 py-3 pe-5 text-end whitespace-nowrap sm:pe-6">
          <button type="button" onClick={onEdit} aria-expanded={editing} className={`${btn.ghost} h-9 cursor-pointer px-2 text-[13px]`} aria-label={`Edit ${row.email}`}>
            <Icon name="edit" size={17} />
          </button>
          <button type="button" onClick={onDelete} className={`${btn.ghost} h-9 cursor-pointer px-2 text-[13px] text-danger`} aria-label={`Delete ${row.email}`}>
            <Icon name="delete" size={17} />
          </button>
        </td>
      </tr>
      {editing ? (
        <tr className="border-b border-line-soft bg-sand/40">
          <td colSpan={7} className="px-5 py-4 sm:px-6">
            <EditContact row={row} countries={countries} tags={tags} onDone={onEdit} />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function EditContact({ row, countries, tags, onDone }: { row: ContactRow; countries: Country[]; tags: string[]; onDone: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({ email: row.email, name: row.name, company: row.company ?? "", lang: row.lang, country: row.country ?? "", tags: row.tags.join(", ") });
  const [source, setSource] = useState<MailContactSource | "">(row.source);
  const [note, setNote] = useState(row.sourceNote ?? "");
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const put = (patch: Partial<typeof f>) => setF({ ...f, ...patch });
  const id = `e-${row.id.slice(0, 8)}`;
  return (
    <form
      className="flex flex-col gap-3"
      data-testid="edit-contact-form"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateMailContactAction(row.id, { ...f, source, sourceNote: note });
          if (r.ok) {
            onDone();
            router.refresh();
          } else {
            setErrors(r.errors ?? {});
            setError(r.error);
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Email" htmlFor={`${id}-email`}>
          <input id={`${id}-email`} type="email" required value={f.email} onChange={(e) => put({ email: e.target.value })} dir="ltr" className={inputClass} />
          <FieldError text={errors.email} />
        </Field>
        <Field label="Name" htmlFor={`${id}-name`}>
          <input id={`${id}-name`} value={f.name} onChange={(e) => put({ name: e.target.value })} dir="auto" maxLength={120} className={inputClass} />
          <FieldError text={errors.name} />
        </Field>
        <Field label="Company" htmlFor={`${id}-company`}>
          <input id={`${id}-company`} value={f.company} onChange={(e) => put({ company: e.target.value })} dir="auto" maxLength={160} className={inputClass} />
        </Field>
        <Field label="Language of their emails" htmlFor={`${id}-lang`}>
          <LangSelect id={`${id}-lang`} value={f.lang} onChange={(lang) => put({ lang })} />
        </Field>
        <Field label="Country" htmlFor={`${id}-country`}>
          <CountrySelect id={`${id}-country`} value={f.country} onChange={(country) => put({ country })} countries={countries} empty="Not known" />
        </Field>
        <Field label="Tags" htmlFor={`${id}-tags`}>
          <TagsInput id={`${id}-tags`} value={f.tags} onChange={(v) => put({ tags: v })} tags={tags} />
        </Field>
      </div>
      <SourceFields source={source} note={note} onSource={setSource} onNote={setNote} errors={errors} idPrefix={id} />
      {error ? (
        <Notice tone="danger" icon="error" role="alert">
          {error}
        </Notice>
      ) : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={`${btn.primary} h-10 cursor-pointer`}>
          Save
        </button>
        <button type="button" onClick={onDone} className={`${btn.ghost} h-10 cursor-pointer`}>
          Cancel
        </button>
      </div>
    </form>
  );
}
