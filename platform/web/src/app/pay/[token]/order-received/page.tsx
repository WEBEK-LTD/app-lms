import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { orderNumber } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { PayShell } from "../shell";

export const metadata: Metadata = { title: "Order received", robots: { index: false } };
export const dynamic = "force-dynamic";

/** After a payment. The app watches for "order-received" in the address to empty its cart. */
export default async function OrderReceivedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const store = await getStore();
  const order = await store.getCatalogOrderByToken(sha256Hex(token));
  const app = order ? await store.getAppById(order.appId) : null;
  const paid = order?.status === "processing" || order?.status === "completed";
  return (
    <PayShell app={app}>
      {paid ? (
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
