import { RATES_ATTRIBUTION } from "@/lib/money/source";

/**
 * 135.6 The rates' source, as its terms ask where the rates are shown: on
 * the dashboard's currency settings, Admin › Settings › Currencies and
 * (135.10) the payment page's price in the customer's currency, as the
 * app's cart and Settings › Currency do. Its own words, in English in every
 * language (i18n-ok).
 */
export function RatesAttribution({ className = "" }: { className?: string }) {
  return (
    <a href={RATES_ATTRIBUTION.href} target="_blank" rel="noopener noreferrer" className={`text-[13px] text-muted underline ${className}`} dir="ltr">
      {RATES_ATTRIBUTION.text /* i18n-ok: the source's attribution */}
    </a>
  );
}
