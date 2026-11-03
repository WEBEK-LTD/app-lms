import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Notice, PageHeader, Section } from "@/components/ui";
import { ItemList, PageGroup, Stat, StatRow, Thumb } from "@/components/page-kit";
import { AddDetails, ItemDetails } from "@/components/page-kit-a";
import { DetailsButton } from "@/components/page-kit-a-client";
import { requireClient } from "@/lib/auth/session";
import { creditsText, PERIOD_LABELS } from "@/lib/bookings/memberships";
import { bookingSetup } from "@/lib/bookings/setup";
import { centsToDecimal, formatCents } from "@/lib/catalog/money";
import { paymentsSetUp } from "@/lib/catalog/settings";
import type { MembershipPlan } from "@/lib/data/types";
import { CardPayments, OtherPayments } from "../catalog/payments";
import { MembershipPlanForm, MembershipRulesForm } from "./forms";
import { dashboardText } from "@/lib/dashboard-lang";
import { richText } from "@/i18n/rich";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("bookings.plansTitle") };
}

function planValues(p: MembershipPlan | null): Record<string, string> {
  if (!p) return { name: "", price: "", period: "month", credits: "", description: "", active: "on" };
  return {
    id: String(p.id),
    name: p.name,
    price: centsToDecimal(p.priceCents),
    period: p.period,
    credits: p.credits === null ? "" : String(p.credits),
    description: p.description,
    active: p.active ? "on" : "",
  };
}

/** 27 A gym's or studio's membership plans, sold in the app on the payment page, and whether classes need one. */
export default async function MembershipPlansPage() {
  const { app } = await requireClient("bookings");
  const { t, k } = await dashboardText();
  if (!app || app.connector?.kind !== "bookings") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("bookings.plansTitle")} description={richText(t("bookings.plansNotHere"), { link: (chunk) => <Link href="/dashboard/setup?step=website">{chunk}</Link> })} />
      </div>
    );
  }
  const setup = bookingSetup(app);
  const { currency } = setup.rules;
  const plans = setup.membershipPlans;
  const onSale = plans.filter((p) => p.active).length;
  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, the plans (each opens in place), then the rules and payments. */}
      <PageHeader
        title={t("bookings.plansTitle")}
        description={t("bookings.plansIntro")}
        actions={
          plans.length ? (
            <DetailsButton target="add-plan" icon="add">
              {t("bookings.addPlan")}
            </DetailsButton>
          ) : null
        }
      />
      {!paymentsSetUp(app) ? (
        <Notice tone="warn" icon="warning">
          {t("bookings.plansNoPayments")}
        </Notice>
      ) : null}

      {plans.length ? (
        <StatRow label={t("bookings.plansTitle")}>
          <Stat icon="card_membership" label={t("bookings.plans")} value={plans.length} />
          <Stat icon="check_circle" tone="success" label={t("bookings.onSale")} value={onSale} />
          <Stat icon="visibility_off" tone="warn" label={t("bookings.notOnSale")} value={plans.length - onSale} />
        </StatRow>
      ) : null}

      <Section titleId="h-plans" title={t("bookings.plans")} description={t("bookings.plansText")} flush>
        {plans.length ? (
          <ItemList>
            {plans.map((p, i) => (
              <ItemDetails
                key={p.id}
                media={<Thumb icon="card_membership" shape="square" tint={i} />}
                title={p.name}
                meta={`${formatCents(p.priceCents, currency)} · ${k(PERIOD_LABELS[p.period])} · ${k(creditsText(p.credits))}`}
                aside={p.active ? null : <Badge tone="warn">{t("bookings.notOnSale")}</Badge>}
              >
                <MembershipPlanForm current={planValues(p)} submit={t("bookings.savePlan")} currency={currency} />
              </ItemDetails>
            ))}
          </ItemList>
        ) : null}
        <AddDetails id="add-plan" label={t("bookings.addPlan")} open={plans.length === 0}>
          <MembershipPlanForm current={planValues(null)} submit={t("bookings.addPlanButton")} currency={currency} />
        </AddDetails>
      </Section>

      <PageGroup title={t("bookings.groupPlans")}>
        <Section titleId="h-rules" title={t("bookings.bookingClasses")}>
          <MembershipRulesForm required={setup.membershipRequired} />
        </Section>
        <CardPayments app={app} currency={currency} />
        <OtherPayments app={app} />
      </PageGroup>
    </div>
  );
}
