import { createHmac } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";

/**
 * 37 Fake Kashier and Fawaterk for end-to-end tests, like the fake iyzico of
 * catalog.spec.ts. Each makes its payments, shows a cut-down payment page
 * whose button pays, posts the signed webhook to our server (as the real
 * ones do, server to server), then sends the browser back. Our server reads
 * each payment back from here before marking anything paid.
 */

export interface FakeGateway {
  server: Server;
  /** The requests our server made, path and auth header. */
  calls: { method: string; path: string; authorization: string | undefined }[];
  /** The webhooks posted to our server, and its answers. */
  webhooks: { url: string; status: number; body: unknown }[];
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

/** Kashier: sessions, their payment read-back, the merchant check, and the hosted page. */
export async function startFakeKashier(port: number): Promise<FakeGateway> {
  const base = `http://localhost:${port}`;
  const calls: FakeGateway["calls"] = [];
  const webhooks: FakeGateway["webhooks"] = [];
  const sessions = new Map<string, { body: Record<string, unknown>; apiKey: string; paid: boolean }>();
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
      return send({ _id: id, status: "CREATED", sessionUrl: `${base}/session/${id}?mode=test` });
    }
    const read = /^\/v3\/payment\/sessions\/([^/]+)\/payment$/.exec(url.pathname);
    if (read) {
      const session = sessions.get(read[1]!);
      if (!session) return send({ message: "Not found" }, 404);
      const { body: s } = session;
      return send({ data: { status: session.paid ? "SUCCESS" : "PENDING", amount: s.amount, currency: s.currency, merchantOrderId: s.order, transactionId: `TX-${read[1]}` } });
    }
    const hosted = /^\/session\/([^/]+)(\/pay)?$/.exec(url.pathname);
    if (hosted) {
      const id = hosted[1]!;
      const session = sessions.get(id)!;
      if (!hosted[2]) {
        response.writeHead(200, { "content-type": "text/html" }).end(page("Kashier", String(session.body.amount), `${base}/session/${id}/pay`));
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
      response.writeHead(303, { location: back.toString() }).end();
      return;
    }
    send({ message: "Not found" }, 404);
  });
  await listen(server, port);
  return { server, calls, webhooks, close: () => new Promise((resolve) => server.close(() => resolve())) };
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
  return { server, calls, webhooks, close: () => new Promise((resolve) => server.close(() => resolve())) };
}
