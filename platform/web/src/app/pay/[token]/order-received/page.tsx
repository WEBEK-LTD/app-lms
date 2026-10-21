import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";
import { signingSecret } from "@/lib/env";
import { orderReceiptUrl } from "@/lib/receipts/links";
import { orderNumber } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { PayShell } from "../shell";
import { paidWithoutPlaces } from "@/lib/events/holds";

export const metadata: Metadata = { title: "Order received", robots: { index: false } };
export const dynamic = "force-dynamic";

/** After a payment. The app watches for "order-received" in the address to empty its cart. */
export default async function OrderReceivedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = await getStore();
  const order = await store.getCatalogOrderByToken(sha256Hex(token));
  const app = order ? await store.getAppById(order.appId) : null;
  const paid = order?.status === "processing" || order?.status === "completed";
  // 49 Paid after the places held for it were released, and the event filled up meanwhile.
  const noPlaces = Boolean(order && app?.connector?.kind === "events" && paidWithoutPlaces(order, await store.listTickets({ appId: app.id, orderId: order.id })));
  return (
    <PayShell app={app}>
      {noPlaces ? (
        <>
          <Icon name="info" size={48} className="text-ink-4" />
          <h1 className="m-0 text-[24px] font-extrabold">No places left</h1>
          <p className="m-0 text-[16px] leading-relaxed text-ink-4">
            {`Your payment for order ${orderNumber(order!)} arrived after the places held for you were released, and the event is now full, so no tickets were issued. ${app?.appName ?? "The organiser"} will refund your payment.`}
          </p>
        </>
      ) : paid ? (
        <>
          <Icon name="check_circle" size={48} filled className="text-success" />
          <h1 className="m-0 text-[24px] font-extrabold">Thank you!</h1>
          <p className="m-0 text-[16px] leading-relaxed text-ink-4">
            {app?.connector?.kind === "bookings"
              ? // 27 A gym's membership: it runs from now.
                `${app.demo ? `Your demo membership (order ${orderNumber(order!)}) is active. Nothing was charged.` : `Your membership (order ${orderNumber(order!)}) is paid and active.`} Go back to the app to book your classes.`
              : app?.demo
                ? `Your demo order ${orderNumber(order!)} is placed. Nothing was charged. You'll find it in your orders in the app.`
                : `Your order ${orderNumber(order!)} is placed and paid. You'll find it in your orders in the app.`}
          </p>
          {/* 71 The receipt as a PDF (also emailed to the customer). */}
          {order!.paidAt ? (
            <a href={orderReceiptUrl("", order!.appId, order!.id, signingSecret())} download className={`${btn.secondary} h-11 px-4 text-[15px]`}>
              <Icon name="download" size={20} />
              Download receipt (PDF)
            </a>
          ) : null}
        </>
      ) : (
        <>
          <h1 className="m-0 text-[24px] font-extrabold">Order not paid</h1>
          <p className="m-0 text-[16px] leading-relaxed text-ink-4">
            We couldn&apos;t confirm a payment for this order. Go back to the app and check out again.
          </p>
        </>
      )}
    </PayShell>
  );
}
