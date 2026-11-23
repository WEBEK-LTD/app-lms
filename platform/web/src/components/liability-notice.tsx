import { acceptLiabilityAction } from "@/app/actions/studio-projects";
import { Icon } from "@/components/icon";
import type { DashKey } from "@/i18n/dashboard";
import type { App } from "@/lib/data/types";
import type { DashboardText } from "@/lib/dashboard-lang";
import { liabilityDue } from "@/lib/studio/liability";

/**
 * 208 A shop type's liability notice (lib/studio/liability.ts), over the
 * project's dashboard until the owner presses "I read it and agree": its
 * type, that the owner is fully responsible for the app, the type's own
 * notice and that laws differ by country. A team member sees it without the
 * button (the owner accepts it). Light and dark, right to left in Arabic.
 */
export function LiabilityNotice({ app, text, member }: { app: App | null; text: DashboardText; member: boolean }) {
  const due = liabilityDue(app);
  if (!due) return null;
  const { t } = text;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="liability-title" data-liability={due.kind} className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div className="flex w-full max-w-[520px] flex-col gap-4 rounded-[24px] border border-(--sp-line,#e4dfd6) bg-(--sp-surface,#ffffff) p-6 text-(--sp-ink,#121212) shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] dark:border-[#2e2c28] dark:bg-[#191917] dark:text-[#f3f0ea]">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#f6efe1] text-[#8a5a00] dark:bg-[#2b2417] dark:text-[#e6c26e]">
            <Icon name="gavel" size={22} />
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-[13px] font-semibold opacity-70">{t(`shopTypes.type_${due.type.id}` as DashKey)}</span>
            <h2 id="liability-title" className="m-0 text-[20px] leading-tight font-extrabold">
              {t("shopTypes.noticeTitle")}
            </h2>
          </div>
        </div>
        <p className="m-0 text-[15px] leading-relaxed">{t("shopTypes.noticeIntro")}</p>
        <p className="m-0 rounded-2xl bg-[#f6f3ec] px-4 py-3 text-[15px] leading-relaxed font-semibold dark:bg-[#23221f]">{t(`shopTypes.notice_${due.kind}` as DashKey)}</p>
        <p className="m-0 text-[13.5px] opacity-75">{t("shopTypes.noticeNote")}</p>
        {member ? null : (
          <form action={acceptLiabilityAction} className="flex justify-end">
            <button type="submit" data-liability-accept="" className="flex h-12 cursor-pointer items-center gap-2 rounded-[14px] border-0 bg-[#121212] px-6 font-[inherit] text-[15px] font-bold text-white dark:bg-[#f3f0ea] dark:text-[#121212]">
              <Icon name="check" size={20} />
              {t("shopTypes.noticeAccept")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
