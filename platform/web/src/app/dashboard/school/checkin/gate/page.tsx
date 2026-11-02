import type { Metadata } from "next";
import { newGateCodesAction } from "@/app/actions/school";
import { btn } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { checkinSettingsOf, usesCode } from "@/lib/school/checkin";
import { schoolSettingsOf } from "@/lib/school/settings";
import { ConfirmButton } from "../../../chat/forms";
import { FirstNote, isSchool, NotSchool, PageHead } from "../../parts";
import { CheckinLinks } from "../parts";
import { GateScreen } from "./gate-screen";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("school.gate") };
}

/** 113.2 The Gate screen: the school's QR code and six digits for checking in, new every 30 seconds, to show on a screen at the gate. */
export default async function SchoolGatePage() {
  const { app } = await requireClient("settings");
  const { t } = await dashboardText();
  if (!isSchool(app)) return <NotSchool title={t("school.gate")} t={t} />;
  const store = await getStore();
  const c = checkinSettingsOf(schoolSettingsOf(await store.getSchoolSettings(app.id), app));

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("school.gate")} intro={t("school.gateIntro")} />
      {c.on ? null : <FirstNote text={t("school.checkinOff")} href="/dashboard/school/checkin/settings" />}
      <CheckinLinks t={t} />
      {usesCode(c) ? (
        <div className="flex max-w-[860px] flex-col gap-4">
          <GateScreen schoolName={app.appName ?? ""} />
          <form action={newGateCodesAction} className="flex justify-end">
            <ConfirmButton confirm={t("school.newCodesConfirm")} className={`${btn.secondary} h-10 px-4 text-sm`}>
              {t("school.newCodes")}
            </ConfirmButton>
          </form>
        </div>
      ) : (
        <p role="note" className="m-0 max-w-[860px] rounded-xl bg-peach-soft px-4 py-3 text-[15px] leading-relaxed">
          {t("school.gateLocationOnly")}
        </p>
      )}
    </div>
  );
}
