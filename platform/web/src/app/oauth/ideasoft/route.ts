import { decrypt, encrypt } from "@/lib/crypto/encryption";
import { encryptionKey } from "@/lib/env";
import {
  exchangeIdeasoftCode,
  ideasoftAuthorizeUrl,
  IDEASOFT_REDIRECT_URI,
  normalizeIdeasoftHost,
} from "@/lib/hosted/connectors/ideasoft";

/**
 * The redirect URI of IdeaSoft API clients (src/lib/hosted/connectors/ideasoft.ts).
 *
 * IdeaSoft's authorization codes live about 30 seconds, too short to copy into
 * the dashboard by hand. So the client starts here: the form takes the store
 * address, Client ID and Client Secret, keeps them for ten minutes in an
 * encrypted cookie only this browser holds, and sends them to IdeaSoft's
 * approval page with `state` set to the store address. When IdeaSoft sends
 * them back with `?code=&state=`, the code is swapped for tokens right away and
 * the page shows the refresh token (valid about two months) to paste in the
 * dashboard. Nothing is stored on our side. Without the cookie (IdeaSoft's
 * approval page opened by hand) the page shows the code itself.
 */

const COOKIE = "ideasoft_oauth";
const COOKIE_CONTEXT = "oauth:ideasoft";
const COOKIE_SECONDS = 10 * 60;

interface Pending {
  host: string;
  clientId: string;
  clientSecret: string;
  expiresAt: number;
}

const escape = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function page(title: string, body: string, status = 200, headers: Record<string, string> = {}): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escape(title)} · Yallapp</title>
</head>
<body style="margin:0;background:#F4EFE6;color:#0E0D24;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.5">
<main style="max-width:560px;margin:48px auto;padding:0 16px">
<div style="background:#FFFFFF;border-radius:12px;padding:24px">
<h1 style="font-size:22px;margin:0 0 12px">${escape(title)}</h1>
${body}
</div>
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      ...headers,
    },
  });
}

const field = "display:block;width:100%;box-sizing:border-box;margin:4px 0 16px;padding:10px;border:1px solid #0E0D24;border-radius:8px;font:inherit";
const button = "background:#0E0D24;color:#FFFFFF;border:0;border-radius:8px;padding:10px 20px;font:inherit;cursor:pointer";
const link = "color:#C2410C";

function startForm(values: { host?: string; clientId?: string } = {}, problem = "", status = 200): Response {
  return page(
    "Connect your IdeaSoft store",
    `<p>In your IdeaSoft panel, open Entegrasyonlar &gt; API and add an API client with the Redirect URI
<code>${escape(IDEASOFT_REDIRECT_URI)}</code>. Then enter its details here and approve the access in IdeaSoft.</p>
${problem ? `<p style="color:#C2410C"><strong>${escape(problem)}</strong></p>` : ""}
<form method="post" action="/oauth/ideasoft" autocomplete="off">
<label>Store address<input name="host" required placeholder="your-store.myideasoft.com" value="${escape(values.host ?? "")}" style="${field}"></label>
<label>Client ID<input name="clientId" required value="${escape(values.clientId ?? "")}" style="${field}"></label>
<label>Client Secret<input name="clientSecret" type="password" required style="${field}"></label>
<button type="submit" style="${button}">Continue to IdeaSoft</button>
</form>`,
    status,
  );
}

function readPending(request: Request): Pending | null {
  const raw = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  if (!raw) return null;
  try {
    const pending = JSON.parse(decrypt(decodeURIComponent(raw), encryptionKey(), COOKIE_CONTEXT)) as Pending;
    return pending.expiresAt > Date.now() ? pending : null;
  } catch {
    return null;
  }
}

const clearCookie = `${COOKIE}=; Path=/oauth/ideasoft; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

/** GET /oauth/ideasoft: the start form, or IdeaSoft's redirect back with ?code=&state= (or ?error=). */
export async function GET(request: Request): Promise<Response> {
  const query = new URL(request.url).searchParams;
  const code = query.get("code")?.trim() ?? "";
  const host = normalizeIdeasoftHost(query.get("state") ?? "");
  const again = `<p><a href="/oauth/ideasoft" style="${link}">Start again</a></p>`;

  if (query.get("error")) {
    return page("Access wasn't given", `<p>IdeaSoft didn't give access to your store, so nothing was connected.</p>${again}`, 400, {
      "set-cookie": clearCookie,
    });
  }
  if (!code) return startForm();

  const pending = readPending(request);
  if (!pending || !host || pending.host !== host) {
    // IdeaSoft's approval page was opened by hand: the code can only be pasted as it is, quickly.
    return page(
      "Your IdeaSoft code",
      `<p>Paste this code in the <strong>Refresh token</strong> field on the Website step of your Yallapp dashboard and save
within 30 seconds. After that IdeaSoft no longer accepts it.</p>
<input readonly value="${escape(code)}" onfocus="this.select()" style="${field}">
<p>Running out of time is common. To get a token that lasts, start here instead.</p>${again}`,
    );
  }

  try {
    const tokens = await exchangeIdeasoftCode(pending.host, pending.clientId, pending.clientSecret, code);
    if (!tokens.refreshToken) throw new Error("No refresh token");
    return page(
      "Your store is ready to connect",
      `<p>Copy this refresh token and paste it in the <strong>Refresh token</strong> field on the Website step of your Yallapp
dashboard, together with the store address <strong>${escape(pending.host)}</strong>, the Client ID and the Client Secret.
It works for about two months, so there is no rush. Don't share it with anyone else.</p>
<textarea readonly rows="3" onfocus="this.select()" style="${field};resize:none">${escape(tokens.refreshToken)}</textarea>`,
      200,
      { "set-cookie": clearCookie },
    );
  } catch {
    return page(
      "IdeaSoft didn't accept these details",
      `<p>Check the Client ID and Client Secret, and that the API client's Redirect URI is exactly
<code>${escape(IDEASOFT_REDIRECT_URI)}</code>.</p>${again}`,
      400,
      { "set-cookie": clearCookie },
    );
  }
}

/** POST /oauth/ideasoft: keeps the details in an encrypted cookie and sends the client to IdeaSoft's approval page. */
export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const text = (name: string) => {
    const value = form?.get(name);
    return typeof value === "string" ? value.trim().slice(0, 500) : "";
  };
  const typedHost = text("host");
  const clientId = text("clientId");
  const clientSecret = text("clientSecret");
  const host = normalizeIdeasoftHost(typedHost);
  if (!host) return startForm({ host: typedHost, clientId }, "Enter your store's address, for example your-store.myideasoft.com.", 400);
  if (!/^[\w.\-~]{1,200}$/.test(clientId) || !clientSecret || /\s/.test(clientSecret)) {
    return startForm({ host, clientId }, "Copy the Client ID and Client Secret exactly as IdeaSoft shows them.", 400);
  }
  const pending: Pending = { host, clientId, clientSecret, expiresAt: Date.now() + COOKIE_SECONDS * 1000 };
  const cookie = encodeURIComponent(encrypt(JSON.stringify(pending), encryptionKey(), COOKIE_CONTEXT));
  return new Response(null, {
    status: 303,
    headers: {
      location: ideasoftAuthorizeUrl(host, clientId),
      "cache-control": "no-store",
      "set-cookie": `${COOKIE}=${cookie}; Path=/oauth/ideasoft; Max-Age=${COOKIE_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
    },
  });
}
