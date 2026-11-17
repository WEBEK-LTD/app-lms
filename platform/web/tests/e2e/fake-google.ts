import { createServer, type Server } from "node:http";
import { createLocalJWKSet, decodeJwt, jwtVerify, type JSONWebKeySet } from "jose";
import { FakeGoogle } from "../unit/fake-google";

/**
 * 136 A fake of Google's APIs for Yallapp's Firebase (GOOGLE_API_TEST_URL),
 * like the fake gateways of the other specs: the platform's assertions are
 * checked as Google does, by reading the issuer's discovery document and key
 * set from the platform itself (`<issuer>/.well-known/openid-configuration`,
 * then its `jwks_uri`), so the whole keyless chain runs for real against a
 * fake Google. tests/unit/fake-google.ts answers the calls.
 */
export interface FakeGoogleServer {
  google: FakeGoogle;
  server: Server;
  close: () => Promise<void>;
}

export async function startFakeGoogle(port: number, options: { provider: string; pushAccount: string; appsAccount: string; parents: string[] }): Promise<FakeGoogleServer> {
  const google = new FakeGoogle({
    provider: options.provider,
    accounts: { "push-sender": options.pushAccount, "firebase-apps": options.appsAccount },
    creatableParents: options.parents,
    verify: async (jwt) => {
      const issuer = String(decodeJwt(jwt).iss ?? "");
      const discovery = (await (await fetch(`${issuer}/.well-known/openid-configuration`)).json()) as { issuer: string; jwks_uri: string };
      const keys = (await (await fetch(discovery.jwks_uri)).json()) as JSONWebKeySet;
      return (await jwtVerify(jwt, createLocalJWKSet(keys), { issuer: discovery.issuer, algorithms: ["ES256"] })).payload;
    },
  });
  const server = createServer((request, response) => {
    let body = "";
    request.on("data", (chunk: Buffer) => (body += chunk.toString()));
    request.on("end", () => {
      google
        .handle(request.method ?? "GET", `http://localhost:${port}${request.url ?? "/"}`, request.headers.authorization ?? null, body)
        .then((answer) => response.writeHead(answer.status, { "content-type": "application/json" }).end(JSON.stringify(answer.body)))
        .catch((error: unknown) => response.writeHead(500, { "content-type": "application/json" }).end(JSON.stringify({ error: { message: String(error) } })));
    });
  });
  await new Promise<void>((resolve) => server.listen(port, resolve));
  return { google, server, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}
