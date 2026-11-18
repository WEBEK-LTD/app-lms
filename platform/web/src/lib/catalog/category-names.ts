import type { CatalogCategory, LangText } from "../data/types";

/**
 * 175 A category's name in the customer's language: the testers found the
 * category names stayed English on Arabic and Turkish phones, with nowhere
 * to translate them. The owner gives an Arabic and a Turkish name beside
 * the main one (each optional), and the hosted API serves the one in the
 * app's language (`/store/categories`, the home's categories, a product's
 * categories), the main name otherwise.
 */

/** The languages a category can be named in besides its main name. */
export const CATEGORY_LANGS = ["ar", "tr"] as const;

export function categoryNameIn(category: Pick<CatalogCategory, "name" | "names">, lang: string | null | undefined): string {
  const code = (lang ?? "").trim().toLowerCase().split(/[-_]/)[0] ?? "";
  return category.names?.[code]?.trim() || category.name;
}

/** The names typed in the form (`name_ar`, `name_tr`), 80 characters each; null when none. */
export function readCategoryNames(read: (field: string) => string): LangText | null {
  const names: LangText = {};
  for (const lang of CATEGORY_LANGS) {
    const value = read(`name_${lang}`).replace(/\s+/g, " ").trim().slice(0, 80);
    if (value) names[lang] = value;
  }
  return Object.keys(names).length ? names : null;
}

/** Whether two category names are the same to a customer ("Ramadan gifts", " ramadan  Gifts "). */
export function sameCategoryName(a: string, b: string): boolean {
  const key = (s: string) => s.replace(/\s+/g, " ").trim().toLocaleLowerCase();
  return key(a) === key(b);
}

/** Another of the shop's categories already named so; null when none. */
export function duplicateCategory(categories: Pick<CatalogCategory, "id" | "name">[], name: string, except: number | null = null): Pick<CatalogCategory, "id" | "name"> | null {
  return categories.find((c) => c.id !== except && sameCategoryName(c.name, name)) ?? null;
}
