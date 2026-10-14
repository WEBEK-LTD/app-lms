import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/lms_providers.dart';
import '../../../core/data/paged_controller.dart';
import '../navigation.dart';
import '../widgets/course_cards.dart';
import '../../../core/l10n/l10n.dart';

enum MyCoursesTab { inProgress, completed, wishlist }

MyCoursesTab myCoursesTabFrom(String? value) => switch (value) {
  'completed' => MyCoursesTab.completed,
  'wishlist' => MyCoursesTab.wishlist,
  _ => MyCoursesTab.inProgress,
};

/// Enrolled courses in progress, completed (with certificates) and the
/// wishlist (design: MyCourses).
class MyCoursesScreen extends ConsumerStatefulWidget {
  const MyCoursesScreen({super.key, this.initialTab = MyCoursesTab.inProgress});

  final MyCoursesTab initialTab;

  @override
  ConsumerState<MyCoursesScreen> createState() => _MyCoursesScreenState();
}

class _MyCoursesScreenState extends ConsumerState<MyCoursesScreen> {
  late MyCoursesTab _tab = widget.initialTab;

  @override
  void didUpdateWidget(MyCoursesScreen old) {
    super.didUpdateWidget(old);
    if (old.initialTab != widget.initialTab) _tab = widget.initialTab;
  }

  @override
  Widget build(BuildContext context) {
    final wishlist = ref.watch(appConfigProvider).features.wishlist;
    final tabs = [
      MyCoursesTab.inProgress,
      MyCoursesTab.completed,
      if (wishlist) MyCoursesTab.wishlist,
    ];
    final selected = tabs.contains(_tab) ? _tab : MyCoursesTab.inProgress;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Semantics(
                    header: true,
                    child: Text(
                      context.l10n.tabMyCourses,
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SegmentedTabs(
                    labels: [
                      for (final t in tabs)
                        switch (t) {
                          MyCoursesTab.inProgress => context.l10n.inProgress,
                          MyCoursesTab.completed => context.l10n.completed,
                          MyCoursesTab.wishlist => context.l10n.wishlist,
                        },
                    ],
                    selected: tabs.indexOf(selected),
                    onChanged: (i) => setState(() => _tab = tabs[i]),
                  ),
                ],
              ),
            ),
            Expanded(
              child: switch (selected) {
                MyCoursesTab.inProgress => const _EnrolledList(
                  status: MyCoursesStatus.inProgress,
                ),
                MyCoursesTab.completed => const _EnrolledList(
                  status: MyCoursesStatus.completed,
                ),
                MyCoursesTab.wishlist => const _WishlistList(),
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _EnrolledList extends ConsumerWidget {
  const _EnrolledList({required this.status});

  final MyCoursesStatus status;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final PagedState<MyCourse> state = ref.watch(myCoursesProvider(status));
    final notifier = ref.read(myCoursesProvider(status).notifier);
    if (state.isInitialLoading) return const SkeletonList(count: 4);
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: notifier.retry);
    }
    if (state.items.isEmpty) {
      final inProgress = status == MyCoursesStatus.inProgress;
      return RefreshIndicator(
        onRefresh: notifier.refresh,
        child: ListView(
          children: [
            const SizedBox(height: 40),
            MessageView(
              icon: inProgress ? AppIcons.myCourses : AppIcons.certificate,
              title: inProgress
                  ? context.l10n.noCoursesInProgress
                  : context.l10n.noCompletedCourses,
              message: inProgress
                  ? context.l10n.noCoursesInProgressMessage
                  : context.l10n.noCompletedCoursesMessage,
              actionLabel: inProgress ? context.l10n.browseCourses : null,
              onAction: inProgress ? () => context.go(Paths.courses) : null,
            ),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: notifier.refresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.extentAfter < 400) notifier.loadMore();
          return false;
        },
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          itemCount: state.items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, i) {
            final course = state.items[i];
            return status == MyCoursesStatus.completed
                ? _CompletedCard(course: course)
                : _InProgressCard(course: course);
          },
        ),
      ),
    );
  }
}

class _InProgressCard extends StatelessWidget {
  const _InProgressCard({required this.course});

  final MyCourse course;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final next = course.nextItem?.title;
    final percent = course.progress.percent;
    return AppCard(
      padding: const EdgeInsets.all(14),
      semanticLabel: next == null
          ? context.l10n.courseProgressLabel(course.course.title, percent)
          : context.l10n.courseProgressNextLabel(
              course.course.title,
              percent,
              next,
            ),
      onTap: () => continueCourse(context, course),
      child: ExcludeSemantics(
        child: Column(
          children: [
            Row(
              children: [
                AppNetworkImage(
                  url: course.course.imageUrl,
                  seed: course.course.id,
                  width: 64,
                  height: 64,
                  radius: 12,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        course.course.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          height: 1.4,
                          color: p.text,
                        ),
                      ),
                      if (next != null) ...[
                        const SizedBox(height: 4),
                        Text(
                          context.l10n.nextItem(next),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: p.textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: ProgressTrack(percent: percent)),
                const SizedBox(width: 10),
                Text(
                  '$percent%',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: p.textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CompletedCard extends StatelessWidget {
  const _CompletedCard({required this.course});

  final MyCourse course;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final certificate = course.certificateUrl;
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => openCourse(context, course.course.id),
            child: Row(
              children: [
                AppNetworkImage(
                  url: course.course.imageUrl,
                  seed: course.course.id,
                  width: 64,
                  height: 64,
                  radius: 12,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        course.course.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          height: 1.4,
                          color: p.text,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          AppIcon(AppIcons.check, size: 14, color: p.success),
                          const SizedBox(width: 4),
                          Text(
                            context.l10n.completed,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: p.success,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (certificate != null) ...[
            const SizedBox(height: 12),
            Material(
              color: p.accentSoft,
              borderRadius: BorderRadius.circular(12),
              child: InkWell(
                borderRadius: BorderRadius.circular(12),
                onTap: () => openExternal(certificate),
                child: SizedBox(
                  height: 44,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      AppIcon(AppIcons.certificate, size: 18, color: p.text),
                      const SizedBox(width: 6),
                      Text(
                        context.l10n.certificate,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: p.text,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _WishlistList extends ConsumerWidget {
  const _WishlistList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return switch (ref.watch(wishlistProvider)) {
      AsyncData(:final value) when value.isEmpty => MessageView(
        icon: AppIcons.favorite,
        title: context.l10n.wishlistEmptyTitle,
        message: context.l10n.wishlistEmptyMessage,
        actionLabel: context.l10n.browseCourses,
        onAction: () => context.go(Paths.courses),
      ),
      AsyncData(:final value) => RefreshIndicator(
        onRefresh: () => ref.refresh(wishlistProvider.future),
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          itemCount: value.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, i) => CourseListCard(
            course: value[i],
            onTap: () => openCourse(context, value[i].id),
          ),
        ),
      ),
      AsyncError(:final error) => ErrorView(
        error: error,
        onRetry: () => ref.invalidate(wishlistProvider),
      ),
      _ => const SkeletonList(count: 4),
    };
  }
}
