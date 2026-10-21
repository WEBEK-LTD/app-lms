import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Addresses the platform must never call (69): loopback, private, link-local
 * and other reserved ranges, IPv4 written inside IPv6 included. 70 Calls to
 * addresses clients give go through lib/net/safe-fetch.ts, which connects
 * only to the addresses it checked here.
 */

type Resolve = (host: string) => Promise<string[]>;

function isPrivateV4(a: number, b: number, c: number): boolean {
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    // 69 IETF protocol assignments and the benchmarking range (sometimes used inside networks).
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** 69 The eight 16-bit groups of an IPv6 address (a dotted IPv4 tail included), or null. */
function ipv6Groups(address: string): number[] | null {
  let text = address.toLowerCase().replace(/%.*$/, "");
  const last = text.lastIndexOf(":");
  const tail = text.slice(last + 1);
  if (tail.includes(".")) {
    if (isIP(tail) !== 4) return null;
    const [a = 0, b = 0, c = 0, d = 0] = tail.split(".").map(Number);
    text = `${text.slice(0, last + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = halves.length === 2 ? 8 - head.length - rest.length : 0;
  if (fill < 0) return null;
  const groups = [...head, ...Array<string>(fill).fill("0"), ...rest].map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? Number.parseInt(g, 16) : Number.NaN));
  return groups.length === 8 && !groups.some(Number.isNaN) ? groups : null;
}

/**
 * Loopback, private, link-local and other addresses the platform must never call.
 * 69 IPv6 is read group by group, so an IPv4 address written inside one (mapped,
 * compatible, NAT64, 6to4, in hex or dotted form) is checked as that IPv4 address.
 */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a = 0, b = 0, c = 0] = address.split(".").map(Number);
    return isPrivateV4(a, b, c);
  }
  if (version !== 6) return false;
  const g = ipv6Groups(address);
  if (!g) return true;
  const v4 = (high: number, low: number) => isPrivateV4(high >> 8, high & 0xff, low >> 8);
  const zeros = (from: number, to: number) => g.slice(from, to).every((x) => x === 0);
  // ::, ::1 and IPv4-compatible (::a.b.c.d); ::ffff:a.b.c.d (mapped) and ::ffff:0:a.b.c.d (translated).
  if (zeros(0, 6)) return g[6] === 0 || v4(g[6]!, g[7]!);
  if (zeros(0, 5) && g[5] === 0xffff) return v4(g[6]!, g[7]!);
  if (zeros(0, 4) && g[4] === 0xffff && g[5] === 0) return v4(g[6]!, g[7]!);
  // NAT64 (64:ff9b::/96, and the local-use 64:ff9b:1::/48).
  if (g[0] === 0x64 && g[1] === 0xff9b) return zeros(2, 6) ? v4(g[6]!, g[7]!) : true;
  // 6to4 (2002::/16) carries an IPv4 address in its next 32 bits.
  if (g[0] === 0x2002) return v4(g[1]!, g[2]!);
  // Teredo (2001::/32) tunnels to an IPv4 address hidden in the rest.
  if (g[0] === 0x2001 && g[1] === 0) return true;
  // Discard-only (100::/64), unique local (fc00::/7), link-local (fe80::/10), site-local (fec0::/10), multicast (ff00::/8).
  if (g[0] === 0x100 && zeros(1, 4)) return true;
  return (g[0]! & 0xfe00) === 0xfc00 || (g[0]! & 0xffc0) === 0xfe80 || (g[0]! & 0xffc0) === 0xfec0 || (g[0]! & 0xff00) === 0xff00;
}

/**
 * 69 Why a host must not be called: it doesn't resolve, or it points (also)
 * to a private address. Null when every address it has is public.
 */
export async function privateHostProblem(host: string, resolve: Resolve = resolveHost): Promise<"unresolved" | "private" | null> {
  let addresses: string[];
  try {
    addresses = await resolve(host.replace(/^\[|\]$/g, ""));
  } catch {
    return "unresolved";
  }
  if (addresses.length === 0) return "unresolved";
  return addresses.some(isPrivateAddress) ? "private" : null;
}

/** The addresses a host name points to (an IP address stands for itself). 24 Also checks the owner's email server. */
export async function resolveHost(host: string): Promise<string[]> {
  if (isIP(host)) return [host];
  const records = await lookup(host, { all: true });
  return records.map((r) => r.address);
}
