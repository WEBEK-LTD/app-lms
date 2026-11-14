"use client";

import { useDashT } from "@/components/dashboard-i18n";
import { GiftCheckout } from "@/components/studio/gift-checkout";
import type { CheckoutLook } from "@/lib/studio/checkout-look";

/**
 * 131.25 Studio › Screens: the store's checkout look, for every store app.
 * "As before" keeps the cart and checkout as they are; the gift checkout
 * asks in five steps on one screen (who it's from, who it's for, when, the
 * card's message, pay), its colour the project's main one unless chosen.
 * The preview draws it with a sample order (components/studio/gift-checkout.tsx).
 */
export function CheckoutSection({ value, onChange, brand, lang, dark }: { value: CheckoutLook | null; onChange: (next: CheckoutLook | null) => void; brand: string; lang: string; dark: boolean }) {
  const t = useDashT();
  const option = (on: boolean, title: string, hint: string, pick: () => void) => (
    <button type="button" aria-pressed={on} onClick={pick} className="flex flex-col items-start gap-1 rounded-xl bg-white p-3 text-start" style={on ? { border: "2px solid #3D63FF" } : { border: "1px solid var(--color-line, #E6E3EF)" }}>
      <span className="font-bold">{title}</span>
      <span className="text-sm text-muted">{hint}</span>
    </button>
  );
  // 131 The commerce side's settings of the look (its style, chips, mode…) stay as they are.
  const { look: _look, ...others } = value ?? {};
  void _look;
  const without = (next: CheckoutLook) => (Object.keys(next).length ? next : null);
  const gift = value?.look === "gift" ? value : null;
  return (
    <section aria-labelledby="h-checkout-look" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6" data-checkout-section="">
      <div className="flex flex-col gap-1">
        <h2 id="h-checkout-look" className="m-0 text-lg font-bold">
          {t("studio.coTitle")}
        </h2>
        <p className="m-0 text-sm text-muted">{t("studio.coText")}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {option(!gift, t("studio.coLookNone"), t("studio.coLookNoneHint"), () => onChange(without(others)))}
        {option(!!gift, t("studio.coLook_gift"), t("studio.coLookHint_gift"), () => onChange({ ...others, look: "gift", mode: "gift" }))}
      </div>
      {gift ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold">{t("studio.coAccent")}</span>
            <span className="flex items-center gap-2">
              <input type="color" value={gift.accent ?? brand} onChange={(e) => onChange({ ...gift, accent: e.target.value.toUpperCase() })} className="h-10 w-14 rounded-lg border border-line" />
              {gift.accent ? (
                <button type="button" onClick={() => onChange((({ accent: _a, dark_accent: _d, ...rest }) => (void _a, void _d, rest))(gift))} className="rounded-lg border border-line bg-white px-2 py-1 text-sm">
                  {t("studio.coAccentOwn")}
                </button>
              ) : null}
            </span>
          </label>
          <div aria-hidden="true" className="relative h-[520px] w-[300px] shrink-0 overflow-hidden rounded-[28px] border border-line">
            <div style={{ width: 360, transform: "scale(0.8333)", transformOrigin: "top left" }}>
              <GiftCheckout look={gift} dark={dark} lang={lang} brand={brand} photo="/flower-photos/blush-bouquet.jpg" top={20} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
