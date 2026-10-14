/**
 * 23 A small XML reader for RSS and Atom feeds, with no dependencies. It
 * builds a tree of elements and text and is safe with untrusted input:
 * document type declarations are skipped and never read (no entities from a
 * DTD, no external files), only the five XML entities and character
 * references are decoded, and the depth and number of elements are limited.
 * It is not a validating parser: feeds that aren't well formed are read as
 * far as they make sense.
 */

export interface XmlElement {
  /** As written, with its prefix, e.g. "content:encoded". */
  name: string;
  attributes: Record<string, string>;
  children: XmlNode[];
}

export type XmlNode = XmlElement | string;

export class XmlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XmlError";
  }
}

const MAX_DEPTH = 64;
const MAX_ELEMENTS = 50_000;

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeXmlEntities(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(/&(#x[0-9a-fA-F]{1,6}|#\d{1,7}|[a-zA-Z]{2,4});/g, (whole, ref: string) => {
    if (ref.startsWith("#")) {
      const code = ref[1] === "x" || ref[1] === "X" ? Number.parseInt(ref.slice(2), 16) : Number(ref.slice(1));
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "";
    }
    return NAMED[ref] ?? whole;
  });
}

function parseAttributes(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of source.matchAll(/([^\s=/"'<>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
    const name = m[1]!;
    if (!(name in out)) out[name] = decodeXmlEntities(m[2] ?? m[3] ?? "");
  }
  return out;
}

const NAME = /[A-Za-z_][\w.:-]*/y;

/**
 * The tag starting at `start` (a "<"), read in one pass: quoted values may
 * hold ">", and a "<" outside quotes means it wasn't a tag. Null when it isn't one.
 */
function readTag(text: string, start: number): { closing: boolean; name: string; attributes: string; selfClosing: boolean; end: number } | null {
  const closing = text[start + 1] === "/";
  NAME.lastIndex = start + (closing ? 2 : 1);
  const name = NAME.exec(text)?.[0];
  if (!name) return null;
  let j = NAME.lastIndex;
  let quote: string | null = null;
  for (; j < text.length; j += 1) {
    const ch = text[j]!;
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === ">") {
      break;
    } else if (ch === "<") {
      return null;
    }
  }
  if (j >= text.length) return null;
  const inside = text.slice(NAME.lastIndex, j);
  if (inside && !/^\s/.test(inside) && inside !== "/") return null;
  const selfClosing = /\/\s*$/.test(inside);
  return { closing, name, attributes: selfClosing ? inside.replace(/\/\s*$/, "") : inside, selfClosing, end: j + 1 };
}

/** The markup of nodes again, for Atom's XHTML content. */
export function serializeXml(nodes: XmlNode[]): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return nodes
    .map((n) => {
      if (typeof n === "string") return escape(n);
      const name = n.name.slice(n.name.indexOf(":") + 1);
      const attrs = Object.entries(n.attributes)
        .filter(([key]) => !key.startsWith("xmlns"))
        .map(([key, value]) => ` ${key}="${escape(value).replace(/"/g, "&quot;")}"`)
        .join("");
      return `<${name}${attrs}>${serializeXml(n.children)}</${name}>`;
    })
    .join("");
}

/** The document's root element. Throws XmlError when there is none. */
export function parseXml(input: string): XmlElement {
  const text = input.replace(/^﻿/, "");
  const root: XmlElement = { name: "#document", attributes: {}, children: [] };
  const stack: XmlElement[] = [root];
  let count = 0;
  let i = 0;
  const top = () => stack[stack.length - 1]!;
  const addText = (value: string) => {
    if (value && stack.length > 1) top().children.push(value);
  };
  while (i < text.length) {
    const lt = text.indexOf("<", i);
    if (lt === -1) {
      addText(decodeXmlEntities(text.slice(i)));
      break;
    }
    if (lt > i) addText(decodeXmlEntities(text.slice(i, lt)));
    if (text.startsWith("<![CDATA[", lt)) {
      const end = text.indexOf("]]>", lt + 9);
      addText(text.slice(lt + 9, end === -1 ? text.length : end));
      i = end === -1 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith("<!--", lt)) {
      const end = text.indexOf("-->", lt + 4);
      i = end === -1 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith("<?", lt)) {
      const end = text.indexOf("?>", lt + 2);
      i = end === -1 ? text.length : end + 2;
      continue;
    }
    if (text.startsWith("<!", lt)) {
      // A document type declaration, with any internal subset in brackets: skipped, never read.
      let j = lt + 2;
      let depth = 0;
      while (j < text.length) {
        const ch = text[j]!;
        if (ch === "[") depth += 1;
        else if (ch === "]") depth = Math.max(0, depth - 1);
        else if (ch === ">" && depth === 0) break;
        j += 1;
      }
      i = j + 1;
      continue;
    }
    const tag = readTag(text, lt);
    if (!tag) {
      // A lone "<" in text.
      addText("<");
      i = lt + 1;
      continue;
    }
    i = tag.end;
    const { closing, name, attributes, selfClosing } = tag;
    if (closing) {
      const at = stack.map((e) => e.name).lastIndexOf(name);
      if (at > 0) stack.length = at;
      continue;
    }
    count += 1;
    if (count > MAX_ELEMENTS) throw new XmlError("The document has too many elements.");
    const element: XmlElement = { name, attributes: parseAttributes(attributes), children: [] };
    top().children.push(element);
    if (!selfClosing) {
      if (stack.length > MAX_DEPTH) throw new XmlError("The document is nested too deeply.");
      stack.push(element);
    }
  }
  const first = root.children.find((c): c is XmlElement => typeof c !== "string");
  if (!first) throw new XmlError("The document has no elements.");
  return first;
}

/** The name without its prefix, lower case: "content:encoded" is "encoded". */
export function localName(element: XmlElement): string {
  return element.name.slice(element.name.indexOf(":") + 1).toLowerCase();
}

/** Child elements, by full name ("dc:creator") or local name ("creator"), case-insensitive. */
export function childrenNamed(element: XmlElement, name: string): XmlElement[] {
  const wanted = name.toLowerCase();
  const local = !wanted.includes(":");
  return element.children.filter((c): c is XmlElement => typeof c !== "string" && (local ? localName(c) : c.name.toLowerCase()) === wanted);
}

export function childNamed(element: XmlElement, name: string): XmlElement | null {
  return childrenNamed(element, name)[0] ?? null;
}

/** All the text inside, including that of child elements. */
export function textOf(element: XmlElement | null): string {
  if (!element) return "";
  return element.children.map((c) => (typeof c === "string" ? c : textOf(c))).join("");
}
