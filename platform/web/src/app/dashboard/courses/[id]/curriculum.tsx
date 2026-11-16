"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { deleteTopicAction, reorderItemsAction, reorderTopicsAction, saveLessonAction } from "@/app/actions/courses";
import { Field, FieldError, FormMessage, SubmitButton } from "@/components/form";
import { Icon } from "@/components/icon";
import { useDashT } from "@/components/dashboard-i18n";
import { SortableList, SortControls } from "@/components/manage-kit-client";
import { MediaPickButton } from "@/components/media-picker";
import { initialFormState } from "@/lib/forms";
import { TopicTitleForm } from "../builder-forms";
import { TopicForm } from "../forms";
import { ITEM_ICON, type ItemKind } from "./item-icons";

export interface CurriculumItem {
  id: number;
  kind: ItemKind;
  title: string;
  meta: string;
  href: string;
}

export interface CurriculumTopic {
  id: number;
  title: string;
  lessons: number;
  items: CurriculumItem[];
  /** The pages that add a quiz, an assignment or a live class to it. */
  add: { lesson: string; quiz: string; assignment: string; live: string };
}

const ITEM_TINT: Record<ItemKind, string> = { lesson: "bg-tile-1", quiz: "bg-tile-2", assignment: "bg-tile-3", live: "bg-tile-4" };

/** A lesson added where the section ends: its title and its video (the rest on its own page). */
function QuickLesson({ courseId, topicId }: { courseId: number; topicId: number }) {
  const t = useDashT();
  const [state, action] = useActionState(saveLessonAction, initialFormState);
  const v = state.values ?? {};
  const e = state.errors ?? {};
  const key = `quick-${topicId}`;
  return (
    <form action={action} noValidate className="flex flex-col gap-2.5 rounded-xl border border-dashed border-line-strong bg-white p-3" key={state.ok ? state.message : "new"} data-quick-lesson="">
      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="topicId" value={topicId} />
      <input type="hidden" name="id" value="" />
      <FormMessage message={state.message} ok={state.ok} />
      <div className="grid items-start gap-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <Field label={t("courses.lessonTitle")} name="title" id={`${key}-title`} defaultValue={v.title} error={e.title} placeholder={t("manage.lessonTitlePlaceholder")} small />
        <div className="flex min-w-0 flex-col gap-1">
          <Field label={t("courses.videoAddress")} name="videoUrl" id={`${key}-video`} type="url" dir="ltr" placeholder="https://www.youtube.com/watch?v=…" defaultValue={v.videoUrl} error={e.videoUrl} small />
          {/* 51 Videos uploaded to Yallapp. */}
          <MediaPickButton kind="video" inputId={`${key}-video`} label={t("courses.chooseMedia")} />
        </div>
        <SubmitButton className="h-11 sm:mt-[26px]" pendingText={t("common.adding")}>
          <Icon name="add" size={20} />
          {t("courses.addLesson")}
        </SubmitButton>
      </div>
      <FieldError id={`${key}-text-error`} error={e.text} />
      <span className="text-[13px] text-muted">{t("manage.quickLessonHint")}</span>
    </form>
  );
}

/**
 * 132.14 The course's curriculum: its sections and, in each, its lessons,
 * quizzes, assignments and live classes, both dragged into order (or moved
 * with the arrow keys and buttons); a lesson added in place, each one opened
 * on its own page; sections added, renamed and deleted here.
 */
export function Curriculum({ courseId, topics }: { courseId: number; topics: CurriculumTopic[] }) {
  const t = useDashT();
  const [saving, start] = useTransition();
  const [renaming, setRenaming] = useState<number | null>(null);
  const words = { drag: t("manage.drag"), up: t("manage.moveUp"), down: t("manage.moveDown") };
  const kindWord: Record<ItemKind, string> = { lesson: t("manage.kind_lesson"), quiz: t("manage.kind_quiz"), assignment: t("manage.kind_assignment"), live: t("manage.kind_live") };
  const save = (run: () => Promise<void>) => start(run);
  return (
    <div className="flex flex-col gap-4" data-curriculum="">
      <p role="status" aria-live="polite" className="m-0 flex min-h-5 items-center gap-2 text-[13px] text-muted">
        {saving ? <Icon name="progress_activity" size={16} className="animate-spin" /> : <Icon name="drag_indicator" size={16} />}
        {saving ? t("common.saving") : t("manage.curriculumHint")}
      </p>
      <SortableList
        items={topics}
        idOf={(topic) => topic.id}
        hint={t("manage.dragKeys")}
        moved={(place, count) => t("manage.moved", { place, count })}
        onReorder={(ids) => save(() => reorderTopicsAction(courseId, ids.map(Number)))}
        className="m-0 flex list-none flex-col gap-4 p-0"
        render={(topic, sortable) => (
          <div data-topic={topic.id} className={`flex flex-col gap-3 rounded-2xl border border-line bg-sand/50 p-3 sm:p-4 ${sortable.dragging ? "ring-2 ring-ember" : ""}`}>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
              <SortControls sortable={sortable} name={topic.title} words={words} />
              <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-midnight text-sm font-extrabold text-ivory tabular-nums">
                {sortable.index + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <h3 className="m-0 text-[17px] font-bold break-words">{topic.title}</h3>
                <span className="text-[13px] text-muted">{t("courses.sectionItems", { count: topic.items.length })}</span>
              </span>
              <span className="flex items-center gap-1">
                <button type="button" onClick={() => setRenaming(renaming === topic.id ? null : topic.id)} aria-expanded={renaming === topic.id} className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-line bg-white px-2.5 text-[13px] font-semibold text-midnight hover:border-midnight">
                  <Icon name="edit" size={16} />
                  {t("lms.renameSection")}
                </button>
                <form
                  action={deleteTopicAction}
                  onSubmit={(event) => {
                    if (!window.confirm(t("manage.deleteSectionConfirm", { name: topic.title, count: topic.items.length }))) event.preventDefault();
                  }}
                >
                  <input type="hidden" name="courseId" value={courseId} />
                  <input type="hidden" name="topicId" value={topic.id} />
                  <button type="submit" aria-label={`${t("courses.deleteSection")}: ${topic.title}`} title={t("courses.deleteSection")} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-muted hover:bg-danger-bg hover:text-danger">
                    <Icon name="delete" size={18} />
                  </button>
                </form>
              </span>
            </div>
            {renaming === topic.id ? (
              <div className="rounded-xl border border-line-soft bg-white p-3">
                <TopicTitleForm courseId={courseId} topicId={topic.id} title={topic.title} />
              </div>
            ) : null}
            {topic.items.length ? (
              <SortableList
                items={topic.items}
                idOf={(it) => it.id}
                hint={t("manage.dragKeys")}
                moved={(place, count) => t("manage.moved", { place, count })}
                onReorder={(ids) => save(() => reorderItemsAction(courseId, topic.id, ids.map(Number)))}
                className="m-0 flex list-none flex-col gap-1.5 p-0"
                render={(it, s) => (
                  <div data-item={it.id} data-kind={it.kind} className="flex items-center gap-2 rounded-xl border border-line bg-white py-1.5 ps-1.5 pe-2">
                    <SortControls sortable={s} name={it.title} words={words} />
                    <Link href={it.href} className="group flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5 rounded-lg py-1 text-midnight no-underline hover:text-midnight">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-ink-3 ${ITEM_TINT[it.kind]}`} title={kindWord[it.kind]}>
                        <Icon name={ITEM_ICON[it.kind]} size={18} />
                      </span>
                      <span className="flex min-w-0 flex-[1_1_200px] flex-col">
                        <span className="text-[15px] font-semibold break-words group-hover:underline">{it.title}</span>
                        <span className="text-[13px] text-muted">{it.meta}</span>
                      </span>
                      <Icon name="chevron_right" size={20} className="shrink-0 text-faint group-hover:text-midnight" />
                    </Link>
                  </div>
                )}
              />
            ) : (
              <p className="m-0 rounded-xl bg-white px-3 py-2.5 text-[13px] text-muted">{t("manage.sectionEmpty")}</p>
            )}
            <QuickLesson courseId={courseId} topicId={topic.id} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-semibold text-muted">{t("manage.addMore")}</span>
              {(
                [
                  { kind: "lesson" as const, href: topic.add.lesson },
                  ...(topic.lessons ? [{ kind: "quiz" as const, href: topic.add.quiz }] : []),
                  { kind: "assignment" as const, href: topic.add.assignment },
                  { kind: "live" as const, href: topic.add.live },
                ] satisfies { kind: ItemKind; href: string }[]
              ).map((a) => (
                <Link key={a.kind} href={a.href} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[13px] font-semibold text-midnight no-underline hover:border-midnight hover:text-midnight">
                  <Icon name={ITEM_ICON[a.kind]} size={16} />
                  {kindWord[a.kind]}
                </Link>
              ))}
            </div>
          </div>
        )}
      />
      {/* The course's next section, in place. */}
      <section aria-labelledby={`h-new-section-${courseId}`} className="flex flex-col gap-2 rounded-2xl border border-dashed border-line-strong bg-white p-4">
        <h3 id={`h-new-section-${courseId}`} className="m-0 flex items-center gap-2 text-[15px] font-bold">
          <Icon name="add" size={18} />
          {t("courses.addSectionTitle")}
        </h3>
        <p className="m-0 text-[13px] text-muted">{t("courses.addSectionHint")}</p>
        <TopicForm courseId={courseId} />
      </section>
    </div>
  );
}
