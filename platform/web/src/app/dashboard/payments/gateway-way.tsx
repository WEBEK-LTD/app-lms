"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { kit } from "@/components/studio-page";
import { KitWayRow } from "@/components/studio-page/way-row";

/** Where the page's "Connect a card gateway" and How customers pay's link lead: this row, opened. */
const GATEWAY_HASH = "#gateway";

/**
 * 132.145 The card gateway as one way customers pay: its row (Card
 * payments, its state, the account it pays into) and its gateways and keys
 * under it, opened by Connect or Edit. A region named "Card payments".
 * 132.180 In the console: closed at first, connected or not; the page's
 * "Connect a card gateway" (a link to #gateway) opens it too.
 */
export function GatewayWay({ connected, status, line, labels, children }: { connected: boolean; status: ReactNode; line: ReactNode; labels: { title: string; connect: string; edit: string }; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const reveal = () => {
      setOpen(true);
      document.getElementById("gateway")?.scrollIntoView({ block: "start", behavior: "smooth" });
    };
    // Arrived with #gateway, or a link to it clicked (again) on the page.
    if (window.location.hash === GATEWAY_HASH) reveal();
    const onClick = (event: MouseEvent) => {
      if ((event.target as Element | null)?.closest?.(`a[href="${GATEWAY_HASH}"]`)) reveal();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return (
    <KitWayRow
      id="gateway"
      titleId="h-payments"
      icon="credit_card"
      title={labels.title}
      status={status}
      description={line}
      open={open}
      bodyId="gateway-editor"
      data-way="card"
      control={
        <button type="button" aria-expanded={open} aria-controls="gateway-editor" onClick={() => setOpen((o) => !o)} className={kit.quiet} data-gateway-edit="">
          <Icon name={connected ? "tune" : "bolt"} size={17} />
          {connected ? labels.edit : labels.connect}
          <Icon name="expand_more" size={18} className={`text-(--sp-muted) transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      }
    >
      {children}
    </KitWayRow>
  );
}
