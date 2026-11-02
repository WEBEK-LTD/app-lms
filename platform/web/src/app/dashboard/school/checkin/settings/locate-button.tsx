"use client";

import { useState } from "react";
import { useDashT } from "@/components/dashboard-i18n";
import { Icon } from "@/components/icon";
import { btn } from "@/components/ui";

/** 113.2 Fills the school's place with this device's location (standing at the school). */
export function LocateButton({ latId, lngId }: { latId: string; lngId: string }) {
  const t = useDashT();
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  const locate = () => {
    if (!("geolocation" in navigator)) {
      setState("failed");
      return;
    }
    setState("busy");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const set = (id: string, value: number) => {
          const input = document.getElementById(id) as HTMLInputElement | null;
          if (input) input.value = String(Math.round(value * 1e6) / 1e6);
        };
        set(latId, position.coords.latitude);
        set(lngId, position.coords.longitude);
        setState("idle");
      },
      () => setState("failed"),
      { enableHighAccuracy: true, timeout: 20_000 },
    );
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" onClick={locate} disabled={state === "busy"} className={`${btn.secondary} h-10 px-4 text-sm`}>
        <Icon name={state === "busy" ? "progress_activity" : "my_location"} size={18} className={state === "busy" ? "animate-spin" : undefined} />
        {state === "busy" ? t("school.locating") : t("school.useHere")}
      </button>
      {state === "failed" ? (
        <span role="alert" className="text-sm font-semibold text-danger">
          {t("school.locateFailed")}
        </span>
      ) : null}
    </div>
  );
}
