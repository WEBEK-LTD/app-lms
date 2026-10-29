import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../chat/data/chat_api.dart';
import '../../chat/data/chat_media.dart';
import '../../lms/teachers/teacher_widgets.dart' show LabeledField;
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../../shared/shared_routes.dart' show NotFoundScreen;
import '../data/school_providers.dart';
import '../widgets/school_widgets.dart';
import 'student_screens.dart' show FileTile;

/// 105.4 The Classroom tab, for the school's teachers only: today's lessons
/// and their classes; for each class, its attendance, homework (given,
/// handed in, marked), exams and scores, and a message to the class and
/// its families.
class ClassroomScreen extends ConsumerWidget {
  const ClassroomScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final header = TabHeader(title: l10n.tabClassroom);
    if (ref.watch(isSchoolTeacherProvider) != true) {
      return Scaffold(
        body: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              header,
              Expanded(
                child: MessageView(
                  icon: AppIcons.staff,
                  title: l10n.classroomNotTeacher,
                  message: l10n.classroomNotTeacherMessage,
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
            Expanded(
              child: switch (ref.watch(classroomMeProvider)) {
                AsyncValue(value: final me?) => RefreshIndicator(
                  onRefresh: () async => ref.invalidate(classroomMeProvider),
                  child: ListView(
                    key: const ValueKey('classroom'),
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                    children: [
                      SectionHeader(title: l10n.schoolToday, size: 16),
                      const SizedBox(height: 4),
                      if (me.today.isEmpty)
                        Text(
                          l10n.schoolNoLessonsToday,
                          style: TextStyle(
                            fontSize: 14,
                            color: p.textSecondary,
                          ),
                        )
                      else
                        AppCard(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 14,
                            vertical: 6,
                          ),
                          child: Column(
                            children: [
                              for (final lesson in me.today)
                                LessonRow(lesson: lesson, showClass: true),
                            ],
                          ),
                        ),
                      const SizedBox(height: 20),
                      SectionHeader(title: l10n.classroomClasses, size: 16),
                      const SizedBox(height: 4),
                      if (me.classes.isEmpty)
                        Text(
                          l10n.classroomNoClasses,
                          style: TextStyle(
                            fontSize: 14,
                            color: p.textSecondary,
                          ),
                        ),
                      for (final klass in me.classes) ...[
                        AppCard(
                          key: ValueKey('class-${klass.id}'),
                          padding: const EdgeInsets.all(14),
                          onTap: () =>
                              context.push(Paths.classroomClass(klass.id)),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      klass.name,
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.w700,
                                        color: p.text,
                                      ),
                                    ),
                                  ),
                                  if (klass.classTeacher)
                                    SchoolPill(label: l10n.classroomYourClass),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(
                                [
                                  l10n.classroomStudents(klass.studentCount),
                                  ...klass.subjects.map((s) => s.name),
                                ].join(' · '),
                                style: TextStyle(
                                  fontSize: 13,
                                  color: p.textSecondary,
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
                  onRetry: () => ref.invalidate(classroomMeProvider),
                ),
                _ => const LoadingView(),
              },
            ),
          ],
        ),
      ),
    );
  }
}

/// The class from the teacher's classes, for the pages about it.
class _ClassGate extends ConsumerWidget {
  const _ClassGate({required this.classId, required this.builder});

  final int classId;
  final Widget Function(BuildContext context, ClassroomClass klass) builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      switch (ref.watch(classroomMeProvider)) {
        AsyncValue(value: final me?) => switch (me.classes
            .where((c) => c.id == classId)
            .firstOrNull) {
          final klass? => builder(context, klass),
          null => const NotFoundScreen(),
        },
        AsyncValue(error: final e?) => Scaffold(
          appBar: AppBar(),
          body: ErrorView(
            error: e,
            onRetry: () => ref.invalidate(classroomMeProvider),
          ),
        ),
        _ => Scaffold(appBar: AppBar(), body: const LoadingView()),
      };
}

class ClassScreen extends ConsumerStatefulWidget {
  const ClassScreen({super.key, required this.classId});

  final int classId;

  @override
  ConsumerState<ClassScreen> createState() => _ClassScreenState();
}

class _ClassScreenState extends ConsumerState<ClassScreen> {
  int _tab = 0;

  Future<void> _sheet(Widget sheet) async {
    final done = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => sheet,
    );
    if (done == true) {
      ref
        ..invalidate(classHomeworkProvider(widget.classId))
        ..invalidate(classAssessmentsProvider(widget.classId));
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return _ClassGate(
      classId: widget.classId,
      builder: (context, klass) => Scaffold(
        appBar: AppBar(title: Text(klass.name)),
        body: SafeArea(
          top: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
                child: Row(
                  children: [
                    Expanded(
                      child: PrimaryButton(
                        key: const ValueKey('class-attendance'),
                        label: l10n.classroomTakeAttendance,
                        icon: AppIcons.attendance,
                        height: 46,
                        onPressed: () =>
                            context.push(Paths.classAttendance(klass.id)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: SecondaryButton(
                        key: const ValueKey('class-message'),
                        label: l10n.classroomWrite,
                        icon: AppIcons.campaignUpdate,
                        height: 46,
                        onPressed: () => _sheet(_MessageSheet(klass: klass)),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
                child: SegmentedTabs(
                  labels: [l10n.schoolHomework, l10n.classroomAssessments],
                  selected: _tab,
                  onChanged: (i) => setState(() => _tab = i),
                ),
              ),
              Expanded(
                child: _tab == 0
                    ? PagedItems<ClassroomHomework>(
                        key: const ValueKey('class-homework'),
                        state: ref.watch(classHomeworkProvider(klass.id)),
                        controller: ref.read(
                          classHomeworkProvider(klass.id).notifier,
                        ),
                        header: Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: SecondaryButton(
                            key: const ValueKey('give-homework'),
                            label: l10n.classroomGiveHomework,
                            icon: AppIcons.add,
                            height: 46,
                            onPressed: () =>
                                _sheet(_GiveHomeworkSheet(klass: klass)),
                          ),
                        ),
                        empty: MessageView(
                          icon: AppIcons.assignment,
                          title: l10n.classroomNoHomework,
                          compact: true,
                        ),
                        item: (context, h) => _HomeworkTile(homework: h),
                      )
                    : PagedItems<SchoolAssessment>(
                        key: const ValueKey('class-assessments'),
                        state: ref.watch(classAssessmentsProvider(klass.id)),
                        controller: ref.read(
                          classAssessmentsProvider(klass.id).notifier,
                        ),
                        header: Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: SecondaryButton(
                            key: const ValueKey('new-assessment'),
                            label: l10n.classroomNewAssessment,
                            icon: AppIcons.add,
                            height: 46,
                            onPressed: () =>
                                _sheet(_AssessmentSheet(klass: klass)),
                          ),
                        ),
                        empty: MessageView(
                          icon: AppIcons.certificate,
                          title: l10n.classroomNoAssessments,
                          compact: true,
                        ),
                        item: (context, a) => _AssessmentTile(assessment: a),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HomeworkTile extends StatelessWidget {
  const _HomeworkTile({required this.homework});

  final ClassroomHomework homework;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return AppCard(
      key: ValueKey('class-homework-${homework.id}'),
      padding: const EdgeInsets.all(14),
      onTap: () => context.push(Paths.classroomHomework(homework.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            [
              homework.subject,
              l10n.homeworkDueOn(isoDayLabel(homework.dueOn)),
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          const SizedBox(height: 4),
          Text(
            homework.title,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            l10n.classroomHandedIn(
              homework.handedIn,
              homework.students,
              homework.marked,
            ),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _AssessmentTile extends StatelessWidget {
  const _AssessmentTile({required this.assessment});

  final SchoolAssessment assessment;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return AppCard(
      key: ValueKey('assessment-${assessment.id}'),
      padding: const EdgeInsets.all(14),
      onTap: () => context.push(Paths.classroomAssessment(assessment.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            [
              assessmentKindLabel(l10n, assessment.kind),
              assessment.subject,
              isoDayLabel(assessment.date),
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          const SizedBox(height: 4),
          Text(
            assessment.title,
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: p.text,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            l10n.classroomScored(
              assessment.scored,
              scoreText(assessment.maxScore),
            ),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}

/// A date picked in a sheet: the days from [first] to [last].
Future<String?> _pickDay(
  BuildContext context,
  String? current, {
  required DateTime first,
  required DateTime last,
}) async {
  final initial = parseIsoDate(current ?? '') ?? first;
  final picked = await showDatePicker(
    context: context,
    initialDate: initial.isBefore(first)
        ? first
        : initial.isAfter(last)
        ? last
        : initial,
    firstDate: first,
    lastDate: last,
  );
  return picked == null ? null : isoDate(picked);
}

/// A subject of the class the teacher teaches, to choose.
class _SubjectChoice extends StatelessWidget {
  const _SubjectChoice({
    required this.subjects,
    required this.value,
    required this.onChanged,
  });

  final List<ClassroomSubject> subjects;
  final int? value;
  final ValueChanged<int?> onChanged;

  @override
  Widget build(BuildContext context) => DropdownButtonFormField<int>(
    key: const ValueKey('subject-choice'),
    initialValue: value,
    decoration: InputDecoration(labelText: context.l10n.classroomSubject),
    items: [
      for (final s in subjects)
        DropdownMenuItem(value: s.id, child: Text(s.name)),
    ],
    onChanged: onChanged,
  );
}

class _DayField extends StatelessWidget {
  const _DayField({
    required this.label,
    required this.value,
    required this.onTap,
    super.key,
  });

  final String label;
  final String? value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => SettingsTile(
    icon: AppIcons.calendar,
    title: label,
    value: value == null
        ? context.l10n.classroomChooseDay
        : isoDayLabel(value!),
    onTap: onTap,
  );
}

class _GiveHomeworkSheet extends ConsumerStatefulWidget {
  const _GiveHomeworkSheet({required this.klass});

  final ClassroomClass klass;

  @override
  ConsumerState<_GiveHomeworkSheet> createState() => _GiveHomeworkSheetState();
}

class _GiveHomeworkSheetState extends ConsumerState<_GiveHomeworkSheet> {
  final _title = TextEditingController();
  final _text = TextEditingController();
  late int? _subject = widget.klass.subjects.length == 1
      ? widget.klass.subjects.first.id
      : null;
  String? _due;
  final _files = <ChatFile>[];
  bool _saving = false;
  bool _closed = false;

  @override
  void dispose() {
    _closed = true;
    _title.dispose();
    _text.dispose();
    super.dispose();
  }

  Future<void> _pick() async {
    final l10n = context.l10n;
    final picked = await ref.read(chatPickerProvider).pick(ChatPickSource.file);
    if (!mounted || picked == null) return;
    switch (picked) {
      case ChatPicked(:final file) when homeworkFileOk(file):
        if (file.size > homeworkMaxBytes(file.type)) {
          showMessage(context, l10n.homeworkFileTooBig);
          return;
        }
        setState(() => _files.add(file));
      case ChatPicked() || ChatPickUnsupported():
        showMessage(context, l10n.homeworkFileType);
    }
  }

  Future<void> _give() async {
    final l10n = context.l10n;
    final title = _title.text.trim();
    final subject = _subject;
    final due = _due;
    if (subject == null || title.isEmpty || due == null) {
      showMessage(context, l10n.classroomHomeworkMissing);
      return;
    }
    setState(() => _saving = true);
    try {
      final uploads = <String>[];
      for (final file in _files) {
        uploads.add(
          await uploadChatFile(
            ref.read(schoolUploadsProvider),
            file,
            cancelled: () => _closed,
          ),
        );
      }
      await ref
          .read(yallappApiProvider)
          .giveHomework(
            HomeworkInput(
              classId: widget.klass.id,
              subjectId: subject,
              title: title,
              text: _text.text.trim(),
              dueOn: due,
              uploadIds: uploads,
            ),
          );
      if (!mounted) return;
      showMessage(context, l10n.classroomHomeworkGiven);
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final today = DateTime.now();
    return _Sheet(
      title: l10n.classroomGiveHomework,
      children: [
        _SubjectChoice(
          subjects: widget.klass.subjects,
          value: _subject,
          onChanged: (v) => setState(() => _subject = v),
        ),
        const SizedBox(height: 12),
        LabeledField(
          key: const ValueKey('homework-title'),
          label: l10n.classroomTitle,
          controller: _title,
          maxLength: 200,
        ),
        const SizedBox(height: 12),
        LabeledField(
          key: const ValueKey('homework-instructions'),
          label: l10n.classroomInstructions,
          controller: _text,
          lines: 4,
          maxLength: 5000,
        ),
        _DayField(
          key: const ValueKey('homework-due'),
          label: l10n.classroomDue,
          value: _due,
          onTap: () async {
            final day = await _pickDay(
              context,
              _due,
              first: DateTime(today.year, today.month, today.day),
              last: addDays(today, 365),
            );
            if (day != null) setState(() => _due = day);
          },
        ),
        for (final file in _files)
          SettingsTile(icon: AppIcons.file, title: file.name, chevron: false),
        if (_files.length < 5)
          SettingsTile(
            key: const ValueKey('homework-attach'),
            icon: AppIcons.add,
            title: l10n.homeworkAddFile,
            onTap: _saving ? null : _pick,
          ),
        const SizedBox(height: 16),
        PrimaryButton(
          key: const ValueKey('homework-give'),
          label: l10n.classroomGive,
          loading: _saving,
          height: 52,
          onPressed: _give,
        ),
      ],
    );
  }
}

class _AssessmentSheet extends ConsumerStatefulWidget {
  const _AssessmentSheet({required this.klass});

  final ClassroomClass klass;

  @override
  ConsumerState<_AssessmentSheet> createState() => _AssessmentSheetState();
}

class _AssessmentSheetState extends ConsumerState<_AssessmentSheet> {
  final _title = TextEditingController();
  final _max = TextEditingController(text: '100');
  late int? _subject = widget.klass.subjects.length == 1
      ? widget.klass.subjects.first.id
      : null;
  AssessmentKind _kind = AssessmentKind.exam;
  String? _date;
  bool _saving = false;

  @override
  void dispose() {
    _title.dispose();
    _max.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = context.l10n;
    final title = _title.text.trim();
    final max = double.tryParse(_max.text.trim().replaceAll(',', '.'));
    final subject = _subject;
    final date = _date;
    if (subject == null || title.isEmpty || date == null || max == null) {
      showMessage(context, l10n.classroomAssessmentMissing);
      return;
    }
    setState(() => _saving = true);
    try {
      await ref
          .read(yallappApiProvider)
          .createAssessment(
            AssessmentInput(
              classId: widget.klass.id,
              subjectId: subject,
              kind: _kind,
              title: title,
              date: date,
              maxScore: max,
            ),
          );
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final today = DateTime.now();
    return _Sheet(
      title: l10n.classroomNewAssessment,
      children: [
        SegmentedTabs(
          labels: [
            for (final kind in AssessmentKind.values)
              assessmentKindLabel(l10n, kind),
          ],
          selected: _kind.index,
          onChanged: (i) => setState(() => _kind = AssessmentKind.values[i]),
        ),
        const SizedBox(height: 12),
        _SubjectChoice(
          subjects: widget.klass.subjects,
          value: _subject,
          onChanged: (v) => setState(() => _subject = v),
        ),
        const SizedBox(height: 12),
        LabeledField(
          key: const ValueKey('assessment-title'),
          label: l10n.classroomTitle,
          controller: _title,
          maxLength: 120,
        ),
        const SizedBox(height: 12),
        LabeledField(
          key: const ValueKey('assessment-max'),
          label: l10n.classroomFullMark,
          controller: _max,
          keyboard: const TextInputType.numberWithOptions(decimal: true),
        ),
        _DayField(
          key: const ValueKey('assessment-date'),
          label: l10n.classroomDate,
          value: _date,
          onTap: () async {
            final day = await _pickDay(
              context,
              _date,
              first: addDays(today, -365),
              last: addDays(today, 365),
            );
            if (day != null) setState(() => _date = day);
          },
        ),
        const SizedBox(height: 16),
        PrimaryButton(
          key: const ValueKey('assessment-save'),
          label: l10n.classroomAdd,
          loading: _saving,
          height: 52,
          onPressed: _save,
        ),
      ],
    );
  }
}

class _MessageSheet extends ConsumerStatefulWidget {
  const _MessageSheet({required this.klass});

  final ClassroomClass klass;

  @override
  ConsumerState<_MessageSheet> createState() => _MessageSheetState();
}

class _MessageSheetState extends ConsumerState<_MessageSheet> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  bool _sending = false;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final l10n = context.l10n;
    final title = _title.text.trim();
    final body = _body.text.trim();
    if (title.isEmpty || body.isEmpty) {
      showMessage(context, l10n.classroomMessageMissing);
      return;
    }
    setState(() => _sending = true);
    try {
      await ref
          .read(yallappApiProvider)
          .postClassAnnouncement(widget.klass.id, title: title, body: body);
      if (!mounted) return;
      showMessage(context, l10n.classroomMessageSent);
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return _Sheet(
      title: l10n.classroomWriteTo(widget.klass.name),
      children: [
        LabeledField(
          key: const ValueKey('message-title'),
          label: l10n.classroomTitle,
          controller: _title,
          maxLength: 120,
        ),
        const SizedBox(height: 12),
        LabeledField(
          key: const ValueKey('message-body'),
          label: l10n.classroomMessage,
          controller: _body,
          lines: 5,
          maxLength: 2000,
        ),
        const SizedBox(height: 16),
        PrimaryButton(
          key: const ValueKey('message-send'),
          label: l10n.send,
          loading: _sending,
          height: 52,
          onPressed: _send,
        ),
      ],
    );
  }
}

/// A bottom sheet's frame: its title and fields, above the keyboard.
class _Sheet extends StatelessWidget {
  const _Sheet({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
    child: SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    ),
  );
}

// Attendance

class TakeAttendanceScreen extends ConsumerStatefulWidget {
  const TakeAttendanceScreen({super.key, required this.classId});

  final int classId;

  @override
  ConsumerState<TakeAttendanceScreen> createState() =>
      _TakeAttendanceScreenState();
}

class _TakeAttendanceScreenState extends ConsumerState<TakeAttendanceScreen> {
  /// Null: the school's today.
  String? _date;
  final _marks = <int, AttendanceStatus>{};
  bool _saving = false;

  Future<void> _chooseDay(String shown) async {
    final today = DateTime.now();
    final day = await _pickDay(
      context,
      shown,
      first: addDays(today, -7),
      last: today,
    );
    if (day != null) {
      setState(() {
        _date = day;
        _marks.clear();
      });
    }
  }

  Future<void> _save(ClassAttendance sheet) async {
    final l10n = context.l10n;
    setState(() => _saving = true);
    try {
      await ref.read(yallappApiProvider).saveClassAttendance(
        widget.classId,
        sheet.date,
        [
          for (final row in sheet.students)
            (
              studentId: row.student.id,
              status:
                  _marks[row.student.id] ??
                  row.status ??
                  AttendanceStatus.present,
              note: row.note,
            ),
        ],
      );
      ref.invalidate(
        classAttendanceProvider((classId: widget.classId, date: _date)),
      );
      if (mounted) showMessage(context, l10n.classroomAttendanceSaved);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return _ClassGate(
      classId: widget.classId,
      builder: (context, klass) {
        final async = ref.watch(
          classAttendanceProvider((classId: klass.id, date: _date)),
        );
        return Scaffold(
          appBar: AppBar(title: Text(l10n.classroomAttendanceOf(klass.name))),
          body: SafeArea(
            top: false,
            child: switch (async) {
              AsyncValue(value: final sheet?) when sheet.students.isEmpty =>
                MessageView(
                  icon: AppIcons.staff,
                  title: l10n.classroomNoStudents,
                ),
              AsyncValue(value: final sheet?) => Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
                    child: SettingsTile(
                      key: const ValueKey('attendance-day'),
                      icon: AppIcons.calendar,
                      title: l10n.classroomDate,
                      value: isoDayLabel(sheet.date),
                      onTap: () => _chooseDay(sheet.date),
                    ),
                  ),
                  if (!sheet.taken)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 4),
                      child: Text(
                        l10n.classroomNotTaken,
                        style: TextStyle(fontSize: 13, color: p.textSecondary),
                      ),
                    ),
                  Expanded(
                    child: ListView.separated(
                      key: const ValueKey('attendance-sheet'),
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                      itemCount: sheet.students.length,
                      separatorBuilder: (_, _) => const Divider(height: 1),
                      itemBuilder: (context, i) {
                        final row = sheet.students[i];
                        final status =
                            _marks[row.student.id] ??
                            row.status ??
                            AttendanceStatus.present;
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                row.student.name,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: p.text,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                children: [
                                  for (final s in AttendanceStatus.values)
                                    PillChip(
                                      key: ValueKey(
                                        'mark-${row.student.id}-${s.name}',
                                      ),
                                      label: attendanceLabel(l10n, s).$1,
                                      selected: s == status,
                                      height: 34,
                                      onTap: () => setState(
                                        () => _marks[row.student.id] = s,
                                      ),
                                    ),
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                  BottomActionBar(
                    child: PrimaryButton(
                      key: const ValueKey('attendance-save'),
                      label: l10n.classroomSaveAttendance,
                      loading: _saving,
                      height: 52,
                      onPressed: () => _save(sheet),
                    ),
                  ),
                ],
              ),
              AsyncValue(error: final e?) => ErrorView(
                error: e,
                onRetry: () => ref.invalidate(
                  classAttendanceProvider((classId: klass.id, date: _date)),
                ),
              ),
              _ => const LoadingView(),
            },
          ),
        );
      },
    );
  }
}

// A homework's work

class ClassroomHomeworkScreen extends ConsumerWidget {
  const ClassroomHomeworkScreen({super.key, required this.homeworkId});

  final int homeworkId;

  Future<void> _mark(
    BuildContext context,
    WidgetRef ref,
    ClassroomHomeworkDetail homework,
    StudentWork work,
  ) async {
    final done = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _MarkSheet(homework: homework, work: work),
    );
    if (done == true) {
      ref
        ..invalidate(classroomHomeworkProvider(homeworkId))
        ..invalidate(classHomeworkProvider(homework.classId));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(classroomHomeworkProvider(homeworkId));
    return Scaffold(
      appBar: AppBar(title: Text(async.value?.title ?? l10n.schoolHomework)),
      body: SafeArea(
        top: false,
        child: switch (async) {
          AsyncValue(value: final h?) => RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(classroomHomeworkProvider(homeworkId)),
            child: ListView(
              key: const ValueKey('classroom-homework'),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                Text(
                  [
                    h.className,
                    h.subject,
                    l10n.homeworkDueOn(isoDayLabel(h.dueOn)),
                  ].join(' · '),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                if (h.text.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(
                    h.text,
                    style: TextStyle(fontSize: 15, color: p.textBody),
                  ),
                ],
                for (final file in h.attachments) FileTile(file: file),
                const SizedBox(height: 12),
                Text(
                  l10n.classroomHandedIn(h.handedIn, h.students, h.marked),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 8),
                AppCard(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: Column(
                    children: [
                      for (final work in h.work)
                        ListTile(
                          key: ValueKey('work-${work.student.id}'),
                          contentPadding: EdgeInsets.zero,
                          title: Text(work.student.name),
                          subtitle: Text(switch (work.submission) {
                            HomeworkSubmission(late: true, handedIn: true) =>
                              l10n.homeworkLate,
                            HomeworkSubmission(handedIn: true) =>
                              l10n.homeworkHandedIn,
                            _ => l10n.classroomNotHandedIn,
                          }),
                          trailing: work.submission?.mark == null
                              ? AppIcon(
                                  AppIcons.forward,
                                  size: 20,
                                  color: p.textTertiary,
                                )
                              : SchoolPill(
                                  label: work.submission!.mark!,
                                  tone: PillTone.good,
                                ),
                          onTap: () => _mark(context, ref, h, work),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () =>
                ref.invalidate(classroomHomeworkProvider(homeworkId)),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

class _MarkSheet extends ConsumerStatefulWidget {
  const _MarkSheet({required this.homework, required this.work});

  final ClassroomHomeworkDetail homework;
  final StudentWork work;

  @override
  ConsumerState<_MarkSheet> createState() => _MarkSheetState();
}

class _MarkSheetState extends ConsumerState<_MarkSheet> {
  late final _mark = TextEditingController(
    text: widget.work.submission?.mark ?? '',
  );
  late final _feedback = TextEditingController(
    text: widget.work.submission?.feedback ?? '',
  );
  bool _saving = false;

  @override
  void dispose() {
    _mark.dispose();
    _feedback.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = context.l10n;
    final mark = _mark.text.trim();
    if (mark.isEmpty) {
      showMessage(context, l10n.classroomMarkMissing);
      return;
    }
    setState(() => _saving = true);
    try {
      final feedback = _feedback.text.trim();
      await ref
          .read(yallappApiProvider)
          .markHomework(
            widget.homework.id,
            widget.work.student.id,
            mark: mark,
            feedback: feedback.isEmpty ? null : feedback,
          );
      if (mounted) Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final submission = widget.work.submission;
    return _Sheet(
      title: widget.work.student.name,
      children: [
        if (submission?.handedIn != true)
          Text(
            l10n.classroomNotHandedIn,
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          ),
        if (submission != null && submission.text.isNotEmpty)
          Text(
            submission.text,
            style: TextStyle(fontSize: 15, color: p.textBody),
          ),
        if (submission?.file != null) FileTile(file: submission!.file!),
        const SizedBox(height: 12),
        LabeledField(
          key: const ValueKey('mark-value'),
          label: l10n.homeworkMark,
          hint: l10n.classroomMarkHint,
          controller: _mark,
          maxLength: 20,
        ),
        const SizedBox(height: 12),
        LabeledField(
          key: const ValueKey('mark-feedback'),
          label: l10n.classroomFeedback,
          controller: _feedback,
          lines: 3,
          maxLength: 1000,
        ),
        const SizedBox(height: 16),
        PrimaryButton(
          key: const ValueKey('mark-save'),
          label: l10n.save,
          loading: _saving,
          height: 52,
          onPressed: _save,
        ),
      ],
    );
  }
}

// Scores

class ScoresScreen extends ConsumerStatefulWidget {
  const ScoresScreen({super.key, required this.assessmentId});

  final int assessmentId;

  @override
  ConsumerState<ScoresScreen> createState() => _ScoresScreenState();
}

class _ScoresScreenState extends ConsumerState<ScoresScreen> {
  final _fields = <int, TextEditingController>{};
  bool _saving = false;

  @override
  void dispose() {
    for (final field in _fields.values) {
      field.dispose();
    }
    super.dispose();
  }

  TextEditingController _field(StudentMark row) => _fields.putIfAbsent(
    row.student.id,
    () => TextEditingController(
      text: row.score == null ? '' : scoreText(row.score!),
    ),
  );

  Future<void> _save(AssessmentScores scores) async {
    final l10n = context.l10n;
    final items = <({int studentId, double? score})>[];
    for (final row in scores.students) {
      final text = _field(row).text.trim().replaceAll(',', '.');
      final score = text.isEmpty ? null : double.tryParse(text);
      if (text.isNotEmpty &&
          (score == null || score < 0 || score > scores.assessment.maxScore)) {
        showMessage(
          context,
          l10n.classroomScoreRange(scoreText(scores.assessment.maxScore)),
        );
        return;
      }
      items.add((studentId: row.student.id, score: score));
    }
    setState(() => _saving = true);
    try {
      await ref
          .read(yallappApiProvider)
          .saveAssessmentScores(scores.assessment.id, items);
      ref.invalidate(classAssessmentsProvider(scores.assessment.classId));
      if (mounted) showMessage(context, l10n.classroomScoresSaved);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(assessmentScoresProvider(widget.assessmentId));
    return Scaffold(
      appBar: AppBar(title: Text(async.value?.assessment.title ?? '')),
      body: SafeArea(
        top: false,
        child: switch (async) {
          AsyncValue(value: final scores?) when scores.students.isEmpty =>
            MessageView(icon: AppIcons.staff, title: l10n.classroomNoStudents),
          AsyncValue(value: final scores?) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
                child: Text(
                  [
                    assessmentKindLabel(l10n, scores.assessment.kind),
                    scores.assessment.subject,
                    isoDayLabel(scores.assessment.date),
                    l10n.classroomOutOf(scoreText(scores.assessment.maxScore)),
                  ].join(' · '),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ),
              Expanded(
                child: ListView.separated(
                  key: const ValueKey('scores-sheet'),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                  itemCount: scores.students.length,
                  separatorBuilder: (_, _) => const Divider(height: 1),
                  itemBuilder: (context, i) {
                    final row = scores.students[i];
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              row.student.name,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600,
                                color: p.text,
                              ),
                            ),
                          ),
                          SizedBox(
                            width: 96,
                            child: TextField(
                              key: ValueKey('score-${row.student.id}'),
                              controller: _field(row),
                              textAlign: TextAlign.center,
                              keyboardType:
                                  const TextInputType.numberWithOptions(
                                    decimal: true,
                                  ),
                              inputFormatters: [
                                FilteringTextInputFormatter.allow(
                                  RegExp(r'[0-9.,]'),
                                ),
                              ],
                              decoration: InputDecoration(
                                hintText: '–',
                                suffixText:
                                    '/${scoreText(scores.assessment.maxScore)}',
                                isDense: true,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              BottomActionBar(
                child: PrimaryButton(
                  key: const ValueKey('scores-save'),
                  label: l10n.classroomSaveScores,
                  loading: _saving,
                  height: 52,
                  onPressed: () => _save(scores),
                ),
              ),
            ],
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () =>
                ref.invalidate(assessmentScoresProvider(widget.assessmentId)),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}
