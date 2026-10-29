import { parseAnyPhone } from "../hosted/phone";
import type { Teacher } from "../data/types";
import { BIO_MAX_LENGTH, readSubjects, sharePercent } from "./service";

/** 105.3 Checks of the Teachers pages' forms, kept apart from the actions so they can be tested. */

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

const str = (form: Record<string, string>, key: string) => (form[key] ?? "").trim();

/** A share from 0 to 100% in basis points; null when it isn't one. */
export function teacherShareBp(text: string): number | null {
  const cleaned = text.replaceAll(",", ".").replaceAll("%", "").trim();
  if (!cleaned) return null;
  const percent = Number(cleaned);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) return null;
  return Math.round(percent * 100);
}

export interface TeacherForm {
  name: string;
  phone: string | null;
  email: string | null;
  bio: string;
  subjects: string[];
  shareBp: number;
  featured: boolean;
}

export function parseTeacherForm(form: Record<string, string>, defaultCountryCode: string, emailOnly: boolean): Parsed<TeacherForm> {
  const errors: Record<string, string> = {};
  const name = str(form, "name").replace(/\s+/g, " ");
  if (!name) errors.name = "Enter the teacher's name.";
  else if (name.length > 80) errors.name = "Keep the name under 80 characters.";
  const phoneText = str(form, "phone");
  const phone = phoneText ? parseAnyPhone(phoneText, defaultCountryCode) : null;
  if (phoneText && !phone) errors.phone = "Enter a valid mobile number.";
  const email = str(form, "email").toLowerCase();
  if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 191)) errors.email = "Enter a valid email address, or leave it empty.";
  if (!phoneText && !email) errors[emailOnly ? "email" : "phone"] = emailOnly ? "Enter the email the teacher signs in with." : "Enter the mobile number the teacher signs in with.";
  const bio = str(form, "bio");
  if (bio.length > BIO_MAX_LENGTH) errors.bio = `Keep the bio under ${BIO_MAX_LENGTH} characters.`;
  const subjects = readSubjects(str(form, "subjects"), false);
  if (!subjects.ok) errors.subjects = subjects.error;
  const shareBp = teacherShareBp(str(form, "share"));
  if (shareBp === null) errors.share = "Enter the teacher's share of their courses' sales, from 0 to 100%.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, phone: phone?.e164 ?? null, email: email || null, bio, subjects: subjects.ok ? subjects.subjects : [], shareBp: shareBp!, featured: form.featured === "on" },
  };
}

export function teacherFormValues(teacher: Teacher | null): Record<string, string> {
  return {
    name: teacher?.name ?? "",
    phone: teacher?.phone ?? "",
    email: teacher?.email ?? "",
    bio: teacher?.bio ?? "",
    subjects: teacher?.subjects.join(", ") ?? "",
    share: teacher && teacher.status !== "applied" ? String(sharePercent(teacher.shareBp)) : "",
    featured: teacher?.featured ? "on" : "",
  };
}
