import {
  givePrimeGiftAction,
  removePrimeGiftAction,
} from "@/app/actions/admin-prime-gift";
import { SubmitButton } from "@/components/form";
import { btn } from "@/components/ui";
import { primeGiftActive } from "@/lib/admin/prime-gift";
import { appLabel } from "@/lib/app/label";
import type { App, PrimeGift } from "@/lib/data/types";

/**
 * 132 Admin › client › Prime as a gift: each app's gift (until when, the
 * note, who gave it), "Give Prime as a gift" for one app or all of them,
 * and Remove. The client's plan and invoices stay as they are.
 */
export function PrimeGiftCard({
  clientId,
  apps,
  gifts,
  primeByPlan,
  edit,
  error,
  done,
  now,
}: {
  clientId: string;
  apps: App[];
  gifts: PrimeGift[];
  primeByPlan: Set<string>;
  edit: boolean;
  error: string | null;
  done: string | null;
  now: Date;
}) {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const lastDay = (until: Date) => day(new Date(until.getTime() - 86_400_000));
  return (
    <section
      aria-labelledby="h-prime-gift"
      id="prime-gift"
      className="flex min-w-0 flex-col gap-3.5 rounded-2xl border border-line bg-white p-5 sm:p-6"
    >
      <h2 id="h-prime-gift" className="m-0 text-[19px] font-bold">
        Prime as a gift
      </h2>
      <p className="m-0 text-sm text-muted">
        While a gift lasts, the app has Prime in Yallapp Business (insights,
        smart alerts, goals, the weekly report), whatever its plan. Nothing is
        charged, and the plan and invoices don&apos;t change. When it ends or is
        removed, the app is what its plan makes it.
      </p>
      {done === "prime_gift" || done === "prime_gift_removed" ? (
        <p role="status" className="m-0 text-sm font-semibold text-success">
          {done === "prime_gift"
            ? "Prime given as a gift. The app has Prime in Yallapp Business now."
            : "Prime gift removed. The app is what its plan makes it."}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="m-0 text-sm font-semibold text-danger">
          {error.slice(0, 300)}
        </p>
      ) : null}
      <ul className="m-0 flex list-none flex-col gap-2 p-0" data-prime-gifts="">
        {apps.map((app) => {
          const gift = gifts.find((g) => g.appId === app.id) ?? null;
          const on = primeGiftActive(gift, now);
          return (
            <li
              key={app.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line-soft px-3.5 py-2.5 text-sm"
              data-prime-gift-app={app.id}
            >
              <span className="min-w-0">
                <span className="font-semibold">{appLabel(app)}</span>{" "}
                <span className="text-muted">
                  {primeByPlan.has(app.id)
                    ? "· Prime by its plan"
                    : on
                      ? `· Prime as a gift ${gift!.until ? `until ${lastDay(gift!.until)}` : "until removed"}${gift!.note ? ` · ${gift!.note}` : ""} · by ${gift!.givenBy}`
                      : gift
                        ? `· The gift ended on ${lastDay(gift.until!)}`
                        : "· No Prime"}
                </span>
              </span>
              {edit && gift ? (
                <form action={removePrimeGiftAction}>
                  <input type="hidden" name="clientId" value={clientId} />
                  <input type="hidden" name="appId" value={app.id} />
                  <button
                    type="submit"
                    className={`${btn.secondary} h-9 px-3 text-sm`}
                    aria-label={`Remove the Prime gift of ${appLabel(app)}`}
                  >
                    Remove
                  </button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
      {edit ? (
        <form
          action={givePrimeGiftAction}
          className="grid gap-3 border-t border-line-soft pt-3.5 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end"
        >
          <input type="hidden" name="clientId" value={clientId} />
          <label className="flex flex-col gap-1 text-sm font-semibold">
            App
            <select
              name="appId"
              className="input"
              defaultValue={apps.length === 1 ? apps[0]!.id : "all"}
            >
              {apps.length > 1 ? (
                <option value="all">All the client&apos;s apps</option>
              ) : null}
              {apps.map((app) => (
                <option key={app.id} value={app.id}>
                  {appLabel(app)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Last day (optional)
            <input type="date" name="until" className="input" min={day(now)} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Note for the team (optional)
            <input
              type="text"
              name="note"
              maxLength={300}
              className="input"
              placeholder="Why it was given"
            />
          </label>
          <SubmitButton className="h-11 px-4">
            Give Prime as a gift
          </SubmitButton>
        </form>
      ) : null}
    </section>
  );
}
