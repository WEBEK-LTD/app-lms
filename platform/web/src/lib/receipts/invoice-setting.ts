/** 71 At most this many lines under Yallapp's name on its receipts, each this long. */
export const INVOICE_LINES_MAX = 4;
export const INVOICE_LINE_LENGTH = 120;

/**
 * 71 What the team typed in Settings › Invoices, one line each (a legal
 * name, an address, a tax number). Empty lines are dropped; nothing at all
 * removes the setting.
 */
export function parseInvoiceLines(text: string): { ok: true; lines: string[] } | { ok: false; error: string } {
  // Control characters (other than the line breaks between lines) never reach a PDF.
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[\u0000-\u001f\u007f\u2066-\u2069]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (lines.length > INVOICE_LINES_MAX) return { ok: false, error: `Use at most ${INVOICE_LINES_MAX} lines.` };
  if (lines.some((l) => l.length > INVOICE_LINE_LENGTH)) return { ok: false, error: `Keep each line under ${INVOICE_LINE_LENGTH} characters.` };
  return { ok: true, lines };
}
