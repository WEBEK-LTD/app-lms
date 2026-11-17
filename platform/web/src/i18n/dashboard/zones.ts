import type { Strings } from "../types";

/**
 * 136 Every time zone: the searchable time zone picker
 * (components/time-zone-picker.tsx) on each page where an app chooses its
 * time zone, in the dashboard and in Studio.
 */
export const en = {
  label: "Time zone",
  search: "Search by city, zone or offset",
  searchPlaceholder: "City, zone or offset (+3)",
  usual: "Usual",
  all: "All time zones",
  none: "No time zone matches “{query}”.",
  count: "{count} time zones",
} as const;

type Messages = Strings<typeof en>;

export const ar: Messages = {
  label: "المنطقة الزمنية",
  search: "دوّر على منطقة زمنية",
  searchPlaceholder: "المدينة أو المنطقة أو الفرق (+3)",
  usual: "الأكثر استخدامًا",
  all: "كل المناطق الزمنية",
  none: "مفيش منطقة زمنية مطابقة لـ “{query}”.",
  count: "{count} منطقة زمنية",
};

export const tr: Messages = {
  label: "Saat dilimi",
  search: "Saat dilimi ara",
  searchPlaceholder: "Şehir, bölge ya da fark (+3)",
  usual: "Sık kullanılanlar",
  all: "Tüm saat dilimleri",
  none: "“{query}” ile eşleşen saat dilimi yok.",
  count: "{count} saat dilimi",
};
