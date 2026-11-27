import "server-only";
import type { Settled, Trigger } from "../../payments/settle";
import { communityDeps } from "../deps";
import { settleCourseOrder, startCourseCheckout } from "./checkout";

/**
 * 233 A course's payment coming back from the gateway: its return (GET) and
 * webhook (POST) at /api/pay/<gateway>/course/<token>, and iyzico's callback
 * (/api/pay/course/<token>), through the same routes as Yallapp's other
 * payments (lib/payments/provider-route.ts). The buyer goes back to the
 * course's page on the Community's site.
 */
export async function settleCoursePayment(token: string, trigger: Trigger): Promise<Settled> {
  const deps = await communityDeps({ ip: "0.0.0.0" });
  return settleCourseOrder({ deps, store: deps.store, now: deps.now }, token, trigger);
}

/**
 * 233 The website's "Buy" (a server action, with the member from the site's
 * cookie session; never the app, never the API): the gateway's page to send
 * the browser to, or why not (`code`: course_free, already_owned,
 * checkout_unavailable, checkout_failed, not_found).
 */
export async function startSiteCourseCheckout(input: { memberId: string; courseId: string; ip: string }): Promise<{ ok: true; url: string } | { ok: false; status: number; code: string; message: string }> {
  const deps = await communityDeps({ ip: input.ip });
  const started = await startCourseCheckout({ deps, store: deps.store, now: deps.now }, input.memberId, input.courseId, { ip: input.ip });
  return started.ok ? { ok: true, url: started.url } : { ok: false, status: started.status, code: started.code, message: started.message };
}
