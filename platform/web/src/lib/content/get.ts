import "server-only";
import { cache } from "react";
import { getStore } from "../data";
import { contentPage, contentWith } from "./site";

/**
 * A page's texts for this render: the team's edit, or the defaults when there
 * is none or the database can't be read (as while the pages are built). Pages
 * made ahead of time read it once; saving in the admin rebuilds them.
 */
export const getSiteContent = cache(async (key: string): Promise<Record<string, string>> => {
  const page = contentPage(key);
  if (!page) throw new Error(`Unknown website content: ${key}`);
  try {
    return contentWith(page, (await (await getStore()).getSiteContent(key))?.fields);
  } catch {
    return { ...page.defaults };
  }
});
