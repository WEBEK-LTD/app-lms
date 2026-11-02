import { createHmac, timingSafeEqual } from "node:crypto";
import PDFDocument from "pdfkit";
import type { DataStore } from "../data/store";
import type { App } from "../data/types";
import { Layout, receiptFonts, type ReceiptFonts } from "../receipts/pdf";
import { certificateDate, type CertificateLang } from "../courses/certificates";
import { academicRecord, uniData, type AcademicRecord, type UniData } from "./records";
import { gpaOf, gradeOf } from "./rules";

/**
 * 113.9 A student's transcript as a PDF (A4), made on the server with
 * PDFKit and the receipts' layout (Arabic laid out right to left): the
 * university, the student and their program, each term's courses with the
 * credits, the letter and its points, the term's GPA, then the cumulative
 * GPA and the credits earned. Its address carries a signed code that ends
 * after an hour: the app asks for a new one each time it opens it.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** How long a transcript's address works. */
export const TRANSCRIPT_LINK_SECONDS = 3600;

function mac(secret: string, appId: string, studentId: number, expires: number): string {
  return createHmac("sha256", secret).update(`transcript:${appId}:${studentId}:${expires}`).digest("base64url").slice(0, 22);
}

/** The transcript's code: whose and until when, signed. */
export function transcriptCode(secret: string, appId: string, studentId: number, now: Date): string {
  const expires = Math.floor(now.getTime() / 1000) + TRANSCRIPT_LINK_SECONDS;
  return `${studentId}-${expires}-${mac(secret, appId, studentId, expires)}`;
}

/** The student of a transcript code of this app, while it works. */
export function readTranscriptCode(secret: string, appId: string, code: string, now: Date): number | null {
  const match = /^(\d{1,15})-(\d{10})-([\w-]{22})$/.exec(code);
  if (!match) return null;
  const studentId = Number(match[1]);
  const expires = Number(match[2]);
  if (expires < now.getTime() / 1000) return null;
  const expected = Buffer.from(mac(secret, appId, studentId, expires));
  const given = Buffer.from(match[3]!);
  return expected.length === given.length && timingSafeEqual(expected, given) ? studentId : null;
}

export function transcriptPdfUrl(platformUrl: string, appId: string, code: string): string {
  return `${platformUrl.replace(/\/+$/, "")}/a/${appId}/transcript/${code}/pdf`;
}

export interface FoundTranscript {
  app: App;
  data: UniData;
  record: AcademicRecord;
}

/** The app and the student's record (published grades) of a transcript code. */
export async function loadTranscript(store: DataStore, secret: string, appId: string, code: string, now: Date): Promise<FoundTranscript | null> {
  if (!UUID.test(appId)) return null;
  const studentId = readTranscriptCode(secret, appId, code, now);
  const app = studentId !== null ? await store.getAppById(appId) : null;
  const student = app && studentId !== null ? await store.getSchoolPerson(app.id, studentId) : null;
  if (!app || !student || student.role !== "student" || app.connector?.kind !== "school") return null;
  const data = await uniData(store, app.id);
  if (!data.settings.enabled) return null;
  return { app, data, record: await academicRecord(store, data, student) };
}

export const TRANSCRIPT_TEXT = {
  en: {
    heading: "Academic transcript",
    student: "Student",
    code: "Student number",
    program: "Program",
    issued: "Issued on {date}",
    course: "Course",
    credits: "Credits",
    grade: "Grade",
    points: "Points",
    termGpa: "Term GPA {gpa} · {credits} credits",
    cumulative: "Cumulative GPA",
    earned: "Credits earned",
    none: "No published results yet.",
    foot: "{school} issued this transcript. It shows the results published to the student.",
  },
  ar: {
    heading: "السجل الأكاديمي",
    student: "الطالب",
    code: "الرقم الجامعي",
    program: "البرنامج",
    issued: "صدر في {date}",
    course: "المقرر",
    credits: "الساعات",
    grade: "التقدير",
    points: "النقاط",
    termGpa: "المعدل الفصلي {gpa} · {credits} ساعة",
    cumulative: "المعدل التراكمي",
    earned: "الساعات المكتسبة",
    none: "لا توجد نتائج منشورة بعد.",
    foot: "أصدرت {school} هذا السجل، ويعرض النتائج المنشورة للطالب.",
  },
  tr: {
    heading: "Not dökümü (transkript)",
    student: "Öğrenci",
    code: "Öğrenci numarası",
    program: "Program",
    issued: "Düzenlenme tarihi: {date}",
    course: "Ders",
    credits: "Kredi",
    grade: "Not",
    points: "Puan",
    termGpa: "Dönem ortalaması {gpa} · {credits} kredi",
    cumulative: "Genel not ortalaması",
    earned: "Kazanılan kredi",
    none: "Henüz yayımlanan sonuç yok.",
    foot: "Bu belgeyi {school} düzenledi. Öğrenciye yayımlanan sonuçları gösterir.",
  },
} as const;

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
const num = (value: number | null) => (value === null ? "—" : value.toFixed(2));
const credits = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

const INK = "#0E0D24";
const MUTED = "#5E5A73";
const SOFT = "#F4EFE6";
const CONTENT = 595.28 - 100;

/** The transcript's lines, its words in `lang`. */
export interface TranscriptPdf {
  lang: CertificateLang;
  school: string;
  accent: string;
  logo: Buffer | null;
  now: Date;
  found: FoundTranscript;
}

export async function renderTranscriptPdf(input: TranscriptPdf, fontFiles?: ReceiptFonts): Promise<Buffer> {
  const files = fontFiles ?? (await receiptFonts());
  const t = TRANSCRIPT_TEXT[input.lang];
  const { record, data } = input.found;
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    font: null as unknown as string,
    lang: input.lang,
    displayTitle: true,
    info: { Title: `${t.heading} · ${record.student.name}`, Author: input.school, Creator: "Yallapp", Producer: "Yallapp" },
  });
  doc.registerFont("latin-regular", files.latin);
  doc.registerFont("latin-bold", files.latinBold);
  doc.registerFont("arabic-regular", files.arabic);
  doc.registerFont("arabic-bold", files.arabicBold);
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const accent = /^#[0-9a-fA-F]{6}$/.test(input.accent) ? input.accent : INK;
  doc.rect(0, 0, 595.28, 6).fill(accent);
  const page = new Layout(doc, input.lang);
  page.y = 50;
  if (input.logo) {
    try {
      doc.image(input.logo, input.lang === "ar" ? 595.28 - 50 - 110 : 50, page.y, { fit: [110, 44] });
      page.y += 52;
    } catch {
      // A logo PDFKit can't read is left out.
    }
  }
  page.text(input.school, { size: 18, weight: "bold" });
  page.text(t.heading, { size: 13, color: accent, weight: "bold" });
  page.text(fill(t.issued, { date: certificateDate(input.lang, input.now) }), { size: 9.5, color: MUTED });
  page.y += 12;
  page.rule();
  page.y += 10;
  const program = record.program;
  const department = program ? data.departments.get(program.departmentId) : undefined;
  const faculty = department ? data.faculties.get(department.facultyId) : undefined;
  const facts: [string, string][] = [
    [t.student, record.student.name],
    ...(record.student.code ? [[t.code, record.student.code] as [string, string]] : []),
    ...(program ? [[t.program, [`${program.degree} ${program.name}`, department?.name, faculty?.name].filter(Boolean).join(" · ")] as [string, string]] : []),
  ];
  for (const [label, value] of facts) {
    page.text(label, { width: 130, size: 9.5, color: MUTED }, true);
    page.text(value, { x: 140, width: CONTENT - 140, size: 10.5, weight: "bold" });
    page.y += 2;
  }
  page.y += 12;

  // Each term, the earliest first, as a transcript reads.
  const byTerm = new Map<number, typeof record.graded>();
  for (const g of record.graded) byTerm.set(g.termId, [...(byTerm.get(g.termId) ?? []), g]);
  const terms = [...byTerm.entries()]
    .map(([id, rows]) => ({ term: data.termById.get(id), rows }))
    .filter((x) => x.term !== undefined)
    .sort((a, b) => a.term!.startsOn.localeCompare(b.term!.startsOn));
  if (!terms.length) page.text(t.none, { size: 10.5, color: MUTED });
  const cols = { code: 0, title: 70, credits: CONTENT - 170, grade: CONTENT - 110, points: CONTENT - 55 };
  for (const { term, rows } of terms) {
    page.room(60 + rows.length * 18);
    page.text(`${term!.name} · ${term!.academicYear}`, { size: 11.5, weight: "bold" });
    page.y += 4;
    page.box(0, CONTENT, 20, SOFT, 4);
    page.y += 4;
    page.text(t.course, { x: 8, width: cols.credits - 16, size: 8.5, weight: "bold", color: MUTED }, true);
    page.text(t.credits, { x: cols.credits, width: 50, size: 8.5, weight: "bold", color: MUTED }, true);
    page.text(t.grade, { x: cols.grade, width: 50, size: 8.5, weight: "bold", color: MUTED }, true);
    page.text(t.points, { x: cols.points, width: 50, size: 8.5, weight: "bold", color: MUTED });
    page.y += 6;
    for (const row of [...rows].sort((a, b) => a.code.localeCompare(b.code))) {
      const grade = gradeOf(data.settings.scale, row.grade);
      page.room(18);
      page.text(row.code, { x: 8, width: cols.title - 12, size: 9.5, weight: "bold" }, true);
      page.text(row.title, { x: cols.title, width: cols.credits - cols.title - 8, size: 9.5 }, true);
      page.text(credits(row.credits), { x: cols.credits, width: 50, size: 9.5 }, true);
      page.text(row.grade, { x: cols.grade, width: 50, size: 9.5, weight: "bold" }, true);
      page.text(grade && grade.gpa ? grade.points.toFixed(2) : "—", { x: cols.points, width: 50, size: 9.5 });
      page.y += 3;
    }
    const sum = rows.reduce((n, r) => n + r.credits, 0);
    page.text(fill(t.termGpa, { gpa: num(gpaOf(rows, data.settings.scale)), credits: credits(sum) }), { size: 9.5, color: MUTED, align: "end" });
    page.y += 12;
  }
  page.room(70);
  page.rule();
  page.y += 10;
  page.text(t.cumulative, { width: 200, size: 10.5, color: MUTED }, true);
  page.text(num(record.standing.gpa), { x: 200, width: CONTENT - 200, size: 14, weight: "bold", align: "end" });
  page.text(t.earned, { width: 200, size: 10.5, color: MUTED }, true);
  page.text(program ? `${credits(record.standing.creditsEarned)} / ${credits(program.creditsRequired)}` : credits(record.standing.creditsEarned), { x: 200, width: CONTENT - 200, size: 12, weight: "bold", align: "end" });
  page.y += 18;
  page.text(fill(t.foot, { school: input.school }), { size: 8.5, color: MUTED });
  doc.end();
  return done;
}
