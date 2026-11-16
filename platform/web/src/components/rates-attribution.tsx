import { RATES_ATTRIBUTION } from "@/lib/money/source";

/**
 * 133.6 The rates' source, as its terms ask where the rates are shown: on
 * the dashboard's currency settings and Admin › Settings › Currencies. Its
 * own words, in English in every language (i18n-ok).
 */
export function RatesAttribution({ className = "" }: { className?: string }) {
  return (
    <a href={RATES_ATTRIBUTION.href} target="_blank" rel="noopener" className={`text-[13px] text-muted underline ${className}`} dir="ltr">
      {RATES_ATTRIBUTION.text /* i18n-ok: the source's attribution */}
    </a>
  );
}
