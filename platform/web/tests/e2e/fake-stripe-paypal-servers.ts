import { createServer, type IncomingMessage, type Server } from "node:http";
import { fakePaypal, fakeStripe, type FakeRequest, type StripeDomain, type StripeEndpoint } from "../unit/fake-stripe-paypal";

/**
 * 96.1 The fake Stripe and PayPal of the unit tests behind a local server,
 * with their hosted pages: a button that pays (Stripe) or approves (PayPal)
 * and sends the browser back. Our server reads each payment back from here,
 * and captures PayPal's, before marking anything paid.
 */

export interface FakeServer {
  server: Server;
  calls: FakeRequest[];
  close: () => Promise<void>;
  /** 132.34 Stripe: the webhook endpoints its Dashboard would list (a test adds the shop's). */
  endpoints?: StripeEndpoint[];
  /** Stripe: the Checkout Sessions it made, by ID. */
  sessions?: Map<string, { id: string; client_reference_id: string | null }>;
  /** 155 Stripe: the payment method domains registered (POST /v1/payment_method_domains), for Apple Pay and Google Pay. */
  domains?: StripeDomain[];
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => resolve(body));
  });
}

const page = (title: string, total: string, action: string) =>
  `<!doctype html><title>${title}</title><p>Total ${total}</p><form method="post" action="${action}"><button>Pay with test card</button></form>`;

/**
 * 144 A fake Stripe.js for Embedded Checkout (STRIPE_JS_URL in the e2e
 * server's environment): its "form" is the same button as the hosted page,
 * which pays the session and sends the browser to its return_url, as
 * Stripe's form does.
 */
const fakeStripeJs = (base: string) => `window.Stripe = function (key) {
  return {
    initEmbeddedCheckout: async function (options) {
      const secret = await options.fetchClientSecret();
      const id = secret.split("_secret_")[0];
      const frame = document.createElement("div");
      frame.setAttribute("data-fake-stripe", key);
      frame.innerHTML = '<p>Card number</p><button type="button">Pay with test card</button>';
      frame.querySelector("button").addEventListener("click", function () { window.location.href = ${JSON.stringify(base)} + "/embedded/" + id + "/done"; });
      return { mount: function (el) { el.appendChild(frame); }, destroy: function () { frame.remove(); } };
    },
  };
};`;

async function serve(port: number, handle: (request: FakeRequest) => { status: number; json: unknown }, hosted: (path: string, method: string) => { html?: string; js?: string; redirect?: string } | null) {
  const calls: FakeRequest[] = [];
  const server = createServer(async (request, response) => {
    const body = await readBody(request);
    const url = new URL(request.url ?? "/", `http://localhost:${port}`);
    const own = hosted(url.pathname + url.search, request.method ?? "GET");
    if (own?.html) return response.writeHead(200, { "content-type": "text/html" }).end(own.html);
    if (own?.js) return response.writeHead(200, { "content-type": "application/javascript" }).end(own.js);
    if (own?.redirect) return response.writeHead(303, { location: own.redirect }).end();
    const headers = Object.fromEntries(Object.entries(request.headers).map(([k, v]) => [k, String(v)]));
    const call = { method: request.method ?? "GET", path: url.pathname + url.search, headers, body };
    calls.push(call);
    const answer = handle(call);
    response.writeHead(answer.status, { "content-type": "application/json" }).end(JSON.stringify(answer.json));
  });
  await new Promise<void>((resolve) => server.listen(port, resolve));
  return { server, calls, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

export async function startFakeStripe(port: number, options: { accountName?: string } = {}): Promise<FakeServer> {
  const stripe = fakeStripe({ base: `http://localhost:${port}`, accountName: options.accountName });
  const served = await serve(port, stripe.handle, (path, method) => {
    // 144 Stripe.js, and its embedded form's payment.
    if (path === "/v3/") return { js: fakeStripeJs(`http://localhost:${port}`) };
    const embedded = /^\/embedded\/([^/?]+)\/done$/.exec(path);
    if (embedded) {
      const session = stripe.sessions.get(embedded[1]!);
      if (!session) return { html: "<p>No such session</p>" };
      stripe.pay(session.id);
      return { redirect: session.form.get("return_url")! };
    }
    const match = /^\/pay\/([^/?]+)(\/done)?/.exec(path);
    if (!match) return null;
    const session = stripe.sessions.get(match[1]!);
    if (!session) return { html: "<p>No such session</p>" };
    if (match[2] && method === "POST") {
      stripe.pay(session.id);
      return { redirect: session.form.get("success_url")! };
    }
    return { html: page("Stripe Checkout", (session.amount_total / 100).toFixed(2), `/pay/${session.id}/done`) };
  });
  return { ...served, endpoints: stripe.endpoints, sessions: stripe.sessions, domains: stripe.domains };
}

export async function startFakePaypal(port: number): Promise<FakeServer> {
  const paypal = fakePaypal({ base: `http://localhost:${port}` });
  return serve(port, paypal.handle, (path, method) => {
    const match = /^\/checkoutnow\/([^/?]+)(\/done)?/.exec(path);
    if (!match) return null;
    const order = paypal.orders.get(match[1]!);
    if (!order) return { html: "<p>No such order</p>" };
    if (match[2] && method === "POST") {
      paypal.approve(order.id);
      return { redirect: new URL(order.url).searchParams.get("return")! };
    }
    const amount = ((order.body.purchase_units as { amount: { value: string } }[])[0]!).amount.value;
    return { html: page("PayPal", amount, `/checkoutnow/${order.id}/done`) };
  });
}
