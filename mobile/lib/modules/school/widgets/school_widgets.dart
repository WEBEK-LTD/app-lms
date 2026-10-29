import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/school_providers.dart';

/// 105.4 What the school's screens share.

/// Loads who the person is at the school and shows [builder] for the
/// student they look at: a parent with several children picks one above it.
/// Someone the school didn't add is told to ask the school.
class StudentGate extends ConsumerWidget {
  const StudentGate({super.key, required this.builder, this.wanted});

  final Widget Function(
    BuildContext context,
    SchoolMe me,
    SchoolStudent student,
  )
  builder;

  /// The student a notification is about.
  final int? wanted;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return switch (ref.watch(schoolMeProvider)) {
      AsyncValue(value: final me?) => switch (studentOf(
        me,
        ref.watch(chosenStudentProvider),
        wanted: wanted,
      )) {
        final student? => Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (me.students.length > 1)
              StudentSwitcher(students: me.students, selected: student.id),
            Expanded(child: builder(context, me, student)),
          ],
        ),
        null => MessageView(
          icon: AppIcons.school,
          title: l10n.schoolNoStudents,
          message: l10n.schoolNoStudentsMessage,
        ),
      },
      AsyncValue(error: final ApiException e)
          when e.code == 'not_school_member' =>
        MessageView(
          icon: AppIcons.school,
          title: l10n.schoolNotMemberTitle,
          message: l10n.schoolNotMemberMessage,
        ),
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(schoolMeProvider),
      ),
      _ => const LoadingView(),
    };
  }
}

/// A parent's children, to choose whose school to see.
class StudentSwitcher extends ConsumerWidget {
  const StudentSwitcher({
    super.key,
    required this.students,
    required this.selected,
  });

  final List<SchoolStudent> students;
  final int selected;

  @override
  Widget build(BuildContext context, WidgetRef ref) => SizedBox(
    height: 52,
    child: ListView.separated(
      key: const ValueKey('student-switcher'),
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
      itemCount: students.length,
      separatorBuilder: (_, _) => const SizedBox(width: 8),
      itemBuilder: (context, i) => PillChip(
        key: ValueKey('student-${students[i].id}'),
        label: students[i].name,
        selected: students[i].id == selected,
        onTap: () =>
            ref.read(chosenStudentProvider.notifier).choose(students[i].id),
      ),
    ),
  );
}

/// A page of a paged list: loading, its problem, nothing yet, or the items
/// (more load near the end).
class PagedItems<T> extends StatelessWidget {
  const PagedItems({
    super.key,
    required this.state,
    required this.controller,
    required this.empty,
    required this.item,
    this.header,
  });

  final PagedState<T> state;
  final PagedController<T> controller;
  final Widget empty;
  final Widget Function(BuildContext context, T item) item;

  /// Shown above the items, also when there are none.
  final Widget? header;

  @override
  Widget build(BuildContext context) {
    if (state.isInitialLoading) {
      return const SkeletonList(layout: SkeletonLayout.text);
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: controller.retry);
    }
    return RefreshIndicator(
      onRefresh: controller.refresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.extentAfter < 300 && state.hasMore) {
            controller.loadMore();
          }
          return false;
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          children: [
            ?header,
            if (state.items.isEmpty)
              Padding(padding: const EdgeInsets.only(top: 24), child: empty)
            else
              for (final entry in state.items) ...[
                item(context, entry),
                const SizedBox(height: 10),
              ],
          ],
        ),
      ),
    );
  }
}

/// A small coloured label (a mark, a status), like a course's stage.
class SchoolPill extends StatelessWidget {
  const SchoolPill({
    super.key,
    required this.label,
    this.tone = PillTone.neutral,
  });

  final String label;
  final PillTone tone;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final (bg, fg) = switch (tone) {
      PillTone.good => (p.successSoft, p.success),
      PillTone.bad => (p.surfaceMuted, p.danger),
      PillTone.warn => (p.accentSoft, p.text),
      PillTone.neutral => (p.primarySoft, p.onPrimarySoft),
    };
    return DecoratedBox(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: fg,
          ),
        ),
      ),
    );
  }
}

enum PillTone { good, bad, warn, neutral }

/// An attendance mark's words and tone.
(String, PillTone) attendanceLabel(AppLocalizations l10n, AttendanceStatus s) =>
    switch (s) {
      AttendanceStatus.present => (l10n.attendancePresent, PillTone.good),
      AttendanceStatus.absent => (l10n.attendanceAbsent, PillTone.bad),
      AttendanceStatus.late => (l10n.attendanceLate, PillTone.warn),
      AttendanceStatus.excused => (l10n.attendanceExcused, PillTone.neutral),
    };

String assessmentKindLabel(AppLocalizations l10n, AssessmentKind kind) =>
    switch (kind) {
      AssessmentKind.exam => l10n.assessmentExam,
      AssessmentKind.quiz => l10n.assessmentQuiz,
      AssessmentKind.assignment => l10n.assessmentAssignment,
    };

/// 9 → "9", 8.5 → "8.5".
String scoreText(double value) => value == value.roundToDouble()
    ? value.toStringAsFixed(0)
    : value.toStringAsFixed(value * 10 == (value * 10).roundToDouble() ? 1 : 2);

/// A lesson in a list: its time, subject, and who teaches it where.
class LessonRow extends StatelessWidget {
  const LessonRow({super.key, required this.lesson, this.showClass = false});

  final SchoolLesson lesson;
  final bool showClass;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final details = [
      if (showClass) lesson.className,
      ?lesson.teacherName,
      if (lesson.room != null) context.l10n.schoolRoom(lesson.room!),
    ];
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              '${lesson.starts}–${lesson.ends}',
              textDirection: TextDirection.ltr,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: p.textSecondary,
                fontFeatures: const [FontFeature.tabularFigures()],
              ),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  lesson.subject,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                if (details.isNotEmpty)
                  Text(
                    details.join(' · '),
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
