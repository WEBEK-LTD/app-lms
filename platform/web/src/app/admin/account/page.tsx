import type { Metadata } from "next";
import { SignOutEverywhere, TwoStepSettings } from "@/components/two-step-settings";
import { Notice } from "@/components/ui";
import { getDashT } from "@/i18n/dashboard";
import { requireAdmin, teamTwoStepRequired } from "@/lib/auth/session";
import { hasTwoStep } from "@/lib/auth/two-step";
import { getStore } from "@/lib/data";

export const metadata: Metadata = { title: "Your account" };
export const dynamic = "force-dynamic";

/**
 * 70 Admin › Your account: two-step sign-in and "Sign out of all devices"
 * for the signed-in team member, in English. When the team must use
 * two-step sign-in (Admin › Team), everyone without it lands here first and
 * can open nothing else until it is on.
 */
export default async function AdminAccountPage({ searchParams }: PageProps<"/admin/account">) {
  const admin = await requireAdmin("view", { twoStepSetup: true });
  const query = await searchParams;
  const t = getDashT("en");
  const required = (await teamTwoStepRequired()) && !(await hasTwoStep(await getStore(), admin.id));
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="m-0 text-[28px] font-extrabold">Your account</h1>
        <span className="text-[15px] text-muted">
          Signed in as <bdi dir="ltr">{admin.email}</bdi>.
        </span>
      </div>
      {required ? (
        <div className="max-w-[720px]">
          <Notice tone="warn" icon="shield" role="alert">
            Our team signs in with two-step sign-in. Set it up below to open the rest of the admin.
          </Notice>
        </div>
      ) : null}
      {query.twostep === "off" ? (
        <div className="max-w-[720px]">
          <Notice tone="success" icon="check_circle" role="status">
            Two-step sign-in is off.
          </Notice>
        </div>
      ) : null}
      <TwoStepSettings user={admin} from="admin" t={t} lang="en" setup={query.setup === "1"} />
      <SignOutEverywhere t={t} />
    </>
  );
}
