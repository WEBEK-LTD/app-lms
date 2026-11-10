"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  mailCampaignProblemsAction,
  saveMailCampaignAction,
  saveMailTemplateAction,
  scheduleMailCampaignAction,
  sendMailCampaignAction,
  sendMailTestAction,
  unscheduleMailCampaignAction,
  deleteMailCampaignAction,
} from "@/app/actions/admin-mail";
import { Icon } from "@/components/icon";
import { Notice, btn } from "@/components/ui";
import { emptyContent } from "@/lib/mailing/blocks";
import type { CampaignProblem } from "@/lib/mailing/campaigns";
import { accountOnlyTagsWithoutDefault } from "@/lib/mailing/merge";
import { MAIL_LANGS, type MailAudience, type MailContent, type MailContents, type MailLang, type MailSegment } from "@/lib/mailing/types";
import { AudienceStep, type AudienceOptions } from "./audience";
import { Builder, EmailPreview, HtmlEditor, previewHtml } from "./builder";
import { Field, inputClass, MergeTagHelp, RangeField, TextField, Toggle } from "./fields";

/**
 * 114 A campaign from draft to sent: Audience, Details, Design, Review.
 * Saved by itself a moment after each change; Undo and Redo go back through
 * the design's changes.
 */

export interface EditorCampaign {
  id: string;
  name: string;
  status: "draft" | "scheduled";
  audience: MailAudience;
  segmentId: string | null;
  fromName: string | null;
  replyTo: string | null;
  contents: MailContents;
  defaultLang: MailLang;
  track: boolean;
  perMinute: number;
  scheduledAt: string | null;
  timeZone: string | null;
}

const STEPS = [
  { id: "audience", label: "Audience", icon: "groups" },
  { id: "details", label: "Details", icon: "tune" },
  { id: "design", label: "Design", icon: "palette" },
  { id: "review", label: "Review & send", icon: "send" },
] as const;
type Step = (typeof STEPS)[number]["id"];

const LANG_NAMES: Record<MailLang, string> = { en: "English", ar: "العربية · Arabic", tr: "Türkçe · Turkish" };

export function CampaignEditor({
  initial,
  segments,
  options,
  assetBase,
  canSend,
  canEdit,
  step: initialStep,
}: {
  initial: EditorCampaign;
  segments: MailSegment[];
  options: AudienceOptions;
  assetBase: string;
  canSend: boolean;
  canEdit: boolean;
  step: Step;
}) {
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [step, setStep] = useState<Step>(initialStep);
  const [lang, setLang] = useState<MailLang>(initial.contents[initial.defaultLang] ? initial.defaultLang : (MAIL_LANGS.find((l) => initial.contents[l]) ?? "en"));
  const [saved, setSaved] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [error, setError] = useState<string | null>(null);
  const [, startSave] = useTransition();
  const [history, setHistory] = useState<{ past: MailContents[]; future: MailContents[] }>({ past: [], future: [] });
  const lastEdit = useRef(0);
  const latest = useRef(c);
  useEffect(() => {
    latest.current = c;
  }, [c]);

  const save = useCallback(async () => {
    if (!canEdit) return true;
    setSaved("saving");
    const now = latest.current;
    const result = await saveMailCampaignAction({ ...now, contents: now.contents });
    if (result.ok) {
      setSaved(latest.current === now ? "saved" : "dirty");
      setError(null);
      return true;
    }
    setSaved("error");
    setError(result.error);
    return false;
  }, [canEdit]);

  // Saved by itself 1.2 seconds after the last change.
  useEffect(() => {
    if (saved !== "dirty") return;
    const timer = setTimeout(() => startSave(async () => void (await save())), 1200);
    return () => clearTimeout(timer);
  }, [saved, c, save]);

  const update = (patch: Partial<EditorCampaign>) => {
    setC((prev) => ({ ...prev, ...patch }));
    setSaved("dirty");
  };

  const setContent = (content: MailContent) => {
    const now = Date.now();
    // Typing in one go is one step of Undo.
    const step = now - lastEdit.current > 700;
    lastEdit.current = now;
    const before = c.contents;
    setHistory((h) => ({ past: step ? [...h.past, before].slice(-80) : h.past, future: [] }));
    update({ contents: { ...c.contents, [lang]: content } });
  };
  const undo = () => {
    const prev = history.past.at(-1);
    if (!prev) return;
    setHistory({ past: history.past.slice(0, -1), future: [...history.future, c.contents] });
    lastEdit.current = 0;
    update({ contents: prev });
  };
  const redo = () => {
    const next = history.future.at(-1);
    if (!next) return;
    setHistory({ past: [...history.past, c.contents], future: history.future.slice(0, -1) });
    lastEdit.current = 0;
    update({ contents: next });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (step !== "design") return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable=true]")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const go = async (next: Step) => {
    if (saved === "dirty" || saved === "error") await save();
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const url = new URL(window.location.href);
    url.searchParams.set("step", next);
    window.history.replaceState(null, "", url);
  };

  const langs = MAIL_LANGS.filter((l) => c.contents[l]);
  const content = c.contents[lang] ?? null;
  const addLang = (l: MailLang) => {
    const from = c.contents[c.defaultLang];
    const start: MailContent = from ? { ...structuredClone(from), dir: l === "ar" ? "rtl" : "ltr" } : emptyContent(l);
    update({ contents: { ...c.contents, [l]: start } });
    setLang(l);
  };
  const removeLang = (l: MailLang) => {
    if (l === c.defaultLang || !window.confirm(`Remove the ${LANG_NAMES[l]} version? People with that language get the main one.`)) return;
    const next = { ...c.contents };
    delete next[l];
    update({ contents: next });
    setLang(c.defaultLang);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Link href="/admin/email-campaigns" className="flex w-fit items-center gap-1 text-sm font-semibold text-muted no-underline hover:text-midnight">
            <Icon name="arrow_back" size={18} />
            Email campaigns
          </Link>
          <input
            aria-label="Campaign name"
            value={c.name}
            onChange={(e) => update({ name: e.target.value })}
            readOnly={!canEdit}
            data-testid="campaign-name"
            className="m-0 w-full min-w-0 rounded-lg border border-transparent bg-transparent px-1 text-[26px] leading-tight font-extrabold tracking-[-0.5px] text-midnight outline-0 hover:border-line focus:border-midnight sm:text-[30px]"
          />
        </div>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted" role="status" data-testid="save-state">
          <Icon name={saved === "saved" ? "cloud_done" : saved === "error" ? "cloud_off" : "cloud_sync"} size={18} className={saved === "error" ? "text-danger" : ""} />
          {saved === "saved" ? "Saved" : saved === "saving" ? "Saving…" : saved === "error" ? "Not saved" : "Changes not saved yet"}
        </span>
      </div>
      <nav aria-label="Steps" className="grid grid-cols-2 gap-2 rounded-[20px] border border-line bg-white p-2 sm:grid-cols-4">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s.id)}
            aria-current={step === s.id ? "step" : undefined}
            data-step={s.id}
            className={`flex cursor-pointer items-center gap-3 rounded-[14px] px-3 py-2.5 text-start ${step === s.id ? "bg-midnight text-ivory" : "text-ink-3 hover:bg-sand hover:text-midnight"}`}
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${step === s.id ? "bg-ember text-[#0E0D24]" : "bg-sand text-ink-3"}`}>{i + 1}</span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[14px] font-bold">{s.label}</span>
            </span>
          </button>
        ))}
      </nav>
      {error ? (
        <Notice tone="danger" icon="error" role="alert">
          {error}
        </Notice>
      ) : null}

      {step === "audience" ? (
        <AudienceStep audience={c.audience} onChange={(audience) => update({ audience })} segments={segments} segmentId={c.segmentId} setSegmentId={(segmentId) => update({ segmentId })} options={options} editable={canEdit} />
      ) : null}

      {step === "details" ? <Details c={c} update={update} langs={langs} addLang={addLang} /> : null}

      {step === "design" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Language">
            {langs.map((l) => (
              <span key={l} className={`inline-flex h-10 items-center rounded-full border ${l === lang ? "border-midnight bg-midnight text-ivory" : "border-line bg-white text-midnight"}`}>
                <button type="button" role="tab" aria-selected={l === lang} onClick={() => setLang(l)} className="h-full cursor-pointer rounded-full border-0 bg-transparent ps-4 pe-3 text-[13px] font-bold text-inherit" data-lang={l}>
                  {LANG_NAMES[l]}
                  {l === c.defaultLang ? <span className="ms-1.5 font-normal opacity-70">· main</span> : null}
                </button>
                {l !== c.defaultLang ? (
                  <button type="button" onClick={() => removeLang(l)} aria-label={`Remove ${LANG_NAMES[l]}`} className="me-2 cursor-pointer border-0 bg-transparent p-0 text-inherit opacity-60 hover:opacity-100">
                    <Icon name="close" size={16} />
                  </button>
                ) : null}
              </span>
            ))}
            {MAIL_LANGS.filter((l) => !c.contents[l]).map((l) => (
              <button key={l} type="button" onClick={() => addLang(l)} className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-full border border-dashed border-line-strong bg-white px-4 text-[13px] font-semibold text-ink-3 hover:border-midnight hover:text-midnight" data-add-lang={l}>
                <Icon name="add" size={17} />
                {LANG_NAMES[l]}
              </button>
            ))}
            <span className="ms-auto text-[12.5px] text-muted">Each person gets their account&apos;s language, else the main one.</span>
          </div>
          {content && content.mode === "html" ? (
            <HtmlEditor
              content={content}
              onChange={setContent}
              lang={lang}
              assetBase={assetBase}
              onBackToBlocks={
                content.doc
                  ? () => {
                      if (window.confirm("Back to the blocks? Your changes to the HTML are lost.")) setContent({ ...content, mode: "blocks" });
                    }
                  : null
              }
            />
          ) : content ? (
            <Builder
              content={content}
              onChange={setContent}
              lang={lang}
              assetBase={assetBase}
              undo={undo}
              redo={redo}
              canUndo={history.past.length > 0}
              canRedo={history.future.length > 0}
              onSaveTemplate={() => {
                const name = window.prompt("Name the template", c.name);
                if (!name?.trim()) return;
                startSave(async () => {
                  const result = await saveMailTemplateAction({ name, contents: c.contents });
                  window.alert(result.ok ? "Saved in Templates. It's there for your next campaigns." : result.error);
                });
              }}
            />
          ) : null}
        </div>
      ) : null}

      {step === "review" ? <Review c={c} assetBase={assetBase} canSend={canSend} canEdit={canEdit} save={save} onDone={() => router.push(`/admin/email-campaigns/${c.id}/report`)} onUnscheduled={() => update({ status: "draft", scheduledAt: null })} onDeleted={() => router.push("/admin/email-campaigns")} /> : null}

      <div className="flex flex-wrap justify-between gap-3">
        {step !== "audience" ? (
          <button type="button" onClick={() => go(STEPS[STEPS.findIndex((s) => s.id === step) - 1]!.id)} className={`${btn.secondary} h-11 cursor-pointer`}>
            <Icon name="arrow_back" size={18} />
            Back
          </button>
        ) : (
          <span />
        )}
        {step !== "review" ? (
          <button type="button" onClick={() => go(STEPS[STEPS.findIndex((s) => s.id === step) + 1]!.id)} className={`${btn.primary} h-11 cursor-pointer`} data-testid="next-step">
            Next: {STEPS[STEPS.findIndex((s) => s.id === step) + 1]!.label}
            <Icon name="arrow_forward" size={18} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Details({ c, update, langs, addLang }: { c: EditorCampaign; update: (p: Partial<EditorCampaign>) => void; langs: MailLang[]; addLang: (l: MailLang) => void }) {
  const setContent = (l: MailLang, patch: Partial<MailContent>) => update({ contents: { ...c.contents, [l]: { ...c.contents[l]!, ...patch } } });
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6 rounded-[20px] border border-line bg-white p-5 sm:p-7">
        <h2 className="m-0 text-[20px] font-extrabold text-midnight">What the inbox shows</h2>
        {langs.map((l) => (
          <div key={l} className="flex flex-col gap-3 rounded-[16px] border border-line-soft p-4" data-details-lang={l}>
            <span className="text-[13px] font-extrabold text-ink-3">{LANG_NAMES[l]}</span>
            <TextField label="Subject" value={c.contents[l]!.subject} dir={c.contents[l]!.dir} onChange={(subject) => setContent(l, { subject })} tags testId={`subject-${l}`} hint="Short and specific; 30 to 50 characters reads best on phones." />
            <TextField label="Preview line" value={c.contents[l]!.preview} dir={c.contents[l]!.dir} onChange={(preview) => setContent(l, { preview })} hint="The words inboxes show after the subject." />
          </div>
        ))}
        {MAIL_LANGS.filter((l) => !c.contents[l]).length ? (
          <div className="flex flex-wrap gap-2">
            {MAIL_LANGS.filter((l) => !c.contents[l]).map((l) => (
              <button key={l} type="button" onClick={() => addLang(l)} className="inline-flex h-10 cursor-pointer items-center gap-1 rounded-full border border-dashed border-line-strong bg-white px-4 text-[13px] font-semibold text-ink-3 hover:border-midnight hover:text-midnight">
                <Icon name="add" size={17} />
                Add a {LANG_NAMES[l]} version
              </button>
            ))}
          </div>
        ) : null}
        <MergeTagHelp />
        <Field label="Main language" hint="Sent to people whose language has no version." htmlFor="f-main-lang">
          <select id="f-main-lang" value={c.defaultLang} onChange={(e) => update({ defaultLang: e.target.value as MailLang })} className={`${inputClass} max-w-[320px] cursor-pointer`}>
            {langs.map((l) => (
              <option key={l} value={l}>
                {LANG_NAMES[l]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex flex-col gap-5 rounded-[20px] border border-line bg-white p-5 sm:p-7">
        <h2 className="m-0 text-[20px] font-extrabold text-midnight">Sender and sending</h2>
        <TextField label="From name" value={c.fromName ?? ""} onChange={(fromName) => update({ fromName })} placeholder="Yallapp" hint="From Yallapp's own address, with this name." />
        <TextField label="Replies go to" value={c.replyTo ?? ""} dir="ltr" onChange={(replyTo) => update({ replyTo })} placeholder="Yallapp's address" />
        <RangeField label="At most, emails a minute" value={c.perMinute} min={5} max={600} step={5} unit="" onChange={(perMinute) => update({ perMinute })} />
        <Toggle label="Count opens and clicks" checked={c.track} onChange={(track) => update({ track })} hint="A tiny picture counts opens, and links pass through Yallapp to count clicks. Some inboxes open pictures by themselves, so opens are a rough guide." />
      </div>
    </div>
  );
}

function zones(): string[] {
  const own = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const common = ["Africa/Cairo", "Europe/Istanbul", "Asia/Riyadh", "Asia/Dubai", "Europe/London", "UTC"];
  return [...new Set([own, ...common])];
}

/** The local time in a zone as an ISO instant (the schedule's "15:00 in Cairo"). */
function zonedToIso(local: string, zone: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null;
  const asUtc = new Date(`${local}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(asUtc);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const shown = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(asUtc.getTime() - (shown - asUtc.getTime())).toISOString();
}

function Review({ c, assetBase, canSend, canEdit, save, onDone, onUnscheduled, onDeleted }: { c: EditorCampaign; assetBase: string; canSend: boolean; canEdit: boolean; save: () => Promise<boolean>; onDone: () => void; onUnscheduled: () => void; onDeleted: () => void }) {
  const [problems, setProblems] = useState<CampaignProblem[] | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testLang, setTestLang] = useState<MailLang>(c.defaultLang);
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [dark, setDark] = useState(false);
  const [when, setWhen] = useState<"now" | "later">(c.status === "scheduled" ? "later" : "now");
  const [local, setLocal] = useState("");
  const [zone, setZone] = useState(c.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const langs = MAIL_LANGS.filter((l) => c.contents[l]);
  const [previewLang, setPreviewLang] = useState<MailLang>(c.defaultLang);

  useEffect(() => {
    start(async () => {
      await save();
      setProblems(await mailCampaignProblemsAction(c.id));
      const { countMailAudienceAction } = await import("@/app/actions/admin-mail");
      setCount((await countMailAudienceAction(c.audience)).count);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Checked when the step opens.
  }, []);

  const html = useMemo(() => (c.contents[previewLang] ? previewHtml(c.contents[previewLang]!, previewLang, assetBase, dark) : ""), [c, previewLang, assetBase, dark]);
  const minutes = count ? Math.ceil(count / c.perMinute) : 0;
  const contactTags = useMemo(() => (c.audience.people === "contacts" || c.audience.people === "both" ? accountOnlyTagsWithoutDefault(JSON.stringify(c.contents)) : []), [c.audience.people, c.contents]);
  const blocked = !problems || problems.length > 0;

  const run = (fn: () => Promise<{ ok: true } | { ok: false; error: string; problems?: CampaignProblem[] }>, success: string, after?: () => void) =>
    start(async () => {
      setMessage(null);
      const result = await fn();
      if (result.ok) {
        setMessage({ tone: "success", text: success });
        after?.();
      } else {
        setMessage({ tone: "danger", text: result.error });
        if (result.problems) setProblems(result.problems);
      }
    });

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex min-w-0 flex-col gap-3 rounded-[20px] border border-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          {langs.length > 1
            ? langs.map((l) => (
                <button key={l} type="button" onClick={() => setPreviewLang(l)} aria-pressed={l === previewLang} className={`h-9 cursor-pointer rounded-full border px-3.5 text-[13px] font-semibold ${l === previewLang ? "border-midnight bg-midnight text-ivory" : "border-line bg-white text-midnight"}`}>
                  {LANG_NAMES[l]}
                </button>
              ))
            : null}
          <span className="ms-auto flex gap-1 rounded-[12px] bg-sand p-1">
            {(["desktop", "phone"] as const).map((d) => (
              <button key={d} type="button" aria-pressed={device === d} onClick={() => setDevice(d)} className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold ${device === d ? "bg-midnight text-ivory" : "text-ink-3"}`}>
                <Icon name={d === "desktop" ? "devices" : "smartphone"} size={18} />
                {d === "desktop" ? "Desktop" : "Phone"}
              </button>
            ))}
            <button type="button" aria-pressed={dark} onClick={() => setDark(!dark)} className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] px-3 text-[13px] font-semibold ${dark ? "bg-midnight text-ivory" : "text-ink-3"}`}>
              <Icon name={dark ? "dark_mode" : "light_mode"} size={18} />
              {dark ? "Dark" : "Light"}
            </button>
          </span>
        </div>
        <div className="rounded-[16px] bg-ivory p-3 sm:p-5">
          <div className="mx-auto mb-3 flex max-w-[640px] flex-col gap-0.5 rounded-[14px] border border-line bg-white px-4 py-3">
            <span className="text-[13px] text-muted">
              <b className="text-midnight">{c.fromName || "Yallapp"}</b> · Inbox
            </span>
            <span className="text-[15px] font-bold text-midnight" dir={c.contents[previewLang]?.dir}>
              {c.contents[previewLang]?.subject || "No subject yet"}
            </span>
            <span className="truncate text-[13px] text-muted" dir={c.contents[previewLang]?.dir}>
              {c.contents[previewLang]?.preview}
            </span>
          </div>
          {html ? <EmailPreview html={html} device={device} /> : null}
        </div>
      </div>
      <div className="flex flex-col gap-4 xl:sticky xl:top-20">
        {message ? (
          <Notice tone={message.tone} icon={message.tone === "success" ? "check_circle" : "error"} role={message.tone === "success" ? "status" : "alert"}>
            {message.text}
          </Notice>
        ) : null}
        <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-5" aria-labelledby="h-check">
          <h2 id="h-check" className="m-0 text-[17px] font-extrabold text-midnight">
            Before it goes
          </h2>
          {!problems ? (
            <p className="m-0 flex items-center gap-2 text-[14px] text-muted">
              <Icon name="progress_activity" size={18} className="animate-spin" /> Checking…
            </p>
          ) : problems.length ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="problems">
              {problems.map((p, i) => (
                <li key={i} className="flex gap-2 text-[14px] text-ink-2">
                  <Icon name="warning" size={19} className="shrink-0 text-warn" />
                  <span>
                    {p.lang ? <b>{LANG_NAMES[p.lang]}: </b> : null}
                    {p.message}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="m-0 flex items-center gap-2 text-[14px] font-semibold text-success" data-testid="ready">
              <Icon name="check_circle" size={19} /> Ready to send
            </p>
          )}
          {contactTags.length ? (
            <p className="m-0 flex gap-2 text-[13px] text-ink-2" data-testid="contact-tags-note">
              <Icon name="info" size={18} className="shrink-0 text-accent" />
              <span>
                Contacts have no account, so {contactTags.map((t) => `{{${t}}}`).join(", ")} {contactTags.length === 1 ? "is" : "are"} empty for them. Give {contactTags.length === 1 ? "it" : "them"} a default, like {`{{${contactTags[0]}|…}}`}.
              </span>
            </p>
          ) : null}
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[14px]">
            <dt className="text-muted">People</dt>
            <dd className="m-0 font-semibold text-midnight tabular-nums">{count === null ? "…" : count.toLocaleString("en")}</dd>
            <dt className="text-muted">Languages</dt>
            <dd className="m-0 font-semibold text-midnight">{langs.map((l) => l.toUpperCase()).join(" · ")}</dd>
            <dt className="text-muted">Rate</dt>
            <dd className="m-0 font-semibold text-midnight">
              {c.perMinute} a minute{count ? ` · about ${minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 6) / 10} h`}` : ""}
            </dd>
            <dt className="text-muted">Tracking</dt>
            <dd className="m-0 font-semibold text-midnight">{c.track ? "Opens and clicks" : "Off"}</dd>
          </dl>
        </section>
        {canEdit ? (
          <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-5" aria-labelledby="h-test">
            <h2 id="h-test" className="m-0 text-[17px] font-extrabold text-midnight">
              Send a test
            </h2>
            <p className="m-0 text-[13px] text-muted">Up to 5 addresses. Marked [Test], filled in with an example person, and not counted.</p>
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com, team@example.com" className={inputClass} dir="ltr" aria-label="Test addresses" data-testid="test-to" />
            <div className="flex gap-2">
              <select value={testLang} onChange={(e) => setTestLang(e.target.value as MailLang)} className={`${inputClass} cursor-pointer`} aria-label="Test language">
                {langs.map((l) => (
                  <option key={l} value={l}>
                    {LANG_NAMES[l]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={pending || !testTo.trim()}
                onClick={() =>
                  run(async () => {
                    await save();
                    const r = await sendMailTestAction(c.id, testLang, testTo.split(/[\s,;]+/));
                    return r.ok ? { ok: true as const } : r;
                  }, "Test sent. Check the inbox (and its spam folder).")
                }
                className={`${btn.secondary} h-10 shrink-0 cursor-pointer`}
                data-testid="send-test"
              >
                <Icon name="send" size={18} />
                Send test
              </button>
            </div>
          </section>
        ) : null}
        {canSend ? (
          <section className="flex flex-col gap-3 rounded-[20px] border border-line bg-white p-5" aria-labelledby="h-send">
            <h2 id="h-send" className="m-0 text-[17px] font-extrabold text-midnight">
              Send it
            </h2>
            {c.status === "scheduled" && c.scheduledAt ? (
              <Notice tone="info" icon="schedule">
                Scheduled for {new Date(c.scheduledAt).toLocaleString("en-GB", { timeZone: c.timeZone ?? undefined, dateStyle: "full", timeStyle: "short" })}
                {c.timeZone ? ` (${c.timeZone})` : ""}.{" "}
                <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-bold text-accent underline" onClick={() => run(() => unscheduleMailCampaignAction(c.id), "Taken off the schedule: it's a draft again.", onUnscheduled)}>
                  Take it off the schedule
                </button>
              </Notice>
            ) : null}
            <div role="radiogroup" className="grid grid-cols-2 gap-2">
              {(["now", "later"] as const).map((w) => (
                <button key={w} type="button" role="radio" aria-checked={when === w} onClick={() => setWhen(w)} className={`flex cursor-pointer items-center gap-2 rounded-[14px] border px-3 py-3 text-[14px] font-bold ${when === w ? "border-midnight bg-sand text-midnight" : "border-line bg-white text-ink-3"}`}>
                  <Icon name={w === "now" ? "send" : "schedule"} size={19} />
                  {w === "now" ? "Now" : "Later"}
                </button>
              ))}
            </div>
            {when === "later" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Date and time" htmlFor="f-schedule-at">
                  <input id="f-schedule-at" type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className={inputClass} data-testid="schedule-at" />
                </Field>
                <Field label="Time zone" htmlFor="f-zone">
                  <select id="f-zone" value={zone} onChange={(e) => setZone(e.target.value)} className={`${inputClass} cursor-pointer`}>
                    {zones().map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : null}
            <button
              type="button"
              disabled={pending || blocked}
              data-testid={when === "now" ? "send-now" : "schedule"}
              onClick={() => {
                if (when === "now") {
                  if (!window.confirm(`Send “${c.name}” to ${count?.toLocaleString("en") ?? "the"} people now? It can be paused or cancelled while it goes, but emails already sent can't be taken back.`)) return;
                  run(() => sendMailCampaignAction(c.id), "Sending. The report shows it as it goes.", onDone);
                } else {
                  const iso = zonedToIso(local, zone);
                  if (!iso) return setMessage({ tone: "danger", text: "Pick the date and time." });
                  run(() => scheduleMailCampaignAction(c.id, iso, zone), "Scheduled. It goes by itself at that time.", () => window.location.reload());
                }
              }}
              className={`${btn.main} h-12 cursor-pointer`}
            >
              <Icon name={when === "now" ? "send" : "schedule"} size={20} />
              {when === "now" ? "Send now" : "Schedule"}
            </button>
          </section>
        ) : (
          <Notice tone="neutral" icon="lock">
            Sending a campaign is for the team&apos;s owners and admins.
          </Notice>
        )}
        {canEdit && c.status === "draft" ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Delete this draft?")) run(() => deleteMailCampaignAction(c.id), "Deleted.", onDeleted);
            }}
            className={`${btn.ghost} h-10 cursor-pointer text-danger`}
          >
            <Icon name="delete" size={18} />
            Delete the draft
          </button>
        ) : null}
      </div>
    </div>
  );
}
