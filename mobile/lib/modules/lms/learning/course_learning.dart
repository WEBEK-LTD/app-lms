import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';

/// 113.7 On a course's page: the courses to finish before enrolling, and
/// for its students the leaderboard (when the academy has points and
/// badges) and their notes.

class CoursePrerequisites extends StatelessWidget {
  const CoursePrerequisites({super.key, required this.course});

  final CourseDetail course;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return AppCard(
      key: const ValueKey('course-prerequisites'),
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            l10n.prerequisitesTitle,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          if (!course.prerequisitesMet)
            Text(
              l10n.prerequisitesHint,
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
          const SizedBox(height: 4),
          for (final c in course.prerequisites)
            SettingsTile(
              key: ValueKey('prerequisite-${c.id}'),
              icon: c.completed ? AppIcons.checkCircle : AppIcons.lock,
              title: c.title,
              value: c.completed ? l10n.courseDoneLabel : null,
              onTap: () => context.push(Paths.course(c.id)),
            ),
        ],
      ),
    );
  }
}

class CourseLearningLinks extends ConsumerWidget {
  const CourseLearningLinks({super.key, required this.courseId});

  final int courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final features = ref.watch(appConfigProvider).features;
    final l10n = context.l10n;
    if (!features.gamification && !features.notes) {
      return const SizedBox.shrink();
    }
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: AppCard(
        child: Column(
          children: [
            if (features.gamification)
              SettingsTile(
                key: const ValueKey('course-leaderboard'),
                icon: AppIcons.leaderboard,
                title: l10n.leaderboardTitle,
                onTap: () => context.push(Paths.leaderboard(courseId)),
              ),
            if (features.gamification && features.notes)
              Divider(height: 1, color: context.palette.divider),
            if (features.notes)
              SettingsTile(
                key: const ValueKey('course-notes'),
                icon: AppIcons.notes,
                title: l10n.myNotes,
                onTap: () => context.push(Paths.courseNotes(courseId)),
              ),
          ],
        ),
      ),
    );
  }
}
