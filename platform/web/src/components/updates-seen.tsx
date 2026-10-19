"use client";

import { useEffect, useRef } from "react";
import { markUpdatesReadAction } from "@/app/actions/updates";
import { UPDATES_EVENT } from "./updates-bell";

/**
 * 57 On the full list: marks what it shows as read once it is on screen
 * (the page still shows them as new this time) and tells the bell the new
 * count. Renders nothing.
 */
export function UpdatesSeen({ keys }: { keys: string[] }) {
  const sent = useRef("");
  useEffect(() => {
    const id = keys.join(",");
    if (!keys.length || sent.current === id) return;
    sent.current = id;
    void markUpdatesReadAction({ keys }).then((bell) => {
      window.dispatchEvent(new CustomEvent(UPDATES_EVENT, { detail: bell }));
    });
  }, [keys]);
  return null;
}
