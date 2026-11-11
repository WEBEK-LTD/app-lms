import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart' show MyCoursesStatus;
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/lms_providers.dart';
import '../home/learning_cards.dart';
import '../learning/learning_providers.dart';
import '../navigation.dart';

/// 123 The premium academy's My courses (`Config.screens.looks`
/// `my_courses: premium`), as the approved board has it: the tab's name as
/// a large title, this week's learning on a dark card, the lists as chips
/// with how many each has, the courses in a grid with a ring for how far
/// the student is, and their certificates on a gold tile.

/// The tab's own name for My courses, else the app's words.
String myCoursesTitle(WidgetRef ref, BuildContext context) {
  for (final tab in ref.watch(navigationProvider)?.tabs ?? const <NavTab>[]) {
    if (tab.target.type == PageActionType.screen &&
        tab.target.screen == BuiltInScreen.myCourses) {
      return tab.label;
    }
  }
  return context.l10n.tabMyCourses;
}

class PremiumMyCourses extends ConsumerWidget {
  const PremiumMyCourses({
    super.key,
    required this.labels,
    required this.selected,
    required this.onSelected,
    required this.wishlist,
  });

  final List<String> labels;
  final int selected;
  final ValueChanged<int> onSelected;

  /// The wishlist's own list, for its chip.
  final Widget wishlist;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final week = ref.watch(learningTimeProvider).value;
    final going = ref.watch(myCoursesProvider(MyCoursesStatus.inProgress));
    final done = ref.watch(myCoursesProvider(MyCoursesStatus.completed));
    final counts = [going.total, done.total];
    final status = selected == 0
        ? MyCoursesStatus.inProgress
        : MyCoursesStatus.completed;
    final state = selected == 0 ? going : done;
    final certificates = ref.watch(certificatesProvider).value?.length ?? 0;
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: () async {
            ref
              ..invalidate(learningTimeProvider)
              ..invalidate(certificatesProvider);
            await ref.read(myCoursesProvider(status).notifier).refresh();
          },
          child: CustomScrollView(
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(18, 14, 18, 14),
                sliver: SliverList.list(
                  children: [
                    Semantics(
                      header: true,
                      child: Text(
                        myCoursesTitle(ref, context),
                        key: const ValueKey('my-courses-title'),
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ),
                    if (week != null) ...[
                      const SizedBox(height: 14),
                      // In ink by day, in cream by night, as approved.
                      DecoratedBox(
                        decoration: BoxDecoration(
                          color: dark
                              ? const Color(0xFFF3F1EC)
                              : const Color(0xFF15131A),
                          borderRadius: BorderRadius.circular(26),
                        ),
                        child: LearningWeek(
                          time: week,
                          color: dark ? const Color(0xFF15131A) : Colors.white,
                          title: null,
                        ),
                      ),
                    ],
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 36,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: labels.length,
                        separatorBuilder: (_, _) => const SizedBox(width: 8),
                        itemBuilder: (context, i) {
                          final on = i == selected;
                          final count = i < counts.length ? counts[i] : 0;
                          return Semantics(
                            button: true,
                            selected: on,
                            child: InkWell(
                              key: ValueKey('my-courses-chip-$i'),
                              borderRadius: BorderRadius.circular(999),
                              onTap: () => onSelected(i),
                              child: Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                ),
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: on
                                      ? p.text
                                      : p.text.withValues(alpha: 0.06),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  count > 0 ? '${labels[i]} $count' : labels[i],
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w700,
                                    color: on ? p.surface : p.text,
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
              if (selected >= 2)
                SliverFillRemaining(child: wishlist)
              else if (state.isInitialLoading)
                const SliverToBoxAdapter(child: SkeletonList(count: 4))
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(18, 0, 18, 110),
                  sliver: SliverGrid.count(
                    crossAxisCount: 2,
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 0.82,
                    children: [
                      for (final c in state.items) _GridCourse(course: c),
                      if (certificates > 0)
                        _CertificatesTile(count: certificates),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A course in the grid: its picture, its name, the lessons done of all,
/// and a ring for how far the student is.
class _GridCourse extends StatelessWidget {
  const _GridCourse({required this.course});

  final MyCourse course;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final progress = course.progress;
    final gold = Theme.of(context).colorScheme.secondary;
    return Material(
      color: p.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(22),
        side: BorderSide(color: p.divider),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: ValueKey('my-course-${course.course.id}'),
        onTap: () => continueCourse(context, course),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: AppNetworkImage(
                  url: course.course.imageUrl,
                  seed: course.course.id,
                  radius: 16,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          course.course.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            height: 1.3,
                            color: p.text,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          l10n.lessonsDoneOf(
                            progress.completedItems,
                            progress.totalItems,
                          ),
                          style: TextStyle(
                            fontSize: 11.5,
                            color: p.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  SizedBox(
                    width: 42,
                    height: 42,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        CircularProgressIndicator(
                          value: progress.percent / 100,
                          strokeWidth: 4,
                          backgroundColor: p.divider,
                          color: gold,
                        ),
                        Text(
                          '${progress.percent}%',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: p.text,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The student's certificates on a gold tile, opening them.
class _CertificatesTile extends StatelessWidget {
  const _CertificatesTile({required this.count});

  final int count;

  @override
  Widget build(BuildContext context) {
    final gold = Theme.of(context).colorScheme.secondary;
    final l10n = context.l10n;
    return Material(
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      child: Ink(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color.lerp(gold, Colors.white, 0.45)!, gold],
          ),
        ),
        child: InkWell(
          key: const ValueKey('my-courses-certificates'),
          onTap: () => context.push(Paths.certificates),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Symbols.workspace_premium_rounded,
                  fill: 1,
                  size: 30,
                  color: Color(0xFF2A1D05),
                ),
                const Spacer(),
                Text(
                  l10n.certificatesCount(count),
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF2A1D05),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  l10n.certificatesReady,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xB32A1D05),
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
