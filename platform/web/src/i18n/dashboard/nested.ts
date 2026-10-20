import type { Lang } from "../config";
import { relocalizeDate } from "../format";

/**
 * 56 The value of a known text's `{part}`, written in the language: a date the
 * English way ("31 Mar 2027"), or a phrase the catalogs know that starts like
 * "The heading" (a field named inside a validation message). Names and other
 * values stay as they are. No catalog here: client components use it too.
 */
export function nestedValue(lang: Lang, source: Map<string, string>, target: Map<string, string>): (value: string) => string {
  return (value) => {
    if (/^(?:The|An?) /.test(value)) {
      for (const [key, english] of source) if (english === value) return target.get(key) ?? value;
    }
    return relocalizeDate(lang, value);
  };
}
