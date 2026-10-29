import type { Metadata } from "next";
import { deleteTeacherAction, saveApplicationsAction, setTeacherStatusAction } from "@/app/actions/teachers";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, btn, formatDate } from "@/components/ui";
import { assetUrl } from "@/lib/assets";
import { requireClient } from "@/lib/auth/session";
import { courseSetup } from "@/lib/courses/setup";
import { dashboardText } from "@/lib/dashboard-lang";
import { getStore } from "@/lib/data";
import { appPlan } from "@/lib/entitlements";
import { hostedSignInMethods } from "@/lib/hosted/sign-in-methods";
import { teacherFormValues } from "@/lib/teachers/forms";
import { coursesOf, sharePercent, teacherRating } from "@/lib/teachers/service";
import { ConfirmButton } from "../chat/forms";
import { AddServiceBox } from "../delivery/forms";
import { ApplicationForm, TeacherForm } from "./forms";
import { isTeachers, NotTeachers, PageHead, TeachersPlanNotice } from "./parts";
import { SampleBadge, SampleEntries, type SampleQuery } from "@/components/samples";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("teachers.title") };
}

/** 105.3 The academy's teachers, their shares and applications to teach. */
export default async function TeachersPage({ searchParams }: { searchParams: Promise<SampleQuery> }) {
  const { app, license } = await requireClient("catalog");
  const { t, lang } = await dashboardText();
  if (!isTeachers(app)) return <NotTeachers title={t("teachers.title")} t={t} />;
  const store = await getStore();
  const methods = hostedSignInMethods(app);
  const emailOnly = methods.length === 1 && methods[0] === "email";
  const [all, ratings, plan] = await Promise.all([store.listTeachers(app.id), store.countTeacherRatings(app.id), appPlan(store, license, new Date())]);
  const setup = courseSetup(app);
  const applications = all.filter((teacher) => teacher.status === "applied");
  const teachers = all.filter((teacher) => teacher.status === "active" || teacher.status === "suspended");
  const applyOn = setup.teachersApply === true;

  return (
    <div className="flex flex-col gap-6">
      <PageHead title={t("teachers.title")} intro={t("teachers.intro")} />
      <TeachersPlanNotice plan={plan} t={t} />

      <section aria-labelledby="h-add" className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-add" className="sr-only">
          {t("teachers.add")}
        </h2>
        <AddServiceBox title={t("teachers.add")} open={teachers.length === 0}>
          <TeacherForm id={null} values={teacherFormValues(null)} emailOnly={emailOnly} photoUrl={null} />
        </AddServiceBox>
      </section>

      <section aria-labelledby="h-applications" className="flex max-w-[860px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
            <h2 id="h-applications" className="m-0 text-lg font-bold">
              {t("teachers.applications")}
            </h2>
            <p className="m-0 text-sm leading-relaxed text-muted">{t("teachers.applicationsIntro")}</p>
            <p className="m-0 text-sm font-semibold">{t(applyOn ? "teachers.applicationsOn" : "teachers.applicationsOff")}</p>
          </div>
          <form action={saveApplicationsAction}>
            <input type="hidden" name="on" value={applyOn ? "false" : "true"} />
            <SubmitButton variant="secondary" className="h-10">
              {t(applyOn ? "teachers.turnOff" : "teachers.turnOn")}
            </SubmitButton>
          </form>
        </div>
        {applications.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("teachers.noApplications")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {applications.map((a) => (
              <li key={a.id} className="flex flex-col gap-3 border-t border-line-soft py-4 first:border-t-0 first:pt-0">
                <div className="flex flex-col gap-1">
                  <span className="text-[15px] font-bold">{a.name}</span>
                  <span className="text-[13px] text-muted" dir="auto">
                    {[a.phone ?? a.email, a.subjects.join(", "), t("teachers.applied", { date: formatDate(a.createdAt, lang) })].filter(Boolean).join(" · ")}
                  </span>
                  <p className="m-0 text-[15px] leading-relaxed whitespace-pre-line" dir="auto">
                    {a.bio}
                  </p>
                </div>
                <ApplicationForm id={a.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-teachers" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-teachers" className="m-0 text-lg font-bold">
          {t("teachers.count", { count: teachers.length })}
        </h2>
        {/* 110.2 */}
        <SampleEntries app={app} list="teachers" query={await searchParams} />
        {teachers.length === 0 ? (
          <p className="m-0 text-[15px] text-muted">{t("teachers.noneYet")}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0">
            {teachers.map((teacher) => {
              const rated = teacherRating(ratings, teacher.id);
              const courses = coursesOf(setup, teacher.id).length;
              return (
                <li key={teacher.id} className="flex flex-col gap-3 border-t border-line-soft py-4 first:border-t-0 first:pt-0">
                  <div className="flex flex-wrap items-center gap-3">
                    {teacher.photoAssetId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetUrl(teacher.photoAssetId)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand text-muted">
                        <Icon name="person" size={22} />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-bold">{teacher.name}</span>
                      <span className="text-[13px] text-muted" dir="auto">
                        {[
                          teacher.phone ?? teacher.email,
                          t("teachers.line", {
                            share: String(sharePercent(teacher.shareBp)),
                            courses,
                            rating: rated.rating === null ? t("teachers.noRating") : t("teachers.rating", { rating: String(rated.rating), count: rated.count }),
                          }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <SampleBadge sample={teacher.sample} />
                    {teacher.featured ? <Badge tone="info">{t("teachers.featuredBadge")}</Badge> : null}
                    <Badge tone={teacher.status === "active" ? "success" : "warn"}>{t(teacher.status === "active" ? "teachers.active" : "teachers.suspended")}</Badge>
                    <form action={setTeacherStatusAction}>
                      <input type="hidden" name="id" value={teacher.id} />
                      <input type="hidden" name="active" value={teacher.status === "active" ? "false" : "true"} />
                      <SubmitButton variant="secondary" className="h-9">
                        {t(teacher.status === "active" ? "teachers.suspend" : "teachers.allow")}
                      </SubmitButton>
                    </form>
                    <form action={deleteTeacherAction}>
                      <input type="hidden" name="id" value={teacher.id} />
                      <ConfirmButton confirm={t("teachers.deleteConfirm")} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                        {t("teachers.delete")}
                      </ConfirmButton>
                    </form>
                  </div>
                  <details className="rounded-xl border border-line p-4">
                    <summary className="cursor-pointer text-[15px] font-semibold">{t("teachers.edit")}</summary>
                    <div className="pt-3">
                      <TeacherForm id={teacher.id} values={teacherFormValues(teacher)} emailOnly={emailOnly} photoUrl={teacher.photoAssetId ? assetUrl(teacher.photoAssetId) : null} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
