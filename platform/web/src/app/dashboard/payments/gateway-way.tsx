"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { kit } from "@/components/studio-page";
import { KitWayRow } from "@/components/studio-page/way-row";

/**
 * 132.145 The card gateway as one way customers pay: its row (Card
 * payments, its state, the account it pays into) and its gateways and keys
 * under it, opened by Connect or Edit; open from the start while none is
 * connected, the page's next step. A region named "Card payments".
 */
export function GatewayWay({ connected, status, line, labels, children }: { connected: boolean; status: ReactNode; line: ReactNode; labels: { title: string; connect: string; edit: string }; children: ReactNode }) {
  const [open, setOpen] = useState(!connected);
  return (
    <KitWayRow
      titleId="h-payments"
      icon="credit_card"
      title={labels.title}
      status={status}
      description={line}
      open={open}
      bodyId="gateway-editor"
      data-way="card"
      control={
        <button type="button" aria-expanded={open} aria-controls="gateway-editor" onClick={() => setOpen((o) => !o)} className={kit.row} data-gateway-edit="">
          <Icon name={connected ? "tune" : "bolt"} size={16} />
          {connected ? labels.edit : labels.connect}
          <Icon name="expand_more" size={18} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      }
    >
      {children}
    </KitWayRow>
  );
}
