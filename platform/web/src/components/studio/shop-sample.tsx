"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ShopSample } from "@/lib/studio/shop-sample-types";

/** 175 The shop's currency, places and today for Studio's sample screens (null: the samples' own). */
const ShopSampleContext = createContext<ShopSample | null>(null);

export function ShopSampleProvider({ value, children }: { value: ShopSample | null; children?: ReactNode }) {
  return <ShopSampleContext.Provider value={value}>{children}</ShopSampleContext.Provider>;
}

export function useShopSample(): ShopSample | null {
  return useContext(ShopSampleContext);
}
