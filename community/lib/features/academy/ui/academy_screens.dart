import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/l10n.dart';
import '../../../core/routing/feature_routes.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/sym.dart';
import '../../qa/ui/content_direction.dart';
import '../../showcase/ui/flat_kit.dart';
import '../data/academy_api.dart';

final academyCoursesProvider = FutureProvider.autoDispose<List<CourseSummary>>(
  (ref) => ref.watch(academyApiProvider).courses(),
);

final academyCourseProvider = FutureProvider.autoDispose.family<Course, String>(
  (ref, id) => ref.watch(academyApiProvider).course(id),
);

final academyLessonProvider = FutureProvider.autoDispose
    .family<Lesson, (String, String)>(
      (ref, ids) => ref.watch(academyApiProvider).lesson(ids.$1, ids.$2),
    );

String _level(BuildContext context, CourseLevel level) {
  final l = context.l10n;
  return switch (level) {
    CourseLevel.beginner => l.tutLevelBeginner,
    CourseLevel.intermediate => l.tutLevelIntermediate,
    CourseLevel.advanced => l.tutLevelAdvanced,
  };
}

/// 233.1 The Academy's courses. A course the member doesn't have shows a
/// lock and nothing else: no price, nothing to buy, no link to pay.
class AcademyScreen extends ConsumerWidget {
  const AcademyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    return FlatPage(
      title: l.academyTitle,
      body: FlatAsyncList<CourseSummary>(
        value: ref.watch(academyCoursesProvider),
        onRetry: () => ref.refresh(academyCoursesProvider.future),
        empty: l.academyEmpty,
        item: (c) => CourseCard(course: c),
      ),
    );
  }
}

class CourseCard extends StatelessWidget {
  const CourseCard({super.key, required this.course});

  final CourseSummary course;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final progress = course.progress;
    return FlatCard(
      semanticLabel: course.locked
          ? '${course.title}, ${l.academyLocked}'
          : course.title,
      onTap: () => context.push(FeatureLinks.course(course.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: FlatHeading(course.title)),
              if (course.locked) ...[
                const SizedBox(width: 8),
                Sym(
                  Symbols.lock_rounded,
                  key: const ValueKey('course-locked'),
                  size: 20,
                  color: p.muted,
                ),
              ],
            ],
          ),
          if (course.summary.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              course.summary,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 13, color: p.muted),
            ),
          ],
          const SizedBox(height: 10),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              FlatTag(_level(context, course.level)),
              FlatTag(
                l.academyLessons(course.lessonCount),
                icon: Symbols.play_lesson_rounded,
              ),
              if (course.locked)
                FlatTag(l.academyLocked, icon: Symbols.lock_rounded)
              else if (progress != null)
                FlatTag(
                  l.academyProgress((progress * 100).round()),
                  accent: true,
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// A course: its lessons. Locked, it says so and opens nothing.
class CourseScreen extends ConsumerWidget {
  const CourseScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = context.palette;
    final value = ref.watch(academyCourseProvider(id));
    final course = value.value;
    return FlatPage(
      title: course?.summary.title ?? l.academyTitle,
      body: course == null
          ? Center(
              child: value.hasError
                  ? TextButton(
                      onPressed: () =>
                          ref.invalidate(academyCourseProvider(id)),
                      child: Text(l.commonRetry),
                    )
                  : const CircularProgressIndicator(),
            )
          : ListView(
              padding: EdgeInsets.fromLTRB(
                16,
                4,
                16,
                120 + MediaQuery.paddingOf(context).bottom,
              ),
              children: [
                if (course.summary.locked)
                  FlatCard(
                    child: Row(
                      children: [
                        Sym(Symbols.lock_rounded, color: p.muted),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            l.academyLockedNote,
                            style: TextStyle(color: p.ink),
                          ),
                        ),
                      ],
                    ),
                  ),
                if (course.description.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text(
                    course.description,
                    textDirection: contentDirection(course.description),
                    style: TextStyle(fontSize: 15, height: 1.6, color: p.ink),
                  ),
                ],
                const SizedBox(height: 16),
                for (final lesson in course.lessons)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: FlatCard(
                      onTap: course.summary.locked
                          ? null
                          : () => context.push(
                              FeatureLinks.lesson(course.summary.id, lesson.id),
                            ),
                      child: Row(
                        children: [
                          Sym(
                            lesson.done
                                ? Symbols.check_circle_rounded
                                : lesson.video
                                ? Symbols.play_circle_rounded
                                : Symbols.article_rounded,
                            fill: lesson.done,
                            color: lesson.done ? Brand.orange : p.muted,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              lesson.title,
                              style: TextStyle(
                                fontWeight: FontWeight.w600,
                                color: p.ink,
                              ),
                            ),
                          ),
                          Text(
                            l.academyMinutes(lesson.minutes),
                            style: TextStyle(fontSize: 12, color: p.muted),
                          ),
                          if (course.summary.locked) ...[
                            const SizedBox(width: 8),
                            Sym(Symbols.lock_rounded, size: 18, color: p.muted),
                          ],
                        ],
                      ),
                    ),
                  ),
                if (course.certificateUrl != null)
                  FlatButton(
                    label: l.academyCertificate,
                    icon: Symbols.workspace_premium_rounded,
                    outlined: true,
                    onPressed: () =>
                        openLink(context, ref, course.certificateUrl!),
                  ),
              ],
            ),
    );
  }
}

/// A lesson of an open course: its text, its video, Mark as done.
class LessonScreen extends ConsumerWidget {
  const LessonScreen({super.key, required this.course, required this.lesson});

  final String course;
  final String lesson;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l10n;
    final p = context.palette;
    final value = ref.watch(academyLessonProvider((course, lesson)));
    final item = value.value;
    return FlatPage(
      title: item?.title ?? l.academyTitle,
      body: item == null
          ? Center(
              child: value.hasError
                  ? TextButton(
                      onPressed: () => ref.invalidate(
                        academyLessonProvider((course, lesson)),
                      ),
                      child: Text(l.commonRetry),
                    )
                  : const CircularProgressIndicator(),
            )
          : ListView(
              padding: EdgeInsets.fromLTRB(
                16,
                4,
                16,
                120 + MediaQuery.paddingOf(context).bottom,
              ),
              children: [
                if (item.videoUrl != null) ...[
                  FlatButton(
                    label: l.academyWatch,
                    icon: Symbols.play_circle_rounded,
                    onPressed: () => openLink(context, ref, item.videoUrl!),
                  ),
                  const SizedBox(height: 14),
                ],
                Text(
                  item.body,
                  textDirection: contentDirection(item.body),
                  style: TextStyle(fontSize: 15, height: 1.65, color: p.ink),
                ),
                const SizedBox(height: 20),
                FlatButton(
                  label: item.done ? l.academyDone : l.academyComplete,
                  icon: Symbols.check_rounded,
                  outlined: true,
                  onPressed: item.done
                      ? null
                      : () async {
                          try {
                            await ref
                                .read(academyApiProvider)
                                .complete(course, lesson);
                            ref
                              ..invalidate(
                                academyLessonProvider((course, lesson)),
                              )
                              ..invalidate(academyCourseProvider(course));
                          } catch (e) {
                            if (context.mounted) showFailure(context, e);
                          }
                        },
                ),
              ],
            ),
    );
  }
}
