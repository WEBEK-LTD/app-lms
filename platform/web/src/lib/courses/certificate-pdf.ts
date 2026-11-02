import PDFDocument from "pdfkit";
import { Layout, receiptFonts, type ReceiptFonts } from "../receipts/pdf";
import { CERTIFICATE_TEXT, certificateDate, type CertificateLang } from "./certificates";

/**
 * 112.5 A certificate as a PDF file (A4 across), made on the server with
 * PDFKit and the receipts' layout (Arabic joined and laid out right to
 * left): the academy's logo and name, the student, the course, the date,
 * the signature line, the code and the address that proves it.
 */

export interface CertificatePdf {
  lang: CertificateLang;
  academy: string;
  name: string;
  course: string;
  completedAt: Date;
  code: string;
  signer: string | null;
  verifyUrl: string;
  /** The app's colour, for the frame. */
  accent: string;
  /** The academy's logo (PNG or JPEG), when it has one. */
  logo: Buffer | null;
}

const WIDTH = 841.89;
const HEIGHT = 595.28;
const INK = "#0E0D24";
const MUTED = "#5E5A73";
const LINE = "#E4DED3";

const colour = (value: string, fallback: string) => (/^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback);

export async function renderCertificatePdf(c: CertificatePdf, fontFiles?: ReceiptFonts): Promise<Buffer> {
  const files = fontFiles ?? (await receiptFonts());
  const t = CERTIFICATE_TEXT[c.lang];
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 0,
    font: null as unknown as string,
    lang: c.lang,
    displayTitle: true,
    info: { Title: `${c.course} · ${c.name}`, Author: c.academy, Creator: "Yallapp", Producer: "Yallapp" },
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

  const accent = colour(c.accent, INK);
  // The frame: a thick border in the app's colour and a thin one inside.
  doc.rect(18, 18, WIDTH - 36, HEIGHT - 36).lineWidth(6).strokeColor(accent).stroke();
  doc.rect(32, 32, WIDTH - 64, HEIGHT - 64).lineWidth(0.8).strokeColor(LINE).stroke();

  const page = new Layout(doc, c.lang);
  const left = 70;
  const width = WIDTH - 140;
  const line = (text: string, baseline: number, size: number, weight: "regular" | "bold", color = INK) => {
    // Long texts (a course's title) on as many lines as they need, each centred.
    const lines = page.wrap(text, width, size, weight);
    lines.forEach((l, i) => page.centeredLine(l, left, width, baseline + i * size * 1.3, size, weight, color));
    return baseline + (lines.length - 1) * size * 1.3;
  };

  let y = 80;
  if (c.logo) {
    try {
      doc.image(c.logo, WIDTH / 2 - 60, y, { fit: [120, 54], align: "center", valign: "center" });
      y += 62;
    } catch {
      // A logo PDFKit can't read is left out.
    }
  }
  y = line(c.academy.toUpperCase(), y + 16, 12, "bold", MUTED);
  y = line(t.heading, y + 46, 34, "bold", accent);
  y = line(t.given, y + 36, 14, "regular", MUTED);
  y = line(c.name, y + 42, 30, "bold");
  doc.moveTo(WIDTH / 2 - 170, y + 12).lineTo(WIDTH / 2 + 170, y + 12).lineWidth(0.8).strokeColor(LINE).stroke();
  y = line(t.finished, y + 38, 14, "regular", MUTED);
  y = line(c.course, y + 32, 20, "bold");
  y = line(t.on.replace("{date}", certificateDate(c.lang, c.completedAt)), y + 30, 12, "regular", MUTED);
  if (c.signer) {
    y = line(c.signer, y + 40, 14, "regular");
    doc.moveTo(WIDTH / 2 - 110, y + 8).lineTo(WIDTH / 2 + 110, y + 8).lineWidth(0.8).strokeColor(MUTED).stroke();
    y = line(t.signed, y + 22, 9, "regular", MUTED);
  }
  const foot = HEIGHT - 70;
  line(t.code.replace("{code}", c.code), foot, 9, "regular", MUTED);
  line(t.check.replace("{url}", c.verifyUrl), foot + 14, 9, "regular", MUTED);
  doc.end();
  return done;
}
