import { figmaApiTestUrl } from "../env";
import { safeFetcher } from "../net/safe-fetch";
import { colorHex, TOKEN_LIMITS, type FigmaColor, type FigmaFont, type FigmaTokens } from "./tokens";
import { FIGMA_IMAGE_BYTES } from "./images";

/**
 * 97.4 A Figma file read from its link with the client's personal access
 * token, through Figma's REST API: its color and text styles (and its
 * variables, when Figma lets the token read them), and its frames to pick
 * the logo and pictures from, rendered by Figma. The token goes to Figma in
 * the `X-Figma-Token` header of these calls only: it is never saved, logged
 * or sent anywhere else.
 */

export const FIGMA_API_URL = "https://api.figma.com";

/** The most frames offered, and the most rendered at once. */
export const FIGMA_LINK_LIMITS = { frames: 40, styles: 100, picks: 13, fileBytes: 20 * 1024 * 1024, thumbnailScale: 0.25, pictureScale: 2 } as const;

export type FigmaApiError = "link" | "token" | "not_found" | "limit" | "unreachable" | "too_big" | "empty";

export type FigmaFailure = { ok: false; error: FigmaApiError; retryAfterSeconds?: number };

export interface FigmaDeps {
  fetcher?: typeof fetch;
  apiUrl?: string;
}

export interface FigmaFrame {
  id: string;
  name: string;
  page: string;
  width: number | null;
  height: number | null;
  /** A small picture Figma rendered of it, on Figma's own storage; null when Figma couldn't. */
  thumbnail: string | null;
}

export interface FigmaFileRead {
  name: string;
  tokens: FigmaTokens;
  frames: FigmaFrame[];
}

/** Figma's API; in local tests (FIGMA_API_TEST_URL, refused on Netlify) a fake one, its pictures on the same address. */
export function figmaDeps(): FigmaDeps {
  const test = figmaApiTestUrl();
  return test ? { apiUrl: test.replace(/\/$/, ""), fetcher: globalThis.fetch } : {};
}

/** The file's key in a link to a Figma design (`/design/`, `/file/` or `/proto/`), its branch's when the link is to one. */
export function figmaFileKey(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !/^(www\.)?figma\.com$/i.test(url.hostname)) return null;
  const m = /^\/(?:file|design|proto)\/([A-Za-z0-9]{10,64})(?:\/branch\/([A-Za-z0-9]{10,64}))?(?:\/|$)/.exec(url.pathname);
  return m ? (m[2] ?? m[1]!) : null;
}

/** A personal access token as Figma writes them: printable, no spaces. */
export function figmaTokenLooksRight(token: string): boolean {
  return /^[\x21-\x7e]{20,200}$/.test(token);
}

/** A frame's id in Figma (`12:34`, `I12:34;56:78` for instances). */
export function figmaNodeId(id: string): boolean {
  return /^[A-Za-z0-9:;_-]{1,64}$/.test(id);
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

class FigmaCallError extends Error {
  constructor(
    readonly error: FigmaApiError,
    readonly retryAfterSeconds?: number,
  ) {
    super(error);
  }
}

function failure(err: unknown): FigmaFailure {
  if (err instanceof FigmaCallError) return { ok: false, error: err.error, ...(err.retryAfterSeconds ? { retryAfterSeconds: err.retryAfterSeconds } : {}) };
  return { ok: false, error: "unreachable" };
}

/** The body, refused past `limit` bytes. */
async function readLimited(response: Response, limit: number): Promise<Buffer> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (declared > limit) {
    await response.body?.cancel().catch(() => undefined);
    throw new FigmaCallError("too_big");
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel().catch(() => undefined);
      throw new FigmaCallError("too_big");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

/** One call to Figma's API, its errors said in our words. */
async function call(path: string, token: string, deps: FigmaDeps, optional = false): Promise<unknown> {
  const fetcher = deps.fetcher ?? safeFetcher();
  let response: Response;
  try {
    response = await fetcher(`${deps.apiUrl ?? FIGMA_API_URL}${path}`, { headers: { "X-Figma-Token": token, accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(25_000) });
  } catch {
    throw new FigmaCallError("unreachable");
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined);
    if (optional) return null;
    if (response.status === 429) {
      const seconds = Number(response.headers.get("retry-after"));
      throw new FigmaCallError("limit", Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined);
    }
    if (response.status === 401 || response.status === 403) throw new FigmaCallError("token");
    if (response.status === 400 || response.status === 404) throw new FigmaCallError("not_found");
    throw new FigmaCallError("unreachable");
  }
  try {
    return JSON.parse((await readLimited(response, FIGMA_LINK_LIMITS.fileBytes)).toString("utf8")) as unknown;
  } catch (err) {
    if (err instanceof FigmaCallError) throw err;
    throw new FigmaCallError("unreachable");
  }
}

/** The first solid, visible fill of a node, as #RRGGBB. */
function solidFill(node: Record<string, unknown>): string | null {
  const fills = Array.isArray(node.fills) ? node.fills : [];
  const fill = fills.find((f) => isRecord(f) && f.type === "SOLID" && f.visible !== false);
  return isRecord(fill) ? colorHex(fill.color) : null;
}

/** The file's variables, when Figma lets the token read them (Enterprise files): colors and corner radii, in each collection's default mode. */
function fromVariables(body: unknown): { colors: FigmaColor[]; radii: number[] } {
  const meta = isRecord(body) && isRecord(body.meta) ? body.meta : null;
  const variables = meta && isRecord(meta.variables) ? meta.variables : {};
  const collections = meta && isRecord(meta.variableCollections) ? meta.variableCollections : {};
  const valueOf = (variable: Record<string, unknown>, steps = 0): unknown => {
    const collection = isRecord(collections[String(variable.variableCollectionId)]) ? (collections[String(variable.variableCollectionId)] as Record<string, unknown>) : null;
    const modes = isRecord(variable.valuesByMode) ? variable.valuesByMode : {};
    const value = collection && String(collection.defaultModeId) in modes ? modes[String(collection.defaultModeId)] : Object.values(modes)[0];
    if (isRecord(value) && value.type === "VARIABLE_ALIAS" && steps < 5) {
      const target = variables[String(value.id)];
      return isRecord(target) ? valueOf(target, steps + 1) : null;
    }
    return value;
  };
  const colors: FigmaColor[] = [];
  const radii: number[] = [];
  for (const variable of Object.values(variables).slice(0, TOKEN_LIMITS.leaves)) {
    if (!isRecord(variable) || variable.remote === true || typeof variable.name !== "string") continue;
    const value = valueOf(variable);
    if (variable.resolvedType === "COLOR") {
      const hex = colorHex(value);
      if (hex) colors.push({ name: variable.name, hex });
    } else if (variable.resolvedType === "FLOAT" && /radius|corner|rounded/i.test(variable.name) && typeof value === "number" && value >= 0 && value <= 999) {
      radii.push(value);
    }
  }
  return { colors, radii };
}

interface FileBody {
  name: string;
  pages: { name: string; children: Record<string, unknown>[] }[];
  styles: { id: string; name: string; type: "FILL" | "TEXT" }[];
}

function fileBody(body: unknown): FileBody {
  if (!isRecord(body) || !isRecord(body.document)) throw new FigmaCallError("not_found");
  const pages = (Array.isArray(body.document.children) ? body.document.children : [])
    .filter(isRecord)
    .map((page) => ({ name: typeof page.name === "string" ? page.name : "", children: (Array.isArray(page.children) ? page.children : []).filter(isRecord) }));
  const styles = Object.entries(isRecord(body.styles) ? body.styles : {})
    .filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1]) && (entry[1].styleType === "FILL" || entry[1].styleType === "TEXT") && figmaNodeId(entry[0]))
    .slice(0, FIGMA_LINK_LIMITS.styles)
    .map(([id, style]) => ({ id, name: typeof style.name === "string" ? style.name.slice(0, 120) : id, type: style.styleType as "FILL" | "TEXT" }));
  return { name: typeof body.name === "string" ? body.name.slice(0, 120) : "Figma", pages, styles };
}

const FRAME_TYPES = new Set(["FRAME", "COMPONENT", "COMPONENT_SET", "INSTANCE", "GROUP"]);

/** The pages' top-level frames, logos first. */
function framesOf(file: FileBody): Omit<FigmaFrame, "thumbnail">[] {
  const frames = file.pages.flatMap((page) =>
    page.children
      .filter((node) => FRAME_TYPES.has(String(node.type)) && node.visible !== false && typeof node.id === "string" && figmaNodeId(node.id))
      .map((node) => {
        const box = isRecord(node.absoluteBoundingBox) ? node.absoluteBoundingBox : {};
        return {
          id: node.id as string,
          name: typeof node.name === "string" ? node.name.slice(0, 120) : "",
          page: page.name.slice(0, 120),
          width: typeof box.width === "number" ? Math.round(box.width) : null,
          height: typeof box.height === "number" ? Math.round(box.height) : null,
        };
      }),
  );
  const logo = (f: { name: string }) => (/logo|brand|mark/i.test(f.name) ? 0 : 1);
  return frames.sort((a, b) => logo(a) - logo(b)).slice(0, FIGMA_LINK_LIMITS.frames);
}

/** The links Figma rendered the frames at (null for one it couldn't). */
async function renderLinks(key: string, token: string, ids: string[], scale: number, deps: FigmaDeps): Promise<Map<string, string | null>> {
  const links = new Map<string, string | null>();
  if (!ids.length) return links;
  const query = new URLSearchParams({ ids: ids.join(","), format: "png", scale: String(scale) });
  const body = await call(`/v1/images/${key}?${query}`, token, deps);
  const images = isRecord(body) && isRecord(body.images) ? body.images : {};
  for (const id of ids) {
    const link = images[id];
    // Https; in local tests, the fake API's own address.
    links.set(id, typeof link === "string" && (/^https:\/\//.test(link) || (deps.apiUrl !== undefined && link.startsWith(`${deps.apiUrl}/`))) ? link : null);
  }
  return links;
}

/** The file's styles, variables and frames: what the look can be chosen from. */
export async function readFigmaFile(key: string, token: string, deps: FigmaDeps = {}): Promise<{ ok: true; value: FigmaFileRead } | FigmaFailure> {
  try {
    const file = fileBody(await call(`/v1/files/${key}?depth=2`, token, deps));
    const colors = new Map<string, FigmaColor>();
    const fonts = new Map<string, FigmaFont>();
    const radii: number[] = [];
    if (file.styles.length) {
      const body = await call(`/v1/files/${key}/nodes?${new URLSearchParams({ ids: file.styles.map((s) => s.id).join(",") })}`, token, deps);
      const nodes = isRecord(body) && isRecord(body.nodes) ? body.nodes : {};
      for (const style of file.styles) {
        const entry = nodes[style.id];
        const node = isRecord(entry) && isRecord(entry.document) ? entry.document : null;
        if (!node) continue;
        if (style.type === "FILL") {
          const hex = solidFill(node);
          if (hex && !colors.has(hex) && colors.size < TOKEN_LIMITS.colors) colors.set(hex, { name: style.name, hex });
        } else {
          const family = isRecord(node.style) && typeof node.style.fontFamily === "string" ? node.style.fontFamily.trim().slice(0, 64) : "";
          if (family && !fonts.has(family.toLowerCase()) && fonts.size < TOKEN_LIMITS.fonts) fonts.set(family.toLowerCase(), { name: style.name, family });
        }
      }
    }
    // Variables only for files Figma lets the token read them in: otherwise nothing, not an error.
    const variables = fromVariables(await call(`/v1/files/${key}/variables/local`, token, deps, true).catch(() => null));
    for (const c of variables.colors) if (!colors.has(c.hex) && colors.size < TOKEN_LIMITS.colors) colors.set(c.hex, c);
    radii.push(...variables.radii);
    const frames = framesOf(file);
    for (const page of file.pages) {
      for (const node of page.children) {
        if (frames.some((f) => f.id === node.id) && typeof node.cornerRadius === "number" && node.cornerRadius > 0 && node.cornerRadius <= 999) radii.push(node.cornerRadius);
      }
    }
    if (!colors.size && !fonts.size && !frames.length) return { ok: false, error: "empty" };
    // Small pictures to choose from; a file Figma can't render still offers its frames by name.
    let thumbnails = new Map<string, string | null>();
    try {
      thumbnails = await renderLinks(key, token, frames.map((f) => f.id), FIGMA_LINK_LIMITS.thumbnailScale, deps);
    } catch (err) {
      if (err instanceof FigmaCallError && (err.error === "token" || err.error === "limit")) throw err;
    }
    return {
      ok: true,
      value: { name: file.name, tokens: { colors: [...colors.values()], fonts: [...fonts.values()], radii }, frames: frames.map((f) => ({ ...f, thumbnail: thumbnails.get(f.id) ?? null })) },
    };
  } catch (err) {
    return failure(err);
  }
}

/**
 * The frames chosen, rendered by Figma as PNG and fetched from where Figma
 * put them (any public address, through the safe fetch): each one's file,
 * or null when Figma couldn't render it or it is larger than 5 MB at half
 * the size.
 */
export async function renderFigmaFrames(key: string, token: string, ids: string[], deps: FigmaDeps = {}): Promise<{ ok: true; images: Map<string, Buffer | null> } | FigmaFailure> {
  const fetcher = deps.fetcher ?? safeFetcher();
  const download = async (link: string | null): Promise<Buffer | "too_big" | null> => {
    if (!link) return null;
    try {
      const response = await fetcher(link, { signal: AbortSignal.timeout(25_000) });
      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        return null;
      }
      return await readLimited(response, FIGMA_IMAGE_BYTES);
    } catch (err) {
      return err instanceof FigmaCallError && err.error === "too_big" ? "too_big" : null;
    }
  };
  try {
    const images = new Map<string, Buffer | null>();
    const big: string[] = [];
    const links = await renderLinks(key, token, ids, FIGMA_LINK_LIMITS.pictureScale, deps);
    for (const id of ids) {
      const data = await download(links.get(id) ?? null);
      if (data === "too_big") big.push(id);
      images.set(id, data === "too_big" ? null : data);
    }
    // Too large at twice the size: once more at the frame's own size.
    if (big.length) {
      const again = await renderLinks(key, token, big, 1, deps);
      for (const id of big) {
        const data = await download(again.get(id) ?? null);
        images.set(id, data === "too_big" ? null : data);
      }
    }
    return { ok: true, images };
  } catch (err) {
    return failure(err);
  }
}
