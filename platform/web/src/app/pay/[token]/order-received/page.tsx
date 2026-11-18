import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { signingSecret } from "@/lib/env";
import { orderReceiptUrl } from "@/lib/receipts/links";
import { orderNumber } from "@/lib/catalog/settings";
import { awaitingManualPayment } from "@/lib/catalog/manual";
import { formatCents } from "@/lib/catalog/money";
import { fulfilmentOf } from "@/lib/catalog/fulfilment";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { PayShell, textOn } from "../shell";
import { BackToApp } from "../back-to-app";
import { appReturnLink, fromAppSheet, type AppReturnResult } from "@/lib/payments/app-return";
import { paidWithoutPlaces } from "@/lib/events/holds";
import { fill, payLangOf, payWords } from "@/lib/catalog/pay-words";

export const metadata: Metadata = { title: "Order received", robots: { index: false } };
export const dynamic = "force-dynamic";

/** After a payment (96.2 or an order placed to pay by bank transfer or the owner's own method). The app watches for "order-received" in the address to empty its cart. */
/** 96.2 The day to pay by, in the business's time zone, as in the email. */
const dueDate = (iso: string, zone: string, lang = "en") => new Date(iso).toLocaleDateString(lang === "ar" ? "ar" : lang === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: zone });

export default async function OrderReceivedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = await getStore();
  const order = await store.getCatalogOrderByToken(sha256Hex(token));
  const app = order ? await store.getAppById(order.appId) : null;
  const paid = order?.status === "processing" || order?.status === "completed";
  // 49 Paid after the places held for it were released, and the event filled up meanwhile.
  const noPlaces = Boolean(order && app?.connector?.kind === "events" && paidWithoutPlaces(order, await store.listTickets({ appId: app.id, orderId: order.id })));
  // 134 A connected store's payment in the app: its order is on the shop's platform, or the shop confirms it.
  const platformOrder = order && app && paid ? await store.getStorePlatformOrder(app.id, order.id) : null;
  // 168 In the customer's language, as the payment page.
  const lang = payLangOf(order);
  const w = payWords(lang);
  const shop = app?.appName ?? w.theShop;
  // 170 The app's payment in the phone's browser sheet: back to the app, by itself once it's paid (not when there's more to read here).
  const back: { result: AppReturnResult; auto: boolean } | null =
    order && app && fromAppSheet(await cookies())
      ? platformOrder
        ? { result: "paid", auto: true }
        : noPlaces
          ? { result: "paid", auto: false }
          : awaitingManualPayment(order)
            ? { result: "placed", auto: false }
            : paid
              ? { result: "paid", auto: true }
              : { result: "pending", auto: false }
      : null;
  return (
    <PayShell app={app} lang={lang}>
      {platformOrder ? (
        platformOrder.status === "placed" ? (
          <>
            <Icon name="check_circle" size={48} filled className="text-success" />
            <h1 className="m-0 text-[24px] font-extrabold">{w.thankYou}</h1>
            <p className="m-0 text-[16px] leading-relaxed text-ink-4" data-shop-order="placed">
              {fill(w.placedOnPlatform, { number: platformOrder.platformOrderNumber ?? "", app: app?.appName ?? w.theShopLower }).replace("  ", " ")}
            </p>
          </>
        ) : (
          <>
            <Icon name="schedule" size={48} className="text-ink-4" />
            <h1 className="m-0 text-[24px] font-extrabold">{w.paymentReceived}</h1>
            <p className="m-0 text-[16px] leading-relaxed text-ink-4" data-shop-order="confirming">
              {fill(w.willConfirm, { amount: formatCents(order!.totalCents, order!.currency), app: shop })}
            </p>
          </>
        )
      ) : noPlaces ? (
        <>
          <Icon name="info" size={48} className="text-ink-4" />
          <h1 className="m-0 text-[24px] font-extrabold">{w.noPlacesTitle}</h1>
          <p className="m-0 text-[16px] leading-relaxed text-ink-4">
            {fill(w.noPlacesText, { number: orderNumber(order!), app: app?.appName ?? w.theOrganiser })}
          </p>
        </>
      ) : order && awaitingManualPayment(order) ? (
        // 96.2 Placed to pay by bank transfer or the owner's own method: how to pay, until the owner marks it paid.
        <>
          <Icon name="schedule" size={48} className="text-ink-4" />
          <h1 className="m-0 text-[24px] font-extrabold">{w.orderPlaced}</h1>
          <p className="m-0 text-[16px] leading-relaxed text-ink-4">
            {fill(w.waitingPayment, { number: orderNumber(order), amount: formatCents(order.totalCents, order.currency), date: dueDate(order.manualPayment!.dueAt, (app && fulfilmentOf(app)?.timezone) ?? "Europe/Istanbul", lang), app: shop })}
          </p>
          <div className="flex w-full flex-col gap-1 rounded-xl bg-sand px-4 py-3 text-start text-[15px]">
            <span className="font-semibold">{order.manualPayment!.name}</span>
            <span className="whitespace-pre-line">{order.manualPayment!.instructions}</span>
          </div>
          <p className="m-0 text-[14px] text-muted">{w.emailed}</p>
        </>
      ) : paid ? (
        <>
          <Icon name="check_circle" size={48} filled className="text-success" />
          <h1 className="m-0 text-[24px] font-extrabold">{w.thankYou}</h1>
          <p className="m-0 text-[16px] leading-relaxed text-ink-4">
            {fill(
              app?.connector?.kind === "bookings"
                ? // 27 A gym's membership: it runs from now.
                  app.demo
                  ? w.membershipDemo
                  : w.membership
                : app?.demo
                  ? w.demoOrder
                  : w.paidOrder,
              { number: orderNumber(order!) },
            )}
          </p>
          {/* 71 The receipt as a PDF (also emailed to the customer). */}
          {order!.paidAt ? (
            <a href={orderReceiptUrl("", order!.appId, order!.id, signingSecret())} download className={`${btn.secondary} h-11 px-4 text-[15px]`}>
              <Icon name="download" size={20} />
              {w.receipt}
            </a>
          ) : null}
        </>
      ) : (
        <>
          <h1 className="m-0 text-[24px] font-extrabold">{w.notPaidTitle}</h1>
          <p className="m-0 text-[16px] leading-relaxed text-ink-4">
            {w.notPaidText}
          </p>
        </>
      )}
      {back && order && app ? <BackToApp label={w.backToApp} href={appReturnLink(app.id, order.id, back.result)} auto={back.auto} color={app.primaryColor} textColor={textOn(app.primaryColor)} /> : null}
    </PayShell>
  );
}
