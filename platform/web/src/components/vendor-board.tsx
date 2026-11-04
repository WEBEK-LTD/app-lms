"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icon";
import type { IconName } from "./icon-names";
import { fill, type PanelLang, type PanelWords } from "@/lib/market/panel-words";

/**
 * 115.7 The vendors' web panel: today's orders live, in three lanes (new,
 * preparing, ready) and orders for later, refreshed every few seconds, with a
 * chime when a new one comes. Accept with the minutes it needs, turn down
 * with a reason, pick a grocery's lines, mark ready, hand over. No
 * customer's phone or email anywhere: the first name, the order, and the
 * drop-off only when the vendor's own driver takes it.
 */

interface Money {
  amount: string;
  formatted: string;
}

export interface BoardLine {
  id: number;
  name: string;
  quantity: number;
  unit: "item" | "kg" | "g" | "l";
  choices: string[];
  note: string | null;
  total: Money;
  if_missing: "similar" | "chosen" | "remove";
  outcome: "picked" | "substituted" | "missing" | null;
}

export interface BoardOrder {
  id: number;
  reference: string;
  status: string;
  fulfilment: "delivery" | "pickup";
  scheduled_for: string | null;
  lines: BoardLine[];
  subtotal: Money;
  customer: { first_name: string };
  notes: string | null;
  dropoff: { address: string; details: string | null } | null;
  payment: { method: string; status: string; collect: Money | null };
  prep_minutes: number | null;
  ready_at: string | null;
  courier: { name: string } | null;
  created_at: string;
}

export interface BoardDesk {
  id: number;
  kind: "restaurant" | "grocery" | "shop";
  name: string;
  logo_url: string | null;
  open: boolean;
  busy_until: string | null;
  paused: boolean;
  accepting: boolean;
  delivery_by: "app" | "vendor";
  role: string;
  today: { orders: number; sales: Money; new_orders: number };
}

export interface BoardData {
  desk: BoardDesk;
  fresh: BoardOrder[];
  active: BoardOrder[];
  scheduled: BoardOrder[];
}

const PREP_CHOICES = [10, 15, 20, 30, 45];
const REASONS = ["too_busy", "items_unavailable", "closing", "outside_area", "other"] as const;

function minutesSince(iso: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(iso)) / 60_000));
}

function timeOf(iso: string, lang: PanelLang): string {
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : lang, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/** A short chime made in the browser: no file to load. */
function chime(): void {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    [880, 1320].forEach((hz, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = hz;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.55);
    });
  } catch {
    // No sound in this browser.
  }
}

function Chip({ icon, children, tone = "plain" }: { icon?: IconName; children: React.ReactNode; tone?: "plain" | "ember" | "success" | "warn" | "night" }) {
  const tones = {
    plain: "bg-sand text-ink-2 border-line-soft",
    ember: "bg-peach text-accent border-transparent",
    success: "bg-success-bg text-success border-transparent",
    warn: "bg-warn-bg text-warn border-transparent",
    night: "bg-midnight text-white border-transparent",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone]}`}>
      {icon ? <Icon name={icon} size={15} /> : null}
      {children}
    </span>
  );
}

function OrderCard({
  order,
  lane,
  w,
  lang,
  now,
  kind,
  busy,
  onAct,
}: {
  order: BoardOrder;
  lane: "new" | "preparing" | "ready" | "scheduled";
  w: PanelWords;
  lang: PanelLang;
  now: number;
  kind: BoardDesk["kind"];
  busy: boolean;
  onAct: (action: string, body?: Record<string, unknown>) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [code, setCode] = useState("");
  const age = minutesSince(order.created_at, now);
  const lateBy = order.ready_at && lane === "preparing" ? Math.floor((now - Date.parse(order.ready_at)) / 60_000) : 0;
  const count = order.lines.reduce((n, l) => n + (l.unit === "item" ? l.quantity : 1), 0);
  const delivery = order.fulfilment === "pickup" ? { icon: "storefront" as IconName, text: w.pickup } : order.dropoff ? { icon: "two_wheeler" as IconName, text: w.ownDriver } : { icon: "delivery_dining" as IconName, text: w.appCourier };
  const urgent = lane === "new" && age >= 3;
  return (
    <article
      data-order={order.reference}
      className={`group relative overflow-hidden rounded-[20px] border bg-white shadow-[0_18px_40px_-30px_rgba(14,13,36,0.55)] transition-all ${
        urgent ? "border-ember ring-4 ring-ember/15" : "border-line"
      }`}
    >
      {lane === "new" ? <span className="absolute inset-y-0 start-0 w-1.5 bg-gradient-to-b from-ember to-accent" /> : null}
      <header className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg font-extrabold tracking-tight text-midnight">{order.reference}</span>
            <span className="truncate text-sm font-semibold text-muted">· {order.customer.first_name}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Chip icon={delivery.icon} tone={order.fulfilment === "pickup" ? "night" : "plain"}>
              {delivery.text}
            </Chip>
            {order.scheduled_for ? <Chip icon="event">{fill(w.for, { time: timeOf(order.scheduled_for, lang) })}</Chip> : null}
            {order.payment.collect ? (
              <Chip icon="payments" tone="warn">
                {fill(w.collect, { amount: order.payment.collect.formatted })}
              </Chip>
            ) : order.payment.status === "paid" ? (
              <Chip icon="check" tone="success">
                {w.paid}
              </Chip>
            ) : null}
          </div>
        </div>
        <div className="flex flex-none flex-col items-end gap-1 text-end">
          <span className={`text-sm font-extrabold ${urgent ? "text-accent" : "text-ink-2"}`}>{fill(w.ago, { n: age })}</span>
          {lane === "preparing" && order.ready_at ? (
            <span className={`text-xs font-bold ${lateBy > 0 ? "text-danger" : "text-muted"}`}>{lateBy > 0 ? fill(w.late, { n: lateBy }) : fill(w.due, { time: timeOf(order.ready_at, lang) })}</span>
          ) : null}
        </div>
      </header>

      <ul className="mx-5 mt-3 flex flex-col divide-y divide-line-soft rounded-2xl bg-sand px-4 py-1">
        {order.lines.map((l) => (
          <li key={l.id} className={`flex items-start gap-3 py-2.5 ${l.outcome === "missing" ? "opacity-50 line-through" : ""}`}>
            <span className="mt-0.5 flex h-7 min-w-7 flex-none items-center justify-center rounded-lg bg-white px-1.5 text-sm font-extrabold text-midnight shadow-sm">
              {l.unit === "item" ? `${l.quantity}×` : `${l.quantity}${l.unit}`}
            </span>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[15px] font-bold text-ink">{l.name}</p>
              {l.choices.length ? <p className="m-0 text-[13px] text-muted">{l.choices.join(" · ")}</p> : null}
              {l.note ? <p className="m-0 mt-0.5 text-[13px] font-semibold text-accent">“{l.note}”</p> : null}
            </div>
            <span className="flex-none text-sm font-bold text-ink-2" dir="ltr">
              {l.total.formatted}
            </span>
          </li>
        ))}
      </ul>

      {order.notes ? (
        <p className="mx-5 mt-3 flex items-start gap-2 rounded-xl border border-dashed border-line-strong px-3 py-2 text-[13px] text-ink-2">
          <Icon name="receipt_long" size={17} className="mt-px text-faint" />
          <span>
            <b>{w.note}:</b> {order.notes}
          </span>
        </p>
      ) : null}
      {order.dropoff ? (
        <p className="mx-5 mt-2 text-[13px] text-muted">
          <Icon name="two_wheeler" size={15} className="me-1 align-[-3px]" />
          {order.dropoff.address}
          {order.dropoff.details ? ` · ${order.dropoff.details}` : ""}
        </p>
      ) : null}

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-5 py-4">
        <span className="text-sm font-semibold text-muted">
          {count === 1 ? w.oneItem : fill(w.items, { n: count })} · <b className="text-ink" dir="ltr">{order.subtotal.formatted}</b>
        </span>
        {lane === "new" ? (
          rejecting ? (
            <div className="flex w-full flex-col gap-2">
              <span className="text-xs font-bold tracking-wide text-muted uppercase">{w.rejectWhy}</span>
              <div className="flex flex-wrap gap-2">
                {REASONS.map((r) => (
                  <button key={r} disabled={busy} onClick={() => onAct("reject", { reason: r })} className="rounded-xl border border-line px-3 py-2 text-sm font-bold text-ink-2 hover:border-danger hover:text-danger">
                    {w[`why_${r}`]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setRejecting(true)} className="rounded-xl px-3 py-2.5 text-sm font-bold text-muted hover:bg-danger-bg hover:text-danger">
                {w.reject}
              </button>
              <div className="flex items-center overflow-hidden rounded-xl bg-midnight text-white shadow-[0_10px_24px_-12px_rgba(14,13,36,0.8)]">
                <span className="flex items-center gap-1.5 ps-3.5 pe-2 text-sm font-extrabold">
                  <Icon name="check" size={18} />
                  {w.accept}
                </span>
                {PREP_CHOICES.map((m) => (
                  <button key={m} disabled={busy} onClick={() => onAct("accept", { prep_minutes: m })} className="border-s border-white/15 px-2.5 py-2.5 text-[13px] font-bold whitespace-nowrap hover:bg-ember">
                    {fill(w.minutes, { n: m })}
                  </button>
                ))}
              </div>
            </div>
          )
        ) : lane === "preparing" ? (
          <div className="flex gap-2">
            {kind !== "restaurant" && order.status === "picking" && order.lines.some((l) => l.outcome === null) ? (
              <button disabled={busy} onClick={() => onAct("pick-all")} className="rounded-xl border border-midnight px-4 py-2.5 text-sm font-bold text-midnight hover:bg-midnight hover:text-white">
                <Icon name="shopping_cart" size={17} className="me-1 align-[-3px]" />
                {w.pick}
              </button>
            ) : (
              <button disabled={busy} onClick={() => onAct("ready")} className="rounded-xl bg-success px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_-12px_rgba(28,124,74,0.9)] hover:brightness-110">
                <Icon name="check" size={18} className="me-1 align-[-4px]" />
                {w.markReady}
              </button>
            )}
          </div>
        ) : lane === "ready" ? (
          order.fulfilment === "pickup" ? (
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                onAct("handover", { to: "customer", pickup_code: code });
              }}
            >
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" placeholder={w.pickupCode} className="h-10 w-32 rounded-xl border border-line px-3 text-center font-mono text-base font-bold tracking-[0.3em]" />
              <button disabled={busy || code.length !== 4} className="rounded-xl bg-midnight px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">
                {w.handCustomer}
              </button>
            </form>
          ) : order.dropoff ? (
            <button disabled={busy} onClick={() => onAct("handover", { to: order.status === "on_the_way" ? "delivered" : "driver" })} className="rounded-xl bg-midnight px-4 py-2.5 text-sm font-bold text-white">
              {order.status === "on_the_way" ? w.delivered : w.handDriver}
            </button>
          ) : (
            <Chip icon="delivery_dining" tone={order.courier ? "success" : "ember"}>
              {order.courier ? fill(w.courierComing, { name: order.courier.name }) : w.waitingCourier}
            </Chip>
          )
        ) : null}
      </footer>
    </article>
  );
}

function Lane({ title, icon, tone, orders, empty, children }: { title: string; icon: IconName; tone: string; orders: BoardOrder[]; empty: string; children: React.ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <header className="flex items-center justify-between">
        <h2 className="m-0 flex items-center gap-2.5 text-lg font-extrabold text-midnight">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
            <Icon name={icon} size={20} />
          </span>
          {title}
        </h2>
        <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-white px-2.5 text-sm font-extrabold text-midnight shadow-sm">{orders.length}</span>
      </header>
      {orders.length ? children : <p className="m-0 rounded-[20px] border-2 border-dashed border-line px-5 py-10 text-center text-sm font-semibold text-faint">{empty}</p>}
    </section>
  );
}

export function VendorBoard({ initial, words: w, lang, endpoint, signOutAction }: { initial: BoardData; words: PanelWords; lang: PanelLang; endpoint: string | null; signOutAction?: () => void }) {
  const [data, setData] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [sound, setSound] = useState(true);
  const [busy, setBusy] = useState(false);
  const seen = useRef(new Set(initial.fresh.map((o) => o.id)));

  const refresh = useCallback(async () => {
    if (!endpoint) return;
    const res = await fetch(endpoint, { cache: "no-store" });
    if (!res.ok) return;
    const next = (await res.json()) as BoardData;
    const arrived = next.fresh.filter((o) => !seen.current.has(o.id));
    arrived.forEach((o) => seen.current.add(o.id));
    if (arrived.length && sound) chime();
    setData(next);
  }, [endpoint, sound]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    const poll = endpoint ? setInterval(() => void refresh(), 8_000) : null;
    return () => {
      clearInterval(tick);
      if (poll) clearInterval(poll);
    };
  }, [endpoint, refresh]);

  const act = useCallback(
    async (orderId: number | null, action: string, body: Record<string, unknown> = {}) => {
      if (!endpoint) return;
      setBusy(true);
      try {
        await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, order_id: orderId, ...body }) });
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [endpoint, refresh],
  );

  const preparing = useMemo(() => data.active.filter((o) => ["accepted", "picking"].includes(o.status)), [data.active]);
  const ready = useMemo(() => data.active.filter((o) => ["ready", "on_the_way"].includes(o.status)), [data.active]);
  const d = data.desk;
  const busyUntil = d.busy_until && Date.parse(d.busy_until) > now ? d.busy_until : null;
  const state = d.paused ? { text: w.notAccepting, dot: "bg-danger", tone: "text-danger" } : !d.open ? { text: w.closedHours, dot: "bg-faint", tone: "text-night-muted" } : busyUntil ? { text: fill(w.busyUntil, { time: timeOf(busyUntil, lang) }), dot: "bg-warn", tone: "text-[#ffcf9e]" } : { text: w.accepting, dot: "bg-[#35d07f]", tone: "text-[#8ef0b9]" };
  const card = (o: BoardOrder, lane: "new" | "preparing" | "ready" | "scheduled") => (
    <OrderCard
      key={o.id}
      order={o}
      lane={lane}
      w={w}
      lang={lang}
      now={now}
      kind={d.kind}
      busy={busy}
      onAct={(action, body) =>
        action === "pick-all" ? void act(o.id, "lines", { lines: o.lines.map((l) => ({ line_id: l.id, outcome: "picked", quantity: l.quantity })) }) : void act(o.id, action, body)
      }
    />
  );

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className="min-h-screen bg-ivory">
      <div className="relative overflow-hidden bg-midnight text-white">
        <div className="pointer-events-none absolute -top-40 end-[-10%] h-96 w-96 rounded-full bg-ember/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 start-[20%] h-80 w-80 rounded-full bg-[#6d5dfc]/25 blur-3xl" />
        <div className="relative mx-auto flex max-w-[1440px] flex-col gap-6 px-6 pt-6 pb-8 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20">
                {d.logo_url ? <img src={d.logo_url} alt="" className="h-full w-full object-cover" /> : <Icon name={d.kind === "restaurant" ? "restaurant" : "storefront"} size={28} />}
              </span>
              <div>
                <p className="m-0 text-xs font-bold tracking-[1.2px] text-night-muted uppercase">{w.title}</p>
                <h1 className="m-0 text-2xl font-extrabold tracking-[-0.5px]">{d.name}</h1>
              </div>
              <span className={`ms-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-bold ${state.tone}`}>
                <span className={`relative flex h-2.5 w-2.5`}>
                  <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${state.dot} opacity-60`} />
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${state.dot}`} />
                </span>
                {state.text}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => setSound(!sound)} className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-bold ring-1 ${sound ? "bg-white/10 ring-white/20" : "bg-transparent text-night-muted ring-white/10"}`}>
                <Icon name="notifications" size={18} filled={sound} />
                {sound ? w.soundOn : w.soundOff}
              </button>
              {busyUntil ? (
                <button disabled={busy} onClick={() => void act(null, "desk", { busy_minutes: null })} className="rounded-xl bg-white/10 px-3.5 py-2.5 text-sm font-bold ring-1 ring-white/20">
                  {w.endBusy}
                </button>
              ) : (
                [15, 30, 60].map((m) => (
                  <button key={m} disabled={busy || d.paused} onClick={() => void act(null, "desk", { busy_minutes: m })} className="rounded-xl bg-white/10 px-3 py-2.5 text-sm font-bold ring-1 ring-white/15 hover:bg-white/20 disabled:opacity-40">
                    <Icon name="hourglass_top" size={16} className="me-1 align-[-3px]" />
                    {w.busyFor} {fill(w.minutes, { n: m })}
                  </button>
                ))
              )}
              <button disabled={busy} onClick={() => void act(null, "desk", { paused: !d.paused })} className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-extrabold ${d.paused ? "bg-[#35d07f] text-midnight" : "bg-ember text-white"}`}>
                <Icon name={d.paused ? "play_circle" : "pause_circle"} size={18} />
                {d.paused ? w.resume : w.pause}
              </button>
              {signOutAction ? (
                <form action={signOutAction}>
                  <button className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold text-night-muted hover:text-white">
                    <Icon name="logout" size={18} />
                    {w.signOut}
                  </button>
                </form>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: w.newNow, value: String(data.fresh.length), icon: "notifications" as IconName, accent: true },
              { label: w.preparing, value: String(preparing.length), icon: "timer" as IconName },
              { label: w.todayOrders, value: String(d.today.orders), icon: "receipt_long" as IconName },
              { label: w.todaySales, value: d.today.sales.formatted, icon: "payments" as IconName },
            ].map((s) => (
              <div key={s.label} className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 ring-1 ${s.accent ? "bg-ember/15 ring-ember/40" : "bg-white/5 ring-white/10"}`}>
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.accent ? "bg-ember text-white" : "bg-white/10 text-white"}`}>
                  <Icon name={s.icon} size={20} />
                </span>
                <div className="min-w-0">
                  <p className="m-0 truncate text-xs font-semibold text-night-muted">{s.label}</p>
                  <p className="m-0 truncate text-xl font-extrabold" dir="ltr">
                    {s.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-[1440px] gap-6 px-6 py-8 lg:grid-cols-3 lg:px-10">
        <Lane title={w.newOrders} icon="notifications" tone="bg-peach text-accent" orders={data.fresh} empty={w.emptyNew}>
          {data.fresh.map((o) => card(o, "new"))}
        </Lane>
        <Lane title={w.preparing} icon="timer" tone="bg-warn-bg text-warn" orders={preparing} empty={w.emptyPreparing}>
          {preparing.map((o) => card(o, "preparing"))}
        </Lane>
        <Lane title={w.readyCol} icon="check" tone="bg-success-bg text-success" orders={ready} empty={w.emptyReady}>
          {ready.map((o) => card(o, "ready"))}
        </Lane>
        {data.scheduled.length ? (
          <div className="lg:col-span-3">
            <Lane title={w.scheduled} icon="event" tone="bg-sand text-ink-2" orders={data.scheduled} empty="">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{data.scheduled.map((o) => card(o, "scheduled"))}</div>
            </Lane>
          </div>
        ) : null}
        <p className="m-0 flex items-center gap-2 text-sm text-faint lg:col-span-3">
          <Icon name="person" size={17} />
          {w.noContact}
        </p>
      </main>
    </div>
  );
}
