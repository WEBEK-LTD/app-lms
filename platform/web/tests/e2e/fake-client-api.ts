import { createServer, type Server } from "node:http";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * 34 A client's own API for end-to-end tests, the way the developer guide
 * tells them to build it when Yallapp signs people in: it serves the content
 * (an Academy's /config without `auth`, an empty home and courses) and
 * accepts a signed-in call only with Yallapp's access token, checked with the
 * app's key set (signature, `iss`, `aud`, `exp`).
 */

export interface FakeClientApi {
  server: Server;
  /** The requests it got: method, path, whether a token and the preview header came with them. */
  calls: { method: string; path: string; token: boolean; previewHeader: boolean }[];
  /** Points it at the app: where the keys are, the issuer and the audience. */
  trust: (options: { jwksUrl: string; issuer: string; audience: string }) => void;
  close: () => Promise<void>;
}

const CONFIG = {
  site: { name: "Cedar Academy", url: "https://cedar.example" },
  branding: { primary_color: "#0E0D24", logo_url: null },
  features: { lms: "yallapp", lms_version: "1.0", pro: false, certificates: false, quizzes: false, wishlist: false, reviews: false, qna: false, push: false },
  purchases: { enroll_button: false, free_enrollment: true },
  content: { block_screen_capture: false, watermark: "off", embed_fullscreen_button: true, embed_height: "auto" },
  app: { update_required: false, maintenance: false },
};

export async function startFakeClientApi(port: number): Promise<FakeClientApi> {
  const calls: FakeClientApi["calls"] = [];
  let checker: ((token: string) => Promise<JWTPayload>) | null = null;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", `http://localhost:${port}`);
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers": "Authorization, Content-Type, Accept-Language",
    };
    const send = (status: number, body?: unknown) =>
      response.writeHead(status, { ...cors, "content-type": "application/json" }).end(body === undefined ? "" : JSON.stringify(body));
    if (request.method === "OPTIONS") return void response.writeHead(204, cors).end();
    const bearer = /^Bearer\s+(.+)$/i.exec(request.headers.authorization ?? "")?.[1] ?? null;
    const path = url.pathname.replace(/^\/yallapp\/v1/, "");
    calls.push({ method: request.method ?? "GET", path, token: bearer !== null, previewHeader: request.headers["x-yallapp-preview"] !== undefined });

    if (path === "/config") return send(200, CONFIG);
    if (path === "/home") return send(200, { sections: [] });
    if (path === "/pages") return send(404, { code: "not_found", message: "No pages." });
    if (path.startsWith("/auth/")) return send(404, { code: "not_found", message: "Yallapp signs people in." });

    // Every other call is signed in: Yallapp's token or 401.
    let claims: JWTPayload | null = null;
    try {
      claims = bearer && checker ? await checker(bearer) : null;
    } catch {
      claims = null;
    }
    if (!claims) return send(401, { code: "invalid_token", message: "Please sign in again." });
    const who = { sub: claims.sub, phone: claims.phone ?? null, email: claims.email ?? null, name: claims.name ?? null };
    if (path === "/me" && request.method === "DELETE") return send(204);
    if (path === "/me/courses") return send(200, { page: 1, per_page: 20, total: 0, total_pages: 1, items: [], who });
    return send(404, { code: "not_found", message: "Not here." });
  });
  await new Promise<void>((resolve) => server.listen(port, resolve));
  return {
    server,
    calls,
    trust({ jwksUrl, issuer, audience }) {
      // A key named by a token and not in the cached set is fetched again at once.
      const keys = createRemoteJWKSet(new URL(jwksUrl), { cooldownDuration: 0 });
      checker = async (token) => (await jwtVerify(token, keys, { issuer, audience, algorithms: ["ES256"] })).payload;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
