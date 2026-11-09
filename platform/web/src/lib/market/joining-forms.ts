import type { ApplicationField, ApplicationFieldKind, MarketApplicationForm, OpeningPeriod, VendorKind } from "../data/types";
import { APPLICATION_FIELD_KINDS } from "../data/types";
import type { Parsed } from "./delivery-forms";
import { checkFormFields, FORM_MAX_FIELDS, VENDOR_KINDS } from "./joining";

/**
 * 115.12 Studio › Joining: the owner builds the form question by question
 * (lib/market/joining.ts checks it), and the public page's inputs become the
 * answers lib/market/joining.ts `checkApplication` reads. Files are uploaded
 * by the page's action and given here by their asset ids.
 */

export const FILE_KINDS: readonly ApplicationFieldKind[] = ["file", "logo", "documents"];
const DAYS: OpeningPeriod["day"][] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const on = (v: string | undefined) => v === "on" || v === "true" || v === "1";

/** The form's title, words, kinds of business and whether it takes applications. */
export function parseJoinFormMeta(form: Record<string, string>): Parsed<Pick<MarketApplicationForm, "title" | "intro" | "kinds" | "open">> {
  const title = (form.title ?? "").trim().slice(0, 120);
  if (!title) return { ok: false, field: "title", error: "Give the form a title." };
  const intro = (form.intro ?? "").trim().slice(0, 2000) || null;
  const kinds = VENDOR_KINDS.filter((k) => on(form[`kind_${k}`]));
  return { ok: true, value: { title, intro, kinds: kinds.length ? kinds : [...VENDOR_KINDS], open: on(form.open) } };
}

/** One question from the builder's row. */
export function parseQuestion(form: Record<string, string>): ApplicationField {
  const kind = (APPLICATION_FIELD_KINDS as readonly string[]).includes(form.kind ?? "") ? (form.kind as ApplicationFieldKind) : "text";
  return {
    key: (form.key ?? "").trim(),
    kind,
    label: (form.label ?? "").trim(),
    help: (form.help ?? "").trim() || null,
    required: on(form.required),
    options: kind === "list" ? (form.options ?? "").split("\n").map((o) => o.trim()).filter(Boolean) : [],
  };
}

export type FieldsResult = { ok: true; fields: ApplicationField[] } | { ok: false; error: string };

function checked(fields: ApplicationField[]): FieldsResult {
  const c = checkFormFields(fields);
  return c.ok ? { ok: true, fields: c.fields } : { ok: false, error: c.error };
}

export function addQuestion(fields: ApplicationField[], question: ApplicationField): FieldsResult {
  if (fields.length >= FORM_MAX_FIELDS) return { ok: false, error: `A form can have up to ${FORM_MAX_FIELDS} questions.` };
  return checked([...fields, question]);
}

export function replaceQuestion(fields: ApplicationField[], index: number, question: ApplicationField): FieldsResult {
  if (index < 0 || index >= fields.length) return { ok: false, error: "This question isn't in the form anymore." };
  // Answers are kept by key: an edited question keeps its key.
  return checked(fields.map((f, i) => (i === index ? { ...question, key: f.key } : f)));
}

export function removeQuestion(fields: ApplicationField[], index: number): ApplicationField[] {
  return fields.filter((_, i) => i !== index);
}

export function moveQuestion(fields: ApplicationField[], index: number, by: -1 | 1): ApplicationField[] {
  const to = index + by;
  if (index < 0 || index >= fields.length || to < 0 || to >= fields.length) return fields;
  const out = [...fields];
  [out[index], out[to]] = [out[to]!, out[index]!];
  return out;
}

/**
 * The public page's inputs as answers. A place is `<key>.address`,
 * `<key>.lat` and `<key>.lng`; hours are `<key>.<day>.opens` and
 * `<key>.<day>.closes`; a yes or no is a checkbox; files are given by the
 * action as asset ids by key.
 */
export function answersFromForm(fields: ApplicationField[], form: Record<string, string>, files: Record<string, string[]>): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const f of fields) {
    switch (f.kind) {
      case "yes_no":
        if (form[f.key] !== undefined) answers[f.key] = on(form[f.key]);
        break;
      case "place": {
        const address = (form[`${f.key}.address`] ?? "").trim();
        if (address) answers[f.key] = { address, details: null, lat: Number(form[`${f.key}.lat`]), lng: Number(form[`${f.key}.lng`]) };
        break;
      }
      case "hours": {
        const periods = DAYS.flatMap((day) => {
          const opens = (form[`${f.key}.${day}.opens`] ?? "").trim();
          const closes = (form[`${f.key}.${day}.closes`] ?? "").trim();
          return opens && closes ? [{ day, opens, closes }] : [];
        });
        if (periods.length) answers[f.key] = periods;
        break;
      }
      case "file":
      case "logo":
      case "documents": {
        const ids = files[f.key] ?? [];
        if (ids.length) answers[f.key] = f.kind === "documents" ? ids : ids[0];
        break;
      }
      default: {
        const value = (form[f.key] ?? "").trim();
        if (value) answers[f.key] = value;
      }
    }
  }
  return answers;
}

/** The kind the vendor chose, or the form's only one. */
export function chosenKind(form: Pick<MarketApplicationForm, "kinds">, value: string | undefined): VendorKind | string {
  return form.kinds.length === 1 ? form.kinds[0]! : (value ?? "");
}

export const JOIN_DAYS = DAYS;
