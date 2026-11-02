import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/symbol_names.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../shared/account/account_scaffold.dart';
import '../courses/community_widgets.dart' show showTextSheet;
import '../courses/course_questions.dart' show QuestionCard;
import '../data/lms_providers.dart';
import 'learning_providers.dart';
import 'lesson_tools.dart' show NoteTile;

/// 113.7 More of a real LMS in the app: the academy's learning paths and
/// one path with the student's progress, the student's points and badges,
/// a course's leaderboard (the course's or the cohort's, first names and an
/// initial only), the student's notes and bookmarks in a course, and a
/// lesson's discussion.

const _skeleton = SkeletonList(
  layout: SkeletonLayout.text,
  count: 3,
  padding: EdgeInsets.zero,
);

class LearningPathsScreen extends ConsumerWidget {
  const LearningPathsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return AccountScaffold(
      title: l10n.learningPaths,
      child: switch (ref.watch(learningPathsProvider)) {
        AsyncData(:final value) when value.isEmpty => MessageView(
          icon: AppIcons.route,
          title: l10n.noLearningPaths,
          compact: true,
        ),
        AsyncData(:final value) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final path in value) ...[
              _PathCard(
                path: path,
                onTap: () => context.push(Paths.learningPath(path.id)),
              ),
              const SizedBox(height: 12),
            ],
          ],
        ),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(learningPathsProvider),
        ),
        _ => _skeleton,
      },
    );
  }
}

class _PathCard extends StatelessWidget {
  const _PathCard({required this.path, this.onTap});

  final LearningPath path;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AppCard(
      key: ValueKey('path-${path.id}'),
      padding: const EdgeInsets.all(16),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppIcon(AppIcons.route, size: 20, color: p.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  path.title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
            ],
          ),
          if (path.description.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              path.description,
              maxLines: onTap == null ? null : 2,
              overflow: onTap == null ? null : TextOverflow.ellipsis,
              style: TextStyle(fontSize: 14, color: p.textBody),
            ),
          ],
          const SizedBox(height: 12),
          ProgressTrack(percent: path.percent),
          const SizedBox(height: 6),
          Text(
            context.l10n.pathProgress(path.completedCount, path.courses.length),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}

class LearningPathScreen extends ConsumerWidget {
  const LearningPathScreen({super.key, required this.pathId});

  final int pathId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(learningPathProvider(pathId));
    final p = context.palette;
    return AccountScaffold(
      title: state.value?.title ?? l10n.learningPaths,
      child: switch (state) {
        AsyncData(:final value) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _PathCard(path: value),
            if (value.inOrder) ...[
              const SizedBox(height: 10),
              Text(
                l10n.pathInOrder,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            ],
            const SizedBox(height: 14),
            for (final (i, item) in value.courses.indexed) ...[
              _PathCourseTile(index: i + 1, item: item),
              const SizedBox(height: 10),
            ],
          ],
        ),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(learningPathProvider(pathId)),
        ),
        _ => _skeleton,
      },
    );
  }
}

class _PathCourseTile extends StatelessWidget {
  const _PathCourseTile({required this.index, required this.item});

  final int index;
  final PathCourse item;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final status = item.completed
        ? l10n.courseDoneLabel
        : item.locked
        ? l10n.pathLocked
        : item.course.enrolled
        ? '${item.percent}%'
        : null;
    return AppCard(
      key: ValueKey('path-course-${item.course.id}'),
      padding: const EdgeInsets.all(14),
      onTap: () => context.push(Paths.course(item.course.id)),
      child: Row(
        children: [
          CircleAvatar(
            radius: 16,
            backgroundColor: item.completed ? p.success : p.surfaceMuted,
            child: item.completed
                ? AppIcon(AppIcons.check, size: 18, color: p.onPrimary)
                : item.locked
                ? AppIcon(AppIcons.lock, size: 16, color: p.textSecondary)
                : Text(
                    '$index',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.course.title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: item.locked ? p.textSecondary : p.text,
                  ),
                ),
                if (status != null)
                  Text(
                    status,
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                if (item.course.enrolled && !item.completed) ...[
                  const SizedBox(height: 6),
                  ProgressTrack(percent: item.percent, height: 4),
                ],
              ],
            ),
          ),
          AppIcon(AppIcons.forward, size: 20, color: p.textSecondary),
        ],
      ),
    );
  }
}

/// The badge's name in the app's language.
String badgeName(AppLocalizations l10n, BadgeKind kind) => switch (kind) {
  BadgeKind.firstLesson => l10n.badgeFirstLesson,
  BadgeKind.firstQuiz => l10n.badgeFirstQuiz,
  BadgeKind.perfectQuiz => l10n.badgePerfectQuiz,
  BadgeKind.firstAssignment => l10n.badgeFirstAssignment,
  BadgeKind.streak7 => l10n.badgeStreak7,
  BadgeKind.courseCompleted => l10n.badgeCourseCompleted,
  BadgeKind.pathCompleted => l10n.badgePathCompleted,
  BadgeKind.points500 => l10n.badgePoints500,
  BadgeKind.unknown => '',
};

class AchievementsScreen extends ConsumerWidget {
  const AchievementsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    return AccountScaffold(
      title: l10n.achievementsTitle,
      child: switch (ref.watch(achievementsProvider)) {
        AsyncData(:final value) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AppCard(
              padding: const EdgeInsets.all(18),
              child: Row(
                children: [
                  AppIcon(
                    AppIcons.leaderboard,
                    size: 34,
                    color: p.primary,
                    filled: true,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          l10n.pointsCount(value.points),
                          key: const ValueKey('achievements-points'),
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            AppIcon(
                              AppIcons.streak,
                              size: 16,
                              color: p.textSecondary,
                            ),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                '${l10n.streakDays(value.streakDays)} · ${l10n.bestStreak(value.bestStreak)}',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: p.textSecondary,
                                ),
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
            const SizedBox(height: 18),
            SectionHeader(title: l10n.badgesTitle, size: 16),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [for (final b in value.badges) _BadgeTile(badge: b)],
            ),
            if (value.courses.isNotEmpty) ...[
              const SizedBox(height: 18),
              SectionHeader(title: l10n.leaderboardTitle, size: 16),
              const SizedBox(height: 8),
              AppCard(
                child: Column(
                  children: [
                    for (final (i, c) in value.courses.indexed) ...[
                      if (i > 0) Divider(height: 1, color: p.divider),
                      SettingsTile(
                        key: ValueKey('achievements-course-${c.courseId}'),
                        icon: AppIcons.leaderboard,
                        title: c.title,
                        value: l10n.pointsCount(c.points),
                        onTap: () =>
                            context.push(Paths.leaderboard(c.courseId)),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(achievementsProvider),
        ),
        _ => _skeleton,
      },
    );
  }
}

class _BadgeTile extends StatelessWidget {
  const _BadgeTile({required this.badge});

  final EarnedBadge badge;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final name = badgeName(l10n, badge.kind);
    return SizedBox(
      width: 104,
      child: Semantics(
        label: badge.earned ? name : '$name, ${l10n.badgeNotYet}',
        excludeSemantics: true,
        child: Opacity(
          key: ValueKey(
            'badge-${badge.kind.name}-${badge.earned ? 'earned' : 'not-yet'}',
          ),
          opacity: badge.earned ? 1 : 0.45,
          child: Column(
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: badge.earned ? p.primary : p.surfaceMuted,
                child: AppIcon(
                  symbolByName(badge.icon),
                  size: 28,
                  color: badge.earned ? p.onPrimary : p.textSecondary,
                  filled: badge.earned,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                name,
                textAlign: TextAlign.center,
                maxLines: 2,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: p.text,
                ),
              ),
              Text(
                badge.earned
                    ? (badge.earnedAt == null ? '' : shortDate(badge.earnedAt!))
                    : l10n.badgeNotYet,
                style: TextStyle(fontSize: 11, color: p.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class LeaderboardScreen extends ConsumerStatefulWidget {
  const LeaderboardScreen({super.key, required this.courseId});

  final int courseId;

  @override
  ConsumerState<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends ConsumerState<LeaderboardScreen> {
  bool _cohort = false;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final key = (courseId: widget.courseId, cohort: _cohort);
    final hasCohort =
        ref.watch(courseDetailProvider(widget.courseId)).value?.cohort != null;
    return AccountScaffold(
      title: l10n.leaderboardTitle,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (hasCohort) ...[
            SegmentedTabs(
              labels: [l10n.leaderboardCourse, l10n.leaderboardCohort],
              selected: _cohort ? 1 : 0,
              onChanged: (i) => setState(() => _cohort = i == 1),
            ),
            const SizedBox(height: 12),
          ],
          switch (ref.watch(leaderboardProvider(key))) {
            AsyncData(:final value) when value.items.isEmpty => MessageView(
              icon: AppIcons.leaderboard,
              title: l10n.leaderboardEmpty,
              compact: true,
            ),
            AsyncData(:final value) => Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (value.myRank != null)
                  Text(
                    l10n.leaderboardRank(value.myRank!, value.totalStudents),
                    key: const ValueKey('leaderboard-rank'),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                const SizedBox(height: 10),
                AppCard(
                  child: Column(
                    children: [
                      for (final (i, row) in value.items.indexed) ...[
                        if (i > 0) Divider(height: 1, color: p.divider),
                        _LeaderTile(row: row),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  l10n.leaderboardPrivacy,
                  style: TextStyle(fontSize: 12, color: p.textSecondary),
                ),
              ],
            ),
            AsyncError(:final error) => ErrorView(
              error: error,
              onRetry: () => ref.invalidate(leaderboardProvider(key)),
            ),
            _ => _skeleton,
          },
        ],
      ),
    );
  }
}

class _LeaderTile extends StatelessWidget {
  const _LeaderTile({required this.row});

  final LeaderRow row;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Container(
      key: ValueKey('leader-${row.rank}-${row.me ? 'me' : row.name}'),
      color: row.me ? p.accentSoft : null,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          SizedBox(
            width: 32,
            child: Text(
              '${row.rank}',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: row.rank <= 3 ? p.primary : p.textSecondary,
              ),
            ),
          ),
          Expanded(
            child: Text(
              row.me ? '${row.name} (${l10n.leaderboardYou})' : row.name,
              style: TextStyle(
                fontSize: 15,
                fontWeight: row.me ? FontWeight.w700 : FontWeight.w500,
                color: p.text,
              ),
            ),
          ),
          Text(
            l10n.pointsCount(row.points),
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
        ],
      ),
    );
  }
}

class CourseNotesScreen extends ConsumerWidget {
  const CourseNotesScreen({super.key, required this.courseId});

  final int courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    return AccountScaffold(
      title: l10n.myNotes,
      child: switch (ref.watch(courseNotesProvider(courseId))) {
        AsyncData(:final value)
            when value.items.isEmpty && value.bookmarks.isEmpty =>
          MessageView(
            icon: AppIcons.notes,
            title: l10n.noNotes,
            message: l10n.notesPrivate,
            compact: true,
          ),
        AsyncData(:final value) => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (value.bookmarks.isNotEmpty) ...[
              SectionHeader(title: l10n.bookmarksTitle, size: 16),
              const SizedBox(height: 8),
              AppCard(
                child: Column(
                  children: [
                    for (final (i, b) in value.bookmarks.indexed) ...[
                      if (i > 0) Divider(height: 1, color: p.divider),
                      SettingsTile(
                        key: ValueKey('bookmark-${b.lessonId}'),
                        icon: AppIcons.bookmark,
                        title: b.title,
                        onTap: () => context.push(Paths.lesson(b.lessonId)),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 18),
            ],
            if (value.items.isNotEmpty) ...[
              SectionHeader(title: l10n.notesTitle, size: 16),
              const SizedBox(height: 8),
              for (final note in value.items)
                NoteTile(
                  note: note,
                  showLesson: true,
                  onTap: () => context.push(Paths.lesson(note.lessonId)),
                ),
            ],
            Text(
              l10n.notesPrivate,
              style: TextStyle(fontSize: 12, color: p.textSecondary),
            ),
          ],
        ),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(courseNotesProvider(courseId)),
        ),
        _ => _skeleton,
      },
    );
  }
}

class LessonDiscussionScreen extends ConsumerWidget {
  const LessonDiscussionScreen({super.key, required this.lessonId});

  final int lessonId;

  Future<void> _ask(BuildContext context, WidgetRef ref, Lesson lesson) =>
      showTextSheet(
        context,
        title: context.l10n.askAboutLesson,
        hint: context.l10n.askQuestionHint,
        sendLabel: context.l10n.sendQuestion,
        onSend: (text) async {
          try {
            final question = await ref
                .read(yallappApiProvider)
                .askQuestion(lesson.courseId, text, lessonId: lesson.id);
            ref
              ..invalidate(
                lessonDiscussionProvider((
                  courseId: lesson.courseId,
                  lessonId: lesson.id,
                )),
              )
              ..invalidate(courseQuestionsProvider(lesson.courseId))
              ..invalidate(lessonProvider(lesson.id));
            if (context.mounted) context.push(Paths.question(question.id));
            return true;
          } on ApiException catch (e) {
            if (context.mounted) showMessage(context, e.message);
            return false;
          }
        },
      );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final lesson = ref.watch(lessonProvider(lessonId));
    return AccountScaffold(
      title: l10n.lessonDiscussion,
      child: switch (lesson) {
        AsyncData(value: final lesson) => _Discussion(
          lesson: lesson,
          onAsk: () => _ask(context, ref, lesson),
        ),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(lessonProvider(lessonId)),
        ),
        _ => _skeleton,
      },
    );
  }
}

class _Discussion extends ConsumerWidget {
  const _Discussion({required this.lesson, required this.onAsk});

  final Lesson lesson;
  final VoidCallback onAsk;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final key = (courseId: lesson.courseId, lessonId: lesson.id);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          lesson.title,
          style: TextStyle(fontSize: 13, color: p.textSecondary),
        ),
        const SizedBox(height: 10),
        SecondaryButton(
          key: const ValueKey('discussion-ask'),
          label: l10n.askAboutLesson,
          icon: AppIcons.chat,
          height: 50,
          onPressed: onAsk,
        ),
        const SizedBox(height: 12),
        switch (ref.watch(lessonDiscussionProvider(key))) {
          AsyncData(:final value) when value.isEmpty => MessageView(
            icon: AppIcons.discussion,
            title: l10n.discussionCount(0),
            compact: true,
          ),
          AsyncData(:final value) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final q in value) ...[
                QuestionCard(
                  question: q,
                  showLesson: false,
                  onTap: () => context.push(Paths.question(q.id)),
                ),
                const SizedBox(height: 10),
              ],
            ],
          ),
          AsyncError(:final error) => ErrorView(
            error: error,
            onRetry: () => ref.invalidate(lessonDiscussionProvider(key)),
          ),
          _ => _skeleton,
        },
      ],
    );
  }
}
