"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { saveProductAction } from "@/app/actions/catalog";
import { Field, FieldError, FormMessage } from "@/components/form";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { MediaImagesPicker } from "@/components/media-picker";
import { useDashLang, useDashT } from "@/components/dashboard-i18n";
import { SaveBar, SortableList, useDirtyForm, useLeaveGuard } from "@/components/manage-kit-client";
import { CopyButton } from "@/components/copy-button";
import { parsePrice } from "@/lib/catalog/money";
import { initialFormState } from "@/lib/forms";
import { richText } from "@/i18n/rich";
import { AddonFields, Check, OptionGroupsEditor, VariantsEditor, type ProductFormValues } from "./forms";

/** One card of the editor: its heading, a line about it, and its fields. */
function Card({ id, icon, title, description, children }: { id: string; icon: IconName; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    // Not named by its heading: a card's name ("Stock") would be taken for its field's.
    <section id={id} className="flex min-w-0 scroll-mt-6 flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ivory text-midnight">
          <Icon name={icon} size={20} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={`${id}-title`} className="m-0 text-[17px] font-extrabold">
            {title}
          </h2>
          {description ? <p className="m-0 text-[13px] leading-relaxed text-muted">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

/** "450", "450.50" or "450,50" in cents; anything else null. */
/** 133.2 A typed price in cents, with the currency's digits (as the server reads it). */
function centsOf(text: string, currency?: string): number | null {
  return text.trim() === "" ? null : parsePrice(text, currency);
}

/**
 * 132.11 The product's photos: dragged (or moved with the arrows) into
 * order, the first one its cover; one removed until it's saved can be kept
 * again. New ones dropped here or chosen, or from the Media library.
 */
function Photos({ initial, error }: { initial: { id: string; url: string }[]; error?: string }) {
  const t = useDashT();
  const [photos, setPhotos] = useState(initial.map((p) => ({ ...p, removed: false })));
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const kept = photos.filter((p) => !p.removed);
  const showFiles = (list: FileList | null) => {
    for (const f of files) URL.revokeObjectURL(f.url);
    setFiles([...(list ?? [])].map((f) => ({ name: f.name, url: URL.createObjectURL(f) })));
  };
  useEffect(() => () => files.forEach((f) => URL.revokeObjectURL(f.url)), [files]);
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="sr-only">{t("shop.photos")}</legend>
      <input type="hidden" name="imageOrder" value={kept.map((p) => p.id).join(",")} />
      {photos.filter((p) => p.removed).map((p) => (
        <input key={p.id} type="hidden" name="removeImage" value={p.id} />
      ))}
      {photos.length ? (
        <SortableList
          items={photos}
          idOf={(p) => p.id}
          axis="x"
          hint={t("manage.photosDragHint")}
          moved={(place, count) => t("manage.moved", { place, count })}
          onReorder={(ids) => setPhotos((all) => ids.map((id) => all.find((p) => p.id === id)!))}
          className="m-0 grid list-none gap-3 p-0 [grid-template-columns:repeat(auto-fill,minmax(112px,1fr))]"
          render={(p, sortable) => {
            const cover = !p.removed && kept[0]?.id === p.id;
            return (
              <div data-photo={p.id} className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white ${cover ? "border-midnight" : "border-line"}`}>
                <button type="button" {...sortable.handle} data-sortable-handle="" aria-label={`${t("manage.drag")}: ${t("manage.photoN", { n: sortable.index + 1 })}`} className="block cursor-grab border-0 bg-transparent p-0 active:cursor-grabbing">
                  {/* eslint-disable-next-line @next/next/no-img-element -- An uploaded picture, already sized by the platform. */}
                  <img src={p.url} alt="" draggable={false} className={`aspect-square w-full object-cover ${p.removed ? "opacity-30 grayscale" : ""}`} />
                </button>
                {cover ? <span className="absolute start-1.5 top-1.5 rounded-full bg-midnight px-2 py-0.5 text-[11px] font-bold text-ivory">{t("manage.cover")}</span> : null}
                <span className="flex items-center justify-between gap-1 border-t border-line-soft px-1 py-1">
                  <button type="button" onClick={sortable.moveUp ?? undefined} disabled={!sortable.moveUp || p.removed} aria-label={t("manage.photoEarlier", { n: sortable.index + 1 })} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-sand hover:text-midnight disabled:opacity-30">
                    <Icon name="chevron_left" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotos((all) => all.map((x) => (x.id === p.id ? { ...x, removed: !x.removed } : x)))}
                    className={`h-7 cursor-pointer rounded-md border-0 bg-transparent px-1.5 text-xs font-bold ${p.removed ? "text-accent" : "text-danger"} hover:bg-sand`}
                    aria-label={p.removed ? t("manage.photoKeep", { n: sortable.index + 1 }) : t("manage.photoRemove", { n: sortable.index + 1 })}
                  >
                    {p.removed ? t("manage.keep") : t("common.remove")}
                  </button>
                  <button type="button" onClick={sortable.moveDown ?? undefined} disabled={!sortable.moveDown || p.removed} aria-label={t("manage.photoLater", { n: sortable.index + 1 })} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-muted hover:bg-sand hover:text-midnight disabled:opacity-30">
                    <Icon name="chevron_right" size={18} />
                  </button>
                </span>
              </div>
            );
          }}
        />
      ) : null}
      {/* New photos: dropped on the box, or chosen. */}
      <label
        onDragOver={(e) => {
          if ([...e.dataTransfer.types].includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length || !input.current) return;
          e.preventDefault();
          setOver(false);
          input.current.files = e.dataTransfer.files;
          input.current.dispatchEvent(new Event("change", { bubbles: true }));
          showFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus-within:border-midnight ${over ? "border-ember bg-peach" : "border-line-strong bg-sand hover:border-midnight"}`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-midnight">
          <Icon name="add_photo_alternate" size={22} />
        </span>
        <span className="text-[15px] font-bold">{t("manage.photosDrop")}</span>
        <span id="f-images-hint" className="max-w-[440px] text-[13px] text-muted">
          {t("shop.photosHint")}
        </span>
        <input
          ref={input}
          type="file"
          name="images"
          multiple
          accept="image/png,image/jpeg"
          className="sr-only"
          aria-label={t("manage.photosDrop")}
          aria-describedby="f-images-hint"
          aria-invalid={error ? true : undefined}
          onChange={(e) => showFiles(e.currentTarget.files)}
        />
      </label>
      {files.length ? (
        <ul aria-label={t("manage.photosNew")} className="m-0 flex list-none flex-wrap gap-3 p-0">
          {files.map((f) => (
            <li key={f.url} className="flex w-20 flex-col items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element -- A preview of a file not uploaded yet. */}
              <img src={f.url} alt="" className="h-20 w-20 rounded-lg border border-dashed border-line-strong object-cover" />
              <span className="w-full truncate text-center text-[11px] text-muted">{f.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {/* 51 Or pictures already in the Media library. */}
      <MediaImagesPicker />
      <FieldError id="f-images-error" error={error} />
    </fieldset>
  );
}

/** How a link to the product looks in search results and when shared. */
function SharePreview({ name, description, url, words }: { name: string; description: string; url: string | null; words: { untitled: string; noDescription: string; notSaved: string } }) {
  const text = description.replace(/\s+/g, " ").trim();
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line-soft bg-sand px-4 py-3.5" data-share-preview="">
      <span className="flex items-center gap-2 text-[13px] text-muted">
        <span aria-hidden="true" className="flex h-5 w-5 items-center justify-center rounded-full bg-white">
          <Icon name="public" size={14} />
        </span>
        <span className="truncate" dir="ltr">
          {url ?? words.notSaved}
        </span>
      </span>
      <span className="text-[17px] leading-snug font-bold break-words text-accent">{name.trim() || words.untitled}</span>
      <span className="line-clamp-2 text-[13px] leading-relaxed text-ink-4">{text ? (text.length > 160 ? `${text.slice(0, 157)}…` : text) : words.noDescription}</span>
    </div>
  );
}

/**
 * 132.11 A product's editor: its details, photos, price and sale, sizes and
 * options, stock, delivery, add-on and how it's found and shared, with its
 * place in the app and categories at the side. The form is sent without
 * being cleared, so what was typed stays when something needs fixing; a
 * bar at the foot says when there are unsaved changes, and leaving asks.
 */
export function ProductEditor({
  product,
  categories,
  currency,
  restaurant,
  products,
  share,
}: {
  product: ProductFormValues;
  categories: { id: number; name: string }[];
  currency: string;
  restaurant: boolean;
  /** 131 The shop's other products, for an add-on offered with some of them. */
  products: { id: number; name: string }[];
  /** The product's own page, once it's saved and shown. */
  share: string | null;
}) {
  const t = useDashT();
  const lang = useDashLang();
  const kind = restaurant ? "restaurant" : "shop";
  const [state, dispatch, pending] = useActionState(saveProductAction, initialFormState);
  const form = useRef<HTMLFormElement>(null);
  const { dirty } = useDirtyForm(form);
  useLeaveGuard(dirty && !pending, t("common.leaveUnsaved"));
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(product.price);
  const [sale, setSale] = useState(product.salePrice);
  const [active, setActive] = useState(product.active);
  const errors = state.errors ?? {};
  const errorCount = Object.keys(errors).length;

  // Something to fix: back to the first field that says so.
  useEffect(() => {
    if (!state.errors && !state.message) return;
    requestAnimationFrame(() => {
      const first = form.current?.querySelector<HTMLElement>('[aria-invalid="true"], [id$="-error"], [role="alert"]');
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (first instanceof HTMLInputElement || first instanceof HTMLTextAreaElement) first.focus({ preventScroll: true });
    });
  }, [state]);

  const money = (cents: number) => {
    try {
      return new Intl.NumberFormat(`${lang}-u-nu-latn`, { style: "currency", currency }).format(cents / 100);
    } catch {
      return `${(cents / 100).toFixed(2)} ${currency}`;
    }
  };
  const priceCents = centsOf(price, currency);
  const saleCents = centsOf(sale, currency);
  const onSale = priceCents !== null && saleCents !== null && saleCents < priceCents && priceCents > 0;
  const sections: { id: string; label: string; icon: IconName }[] = [
    { id: "p-details", label: t("common.details"), icon: "edit_note" },
    { id: "p-photos", label: t("shop.photos"), icon: "photo_library" },
    { id: "p-price", label: t("manage.secPrice"), icon: "sell" },
    { id: "p-options", label: t("shop.formOptions", { kind }), icon: "tune" },
    { id: "p-stock", label: t("shop.stock"), icon: "inventory_2" },
    { id: "p-delivery", label: t("manage.secDelivery"), icon: "local_shipping" },
    ...(restaurant ? [] : [{ id: "p-addon", label: t("manage.secAddon"), icon: "redeem" as const }]),
    { id: "p-search", label: t("manage.secSearch"), icon: "travel_explore" },
  ];
  const chip = "flex cursor-pointer items-center gap-2 rounded-full border border-line py-1.5 ps-2.5 pe-3.5 text-sm has-[:checked]:border-midnight has-[:checked]:bg-sand";

  return (
    <form
      ref={form}
      noValidate
      className="flex flex-col gap-5"
      data-product-editor=""
      onSubmit={(event) => {
        event.preventDefault();
        // Sent as it is, never cleared: a field to fix keeps everything typed.
        const data = new FormData(event.currentTarget);
        startTransition(() => dispatch(data));
      }}
    >
      {product.id !== null ? <input type="hidden" name="id" value={product.id} /> : null}
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card id="p-details" icon="edit_note" title={t("common.details")} description={t("shop.formAboutHint")}>
            <Field label={t("common.name")} name="name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} error={errors.name} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="f-description" className="text-sm font-semibold">
                {t("common.description")}
              </label>
              <textarea
                id="f-description"
                name="description"
                rows={6}
                maxLength={5000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input min-h-32 py-3"
                aria-describedby="f-description-hint"
                aria-invalid={errors.description ? true : undefined}
              />
              <span id="f-description-hint" className="flex justify-between gap-3 text-[13px] text-muted">
                <span>{t("shop.descriptionHint")}</span>
                <span className="tabular-nums">{description.length}/5000</span>
              </span>
              <FieldError id="f-description-error" error={errors.description} />
            </div>
          </Card>

          <Card id="p-photos" icon="photo_library" title={t("shop.photos")} description={t("manage.photosIntro")}>
            <Photos initial={product.images} error={errors.images} />
          </Card>

          <Card id="p-price" icon="sell" title={t("manage.secPrice")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("shop.priceIn", { currency })} name="price" inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="450.00" error={errors.price} dir="ltr" />
              <Field label={t("shop.salePriceIn", { currency })} name="salePrice" inputMode="decimal" value={sale} onChange={(e) => setSale(e.target.value)} hint={t("shop.saleHint")} error={errors.salePrice} dir="ltr" />
            </div>
            <p className={`m-0 flex flex-wrap items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm ${onSale ? "bg-peach text-ink-2" : "bg-sand text-muted"}`} data-sale-preview="">
              <Icon name={onSale ? "sell" : "info"} size={18} className={onSale ? "text-accent" : ""} />
              {onSale
                ? richText(t("manage.salePreview", { price: money(saleCents), was: money(priceCents), percent: Math.round((1 - saleCents / priceCents) * 100) }), {
                    was: (chunk) => <s>{chunk}</s>,
                    b: (chunk) => <strong>{chunk}</strong>,
                  })
                : t("manage.noSale")}
            </p>
          </Card>

          <Card id="p-options" icon="tune" title={t("shop.formOptions", { kind })} description={t("shop.formOptionsHint", { kind })}>
            {restaurant ? null : <VariantsEditor initial={product.variants} currency={currency} error={errors.variants} />}
            <OptionGroupsEditor initial={product.optionGroups} currency={currency} restaurant={restaurant} error={errors.optionGroups} />
          </Card>

          <Card id="p-stock" icon="inventory_2" title={t("shop.stock")} description={product.variants.items.length ? t("manage.stockVariants") : undefined}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("shop.stock")} name="stock" inputMode="numeric" defaultValue={product.stock} hint={t("shop.stockHint")} error={errors.stock} dir="ltr" />
              <Field label={t("shop.sku")} name="sku" maxLength={64} defaultValue={product.sku} hint={t("shop.skuHint")} error={errors.sku} dir="ltr" />
            </div>
          </Card>

          <Card id="p-delivery" icon="local_shipping" title={t("manage.secDelivery")}>
            {/* 131 Its weight, for shipping priced by weight. */}
            <Field label={t("shop.weight")} name="weight" inputMode="decimal" defaultValue={product.weight ?? ""} hint={t("shop.weightHint")} error={errors.weight} className="sm:max-w-[280px]" dir="ltr" />
            {restaurant ? null : <Check name="digital" label={t("shop.digital")} hint={t("shop.digitalHint")} defaultChecked={product.digital} />}
          </Card>

          {/* 131 A gift add-on: chocolates, a card, a vase. */}
          {restaurant ? null : (
            <Card id="p-addon" icon="redeem" title={t("manage.secAddon")}>
              <AddonFields product={product} categories={categories} products={products} error={errors.addonFor} />
            </Card>
          )}

          <Card id="p-search" icon="travel_explore" title={t("manage.secSearch")} description={t("manage.searchIntro")}>
            <SharePreview name={name} description={description} url={share} words={{ untitled: t("shop.new", { kind }), noDescription: t("manage.noDescription"), notSaved: t("manage.linkAfterSave") }} />
            {share ? (
              <div className="flex flex-wrap items-center gap-2">
                <a href={share} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-white px-3.5 text-sm font-semibold text-midnight no-underline hover:border-midnight hover:text-midnight">
                  <Icon name="open_in_new" size={18} />
                  {t("manage.openPage")}
                </a>
                <CopyButton value={share} label={t("common.copy")} copiedLabel={t("common.copied")} />
              </div>
            ) : null}
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-4">
          <section aria-labelledby="p-status-title" className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 id="p-status-title" className="m-0 text-[17px] font-extrabold">
                {t("shop.sideStatus")}
              </h2>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${active ? "bg-success-bg text-success" : "bg-line-soft text-muted"}`}>
                <Icon name={active ? "visibility" : "visibility_off"} size={14} />
                {active ? t("manage.shown") : t("common.hidden")}
              </span>
            </div>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" name="active" checked={active} onChange={(e) => setActive(e.target.checked)} className="mt-1 h-4 w-4 accent-midnight" />
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold">{t("shop.show")}</span>
                <span className="text-[13px] text-muted">{t("shop.showHint")}</span>
              </span>
            </label>
            <Check name="featured" label={t("shop.featured")} hint={t("shop.featuredHint")} defaultChecked={product.featured} />
            {share && product.active ? (
              <p className="m-0 border-t border-line-soft pt-3 text-[13px] leading-relaxed text-ink-4">
                {richText(t("shop.shareIt"), {
                  link: () => (
                    <a href={share} className="break-all" dir="ltr" data-leave-ok="">
                      {share}
                    </a>
                  ),
                })}
              </p>
            ) : null}
          </section>

          <section aria-labelledby="p-categories-title" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
            <h2 id="p-categories-title" className="m-0 text-[17px] font-extrabold">
              {t("shop.categories")}
            </h2>
            {categories.length ? (
              <fieldset className="m-0 flex flex-wrap gap-2 border-0 p-0">
                <legend className="sr-only">{t("shop.categories")}</legend>
                {categories.map((c) => (
                  <label key={c.id} className={chip}>
                    <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={product.categoryIds.includes(c.id)} className="h-4 w-4 accent-midnight" />
                    {c.name}
                  </label>
                ))}
              </fieldset>
            ) : (
              <p className="m-0 text-[13px] text-muted">{t("manage.noCategoriesYet")}</p>
            )}
            <Link href="/dashboard/catalog/categories" className="flex w-fit items-center gap-1 text-sm font-semibold">
              <Icon name="category" size={18} />
              {t("manage.manageCategories")}
            </Link>
          </section>

          {/* The editor's parts, to jump to (wide screens). */}
          <nav aria-label={t("manage.onThisPage")} className="flex flex-col gap-1 rounded-2xl border border-line bg-white p-3 max-lg:hidden">
            <p className="m-0 px-2 pb-1 text-xs font-bold tracking-[0.4px] text-muted uppercase">{t("manage.onThisPage")}</p>
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-ink-3 no-underline hover:bg-sand hover:text-midnight">
                <Icon name={s.icon} size={18} className="text-muted" />
                {s.label}
              </a>
            ))}
          </nav>
        </aside>
      </div>

      <SaveBar
        dirty={dirty}
        pending={pending}
        errorCount={errorCount}
        saveLabel={product.id === null ? t("shop.add", { kind }) : t("shop.save", { kind })}
        cancel={{ href: "/dashboard/catalog", label: t("common.cancel") }}
        words={{ unsaved: t("manage.unsaved"), saved: product.id === null ? t("manage.newNotSaved", { kind }) : t("manage.noChanges"), saving: t("common.saving"), errors: t("manage.fixErrors", { count: errorCount }) }}
      />
    </form>
  );
}
