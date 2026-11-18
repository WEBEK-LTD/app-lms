import { createHmac } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";

/**
 * 37 Fake Kashier and Fawaterk for end-to-end tests, like the fake iyzico of
 * catalog.spec.ts. Each makes its payments, shows a cut-down payment page
 * whose button pays, posts the signed webhook to our server (as the real
 * ones do, server to server), then sends the browser back. Our server reads
 * each payment back from here before marking anything paid. 153 Kashier's
 * page also works in a frame on our payment page, and iyzico's form comes
 * with a fake of its Checkout Form script (fakeIyzicoFormContent).
 */

export interface FakeGateway {
  server: Server;
  /** The requests our server made, path and auth header. */
  calls: { method: string; path: string; authorization: string | undefined }[];
  /** The webhooks posted to our server, and its answers. */
  webhooks: { url: string; status: number; body: unknown }[];
  /** 52 Kashier: the payments our server started (amount and currency as sent). */
  started?: Record<string, unknown>[];
  /** 47 Kashier: the refunds asked for (PUT /v3/orders/{orderId}/), with their order, auth header and body. */
  refunds: { orderId: string; authorization: string | undefined; body: Record<string, unknown> }[];
  /** 153 Kashier: the sessions paid in a frame on our payment page. */
  paidInFrame?: string[];
  close: () => Promise<void>;
}

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => resolve(body));
  });
}

async function listen(server: Server, port: number): Promise<void> {
  await new Promise<void>((resolve) => server.listen(port, resolve));
}

const page = (title: string, total: string, action: string) =>
  `<!doctype html><title>${title}</title><p>Total ${total}</p><form method="post" action="${action}"><button>Pay with test card</button></form>`;

/**
 * 153 Kashier's session page, which also works in a frame (developers.kashier.io,
 * Payment sessions): there, it tells the page around it it's loaded
 * (contentLoaded) and, once paid, where it would send the customer
 * (paymentSuccess, then urlRedirection), as Kashier's checkout does, instead
 * of going there itself.
 */
const kashierPage = (total: string, action: string) =>
  `<!doctype html><title>Kashier</title><p>Total ${total}</p><form method="post" action="${action}"><input type="hidden" name="framed" value=""><button>Pay with test card</button></form>` +
  `<script>if (window.parent !== window) { document.querySelector("[name=framed]").value = "1"; window.parent.postMessage({ message: "contentLoaded" }, "*"); }</script>`;

const kashierPaidInFrame = (redirectUrl: string) =>
  `<!doctype html><title>Kashier</title><p>Payment successful</p><script>` +
  `window.parent.postMessage({ message: "paymentSuccess", params: {} }, "*");` +
  `window.parent.postMessage({ message: "urlRedirection", params: { redirectUrl: ${JSON.stringify(redirectUrl)}, redirectMethod: "get" } }, "*");` +
  `</script>`;

/**
 * 153 iyzico's Checkout Form script (`checkoutFormContent`) for a payment,
 * shaped as iyzico's: it loads iyzico's form (the fake bundle below, from
 * `base`) once per page.
 */
export function fakeIyzicoFormContent(base: string, token: string): string {
  return `<script type="text/javascript">if (typeof iyziInit == 'undefined') {var iyziInit = {currency:"TRY",token:"${token}",locale:"en",baseUrl:"${base}",createTag:function(){var iyziJSTag = document.createElement('script');iyziJSTag.setAttribute('src','${base}/checkoutform/v2/bundle.js?v=1');document.head.appendChild(iyziJSTag);}};iyziInit.createTag();}</script>`;
}

/**
 * 153 The fake of iyzico's bundle: it puts iyzico's card page (/pay, in iframe
 * mode) in a frame inside the div `iyzipay-checkout-form`, the look named by
 * the div's class kept on the frame.
 */
export const FAKE_IYZICO_BUNDLE = `(function () {
  var box = document.getElementById("iyzipay-checkout-form");
  if (!box || !window.iyziInit) return;
  var frame = document.createElement("iframe");
  frame.title = "iyzico card form";
  frame.setAttribute("data-fake-iyzico", box.className);
  frame.style.width = "100%";
  frame.style.height = "320px";
  frame.style.border = "0";
  frame.src = window.iyziInit.baseUrl + "/pay?token=" + encodeURIComponent(window.iyziInit.token) + "&iframe=true";
  box.appendChild(frame);
})();`;

/**
 * iyzico's card page, cut down to its last step: it posts the token back to
 * the shop; 153 from its frame on our payment page, to the whole page
 * (target _top), as iyzico's form does.
 */
export function fakeIyzicoCardPage(callbackUrl: string, token: string, framed: boolean): string {
  return `<!doctype html><title>iyzico</title><form method="post" action="${callbackUrl}" target="${framed ? "_top" : "_self"}"><input type="hidden" name="token" value="${token}"><button>Pay with test card</button></form>`;
}

/** Kashier: sessions, their payment read-back, the merchant check, and the hosted page. */
export async function startFakeKashier(port: number): Promise<FakeGateway> {
  const base = `http://localhost:${port}`;
  const calls: FakeGateway["calls"] = [];
  const webhooks: FakeGateway["webhooks"] = [];
  const refunds: FakeGateway["refunds"] = [];
  const sessions = new Map<string, { body: Record<string, unknown>; apiKey: string; paid: boolean }>();
  const started: Record<string, unknown>[] = [];
  const paidInFrame: string[] = [];
  const server = createServer(async (request, response) => {
    const body = await readBody(request);
    const url = new URL(request.url ?? "/", base);
    const authorization = request.headers.authorization;
    calls.push({ method: request.method ?? "GET", path: url.pathname, authorization });
    const send = (json: unknown, status = 200) => response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(json));
    if (url.pathname === "/merchant") return authorization && authorization !== "wrong" ? send({ response: { accountType: "PF" } }) : send({ status: "UNAUTHORIZED" }, 401);
    if (url.pathname === "/v3/payment/sessions" && request.method === "POST") {
      const input = JSON.parse(body) as Record<string, unknown>;
      if (!authorization || !request.headers["api-key"]) return send({ messages: { en: "Missing keys" } }, 401);
      const id = `66f0${(sessions.size + 1).toString().padStart(4, "0")}aa`;
      sessions.set(id, { body: input, apiKey: String(request.headers["api-key"]), paid: false });
      started.push(input);
      return send({ _id: id, status: "CREATED", sessionUrl: `${base}/session/${id}?mode=test` });
    }
    const read = /^\/v3\/payment\/sessions\/([^/]+)\/payment$/.exec(url.pathname);
    if (read) {
      const session = sessions.get(read[1]!);
      if (!session) return send({ message: "Not found" }, 404);
      const { body: s } = session;
      return send({
        data: { status: session.paid ? "SUCCESS" : "PENDING", amount: s.amount, currency: s.currency, merchantOrderId: s.order, transactionId: `TX-${read[1]}`, kashierOrderId: `KO-${read[1]}` },
      });
    }
    // 47 Refunds: PUT /v3/orders/{orderId}/ with the secret key, as on Kashier's fep host.
    const refund = /^\/v3\/orders\/([^/]+)\/?$/.exec(url.pathname);
    if (refund && request.method === "PUT") {
      if (!authorization) return send({ status: "FAILURE", messages: { en: "Unauthorized" } }, 401);
      refunds.push({ orderId: decodeURIComponent(refund[1]!), authorization, body: JSON.parse(body) as Record<string, unknown> });
      return send({ status: "SUCCESS", response: { status: "SUCCESS", transaction: { transactionId: `RF-${refunds.length}`, status: "SUCCESS" } } });
    }
    const hosted = /^\/session\/([^/]+)(\/pay)?$/.exec(url.pathname);
    if (hosted) {
      const id = hosted[1]!;
      const session = sessions.get(id)!;
      if (!hosted[2]) {
        response.writeHead(200, { "content-type": "text/html" }).end(kashierPage(`${String(session.body.amount)} ${String(session.body.currency)}`, `${base}/session/${id}/pay`));
        return;
      }
      session.paid = true;
      const data = {
        merchantOrderId: session.body.order,
        transactionId: `TX-${id}`,
        status: "SUCCESS",
        amount: session.body.amount,
        currency: session.body.currency,
        signatureKeys: ["amount", "currency", "merchantOrderId", "status", "transactionId"],
      };
      const query = data.signatureKeys.map((k) => `${k}=${encodeURIComponent(String(data[k as keyof typeof data]))}`).join("&");
      const signature = createHmac("sha256", session.apiKey).update(query).digest("hex");
      if (session.body.serverWebhook) {
        const hook = await fetch(String(session.body.serverWebhook), {
          method: "POST",
          headers: { "content-type": "application/json", "x-kashier-signature": signature },
          body: JSON.stringify({ event: "pay", data }),
        });
        webhooks.push({ url: String(session.body.serverWebhook), status: hook.status, body: await hook.json().catch(() => null) });
      }
      const back = new URL(String(session.body.merchantRedirect));
      back.searchParams.set("paymentStatus", "SUCCESS");
      back.searchParams.set("merchantOrderId", String(session.body.order));
      // 153 In a frame on our payment page: the page around it is told where to go.
      if (new URLSearchParams(body).get("framed") === "1") {
        paidInFrame.push(id);
        response.writeHead(200, { "content-type": "text/html" }).end(kashierPaidInFrame(back.toString()));
        return;
      }
      response.writeHead(303, { location: back.toString() }).end();
      return;
    }
    send({ message: "Not found" }, 404);
  });
  await listen(server, port);
  return { server, calls, webhooks, started, refunds, paidInFrame, close: () => new Promise((resolve) => server.close(() => resolve())) };
}

/** Fawaterk: invoices, their read-back, the payment methods (connection test), and the invoice page. */
export async function startFakeFawaterk(port: number): Promise<FakeGateway> {
  const base = `http://localhost:${port}`;
  const calls: FakeGateway["calls"] = [];
  const webhooks: FakeGateway["webhooks"] = [];
  const invoices = new Map<number, { body: Record<string, unknown>; apiKey: string; paid: boolean }>();
  const server = createServer(async (request, response) => {
    const body = await readBody(request);
    const url = new URL(request.url ?? "/", base);
    const authorization = request.headers.authorization;
    calls.push({ method: request.method ?? "GET", path: url.pathname, authorization });
    const send = (json: unknown, status = 200) => response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(json));
    const apiKey = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (url.pathname.startsWith("/api/v2/") && (!apiKey || apiKey === "wrong")) return send({ status: "error", message: "Unauthenticated." }, 401);
    if (url.pathname === "/api/v2/getPaymentmethods") return send({ status: "success", data: [{ paymentId: 2, name_en: "Visa-Mastercard" }] });
    if (url.pathname === "/api/v2/createInvoiceLink") {
      const id = 5000 + invoices.size + 1;
      invoices.set(id, { body: JSON.parse(body) as Record<string, unknown>, apiKey: apiKey!, paid: false });
      return send({ status: "success", data: { invoiceId: id, invoiceKey: `key${id}`, url: `${base}/invoice/${id}` } });
    }
    const read = /^\/api\/v2\/getInvoiceData\/(\d+)$/.exec(url.pathname);
    if (read) {
      const invoice = invoices.get(Number(read[1]));
      if (!invoice) return send({ status: "error", message: "Not found" }, 404);
      const { body: b } = invoice;
      return send({ status: "success", data: { invoice_id: Number(read[1]), paid: invoice.paid ? 1 : 0, total: b.cartTotal, currency: b.currency, pay_load: JSON.stringify(b.payLoad) } });
    }
    const hosted = /^\/invoice\/(\d+)(\/pay)?$/.exec(url.pathname);
    if (hosted) {
      const id = Number(hosted[1]);
      const invoice = invoices.get(id)!;
      if (!hosted[2]) {
        response.writeHead(200, { "content-type": "text/html" }).end(page("Fawaterk", String(invoice.body.cartTotal), `${base}/invoice/${id}/pay`));
        return;
      }
      invoice.paid = true;
      const urls = invoice.body.redirectionUrls as Record<string, string>;
      if (urls.webhookUrl) {
        const hashKey = createHmac("sha256", invoice.apiKey).update(`InvoiceId=${id}&InvoiceKey=key${id}&PaymentMethod=Card`).digest("hex");
        const hook = await fetch(urls.webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ hashKey, invoice_key: `key${id}`, invoice_id: id, payment_method: "Card", invoice_status: "paid", pay_load: invoice.body.payLoad, referenceNumber: `REF-${id}` }),
        });
        webhooks.push({ url: urls.webhookUrl, status: hook.status, body: await hook.json().catch(() => null) });
      }
      response.writeHead(303, { location: `${urls.successUrl}?invoice_id=${id}&status=paid` }).end();
      return;
    }
    send({ status: "error", message: "Not found" }, 404);
  });
  await listen(server, port);
  return { server, calls, webhooks, refunds: [], close: () => new Promise((resolve) => server.close(() => resolve())) };
}
