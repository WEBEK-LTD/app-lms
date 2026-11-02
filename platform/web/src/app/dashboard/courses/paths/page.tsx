import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { deletePathAction } from "@/app/actions/courses";
import { SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { Badge, EmptyState, PageHeader, Section } from "@/components/ui";
import { ItemRow, Thumb } from "@/components/page-kit";
import { FilterList, Sheet, SheetButton } from "@/components/page-kit-client";
import { requireClient } from "@/lib/auth/session";
import { BADGES, POINTS } from "@/lib/courses/gamification";
import { courseSetup } from "@/lib/courses/setup";
import { dashboardText } from "@/lib/dashboard-lang";
import { GamificationForm, PathForm } from "../learning-forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await dashboardText()).t("learning.pathsTitle") };
}

/** 113.7 Learning paths (courses one after another), and points and badges on or off. */
export default async function LearningPathsPage() {
  const { app } = await requireClient("catalog");
  if (!app || app.connector?.kind !== "courses") notFound();
  const setup = courseSetup(app);
  const { t } = await dashboardText();
  const courses = setup.courses.map((c) => ({ id: c.id, title: c.title }));
  const title = new Map(courses.map((c) => [c.id, c.title]));
  const paths = setup.paths ?? [];

  const canAdd = courses.length >= 2;

  return (
    <div className="flex flex-col gap-6">
      {/* The page kit: the header and its main action, the paths in a flush Section, the form in a Sheet (in place for the first path), then points and badges. */}
      <PageHeader
        back={{ href: "/dashboard/courses", label: t("courses.backToCourses") }}
        title={t("learning.pathsTitle")}
        description={t("learning.pathsIntro")}
        actions={
          paths.length && canAdd ? (
            <SheetButton target="new-path" icon="add">
              {t("learning.addPath")}
            </SheetButton>
          ) : null
        }
      />

      <Section titleId="h-paths" title={t("learning.paths")} actions={<Badge tone="neutral">{paths.length}</Badge>} flush>
        {paths.length === 0 ? (
          <div className="p-5 sm:p-6">
            <EmptyState icon="route" title={t("learning.noPaths")}>
              {canAdd ? null : t("learning.pathsNeedCourses")}
            </EmptyState>
          </div>
        ) : (
          <FilterList
            allLabel={t("common.all")}
            searchLabel={t("learning.searchPaths")}
            noMatch={t("learning.noPathMatch")}
            filters={[
              { value: "shown", label: t("learning.pathShownChip") },
              { value: "hidden", label: t("common.hidden") },
            ]}
            items={paths.map((p, i) => {
              const chain = p.courseIds.map((id) => title.get(id)).filter(Boolean);
              return {
                id: p.id,
                text: [p.title, ...chain].join(" "),
                group: p.active ? "shown" : "hidden",
                node: (
                  <ItemRow
                    data-path={p.id}
                    media={<Thumb icon="route" shape="square" tint={i} />}
                    title={p.title}
                    badges={
                      <>
                        {p.inOrder ? <Badge tone="neutral">{t("learning.inOrderBadge")}</Badge> : null}
                        {p.active ? null : <Badge tone="warn">{t("common.hidden")}</Badge>}
                      </>
                    }
                    meta={chain.join(" → ")}
                    extra={p.description ? <span className="line-clamp-1">{p.description}</span> : null}
                    actions={
                      <>
                        <SheetButton target={`path-${p.id}`} icon="edit" variant="secondary" className="h-9 px-3.5 text-sm">
                          {t("learning.editPath")}
                        </SheetButton>
                        <form action={deletePathAction}>
                          <input type="hidden" name="pathId" value={p.id} />
                          <SubmitButton variant="danger" className="h-9 px-3.5 text-sm">
                            {t("learning.deletePath")}
                          </SubmitButton>
                        </form>
                        <Sheet id={`path-${p.id}`} title={t("learning.editPathTitle", { name: p.title })}>
                          <PathForm
                            current={{ id: String(p.id), title: p.title, description: p.description, courseIds: p.courseIds.join(","), inOrder: p.inOrder ? "on" : "", active: p.active ? "on" : "" }}
                            courses={courses}
                            submit={t("learning.savePath")}
                          />
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

      {canAdd ? (
        <Sheet id="new-path" inline={paths.length === 0} title={t("learning.addPath")}>
          <PathForm current={{ title: "", description: "", courseIds: "", inOrder: "on", active: "on" }} courses={courses} submit={t("learning.addPathButton")} />
        </Sheet>
      ) : null}

      <Section
        titleId="h-points"
        title={t("learning.gamification")}
        description={t("learning.gamificationIntro", { lesson: POINTS.lesson, quiz: POINTS.quiz, assignment: POINTS.assignment, day: POINTS.streakDay })}
        actions={setup.gamification ? <Badge tone="success">{t("learning.gamificationOnBadge")}</Badge> : <Badge tone="neutral">{t("learning.gamificationOffBadge")}</Badge>}
      >
        <ul className="m-0 grid list-none gap-2.5 p-0" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
          {BADGES.map((b, i) => (
            <li key={b.id} className="flex items-center gap-2.5 rounded-xl border border-line-soft px-3 py-2.5 text-[14px] font-semibold">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-3 ${["bg-tile-1", "bg-tile-2", "bg-tile-3", "bg-tile-4", "bg-tile-5"][i % 5]}`}>
                <Icon name={b.icon} size={20} />
              </span>
              {t(`learning.badge_${b.id}`)}
            </li>
          ))}
        </ul>
        <GamificationForm on={setup.gamification === true} />
      </Section>
    </div>
  );
}
