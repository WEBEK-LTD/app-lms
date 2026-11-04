import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VendorBoard, type BoardData, type BoardOrder } from "@/components/vendor-board";
import { CatalogSection, PanelTabs, PartnerFrame } from "@/components/partner-pages";
import { formatMinor } from "@/lib/market/currency";
import { PANEL_WORDS, panelLang } from "@/lib/market/panel-words";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Partner panel preview", robots: { index: false, follow: false } };

/** The preview's buttons change nothing. */
async function noop(): Promise<void> {
  "use server";
}

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
  const egp = (n: number) => ({ amount: n.toFixed(2), formatted: formatMinor(Math.round(n * 100), "EGP") });
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
  const w = PANEL_WORDS[lang];
  const tab = search.tab === "catalog" ? "catalog" : "orders";
  const nav = <PanelTabs tabs={["orders", "catalog", "import", "delivery", "staff", "statements", "complaints"]} current={tab} base="/partner/preview" lang={lang} w={w} />;
  if (tab === "catalog") {
    const item = (id: number, name: string, section: string, price: number, unit: string, inStock: boolean, stock: number | null, sku: string) => ({ id, name, section, price, unit, inStock, stock, sku, image: null });
    const items = [
      item(1, "Red apples", "Fruit & vegetables", 4500, "kg", true, null, "FRU-001"),
      item(2, "Bananas", "Fruit & vegetables", 3200, "kg", true, null, "FRU-002"),
      item(3, "Full cream milk 1 L", "Dairy & eggs", 3850, "item", true, 42, "DAI-104"),
      item(4, "Greek yoghurt 500 g", "Dairy & eggs", 6500, "item", false, 0, "DAI-118"),
      item(5, "Free-range eggs, 12", "Dairy & eggs", 9900, "item", true, 18, "DAI-130"),
      item(6, "Basmati rice 5 kg", "Pantry", 42500, "item", true, 9, "PAN-210"),
      item(7, "Extra virgin olive oil 1 L", "Pantry", 38900, "item", true, 14, "PAN-233"),
      item(8, "Sourdough loaf", "Bakery", 6000, "item", false, 0, "BAK-007"),
      item(9, "Ground coffee 250 g", "Coffee & tea", 21000, "item", true, 25, "COF-012"),
    ];
    return (
      <PartnerFrame name="Green Basket Market" kind="grocery" lang={lang} w={w} tabs={nav} signOut={noop}>
        <CatalogSection w={w} lang={lang} base="/partner/preview" items={items} total={1248} perPage={30} page={1} q="" outOnly={false} currency="EGP" assetUrl={(id) => id} saveStock={noop} />
      </PartnerFrame>
    );
  }
  return <VendorBoard initial={data} words={w} lang={lang} endpoint={null} nav={nav} />;
}
