/**
 * 96.1 Fake Stripe and PayPal APIs: a handler that keeps the Checkout
 * Sessions, orders and refunds it made, which a test then pays (or tampers
 * with) before the payment is read back. `fetcher` serves unit tests; the
 * end-to-end tests run the same handler behind a local HTTP server.
 */

export interface FakeRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string;
}

export interface FakeAnswer {
  status: number;
  json: unknown;
}

type Handler = (request: FakeRequest) => FakeAnswer;

export function fetcherFor(handle: Handler, calls: FakeRequest[] = []): typeof fetch {
  return (async (url: string, init?: RequestInit) => {
    const headers = Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v]));
    const request = { method: init?.method ?? "GET", path: new URL(url).pathname + new URL(url).search, headers, body: init?.body ? String(init.body) : "" };
    calls.push(request);
    const answer = handle(request);
    return Response.json(answer.json, { status: answer.status });
  }) as unknown as typeof fetch;
}

const ok = (json: unknown): FakeAnswer => ({ status: 200, json });
const notFound: FakeAnswer = { status: 404, json: { error: { message: "No such object" } } };

export interface StripeSession {
  id: string;
  form: URLSearchParams;
  status: string;
  payment_status: string;
  amount_total: number;
  currency: string;
  client_reference_id: string | null;
  payment_intent: string | null;
  url: string;
}

/** Stripe: POST /v1/checkout/sessions, GET /v1/checkout/sessions/{id}, POST /v1/refunds, GET /v1/balance. */
export function fakeStripe(options: { secretKey?: string; base?: string } = {}) {
  const calls: FakeRequest[] = [];
  const sessions = new Map<string, StripeSession>();
  const refunds: URLSearchParams[] = [];
  const handle: Handler = (request) => {
    const path = request.path.split("?")[0]!;
    if (options.secretKey && request.headers.authorization !== `Bearer ${options.secretKey}`) {
      return { status: 401, json: { error: { message: "Invalid API Key provided" } } };
    }
    if (path === "/v1/balance") return ok({ object: "balance" });
    if (path === "/v1/checkout/sessions" && request.method === "POST") {
      const form = new URLSearchParams(request.body);
      const id = `cs_test_${sessions.size + 1}abcdef`;
      const session: StripeSession = {
        id,
        form,
        status: "open",
        payment_status: "unpaid",
        amount_total: Number(form.get("line_items[0][price_data][unit_amount]")),
        currency: form.get("line_items[0][price_data][currency]") ?? "",
        client_reference_id: form.get("client_reference_id"),
        payment_intent: null,
        url: `${options.base ?? "https://checkout.stripe.test"}/pay/${id}?return=${encodeURIComponent(form.get("success_url") ?? "")}`,
      };
      sessions.set(id, session);
      return ok({ id, object: "checkout.session", url: session.url });
    }
    const read = /^\/v1\/checkout\/sessions\/([^/]+)$/.exec(path);
    if (read && request.method === "GET") {
      const session = sessions.get(decodeURIComponent(read[1]!));
      if (!session) return notFound;
      return ok({
        object: "checkout.session",
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
        currency: session.currency,
        client_reference_id: session.client_reference_id,
        payment_intent: session.payment_intent,
        metadata: { reference: session.client_reference_id },
      });
    }
    if (path === "/v1/refunds" && request.method === "POST") {
      const form = new URLSearchParams(request.body);
      refunds.push(form);
      return ok({ id: `re_${refunds.length}`, object: "refund", status: "succeeded", amount: Number(form.get("amount")) });
    }
    return notFound;
  };
  const pay = (id: string, extra: Partial<StripeSession> = {}) => {
    const session = sessions.get(id)!;
    Object.assign(session, { status: "complete", payment_status: "paid", payment_intent: `pi_${id.slice(-6)}`, ...extra });
  };
  return { handle, fetcher: fetcherFor(handle, calls), calls, sessions, refunds, pay };
}

export interface PaypalOrder {
  id: string;
  body: Record<string, unknown>;
  status: string;
  captureId: string | null;
  /** The captured amount; the order's own until a test changes it. */
  captured: { value: string; currency_code: string } | null;
  url: string;
}

/** PayPal: POST /v1/oauth2/token, POST /v2/checkout/orders, GET /v2/checkout/orders/{id}, POST …/capture, POST /v2/payments/captures/{id}/refund. */
export function fakePaypal(options: { clientId?: string; secret?: string; base?: string } = {}) {
  const calls: FakeRequest[] = [];
  const orders = new Map<string, PaypalOrder>();
  const refunds: { captureId: string; body: Record<string, unknown> }[] = [];
  const unit = (order: PaypalOrder) => {
    const purchase = (order.body.purchase_units as Record<string, unknown>[])[0]!;
    return {
      reference_id: purchase.reference_id,
      custom_id: purchase.custom_id,
      amount: purchase.amount,
      ...(order.captureId
        ? { payments: { captures: [{ id: order.captureId, status: "COMPLETED", custom_id: purchase.custom_id, amount: order.captured ?? purchase.amount }] } }
        : {}),
    };
  };
  const view = (order: PaypalOrder) => ({ id: order.id, status: order.status, purchase_units: [unit(order)] });
  const handle: Handler = (request) => {
    const path = request.path.split("?")[0]!;
    if (path === "/v1/oauth2/token") {
      const expected = options.clientId ? `Basic ${Buffer.from(`${options.clientId}:${options.secret}`).toString("base64")}` : null;
      if (expected && request.headers.authorization !== expected) return { status: 401, json: { error: "invalid_client", error_description: "Client Authentication failed" } };
      return ok({ access_token: "A21-test-token", token_type: "Bearer", expires_in: 32400 });
    }
    if (request.headers.authorization !== "Bearer A21-test-token") return { status: 401, json: { name: "AUTHENTICATION_FAILURE", message: "Authentication failed" } };
    if (path === "/v2/checkout/orders" && request.method === "POST") {
      const id = `5O${orders.size + 1}PAYPAL`;
      const body = JSON.parse(request.body) as Record<string, unknown>;
      const source = body.payment_source as { paypal?: { experience_context?: { return_url?: string } } } | undefined;
      const back = source?.paypal?.experience_context?.return_url ?? "";
      const order: PaypalOrder = { id, body, status: "PAYER_ACTION_REQUIRED", captureId: null, captured: null, url: `${options.base ?? "https://www.paypal.test"}/checkoutnow/${id}?return=${encodeURIComponent(back)}` };
      orders.set(id, order);
      return ok({ id, status: order.status, links: [{ rel: "self", href: `/v2/checkout/orders/${id}` }, { rel: "payer-action", href: order.url }] });
    }
    const capture = /^\/v2\/checkout\/orders\/([^/]+)\/capture$/.exec(path);
    if (capture && request.method === "POST") {
      const order = orders.get(decodeURIComponent(capture[1]!));
      if (!order) return notFound;
      if (order.status !== "APPROVED") return { status: 422, json: { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "ORDER_NOT_APPROVED", description: "Payer has not yet approved the Order for payment." }] } };
      order.status = "COMPLETED";
      order.captureId = `CAP-${order.id}`;
      return { status: 201, json: view(order) };
    }
    const read = /^\/v2\/checkout\/orders\/([^/]+)$/.exec(path);
    if (read && request.method === "GET") {
      const order = orders.get(decodeURIComponent(read[1]!));
      return order ? ok(view(order)) : notFound;
    }
    const refund = /^\/v2\/payments\/captures\/([^/]+)\/refund$/.exec(path);
    if (refund && request.method === "POST") {
      refunds.push({ captureId: decodeURIComponent(refund[1]!), body: JSON.parse(request.body) as Record<string, unknown> });
      return { status: 201, json: { id: `RF-${refunds.length}`, status: "COMPLETED" } };
    }
    return notFound;
  };
  /** The customer approves the order on PayPal's page (it is captured when Yallapp reads it back). */
  const approve = (id: string, captured: PaypalOrder["captured"] = null) => {
    const order = orders.get(id)!;
    order.status = "APPROVED";
    order.captured = captured;
  };
  return { handle, fetcher: fetcherFor(handle, calls), calls, orders, refunds, approve };
}
