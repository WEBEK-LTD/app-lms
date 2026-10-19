/**
 * 43 The message format of the app's interface strings (the ARB files in
 * mobile/lib/l10n, ICU as Flutter's gen-l10n reads it): text, `{name}`
 * placeholders, and `{count, plural, =1{…} other{…}}` or
 * `{code, select, A{…} other{…}}`. Apostrophes and `#` are plain text. The
 * Translations page and the server check the owner's strings with it, and
 * the app formats them with the same rules (lib/core/l10n/icu.dart).
 */

export type IcuNode = string | { kind: "arg"; name: string } | { kind: "plural" | "select"; name: string; options: Record<string, IcuNode[]> };

export class IcuError extends Error {}

const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const PLURAL_KEY = /^(=\d+|zero|one|two|few|many|other)$/;
const SELECT_KEY = /^[A-Za-z0-9_-]+$/;

/** Parses a message, or throws an `IcuError` that says what's wrong. */
export function parseIcu(message: string): IcuNode[] {
  let pos = 0;

  function nodes(nested: boolean): IcuNode[] {
    const out: IcuNode[] = [];
    let text = "";
    while (pos < message.length) {
      const c = message[pos]!;
      if (c === "}") {
        if (!nested) throw new IcuError("There's a } without a { before it.");
        break;
      }
      if (c === "{") {
        if (text) out.push(text);
        text = "";
        out.push(argument());
        continue;
      }
      text += c;
      pos += 1;
    }
    if (text) out.push(text);
    return out;
  }

  function argument(): IcuNode {
    pos += 1; // {
    const close = message.indexOf("}", pos);
    const comma = message.indexOf(",", pos);
    if (close === -1) throw new IcuError("A { has no } after it.");
    if (comma === -1 || comma > close) {
      const name = message.slice(pos, close).trim();
      if (!NAME.test(name)) throw new IcuError(name ? `{${name}} isn't a placeholder name.` : "There's an empty {}.");
      pos = close + 1;
      return { kind: "arg", name };
    }
    const name = message.slice(pos, comma).trim();
    if (!NAME.test(name)) throw new IcuError(`{${name}} isn't a placeholder name.`);
    pos = comma + 1;
    const nextComma = message.indexOf(",", pos);
    if (nextComma === -1) throw new IcuError(`{${name}, …} needs plural or select.`);
    const kind = message.slice(pos, nextComma).trim();
    if (kind !== "plural" && kind !== "select") throw new IcuError(`{${name}, ${kind}} isn't supported: use plural or select.`);
    pos = nextComma + 1;
    const options: Record<string, IcuNode[]> = {};
    for (;;) {
      while (pos < message.length && /\s/.test(message[pos]!)) pos += 1;
      if (pos >= message.length) throw new IcuError(`{${name}, ${kind}, …} has no closing }.`);
      if (message[pos] === "}") {
        pos += 1;
        break;
      }
      const open = message.indexOf("{", pos);
      if (open === -1) throw new IcuError(`{${name}, ${kind}, …} has a choice without a text in {}.`);
      const key = message.slice(pos, open).trim();
      if (!(kind === "plural" ? PLURAL_KEY : SELECT_KEY).test(key)) {
        throw new IcuError(kind === "plural" ? `"${key}" isn't a plural choice: use =0, =1, zero, one, two, few, many or other.` : `"${key}" isn't a select choice.`);
      }
      if (key in options) throw new IcuError(`The choice "${key}" is there twice.`);
      pos = open + 1;
      options[key] = nodes(true);
      if (message[pos] !== "}") throw new IcuError(`The choice "${key}" has no closing }.`);
      pos += 1;
    }
    if (!("other" in options)) throw new IcuError(`{${name}, ${kind}, …} needs an "other" choice.`);
    return { kind, name, options };
  }

  const out = nodes(false);
  return out;
}

/** The placeholders a parsed message uses, with whether each is a plural's or a select's. */
export function icuArguments(nodes: IcuNode[], out = new Map<string, "arg" | "plural" | "select">()): Map<string, "arg" | "plural" | "select"> {
  for (const node of nodes) {
    if (typeof node === "string") continue;
    if (node.kind === "arg") {
      if (!out.has(node.name)) out.set(node.name, "arg");
      continue;
    }
    out.set(node.name, node.kind);
    for (const option of Object.values(node.options)) icuArguments(option, out);
  }
  return out;
}

/** The placeholder names in an English string ("{count}"), for the chips next to a translation. */
export function placeholderNames(message: string): string[] {
  try {
    return [...icuArguments(parseIcu(message)).keys()];
  } catch {
    return [];
  }
}

export interface IcuCheck {
  /** Why the translation can't be saved. */
  errors: string[];
  /** What the owner may have missed ("{count} isn't used"). */
  warnings: string[];
}

/**
 * Checks a translation against its English string and the placeholders the
 * app passes (`placeholders`: name and type, from the ARB file): the format
 * must be valid, only known placeholders may be used, a plural only on a
 * number.
 */
export function checkTranslation(source: string, translation: string, placeholders: Record<string, string>): IcuCheck {
  const errors: string[] = [];
  const warnings: string[] = [];
  let used: Map<string, "arg" | "plural" | "select">;
  try {
    used = icuArguments(parseIcu(translation));
  } catch (e) {
    return { errors: [e instanceof IcuError ? e.message : "The text can't be read."], warnings };
  }
  const known = Object.keys(placeholders);
  for (const [name, kind] of used) {
    if (!(name in placeholders)) {
      errors.push(known.length ? `{${name}} isn't a placeholder here. Use ${known.map((k) => `{${k}}`).join(", ")}.` : `{${name}} isn't a placeholder here: this text has none.`);
      continue;
    }
    if (kind === "plural" && placeholders[name] !== "int" && placeholders[name] !== "num" && placeholders[name] !== "double") {
      errors.push(`{${name}} isn't a number, so it can't have plural forms.`);
    }
  }
  let sourceArgs: string[] = [];
  try {
    sourceArgs = [...icuArguments(parseIcu(source)).keys()];
  } catch {
    sourceArgs = known;
  }
  for (const name of sourceArgs) if (!used.has(name)) warnings.push(`{${name}} isn't in your text.`);
  return { errors, warnings };
}
