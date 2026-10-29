import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../food/widgets/food_widgets.dart' show AmountRow;
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../widgets/course_cards.dart' show RatingLabel;
import 'teacher_widgets.dart';
import 'teachers_providers.dart';

/// 105.3 The Teacher tab, for the academy's teachers only: their courses
/// (made here, sent to the academy for review), their students' questions
/// and what their courses sold. Anyone else is told how to apply.
class TeacherDeskScreen extends ConsumerStatefulWidget {
  const TeacherDeskScreen({super.key});

  @override
  ConsumerState<TeacherDeskScreen> createState() => _TeacherDeskScreenState();
}

class _TeacherDeskScreenState extends ConsumerState<TeacherDeskScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final header = TabHeader(title: l10n.tabTeacher);
    if (!ref.watch(isTeacherProvider)) {
      // Nothing is asked of the server for someone who isn't a teacher.
      final apply = ref.watch(instructorsConfigProvider)?.applications ?? false;
      return Scaffold(
        body: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              header,
              Expanded(
                child: MessageView(
                  icon: AppIcons.teacher,
                  title: l10n.teachHere,
                  message: apply ? l10n.teachIntro : null,
                  actionLabel: apply ? l10n.teachSend : null,
                  onAction: () => context.push(Paths.teachApply),
                ),
              ),
            ],
          ),
        ),
      );
    }
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            header,
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: _ProfileCard(),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: SegmentedTabs(
                labels: [
                  l10n.teacherTabCourses,
                  l10n.teacherTabQuestions,
                  l10n.teacherTabEarnings,
                ],
                selected: _tab,
                onChanged: (i) => setState(() => _tab = i),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: switch (_tab) {
                0 => const _Courses(),
                1 => const _Questions(),
                _ => const _Earnings(),
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// The teacher's name, share and rating; their bio and subjects to edit.
class _ProfileCard extends ConsumerWidget {
  const _ProfileCard();

  Future<void> _edit(BuildContext context, TeacherProfile me) =>
      showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        builder: (context) => _ProfileSheet(me: me),
      );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    return switch (ref.watch(teacherMeProvider)) {
      AsyncValue(value: final me?) => AppCard(
        key: const ValueKey('teacher-profile'),
        padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
        child: Row(
          children: [
            InitialsAvatar(name: me.name, imageUrl: me.avatarUrl, size: 44),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    me.name,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  Text(
                    l10n.teacherShare(_percent(me.sharePercent)),
                    key: const ValueKey('teacher-share'),
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                  if (me.rating != null)
                    RatingLabel(me.rating!, count: me.ratingCount),
                ],
              ),
            ),
            IconButton(
              key: const ValueKey('teacher-edit-profile'),
              tooltip: l10n.teacherEditProfile,
              onPressed: () => _edit(context, me),
              icon: AppIcon(AppIcons.edit, size: 20, color: p.text),
            ),
          ],
        ),
      ),
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(teacherMeProvider),
      ),
      _ => const SizedBox(height: 72),
    };
  }
}

/// 40 → "40", 37.5 → "37.5".
String _percent(double value) => value == value.roundToDouble()
    ? value.toStringAsFixed(0)
    : value.toStringAsFixed(1);

class _ProfileSheet extends ConsumerStatefulWidget {
  const _ProfileSheet({required this.me});

  final TeacherProfile me;

  @override
  ConsumerState<_ProfileSheet> createState() => _ProfileSheetState();
}

class _ProfileSheetState extends ConsumerState<_ProfileSheet> {
  late final _bio = TextEditingController(text: widget.me.bio);
  late final _subjects = TextEditingController(
    text: widget.me.subjects.join(', '),
  );
  bool _saving = false;

  @override
  void dispose() {
    _bio.dispose();
    _subjects.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref
          .read(yallappApiProvider)
          .updateTeacherMe(
            bio: _bio.text.trim(),
            subjects: splitSubjects(_subjects.text),
          );
      ref.invalidate(teacherMeProvider);
      if (!mounted) return;
      showMessage(context, context.l10n.teacherProfileSaved);
      Navigator.of(context).pop();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.teacherEditProfile,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              LabeledField(
                key: const ValueKey('profile-bio'),
                label: l10n.teachBio,
                hint: l10n.teachBioHint,
                controller: _bio,
                lines: 4,
                maxLength: 1000,
              ),
              const SizedBox(height: 12),
              LabeledField(
                key: const ValueKey('profile-subjects'),
                label: l10n.teachSubjects,
                hint: l10n.teachSubjectsHint,
                controller: _subjects,
              ),
              const SizedBox(height: 16),
              PrimaryButton(
                key: const ValueKey('profile-save'),
                label: l10n.save,
                loading: _saving,
                height: 52,
                onPressed: _save,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The teacher's courses, newest first, with where each is.
class _Courses extends ConsumerWidget {
  const _Courses();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    return switch (ref.watch(teacherCoursesProvider)) {
      AsyncValue(value: final list?) when list.items.isEmpty => MessageView(
        icon: AppIcons.courses,
        title: l10n.teacherNewCourse,
        message: l10n.teacherNoCourses,
        actionLabel: l10n.teacherNewCourse,
        onAction: () => context.push(Paths.newTeacherCourse),
      ),
      AsyncValue(value: final list?) => RefreshIndicator(
        onRefresh: () async => ref.invalidate(teacherCoursesProvider),
        child: ListView(
          key: const ValueKey('teacher-courses'),
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          children: [
            SecondaryButton(
              key: const ValueKey('teacher-new-course'),
              label: l10n.teacherNewCourse,
              icon: AppIcons.add,
              height: 48,
              onPressed: () => context.push(Paths.newTeacherCourse),
            ),
            const SizedBox(height: 12),
            for (final course in list.items) ...[
              AppCard(
                key: ValueKey('teacher-course-${course.id}'),
                padding: const EdgeInsets.all(14),
                onTap: () => context.push(Paths.teacherCourse(course.id)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            course.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: p.text,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        StagePill(stage: course.stage),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      [
                        course.free ? l10n.free : course.priceFormatted,
                        l10n.lessonCount(course.lessonCount),
                        l10n.teacherStudentCount(course.studentCount),
                      ].join(' · '),
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
            ],
          ],
        ),
      ),
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(teacherCoursesProvider),
      ),
      _ => SkeletonList(
        layout: SkeletonLayout.text,
        label: l10n.loadingEllipsis,
      ),
    };
  }
}

/// The students' questions on the teacher's courses, the ones waiting
/// first; a tap opens the question to answer it.
class _Questions extends ConsumerWidget {
  const _Questions();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final state = ref.watch(teacherQuestionsProvider);
    final notifier = ref.read(teacherQuestionsProvider.notifier);
    if (state.isInitialLoading) {
      return SkeletonList(
        layout: SkeletonLayout.text,
        label: l10n.loadingEllipsis,
      );
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: notifier.retry);
    }
    if (state.items.isEmpty) {
      return MessageView(icon: AppIcons.forum, title: l10n.teacherNoQuestions);
    }
    return RefreshIndicator(
      onRefresh: notifier.refresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.extentAfter < 300 && state.hasMore) notifier.loadMore();
          return false;
        },
        child: ListView.separated(
          key: const ValueKey('teacher-questions'),
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          itemCount: state.items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) {
            final q = state.items[i];
            return AppCard(
              key: ValueKey('teacher-question-${q.id}'),
              padding: const EdgeInsets.all(14),
              onTap: () async {
                await context.push(Paths.question(q.id));
                notifier.refresh();
              },
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    q.courseTitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: p.textSecondary),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    q.text,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      height: 1.4,
                      fontWeight: FontWeight.w600,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '${q.studentName} · '
                    '${q.answered ? l10n.questionAnswered : l10n.questionWaiting}',
                    style: TextStyle(
                      fontSize: 13,
                      color: q.answered ? p.textSecondary : p.link,
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

/// What the teacher's courses sold this month, last month or this year,
/// and the teacher's share of it.
class _Earnings extends ConsumerStatefulWidget {
  const _Earnings();

  @override
  ConsumerState<_Earnings> createState() => _EarningsState();
}

class _EarningsState extends ConsumerState<_Earnings> {
  TeacherPeriod _period = TeacherPeriod.month;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(teacherEarningsProvider(_period));
    return ListView(
      key: const ValueKey('teacher-earnings'),
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      children: [
        SegmentedTabs(
          labels: [l10n.earningsMonth, l10n.periodLastMonth, l10n.periodYear],
          selected: _period.index,
          radio: true,
          height: 38,
          onChanged: (i) => setState(() => _period = TeacherPeriod.values[i]),
        ),
        const SizedBox(height: 12),
        switch (async) {
          AsyncValue(value: final e?) => AppCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final line in [
                  l10n.teacherSold(e.sales, e.salesFormatted),
                  l10n.teacherRefunds(e.refundsFormatted),
                  l10n.teacherShare(_percent(e.sharePercent)),
                ])
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Text(
                      line,
                      style: TextStyle(fontSize: 14, color: p.textBody),
                    ),
                  ),
                const Divider(height: 16),
                AmountRow(
                  key: const ValueKey('teacher-earned'),
                  label: l10n.teacherEarned,
                  value: e.earnedFormatted,
                  strong: true,
                ),
                if (e.courses.isNotEmpty) ...[
                  const Divider(height: 24),
                  for (final c in e.courses)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              c.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: 14, color: p.text),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            l10n.teacherSold(c.sales, c.earnedFormatted),
                            style: TextStyle(
                              fontSize: 14,
                              color: p.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
                const SizedBox(height: 12),
                Text(
                  l10n.teacherPaidBy,
                  style: TextStyle(fontSize: 12, color: p.textSecondary),
                ),
              ],
            ),
          ),
          AsyncValue(error: final err?) => ErrorView(
            error: err,
            onRetry: () => ref.invalidate(teacherEarningsProvider(_period)),
          ),
          _ => const SizedBox(
            height: 120,
            child: Center(child: CircularProgressIndicator()),
          ),
        },
      ],
    );
  }
}
