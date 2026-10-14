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
import { CourseCategoryForm, CourseForm, CurrencyForm } from "./forms";

export const metadata: Metadata = { title: "Courses" };

/** Courses, categories and payments for Academy apps without a website. */
export default async function CoursesPage() {
  const { app } = await requireClient();
  if (!app || app.connector?.kind !== "courses") {
    return (
      <div className="flex max-w-[620px] flex-col gap-3">
        <h1 className="m-0 text-[26px] leading-tight font-extrabold tracking-[-0.5px] break-words sm:text-[30px]">Courses</h1>
        <p className="m-0 text-[15px] leading-relaxed text-ink-4">
          Your app gets its courses from your website. To manage them here instead, choose &quot;I don&apos;t have a website&quot; on the{" "}
          <Link href="/dashboard/setup?step=website">Website step</Link>.
        </p>
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

      <CardPayments app={app} />
    </div>
  );
}
