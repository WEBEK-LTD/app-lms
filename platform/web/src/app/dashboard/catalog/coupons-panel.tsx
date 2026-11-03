import { deleteCouponAction, setCouponActiveAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Badge, EmptyState, Section, formatDate } from "@/components/ui";
import { ItemList, ItemRow, Thumb } from "@/components/page-kit";
import { Sheet, SheetButton } from "@/components/page-kit-client";
import { formatCents } from "@/lib/catalog/money";
import type { CatalogCoupon, CatalogCurrency } from "@/lib/data/types";
import { dashboardText } from "@/lib/dashboard-lang";
import { CouponForm } from "./forms";

/** 91.1 The shop's coupons, added, turned off and on, deleted; 112.5 also an academy's, for its paid courses. */
export async function CouponsPanel({ coupons, currency, intro }: { coupons: CatalogCoupon[]; currency: CatalogCurrency; intro?: string }) {
  const { t, lang } = await dashboardText();
  const money = (cents: number) => formatCents(cents, currency);
  const has = coupons.length > 0;
  return (
    <>
      {/* The page kit: the coupons as a list, "Add coupon" in a Sheet (in place while there are none). */}
      <Section
        titleId="h-coupons"
        title={t("shop.coupons")}
        description={intro ?? t("shop.couponsIntro")}
        actions={
          has ? (
            <SheetButton target="new-coupon" variant="secondary" className="h-10">
              {t("shop.addCoupon")}
            </SheetButton>
          ) : null
        }
        flush
      >
        {has ? (
          <ItemList>
            {coupons.map((c, i) => (
              <ItemRow
                key={c.id}
                data-coupon={c.code}
                media={<Thumb icon="local_offer" shape="square" tint={i + 1} />}
                title={<span dir="ltr">{c.code}</span>}
                badges={!c.active ? <Badge tone="neutral">{t("shop.couponOff")}</Badge> : null}
                meta={[
                  c.kind === "percent" ? t("shop.couponPercentOff", { value: c.value }) : t("shop.couponAmountOff", { amount: money(c.value) }),
                  c.minOrderCents !== null ? t("shop.couponFrom", { amount: money(c.minOrderCents) }) : null,
                  c.endsAt ? t("shop.couponUntil", { date: formatDate(c.endsAt, lang) }) : null,
                  c.maxUses !== null ? t("shop.couponUsesOf", { used: c.usedCount, max: c.maxUses }) : t("shop.couponUses", { used: c.usedCount }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                actions={
                  <>
                    <form action={setCouponActiveAction}>
                      <input type="hidden" name="id" value={c.id} />
                      {c.active ? null : <input type="hidden" name="active" value="on" />}
                      <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm">
                        {c.active ? t("shop.couponTurnOff") : t("shop.couponTurnOn")}
                      </SubmitButton>
                    </form>
                    <form action={deleteCouponAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <SubmitButton variant="danger" className="h-9 px-3.5 text-sm">
                        {t("common.delete")}
                      </SubmitButton>
                    </form>
                  </>
                }
              />
            ))}
          </ItemList>
        ) : (
          <div className="p-5 sm:p-6">
            <EmptyState icon="local_offer" title={t("shop.couponsNone")} />
          </div>
        )}
      </Section>
      <Sheet id="new-coupon" inline={!has} title={t("shop.addCoupon")} description={t("shop.couponHint")}>
        <CouponForm currency={currency} />
      </Sheet>
    </>
  );
}
