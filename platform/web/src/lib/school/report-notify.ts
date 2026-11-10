import type { Lang } from "@/i18n/config";
import { appLang } from "../bookings/reschedule";
import type { App, HostedUser, PushAudience, SchoolPerson, SchoolReport } from "../data/types";
import { staffPushAudience } from "./staff-app";
import { asLang, deliver, type DeliveryNotifyDeps, type Words } from "../delivery/notify";
import { pushToOwner, type OwnerPushDeps } from "../owner/push";
import { personUser } from "./notify";

/**
 * 113.5 Who hears of the teachers' reports: the administration on Yallapp
 * Business when a teacher sends one (to those with the school's settings),
 * the teacher in the app when it is commented on, sent back or approved
 * (`school_report`, opening it), the student's parents when the school
 * shares it with them (`school_report_shared`, opening the child's reports).
 */

async function langOf(deps: DeliveryNotifyDeps, user: HostedUser, audience: PushAudience = "customers"): Promise<Lang> {
  const devices = await deps.store.listHostedPushDevices(deps.app.id, [user.id], audience);
  return asLang(devices[0]?.language) ?? (await appLang(deps.store, deps.app.id));
}

/** A teacher sent a report (or sent it again): the administration's phones. */
export function pushSchoolReportSent(deps: OwnerPushDeps, app: App, report: SchoolReport, about: string): Promise<number> {
  if (app.demo) return Promise.resolve(0);
  const again = report.comments.some((c) => c.by === "school");
  return pushToOwner(
    deps,
    app.clientId,
    "new_message",
    (w) => ({
      title: w.t(again ? "reports.pushSentAgain" : "reports.pushSent", { teacher: report.teacherName }),
      body: about ? w.t("reports.pushSentBody", { template: report.templateName, about }) : report.templateName,
    }),
    { app_id: app.id, school_report_id: String(report.id) },
    "settings",
  );
}

const TEACHER: Record<"comment" | "return" | "approve", Record<Lang, (title: string) => Words>> = {
  comment: {
    en: (title) => ({ title: "A comment on your report", body: `The school commented on “${title}”.` }),
    ar: (title) => ({ title: "تعليق على تقريرك", body: `علّقت المدرسة على «${title}».` }),
    tr: (title) => ({ title: "Raporunuza yorum", body: `Okul “${title}” raporunuza yorum yaptı.` }),
  },
  return: {
    en: (title) => ({ title: "Your report was sent back", body: `The school asks for changes to “${title}”. See what to change and send it again.` }),
    ar: (title) => ({ title: "أُعيد تقريرك إليك", body: `تطلب المدرسة تعديلات على «${title}». اطّلع على المطلوب وأرسله من جديد.` }),
    tr: (title) => ({ title: "Raporunuz geri gönderildi", body: `Okul “${title}” raporunda değişiklik istiyor. Neyin değişeceğine bakıp yeniden gönderin.` }),
  },
  approve: {
    en: (title) => ({ title: "Your report was approved", body: `The school approved “${title}”.` }),
    ar: (title) => ({ title: "اعتُمد تقريرك", body: `اعتمدت المدرسة «${title}».` }),
    tr: (title) => ({ title: "Raporunuz onaylandı", body: `Okul “${title}” raporunuzu onayladı.` }),
  },
};

/** The teacher, of the administration's comment, send-back or approval. */
export async function tellTeacherReport(deps: DeliveryNotifyDeps, teacher: SchoolPerson, report: SchoolReport, action: "comment" | "return" | "approve"): Promise<number> {
  const user = await personUser(deps.store, teacher);
  if (!user) return 0;
  const words = TEACHER[action][await langOf(deps, user, staffPushAudience(deps.app))](report.templateName);
  return deliver(deps, user.id, words, { type: "school_report", report_id: String(report.id) }, false);
}

const SHARED: Record<Lang, (name: string, title: string) => Words> = {
  en: (name, title) => ({ title: `A report on ${name}`, body: `The school shared “${title}” with you.` }),
  ar: (name, title) => ({ title: `تقرير عن ${name}`, body: `شاركت المدرسة معك «${title}».` }),
  tr: (name, title) => ({ title: `${name} hakkında bir rapor`, body: `Okul “${title}” raporunu sizinle paylaştı.` }),
};

/** The student's parents (not the student), of a report the school shared with them. */
export async function tellParentsReportShared(deps: DeliveryNotifyDeps, student: SchoolPerson, report: SchoolReport): Promise<number> {
  const links = await deps.store.listSchoolFamily(student.appId, { studentId: student.id });
  const parents = (await deps.store.listSchoolPeople(student.appId, { role: "parent", ids: links.map((l) => l.parentId) })).filter((p) => p.active);
  const seen = new Set<number>();
  let reached = 0;
  for (const parent of parents) {
    const user = await personUser(deps.store, parent);
    if (!user || seen.has(user.id)) continue;
    seen.add(user.id);
    reached += await deliver(deps, user.id, SHARED[await langOf(deps, user)](student.name, report.templateName), { type: "school_report_shared", student_id: String(student.id), report_id: String(report.id) }, false);
  }
  return reached;
}
