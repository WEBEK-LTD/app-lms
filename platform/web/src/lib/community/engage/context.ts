import type { CommunityContext } from "../api/http";
import { trustDepsOf } from "../trust/context";
import type { TrustDeps } from "../trust/service";
import { YALLAPP_TENANT, type EngageStore } from "./store";

/**
 * 232–235 What area C's phase 2–5 functions run with: a request's context
 * (or a job's: deps, store and time), the community it is in, and phase 1's
 * trust functions for staff checks, notices, badges and the audit log.
 */
export type EngageCtx = Pick<CommunityContext, "deps" | "store" | "now"> & Partial<CommunityContext> & { tenant?: string };

const made = new WeakMap<object, { store: EngageStore; tenantId: string; trust: TrustDeps }>();

/** The community this runs in: its store's tenant (area A's key: "yallapp", or a client app's id). */
export function tenantOf(ctx: EngageCtx): string {
  return ctx.tenant ?? ctx.store.tenant ?? YALLAPP_TENANT;
}

export function engageOf(ctx: EngageCtx): { store: EngageStore; tenantId: string; trust: TrustDeps } {
  let got = made.get(ctx);
  if (!got) {
    got = { store: ctx.store.engage, tenantId: tenantOf(ctx), trust: trustDepsOf(ctx) };
    made.set(ctx, got);
  }
  return got;
}
