import type { DataStore } from "../data/store";
import type {
  CatalogOrder,
  HostedUser,
  ShipmentPlace,
  StoreFlashSale,
} from "../data/types";
import { orderDeliveryJson } from "../selling/gifts";
import { bouquetPartJson } from "../selling/bouquet";
import type { Lang } from "@/i18n/config";
import { money } from "./sales";

/**
 * 132 An order as Yallapp Business draws it, beside what the dashboard's
 * order page shows: who ordered (the payment page's details; else the gift
 * checkout's sender; else the app's own account of the person signed in,
 * the hosted store's customer, as a demo order or one placed before the
 * payment page asked has nothing else), where it goes (the recipient, the
 * restaurant's delivery address or the buyer's, with the place's city,
 * country and pin), its lines with their product (an add-on's `addon_of`
 * names one) and flash sale, and what the total is made of. Only for the
 * person's own app, through `appScope` and the app's own store lookups.
 */

type Account = Pick<HostedUser, "name" | "phone" | "email" | "city">;
type Sale = Pick<StoreFlashSale, "title" | "titles" | "discount">;

/** What the orders on a page need beyond themselves, read once for all of them. */
export interface OrderExtras {
  /** The app's accounts of those who checked out with no details kept, by their user ID. */
  accounts: Map<number, Account>;
  /** The flash sales the lines were bought at, by ID. */
  sales: Map<number, Sale>;
  lang: Lang;
}

/** The accounts and flash sales `orders` need, from the app's own store only. */
export async function orderExtras(
  store: DataStore,
  appId: string,
  orders: CatalogOrder[],
  lang: Lang,
): Promise<OrderExtras> {
  const userIds = [
    ...new Set(
      orders
        .filter((o) => !o.customer && !o.delivery?.sender && o.userId !== null)
        .map((o) => o.userId!),
    ),
  ];
  const saleIds = [
    ...new Set(
      orders.flatMap((o) =>
        o.lines.flatMap((l) => (l.flashSaleId ? [l.flashSaleId] : [])),
      ),
    ),
  ];
  const [users, sales] = await Promise.all([
    Promise.all(userIds.map((id) => store.getHostedUser(appId, id))),
    Promise.all(saleIds.map((id) => store.getFlashSale(appId, id))),
  ]);
  return {
    accounts: new Map(
      users.flatMap((u) =>
        u && u.appId === appId ? [[u.id, u] as const] : [],
      ),
    ),
    sales: new Map(
      sales.flatMap((s) =>
        s && s.appId === appId ? [[s.id, s] as const] : [],
      ),
    ),
    lang,
  };
}

const text = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/** `Order.customer`: who ordered, and where the details come from; null when nothing is known. */
export function orderCustomerJson(
  order: CatalogOrder,
  account: Account | null | undefined,
) {
  const c = order.customer;
  if (c)
    return {
      name: c.name,
      phone: text(c.phone),
      email: text(c.email),
      city: text(c.city),
      address: text(c.address),
      source: "checkout" as const,
    };
  // 131 The gift checkout asks the sender; the payment page fills from it but a demo order never sees one.
  const s = order.delivery?.sender;
  if (s)
    return {
      name: s.name,
      phone: text(s.phone),
      email: text(s.email),
      city: null,
      address: null,
      source: "sender" as const,
    };
  if (account)
    return {
      name: account.name,
      phone: text(account.phone),
      email: text(account.email),
      city: text(account.city),
      address: null,
      source: "account" as const,
    };
  return null;
}

type Customer = ReturnType<typeof orderCustomerJson>;

/**
 * `Order.deliver_to`: where it goes and who takes it; null for a pickup, or
 * an order with nothing to deliver and no address.
 */
export function deliverToJson(order: CatalogOrder, customer: Customer) {
  const place = order.delivery?.place ?? null;
  const pin = {
    country: text(place?.country),
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
  };
  // 26 A restaurant's order: its own delivery address, chosen in the app.
  if (order.fulfilment) {
    const a = order.fulfilment.address;
    if (order.fulfilment.type !== "delivery" || !a) return null;
    return {
      person: "customer" as const,
      name: customer?.name ?? null,
      phone: customer?.phone ?? null,
      address: text(a.address),
      city: text(a.district),
      notes: text(a.notes),
      ...pin,
    };
  }
  // 131 Someone else receives it: the recipient's own name, phone and address.
  const r = order.delivery?.recipient;
  if (r)
    return {
      person: "recipient" as const,
      name: r.name,
      phone: text(r.phone),
      address: text(r.address) ?? customer?.address ?? null,
      city: text(place?.city) ?? customer?.city ?? null,
      notes: null,
      ...pin,
    };
  const physical = order.lines.some((l) => !l.digital);
  const address = physical ? (customer?.address ?? null) : null;
  const city =
    text(place?.city) ?? (physical ? (customer?.city ?? null) : null);
  if (!address && !city && pin.lat === null) return null;
  return {
    person: "customer" as const,
    name: customer?.name ?? null,
    phone: customer?.phone ?? null,
    address,
    city,
    notes: null,
    ...pin,
  };
}

/** `Order.delivery`: the day and slot, both people, the card (who signs it), the place, the zone and the fee with its breakdown. */
export function ownerDeliveryJson(order: CatalogOrder, customer: Customer) {
  const d = order.delivery;
  if (!d) return null;
  const m = (cents: number) => money(cents, order.currency);
  // 132 Where it goes (the standard checkout's place) is a delivery detail too.
  const base =
    orderDeliveryJson(d, null) ??
    (d.place || d.shipping
      ? {
          date: null,
          slot: null,
          fee: null,
          sender: null,
          recipient: null,
          gift_message: null,
          anonymous: false,
        }
      : null);
  if (!base) return null;
  const place = d.place
    ? {
        country: text(d.place.country),
        city: text(d.place.city),
        lat: d.place.lat,
        lng: d.place.lng,
      }
    : null;
  return {
    ...base,
    // The owner sees the sender always; the card is signed with their name unless it is sent anonymously.
    signed_by: d.anonymous
      ? null
      : (d.sender?.name ?? (d.message ? (customer?.name ?? null) : null)),
    place,
    fee: d.feeCents ? m(d.feeCents) : null,
    zone: d.shipping?.zone ?? null,
    shipping_fee: d.shipping ? m(d.shipping.cents) : null,
    breakdown: d.shipping
      ? d.shipping.breakdown.map((l) => ({
          label: l.label,
          rule: l.rule ?? null,
          amount: m(l.cents),
        }))
      : [],
  };
}

function saleTitle(sale: Sale, lang: Lang): string {
  return text(sale.titles?.[lang]) ?? sale.title;
}

/** `Order.lines`: each with its product (an add-on's `addon_of` names its item's), its total and the flash sale it was bought at. */
export function orderLinesJson(
  order: CatalogOrder,
  extras: Pick<OrderExtras, "sales" | "lang">,
) {
  const m = (cents: number) => money(cents, order.currency);
  return order.lines.map((l) => {
    const sale = l.flashSaleId ? extras.sales.get(l.flashSaleId) : undefined;
    return {
      product_id: l.productId,
      name: l.name,
      quantity: l.quantity,
      unit: m(l.unitCents),
      total: m(l.unitCents * l.quantity),
      options: (l.options ?? []).map((o) => `${o.group}: ${o.name}`),
      variant: l.variant ?? null,
      digital: l.digital,
      // 131 A gift add-on's line says the product it went with.
      ...(l.addonOf ? { addon_of: l.addonOf } : {}),
      // 162 A line of a bouquet the customer built: the bouquet, its part, the card's message.
      ...(l.bouquet ? { bouquet: bouquetPartJson(l.bouquet) } : {}),
      flash_sale: l.flashSaleId
        ? {
            id: l.flashSaleId,
            title: sale ? saleTitle(sale, extras.lang) : null,
            percent:
              sale?.discount.kind === "percent" ? sale.discount.percent : null,
          }
        : null,
    };
  });
}

/** `Order.amounts`: the products, the coupon and points taken off, the shipping (with the slot's fee), the tax, the total. */
export function orderAmountsJson(order: CatalogOrder) {
  const m = (cents: number) => money(cents, order.currency);
  return {
    subtotal: m(order.subtotalCents),
    discount: order.discountCents
      ? { code: order.couponCode ?? null, amount: m(order.discountCents) }
      : null,
    points: order.points?.used
      ? { used: order.points.used, amount: m(order.points.discountCents) }
      : null,
    shipping: order.shippingCents > 0 ? m(order.shippingCents) : null,
    tax: order.tax?.cents
      ? {
          label: order.tax.label,
          included: order.tax.included,
          amount: m(order.tax.cents),
        }
      : null,
    total: m(order.totalCents),
  };
}

/** 132 A Studio engine's place (a drop-off, a pickup): the details and the pin beside the address. */
export function placePinJson(place: ShipmentPlace | null | undefined) {
  return {
    details: text(place?.details),
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
  };
}
