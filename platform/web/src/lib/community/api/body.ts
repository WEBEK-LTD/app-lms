/**
 * 231 Reading a Community API request's body (app/api/community/v1/[...path]/route.ts):
 * a JSON body (128 KB) or a multipart form (a picture or an ID proof, 11 MB).
 * - A body is taken only with its size known: one sent in chunks without a
 *   Content-Length is refused (411). A request with no body at all (a
 *   DELETE, a POST with nothing to say) is fine without one.
 * - The size is checked before reading when announced, and again on what
 *   was read.
 * - A body is JSON, and says so: a cross-site form (text/plain,
 *   urlencoded) can't pass for one (415).
 */
export const MAX_JSON = 131_072;
export const MAX_FORM = 11 * 1024 * 1024;

export type BodyRead = { ok: true; body: unknown; form: FormData | null } | { ok: false; status: number; code: string; message: string };

const refuse = (status: number, code: string, message: string): BodyRead => ({ ok: false, status, code, message });

export async function readCommunityBody(request: Request): Promise<BodyRead> {
  if (request.method === "GET" || request.method === "HEAD") return { ok: true, body: undefined, form: null };
  const length = request.headers.get("content-length");
  const size = length === null ? 0 : Number(length);
  if (length !== null && (!Number.isFinite(size) || size < 0)) return refuse(400, "invalid_request", "The Content-Length isn't a number.");
  // Chunks with no size announced: a body we can't measure before taking it.
  if (length === null && request.headers.get("transfer-encoding") !== null) return refuse(411, "invalid_request", "The request needs its Content-Length.");
  const type = (request.headers.get("content-type") ?? "").toLowerCase();
  if (type.startsWith("multipart/form-data")) {
    if (size > MAX_FORM) return refuse(413, "too_large", "The file is too large.");
    try {
      return { ok: true, body: undefined, form: await request.formData() };
    } catch {
      return refuse(400, "invalid_request", "The form could not be read.");
    }
  }
  if (size > MAX_JSON) return refuse(413, "invalid_request", "The request is too large.");
  const raw = await request.text();
  if (raw.length > MAX_JSON) return refuse(413, "invalid_request", "The request is too large.");
  if (raw.trim() === "") return { ok: true, body: undefined, form: null };
  if (!type.startsWith("application/json")) return refuse(415, "invalid_request", "The request body must be JSON.");
  try {
    return { ok: true, body: JSON.parse(raw) as unknown, form: null };
  } catch {
    return refuse(400, "invalid_request", "The request body must be JSON.");
  }
}
