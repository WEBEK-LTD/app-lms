import type { Metadata } from "next";
import Link from "next/link";
import { deleteCourseCategoryAction } from "@/app/actions/courses";
import { SubmitButton } from "@/components/form";
import { Badge, Notice } from "@/components/ui";
import { requireClient } from "@/lib/auth/session";
import { formatCents } from "@/lib/catalog/money";
import { courseSetup, lessonsOf } from "@/lib/courses/setup";
import { getStore } from "@/lib/data";
import { CardPayments } from "../catalog/payments";
import { UpgradeHint } from "@/components/upgrade";
import { currentPlanId } from "@/lib/billing/plan-change";
import { downloadsFormValue, offersDownloads } from "@/lib/courses/downloads";
import { effectivePlans } from "@/lib/entitlements";
import { hasFeature, lowestPlanWith } from "@/lib/plans";
import type { App, License } from "@/lib/data/types";
import { CourseCategoryForm, CourseForm, CurrencyForm, OfflineDownloadsForm } from "./forms";

export const metadata: Metadata = { title: "Courses" };

/** 45 Offline downloads: on or off for the app's students, with offline mode in the plan. */
async function OfflineDownloads({ app, license }: { app: App; license: License | null }) {
  if (!offersDownloads(app)) return null;
  const effective = await effectivePlans(await getStore());
  const planId = license ? currentPlanId(license, new Date()) : null;
  const plan = planId ? effective[planId] : null;
  const included = hasFeature(plan, "offline_downloads");
  return (
    <section aria-labelledby="h-offline" className="flex max-w-[720px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 id="h-offline" className="m-0 text-lg font-bold">
          Offline downloads
        </h2>
        <p className="m-0 text-sm leading-relaxed text-muted">
          Students save lessons and whole courses in the app to watch and read without the internet: uploaded videos, lesson text and its images, and
          attachments. They&apos;re stored encrypted inside the app, never in the phone&apos;s gallery or files, and deleted when the student&apos;s access
          ends or after 30 days without a connection. Lessons whose video plays from YouTube, Vimeo or another video site need the internet.
        </p>
      </div>
      {included ? null : (
        <UpgradeHint title="Offline downloads" to={lowestPlanWith(effective, (p) => hasFeature(p, "offline_downloads"), planId)}>
          Offline mode, with lessons saved in the app, isn&apos;t in this app&apos;s plan.
        </UpgradeHint>
      )}
      <OfflineDownloadsForm current={downloadsFormValue(app)} wordpress={app.connector?.kind !== "courses"} disabled={!included} />
    </section>
  );
}

/** Courses, categories and payments for Academy apps without a website. */
export default async function CoursesPage() {
  const { app, license } = await requireClient();
  if (!app || app.connector?.kind !== "courses") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex max-w-[620px] flex-col gap-3">
          <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Courses</h1>
          <p className="m-0 text-[15px] leading-relaxed text-ink-4">
            Your app gets its courses from your website. To manage them here instead, choose &quot;I don&apos;t have a website&quot; on the{" "}
            <Link href="/dashboard/setup?step=website">Website step</Link>.
          </p>
        </div>
        {app ? <OfflineDownloads app={app} license={license} /> : null}
      </div>
    );
  }
  const setup = courseSetup(app);
  const enrollments = await (await getStore()).listCourseEnrollments({ appId: app.id });
  const students = (id: number) => enrollments.filter((e) => e.courseId === id).length;
  const paid = setup.courses.some((c) => c.priceCents > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-[620px] flex-col gap-2">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Courses</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">What your students learn in the app. Changes show in the app right away.</p>
      </div>
      {paid && !app.catalogSettings?.payment ? (
        <Notice tone="warn" icon="warning">
          Paid courses can&apos;t be bought until you set up <a href="#h-payments">Card payments</a> below.
        </Notice>
      ) : null}

      <section aria-labelledby="h-courses" className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-courses" className="m-0 text-lg font-bold">
          {setup.courses.length} {setup.courses.length === 1 ? "course" : "courses"}
        </h2>
        {setup.courses.length ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {setup.courses.map((c) => (
              <li key={c.id} className="border-t border-line-soft py-3 first:border-t-0">
                <Link href={`/dashboard/courses/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 no-underline">
                  <span className="text-[15px] font-bold">{c.title}</span>
                  <span className="flex items-center gap-2 text-sm text-muted">
                    {c.priceCents ? formatCents(c.priceCents, setup.currency) : "Free"} · {lessonsOf(c).length} lessons · {students(c.id)} students
                    {c.active ? null : <Badge tone="warn">Hidden</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[15px] text-muted">No courses yet. Add your first one.</p>
        )}
      </section>

      <section aria-labelledby="h-new-course" className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 id="h-new-course" className="m-0 text-lg font-bold">
          Add a course
        </h2>
        <CourseForm
          current={{ title: "", description: "", price: "", instructor: "", level: "", categoryIds: "", active: "on" }}
          categories={setup.categories}
          currency={setup.currency}
          imageUrl={null}
          submit="Add course"
        />
      </section>

      <div className="flex flex-wrap items-start gap-6">
        <section aria-labelledby="h-course-categories" className="flex min-w-0 flex-[1_1_320px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-course-categories" className="m-0 text-lg font-bold">
            Categories
          </h2>
          {setup.categories.length ? (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {setup.categories.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-full border border-line py-1 pr-1 pl-3 text-sm">
                  {c.name}
                  <form action={deleteCourseCategoryAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton variant="secondary" className="h-7 px-2 text-xs">
                      Delete
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          ) : null}
          <CourseCategoryForm />
        </section>
        <section aria-labelledby="h-course-currency" className="flex min-w-0 flex-[1_1_260px] flex-col gap-4 rounded-2xl border border-line bg-white p-5 sm:p-6">
          <h2 id="h-course-currency" className="m-0 text-lg font-bold">
            Prices
          </h2>
          <CurrencyForm currency={setup.currency} />
        </section>
      </div>

      <CardPayments app={app} currency={setup.currency} />

      <OfflineDownloads app={app} license={license} />
    </div>
  );
}
