import "server-only";
import type { Settled, Trigger } from "../../payments/settle";
import { communityDeps } from "../deps";
import { settleCourseOrder } from "./checkout";

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
