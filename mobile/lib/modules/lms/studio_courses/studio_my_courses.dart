import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart' show MyCoursesStatus;
import '../../../core/l10n/l10n.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/app_nav_bar.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/studio_screen_scope.dart';
import '../data/lms_providers.dart';
import '../home/learning_cards.dart';
import '../learning/learning_providers.dart';
import '../my_courses/premium_my_courses.dart' show myCoursesTitle;
import '../navigation.dart';
import 'course_look_kit.dart';
import '../../../core/format/text_case.dart';

/// 130.52 My courses in Studio's course screens' look (`Config.screens.
/// courses.my_courses`): the tab's name large with the owner's line under
/// it, continue learning (the course in progress with its next lesson and
/// how far the student is, a tap from it), this week's learning, the lists
/// as chips with how many each has (in progress, completed, saved), and the
/// courses as a `grid` or a `list` with `rings` or `bars`, the completed
/// ones with their certificates. All the student's own; each part left out
/// when they have none.
class StudioMyCourses extends ConsumerWidget {
  const StudioMyCourses({
    super.key,
    required this.look,
    required this.labels,
    required this.selected,
    required this.onSelected,
    required this.wishlist,
  });

  final CourseScreensLook look;

  /// The lists' names: in progress, completed and (where it is on) saved.
  final List<String> labels;
  final int selected;
  final ValueChanged<int> onSelected;
  final Widget wishlist;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final design = look.myCourses;
    final colors = CourseLookColors.of(context, look);
    final going = ref.watch(myCoursesProvider(MyCoursesStatus.inProgress));
    final done = design.shows(MyCoursesPart.completed)
        ? ref.watch(myCoursesProvider(MyCoursesStatus.completed))
        : null;
    final week = design.shows(MyCoursesPart.week)
        ? ref.watch(learningTimeProvider).value
        : null;
    // The lists shown, and which of them is open.
    final lists = [
      (MyCoursesStatus.inProgress, labels[0], going.total),
      if (done != null) (MyCoursesStatus.completed, labels[1], done.total),
    ];
    final wishlistAt = labels.length > 2 ? lists.length : -1;
    final open = selected >= 2
        ? (wishlistAt >= 0 ? wishlistAt : 0)
        : selected.clamp(0, lists.length - 1);
    final onWishlist = open == wishlistAt;
    final state = onWishlist
        ? going
        : open == 0
        ? going
        : done!;
    final continuing = design.shows(MyCoursesPart.continueLearning)
        ? going.items.firstOrNull
        : null;
    final language = Localizations.localeOf(context).languageCode;
    final headline = textFor(design.headline, language);
    final chips = [
      for (final (_, label, count) in lists)
        count > 0 ? '$label $count' : label,
      if (wishlistAt >= 0) labels[2],
    ];
    return Scaffold(
      key: ValueKey('studio-my-courses-${design.layout.name}'),
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () async {
            ref
              ..invalidate(learningTimeProvider)
              ..invalidate(certificatesProvider);
            await ref
                .read(myCoursesProvider(MyCoursesStatus.inProgress).notifier)
                .refresh();
          },
          child: CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
                sliver: SliverList.list(
                  children: [
                    // Under a Studio page's header, the header is the title.
                    if (!StudioScreenScope.hidesTitleOf(context))
                      Semantics(
                        header: true,
                        child: Text(
                          myCoursesTitle(ref, context),
                          key: const ValueKey('studio-my-courses-title'),
                          style: TextStyle(
                            fontSize: look.look == CourseLook.faculty ? 32 : 29,
                            height: 1.1,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.3,
                            color: p.text,
                          ),
                        ),
                      ),
                    if (headline != null) ...[
                      if (!StudioScreenScope.hidesTitleOf(context))
                        const SizedBox(height: 6),
                      Text(
                        headline,
                        key: const ValueKey('studio-my-courses-headline'),
                        style: TextStyle(
                          fontSize: 14.5,
                          height: 1.4,
                          color: p.textSecondary,
                        ),
                      ),
                    ],
                    if (continuing != null) ...[
                      const SizedBox(height: 18),
                      _Continue(course: continuing, colors: colors),
                    ],
                    if (week != null) ...[
                      const SizedBox(height: 14),
                      DecoratedBox(
                        key: const ValueKey('studio-my-courses-week'),
                        decoration: BoxDecoration(
                          color: colors.dark
                              ? const Color(0xFFEEF0F7)
                              : p.primary,
                          borderRadius: BorderRadius.circular(
                            look.look == CourseLook.faculty ? 14 : 26,
                          ),
                        ),
                        child: LearningWeek(
                          time: week,
                          color: colors.dark
                              ? const Color(0xFF141A30)
                              : AppNavBar.onFill(p.primary),
                          title: null,
                        ),
                      ),
                    ],
                    const SizedBox(height: 18),
                    SizedBox(
                      height: 38,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: chips.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 8),
                        itemBuilder: (context, i) {
                          final on = i == open;
                          return Semantics(
                            button: true,
                            selected: on,
                            child: InkWell(
                              key: ValueKey('studio-my-courses-chip-$i'),
                              borderRadius: BorderRadius.circular(999),
                              onTap: () => onSelected(
                                i == wishlistAt ? 2 : (i == 1 ? 1 : 0),
                              ),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                ),
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: on
                                      ? colors.accent
                                      : Colors.transparent,
                                  borderRadius: BorderRadius.circular(999),
                                  border: Border.all(
                                    color: on ? colors.accent : colors.line,
                                  ),
                                ),
                                child: Text(
                                  chips[i],
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: on ? colors.onAccent : p.text,
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],
                ),
              ),
              if (onWishlist)
                SliverFillRemaining(child: wishlist)
              else if (state.isInitialLoading)
                const SliverToBoxAdapter(child: SkeletonList(count: 4))
              else if (state.items.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: MessageView(
                    icon: open == 0
                        ? Symbols.play_lesson_rounded
                        : Symbols.workspace_premium_rounded,
                    title: open == 0
                        ? l10n.noCoursesInProgress
                        : l10n.noCompletedCourses,
                    message: open == 0
                        ? l10n.noCoursesInProgressMessage
                        : l10n.noCompletedCoursesMessage,
                  ),
                )
              else if (design.layout == MyCoursesLayout.grid)
                SliverPadding(
                  // 179 At least the design's room, and above a tab bar floating over it with the phone's own bar under it (roadmap 158).
                  padding: EdgeInsets.fromLTRB(
                    18,
                    0,
                    18,
                    math.max(120, endRoom(context, 24)),
                  ),
                  sliver: SliverGrid.count(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.74,
                    children: [
                      for (final c in state.items)
                        _GridItem(course: c, colors: colors),
                    ],
                  ),
                )
              else
                SliverPadding(
                  // 179 At least the design's room, and above a tab bar floating over it with the phone's own bar under it (roadmap 158).
                  padding: EdgeInsets.fromLTRB(
                    18,
                    0,
                    18,
                    math.max(120, endRoom(context, 24)),
                  ),
                  sliver: SliverList.separated(
                    itemCount: state.items.length,
                    separatorBuilder: (_, _) => look.look == CourseLook.faculty
                        ? Divider(height: 24, color: colors.line)
                        : const SizedBox(height: 12),
                    itemBuilder: (context, i) =>
                        _ListItem(course: state.items[i], colors: colors),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// How far, as the owner chose: a ring, or a bar with the share.
class _Progress extends StatelessWidget {
  const _Progress({
    required this.course,
    required this.colors,
    this.onPhoto = false,
    this.size = 46,
  });

  final MyCourse course;
  final CourseLookColors colors;
  final bool onPhoto;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final share = course.progress.percent / 100;
    final track = onPhoto ? Colors.white.withValues(alpha: 0.25) : colors.track;
    final text = onPhoto ? Colors.white : p.text;
    if (colors.look.myCourses.progress == MyCoursesProgress.rings) {
      return CourseProgressRing(
        value: share,
        color: colors.accent,
        track: track,
        size: size,
        stroke: size > 50 ? 5 : 4,
        textColor: text,
      );
    }
    return Row(
      children: [
        Expanded(
          child: CourseProgressBar(
            value: share,
            color: colors.accent,
            track: track,
          ),
        ),
        const SizedBox(width: 10),
        Text(
          '${course.progress.percent}%',
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w800,
            color: text,
          ),
        ),
      ],
    );
  }
}

/// Continue learning: the course in progress on its photo, its next lesson,
/// how far the student is and a button to go on.
class _Continue extends StatelessWidget {
  const _Continue({required this.course, required this.colors});

  final MyCourse course;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final next = course.nextItem;
    const white = Colors.white;
    final rings = colors.look.myCourses.progress == MyCoursesProgress.rings;
    void go() => next != null
        ? openCurriculumItem(context, next, courseId: course.course.id)
        : continueCourse(context, course);
    return Semantics(
      button: true,
      label: next != null
          ? l10n.continueCourseNextLabel(
              course.course.title,
              course.progress.percent,
              next.title,
            )
          : l10n.continueCourseLabel(
              course.course.title,
              course.progress.percent,
            ),
      excludeSemantics: true,
      child: GestureDetector(
        key: const ValueKey('studio-my-courses-continue'),
        onTap: go,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(
            colors.look.look == CourseLook.faculty ? 16 : 28,
          ),
          child: SizedBox(
            height: 220,
            child: Stack(
              fit: StackFit.expand,
              children: [
                AppNetworkImage(
                  url: course.course.imageUrl,
                  seed: course.course.id,
                ),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        colors.ink.withValues(alpha: 0.25),
                        colors.ink.withValues(alpha: 0.92),
                      ],
                    ),
                  ),
                ),
                PositionedDirectional(
                  top: 16,
                  start: 16,
                  child: CourseTag(
                    l10n.continueLearning,
                    background: colors.accent,
                    color: colors.onAccent,
                    icon: Symbols.play_arrow_rounded,
                  ),
                ),
                PositionedDirectional(
                  start: 18,
                  end: 18,
                  bottom: 18,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              course.course.title,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 21,
                                height: 1.2,
                                fontWeight: FontWeight.w800,
                                color: white,
                              ),
                            ),
                            if (next != null) ...[
                              const SizedBox(height: 6),
                              Text(
                                l10n.nextItem(next.title),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: white.withValues(alpha: 0.85),
                                ),
                              ),
                            ],
                            if (!rings) ...[
                              const SizedBox(height: 12),
                              _Progress(
                                course: course,
                                colors: colors,
                                onPhoto: true,
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 14),
                      if (rings)
                        CourseProgressRing(
                          value: course.progress.percent / 100,
                          color: colors.accent,
                          track: white.withValues(alpha: 0.25),
                          size: 62,
                          stroke: 5,
                          child: Icon(
                            Symbols.play_arrow_rounded,
                            fill: 1,
                            size: 30,
                            color: white,
                          ),
                        )
                      else
                        Container(
                          width: 52,
                          height: 52,
                          decoration: BoxDecoration(
                            color: colors.accent,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Symbols.play_arrow_rounded,
                            fill: 1,
                            size: 30,
                            color: colors.onAccent,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A completed course's certificate, opened; or that it is done.
class _Finished extends StatelessWidget {
  const _Finished({required this.course, required this.colors});

  final MyCourse course;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final url = course.certificateUrl;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          url != null
              ? Symbols.workspace_premium_rounded
              : Symbols.check_circle_rounded,
          size: 17,
          fill: 1,
          color: colors.accent,
        ),
        const SizedBox(width: 5),
        Flexible(
          child: url != null
              ? InkWell(
                  key: ValueKey(
                    'studio-my-course-certificate-${course.course.id}',
                  ),
                  onTap: () => openExternal(url),
                  child: Text(
                    l10n.viewCertificate,
                    style: TextStyle(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                      color: colors.accent,
                    ),
                  ),
                )
              : Text(
                  l10n.completed,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: colors.accent,
                  ),
                ),
        ),
      ],
    );
  }
}

class _GridItem extends StatelessWidget {
  const _GridItem({required this.course, required this.colors});

  final MyCourse course;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final progress = course.progress;
    final completed = progress.courseCompleted || progress.percent >= 100;
    return Material(
      color: colors.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(
          colors.look.look == CourseLook.faculty ? 14 : 24,
        ),
        side: BorderSide(color: colors.line),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('studio-my-course-${course.course.id}'),
        onTap: () => continueCourse(context, course),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    AppNetworkImage(
                      url: course.course.imageUrl,
                      seed: course.course.id,
                      radius: colors.look.look == CourseLook.faculty ? 8 : 18,
                    ),
                    if (colors.look.myCourses.progress ==
                        MyCoursesProgress.rings)
                      PositionedDirectional(
                        end: 8,
                        bottom: 8,
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            color: p.surface,
                            shape: BoxShape.circle,
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(3),
                            child: _Progress(
                              course: course,
                              colors: colors,
                              size: 44,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              Text(
                course.course.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 14,
                  height: 1.3,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 4),
              if (completed)
                _Finished(course: course, colors: colors)
              else
                Text(
                  l10n.lessonsDoneOf(
                    progress.completedItems,
                    progress.totalItems,
                  ),
                  style: TextStyle(fontSize: 11.5, color: p.textSecondary),
                ),
              if (colors.look.myCourses.progress == MyCoursesProgress.bars &&
                  !completed) ...[
                const SizedBox(height: 8),
                _Progress(course: course, colors: colors),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ListItem extends StatelessWidget {
  const _ListItem({required this.course, required this.colors});

  final MyCourse course;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final progress = course.progress;
    final completed = progress.courseCompleted || progress.percent >= 100;
    final faculty = colors.look.look == CourseLook.faculty;
    final rings = colors.look.myCourses.progress == MyCoursesProgress.rings;
    final teacher = course.course.instructor?.name;
    final body = Row(
      children: [
        AppNetworkImage(
          url: course.course.imageUrl,
          seed: course.course.id,
          width: faculty ? 84 : 92,
          height: faculty ? 84 : 92,
          radius: faculty ? 8 : 18,
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (teacher != null && teacher.trim().isNotEmpty)
                Text(
                  faculty ? teacher.toUpperCaseIn(context) : teacher,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: faculty ? 10.5 : 12,
                    letterSpacing: faculty ? 1.2 : 0,
                    fontWeight: FontWeight.w700,
                    color: faculty ? colors.accent : p.textSecondary,
                  ),
                ),
              const SizedBox(height: 3),
              Text(
                course.course.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 15.5,
                  height: 1.3,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 6),
              if (completed)
                _Finished(course: course, colors: colors)
              else ...[
                Text(
                  course.nextItem != null
                      ? l10n.nextItem(course.nextItem!.title)
                      : l10n.lessonsDoneOf(
                          progress.completedItems,
                          progress.totalItems,
                        ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: p.textSecondary),
                ),
                if (!rings) ...[
                  const SizedBox(height: 8),
                  _Progress(course: course, colors: colors),
                ],
              ],
            ],
          ),
        ),
        if (rings && !completed) ...[
          const SizedBox(width: 10),
          _Progress(course: course, colors: colors, size: 50),
        ],
      ],
    );
    return Material(
      color: faculty ? Colors.transparent : colors.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(faculty ? 0 : 22),
        side: faculty ? BorderSide.none : BorderSide(color: colors.line),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('studio-my-course-${course.course.id}'),
        onTap: () => continueCourse(context, course),
        child: Padding(padding: EdgeInsets.all(faculty ? 0 : 10), child: body),
      ),
    );
  }
}
