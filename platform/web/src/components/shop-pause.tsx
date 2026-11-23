import { reopenShopAction } from "@/app/actions/shop-pause";
import { SubmitButton } from "@/components/form";
import { Notice } from "@/components/ui";
import { getStore } from "@/lib/data";
import type { App } from "@/lib/data/types";
import type { DashboardText } from "@/lib/dashboard-lang";
import { shopZone } from "@/lib/selling/zone";
import { appPause, placePause, type ActivePause } from "@/lib/shop/pause";

/**
 * 214 A shop paused from Yallapp Business (lib/shop/pause.ts), on every page
 * of its dashboard and Studio: not taking new orders, until when, the
 * reason customers read, and Reopen now.
 */
export async function ShopPauseNotice({ app, text }: { app: App | null; text: DashboardText }) {
  if (!app?.shopPause) return null;
  const now = new Date();
  const { t } = text;
  // The shop's own clock.
  const zone = shopZone(app);
  const rows: { key: string; title: string; pause: ActivePause; placeId: number | null }[] = [];
  const shop = appPause(app, now);
  if (shop) rows.push({ key: "shop", title: t("orders.pausedShop"), pause: shop, placeId: null });
  const ids = Object.keys(app.shopPause.places ?? {}).map(Number);
  if (ids.length) {
    const places = await (await getStore()).listRestaurants(app.id);
    for (const place of places) {
      const pause = ids.includes(place.id) ? placePause(app, place.id, now) : null;
      if (pause) rows.push({ key: `p${place.id}`, title: t("orders.pausedPlace", { place: place.name }), pause, placeId: place.id });
    }
  }
  if (!rows.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => (
        <Notice key={row.key} tone="warn" icon="pause_circle" role="status">
          <span className="flex flex-wrap items-center justify-between gap-3">
            <span>
              <b>{row.title}</b> {row.pause.until ? t("orders.pausedUntil", { time: text.date(row.pause.until, { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: zone }) }) : t("orders.pausedUntilReopen")}
              {row.pause.reason ? <> {t("orders.pausedReason", { reason: row.pause.reason })}</> : null}
            </span>
            <form action={reopenShopAction}>
              <input type="hidden" name="place_id" value={row.placeId ?? ""} />
              <SubmitButton>{t("orders.reopen")}</SubmitButton>
            </form>
          </span>
        </Notice>
      ))}
    </div>
  );
}
