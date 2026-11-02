import { deleteCouponAction, setCouponActiveAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Badge, formatDate } from "@/components/ui";
import { formatCents } from "@/lib/catalog/money";
import type { CatalogCoupon, CatalogCurrency } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { CouponForm } from "./forms";

/** 91.1 The shop's coupons, added, turned off and on, deleted; 112.5 also an academy's, for its paid courses. */
export async function CouponsPanel({ coupons, currency, intro }: { coupons: CatalogCoupon[]; currency: CatalogCurrency; intro?: string }) {
  const { t, lang } = await dashboardText();
  const money = (cents: number) => formatCents(cents, currency);
  return (
    <section aria-labelledby="h-coupons" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="h-coupons" className="m-0 text-lg font-bold">
          {t("shop.coupons")}
        </h2>
        <p className="m-0 text-[15px] text-muted">{intro ?? t("shop.couponsIntro")}</p>
      </div>
      {coupons.length ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {coupons.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-soft px-4 py-3" data-coupon={c.code}>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="flex items-center gap-2 font-semibold">
                  <span dir="ltr">{c.code}</span>
                  {!c.active ? <Badge tone="neutral">{t("shop.couponOff")}</Badge> : null}
                </span>
                <span className="text-[13px] text-muted">
                  {[
                    c.kind === "percent" ? t("shop.couponPercentOff", { value: c.value }) : t("shop.couponAmountOff", { amount: money(c.value) }),
                    c.minOrderCents !== null ? t("shop.couponFrom", { amount: money(c.minOrderCents) }) : null,
                    c.endsAt ? t("shop.couponUntil", { date: formatDate(c.endsAt, lang) }) : null,
                    c.maxUses !== null ? t("shop.couponUsesOf", { used: c.usedCount, max: c.maxUses }) : t("shop.couponUses", { used: c.usedCount }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <form action={setCouponActiveAction}>
                  <input type="hidden" name="id" value={c.id} />
                  {c.active ? null : <input type="hidden" name="active" value="on" />}
                  <SubmitButton variant="secondary" className="h-8 px-3 text-[13px]">
                    {c.active ? t("shop.couponTurnOff") : t("shop.couponTurnOn")}
                  </SubmitButton>
                </form>
                <form action={deleteCouponAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <SubmitButton variant="danger" className="h-8 px-3 text-[13px]">
                    {t("common.delete")}
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <CouponForm currency={currency} />
    </section>
  );
}
