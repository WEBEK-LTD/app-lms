import { notFound } from "next/navigation";
import { VendorBoard, type BoardData, type BoardOrder } from "@/components/vendor-board";
import { PANEL_WORDS, panelLang } from "@/lib/market/panel-words";

export const dynamic = "force-dynamic";

/** The time the sample orders are placed around. */
function clock(): number {
  return Date.now();
}

/** 115.7 The vendors' board with sample orders, for design reviews outside production only. */
export default async function PanelPreview(props: PageProps<"/partner/preview">) {
  if (process.env.NODE_ENV === "production") notFound();
  const search = await props.searchParams;
  const lang = panelLang(typeof search.lang === "string" ? search.lang : null, null);
  const now = clock();
  const ago = (m: number) => new Date(now - m * 60_000).toISOString();
  const later = (m: number) => new Date(now + m * 60_000).toISOString();
  const egp = (n: number) => ({ amount: n.toFixed(2), formatted: `EGP ${n.toFixed(2)}` });
  const line = (id: number, name: string, quantity: number, total: number, extra: Partial<BoardOrder["lines"][number]> = {}) => ({ id, name, quantity, unit: "item" as const, choices: [], note: null, total: egp(total), if_missing: "remove" as const, outcome: null, ...extra });
  const order = (o: Partial<BoardOrder> & Pick<BoardOrder, "id" | "reference" | "status" | "lines" | "subtotal" | "created_at">): BoardOrder => ({
    fulfilment: "delivery",
    scheduled_for: null,
    customer: { first_name: "Mona" },
    notes: null,
    dropoff: null,
    payment: { method: "card", status: "paid", collect: null },
    prep_minutes: null,
    ready_at: null,
    courier: null,
    ...o,
  });
  const data: BoardData = {
    desk: { id: 1, kind: "restaurant", name: "Nile Grill House", logo_url: null, open: true, busy_until: null, paused: false, accepting: true, delivery_by: "app", role: "manager", today: { orders: 38, sales: egp(14_260), new_orders: 2 } },
    fresh: [
      order({ id: 1, reference: "M-1142", status: "placed", created_at: ago(4), customer: { first_name: "Karim" }, lines: [line(1, "Mixed grill platter", 1, 420, { choices: ["Large", "Extra tahini"] }), line(2, "Koshari bowl", 2, 160, { note: "No onions on one" }), line(3, "Fresh mango juice", 2, 110)], subtotal: egp(690), payment: { method: "cash", status: "unpaid", collect: null }, notes: "Ring the bell twice, please." }),
      order({ id: 2, reference: "M-1143", status: "placed", created_at: ago(1), customer: { first_name: "Salma" }, fulfilment: "pickup", lines: [line(1, "Chicken shawarma wrap", 3, 255), line(2, "Garlic sauce", 3, 30)], subtotal: egp(285) }),
    ],
    active: [
      order({ id: 3, reference: "M-1139", status: "accepted", created_at: ago(14), customer: { first_name: "Omar" }, ready_at: later(6), prep_minutes: 20, lines: [line(1, "Kofta sandwich", 2, 180), line(2, "Baba ghanoush", 1, 65)], subtotal: egp(245) }),
      order({ id: 4, reference: "M-1137", status: "accepted", created_at: ago(26), customer: { first_name: "Nour" }, ready_at: ago(3), prep_minutes: 20, lines: [line(1, "Family feast", 1, 980, { choices: ["Grilled chicken", "Rice"] })], subtotal: egp(980) }),
      order({ id: 5, reference: "M-1135", status: "ready", created_at: ago(31), customer: { first_name: "Hoda" }, courier: { name: "Ahmed" }, lines: [line(1, "Grilled half chicken", 2, 340), line(2, "Tahini salad", 2, 70)], subtotal: egp(410) }),
      order({ id: 6, reference: "M-1134", status: "ready", created_at: ago(35), customer: { first_name: "Youssef" }, lines: [line(1, "Liver sandwich", 4, 220)], subtotal: egp(220), payment: { method: "cash", status: "unpaid", collect: null } }),
    ],
    scheduled: [],
  };
  return <VendorBoard initial={data} words={PANEL_WORDS[lang]} lang={lang} endpoint={null} />;
}
