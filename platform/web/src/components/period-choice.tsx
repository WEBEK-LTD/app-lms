"use client";

import type { PeriodKey } from "@/lib/billing/periods";
import { Icon } from "./icon";
import { useDashT } from "./dashboard-i18n";

/** 133 A period to choose on the dashboard's payment forms: its price, per month and the saving, worked out from the team's prices. */
export interface PeriodOption {
  key: PeriodKey | "once";
  price: string;
  perMonth?: string | null;
  saving?: number | null;
}

const LABEL_KEY = {
  once: "license.periodOnce",
  "1": "license.period1",
  "6": "license.period6",
  "12": "license.period12",
  "24": "license.period24",
  "36": "license.period36",
  lifetime: "license.periodLifetime",
} as const;

/**
 * 133 How long to pay for, as a row of choices (1 month, 6 months … for
 * life): each with its price, what it comes to per month and what it saves.
 * Lifetime stands out. The choice is the caller's state.
 */
export function PeriodChoice({ name, periods, value, onChange, legend }: { name: string; periods: PeriodOption[]; value: string; onChange: (key: string) => void; legend: string }) {
  const t = useDashT();
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0" data-period-choice="">
      <legend className="mb-1.5 text-sm font-semibold">{legend}</legend>
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(min(150px,100%),1fr))]">
        {periods.map((p) => {
          const on = p.key === value;
          const lifetime = p.key === "lifetime";
          return (
            <label
              key={p.key}
              data-period={p.key}
              className={`relative flex cursor-pointer flex-col gap-0.5 rounded-xl border px-3.5 py-2.5 ${
                lifetime
                  ? on
                    ? "on-dark border-2 border-ember bg-midnight text-white shadow-[0_10px_30px_-14px_rgba(255,90,31,0.7)]"
                    : "on-dark border-ember/50 bg-midnight text-white"
                  : on
                    ? "border-midnight bg-ivory"
                    : "border-line"
              }`}
            >
              <input type="radio" name={name} value={p.key} checked={on} onChange={() => onChange(p.key)} className="sr-only" />
              <span className="flex items-center gap-1.5 text-sm font-bold">
                {lifetime ? <Icon name="diamond" size={16} filled className="text-ember" /> : on ? <Icon name="check_circle" size={16} filled className="text-midnight" /> : null}
                {t(LABEL_KEY[p.key])}
              </span>
              <span className="text-[15px] font-extrabold" dir="ltr">
                {p.price}
              </span>
              {p.perMonth ? <span className={`text-[12px] ${lifetime ? "text-night-text" : "text-muted"}`}>{t("license.perMonthIs", { price: p.perMonth })}</span> : null}
              {lifetime ? <span className="text-[12px] font-semibold text-ember">{t("license.payOnce")}</span> : null}
              {p.saving ? (
                <span className="absolute -top-2.5 end-2 rounded-full bg-success px-2 py-0.5 text-[11px] font-bold text-white">{t("license.save", { percent: p.saving })}</span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
