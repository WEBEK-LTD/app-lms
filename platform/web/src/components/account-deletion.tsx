import Link from "next/link";
import { cancelAccountDeletionAction } from "@/app/actions/account";
import { richText } from "@/i18n/rich";
import { localePath } from "@/i18n/paths";
import { DELETION_WAIT_DAYS, deletionRefusal, MESSAGES, runningPlans } from "@/lib/account/deletion";
import { deletionDueAt } from "@/lib/account/purge";
import type { ClientContext } from "@/lib/auth/session";
import { getContact } from "@/lib/contact";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { AccountDeletionForm } from "./account-deletion-form";
import { SubmitButton } from "./form";
import { Icon } from "./icon";
import { Notice } from "./ui";

/**
 * 66 "Delete your Yallapp account" on Dashboard › Your account and on the
 * waiting page (`from`): what happens, the form (password and the email
 * typed again), or the request waiting for our team with "Cancel the
 * request". A team member, or our team managing the dashboard, is told why
 * they can't ask (lib/account/deletion.ts).
 */
export async function AccountDeletion({ context, from, done, phones }: { context: ClientContext; from: "account" | "pending"; done: string | null; phones: number }) {
  const { t, k, date, lang } = await dashboardText();
  const [open, contact] = await Promise.all([(await getStore()).getOpenAccountDeletionRequest(context.client.id), getContact()]);
  const refusal = deletionRefusal(context);
  const plans = runningPlans(context, new Date()).length;
  const link = (href: string) =>
    function LinkedWords(chunk: string) {
      return (
        <Link href={href} className="font-semibold">
          {chunk}
        </Link>
      );
    };
  return (
    <section aria-labelledby="delete-account" className="flex max-w-[720px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <h2 id="delete-account" className="m-0 text-lg font-bold">
        {t("account.deleteTitle")}
      </h2>
      {done === "requested" ? (
        <Notice tone="success" icon="check_circle" role="status">
          {t("account.requested", { count: phones })}
        </Notice>
      ) : null}
      {done === "cancelled" ? (
        <Notice tone="success" icon="check_circle" role="status">
          {k(MESSAGES.cancelled)}
        </Notice>
      ) : null}
      {open ? (
        <div data-deletion="pending" className="flex flex-col gap-3">
          <Notice tone="warn" icon="hourglass_top">
            <strong className="block">{t("account.pendingTitle")}</strong>
            {t("account.pendingText", { date: date(open.requestedAt), deleteOn: date(deletionDueAt(open)) })}
          </Notice>
          {refusal ? null : (
            <form action={cancelAccountDeletionAction}>
              <input type="hidden" name="from" value={from} />
              <SubmitButton variant="secondary" className="h-10 px-4 text-sm">
                <Icon name="close" size={18} />
                {t("account.cancel")}
              </SubmitButton>
            </form>
          )}
        </div>
      ) : refusal ? (
        <Notice icon="lock">{k(refusal)}</Notice>
      ) : (
        <>
          <p className="m-0 text-[15px] font-semibold text-ink-2">{t("account.deleteIntro")}</p>
          <div className="flex flex-col gap-2">
            <h3 className="m-0 text-[15px] font-bold">{t("account.whatHappens")}</h3>
            <ul className="m-0 flex flex-col gap-2 ps-5 text-[15px] leading-relaxed text-ink-3">
              <li>{t("account.appsStop")}</li>
              <li>{t("account.dataDeleted")}</li>
              <li>{t("account.teamAccess")}</li>
              <li>{t("account.stores")}</li>
              {from === "account" ? <li>{richText(t("account.keepFiles"), { builds: link("/dashboard/builds") })}</li> : null}
              {plans ? <li data-plans={plans}>{richText(t("account.plans", { count: plans }), { refund: link(localePath(lang, "/refund")) })}</li> : null}
              <li>{richText(t("account.kept"), { privacy: link(localePath(lang, "/privacy")) })}</li>
            </ul>
            <p className="m-0 text-[15px] text-ink-3">{t("account.when", { days: DELETION_WAIT_DAYS })}</p>
          </div>
          <AccountDeletionForm from={from} email={context.user.email} />
          <p className="m-0 text-sm text-muted">
            {richText(t("account.forgot", { email: contact.email }), { reset: link(localePath(lang, "/forgot-password")) })}
          </p>
        </>
      )}
    </section>
  );
}
