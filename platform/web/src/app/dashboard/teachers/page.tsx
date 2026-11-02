import type { Metadata } from "next";
import { deleteTeacherAction, saveApplicationsAction, setTeacherStatusAction } from "@/app/actions/teachers";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, PageHeader, Section, btn, formatDate } from "@/components/ui";
import { ItemList, ItemRow, Stat, StatRow, Thumb } from "@/components/page-kit";
import { FilterList, Sheet, SheetButton } from "@/components/page-kit-client";
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
import { ApplicationForm, TeacherForm } from "./forms";
import { isTeachers, NotTeachers, TeachersPlanNotice } from "./parts";
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

  const query = await searchParams;
  const toReview = setup.courses.filter((c) => c.teacherStage === "in_review").length;
  const has = teachers.length > 0;
  const addSheet = (
    <Sheet id="new-teacher" inline={!has} title={t("teachers.add")} description={t("teachers.addHint")}>
      <TeacherForm id={null} values={teacherFormValues(null)} emailOnly={emailOnly} photoUrl={null} />
    </Sheet>
  );

  const applicationsSection = (
    <Section
      titleId="h-applications"
      title={t("teachers.applications")}
      description={
        <>
          <p className="m-0">{t("teachers.applicationsIntro")}</p>
          <p className="m-0 mt-2 flex items-center gap-1.5 font-semibold text-midnight">
            <Icon name={applyOn ? "check_circle" : "block"} size={18} className={applyOn ? "text-success" : "text-muted"} />
            {t(applyOn ? "teachers.applicationsOn" : "teachers.applicationsOff")}
          </p>
        </>
      }
      actions={
        <form action={saveApplicationsAction}>
          <input type="hidden" name="on" value={applyOn ? "false" : "true"} />
          <SubmitButton variant="secondary" className="h-10">
            {t(applyOn ? "teachers.turnOff" : "teachers.turnOn")}
          </SubmitButton>
        </form>
      }
      flush
    >
      {applications.length === 0 ? (
        <p className="m-0 px-5 py-5 text-[15px] text-muted sm:px-6">{t("teachers.noApplications")}</p>
      ) : (
        <ItemList>
          {applications.map((a, i) => (
            <li key={a.id} className="flex flex-col gap-3 border-t border-line-soft px-5 py-4 first:border-t-0 sm:px-6">
              <div className="flex items-start gap-3">
                <Thumb icon="person" shape="round" tint={i} />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-[15px] font-bold">{a.name}</span>
                  <span className="text-[13px] text-muted" dir="auto">
                    {[a.phone ?? a.email, a.subjects.join(", "), t("teachers.applied", { date: formatDate(a.createdAt, lang) })].filter(Boolean).join(" · ")}
                  </span>
                  <p className="m-0 text-[15px] leading-relaxed whitespace-pre-line" dir="auto">
                    {a.bio}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-sand p-4">
                <ApplicationForm id={a.id} />
              </div>
            </li>
          ))}
        </ItemList>
      )}
    </Section>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the numbers, the teachers, then the applications. */}
      <PageHeader
        title={t("teachers.title")}
        description={t("teachers.intro")}
        actions={
          has ? (
            <SheetButton target="new-teacher" icon="add">
              {t("teachers.add")}
            </SheetButton>
          ) : null
        }
      />
      <TeachersPlanNotice plan={plan} t={t} />
      {/* 110.2 */}
      <SampleEntries app={app} list="teachers" query={query} />

      <StatRow label={t("teachers.title")}>
        <Stat icon="groups" label={t("teachers.title")} value={teachers.length} />
        <Stat icon="check_circle" tone="success" label={t("teachers.active")} value={teachers.filter((teacher) => teacher.status === "active").length} />
        <Stat icon="pending" tone="warn" label={t("teachers.statApplications")} value={applications.length} />
        <Stat icon="task_alt" tone="accent" label={t("teachers.statToReview")} value={toReview} href="/dashboard/teachers/review" />
      </StatRow>

      {/* One place in the page either way, so the form that adds the first teacher keeps its message. */}
      {addSheet}

      <Section titleId="h-teachers" title={t("teachers.count", { count: teachers.length })} flush>
        {teachers.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="groups" title={t("teachers.noneYet")} />
          </div>
        ) : (
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("teachers.search")}
            noMatch={t("teachers.noMatch")}
            filters={[
              { value: "active", label: t("teachers.active") },
              { value: "suspended", label: t("teachers.suspended") },
            ]}
            items={teachers.map((teacher, i) => {
              const rated = teacherRating(ratings, teacher.id);
              const courses = coursesOf(setup, teacher.id).length;
              return {
                id: teacher.id,
                text: [teacher.name, teacher.phone, teacher.email, ...teacher.subjects].filter(Boolean).join(" "),
                group: teacher.status,
                node: (
                  <ItemRow
                    media={<Thumb src={teacher.photoAssetId ? assetUrl(teacher.photoAssetId) : null} icon="person" shape="round" tint={i} />}
                    title={teacher.name}
                    badges={
                      <>
                        <SampleBadge sample={teacher.sample} />
                        {teacher.featured ? <Badge tone="info">{t("teachers.featuredBadge")}</Badge> : null}
                        <Badge tone={teacher.status === "active" ? "success" : "warn"}>{t(teacher.status === "active" ? "teachers.active" : "teachers.suspended")}</Badge>
                      </>
                    }
                    meta={[
                      teacher.phone ?? teacher.email,
                      t("teachers.line", {
                        share: String(sharePercent(teacher.shareBp)),
                        courses,
                        rating: rated.rating === null ? t("teachers.noRating") : t("teachers.rating", { rating: String(rated.rating), count: rated.count }),
                      }),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    extra={teacher.subjects.length ? <span>{teacher.subjects.join(" · ")}</span> : null}
                    actions={
                      <>
                        <SheetButton target={`teacher-${teacher.id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
                          {t("teachers.edit")}
                        </SheetButton>
                        <form action={setTeacherStatusAction}>
                          <input type="hidden" name="id" value={teacher.id} />
                          <input type="hidden" name="active" value={teacher.status === "active" ? "false" : "true"} />
                          <SubmitButton variant="secondary" className="h-9 px-3.5 text-sm">
                            {t(teacher.status === "active" ? "teachers.suspend" : "teachers.allow")}
                          </SubmitButton>
                        </form>
                        <form action={deleteTeacherAction}>
                          <input type="hidden" name="id" value={teacher.id} />
                          <ConfirmButton confirm={t("teachers.deleteConfirm")} className={`${btn.danger} h-9 px-3.5 text-sm`}>
                            {t("teachers.delete")}
                          </ConfirmButton>
                        </form>
                        <Sheet id={`teacher-${teacher.id}`} title={t("teachers.editTitle", { name: teacher.name })}>
                          <TeacherForm id={teacher.id} values={teacherFormValues(teacher)} emailOnly={emailOnly} photoUrl={teacher.photoAssetId ? assetUrl(teacher.photoAssetId) : null} />
                        </Sheet>
                      </>
                    }
                  />
                ),
              };
            })}
          />
        )}
      </Section>

      {applicationsSection}
    </div>
  );
}
