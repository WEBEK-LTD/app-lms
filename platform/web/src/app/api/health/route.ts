import { json } from "@/lib/http";

/** Liveness check for uptime monitors. Doesn't touch the database. */
export function GET(): Response {
  return json({ status: "ok" });
}
