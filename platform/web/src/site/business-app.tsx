import { BusinessAppButtons } from "@/components/business-app";
import { Icon } from "@/components/icon";
import type { IconName } from "@/components/icon-names";
import { messagesFor, type Lang } from "@/i18n";

/**
 * 203 Yallapp Business on the home page, under the dashboard: what it does
 * for the owner and their team, a phone with today's numbers and the kind of
 * notices it sends, and the two store buttons (lib/business-app.ts). In the
 * site's tokens, so it follows light and dark.
 */
export function BusinessAppSection({ lang }: { lang: Lang }) {
  const m = messagesFor(lang);
  const b = m.businessApp;
  const points: { icon: IconName; text: string }[] = [
    { icon: "receipt_long", text: b.pointOrders },
    { icon: "forum", text: b.pointChat },
    { icon: "trending_up", text: b.pointToday },
  ];
  return (
    <section aria-labelledby="business-app-title" className="bg-white" data-home-business-app="">
      <div className="mx-auto max-w-[1160px] px-4 pb-16 sm:px-6 sm:pb-24">
        <div className="relative isolate grid items-center gap-x-12 gap-y-10 overflow-clip rounded-[28px] border border-line bg-ivory px-5 py-10 sm:px-12 sm:py-14 min-[900px]:grid-cols-[1.15fr_0.85fr]">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -end-24 -top-28 -z-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(255,90,31,0.22),transparent)]"
          />
          <div className="flex min-w-0 flex-col gap-5">
            <span className="flex items-center gap-2 self-start rounded-full border border-line bg-white py-1 ps-1.5 pe-3 text-[13px] font-bold text-midnight">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ember text-[#0e0d24]">
                <Icon name="smartphone" size={16} />
              </span>
              {b.badge}
            </span>
            <h2 id="business-app-title" className="m-0 text-[28px] leading-[1.12] font-extrabold tracking-[-0.6px] text-balance sm:text-[38px] sm:tracking-[-1px]">
              {b.title}
            </h2>
            <p className="m-0 max-w-[36em] text-[17px] leading-relaxed text-ink-4">{b.text}</p>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {points.map((point) => (
                <li key={point.icon} className="flex items-start gap-3 text-[15.5px] leading-snug text-ink-3">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[10px] bg-peach text-midnight">
                    <Icon name={point.icon} size={18} />
                  </span>
                  <span className="pt-1.5">{point.text}</span>
                </li>
              ))}
            </ul>
            <BusinessAppButtons labels={b} label={b.storesLabel} className="pt-2" />
            <p className="m-0 flex items-center gap-2 text-sm text-muted">
              <Icon name="lock" size={16} />
              {b.note}
            </p>
          </div>
          <BusinessAppPhone lang={lang} />
        </div>
      </div>
    </section>
  );
}

/** A drawing of the app's Today screen, for decoration: the numbers and notices are examples. */
function BusinessAppPhone({ lang }: { lang: Lang }) {
  const m = messagesFor(lang);
  const b = m.businessApp;
  const notices: { icon: IconName; text: string }[] = [
    { icon: "shopping_bag", text: m.home.notices.store },
    { icon: "chat", text: b.mockMessage },
    { icon: "notifications", text: b.mockNeeds },
  ];
  return (
    <div aria-hidden="true" className="flex justify-center" data-business-app-phone="">
      <div className="story-float w-[250px] rounded-[40px] border-[9px] border-phone bg-white p-4 pt-6 shadow-[0_40px_70px_-36px_rgba(14,13,36,0.55)]">
        <div className="mx-auto mb-5 h-[6px] w-16 rounded-full bg-line" />
        <div className="flex items-center justify-between">
          <span className="text-[19px] font-extrabold text-midnight">{b.mockToday}</span>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-peach text-accent">
            <Icon name="notifications" size={18} />
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-1 rounded-2xl bg-midnight px-4 py-3.5 text-white">
          <span className="text-[12px] font-semibold opacity-75">{b.mockSales}</span>
          <span className="text-[26px] leading-none font-extrabold tracking-[-0.5px]" dir="ltr">
            ₺12,480
          </span>
          <span className="flex items-end gap-1 pt-2">
            {[40, 62, 48, 75, 58, 88, 70].map((h, i) => (
              <span key={i} className="w-full rounded-[3px] bg-ember" style={{ height: `${h * 0.32}px`, opacity: 0.45 + i * 0.08 }} />
            ))}
          </span>
        </div>
        <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
          {notices.map((notice) => (
            <li key={notice.icon} className="flex items-center gap-2.5 rounded-xl border border-line-soft bg-sand px-3 py-2.5 text-[12.5px] leading-snug font-semibold text-ink-2">
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-peach text-accent">
                <Icon name={notice.icon} size={16} />
              </span>
              {notice.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
