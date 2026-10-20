import type { Lang } from "../config";
import { relocalizeDate, translateFrom } from "../format";

/** 62 How deep a sentence inside a sentence is translated ("Nothing was refunded. {error}", whose error has "{text} Details: {details}"). */
const MAX_DEPTH = 3;

/**
 * 56 The value of a known text's `{part}`, written in the language: a date the
 * English way ("31 Mar 2027"), or a phrase the catalogs know that starts like
 * "The heading" (a field named inside a validation message). 62 A whole
 * sentence the catalogs know (a provider's or an email server's answer inside
 * "The payment couldn't start: {reason}") is translated too, the same way.
 * Names and other values stay as they are. No catalog here: client
 * components use it too.
 */
export function nestedValue(lang: Lang, source: Map<string, string>, target: Map<string, string>, depth = 0): (value: string) => string {
  return (value) => {
    if (/^(?:The|An?) /.test(value)) {
      for (const [key, english] of source) if (english === value) return target.get(key) ?? value;
    }
    if (depth < MAX_DEPTH && / \S/.test(value) && (/[.!?:)"”]$/.test(value) || value.includes(" Details: "))) {
      const translated = translateFrom(lang, source, target, value, nestedValue(lang, source, target, depth + 1));
      if (translated !== value) return translated;
    }
    return relocalizeDate(lang, value);
  };
}
