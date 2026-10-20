import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

/**
 * 56 Finds English text written straight into the client dashboard's code
 * (JSX text, text attributes, text children in braces, page titles) instead
 * of coming from the catalogs (src/i18n/dashboard). A line with
 * `i18n-ok` (a brand name, a code sample, the phone preview's own texts) is
 * skipped. tests/unit/dashboard-i18n.test.ts runs it over every dashboard file.
 */

const TEXT_ATTRS = new Set([
  "label",
  "hint",
  "title",
  "aria-label",
  "description",
  "placeholder",
  "submit",
  "text",
  "caption",
  "pendingText",
  "detail",
  "alt",
  "legend",
  "confirm",
  "emptyText",
  "summary",
  "message",
]);
const TEXT_PROPS = new Set(["label", "title", "hint", "description", "message", "text", "placeholder", "detail", "summary", "caption"]);

/** Words that stay as they are in every language. */
const SAME_EVERYWHERE =
  /^(?:Yallapp|WordPress|WhatsApp|Google Play|App Store|Galaxy Store|Samsung Galaxy Store|AppGallery|Huawei AppGallery|GetApps|Xiaomi GetApps|Push Kit|Android|iOS|iPhone|Shopify|Kashier|API|APK|AAB|PNG|JPEG|PDF|SVG|MP4|URL|HTTPS?|JSON|CSV|XML|XLIFF|UTC|EGP|USD|TRY|EUR|GBP|ID|QR|SKU|FCM|APNs|Firebase|YouTube|Vimeo|Wistia|Bunny|Cloudflare|Instagram|Facebook|TikTok|X|LinkedIn|Telegram|IBAN|EG|TR)$/;

export interface Finding {
  file: string;
  line: number;
  text: string;
}

/** One token with a dot, slash, @, _ or digit: an address, a file name, an example ID ("your-shop.myshopify.com", "2X9R4HXF34"). */
const IDENTIFIER = /^\S*[./@_\d]\S*$/;

const hasWords = (text: string) => /[A-Za-z]{2,}/.test(text) && !SAME_EVERYWHERE.test(text.trim()) && !IDENTIFIER.test(text.trim());

export function findHardcodedText(file: string, source = readFileSync(file, "utf8")): Finding[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lines = source.split("\n");
  // Lines between `i18n-ok-begin` and `i18n-ok-end` (the client app's own screens in a preview) are skipped too.
  const skipped = new Set<number>();
  let inside = false;
  lines.forEach((text, i) => {
    if (text.includes("i18n-ok-begin")) inside = true;
    if (inside) skipped.add(i);
    if (text.includes("i18n-ok-end")) inside = false;
  });
  const out: Finding[] = [];
  const add = (node: ts.Node, text: string) => {
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line;
    if (skipped.has(line) || lines[line]?.includes("i18n-ok") || lines[line - 1]?.includes("i18n-ok")) return;
    out.push({ file, line: line + 1, text: text.trim().slice(0, 80) });
  };
  const literalText = (node: ts.Node): string | null =>
    ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : ts.isTemplateExpression(node) ? node.head.text + node.templateSpans.map((s) => s.literal.text).join(" ") : null;
  const checkChildExpression = (node: ts.Expression) => {
    const text = literalText(node);
    if (text !== null) {
      if (hasWords(text)) add(node, text);
      return;
    }
    if (ts.isConditionalExpression(node)) {
      checkChildExpression(node.whenTrue);
      checkChildExpression(node.whenFalse);
    } else if (ts.isBinaryExpression(node) && (node.operatorToken.kind === ts.SyntaxKind.BarBarToken || node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)) {
      checkChildExpression(node.right);
    } else if (ts.isParenthesizedExpression(node)) checkChildExpression(node.expression);
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const text = node.getText(sf).replace(/&[a-z]+;/g, "'");
      if (hasWords(text)) add(node, text);
    } else if (ts.isJsxAttribute(node) && node.initializer) {
      const name = node.name.getText(sf);
      if (TEXT_ATTRS.has(name)) {
        if (ts.isStringLiteral(node.initializer)) {
          if (hasWords(node.initializer.text)) add(node, node.initializer.text);
        } else if (ts.isJsxExpression(node.initializer) && node.initializer.expression) checkChildExpression(node.initializer.expression);
      }
    } else if (ts.isJsxExpression(node) && node.expression && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      checkChildExpression(node.expression);
    } else if (ts.isPropertyAssignment(node) && TEXT_PROPS.has(node.name.getText(sf))) {
      const text = literalText(node.initializer);
      if (text !== null && hasWords(text) && /\s|^[A-Z]/.test(text)) add(node, text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

export function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(path));
    else if (/\.tsx$/.test(name)) out.push(path);
  }
  return out;
}

/** The client dashboard's files: its pages, /pending, and the components only it uses. */
export function dashboardFiles(root: string): string[] {
  const components = [
    "account-link",
    "analytics-charts",
    "analytics-report",
    "announcements",
    "app-switcher",
    "build-status",
    "dashboard-language",
    "dashboard-nav",
    "media-picker",
    "owner-notices",
    "plan-payment-form",
    "updates-bell",
    "upgrade",
  ];
  return [
    ...filesUnder(join(root, "src/app/dashboard")),
    ...filesUnder(join(root, "src/app/pending")),
    ...components.map((name) => join(root, `src/components/${name}.tsx`)),
  ];
}
