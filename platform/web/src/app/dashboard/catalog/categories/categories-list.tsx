"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteCategoryAction, renameCategoryAction, reorderCategoriesAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { useDashT } from "@/components/dashboard-i18n";
import { SortableList, SortControls } from "@/components/manage-kit-client";
import { sameCategoryName } from "@/lib/catalog/category-names";

export interface CategoryRow {
  id: number;
  name: string;
  /** 175 Its Arabic and Turkish names; null: none. */
  names?: Record<string, string> | null;
  count: number;
  image: string | null;
  /** 208 The main category it is inside; null: a main category. */
  parentId?: number | null;
}

const TINTS = ["bg-tile-1", "bg-tile-2", "bg-tile-3", "bg-tile-4", "bg-tile-5"];

/**
 * 132.12 The categories in the order the app shows them: dragged (or moved
 * with the arrow keys and buttons) into place, renamed where they are, with
 * their products' count (a link to them) and the first one's photo.
 */
export function CategoriesList({ categories, restaurant, subs = false }: { categories: CategoryRow[]; restaurant: boolean; /** 208 A store's: each category may sit inside a main one. */ subs?: boolean }) {
  const t = useDashT();
  const kind = restaurant ? "restaurant" : "shop";
  const [saving, start] = useTransition();
  const [said, setSaid] = useState("");
  return (
    <div className="flex flex-col">
      <p role="status" aria-live="polite" className="m-0 flex min-h-[38px] items-center gap-2 border-b border-line-soft px-5 py-2 text-[13px] text-muted sm:px-6">
        {saving ? <Icon name="progress_activity" size={16} className="animate-spin" /> : said ? <Icon name="cloud_done" size={16} className="text-success" /> : <Icon name="drag_indicator" size={16} />}
        {saving ? t("common.saving") : said || t("manage.dragHint")}
      </p>
      <SortableList
        items={categories}
        idOf={(c) => c.id}
        hint={t("manage.dragKeys")}
        moved={(place, count) => t("manage.moved", { place, count })}
        onReorder={(ids) =>
          start(async () => {
            await reorderCategoriesAction(ids.map(Number));
            setSaid(t("manage.orderSaved"));
          })
        }
        itemClassName="border-t border-line-soft first:border-t-0"
        render={(c, sortable) => (
          <div data-category={c.name} className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:px-4 ${sortable.dragging ? "bg-sand" : ""}`}>
            <SortControls sortable={sortable} name={c.name} words={{ drag: t("manage.drag"), up: t("manage.moveUp"), down: t("manage.moveDown") }} />
            {c.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- An uploaded picture, already sized by the platform.
              <img src={c.image} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-line-soft object-cover" />
            ) : (
              <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-3 ${TINTS[sortable.index % TINTS.length]}`}>
                <Icon name={restaurant ? "restaurant_menu" : "category"} size={22} />
              </span>
            )}
            <form action={renameCategoryAction} className="flex min-w-0 flex-[1_1_220px] flex-col gap-1.5">
              <input type="hidden" name="id" value={c.id} />
              <span className="flex min-w-0 items-center gap-2">
                <label htmlFor={`cat-${c.id}`} className="sr-only">
                  {t("shop.categoryName")}
                </label>
                <input key={c.name} id={`cat-${c.id}`} name="name" defaultValue={c.name} maxLength={80} required className="input input-sm min-w-0 flex-1 font-semibold" />
                <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                  {t("shop.rename")}
                </SubmitButton>
              </span>
              {/* 175 Two categories of one name read as one in the app. */}
              {categories.some((o) => o.id !== c.id && sameCategoryName(o.name, c.name)) ? (
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-warn" data-category-duplicate="">
                  <Icon name="warning" size={16} />
                  {t("shop.categoryDuplicate")}
                </span>
              ) : null}
              {/* 208 Inside a main category (a store's sub-categories, one level deep): never itself, nor one that has its own. */}
              {subs ? (
                <label className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-muted">
                  {t("shopTypes.parent")}
                  <select name="parent" defaultValue={c.parentId ?? ""} disabled={categories.some((o) => o.parentId === c.id)} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="input input-sm min-w-0 flex-1 font-normal" data-category-parent="">
                    <option value="">{t("shopTypes.parentNone")}</option>
                    {categories
                      .filter((o) => o.id !== c.id && !o.parentId)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                  </select>
                </label>
              ) : null}
              {/* 175 Its names in the app's other languages, served to customers in theirs. */}
              <details className="group text-[13px]" open={Boolean(c.names?.ar || c.names?.tr)}>
                <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-semibold text-muted hover:text-midnight [&::-webkit-details-marker]:hidden">
                  <Icon name="translate" size={16} />
                  {t("shop.categoryOtherNames")}
                </summary>
                <span className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                  <input name="name_ar" dir="rtl" lang="ar" defaultValue={c.names?.ar ?? ""} maxLength={80} aria-label={t("shop.categoryNameAr")} placeholder={t("shop.categoryNameAr")} className="input input-sm min-w-0" />
                  <input name="name_tr" lang="tr" defaultValue={c.names?.tr ?? ""} maxLength={80} aria-label={t("shop.categoryNameTr")} placeholder={t("shop.categoryNameTr")} className="input input-sm min-w-0" />
                </span>
              </details>
            </form>
            <Link href={`/dashboard/catalog?category=${c.id}`} className="flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-sm font-semibold text-midnight no-underline hover:bg-sand hover:text-midnight">
              <span className="tabular-nums">{t("shop.count", { kind, count: c.count })}</span>
              <Icon name="chevron_right" size={18} className="text-faint" />
            </Link>
            <form
              action={deleteCategoryAction}
              onSubmit={(event) => {
                if (!window.confirm(t("manage.deleteCategoryConfirm", { name: c.name }))) event.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" aria-label={`${t("common.delete")}: ${c.name}`} title={t("common.delete")} className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-muted hover:bg-danger-bg hover:text-danger">
                <Icon name="delete" size={20} />
              </button>
            </form>
          </div>
        )}
      />
    </div>
  );
}
