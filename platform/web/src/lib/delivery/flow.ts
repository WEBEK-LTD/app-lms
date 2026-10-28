import type { DataStore } from "../data/store";
import type { App, Courier, DeliverySettings, Shipment, ShipmentStage, ShipmentStatus } from "../data/types";
import { encryptionKey } from "../env";
import { serviceAccountOf } from "../hosted/notify";
import type { sendPush, ServiceAccount } from "../hosted/push";
import { tellCouriers, tellCustomer, type DeliveryNotifyDeps } from "./notify";
import { COURIER_ACTIVE, LIVE_STATUSES, stage } from "./service";
import { deliverySettingsOf } from "./settings";

/**
 * 104 How a shipment moves, whoever moves it (the customer, a courier, the
 * company on the dashboard, the payment): each change is made only while the
 * shipment is still where the mover saw it, so two changes at once make one,
 * and the people it concerns are told.
 */

export interface FlowDeps {
  store: DataStore;
  app: App;
  now: Date;
  /** The app's push account; read from the app when left out. */
  account?: ServiceAccount | null;
  send?: typeof sendPush;
}

function notifyDeps(deps: FlowDeps): DeliveryNotifyDeps {
  let account = deps.account;
  if (account === undefined) {
    try {
      account = deps.app.firebaseServiceAccountEncrypted ? serviceAccountOf(deps.app, encryptionKey()) : null;
    } catch {
      account = null;
    }
  }
  return { store: deps.store, app: deps.app, now: deps.now, account, send: deps.send };
}

async function settingsOf(deps: FlowDeps): Promise<DeliverySettings> {
  return deliverySettingsOf(await deps.store.getDeliverySettings(deps.app.id));
}

/** A shipment now waiting for a courier: the customer hears it, and couriers on duty when they take jobs themselves. */
export async function announceWaiting(deps: FlowDeps, shipment: Shipment): Promise<void> {
  const n = notifyDeps(deps);
  await tellCustomer(n, shipment);
  const settings = await settingsOf(deps);
  if (settings.assignment !== "open") return;
  const onDuty = (await deps.store.listCouriers(deps.app.id)).filter((c) => c.active && c.onDuty);
  await tellCouriers(n, shipment, onDuty, "waiting");
}

export type MoveResult = { ok: true; shipment: Shipment } | { ok: false; reason: "changed" };

/**
 * Gives the shipment to a courier: from waiting, or from another courier
 * before they picked it up (the company only). `expectCourier` is who had it.
 */
export async function assignShipment(deps: FlowDeps, shipment: Shipment, courier: Courier, by: ShipmentStage["by"]): Promise<MoveResult> {
  const from: ShipmentStatus[] = by === "company" ? ["pending", "assigned"] : ["pending"];
  if (!from.includes(shipment.status)) return { ok: false, reason: "changed" };
  const timeline = [...shipment.timeline, stage("assigned", deps.now, by)];
  const patch = { status: "assigned" as const, courierId: courier.id, courierName: courier.name, timeline, updatedAt: deps.now };
  const changed = await deps.store.updateShipment(deps.app.id, shipment.id, patch, { statuses: [shipment.status], courierId: shipment.courierId });
  if (!changed) return { ok: false, reason: "changed" };
  const saved: Shipment = { ...shipment, ...patch };
  const n = notifyDeps(deps);
  // The courier who had it before hears nothing: the job is simply gone from their list.
  if (shipment.status === "pending" || shipment.courierName !== courier.name) await tellCustomer(n, saved);
  if (by !== "courier") await tellCouriers(n, saved, [courier], "given");
  return { ok: true, shipment: saved };
}

/**
 * Moves the shipment to another stage. `pending` from `assigned` takes it
 * from its courier (released, or taken back by the company). A cash shipment
 * delivered is paid. The customer hears of every stage they follow.
 */
export async function moveShipment(deps: FlowDeps, shipment: Shipment, status: ShipmentStatus, by: ShipmentStage["by"], note: string | null = null): Promise<MoveResult> {
  if (status === shipment.status) return { ok: true, shipment };
  const timeline = [...shipment.timeline, stage(status, deps.now, by, note)];
  const patch: Partial<Shipment> = { status, timeline, updatedAt: deps.now };
  if (status === "pending") {
    patch.courierId = null;
    patch.courierName = null;
  }
  if (status === "delivered" && shipment.paymentMethod === "cash" && shipment.paymentStatus === "unpaid") patch.paymentStatus = "paid";
  const changed = await deps.store.updateShipment(deps.app.id, shipment.id, patch, { statuses: [shipment.status], courierId: shipment.courierId });
  if (!changed) return { ok: false, reason: "changed" };
  const saved: Shipment = { ...shipment, ...patch };
  if (status === "pending") {
    // Back to waiting: told again only to couriers, the customer already knows it waits.
    const settings = await settingsOf(deps);
    if (settings.assignment === "open") {
      const onDuty = (await deps.store.listCouriers(deps.app.id)).filter((c) => c.active && c.onDuty && c.id !== shipment.courierId);
      await tellCouriers(notifyDeps(deps), saved, onDuty, "waiting");
    }
  } else {
    await tellCustomer(notifyDeps(deps), saved);
  }
  if (shipment.courierId !== null && LIVE_STATUSES.includes(shipment.status) && !LIVE_STATUSES.includes(status)) {
    await forgetIdleLocation(deps.store, deps.app.id, shipment.courierId, deps.now);
  }
  return { ok: true, shipment: saved };
}

/** The courier's position is kept only while they have a parcel on the way. */
export async function forgetIdleLocation(store: DataStore, appId: string, courierId: number, now: Date): Promise<void> {
  const live = await store.listShipments({ appId, courierId, statuses: LIVE_STATUSES, order: "oldest", offset: 0, limit: 1 });
  if (live.total > 0) return;
  const courier = await store.getCourier(appId, courierId);
  if (courier && (courier.lat !== null || courier.locatedAt !== null)) {
    await store.updateCourier(appId, courierId, { lat: null, lng: null, locatedAt: null }, now);
  }
}

/** The courier's jobs with a courier on them. */
export const courierActive = (shipment: Shipment, courierId: number) => shipment.courierId === courierId && COURIER_ACTIVE.includes(shipment.status);
