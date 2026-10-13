import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { formatCents } from "@/lib/catalog/money";
import { checkoutAccount, orderNumber, payLinkExpired } from "@/lib/catalog/settings";
import { sha256Hex } from "@/lib/crypto/tokens";
import { getStore } from "@/lib/data";
import { encryptionKey } from "@/lib/env";
import { PayForm } from "./form";
import { PayShell, textOn } from "./shell";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

/** The payment page an app opens at checkout (apps without a website). */
export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ payment?: string }>;
}) {
  const { token } = await params;
  const { payment } = await searchParams;
  const store = await getStore();
  const order = await store.getCatalogOrderByToken(sha256Hex(token));
  const app = order ? await store.getAppById(order.appId) : null;
  const note = (title: string, text: string) => (
    <PayShell app={app}>
      <h1 className="m-0 text-[24px] font-extrabold">{title}</h1>
      <p className="m-0 text-[16px] leading-relaxed text-ink-4">{text}</p>
    </PayShell>
  );
  if (!order || !app) return note("Link not valid", "This payment link isn't valid. Go back to the app and check out again.");
  if (order.status === "processing" || order.status === "completed") redirect(`/pay/${token}/order-received`);
  if (order.status !== "pending") return note("Order closed", "This order is closed. Go back to the app and check out again.");
  if (payLinkExpired(order, new Date())) return note("Link expired", "This payment link has expired. Go back to the app and check out again.");
  if (!(await checkoutAccount(store, app, encryptionKey()))) return note("Payments are off", "This shop can't take payments right now. Please try again later.");

  const money = (cents: number) => formatCents(cents, order.currency);
  const color = app.primaryColor;
  return (
    <PayShell app={app}>
      <h1 className="m-0 text-[24px] font-extrabold">Checkout</h1>
      {payment === "failed" ? (
        <p role="alert" className="m-0 rounded-xl bg-danger-bg px-4 py-3 text-[15px] font-semibold text-danger">
          The payment didn&apos;t go through. Check your card details and try again.
        </p>
      ) : null}
      <section aria-labelledby="h-order" className="flex flex-col gap-2 rounded-xl border border-line p-4">
        <h2 id="h-order" className="m-0 text-[15px] font-bold">
          Order {orderNumber(order)}
        </h2>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          {order.lines.map((line, i) => (
            <li key={i} className="flex justify-between gap-3 text-[15px]">
              <span className="min-w-0">
                {line.name} <span className="text-muted">× {line.quantity}</span>
              </span>
              <span className="shrink-0">{money(line.unitCents * line.quantity)}</span>
            </li>
          ))}
          {order.shippingCents > 0 ? (
            <li className="flex justify-between gap-3 text-[15px]">
              <span>Shipping</span>
              <span>{money(order.shippingCents)}</span>
            </li>
          ) : null}
        </ul>
        <p className="m-0 flex justify-between border-t border-line-soft pt-2 text-[16px] font-bold">
          <span>Total</span>
          <span>{money(order.totalCents)}</span>
        </p>
      </section>
      <PayForm
        token={token}
        total={money(order.totalCents)}
        color={color}
        textColor={textOn(color)}
        defaults={order.customer ?? undefined}
      />
      <p className="m-0 text-center text-[13px] text-muted">Card payments are processed securely by iyzico.</p>
    </PayShell>
  );
}
