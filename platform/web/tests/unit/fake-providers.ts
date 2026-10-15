/**
 * 37 Fake Kashier and Fawaterk APIs for unit tests: a `fetch` that records
 * each request and keeps the sessions and invoices it made, which a test
 * then pays (or tampers with) before the payment is read back.
 */

export interface Recorded {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | null;
}

function record(calls: Recorded[], url: string, init: RequestInit | undefined): Recorded {
  const headers = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
  const call = { method: init?.method ?? "GET", url, headers, body: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null };
  calls.push(call);
  return call;
}

export interface KashierSession {
  id: string;
  body: Record<string, unknown>;
  /** What the read-back answers; a test changes it. */
  payment: Record<string, unknown>;
}

/** Kashier: POST /v3/payment/sessions, GET /v3/payment/sessions/{id}/payment, GET /merchant. */
export function fakeKashier(options: { secretKey?: string } = {}) {
  const calls: Recorded[] = [];
  const sessions = new Map<string, KashierSession>();
  const fetcher = (async (url: string, init?: RequestInit) => {
    const call = record(calls, url, init);
    const path = new URL(url).pathname;
    if (options.secretKey && call.headers.authorization !== options.secretKey) return Response.json({ status: "UNAUTHORIZED" }, { status: 401 });
    if (path === "/merchant") return Response.json({ response: { accountType: "PF" } });
    if (path === "/v3/payment/sessions" && call.method === "POST") {
      const id = `sess${sessions.size + 1}abcdef`;
      const body = call.body!;
      sessions.set(id, {
        id,
        body,
        payment: { status: "PENDING", amount: body.amount, currency: body.currency, merchantOrderId: body.order },
      });
      return Response.json({ _id: id, status: "CREATED", sessionUrl: `https://payments.kashier.test/session/${id}?mode=test` });
    }
    const read = /^\/v3\/payment\/sessions\/([^/]+)\/payment$/.exec(path);
    if (read) {
      const session = sessions.get(decodeURIComponent(read[1]!));
      return session ? Response.json({ data: session.payment }) : Response.json({ message: "Not found" }, { status: 404 });
    }
    return Response.json({ message: "Not found" }, { status: 404 });
  }) as unknown as typeof fetch;
  const pay = (id: string, extra: Record<string, unknown> = {}) => {
    const session = sessions.get(id)!;
    session.payment = { ...session.payment, status: "SUCCESS", transactionId: `TX-${id}`, ...extra };
  };
  return { fetcher, calls, sessions, pay };
}

export interface FawaterkInvoice {
  id: number;
  key: string;
  body: Record<string, unknown>;
  data: Record<string, unknown>;
}

/** Fawaterk: POST /api/v2/createInvoiceLink, GET /api/v2/getInvoiceData/{id}, GET /api/v2/getPaymentmethods. */
export function fakeFawaterk(options: { apiKey?: string } = {}) {
  const calls: Recorded[] = [];
  const invoices = new Map<number, FawaterkInvoice>();
  const fetcher = (async (url: string, init?: RequestInit) => {
    const call = record(calls, url, init);
    const path = new URL(url).pathname;
    if (options.apiKey && call.headers.authorization !== `Bearer ${options.apiKey}`) return Response.json({ status: "error", message: "Unauthenticated." }, { status: 401 });
    if (path === "/api/v2/getPaymentmethods") return Response.json({ status: "success", data: [{ paymentId: 2, name_en: "Visa-Mastercard" }] });
    if (path === "/api/v2/createInvoiceLink") {
      const id = 1000 + invoices.size + 1;
      const body = call.body!;
      const key = `key${id}`;
      invoices.set(id, {
        id,
        key,
        body,
        // As getInvoiceData answers: pay_load comes back as a JSON string.
        data: { invoice_id: id, invoice_key: key, paid: 0, total: body.cartTotal, currency: body.currency, pay_load: JSON.stringify(body.payLoad) },
      });
      return Response.json({ status: "success", data: { invoiceId: id, invoiceKey: key, url: `https://staging.fawaterk.test/invoice/${id}/${key}` } });
    }
    const read = /^\/api\/v2\/getInvoiceData\/(\d+)$/.exec(path);
    if (read) {
      const invoice = invoices.get(Number(read[1]));
      return invoice ? Response.json({ status: "success", data: invoice.data }) : Response.json({ status: "error", message: "Not found" }, { status: 404 });
    }
    return Response.json({ status: "error", message: "Not found" }, { status: 404 });
  }) as unknown as typeof fetch;
  const pay = (id: number, extra: Record<string, unknown> = {}) => {
    const invoice = invoices.get(id)!;
    invoice.data = { ...invoice.data, paid: 1, invoice_status: "paid", payment_method: "Card", ...extra };
  };
  return { fetcher, calls, invoices, pay };
}
