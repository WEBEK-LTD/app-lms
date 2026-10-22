import type { DataStore } from "../data/store";
import type { AppError, AppErrorSource } from "../data/types";

/**
 * 78.4 Errors per app: what failed for one client's app, when and how often
 * (`app_errors`), for the team's Admin › Clients page. Each is counted by
 * app, source and code, with its last message; never a key, a code sent to
 * someone or a customer's details. Kept 90 days after it was last seen.
 */

export const APP_ERROR_DAYS = 90;

export const APP_ERROR_SOURCE_LABEL: Record<AppErrorSource, string> = {
  platform: "Connected platform",
  server: "Server error",
  wordpress: "WordPress site",
  mail: "Own email server",
  whatsapp: "Own WhatsApp number",
  sign_in: "Sign-in codes",
  webhook: "Webhooks to the app's API",
  payment: "Payments",
  push: "Push notifications",
};

/** Records an app's error. Never throws: the error being recorded is what matters to the caller. */
export async function noteAppError(
  store: DataStore,
  /** `detail`: what happened (stored as the error's message). */
  input: { clientId: string; appId: string | null; source: AppErrorSource; code: string; detail: string },
  now: Date = new Date(),
): Promise<void> {
  try {
    const { detail, ...rest } = input;
    await store.recordAppError(
      {
        ...rest,
        code: input.code.replace(/[^\w.:-]/g, "_").slice(0, 64) || "error",
        message: detail.replace(/\s+/g, " ").trim().slice(0, 500) || "No message.",
      },
      now,
    );
  } catch (error) {
    console.error("[app-errors]", error instanceof Error ? error.message : String(error));
  }
}

/** The error code and message of a hosted API answer (`{ code, message }`), if it has one. */
export function errorOfBody(body: unknown): { code: string; message: string } | null {
  if (!body || typeof body !== "object") return null;
  const { code, message } = body as { code?: unknown; message?: unknown };
  return typeof code === "string" ? { code, message: typeof message === "string" ? message : code } : null;
}

export type { AppError };
