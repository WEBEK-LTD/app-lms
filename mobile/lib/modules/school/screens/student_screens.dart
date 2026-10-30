import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../chat/data/chat_api.dart';
import '../../chat/data/chat_media.dart';
import '../../lms/teachers/teacher_widgets.dart' show LabeledField;
import '../../store/screens/cart_screen.dart' show isOrderReceived;
import '../data/school_providers.dart';
import '../widgets/school_widgets.dart';

/// 105.4 Each part of a student's school, for them and their parents: the
/// week's timetable, homework (handed in by the student), grades,
/// attendance, fees (paid by card when the school takes cards) and news.

/// A page of the school with its title, for the student [student] (a
/// notification's) or the one chosen.
class _SchoolPage extends StatelessWidget {
  const _SchoolPage({
    required this.title,
    required this.student,
    required this.builder,
  });

  final String title;
  final int? student;
  final Widget Function(BuildContext context, SchoolMe me, SchoolStudent s)
  builder;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(leading: appBarBack(context), title: Text(title)),
    body: SafeArea(
      top: false,
      child: StudentGate(wanted: student, builder: builder),
    ),
  );
}

// Timetable

class TimetableScreen extends ConsumerWidget {
  const TimetableScreen({super.key, this.student});

  final int? student;

  @override
  Widget build(BuildContext context, WidgetRef ref) => _SchoolPage(
    title: context.l10n.schoolTimetable,
    student: student,
    builder: (context, me, s) => _Week(studentId: s.id),
  );
}

class _Week extends ConsumerWidget {
  const _Week({required this.studentId});

  final int studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return switch (ref.watch(studentTimetableProvider(studentId))) {
      AsyncValue(value: final week?) when week.days.isEmpty => MessageView(
        icon: AppIcons.calendar,
        title: l10n.schoolNoTimetable,
        message: l10n.schoolNoTimetableMessage,
      ),
      AsyncValue(value: final week?) => WeekView(week: week),
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(studentTimetableProvider(studentId)),
      ),
      _ => const LoadingView(),
    };
  }
}

/// A week's lessons, a card per day, today's first.
class WeekView extends StatelessWidget {
  const WeekView({super.key, required this.week, this.showClass = false});

  final SchoolTimetable week;
  final bool showClass;

  @override
  Widget build(BuildContext context) {
    final today = DateTime.now().weekday;
    final days = [
      ...week.days.where((d) => d.weekday >= today),
      ...week.days.where((d) => d.weekday < today),
    ];
    return ListView(
      key: const ValueKey('school-week'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        for (final day in days) ...[
          SectionHeader(
            title: day.weekday == today
                ? context.l10n.schoolTodayDay(weekdayName(day.weekday))
                : weekdayName(day.weekday),
            size: 16,
          ),
          const SizedBox(height: 4),
          AppCard(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
            child: Column(
              children: [
                for (final lesson in day.lessons)
                  LessonRow(lesson: lesson, showClass: showClass),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],
      ],
    );
  }
}

// Homework

class HomeworkScreen extends ConsumerStatefulWidget {
  const HomeworkScreen({super.key, this.student});

  final int? student;

  @override
  ConsumerState<HomeworkScreen> createState() => _HomeworkScreenState();
}

class _HomeworkScreenState extends ConsumerState<HomeworkScreen> {
  HomeworkStatus _status = HomeworkStatus.due;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return _SchoolPage(
      title: l10n.schoolHomework,
      student: widget.student,
      builder: (context, me, s) {
        final query = (student: s.id, status: _status);
        final state = ref.watch(studentHomeworkProvider(query));
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
              child: SegmentedTabs(
                labels: [l10n.homeworkDue, l10n.homeworkDone],
                selected: _status.index,
                onChanged: (i) =>
                    setState(() => _status = HomeworkStatus.values[i]),
              ),
            ),
            Expanded(
              child: PagedItems<Homework>(
                key: ValueKey('homework-${s.id}-${_status.name}'),
                state: state,
                controller: ref.read(studentHomeworkProvider(query).notifier),
                empty: MessageView(
                  icon: AppIcons.assignment,
                  title: _status == HomeworkStatus.due
                      ? l10n.homeworkNoneDue
                      : l10n.homeworkNoneDone,
                  compact: true,
                ),
                item: (context, homework) => _HomeworkCard(
                  homework: homework,
                  onTap: () => _open(context, homework, me, s),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Future<void> _open(
    BuildContext context,
    Homework homework,
    SchoolMe me,
    SchoolStudent student,
  ) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _HomeworkSheet(
        homework: homework,
        studentId: student.id,
        // Only the student hands it in, and only before it is marked.
        canHandIn:
            me.isStudent &&
            me.students.firstOrNull?.id == student.id &&
            homework.submission?.mark == null,
      ),
    );
    if (changed == true) {
      for (final status in HomeworkStatus.values) {
        ref.invalidate(
          studentHomeworkProvider((student: student.id, status: status)),
        );
      }
    }
  }
}

class _HomeworkCard extends StatelessWidget {
  const _HomeworkCard({required this.homework, required this.onTap});

  final Homework homework;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final submission = homework.submission;
    final (label, tone) = switch (submission) {
      HomeworkSubmission(mark: final mark?) => (mark, PillTone.good),
      HomeworkSubmission(handedIn: true) => (
        l10n.homeworkHandedIn,
        PillTone.neutral,
      ),
      _ => (l10n.homeworkDueOn(isoDayLabel(homework.dueOn)), PillTone.warn),
    };
    return AppCard(
      key: ValueKey('homework-${homework.id}'),
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  homework.subject,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: p.textSecondary,
                  ),
                ),
              ),
              SchoolPill(label: label, tone: tone),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            homework.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          if (homework.teacherName != null)
            Text(
              homework.teacherName!,
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
        ],
      ),
    );
  }
}

/// A file given or handed in: opens outside the app.
class FileTile extends ConsumerWidget {
  const FileTile({super.key, required this.file});

  final SchoolFile file;

  @override
  Widget build(BuildContext context, WidgetRef ref) => SettingsTile(
    icon: file.kind == SchoolFileKind.image ? AppIcons.gallery : AppIcons.file,
    title: file.name,
    onTap: () => ref.read(openExternalProvider)(file.url),
  );
}

class _HomeworkSheet extends ConsumerStatefulWidget {
  const _HomeworkSheet({
    required this.homework,
    required this.studentId,
    required this.canHandIn,
  });

  final Homework homework;
  final int studentId;
  final bool canHandIn;

  @override
  ConsumerState<_HomeworkSheet> createState() => _HomeworkSheetState();
}

class _HomeworkSheetState extends ConsumerState<_HomeworkSheet> {
  late final _text = TextEditingController(
    text: widget.homework.submission?.text ?? '',
  );
  ChatFile? _file;
  bool _sending = false;
  double? _progress;
  bool _closed = false;

  @override
  void dispose() {
    _closed = true;
    _text.dispose();
    super.dispose();
  }

  Future<void> _pick(ChatPickSource source) async {
    final l10n = context.l10n;
    final picked = await ref.read(chatPickerProvider).pick(source);
    if (!mounted || picked == null) return;
    switch (picked) {
      case ChatPicked(:final file) when homeworkFileOk(file):
        if (file.size > homeworkMaxBytes(file.type)) {
          showMessage(context, l10n.homeworkFileTooBig);
          return;
        }
        setState(() => _file = file);
      case ChatPicked() || ChatPickUnsupported():
        showMessage(context, l10n.homeworkFileType);
    }
  }

  Future<void> _send() async {
    final l10n = context.l10n;
    final text = _text.text.trim();
    if (text.isEmpty && _file == null) {
      showMessage(context, l10n.homeworkNeedsSomething);
      return;
    }
    setState(() => _sending = true);
    try {
      String? uploadId;
      final file = _file;
      if (file != null) {
        setState(() => _progress = 0);
        uploadId = await uploadChatFile(
          ref.read(schoolUploadsProvider),
          file,
          onProgress: (v) {
            if (mounted) setState(() => _progress = v);
          },
          cancelled: () => _closed,
        );
      }
      await ref
          .read(yallappApiProvider)
          .submitHomework(
            widget.studentId,
            widget.homework.id,
            text: text,
            uploadId: uploadId,
          );
      if (!mounted) return;
      showMessage(context, l10n.homeworkSent);
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
          _progress = null;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final homework = widget.homework;
    final submission = homework.submission;
    final file = _file;
    final progress = _progress;
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
                homework.title,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text(
                [
                  homework.subject,
                  l10n.homeworkDueOn(isoDayLabel(homework.dueOn)),
                ].join(' · '),
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
              if (homework.text.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  homework.text,
                  style: TextStyle(fontSize: 15, color: p.textBody),
                ),
              ],
              for (final attachment in homework.attachments)
                FileTile(file: attachment),
              if (submission != null) ...[
                const SizedBox(height: 16),
                SectionHeader(title: l10n.homeworkYourWork, size: 16),
                if (submission.text.isNotEmpty)
                  Text(
                    submission.text,
                    style: TextStyle(fontSize: 15, color: p.textBody),
                  ),
                if (submission.file != null) FileTile(file: submission.file!),
                if (submission.late)
                  Text(
                    l10n.homeworkLate,
                    style: TextStyle(fontSize: 13, color: p.danger),
                  ),
                if (submission.mark != null) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        l10n.homeworkMark,
                        style: TextStyle(fontSize: 14, color: p.textSecondary),
                      ),
                      const SizedBox(width: 8),
                      SchoolPill(label: submission.mark!, tone: PillTone.good),
                    ],
                  ),
                  if (submission.feedback != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        submission.feedback!,
                        style: TextStyle(fontSize: 14, color: p.textBody),
                      ),
                    ),
                ],
              ],
              if (widget.canHandIn) ...[
                const SizedBox(height: 16),
                LabeledField(
                  key: const ValueKey('homework-text'),
                  label: l10n.homeworkAnswer,
                  controller: _text,
                  lines: 4,
                  maxLength: 5000,
                ),
                const SizedBox(height: 8),
                if (file != null)
                  SettingsTile(
                    icon: AppIcons.file,
                    title: file.name,
                    chevron: false,
                    trailing: IconButton(
                      tooltip: l10n.homeworkRemoveFile,
                      onPressed: _sending
                          ? null
                          : () => setState(() => _file = null),
                      icon: AppIcon(AppIcons.close, size: 20, color: p.text),
                    ),
                  )
                else
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      SecondaryButton(
                        key: const ValueKey('homework-photo'),
                        label: l10n.homeworkAddPhoto,
                        icon: AppIcons.photo,
                        height: 44,
                        onPressed: () => _pick(ChatPickSource.camera),
                      ),
                      SecondaryButton(
                        key: const ValueKey('homework-file'),
                        label: l10n.homeworkAddFile,
                        icon: AppIcons.file,
                        height: 44,
                        onPressed: () => _pick(ChatPickSource.file),
                      ),
                    ],
                  ),
                if (progress != null) ...[
                  const SizedBox(height: 8),
                  LinearProgressIndicator(value: progress),
                ],
                const SizedBox(height: 16),
                PrimaryButton(
                  key: const ValueKey('homework-send'),
                  label: submission?.handedIn == true
                      ? l10n.homeworkSendAgain
                      : l10n.homeworkSend,
                  loading: _sending,
                  height: 52,
                  onPressed: _send,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// Grades

class GradesScreen extends ConsumerWidget {
  const GradesScreen({super.key, this.student});

  final int? student;

  @override
  Widget build(BuildContext context, WidgetRef ref) => _SchoolPage(
    title: context.l10n.schoolGrades,
    student: student,
    builder: (context, me, s) => _Grades(studentId: s.id),
  );
}

class _Grades extends ConsumerWidget {
  const _Grades({required this.studentId});

  final int studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    return switch (ref.watch(studentGradesProvider(studentId))) {
      AsyncValue(value: final grades?)
          when grades.subjects.isEmpty && grades.upcoming.isEmpty =>
        MessageView(
          icon: AppIcons.certificate,
          title: l10n.gradesNone,
          message: l10n.gradesNoneMessage,
        ),
      AsyncValue(value: final grades?) => RefreshIndicator(
        onRefresh: () async => ref.invalidate(studentGradesProvider(studentId)),
        child: ListView(
          key: const ValueKey('school-grades'),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            if (grades.upcoming.isNotEmpty) ...[
              SectionHeader(title: l10n.gradesComing, size: 16),
              const SizedBox(height: 4),
              AppCard(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 4,
                ),
                child: Column(
                  children: [
                    for (final a in grades.upcoming)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(a.title),
                        subtitle: Text(
                          [
                            assessmentKindLabel(l10n, a.kind),
                            a.subject,
                            isoDayLabel(a.date),
                          ].join(' · '),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
            for (final subject in grades.subjects) ...[
              AppCard(
                key: ValueKey('grades-${subject.subject}'),
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            subject.subject,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: p.text,
                            ),
                          ),
                        ),
                        if (subject.percent != null)
                          Text(
                            '${scoreText(subject.percent!)}%',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: p.primary,
                            ),
                          ),
                      ],
                    ),
                    for (final score in subject.scores)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${score.title} · ${isoDayLabel(score.date)}',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: p.textBody,
                                ),
                              ),
                            ),
                            Text(
                              '${scoreText(score.score)}/${scoreText(score.maxScore)}',
                              textDirection: TextDirection.ltr,
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: p.text,
                              ),
                            ),
                          ],
                        ),
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
        onRetry: () => ref.invalidate(studentGradesProvider(studentId)),
      ),
      _ => const LoadingView(),
    };
  }
}

// Attendance

class AttendanceScreen extends ConsumerWidget {
  const AttendanceScreen({super.key, this.student});

  final int? student;

  @override
  Widget build(BuildContext context, WidgetRef ref) => _SchoolPage(
    title: context.l10n.schoolAttendance,
    student: student,
    builder: (context, me, s) => _Attendance(studentId: s.id),
  );
}

class _Attendance extends ConsumerWidget {
  const _Attendance({required this.studentId});

  final int studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    return switch (ref.watch(studentAttendanceProvider(studentId))) {
      AsyncValue(value: final attendance?) => RefreshIndicator(
        onRefresh: () async =>
            ref.invalidate(studentAttendanceProvider(studentId)),
        child: ListView(
          key: const ValueKey('school-attendance'),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            Text(
              l10n.attendanceSince(isoDayLabel(attendance.from)),
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                for (final status in [
                  AttendanceStatus.absent,
                  AttendanceStatus.late,
                  AttendanceStatus.excused,
                ]) ...[
                  Expanded(
                    child: AppCard(
                      key: ValueKey('attendance-count-${status.name}'),
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        children: [
                          Text(
                            '${attendance.count(status)}',
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: p.text,
                            ),
                          ),
                          Text(
                            attendanceLabel(l10n, status).$1,
                            style: TextStyle(
                              fontSize: 13,
                              color: p.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  if (status != AttendanceStatus.excused)
                    const SizedBox(width: 8),
                ],
              ],
            ),
            const SizedBox(height: 16),
            if (attendance.days.isEmpty)
              Text(
                l10n.attendanceNone,
                style: TextStyle(fontSize: 14, color: p.textSecondary),
              )
            else
              AppCard(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 4,
                ),
                child: Column(
                  children: [
                    for (final day in attendance.days)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(isoDayLabel(day.date)),
                        subtitle: day.note == null ? null : Text(day.note!),
                        trailing: SchoolPill(
                          label: attendanceLabel(l10n, day.status).$1,
                          tone: attendanceLabel(l10n, day.status).$2,
                        ),
                      ),
                  ],
                ),
              ),
          ],
        ),
      ),
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(studentAttendanceProvider(studentId)),
      ),
      _ => const LoadingView(),
    };
  }
}

// Fees

class FeesScreen extends ConsumerWidget {
  const FeesScreen({super.key, this.student});

  final int? student;

  @override
  Widget build(BuildContext context, WidgetRef ref) => _SchoolPage(
    title: context.l10n.schoolFees,
    student: student,
    builder: (context, me, s) => _Fees(studentId: s.id),
  );
}

class _Fees extends ConsumerStatefulWidget {
  const _Fees({required this.studentId});

  final int studentId;

  @override
  ConsumerState<_Fees> createState() => _FeesState();
}

class _FeesState extends ConsumerState<_Fees> {
  int? _paying;

  Future<void> _pay(SchoolFee fee) async {
    final l10n = context.l10n;
    setState(() => _paying = fee.id);
    try {
      final url = await ref
          .read(yallappApiProvider)
          .payStudentFee(widget.studentId, fee.id);
      if (!mounted) return;
      final paid = await context.push<bool>(
        Paths.web,
        extra: WebPageArgs(
          url: url,
          title: l10n.checkout,
          completesOn: isOrderReceived,
        ),
      );
      if (!mounted) return;
      if (paid == true) showMessage(context, l10n.feePaidThanks);
      ref.invalidate(studentFeesProvider(widget.studentId));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _paying = null);
    }
  }

  void _receipt(SchoolFee fee) => context.push(
    Paths.web,
    extra: WebPageArgs(url: fee.receiptUrl!, title: context.l10n.feeReceipt),
  );

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final id = widget.studentId;
    return switch (ref.watch(studentFeesProvider(id))) {
      AsyncValue(value: final fees?) when fees.items.isEmpty => MessageView(
        icon: AppIcons.cash,
        title: l10n.feesNone,
        message: l10n.feesNoneMessage,
      ),
      AsyncValue(value: final fees?) => RefreshIndicator(
        onRefresh: () async => ref.invalidate(studentFeesProvider(id)),
        child: ListView(
          key: const ValueKey('school-fees'),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            AppCard(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      l10n.feesStillDue,
                      style: TextStyle(fontSize: 15, color: p.textSecondary),
                    ),
                  ),
                  Text(
                    fees.dueFormatted,
                    key: const ValueKey('fees-due'),
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                ],
              ),
            ),
            if (!fees.canPay)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  l10n.feesPayAtSchool,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ),
            const SizedBox(height: 16),
            for (final fee in fees.items) ...[
              AppCard(
                key: ValueKey('fee-${fee.id}'),
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            fee.title,
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: p.text,
                            ),
                          ),
                        ),
                        Text(
                          fee.amountFormatted,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            fee.status == FeeStatus.paid
                                ? l10n.feePaidOn(
                                    shortDate(fee.paidAt ?? DateTime.now()),
                                  )
                                : fee.dueOn == null
                                ? l10n.feeDue
                                : l10n.feeDueOn(isoDayLabel(fee.dueOn!)),
                            style: TextStyle(
                              fontSize: 13,
                              color: p.textSecondary,
                            ),
                          ),
                        ),
                        SchoolPill(
                          label: fee.status == FeeStatus.paid
                              ? l10n.feePaid
                              : l10n.feeDue,
                          tone: fee.status == FeeStatus.paid
                              ? PillTone.good
                              : PillTone.warn,
                        ),
                      ],
                    ),
                    if (fee.status == FeeStatus.due && fees.canPay) ...[
                      const SizedBox(height: 10),
                      PrimaryButton(
                        key: ValueKey('fee-pay-${fee.id}'),
                        label: l10n.feePay(fee.amountFormatted),
                        loading: _paying == fee.id,
                        height: 46,
                        onPressed: _paying == null ? () => _pay(fee) : null,
                      ),
                    ],
                    if (fee.receiptUrl != null) ...[
                      const SizedBox(height: 6),
                      Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: TextButton.icon(
                          key: ValueKey('fee-receipt-${fee.id}'),
                          onPressed: () => _receipt(fee),
                          icon: AppIcon(AppIcons.receipt, size: 18),
                          label: Text(l10n.feeReceipt),
                        ),
                      ),
                    ],
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
        onRetry: () => ref.invalidate(studentFeesProvider(id)),
      ),
      _ => const LoadingView(),
    };
  }
}

// News

class SchoolNewsScreen extends ConsumerWidget {
  const SchoolNewsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.schoolNews),
      ),
      body: SafeArea(
        top: false,
        child: PagedItems<SchoolAnnouncement>(
          state: ref.watch(schoolNewsProvider),
          controller: ref.read(schoolNewsProvider.notifier),
          empty: MessageView(
            icon: AppIcons.campaignUpdate,
            title: l10n.schoolNoNews,
            compact: true,
          ),
          item: (context, item) => NewsCard(item: item),
        ),
      ),
    );
  }
}

class NewsCard extends StatelessWidget {
  const NewsCard({super.key, required this.item});

  final SchoolAnnouncement item;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AppCard(
      key: ValueKey('news-${item.id}'),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            [
              item.author,
              ?item.className,
              shortDate(item.createdAt),
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          const SizedBox(height: 4),
          Text(
            item.title,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          const SizedBox(height: 4),
          Text(item.body, style: TextStyle(fontSize: 14, color: p.textBody)),
        ],
      ),
    );
  }
}
