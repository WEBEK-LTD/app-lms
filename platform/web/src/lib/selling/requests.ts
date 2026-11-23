import type { App, HostedUser, StoreRequest, StoreRequestStatus } from "../data/types";
import { STORE_REQUEST_STATUSES } from "../data/types";
import type { DataStore } from "../data/store";
import { catalogSettings } from "../catalog/settings";
import { pushToOwner, type OwnerPushDeps } from "../owner/push";
import { pushOwnerSafely } from "../owner/push-env";
import type { FormLine } from "../hosted/pages/forms";

/**
 * 210 Custom-order requests: the answers to a Studio `form` element marked
 * as one (`StudioForm.request` `custom_order`, the custom-order page of the
 * shop types' looks), sent by the app as any form's (so older apps send them
 * too) and kept here besides the email. The owner sees them in Store ›
 * Custom orders (the dashboard) and in Yallapp Business, answers with a
 * price and a time, and moves each one on: new, quoted, accepted, declined,
 * done. Yallapp Business hears of each new one (`new_order`).
 */

export const REQUEST_REPLY_MAX = 2000;
/** A shop keeps at most this many requests waiting for an answer from one person a day (the form's own limits apply first). */
const PHONE = /^\+?[0-9 ()-]{6,30}$/;
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[A-Za-z]{2,}$/;

/** Who asked: the signed-in person, else the phone, email and name they wrote. */
function customerOf(lines: readonly FormLine[], kinds: ReadonlyMap<string, string>, user: HostedUser | null): StoreRequest["customer"] {
  const byKind = (kind: string) => lines.find((l) => kinds.get(l.label) === kind)?.value ?? null;
  const phone = byKind("phone");
  const email = byKind("email");
  // The first short text answer whose label says "name" in any of the app's languages.
  const name = lines.find((l) => /name|اسم|ad[ıi]n/i.test(l.label))?.value ?? null;
  return {
    name: user?.name || name,
    phone: phone && PHONE.test(phone) ? phone : (user?.phone ?? null),
    email: user?.email || (email && EMAIL.test(email) ? email : null),
  };
}

/** A new request from the app's form: kept, and the owner's phones hear of it. */
export async function createStoreRequest(
  deps: { store: DataStore; app: App; now: Date; pushOwner?: typeof pushOwnerSafely },
  input: { title: string; lines: readonly FormLine[]; kinds: ReadonlyMap<string, string>; user: HostedUser | null; lang: string | null },
): Promise<StoreRequest> {
  const { store, app, now } = deps;
  const request = await store.createStoreRequest({
    appId: app.id,
    userId: input.user?.id ?? null,
    title: input.title.slice(0, 200),
    answers: input.lines.map((l) => ({ label: l.label.slice(0, 200), value: l.value.slice(0, 2000) })),
    customer: customerOf(input.lines, input.kinds, input.user),
    status: "new",
    reply: null,
    quoteCents: null,
    currency: catalogSettings(app).currency,
    lang: input.lang,
    createdAt: now,
    updatedAt: now,
  });
  await (deps.pushOwner ?? pushOwnerSafely)((d) => pushNewRequest(d, app, request), store);
  return request;
}

const NEW_REQUEST = {
  en: (name: string | null) => ({ title: "New custom order", body: name ? `${name} sent a custom-order request. Open it to answer with a price.` : "A customer sent a custom-order request. Open it to answer with a price." }),
  ar: (name: string | null) => ({ title: "طلب خاص جديد", body: name ? `${name} بعت طلب خاص. افتحه وردّ بالسعر.` : "عميل بعت طلب خاص. افتحه وردّ بالسعر." }),
  tr: (name: string | null) => ({ title: "Yeni özel sipariş", body: name ? `${name} bir özel sipariş talebi gönderdi. Fiyatla yanıtlamak için açın.` : "Bir müşteri özel sipariş talebi gönderdi. Fiyatla yanıtlamak için açın." }),
};

/** A custom-order request arrived: the owner's (and the team's with Orders) phones on Yallapp Business. */
export function pushNewRequest(deps: OwnerPushDeps, app: App, request: StoreRequest): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  return pushToOwner(deps, app.clientId, "new_order", (w) => NEW_REQUEST[w.lang === "ar" || w.lang === "tr" ? w.lang : "en"](request.customer.name), { app_id: app.id, store_request_id: String(request.id) });
}

export function isRequestStatus(value: unknown): value is StoreRequestStatus {
  return typeof value === "string" && (STORE_REQUEST_STATUSES as readonly string[]).includes(value);
}

/** The owner's answer: the status, the reply and the price quoted (null: none); false when it isn't the app's. */
export async function answerStoreRequest(store: DataStore, appId: string, id: number, patch: { status: StoreRequestStatus; reply: string | null; quoteCents: number | null }, now: Date): Promise<boolean> {
  const reply = patch.reply?.trim() ? patch.reply.trim().slice(0, REQUEST_REPLY_MAX) : null;
  return store.updateStoreRequest(appId, id, { status: patch.status, reply, quoteCents: patch.quoteCents, updatedAt: now });
}

/** A request as the Owner API sends it (Yallapp Business). */
export function storeRequestJson(r: StoreRequest) {
  return {
    id: r.id,
    title: r.title,
    status: r.status,
    answers: r.answers,
    customer: r.customer,
    reply: r.reply,
    quote_cents: r.quoteCents,
    currency: r.currency,
    lang: r.lang,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}
