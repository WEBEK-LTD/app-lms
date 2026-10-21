import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * 71 The text of a PDF, as a reader extracts it (pdf.js, which reads the
 * fonts' ToUnicode maps and puts right-to-left text back in reading order):
 * one string per page, the pieces joined with spaces, compatibility forms
 * folded (NFKC) and spaces collapsed.
 */
export async function pdfText(pdf: Uint8Array | Buffer): Promise<string[]> {
  const doc = await getDocument({ data: new Uint8Array(pdf), isEvalSupported: false, disableFontFace: true, useSystemFonts: false, verbosity: 0 }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const content = await (await doc.getPage(i)).getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
    pages.push(text.normalize("NFKC").replace(/\s+/g, " ").trim());
  }
  await doc.destroy();
  return pages;
}

/** The whole document's text. */
export async function pdfAllText(pdf: Uint8Array | Buffer): Promise<string> {
  return (await pdfText(pdf)).join(" ");
}
