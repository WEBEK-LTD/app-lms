import PDFDocument from "pdfkit";
import type { Lang } from "@/i18n/config";
import { Layout, receiptFonts, type ReceiptFonts } from "../receipts/pdf";
import type { Statement } from "./statement";
import { statementAmount, statementWords, summaryRows, TOTALS_ORDER } from "./statement-export";

/** 115.4 A vendor's statement as a PDF, laid out with the receipts' layout (Arabic right to left, the site's fonts). */
export async function statementPdf(statement: Statement, lang: Lang, timezone: string, vendorName: string, appName: string, fontFiles?: ReceiptFonts): Promise<Buffer> {
  const files = fontFiles ?? (await receiptFonts());
  const w = statementWords(lang);
  const doc = new PDFDocument({ size: "A4", margin: 50, font: null as unknown as string, lang, displayTitle: true, info: { Title: `${w.title} · ${vendorName}`, Author: appName, Creator: "Yallapp", Producer: "Yallapp" } });
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
  const page = new Layout(doc, lang);
  page.y = 50;
  const day = (at: Date) => new Intl.DateTimeFormat(lang === "ar" ? "ar-EG-u-nu-latn" : lang, { timeZone: timezone, dateStyle: "medium" }).format(at);
  page.text(appName, { size: 10, color: "#5E5A73" });
  page.text(`${w.title} · ${vendorName}`, { size: 20, weight: "bold" });
  page.text(`${day(statement.from)} – ${day(new Date(statement.to.getTime() - 1))}`, { size: 11, color: "#5E5A73" });
  page.y += 14;
  page.rule();
  page.y += 10;
  const content = 595.28 - 100;
  // The summary's labels, and each one's amount; the net (last) in bold, saying which way it goes.
  const labels = summaryRows(statement, lang).map(([label]) => label);
  const values = [String(statement.totals.orders), ...TOTALS_ORDER.map((key) => statementAmount(statement, key === "net" ? Math.abs(statement.totals[key]) : statement.totals[key], lang))];
  labels.forEach((label, i) => {
    const last = i === labels.length - 1;
    page.room(26);
    if (last) {
      page.y += 6;
      page.rule();
      page.y += 8;
    }
    const size = last ? 12.5 : 10.5;
    const weight = last ? "bold" : "regular";
    page.text(label, { width: content * 0.62, weight, size }, true);
    page.text(values[i]!, { x: content * 0.62, width: content * 0.38, align: "end", weight, size });
    page.y += 4;
  });
  doc.end();
  return done;
}
