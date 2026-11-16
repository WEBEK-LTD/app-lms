/** 132.11 The Products list's filters and sorts, as the address keeps them (the page reads them, the list changes them). */
export interface ProductFilters {
  q: string;
  category: string;
  status: "all" | "shown" | "hidden";
  sale: boolean;
  out: boolean;
  addon: boolean;
  sort: Sort;
}

export const SORTS = ["newest", "oldest", "name", "priceLow", "priceHigh", "stock", "sales"] as const;
export type Sort = (typeof SORTS)[number];
export const isSort = (v: unknown): v is Sort => typeof v === "string" && (SORTS as readonly string[]).includes(v);
