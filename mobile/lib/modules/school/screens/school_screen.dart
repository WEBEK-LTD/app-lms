import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart'
    show SignInPrompt, TabHeader;
import '../data/school_providers.dart';
import '../widgets/school_widgets.dart';
import 'checkin_screens.dart';
import 'messages_screen.dart' show SchoolMessagesTile;

/// 105.4 The School tab, for a student and their parents: today's lessons
/// and each part of the school (a parent with several children picks one
/// first).
class SchoolScreen extends ConsumerWidget {
  const SchoolScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.tabSchool),
            Expanded(
              child: signedIn
                  ? StudentGate(
                      builder: (context, me, student) => _Overview(
                        student: student,
                        me: me,
                        parent: me.roles.contains(SchoolRole.parent),
                      ),
                    )
                  : SignInPrompt(
                      icon: AppIcons.school,
                      title: l10n.schoolSignInTitle,
                      message: l10n.schoolSignInMessage,
                      from: Paths.school,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Overview extends ConsumerWidget {
  const _Overview({
    required this.student,
    required this.me,
    this.parent = false,
  });

  final SchoolStudent student;
  final SchoolMe me;

  /// 113.5 Seen by a parent: the teachers' reports the school shared.
  final bool parent;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final id = student.id;
    final fees = ref.watch(studentFeesProvider(id)).value;
    void open(String part) => context.push(Paths.schoolPart(part, student: id));
    return RefreshIndicator(
      onRefresh: () async {
        ref
          ..invalidate(studentTimetableProvider(id))
          ..invalidate(studentFeesProvider(id))
          ..invalidate(checkinTodayProvider);
      },
      child: ListView(
        key: const ValueKey('school-overview'),
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        children: [
          AppCard(
            key: const ValueKey('school-student'),
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                InitialsAvatar(
                  name: student.name,
                  imageUrl: student.photoUrl,
                  size: 44,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        student.name,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                      if (student.className != null)
                        Text(
                          student.className!,
                          style: TextStyle(
                            fontSize: 13,
                            color: p.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // 113.2 A student checks in and out; a parent follows it on the attendance.
          if (me.isStudent && student.id == me.students.first.id)
            const CheckinCard(),
          SectionHeader(
            title: l10n.schoolToday,
            onSeeAll: () => open('timetable'),
          ),
          const SizedBox(height: 4),
          _Today(studentId: id),
          const SizedBox(height: 20),
          SettingsGroup(
            title: l10n.schoolEverything,
            children: [
              SettingsTile(
                key: const ValueKey('school-homework'),
                icon: AppIcons.assignment,
                title: l10n.schoolHomework,
                onTap: () => open('homework'),
              ),
              SettingsTile(
                key: const ValueKey('school-grades'),
                icon: AppIcons.certificate,
                title: l10n.schoolGrades,
                onTap: () => open('grades'),
              ),
              SettingsTile(
                key: const ValueKey('school-attendance'),
                icon: AppIcons.attendance,
                title: l10n.schoolAttendance,
                onTap: () => open('attendance'),
              ),
              SettingsTile(
                key: const ValueKey('school-timetable'),
                icon: AppIcons.calendar,
                title: l10n.schoolTimetable,
                onTap: () => open('timetable'),
              ),
              SettingsTile(
                key: const ValueKey('school-fees'),
                icon: AppIcons.cash,
                title: l10n.schoolFees,
                subtitle: fees == null ? null : l10n.feesDue(fees.dueFormatted),
                onTap: () => open('fees'),
              ),
              if (parent)
                SettingsTile(
                  key: const ValueKey('school-reports'),
                  icon: AppIcons.assignment,
                  title: l10n.schoolReports,
                  onTap: () => open('reports'),
                ),
              SettingsTile(
                key: const ValueKey('school-news'),
                icon: AppIcons.campaignUpdate,
                title: l10n.schoolNews,
                onTap: () => open('news'),
              ),
              // 113.6 Messages with the teachers (moves with 113.4's Parent tab).
              const SchoolMessagesTile(teacher: false),
            ],
          ),
        ],
      ),
    );
  }
}

/// Today's lessons, from the week's timetable.
class _Today extends ConsumerWidget {
  const _Today({required this.studentId});

  final int studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    return switch (ref.watch(studentTimetableProvider(studentId))) {
      AsyncValue(value: final week?) => switch (week.on(
        DateTime.now().weekday,
      )) {
        final lessons when lessons.isEmpty => Text(
          context.l10n.schoolNoLessonsToday,
          key: const ValueKey('school-no-lessons'),
          style: TextStyle(fontSize: 14, color: p.textSecondary),
        ),
        final lessons => AppCard(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          child: Column(
            children: [for (final lesson in lessons) LessonRow(lesson: lesson)],
          ),
        ),
      },
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(studentTimetableProvider(studentId)),
      ),
      _ => const SizedBox(height: 60),
    };
  }
}
