"use client";

import { useDashT } from "@/components/dashboard-i18n";
import type { Pickable } from "@/lib/hosted/pages/pickable";
import { STUDIO_COUPON_LOOKS, STUDIO_FLASH_LOOKS, STUDIO_SALE_BADGES, type StudioNode } from "@/lib/pages/types";
import { RangeField } from "./controls";

/**
 * 131 The inspector's part for the commerce elements, every option: the
 * flash sale (its look, which sale, how many products, the countdown, the
 * stock bar, its colour), the coupon's look and whether it shows one of the
 * shop's coupons, and how a products list's cards show a sale.
 */

type Change = (patch: Partial<StudioNode>) => void;
const FIELD = { border: "1px solid var(--sf-line)" } as const;

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="flex items-center gap-1">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: "#1F8A4C" }} />
      {label}
    </label>
  );
}

function Colour({ label, value, onChange }: { label: string; value: string | null | undefined; onChange: (v: string | null) => void }) {
  return (
    <label className="flex items-center justify-between gap-2">
      {label}
      <span className="flex items-center gap-1">
        <input type="color" value={value ?? "#C2185B"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-8 w-10 rounded" style={FIELD} />
        {value ? (
          <button type="button" className="cursor-pointer rounded border-0 bg-transparent px-1 text-xs underline" onClick={() => onChange(null)}>
            ×
          </button>
        ) : null}
      </span>
    </label>
  );
}

export function CommerceControls({ node, onChange, pickable }: { node: StudioNode; onChange: Change; pickable: Pickable }) {
  const t = useDashT();
  if (node.type === "flash_sale") {
    const o = node.flash_sale ?? {};
    const set = (patch: Partial<NonNullable<StudioNode["flash_sale"]>>) => onChange({ flash_sale: { ...o, ...patch } });
    const sales = pickable.commerce?.flashSales ?? [];
    return (
      <div className="flex flex-col gap-2" data-commerce-controls="flash_sale">
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.flashLook")}
          <select value={o.look ?? "banner"} onChange={(e) => set({ look: e.target.value as (typeof STUDIO_FLASH_LOOKS)[number] })} className="h-9 rounded-lg px-1.5 font-normal" style={FIELD}>
            {STUDIO_FLASH_LOOKS.map((l) => (
              <option key={l} value={l}>
                {t(`studio.flashLook_${l}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.flashWhich")}
          <select value={o.sale_id ?? ""} onChange={(e) => set({ sale_id: e.target.value ? Number(e.target.value) : null })} className="h-9 rounded-lg px-1.5 font-normal" style={FIELD}>
            <option value="">{t("studio.flashSoonest")}</option>
            {sales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal" style={{ color: "var(--sf-muted)" }}>
            {t("studio.flashHint")}
          </span>
        </label>
        <RangeField label={t("studio.howMany")} value={o.limit ?? 6} min={1} max={12} unit={t("studio.unitItems")} onChange={(limit) => set({ limit })} />
        <Toggle label={t("studio.flashCountdown")} checked={o.countdown !== false} onChange={(on) => set({ countdown: on ? undefined : false })} />
        <Toggle label={t("studio.flashStock")} checked={o.stock_bar !== false} onChange={(on) => set({ stock_bar: on ? undefined : false })} />
        <Colour label={t("studio.flashAccent")} value={o.accent} onChange={(accent) => set({ accent })} />
      </div>
    );
  }
  if (node.type === "coupon") {
    const o = node.coupon ?? {};
    const set = (patch: Partial<NonNullable<StudioNode["coupon"]>>) => onChange({ coupon: { ...o, ...patch } });
    return (
      <div className="flex flex-col gap-2" data-commerce-controls="coupon">
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.couponLook")}
          <select value={o.look ?? "classic"} onChange={(e) => set({ look: e.target.value as (typeof STUDIO_COUPON_LOOKS)[number] })} className="h-9 rounded-lg px-1.5 font-normal" style={FIELD}>
            {STUDIO_COUPON_LOOKS.map((l) => (
              <option key={l} value={l}>
                {t(`studio.couponLook_${l}`)}
              </option>
            ))}
          </select>
        </label>
        <Toggle label={t("studio.couponPublic")} checked={o.bind === "public"} onChange={(on) => set({ bind: on ? "public" : undefined })} />
        <span className="text-xs" style={{ color: "var(--sf-muted)" }}>
          {o.bind === "public" ? t("studio.couponPublicHint") : t("studio.couponOwnHint")}
        </span>
      </div>
    );
  }
  if (node.type === "items" && node.source === "products") {
    const o = node.sale_badge;
    return (
      <div className="flex flex-col gap-2" data-commerce-controls="sale_badge">
        <label className="flex flex-col gap-1 font-bold">
          {t("studio.saleBadge")}
          <select value={o?.style ?? "chip"} onChange={(e) => onChange({ sale_badge: { ...(o ?? {}), style: e.target.value as (typeof STUDIO_SALE_BADGES)[number] } })} className="h-9 rounded-lg px-1.5 font-normal" style={FIELD}>
            {STUDIO_SALE_BADGES.map((l) => (
              <option key={l} value={l}>
                {t(`studio.saleBadge_${l}`)}
              </option>
            ))}
          </select>
        </label>
        <Toggle label={t("studio.saleCountdown")} checked={o?.countdown === true} onChange={(on) => onChange({ sale_badge: { style: o?.style ?? "chip", ...(o?.color ? { color: o.color } : {}), ...(on ? { countdown: true } : {}) } })} />
        <Colour label={t("studio.saleColour")} value={o?.color} onChange={(color) => onChange({ sale_badge: { style: o?.style ?? "chip", ...(o?.countdown ? { countdown: true } : {}), ...(color ? { color } : {}) } })} />
      </div>
    );
  }
  return null;
}
