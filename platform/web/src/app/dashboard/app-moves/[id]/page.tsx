import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { approveMoveAction, declineMoveAction } from "@/app/actions/app-moves";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { appLabel } from "@/lib/app/label";
import { checkMoveLink } from "@/lib/apps/move-link";
import { moveWaiting } from "@/lib/apps/move";
import { getAdminRole, getCurrentUser } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import type { App, User } from "@/lib/data/types";
import { getPlans } from "@/lib/settings/platform";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("working.approveTitle"), robots: { index: false } };
}
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 132.113 The owner's page for moving their app (or its plan), opened from
 * the email's signed "Review and approve": what moves and what stays, in the
 * email's look, and Approve or Decline. Only the owner of the account it
 * leaves, signed in; the link's signature is checked here and on each button.
 */
export default async function AppMovePage({ params, searchParams }: PageProps<"/dashboard/app-moves/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const user = await getCurrentUser();
  const link = { expires: typeof query.expires === "string" ? query.expires : "", sig: typeof query.sig === "string" ? query.sig : "" };
  // Signed out: they sign in and come back here.
  if (!user) redirect(`/api/app-moves/sign-in?to=${encodeURIComponent(`/dashboard/app-moves/${id}?expires=${link.expires}&sig=${link.sig}`)}`);
  const text = await dashboardText();
  const { t } = text;
  const store = await getStore();
  const request = UUID.test(id) ? await store.getAppMoveRequest(id) : null;
  const from = request ? await store.getClientById(request.fromClientId) : null;
  const state = typeof query.state === "string" ? query.state : null;
  const owner = Boolean(request && from && from.userId === user.id && !(await getAdminRole()));
  const valid = request ? checkMoveLink(request.id, link) === "valid" : false;
  const now = new Date();

  const message = (tone: "ok" | "warn", body: string) => (
    <div role={tone === "ok" ? "status" : "alert"} className={`flex items-start gap-3 rounded-2xl px-5 py-4 text-[15px] leading-relaxed ${tone === "ok" ? "bg-[#E3F2E9] text-[#14532D]" : "bg-[#FFF6F0] text-[#7C2D12]"}`}>
      <Icon name={tone === "ok" ? "check_circle" : "warning"} size={22} />
      <span>{body}</span>
    </div>
  );

  const [app, toApp, toClient] = request
    ? await Promise.all([store.getAppById(request.appId), request.toAppId ? store.getAppById(request.toAppId) : null, store.getClientById(request.toClientId)])
    : [null, null, null];
  const [fromUser, toUser] = await Promise.all([from ? store.getUserById(from.userId) : null, toClient ? store.getUserById(toClient.userId) : null]);
  const plan = request?.kind === "plan";
  const shown = plan ? toApp : app;

  let notice: React.ReactNode = null;
  if (state === "approved") notice = message("ok", plan ? t("working.approvedPlan", { app: toApp ? appLabel(toApp) : "" }) : t("working.approved", { app: app ? appLabel(app) : "" }));
  else if (state === "declined") notice = message("ok", t("working.declined"));
  else if (state === "failed") notice = message("warn", t("working.failed", { note: request?.note ?? "" }));
  else if (!request || !owner) notice = message("warn", !request ? t("working.badLink") : t("working.notOwner"));
  else if (!valid) notice = message("warn", t("working.badLink"));
  else if (!moveWaiting(request, now) || state) notice = message("warn", t("working.closed"));
  const open = request && owner && valid && moveWaiting(request, now) && !state;

  let planLines: string[] = [];
  if (request && plan && app) {
    const license = (await store.getLicenseForApp(request.fromClientId, app.id)) ?? (toApp ? await store.getLicenseForApp(toApp.clientId, toApp.id) : null);
    if (license) {
      const plans = (await getPlans(store)) as Record<string, { name: string } | undefined>;
      const name = (p: string) => plans[p]?.name ?? p;
      planLines = [
        t("working.planUntil", { plan: name(license.plan), date: text.date(license.expiresAt) }),
        ...(license.nextPlan && license.nextPlanAt ? [t("working.planNext", { plan: name(license.nextPlan), date: text.date(license.nextPlanAt) })] : []),
      ];
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5">
      {notice}
      {request && owner && app && fromUser && toUser ? (
        <article className="overflow-hidden rounded-[22px] border border-line bg-white" aria-labelledby="h-move">
          <div className="flex items-center justify-between gap-3 border-b-4 border-[#FF5A1F] bg-[#0E0D24] px-6 py-5 text-[#C9C4DE] sm:px-8">
            <span className="text-lg font-extrabold tracking-[-0.02em] text-white">Yallapp</span>
            <span className="text-xs font-bold tracking-[0.1em] uppercase">{plan ? t("working.approvePlanTitle") : t("working.approveTitle")}</span>
          </div>
          <div className="flex flex-col gap-5 px-6 py-7 sm:px-8">
            <h1 id="h-move" className="m-0 text-[26px] leading-tight font-extrabold sm:text-[30px]">
              {plan ? t("working.approvePlanTitle") : t("working.approveTitle")}
            </h1>
            <p className="m-0 text-base leading-relaxed">
              {plan
                ? t("working.approvePlanIntro", { member: request.requestedByName, app: appLabel(app), to: toApp ? appLabel(toApp) : "" })
                : t("working.approveIntro", { member: request.requestedByName, app: appLabel(app) })}
            </p>
            {shown ? <AppRow app={shown} /> : null}
            <div className="grid gap-3 rounded-2xl border border-line bg-sand p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <Party label={t("working.from")} user={fromUser} />
              <span className="hidden text-2xl font-bold text-[#C2410C] sm:block" aria-hidden="true">
                {text.dir === "rtl" ? "←" : "→"}
              </span>
              <Party label={t("working.to")} user={toUser} />
            </div>
            {plan ? (
              <div className="flex flex-col gap-2 text-[15px] leading-relaxed text-ink-4">
                <div className="flex flex-wrap gap-2">
                  {planLines.map((line) => (
                    <span key={line} className="rounded-full bg-[#E3F2E9] px-3.5 py-1.5 text-sm font-bold text-[#14532D]">
                      {line}
                    </span>
                  ))}
                </div>
                <span>{t("working.planLeaves", { app: appLabel(app) })}</span>
                <span>{t("working.planArrives", { app: toApp ? appLabel(toApp) : "" })}</span>
                <span>{t("working.invoices")}</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-[15px] leading-relaxed text-ink-4">
                <div className="flex flex-wrap gap-2">
                  <Pill label={t("working.data")} value={request.moveData ? t("working.moves") : t("working.stays")} moves={request.moveData} />
                  <Pill label={t("working.subscription")} value={request.moveSubscription ? t("working.moves") : t("working.stays")} moves={request.moveSubscription} />
                </div>
                <span>{request.moveData ? t("working.dataMoves") : t("working.dataStays")}</span>
                <span>{request.moveSubscription ? t("working.subMoves") : t("working.subStays")}</span>
                <span>{t("working.invoices")}</span>
              </div>
            )}
            {open ? (
              <>
                <p className="m-0 text-sm text-muted">{t("working.expires", { minutes: Math.max(1, Math.ceil((request.expiresAt.getTime() - now.getTime()) / 60_000)) })}</p>
                <div className="flex flex-wrap gap-3">
                  <form action={approveMoveAction}>
                    <Hidden id={request.id} link={link} />
                    <SubmitButton className="h-12 px-6">{plan ? t("working.approvePlan") : t("working.approve")}</SubmitButton>
                  </form>
                  <form action={declineMoveAction}>
                    <Hidden id={request.id} link={link} />
                    <SubmitButton variant="secondary" className="h-12 px-6">
                      {t("working.decline")}
                    </SubmitButton>
                  </form>
                </div>
                <p className="m-0 text-sm text-muted">{t("working.orCode")}</p>
                <div className="rounded-xl border-s-4 border-[#FF5A1F] bg-peach px-4 py-3 text-sm leading-relaxed text-ink-2">{t("working.safety")}</div>
              </>
            ) : null}
          </div>
        </article>
      ) : null}
    </div>
  );
}

function Hidden({ id, link }: { id: string; link: { expires: string; sig: string } }) {
  return (
    <>
      <input type="hidden" name="requestId" value={id} />
      <input type="hidden" name="expires" value={link.expires} />
      <input type="hidden" name="sig" value={link.sig} />
    </>
  );
}

function AppRow({ app }: { app: App }) {
  return (
    <div className="flex items-center gap-3.5">
      {app.iconAssetId ? (
        // eslint-disable-next-line @next/next/no-img-element -- the app's own icon, from its asset.
        <img src={`/api/v1/assets/${app.iconAssetId}`} alt="" width={56} height={56} className="h-14 w-14 rounded-[14px] border border-line object-cover" />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-[14px] text-2xl font-extrabold text-white" style={{ background: /^#[0-9a-f]{6}$/i.test(app.primaryColor) ? app.primaryColor : "#0E0D24" }} aria-hidden="true">
          {Array.from(appLabel(app))[0]?.toUpperCase()}
        </span>
      )}
      <span className="text-[19px] font-extrabold">{appLabel(app)}</span>
    </div>
  );
}

function Party({ label, user }: { label: string; user: User }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs font-bold tracking-[0.08em] text-muted uppercase">{label}</span>
      <span className="text-[17px] font-bold">{user.name}</span>
      <span className="text-sm break-all text-muted" dir="ltr">
        {user.email}
      </span>
    </div>
  );
}

function Pill({ label, value, moves }: { label: string; value: string; moves: boolean }) {
  return <span className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${moves ? "bg-[#E3F2E9] text-[#14532D]" : "bg-[#EEEAE2] text-[#3F3C55]"}`}>{`${label}: ${value}`}</span>;
}
