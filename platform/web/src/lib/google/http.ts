/**
 * 136 Calls to Google's REST APIs with an access token, and their errors in
 * Google's own words (`error.status`, `error.message`), which the Admin page
 * shows as they are.
 */

export type Fetch = typeof fetch;

export class GoogleApiError extends Error {
  constructor(
    message: string,
    /** The HTTP status; 0 when Google couldn't be reached. */
    readonly httpStatus: number,
    /** Google's status name, like PERMISSION_DENIED or ALREADY_EXISTS; null when it gave none. */
    readonly code: string | null,
  ) {
    super(message);
    this.name = "GoogleApiError";
  }
}

/** A long-running operation (google.longrunning.Operation). */
export interface Operation<T = unknown> {
  name: string;
  done?: boolean;
  error?: { code?: number; message?: string; status?: string };
  response?: T;
}

const CALL_MS = 15_000;

/** Google's error as one line: "PERMISSION_DENIED: The caller does not have permission (HTTP 403)". */
export function googleProblem(status: number, body: unknown): { message: string; code: string | null } {
  const error = (body as { error?: unknown } | null)?.error;
  if (error && typeof error === "object") {
    const e = error as { status?: unknown; message?: unknown };
    const code = typeof e.status === "string" ? e.status : null;
    const message = typeof e.message === "string" ? e.message.slice(0, 300) : "";
    return { code, message: `${code ? `${code}: ` : ""}${message || "no details"} (HTTP ${status})` };
  }
  // The token service answers as OAuth does: { error, error_description }.
  const oauth = body as { error?: unknown; error_description?: unknown } | null;
  if (oauth && typeof oauth.error === "string") {
    const description = typeof oauth.error_description === "string" ? `: ${oauth.error_description.slice(0, 300)}` : "";
    return { code: oauth.error, message: `${oauth.error}${description} (HTTP ${status})` };
  }
  return { code: null, message: `HTTP ${status}` };
}

/** Sends the request and reads its JSON; throws GoogleApiError on anything but 2xx. */
export async function googleJson<T>(fetcher: Fetch, url: string, init: { method?: string; token?: string; body?: unknown; form?: Record<string, string> } = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  let body: string | undefined;
  if (init.form) {
    headers["content-type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(init.form).toString();
  } else if (init.body !== undefined) {
    headers["content-type"] = "application/json";
    body = JSON.stringify(init.body);
  }
  let response: Response;
  try {
    response = await fetcher(url, { method: init.method ?? (body === undefined ? "GET" : "POST"), headers, body, redirect: "error", signal: AbortSignal.timeout(CALL_MS) });
  } catch (error) {
    throw new GoogleApiError(`Google couldn't be reached: ${error instanceof Error ? error.message : String(error)}`, 0, null);
  }
  const text = await response.text().catch(() => "");
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const problem = googleProblem(response.status, parsed);
    throw new GoogleApiError(problem.message, response.status, problem.code);
  }
  if (parsed === null) throw new GoogleApiError(`Google answered something that isn't JSON (HTTP ${response.status})`, response.status, null);
  return parsed as T;
}

/** The operation's failure as a GoogleApiError, or null while it runs or when it succeeded. */
export function operationProblem(operation: Operation): GoogleApiError | null {
  if (!operation.error) return null;
  const code = operation.error.status ?? null;
  return new GoogleApiError(`${code ? `${code}: ` : ""}${operation.error.message ?? "the operation failed"}`, 200, code);
}
