"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteCategoryAction, renameCategoryAction, reorderCategoriesAction } from "@/app/actions/catalog";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { useDashT } from "@/components/dashboard-i18n";
import { SortableList, SortControls } from "@/components/manage-kit-client";

export interface CategoryRow {
  id: number;
  name: string;
  count: number;
  image: string | null;
}

const TINTS = ["bg-tile-1", "bg-tile-2", "bg-tile-3", "bg-tile-4", "bg-tile-5"];

/**
 * 132.12 The categories in the order the app shows them: dragged (or moved
 * with the arrow keys and buttons) into place, renamed where they are, with
 * their products' count (a link to them) and the first one's photo.
 */
export function CategoriesList({ categories, restaurant }: { categories: CategoryRow[]; restaurant: boolean }) {
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
            <form action={renameCategoryAction} className="flex min-w-0 flex-[1_1_220px] items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <label htmlFor={`cat-${c.id}`} className="sr-only">
                {t("shop.categoryName")}
              </label>
              <input key={c.name} id={`cat-${c.id}`} name="name" defaultValue={c.name} maxLength={80} required className="input input-sm min-w-0 flex-1 font-semibold" />
              <SubmitButton variant="secondary" className="h-9 px-3 text-sm">
                {t("shop.rename")}
              </SubmitButton>
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
