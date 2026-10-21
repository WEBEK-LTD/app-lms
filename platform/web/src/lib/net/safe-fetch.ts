import type { LookupAddress, LookupOptions } from "node:dns";
import { isIP, type LookupFunction } from "node:net";
import type { Agent, RequestInit as UndiciRequestInit } from "undici";
import { isPrivateAddress, resolveHost } from "./addresses";

/**
 * 70 Calls to addresses clients give (their own API, news feeds, webhooks
 * to their API, link files on their site, their WordPress site's license
 * refresh, a shop on their own domain) connect only to an address that was
 * checked. Checking a name and then fetching it looks the name up twice, so
 * a name whose answer changes in between (DNS rebinding) could still reach
 * a private address. Here the connection's own lookup (undici's `connect`
 * options, passed on to `net.connect`/`tls.connect`) resolves the name
 * once, refuses it when any of its addresses is private or reserved
 * (`isPrivateAddress`), and connects to the addresses it checked. TLS still
 * checks the certificate against the name. An address written as an IP is
 * checked before the request (Node doesn't look those up). Redirects are
 * followed by hand, each new address checked the same way, or refused when
 * the call asks (`redirect: "error"`).
 */

export type Resolve = (host: string) => Promise<string[]>;

/** The address may be called: public. Tests give their own. */
export type AddressAllowed = (address: string) => boolean;

export interface SafeFetchOptions {
  resolve?: Resolve;
  allowed?: AddressAllowed;
}

const MAX_REDIRECTS = 5;
const publicOnly: AddressAllowed = (address) => !isPrivateAddress(address);

/** A connection was refused before it was made: the host points to a private address, or to none. */
export class BlockedAddressError extends Error {
  readonly code: string;
  constructor(
    readonly reason: "private" | "unresolved",
    readonly host: string,
  ) {
    super(reason === "private" ? `${host} points to a private network.` : `${host} doesn't resolve.`);
    this.name = "BlockedAddressError";
    this.code = reason === "private" ? "EBLOCKEDADDRESS" : "ENOTFOUND";
  }
}

type LookupCallback = (error: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/**
 * The lookup for `net.connect`: resolves once, refuses private and reserved
 * addresses, and gives the connection exactly the addresses it checked.
 */
export function checkedLookup(resolve: Resolve = resolveHost, allowed: AddressAllowed = publicOnly): LookupFunction {
  const lookup = (hostname: string, options: LookupOptions, callback: LookupCallback) => {
    const host = hostname.replace(/^\[|\]$/g, "");
    resolve(host)
      .then((all) => {
        if (all.length === 0) throw new BlockedAddressError("unresolved", host);
        if (!all.every(allowed)) throw new BlockedAddressError("private", host);
        const family = options.family === 4 || options.family === 6 ? options.family : 0;
        const addresses = family ? all.filter((a) => isIP(a) === family) : all;
        if (addresses.length === 0) throw new BlockedAddressError("unresolved", host);
        if (options.all) callback(null, addresses.map((address) => ({ address, family: isIP(address) })));
        else callback(null, addresses[0]!, isIP(addresses[0]!));
      })
      .catch((error: unknown) => callback(error as NodeJS.ErrnoException, "", 0));
  };
  return lookup as unknown as LookupFunction;
}

let undici: Promise<typeof import("undici")> | null = null;

/**
 * undici's package, loaded when first needed. When it loads before Node's
 * own fetch has, it makes its Agent the global dispatcher that Node's fetch
 * then uses for every other request; reading `Response` first loads Node's
 * own, which keeps that place, so only the calls here use this package.
 */
function loadUndici(): Promise<typeof import("undici")> {
  if (!undici) {
    void globalThis.Response;
    undici = import("undici");
  }
  return undici;
}

const agents = new WeakMap<Resolve, Map<AddressAllowed, Agent>>();

/** One connection pool per resolver and rule (the default one for production). */
export async function safeAgent(options: SafeFetchOptions = {}): Promise<Agent> {
  const { Agent } = await loadUndici();
  const resolve = options.resolve ?? resolveHost;
  const allowed = options.allowed ?? publicOnly;
  let byRule = agents.get(resolve);
  if (!byRule) agents.set(resolve, (byRule = new Map()));
  let agent = byRule.get(allowed);
  if (!agent) byRule.set(allowed, (agent = new Agent({ connect: { lookup: checkedLookup(resolve, allowed) } })));
  return agent;
}

/** Http or https only; an IP address written in the URL is checked here (Node connects to it without a lookup). */
function checkUrl(url: URL, allowed: AddressAllowed): void {
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new TypeError(`fetch failed: ${url.protocol} isn't allowed`);
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !allowed(host)) throw new BlockedAddressError("private", host);
}

const REDIRECT = new Set([301, 302, 303, 307, 308]);

/**
 * `fetch` for addresses clients give: the same arguments and answer, with
 * every connection made to a checked public address (see above). Redirects:
 * `follow` (the default) re-checks each address, up to 5; `error` refuses
 * them; `manual` gives the redirect back.
 */
export async function safeFetch(input: string | URL | Request, init: RequestInit = {}, options: SafeFetchOptions = {}): Promise<Response> {
  const allowed = options.allowed ?? publicOnly;
  const dispatcher = await safeAgent(options);
  const { fetch: undiciFetch } = await loadUndici();
  const mode = init.redirect ?? "follow";
  let url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  let request: RequestInit = { ...init };
  for (let hop = 0; ; hop++) {
    checkUrl(url, allowed);
    const response = (await undiciFetch(url, { ...(request as UndiciRequestInit), redirect: "manual", dispatcher })) as unknown as Response;
    if (!REDIRECT.has(response.status) || mode === "manual") return response;
    await response.body?.cancel().catch(() => undefined);
    const location = response.headers.get("location");
    if (mode === "error" || !location) throw new TypeError("fetch failed: the address redirected");
    if (hop >= MAX_REDIRECTS) throw new TypeError("fetch failed: too many redirects");
    const next = new URL(location, url);
    const method = (request.method ?? "GET").toUpperCase();
    // As browsers do: 303 (and 301/302 after a POST) continue with a GET without the body.
    if (response.status === 303 || ((response.status === 301 || response.status === 302) && method === "POST")) request = { ...request, method: "GET", body: undefined };
    // Credentials never follow to another origin.
    if (next.origin !== url.origin && request.headers) {
      const headers = new Headers(request.headers);
      headers.delete("authorization");
      headers.delete("cookie");
      request = { ...request, headers };
    }
    url = next;
  }
}

/** A `fetch` bound to a resolver (and, in tests, a rule): what the call sites pass on. */
export function safeFetcher(options: SafeFetchOptions = {}): typeof fetch {
  return ((input: string | URL | Request, init?: RequestInit) => safeFetch(input, init, options)) as typeof fetch;
}

const DEFAULT_FETCH = safeFetcher();

/**
 * The fetch a call to a client's address uses: the one a test gave, else
 * `safeFetch`. Node's own `fetch` handed down as a default counts as none.
 */
export function pinnedFetch<F extends (url: string, init?: RequestInit) => Promise<Response>>(fetcher?: F, resolve?: Resolve): F {
  if (fetcher && fetcher !== (globalThis.fetch as unknown)) return fetcher;
  // The connection resolves the way the call's own check did (tests give a fake resolver).
  return (resolve && resolve !== resolveHost ? safeFetcher({ resolve }) : DEFAULT_FETCH) as unknown as F;
}
