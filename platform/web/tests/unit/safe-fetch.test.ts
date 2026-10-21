import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isPrivateAddress } from "@/lib/net/addresses";
import { BlockedAddressError, checkedLookup, pinnedFetch, safeFetch, safeFetcher, type Resolve } from "@/lib/net/safe-fetch";

/**
 * 70 Calls to addresses clients give connect to the address that was
 * checked (DNS rebinding, roadmap 69.9). A local server stands in for a
 * public one: the test's rule lets 127.0.0.1 through as if it were public,
 * and a fake resolver answers for made-up names, so every connection here
 * goes where the resolver said, never through the real DNS.
 */

const seen: { host: string | undefined; url: string | undefined }[] = [];
let server: Server;
let port = 0;

beforeAll(async () => {
  server = createServer((req: IncomingMessage, res) => {
    seen.push({ host: req.headers.host, url: req.url });
    if (req.url === "/to-private") {
      res.writeHead(302, { location: "http://10.1.2.3/secret" });
      return res.end();
    }
    if (req.url === "/to-other") {
      res.writeHead(302, { location: `http://other.client.test:${port}/hello` });
      return res.end();
    }
    if (req.url === "/to-rebound") {
      res.writeHead(307, { location: `http://rebound.client.test:${port}/hello` });
      return res.end();
    }
    res.writeHead(200, { "content-type": "text/plain" });
    res.end(`hello ${req.headers.host}`);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

/** 127.0.0.1 plays a public address; everything else private stays refused. */
const allowed = (address: string) => address === "127.0.0.1" || !isPrivateAddress(address);

function fakeResolver(answers: Record<string, string[][]>): Resolve & { calls: string[] } {
  const calls: string[] = [];
  const resolve = (async (host: string) => {
    calls.push(host);
    const list = answers[host];
    if (!list) throw Object.assign(new Error(`getaddrinfo ENOTFOUND ${host}`), { code: "ENOTFOUND" });
    // Each lookup takes the next answer (the last one repeats): a name that changes its answer.
    return list[Math.min(calls.filter((h) => h === host).length - 1, list.length - 1)]!;
  }) as Resolve & { calls: string[] };
  resolve.calls = calls;
  return resolve;
}

describe("70 safe fetches connect to the checked address", () => {
  it("connects to the address the lookup checked, with the name kept for the server", async () => {
    const resolve = fakeResolver({ "api.client.test": [["127.0.0.1"]] });
    const response = await safeFetch(`http://api.client.test:${port}/hello`, {}, { resolve, allowed });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(`hello api.client.test:${port}`);
    // Resolved once, by the connection itself.
    expect(resolve.calls).toEqual(["api.client.test"]);
  });

  it("refuses a name that answers differently after it was checked (DNS rebinding)", async () => {
    const resolve = fakeResolver({ "rebind.client.test": [["127.0.0.1"], ["10.0.0.7"]] });
    // A check before the call sees the public answer…
    expect((await resolve("rebind.client.test")).every(allowed)).toBe(true);
    const before = seen.length;
    // …and the connection, which resolves again, gets the private one and is refused.
    const error = await safeFetch(`http://rebind.client.test:${port}/hello`, {}, { resolve, allowed }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TypeError);
    expect((error as { cause?: unknown }).cause).toBeInstanceOf(BlockedAddressError);
    expect(((error as { cause: BlockedAddressError }).cause).reason).toBe("private");
    expect(seen.length).toBe(before);
  });

  it("refuses a name with any private address among its answers, and one with none", async () => {
    const resolve = fakeResolver({ "mixed.client.test": [["127.0.0.1", "192.168.1.10"]], "empty.client.test": [[]] });
    const mixed = await safeFetch(`http://mixed.client.test:${port}/`, {}, { resolve, allowed }).catch((e: unknown) => e);
    expect((mixed as { cause: BlockedAddressError }).cause.reason).toBe("private");
    const empty = await safeFetch(`http://empty.client.test:${port}/`, {}, { resolve, allowed }).catch((e: unknown) => e);
    expect((empty as { cause: BlockedAddressError }).cause.reason).toBe("unresolved");
  });

  it("refuses private addresses written as IPs before connecting, IPv4 inside IPv6 too", async () => {
    for (const url of ["http://10.0.0.1/", "http://169.254.169.254/latest/meta-data/", "http://[::ffff:7f00:1]/", "http://[::1]:8080/"]) {
      await expect(safeFetch(url, {}, { resolve: fakeResolver({}) })).rejects.toBeInstanceOf(BlockedAddressError);
    }
    await expect(safeFetch("file:///etc/passwd")).rejects.toBeInstanceOf(TypeError);
  });

  it("checks every redirect again, and refuses them when the call asks", async () => {
    const resolve = fakeResolver({ "api.client.test": [["127.0.0.1"]], "other.client.test": [["127.0.0.1"]], "rebound.client.test": [["10.9.9.9"]] });
    await expect(safeFetch(`http://api.client.test:${port}/to-private`, {}, { resolve, allowed })).rejects.toBeInstanceOf(BlockedAddressError);
    const followed = await safeFetch(`http://api.client.test:${port}/to-other`, {}, { resolve, allowed });
    expect(await followed.text()).toBe(`hello other.client.test:${port}`);
    const rebound = await safeFetch(`http://api.client.test:${port}/to-rebound`, {}, { resolve, allowed }).catch((e: unknown) => e);
    expect((rebound as { cause: BlockedAddressError }).cause.reason).toBe("private");
    await expect(safeFetch(`http://api.client.test:${port}/to-other`, { redirect: "error" }, { resolve, allowed })).rejects.toThrow(/redirected/);
    const manual = await safeFetch(`http://api.client.test:${port}/to-other`, { redirect: "manual" }, { resolve, allowed });
    expect(manual.status).toBe(302);
  });

  it("refuses private addresses by default (the production rule)", async () => {
    const resolve = fakeResolver({ "api.client.test": [["127.0.0.1"]] });
    const error = await safeFetcher({ resolve })(`http://api.client.test:${port}/hello`).catch((e: unknown) => e);
    expect((error as { cause: BlockedAddressError }).cause.reason).toBe("private");
  });

  it("answers net.connect's lookup with the checked addresses only, in the family asked", async () => {
    const lookup = checkedLookup(fakeResolver({ "dual.client.test": [["203.0.113.5", "2001:db8::5"]] }));
    const all = await new Promise((resolve, reject) =>
      lookup("dual.client.test", { all: true }, (error, addresses) => (error ? reject(error) : resolve(addresses))),
    );
    expect(all).toEqual([
      { address: "203.0.113.5", family: 4 },
      { address: "2001:db8::5", family: 6 },
    ]);
    const six = await new Promise((resolve, reject) => lookup("dual.client.test", { family: 6 }, (error, address, family) => (error ? reject(error) : resolve([address, family]))));
    expect(six).toEqual(["2001:db8::5", 6]);
  });

  it("swaps Node's own fetch for the safe one and keeps a test's fake", () => {
    const fake = async () => new Response("fake");
    expect(pinnedFetch(fake)).toBe(fake);
    expect(pinnedFetch(undefined)).not.toBe(globalThis.fetch);
    expect(pinnedFetch(globalThis.fetch)).not.toBe(globalThis.fetch);
  });

  it("is what every call to a client's address uses", () => {
    const files = [
      "src/lib/app/api-check.ts",
      "src/lib/news/feed.ts",
      "src/lib/links/check.ts",
      "src/lib/license/refresh.ts",
      "src/lib/hosted/api-webhooks.ts",
      "src/lib/hosted/connectors/ticimax.ts",
    ];
    for (const file of files) {
      const source = readFileSync(path.join(__dirname, "../..", file), "utf8");
      expect(source, file).toContain("pinnedFetch(");
      expect(source, file).not.toMatch(/\?\?\s*fetch\)|Fetch\s*=\s*fetch\b/);
    }
  });
});
