import type { PlanPaymentStatus } from "@/lib/data/types";

export const PAYMENT_STATUS: Record<PlanPaymentStatus, string> = { pending: "Not completed", paid: "Paid", failed: "Failed" };
export const PAYMENT_TONE: Record<PlanPaymentStatus, "success" | "warn" | "danger"> = { pending: "warn", paid: "success", failed: "danger" };
