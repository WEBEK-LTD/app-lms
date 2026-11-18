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

/** 132.34 A webhook endpoint the fake Stripe lists (GET /v1/webhook_endpoints). */
export interface StripeEndpoint {
  url: string;
  status: string;
  enabled_events: string[];
}

/** 155 A payment method domain the fake Stripe keeps (docs.stripe.com/api/payment_method_domains/object). */
export interface StripeDomain {
  id: string;
  domain_name: string;
  enabled: boolean;
  livemode: boolean;
  apple_pay: { status: "active" | "inactive"; status_details?: { error_message: string } };
  google_pay: { status: "active" | "inactive"; status_details?: { error_message: string } };
}

/**
 * Stripe: POST /v1/checkout/sessions, GET /v1/checkout/sessions/{id}, POST /v1/refunds, GET /v1/balance;
 * 132.34 GET /v1/account, GET /v1/checkout/sessions (list), GET /v1/webhook_endpoints, POST /v1/payment_intents and …/cancel;
 * 155 GET and POST /v1/payment_method_domains, POST …/{id} and …/{id}/validate (a test may turn a wallet off in `domains`).
 */
export function fakeStripe(options: { secretKey?: string; base?: string; accountName?: string } = {}) {
  const calls: FakeRequest[] = [];
  const sessions = new Map<string, StripeSession>();
  const refunds: URLSearchParams[] = [];
  const endpoints: StripeEndpoint[] = [];
  const intents: { id: string; form: URLSearchParams; status: string; key?: string }[] = [];
  /** 188 A PaymentIntent as Stripe answers it: its client secret, amount, currency and metadata from what was posted. */
  const intentView = (i: { id: string; form: URLSearchParams; status: string }) => ({
    id: i.id,
    object: "payment_intent",
    status: i.status,
    client_secret: `${i.id}_secret_fake`,
    amount: Number(i.form.get("amount")),
    amount_received: i.status === "succeeded" ? Number(i.form.get("amount")) : 0,
    currency: i.form.get("currency") ?? "",
    metadata: { reference: i.form.get("metadata[reference]") ?? undefined },
    livemode: false,
  });
  const domains: StripeDomain[] = [];
  const domainView = (d: StripeDomain) => ({ object: "payment_method_domain", ...d, link: { status: "active" }, paypal: { status: "active" } });
  const handle: Handler = (request) => {
    const path = request.path.split("?")[0]!;
    if (options.secretKey && request.headers.authorization !== `Bearer ${options.secretKey}`) {
      return { status: 401, json: { error: { message: "Invalid API Key provided" } } };
    }
    // 155 Payment method domains: one per domain and mode (a test key's mode is test).
    const livemode = /^Bearer (sk|rk)_live_/.test(request.headers.authorization ?? "");
    if (path === "/v1/payment_method_domains" && request.method === "GET") {
      const name = new URLSearchParams(request.path.split("?")[1] ?? "").get("domain_name");
      const data = domains.filter((d) => d.livemode === livemode && (!name || d.domain_name === name)).map(domainView);
      return ok({ object: "list", url: "/v1/payment_method_domains", data, has_more: false });
    }
    if (path === "/v1/payment_method_domains" && request.method === "POST") {
      const form = new URLSearchParams(request.body);
      const name = form.get("domain_name") ?? "";
      if (!name) return { status: 400, json: { error: { message: "Missing required param: domain_name.", param: "domain_name" } } };
      if (domains.some((d) => d.livemode === livemode && d.domain_name === name)) return { status: 400, json: { error: { message: `The domain ${name} is already registered.` } } };
      const domain: StripeDomain = { id: `pmd_${domains.length + 1}fake`, domain_name: name, enabled: form.get("enabled") !== "false", livemode, apple_pay: { status: "active" }, google_pay: { status: "active" } };
      domains.push(domain);
      return ok(domainView(domain));
    }
    const pmd = /^\/v1\/payment_method_domains\/([^/]+)(\/validate)?$/.exec(path);
    if (pmd && request.method === "POST") {
      const domain = domains.find((d) => d.id === decodeURIComponent(pmd[1]!) && d.livemode === livemode);
      if (!domain) return notFound;
      if (!pmd[2]) {
        const enabled = new URLSearchParams(request.body).get("enabled");
        if (enabled !== null) domain.enabled = enabled === "true";
      }
      return ok(domainView(domain));
    }
    if (path === "/v1/balance") return ok({ object: "balance" });
    if (path === "/v1/account") return ok({ id: "acct_1FakeYallapp", object: "account", country: "AE", default_currency: "aed", charges_enabled: true, business_profile: { name: options.accountName ?? "Test shop" } });
    if (path === "/v1/checkout/sessions" && request.method === "GET") return ok({ object: "list", data: [], has_more: false });
    if (path === "/v1/webhook_endpoints" && request.method === "GET") return ok({ object: "list", data: endpoints.map((e, i) => ({ id: `we_${i + 1}`, object: "webhook_endpoint", ...e })), has_more: false });
    if (path === "/v1/payment_intents" && request.method === "POST") {
      // 188 Stripe's idempotency: the same key answers with the same PaymentIntent.
      const key = request.headers["idempotency-key"];
      const again = key ? intents.find((i) => i.key === key) : undefined;
      if (again) return ok(intentView(again));
      const intent = { id: `pi_test_${intents.length + 1}fake`, form: new URLSearchParams(request.body), status: "requires_payment_method", key };
      intents.push(intent);
      return ok(intentView(intent));
    }
    const readIntent = /^\/v1\/payment_intents\/([^/]+)$/.exec(path);
    if (readIntent && request.method === "GET") {
      const intent = intents.find((i) => i.id === decodeURIComponent(readIntent[1]!));
      return intent ? ok(intentView(intent)) : notFound;
    }
    const cancel = /^\/v1\/payment_intents\/([^/]+)\/cancel$/.exec(path);
    if (cancel && request.method === "POST") {
      const intent = intents.find((i) => i.id === decodeURIComponent(cancel[1]!));
      if (!intent) return notFound;
      // Stripe can't cancel a PaymentIntent that is paid or being paid.
      if (intent.status === "succeeded" || intent.status === "processing") return { status: 400, json: { error: { code: "payment_intent_unexpected_state", message: `This PaymentIntent's status is ${intent.status}.` } } };
      intent.status = "canceled";
      return ok(intentView(intent));
    }
    const expire = /^\/v1\/checkout\/sessions\/([^/]+)\/expire$/.exec(path);
    if (expire && request.method === "POST") {
      const session = sessions.get(decodeURIComponent(expire[1]!));
      if (!session) return notFound;
      if (session.status !== "open") return { status: 400, json: { error: { message: "Only Checkout Sessions with a status in [\"open\"] can be expired." } } };
      session.status = "expired";
      return ok({ id: session.id, object: "checkout.session", status: "expired" });
    }
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
      // 144 Embedded Checkout: the secret Stripe.js mounts its form with, and no page of its own.
      if (form.get("ui_mode") === "embedded") return ok({ id, object: "checkout.session", ui_mode: "embedded", client_secret: `${id}_secret_fake`, url: null });
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
  /** 188 The app's sheet paid this PaymentIntent (or `status`: processing, …). */
  const payIntent = (id: string, status = "succeeded") => {
    intents.find((i) => i.id === id)!.status = status;
  };
  return { handle, fetcher: fetcherFor(handle, calls), calls, sessions, refunds, pay, payIntent, endpoints, intents, domains };
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
