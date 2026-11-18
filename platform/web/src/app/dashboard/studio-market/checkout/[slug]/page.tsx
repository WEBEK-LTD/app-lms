import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { IconName } from "@/components/icon-names";
import { CheckoutForm, type CheckoutApp, type CheckoutPlan } from "@/components/studio-market/checkout";
import { MarketHeader } from "@/components/studio-market/header";
import { MarketPhones } from "@/components/studio-market/phone";
import { formatDate } from "@/components/ui";
import { appLabel } from "@/lib/app/label";
import { kindOf } from "@/lib/app/kinds";
import { requireClient } from "@/lib/auth/session";
import { formatAmount } from "@/lib/billing/prices";
import { getStore } from "@/lib/data";
import { dashboardText } from "@/lib/dashboard-lang";
import { encryptionKey } from "@/lib/env";
import { PROVIDER_NAME } from "@/lib/payments/provider";
import { yallappBilling, yallappPlanAccount } from "@/lib/settings/platform";
import { automaticDiscounts, coverView } from "@/lib/studio-market/catalog";
import { appProblem, chargeFor, CHECKOUT_MESSAGES, renewable } from "@/lib/studio-market/checkout";
import { CODE_PROBLEM_MESSAGES, couponProblem, normalizeCode, quotePlan } from "@/lib/studio-market/discounts";
import type { MarketDiscount } from "@/lib/data/types";
import { formatList } from "@/i18n";
import { formatUsd, ltr, offeredPlans, perMonthCents, periodEnd } from "@/lib/studio-market/plans";
import { templateText } from "@/lib/studio-market/templates";
import { templateKinds } from "@/lib/studio-market/kinds";
import { sampleEntries } from "@/lib/studio/sample-entries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("studioMarket.checkoutTitle") };
}
export const dynamic = "force-dynamic";

/**
 * 106.2 Checkout (screen 3), in the market's look (A in light, B in dark):
 * a paid template's plan and the app it goes on, or a renewal's plan, then
 * Pay on the gateway's page. Only the account's owner pays. 106.12 Each
 * plan at its price now: the better of its automatic price (a price drop or
 * a flash sale) or the code in the address (`?code=`, applied from the
 * page), with the original price, the discount and the total; the payment
 * works it out again on the server.
 */
export default async function CheckoutPage({ params, searchParams }: PageProps<"/dashboard/studio-market/checkout/[slug]">) {
  const context = await requireClient("billing");
  const { t, k, lang } = await dashboardText();
  const store = await getStore();
  const now = new Date();
  const template = await store.getMarketTemplateBySlug((await params).slug);
  if (!template || template.status !== "published" || !template.currentVersionId) notFound();
  const plans = offeredPlans(template);
  const page = `/dashboard/studio-market/t/${template.slug}`;
  if (!plans.length || template.clientId === context.client.id) redirect(page);
  const query = await searchParams;
  const one = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");
  const renew = one("renew") ? await store.getTemplateLicence(one("renew")) : null;
  if (one("renew") && (!renew || renew.clientId !== context.client.id || renew.templateId !== template.id || !renewable(renew))) redirect("/dashboard/studio-market/mine");
  const [designer, version, account, billing] = await Promise.all([
    store.getTemplateDesigner(template.designerId),
    store.getMarketTemplateVersion(template.currentVersionId),
    yallappPlanAccount(store, encryptionKey()),
    yallappBilling(store),
  ]);
  const text = templateText(template, lang);

  // A renewal extends from the end date while the plan runs, from today once it ended.
  const start = renew && renew.status === "active" && renew.endsAt && renew.endsAt.getTime() > now.getTime() ? renew.endsAt : now;

  // 106.12 The automatic discounts and the buyer's code: each plan's price now, the better of the two.
  const automatic = (await automaticDiscounts(store, [template.id], now)).get(template.id) ?? [];
  const typed = one("code").trim().slice(0, 40);
  const code = typed ? normalizeCode(typed) : "";
  let coupon: MarketDiscount | null = null;
  let codeProblem: string | null = null;
  if (code) {
    const found = await store.findMarketCoupon(template.id, code);
    const uses = found?.usageLimit != null ? ((await store.countMarketDiscountUses([found.id]))[found.id] ?? 0) : 0;
    const problem = couponProblem(found, uses, now);
    if (problem) codeProblem = CODE_PROBLEM_MESSAGES[problem];
    else coupon = found;
  }
  const usd = (cents: number) => ltr(formatUsd(cents), lang);
  const planName = (period: string) => t(`studioMarket.plan_${period as (typeof plans)[number]["period"]}`);
  const quotes = plans.map((p) => quotePlan(p, automatic, coupon, now));
  const perMonth = quotes.flatMap((q) => {
    const cents = perMonthCents({ period: q.period, cents: q.cents });
    return cents === null ? [] : [{ period: q.period, cents }];
  });
  const best = perMonth.length > 1 ? perMonth.reduce((a, b) => (b.cents < a.cents ? b : a)).period : null;
  const rows: CheckoutPlan[] = quotes.map((q) => {
    const charge = account ? chargeFor(q.cents, account.provider, billing.egpPerUsd) : null;
    const month = perMonthCents({ period: q.period, cents: q.cents });
    const end = periodEnd(start, q.period);
    const won = q.wins === "code" ? q.code : q.wins === "auto" ? q.auto : null;
    const note: CheckoutPlan["codeNote"] = !coupon
      ? null
      : q.wrongPlan
        ? { tone: "warn", text: t("marketDiscounts.codeWrongPlan", { plan: planName(q.period) }) }
        : q.wins === "code"
          ? { tone: "good", text: t("marketDiscounts.codeWins") }
          : q.code && q.auto
            ? { tone: "info", text: t(q.code.cents === q.auto.cents ? "marketDiscounts.autoTies" : "marketDiscounts.autoWins") }
            : null;
    return {
      period: q.period,
      name: planName(q.period),
      cents: q.cents,
      price: usd(q.cents),
      list: q.cents < q.listCents ? usd(q.listCents) : null,
      discount: won
        ? {
            label: won.discount.kind === "coupon" ? t("marketDiscounts.lineCode", { code: won.discount.code ?? "" }) : t(won.discount.kind === "flash" ? "marketDiscounts.lineFlash" : "marketDiscounts.lineDrop"),
            amount: `−${usd(q.listCents - q.cents)}`,
            kind: won.discount.kind,
          }
        : null,
      flashEndsAt: q.wins === "auto" && q.auto?.discount.kind === "flash" ? (q.auto.discount.endsAt?.toISOString() ?? null) : null,
      codeNote: note,
      sub: month === null ? t("studioMarket.lifeHint") : t("studioMarket.perMonth", { price: usd(month) }),
      charged: charge && charge.currency !== "USD" ? ltr(formatAmount(charge.cents, charge.currency), lang) : null,
      ends: end ? formatDate(end, lang) : null,
      best: q.period === best,
    };
  });
  const off = coupon ? (coupon.offType === "percent" ? ltr(`${coupon.offValue}%`, lang) : usd(coupon.offValue)) : "";
  const codeState = code
    ? {
        value: code,
        applied: Boolean(coupon),
        problem: codeProblem,
        summary: coupon
          ? coupon.plans === null
            ? t("marketDiscounts.codeAppliedAll", { code, off })
            : t("marketDiscounts.codeAppliedSome", { code, off, plans: formatList(lang, coupon.plans.map(planName)) })
          : null,
      }
    : null;

  const kinds = formatList(lang, templateKinds(template).map((x) => k(x.name)), "disjunction");
  const licences = await store.listTemplateLicences({ clientId: context.client.id, templateId: template.id });
  const apps: CheckoutApp[] = context.apps
    .map((app) => {
      const kind = kindOf(app);
      const problem = appProblem(template, app);
      const taken = licences.some((l) => l.status === "active" && l.appId === app.id);
      return {
        id: app.id,
        name: appLabel(app),
        icon: kind.icon as IconName,
        line: k(kind.name),
        problem: taken ? t("studioMarket.alreadyHere") : problem === "kind" ? t("studioMarket.madeFor", { kinds }) : problem === "not_studio" ? t("studioMarket.notStudio") : null,
      };
    })
    .sort((a, b) => Number(Boolean(a.problem)) - Number(Boolean(b.problem)));
  const wanted = one("app");
  const fits = (id: string) => apps.some((a) => a.id === id && !a.problem);
  const initialApp = fits(wanted) ? wanted : context.app && fits(context.app.id) ? context.app.id : (apps.find((a) => !a.problem)?.id ?? "later");
  const initialPlan = plans.some((p) => p.period === one("plan")) ? one("plan") : (best ?? plans[0]!.period);
  const renewApp = renew?.appId ? (context.apps.find((a) => a.id === renew.appId) ?? null) : null;
  const unavailable = !account || !chargeFor(plans[0]!.cents, account.provider, billing.egpPerUsd) ? CHECKOUT_MESSAGES.unavailable : null;

  return (
    <MarketPhones pickable={{ items: {}, categories: {}, samples: sampleEntries(now) }}>
      <div className="mk mk-page flex flex-col gap-6">
        <MarketHeader
          back={{ href: page, label: text.title }}
          eyebrow={t("studioMarket.nav")}
          title={t(renew ? "studioMarket.renewTitle" : "studioMarket.checkoutTitle")}
          lead={t(renew ? "studioMarket.renewLead" : "studioMarket.checkoutLead")}
        />
        <CheckoutForm
          slug={template.slug}
          title={text.title}
          designer={designer?.name ?? ""}
          cover={version ? coverView(version.cover, version.languages, lang, text.title) : null}
          plans={rows}
          apps={apps}
          initialPlan={initialPlan}
          initialApp={initialApp}
          renew={renew ? { licenceId: renew.id, app: renewApp ? appLabel(renewApp) : null, from: start === now ? t("studioMarket.fromToday") : formatDate(start, lang) } : null}
          afterEnd={template.afterEnd}
          provider={account ? PROVIDER_NAME[account.provider] : "Kashier"}
          unavailable={unavailable}
          code={codeState}
          sale={quotes.some((q) => q.auto !== null) || Boolean(coupon)}
        />
      </div>
    </MarketPhones>
  );
}
