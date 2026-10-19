import type { PrefixedLang } from "@/i18n/config";
import { AR_DOCS } from "./ar/docs";
import { AR_LEGAL } from "./ar/legal";
import { AR_MARKETING } from "./ar/marketing";
import { AR_SITE } from "./ar/site";
import { TR_DOCS } from "./tr/docs";
import { TR_LEGAL } from "./tr/legal";
import { TR_MARKETING } from "./tr/marketing";
import { TR_SITE } from "./tr/site";
import type { DocTranslation, LegalTranslation, MarketingTranslation, SiteContentTranslation } from "./translation-types";

/**
 * 55 yallapp.com.tr's long texts in Arabic and Turkish, server side only
 * (they are large): the marketing lists, the documentation, the legal pages
 * and the defaults of the texts the team edits in the admin.
 */
export interface LocalizedContent {
  marketing: MarketingTranslation;
  docs: Record<string, DocTranslation>;
  legal: Partial<Record<"privacy" | "terms" | "refund", LegalTranslation>>;
  site: SiteContentTranslation;
}

export const LOCALIZED: Record<PrefixedLang, LocalizedContent> = {
  ar: { marketing: AR_MARKETING, docs: AR_DOCS, legal: AR_LEGAL, site: AR_SITE },
  tr: { marketing: TR_MARKETING, docs: TR_DOCS, legal: TR_LEGAL, site: TR_SITE },
};
