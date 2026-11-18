import Link from "next/link";
import { Icon } from "./icon";
import { ShelfOrder } from "./shelf-order";
import type { ShelfList, StockMoveRow } from "@/lib/market/panel-pages";
import { fill, type PanelLang, type PanelWords } from "@/lib/market/panel-words";

/**
 * 115.24 Editing a grocery's or shop's catalog, one product, department or
 * aisle at a time: the product's sheet (its names in each language, price,
 * by the unit or by weight with its step, least and most, SKU, barcode,
 * stock, department and aisle, on or off), its stock history, and the
 * departments and aisles in their order. Used by the vendors' panel and,
 * with the dashboard's words, by the owner's place page.
 */

const field = "h-11 w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink";
const label = "flex flex-col gap-1.5 text-sm font-bold text-ink-2";
const primary = "inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-midnight px-5 text-sm font-bold text-white hover:bg-ink-3";
const quiet = "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line px-4 text-sm font-bold text-ink-2 hover:border-midnight";
const danger = "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-danger/40 px-4 text-sm font-bold text-danger hover:bg-danger-bg";

/** The words the editor needs: the panel's (PANEL_WORDS) or the dashboard's, the same keys. */
export type CatalogWords = Pick<
  PanelWords,
  | "newProduct" | "editProduct" | "productName" | "productNameHint" | "nameEn" | "nameAr" | "nameTr" | "description" | "brand" | "price" | "wasPrice" | "soldBy" | "byUnit" | "byWeight"
  | "unitLabel" | "stepLabel" | "minQty" | "maxQty" | "skuLabel" | "barcodeLabel" | "stockLabel" | "stockHint" | "departmentLabel" | "aisleLabel" | "noneLabel" | "onSale" | "saveProduct"
  | "deleteProduct" | "deleteProductConfirm" | "closeEditor" | "savedNote" | "stockHistory" | "noStockMoves" | "moveOrder" | "moveReturn" | "moveSubstitute" | "moveEdit" | "moveImport" | "moveUndo"
  | "undo" | "notCounted" | "shelves" | "shelvesText" | "addDepartment" | "addAisle" | "departmentName" | "aisleName" | "rename" | "moveUp" | "moveDown" | "dragHint" | "saveOrder" | "deleteShelf"
  | "deleteDepartmentConfirm" | "deleteAisleConfirm" | "noDepartments" | "backToProducts" | "ownerSees" | "save"
>;

export function ProductEditor({ w, lang, values, shelves, moves, productId, currency, closeHref, error, saved, save, remove, undoMove, ownerNote }: {
  w: CatalogWords;
  lang: PanelLang;
  values: Record<string, string>;
  shelves: ShelfList;
  moves: StockMoveRow[];
  productId: number | null;
  currency: string;
  closeHref: string;
  error: string | null;
  saved: boolean;
  save: (f: FormData) => Promise<void>;
  remove: ((f: FormData) => Promise<void>) | null;
  undoMove: ((f: FormData) => Promise<void>) | null;
  ownerNote: boolean;
}) {
  const weighed = values.sold_by === "weight";
  return (
    <section id="product-editor" data-testid="product-editor" className="mb-6 rounded-[24px] border-2 border-ember/40 bg-white p-6 shadow-[0_24px_50px_-40px_rgba(14,13,36,0.6)] lg:p-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 flex items-center gap-2 text-xl font-extrabold tracking-[-0.4px] text-midnight">
          <Icon name={productId ? "edit" : "add"} size={22} className="text-accent" />
          {productId ? `${w.editProduct}: ${values.name}` : w.newProduct}
        </h2>
        <Link href={closeHref} className={quiet}>
          <Icon name="close" size={17} />
          {w.closeEditor}
        </Link>
      </header>
      {error ? <p className="mb-4 rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger" role="alert">{error}</p> : null}
      {saved ? <p className="mb-4 rounded-xl bg-success-bg px-4 py-3 text-sm font-semibold text-success">{w.savedNote}</p> : null}
      {ownerNote ? <p className="mb-4 text-[13px] text-muted">{w.ownerSees}</p> : null}
      <form action={save} className="grid gap-4 md:grid-cols-2">
        {productId ? <input type="hidden" name="id" value={productId} /> : null}
        <div className="flex flex-col gap-1.5 md:col-span-2">
          <label className={label}>
            {w.productName}
            <input name="name" required maxLength={160} defaultValue={values.name} aria-describedby="product-name-hint" className={field} />
          </label>
          <span id="product-name-hint" className="text-[12px] font-medium text-faint">{w.productNameHint}</span>
        </div>
        <label className={label}>
          {w.nameAr}
          <input name="name_ar" dir="rtl" maxLength={160} defaultValue={values.name_ar} className={field} />
        </label>
        <label className={label}>
          {w.nameEn}
          <input name="name_en" dir="ltr" maxLength={160} defaultValue={values.name_en} className={field} />
        </label>
        <label className={label}>
          {w.nameTr}
          <input name="name_tr" dir="ltr" maxLength={160} defaultValue={values.name_tr} className={field} />
        </label>
        <label className={label}>
          {w.brand}
          <input name="brand" maxLength={80} defaultValue={values.brand} className={field} />
        </label>
        <label className={`${label} md:col-span-2`}>
          {w.description}
          <textarea name="description" maxLength={1000} rows={2} defaultValue={values.description} className={`${field} h-auto py-2.5`} />
        </label>
        <label className={label}>
          {`${w.price} (${currency})`}
          <input name="price" required inputMode="decimal" dir="ltr" defaultValue={values.price} className={field} />
        </label>
        <label className={label}>
          {`${w.wasPrice} (${currency})`}
          <input name="was_price" inputMode="decimal" dir="ltr" defaultValue={values.was_price} className={field} />
        </label>
        <fieldset className="m-0 flex flex-col gap-3 rounded-2xl border border-line-soft bg-sand p-4 md:col-span-2">
          <legend className="px-1 text-sm font-bold text-ink-2">{w.soldBy}</legend>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-ink-2">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="sold_by" value="unit" defaultChecked={!weighed} className="h-4 w-4 accent-[var(--color-ember)]" />
              {w.byUnit}
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="sold_by" value="weight" defaultChecked={weighed} className="h-4 w-4 accent-[var(--color-ember)]" />
              {w.byWeight}
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className={label}>
              {w.unitLabel}
              <select name="unit" defaultValue={values.unit} className={field}>
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="l">l</option>
              </select>
            </label>
            <label className={label}>
              {w.stepLabel}
              <input name="step" inputMode="decimal" dir="ltr" defaultValue={values.step} className={field} />
            </label>
            <label className={label}>
              {w.minQty}
              <input name="min" inputMode="decimal" dir="ltr" defaultValue={values.min} className={field} />
            </label>
            <label className={label}>
              {w.maxQty}
              <input name="max" inputMode="decimal" dir="ltr" defaultValue={values.max} className={field} />
            </label>
          </div>
        </fieldset>
        <label className={label}>
          {w.skuLabel}
          <input name="sku" maxLength={64} dir="ltr" defaultValue={values.sku} className={field} />
        </label>
        <label className={label}>
          {w.barcodeLabel}
          <input name="barcode" maxLength={40} dir="ltr" inputMode="numeric" defaultValue={values.barcode} className={field} />
        </label>
        <div className="flex flex-col gap-1.5">
          <label className={label}>
            {w.stockLabel}
            <input name="stock" inputMode="decimal" dir="ltr" defaultValue={values.stock} aria-describedby="product-stock-hint" className={field} />
          </label>
          <span id="product-stock-hint" className="text-[12px] font-medium text-faint">{w.stockHint}</span>
        </div>
        <label className="inline-flex items-center gap-2 self-center text-sm font-bold text-ink-2">
          <input type="checkbox" name="in_stock" defaultChecked={values.in_stock === "on"} className="h-5 w-5 accent-[var(--color-ember)]" />
          {w.onSale}
        </label>
        <label className={label}>
          {w.departmentLabel}
          <select name="department_id" defaultValue={values.department_id} className={field}>
            <option value="">{w.noneLabel}</option>
            {shelves.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {w.aisleLabel}
          <select name="aisle_id" defaultValue={values.aisle_id} className={field}>
            <option value="">{w.noneLabel}</option>
            {shelves.departments.map((d) =>
              d.aisles.length ? (
                <optgroup key={d.id} label={d.name}>
                  {d.aisles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </optgroup>
              ) : null,
            )}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3 md:col-span-2">
          <button className={primary} data-testid="save-product">
            <Icon name="check" size={18} />
            {w.saveProduct}
          </button>
        </div>
      </form>
      {productId && remove ? (
        <form action={remove} className="mt-4">
          <input type="hidden" name="id" value={productId} />
          <details>
            <summary className={`${danger} w-fit cursor-pointer list-none`}>
              <Icon name="delete" size={17} />
              {w.deleteProduct}
            </summary>
            <p className="mt-3 mb-2 text-sm text-muted">{w.deleteProductConfirm}</p>
            <button className={danger}>{w.deleteProduct}</button>
          </details>
        </form>
      ) : null}
      {productId ? <StockHistory w={w} lang={lang} moves={moves} undo={undoMove} /> : null}
    </section>
  );
}

function moveWords(w: CatalogWords, m: StockMoveRow): string {
  const ref = m.orderRef ?? "";
  switch (m.reason) {
    case "order":
      return fill(w.moveOrder, { ref });
    case "return":
      return fill(w.moveReturn, { ref });
    case "substitute":
      return fill(w.moveSubstitute, { ref });
    case "import":
      return w.moveImport;
    case "undo":
      return w.moveUndo;
    default:
      return w.moveEdit;
  }
}

export function StockHistory({ w, lang, moves, undo }: { w: CatalogWords; lang: PanelLang; moves: StockMoveRow[]; undo: ((f: FormData) => Promise<void>) | null }) {
  const amount = (n: number | null, unit: string) => (n === null ? w.notCounted : `${n.toLocaleString(lang === "ar" ? "ar-EG" : lang)}${unit === "item" ? "" : ` ${unit}`}`);
  const when = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : lang, { dateStyle: "medium", timeStyle: "short" });
  return (
    <div className="mt-6 border-t border-line-soft pt-5" data-testid="stock-history">
      <h3 className="m-0 mb-3 flex items-center gap-2 text-base font-extrabold text-midnight">
        <Icon name="history" size={19} className="text-accent" />
        {w.stockHistory}
      </h3>
      {moves.length === 0 ? (
        <p className="m-0 text-sm text-faint">{w.noStockMoves}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {moves.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-sand px-4 py-2.5 text-sm">
              <span className="font-bold text-ink-2">
                {moveWords(w, m)}
                {m.byName ? <span className="font-medium text-muted"> · {m.byName}</span> : null}
              </span>
              <span className="flex items-center gap-3">
                <span dir="ltr" className={`font-extrabold ${m.change < 0 ? "text-danger" : "text-success"}`}>
                  {m.change > 0 ? "+" : ""}
                  {m.change}
                </span>
                <span className="text-muted" dir="ltr">
                  {amount(m.before, m.unit)} → {amount(m.after, m.unit)}
                </span>
                <span className="text-[12px] text-faint">{when.format(m.at)}</span>
                {m.undoable && undo ? (
                  <form action={undo}>
                    <input type="hidden" name="move" value={m.id} />
                    <button className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-bold text-accent hover:bg-peach">
                      <Icon name="undo" size={15} />
                      {w.undo}
                    </button>
                  </form>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ShelvesSection({ w, shelves, closeHref, error, save, remove, move, order }: {
  w: CatalogWords;
  shelves: ShelfList;
  closeHref: string;
  error: string | null;
  save: (f: FormData) => Promise<void>;
  remove: (f: FormData) => Promise<void>;
  move: (f: FormData) => Promise<void>;
  order: (f: FormData) => Promise<void>;
}) {
  const arrows = (kind: "department" | "aisle", id: number, first: boolean, last: boolean, departmentId?: number) => (
    <span className="flex items-center gap-1">
      {(["up", "down"] as const).map((dir) => (
        <form key={dir} action={move}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          {departmentId ? <input type="hidden" name="department_id" value={departmentId} /> : null}
          <input type="hidden" name="move" value={dir} />
          <button disabled={dir === "up" ? first : last} aria-label={dir === "up" ? w.moveUp : w.moveDown} title={dir === "up" ? w.moveUp : w.moveDown} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 hover:bg-white disabled:opacity-30">
            <Icon name={dir === "up" ? "arrow_upward" : "arrow_downward"} size={17} />
          </button>
        </form>
      ))}
    </span>
  );
  const rename = (kind: "department" | "aisle", id: number, name: string, departmentId?: number) => (
    <details className="relative">
      <summary className="flex h-8 cursor-pointer list-none items-center gap-1 rounded-lg px-2 text-[13px] font-bold text-ink-2 hover:bg-white">
        <Icon name="edit" size={15} />
        {w.rename}
      </summary>
      <form action={save} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        {departmentId ? <input type="hidden" name="department_id" value={departmentId} /> : null}
        <input name="name" required maxLength={80} defaultValue={name} className={`${field} h-9 w-52`} />
        <button className={quiet}>{w.save}</button>
      </form>
    </details>
  );
  const drop = (kind: "department" | "aisle", id: number) => (
    <details>
      <summary className="flex h-8 cursor-pointer list-none items-center gap-1 rounded-lg px-2 text-[13px] font-bold text-danger hover:bg-danger-bg">
        <Icon name="delete" size={15} />
        {w.deleteShelf}
      </summary>
      <form action={remove} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <p className="m-0 max-w-sm text-[13px] text-muted">{kind === "department" ? w.deleteDepartmentConfirm : w.deleteAisleConfirm}</p>
        <button className={`${danger} w-fit`}>{w.deleteShelf}</button>
      </form>
    </details>
  );
  return (
    <section data-testid="shelves" className="rounded-[24px] border border-line bg-white p-6 shadow-[0_24px_50px_-40px_rgba(14,13,36,0.6)] lg:p-8">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="m-0 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.5px] text-midnight">
            <Icon name="category" size={24} className="text-accent" />
            {w.shelves}
          </h2>
          <p className="mt-2 mb-0 text-[15px] text-muted">{w.shelvesText}</p>
        </div>
        <Link href={closeHref} className={quiet}>
          <Icon name="inventory_2" size={17} />
          {w.backToProducts}
        </Link>
      </header>
      {error ? <p className="mb-4 rounded-xl bg-danger-bg px-4 py-3 text-sm font-semibold text-danger" role="alert">{error}</p> : null}
      <form action={save} className="mb-5 flex flex-wrap items-end gap-2">
        <input type="hidden" name="kind" value="department" />
        <label className={label}>
          {w.departmentName}
          <input name="name" required maxLength={80} className={`${field} w-64`} />
        </label>
        <button className={primary}>
          <Icon name="add" size={18} />
          {w.addDepartment}
        </button>
      </form>
      <div className="mb-5">
        <ShelfOrder items={shelves.departments.map((d) => ({ id: d.id, name: d.name }))} action={order} hidden={{ kind: "department" }} labels={{ hint: w.dragHint, save: w.saveOrder }} />
      </div>
      {shelves.departments.length === 0 ? (
        <p className="m-0 rounded-2xl border-2 border-dashed border-line px-5 py-10 text-center text-sm font-semibold text-faint">{w.noDepartments}</p>
      ) : (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {shelves.departments.map((d, i) => (
            <li key={d.id} data-department={d.name} className="rounded-2xl border border-line-soft bg-sand p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[15px] font-extrabold text-ink">{d.name}</span>
                <span className="flex flex-wrap items-center gap-1">
                  {arrows("department", d.id, i === 0, i === shelves.departments.length - 1)}
                  {rename("department", d.id, d.name)}
                  {drop("department", d.id)}
                </span>
              </div>
              <ul className="mt-3 mb-0 flex list-none flex-col gap-1.5 ps-4">
                {d.aisles.map((a, j) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-1.5">
                    <span className="text-sm font-bold text-ink-2">{a.name}</span>
                    <span className="flex flex-wrap items-center gap-1">
                      {arrows("aisle", a.id, j === 0, j === d.aisles.length - 1, d.id)}
                      {rename("aisle", a.id, a.name, d.id)}
                      {drop("aisle", a.id)}
                    </span>
                  </li>
                ))}
              </ul>
              {d.aisles.length > 1 ? (
                <div className="mt-2 ps-4">
                  <ShelfOrder items={d.aisles} action={order} hidden={{ kind: "aisle", department_id: String(d.id) }} labels={{ hint: w.dragHint, save: w.saveOrder }} />
                </div>
              ) : null}
              <form action={save} className="mt-3 flex flex-wrap items-center gap-2 ps-4">
                <input type="hidden" name="kind" value="aisle" />
                <input type="hidden" name="department_id" value={d.id} />
                <input name="name" required maxLength={80} placeholder={w.aisleName} aria-label={w.aisleName} className={`${field} h-9 w-52`} />
                <button className={quiet}>
                  <Icon name="add" size={16} />
                  {w.addAisle}
                </button>
              </form>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
