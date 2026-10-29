/**
 * 108.3 A small XML reader for the SVG files design tools export: elements,
 * their attributes and text, entities and CDATA. Not a full XML parser (no
 * DTDs, no namespaces beyond keeping the prefix), and the same in the
 * browser and in tests.
 */

export interface XmlElement {
  name: string;
  attrs: Record<string, string>;
  children: XmlNode[];
}

export type XmlNode = XmlElement | string;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const ATTR = /([^\s=/>]+)\s*(?:=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;

/** The document's root element, or null when it isn't XML. */
export function parseXml(text: string, maxElements = 200_000): XmlElement | null {
  const root: XmlElement = { name: "#document", attrs: {}, children: [] };
  const stack: XmlElement[] = [root];
  let i = 0;
  let count = 0;
  while (i < text.length) {
    const lt = text.indexOf("<", i);
    if (lt < 0) {
      pushText(stack[stack.length - 1]!, text.slice(i));
      break;
    }
    if (lt > i) pushText(stack[stack.length - 1]!, text.slice(i, lt));
    if (text.startsWith("<!--", lt)) {
      const end = text.indexOf("-->", lt + 4);
      i = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith("<![CDATA[", lt)) {
      const end = text.indexOf("]]>", lt + 9);
      stack[stack.length - 1]!.children.push(text.slice(lt + 9, end < 0 ? text.length : end));
      i = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text[lt + 1] === "?" || text[lt + 1] === "!") {
      // The declaration and the doctype (its internal subset skipped).
      let depth = 0;
      let j = lt + 1;
      for (; j < text.length; j += 1) {
        if (text[j] === "[") depth += 1;
        else if (text[j] === "]") depth -= 1;
        else if (text[j] === ">" && depth <= 0) break;
      }
      i = j + 1;
      continue;
    }
    const gt = findTagEnd(text, lt + 1);
    if (gt < 0) return null;
    const inner = text.slice(lt + 1, gt);
    i = gt + 1;
    if (inner[0] === "/") {
      const name = inner.slice(1).trim();
      // Close up to the matching element (tolerating a missing end tag).
      for (let k = stack.length - 1; k > 0; k -= 1) {
        if (stack[k]!.name === name) {
          stack.length = k;
          break;
        }
      }
      continue;
    }
    const selfClosing = inner.endsWith("/");
    const body = selfClosing ? inner.slice(0, -1) : inner;
    const nameEnd = body.search(/[\s/]|$/);
    const name = body.slice(0, nameEnd);
    if (!name) return null;
    const attrs: Record<string, string> = {};
    ATTR.lastIndex = 0;
    const rest = body.slice(nameEnd);
    for (let m = ATTR.exec(rest); m; m = ATTR.exec(rest)) {
      const raw = m[2] ?? "";
      attrs[m[1]!] = decodeEntities(raw[0] === '"' || raw[0] === "'" ? raw.slice(1, -1) : raw);
    }
    const element: XmlElement = { name, attrs, children: [] };
    stack[stack.length - 1]!.children.push(element);
    count += 1;
    if (count > maxElements) return null;
    if (!selfClosing) stack.push(element);
  }
  return root.children.find((c): c is XmlElement => typeof c !== "string") ?? null;
}

function findTagEnd(text: string, from: number): number {
  let quote: string | null = null;
  for (let j = from; j < text.length; j += 1) {
    const ch = text[j];
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ">") return j;
  }
  return -1;
}

function pushText(parent: XmlElement, raw: string) {
  if (!raw) return;
  parent.children.push(decodeEntities(raw));
}

/** An element's elements. */
export function elementsOf(el: XmlElement): XmlElement[] {
  return el.children.filter((c): c is XmlElement => typeof c !== "string");
}

/** All the text inside an element. */
export function textOf(el: XmlNode): string {
  return typeof el === "string" ? el : el.children.map(textOf).join("");
}

/** The element's name without a namespace prefix ("svg:rect" → "rect"). */
export function localName(el: XmlElement): string {
  const colon = el.name.indexOf(":");
  return colon < 0 ? el.name : el.name.slice(colon + 1);
}

/** Every element below, depth first. */
export function* walkXml(el: XmlElement): Generator<XmlElement> {
  for (const child of elementsOf(el)) {
    yield child;
    yield* walkXml(child);
  }
}

/** The element back as XML text (for drawing part of an SVG as a picture). */
export function writeXml(el: XmlNode): string {
  if (typeof el === "string") return el.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const attrs = Object.entries(el.attrs)
    .map(([k, v]) => ` ${k}="${v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}"`)
    .join("");
  if (!el.children.length) return `<${el.name}${attrs}/>`;
  return `<${el.name}${attrs}>${el.children.map(writeXml).join("")}</${el.name}>`;
}
