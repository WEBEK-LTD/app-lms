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
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/teachers/teacher_widgets.dart' show LabeledField;
import '../data/report_providers.dart';
import '../data/school_providers.dart';
import '../widgets/school_widgets.dart';

/// 113.5 The teacher's side of the reports with the school: a class's
/// progress through the syllabus of each subject they teach in it (a lesson
/// or topic marked covered on a day, with a note), and their reports to the
/// school on a student or a class, written on the school's templates: kept
/// as drafts, sent, sent back with the school's comment and sent again, or
/// approved.

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

// The syllabus

(String, PillTone) _statusLabel(BuildContext context, SyllabusSubject s) {
  final l10n = context.l10n;
  return switch (s.status) {
    SyllabusStatus.behind => (l10n.syllabusBehind(s.behindBy), PillTone.bad),
    SyllabusStatus.ahead => (l10n.syllabusAhead, PillTone.neutral),
    SyllabusStatus.onPlan => (l10n.syllabusOnPlan, PillTone.good),
  };
}

class SyllabusScreen extends ConsumerWidget {
  const SyllabusScreen({super.key, required this.classId});

  final int classId;

  Future<void> _topic(
    BuildContext context,
    WidgetRef ref,
    ClassSyllabus syllabus,
    SyllabusTopic topic,
  ) async {
    await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _TopicSheet(syllabus: syllabus, topic: topic),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(classSyllabusProvider(classId));
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(
          [l10n.classroomSyllabus, ?async.value?.className].join(' · '),
        ),
      ),
      body: SafeArea(
        top: false,
        child: switch (async) {
          AsyncValue(value: final s?) when s.subjects.isEmpty => MessageView(
            icon: AppIcons.courses,
            title: l10n.syllabusNone,
            message: l10n.syllabusNoneMessage,
          ),
          AsyncValue(value: final s?) => RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(classSyllabusProvider(classId)),
            child: ListView(
              key: const ValueKey('class-syllabus'),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                for (final subject in s.subjects) ...[
                  _SubjectCard(subject: subject),
                  for (final unit in subject.units) ...[
                    const SizedBox(height: 10),
                    Text(
                      unit.title,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 4),
                    AppCard(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      child: Column(
                        children: [
                          for (final topic in unit.topics)
                            _TopicRow(
                              topic: topic,
                              onTap: () => _topic(context, ref, s, topic),
                            ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                ],
              ],
            ),
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(classSyllabusProvider(classId)),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

class _SubjectCard extends StatelessWidget {
  const _SubjectCard({required this.subject});

  final SyllabusSubject subject;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final (label, tone) = _statusLabel(context, subject);
    return AppCard(
      key: ValueKey('syllabus-subject-${subject.subjectId}'),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
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
              const SizedBox(width: 8),
              Flexible(
                child: SchoolPill(label: label, tone: tone),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ProgressTrack(
            percent: subject.percent,
            fill: subject.status == SyllabusStatus.behind ? p.danger : null,
          ),
          const SizedBox(height: 8),
          Text(
            [
              l10n.syllabusCovered(
                subject.covered,
                subject.total,
                subject.percent,
              ),
              l10n.syllabusPlanned(subject.plannedPercent),
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          if (subject.plannedTopic != null) ...[
            const SizedBox(height: 4),
            Text(
              l10n.syllabusPlanNow(subject.plannedTopic!),
              style: TextStyle(fontSize: 13, color: p.textBody),
            ),
          ],
        ],
      ),
    );
  }
}

class _TopicRow extends StatelessWidget {
  const _TopicRow({required this.topic, required this.onTap});

  final SyllabusTopic topic;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final late = topic.due && !topic.covered;
    return ListTile(
      key: ValueKey('topic-${topic.id}'),
      contentPadding: EdgeInsets.zero,
      onTap: onTap,
      leading: AppIcon(
        topic.covered ? AppIcons.checkCircle : AppIcons.schedule,
        size: 22,
        color: topic.covered
            ? p.success
            : late
            ? p.danger
            : p.textTertiary,
      ),
      title: Text(topic.title),
      subtitle: Text(
        [
          l10n.syllabusDays(
            isoDayLabel(topic.startsOn),
            isoDayLabel(topic.endsOn),
          ),
          if (topic.coveredOn != null)
            l10n.syllabusCoveredOn(isoDayLabel(topic.coveredOn!))
          else if (late)
            l10n.syllabusNotCovered,
          ?topic.note,
        ].join(' · '),
        style: TextStyle(color: late ? p.danger : p.textSecondary),
      ),
    );
  }
}

/// Marks a topic covered on a day (today by default) with a note, or not.
class _TopicSheet extends ConsumerStatefulWidget {
  const _TopicSheet({required this.syllabus, required this.topic});

  final ClassSyllabus syllabus;
  final SyllabusTopic topic;

  @override
  ConsumerState<_TopicSheet> createState() => _TopicSheetState();
}

class _TopicSheetState extends ConsumerState<_TopicSheet> {
  late final _note = TextEditingController(text: widget.topic.note ?? '');
  late String _day = widget.topic.coveredOn ?? widget.syllabus.today;
  bool _saving = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _save({required bool covered}) async {
    final l10n = context.l10n;
    final api = ref.read(yallappApiProvider);
    final classId = widget.syllabus.classId;
    setState(() => _saving = true);
    try {
      final note = _note.text.trim();
      if (covered) {
        await api.markTopicCovered(
          classId,
          widget.topic.id,
          coveredOn: _day,
          note: note.isEmpty ? null : note,
        );
      } else {
        await api.unmarkTopicCovered(classId, widget.topic.id);
      }
      ref.invalidate(classSyllabusProvider(classId));
      if (!mounted) return;
      showMessage(context, l10n.syllabusSaved);
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
    final today = parseIsoDate(widget.syllabus.today) ?? DateTime.now();
    return _Sheet(
      title: widget.topic.title,
      children: [
        SettingsTile(
          key: const ValueKey('topic-day'),
          icon: AppIcons.calendar,
          title: l10n.syllabusCoveredDay,
          value: isoDayLabel(_day),
          onTap: () async {
            final picked = await showDatePicker(
              context: context,
              initialDate: parseIsoDate(_day) ?? today,
              firstDate: addDays(today, -365),
              lastDate: today,
            );
            if (picked != null) setState(() => _day = isoDate(picked));
          },
        ),
        const SizedBox(height: 8),
        LabeledField(
          key: const ValueKey('topic-note'),
          label: l10n.syllabusNote,
          controller: _note,
          lines: 2,
          maxLength: 500,
        ),
        const SizedBox(height: 12),
        PrimaryButton(
          key: const ValueKey('topic-mark'),
          label: l10n.syllabusMarkCovered,
          loading: _saving,
          height: 52,
          onPressed: () => _save(covered: true),
        ),
        if (widget.topic.covered) ...[
          const SizedBox(height: 8),
          SecondaryButton(
            key: const ValueKey('topic-unmark'),
            label: l10n.syllabusUnmark,
            height: 48,
            onPressed: _saving ? null : () => _save(covered: false),
          ),
        ],
      ],
    );
  }
}

// The teacher's reports

const _tabs = [
  ReportStatus.draft,
  ReportStatus.returned,
  ReportStatus.sent,
  ReportStatus.approved,
];

String _statusName(AppLocalizations l10n, ReportStatus s) => switch (s) {
  ReportStatus.draft => l10n.reportsDrafts,
  ReportStatus.returned => l10n.reportsReturned,
  ReportStatus.sent => l10n.reportsSent,
  ReportStatus.approved => l10n.reportsApproved,
};

PillTone _statusTone(ReportStatus s) => switch (s) {
  ReportStatus.draft => PillTone.neutral,
  ReportStatus.returned => PillTone.bad,
  ReportStatus.sent => PillTone.warn,
  ReportStatus.approved => PillTone.good,
};

class TeacherReportsScreen extends ConsumerStatefulWidget {
  const TeacherReportsScreen({super.key});

  @override
  ConsumerState<TeacherReportsScreen> createState() =>
      _TeacherReportsScreenState();
}

class _TeacherReportsScreenState extends ConsumerState<TeacherReportsScreen> {
  int _tab = 0;

  Future<void> _write() async {
    final made = await showModalBottomSheet<TeacherReport>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const _NewReportSheet(),
    );
    if (made == null || !mounted) return;
    ref.invalidate(teacherReportsProvider(ReportStatus.draft));
    context.push(Paths.classroomReport(made.id));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final status = _tabs[_tab];
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.classroomReports),
      ),
      body: SafeArea(
        top: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 4),
              child: PrimaryButton(
                key: const ValueKey('report-write'),
                label: l10n.reportsWrite,
                icon: AppIcons.add,
                height: 46,
                onPressed: _write,
              ),
            ),
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
              child: Row(
                children: [
                  for (final (i, s) in _tabs.indexed) ...[
                    PillChip(
                      key: ValueKey('reports-tab-${s.name}'),
                      label: _statusName(l10n, s),
                      selected: i == _tab,
                      height: 36,
                      onTap: () => setState(() => _tab = i),
                    ),
                    const SizedBox(width: 6),
                  ],
                ],
              ),
            ),
            Expanded(
              child: PagedItems<TeacherReport>(
                key: ValueKey('reports-${status.name}'),
                state: ref.watch(teacherReportsProvider(status)),
                controller: ref.read(teacherReportsProvider(status).notifier),
                empty: MessageView(
                  icon: AppIcons.assignment,
                  title: l10n.reportsNone,
                  compact: true,
                ),
                item: (context, r) => _ReportTile(report: r),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ReportTile extends StatelessWidget {
  const _ReportTile({required this.report});

  final TeacherReport report;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return AppCard(
      key: ValueKey('report-${report.id}'),
      padding: const EdgeInsets.all(14),
      onTap: () => context.push(Paths.classroomReport(report.id)),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  report.templateName,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    report.about,
                    if (report.student != null) ?report.className,
                    ?report.subject,
                    shortDate(report.updatedAt.toLocal()),
                  ].join(' · '),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: SchoolPill(
              label: _statusName(l10n, report.status),
              tone: _statusTone(report.status),
            ),
          ),
        ],
      ),
    );
  }
}

/// Starts a report: the template, then the class (and the student, for a
/// report on a student) and, if the teacher likes, a subject.
class _NewReportSheet extends ConsumerStatefulWidget {
  const _NewReportSheet();

  @override
  ConsumerState<_NewReportSheet> createState() => _NewReportSheetState();
}

class _NewReportSheetState extends ConsumerState<_NewReportSheet> {
  ReportTemplate? _template;
  ClassroomClass? _class;
  int? _student;
  int? _subject;
  bool _saving = false;

  Future<void> _start() async {
    final l10n = context.l10n;
    final template = _template;
    final klass = _class;
    if (template == null ||
        klass == null ||
        (template.kind == ReportKind.student && _student == null)) {
      showMessage(context, l10n.reportsChooseMissing);
      return;
    }
    setState(() => _saving = true);
    try {
      final made = await ref
          .read(yallappApiProvider)
          .createTeacherReport(
            ReportInput(
              templateId: template.id,
              studentId: template.kind == ReportKind.student ? _student : null,
              classId: template.kind == ReportKind.classroom ? klass.id : null,
              subjectId: _subject,
            ),
          );
      if (mounted) Navigator.of(context).pop(made);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final templates = ref.watch(reportTemplatesProvider);
    final classes = ref.watch(classroomMeProvider).value?.classes ?? const [];
    final klass = _class;
    final students = klass == null
        ? const <SchoolStudent>[]
        : ref.watch(classStudentsProvider(klass.id)).value ?? const [];
    return _Sheet(
      title: l10n.reportsWrite,
      children: switch (templates) {
        AsyncValue(value: final list?) when list.isEmpty => [
          Text(l10n.reportsNoTemplates),
        ],
        AsyncValue(value: final list?) => [
          DropdownButtonFormField<int>(
            key: const ValueKey('report-template'),
            isExpanded: true,
            initialValue: _template?.id,
            decoration: InputDecoration(labelText: l10n.reportsTemplate),
            items: [
              for (final t in list)
                DropdownMenuItem(value: t.id, child: Text(t.name)),
            ],
            onChanged: (id) => setState(
              () => _template = list.where((t) => t.id == id).firstOrNull,
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            key: const ValueKey('report-class'),
            isExpanded: true,
            initialValue: _class?.id,
            decoration: InputDecoration(labelText: l10n.reportsClass),
            items: [
              for (final c in classes)
                DropdownMenuItem(value: c.id, child: Text(c.name)),
            ],
            onChanged: (id) => setState(() {
              _class = classes.where((c) => c.id == id).firstOrNull;
              _student = null;
              _subject = null;
            }),
          ),
          if (_template?.kind == ReportKind.student && klass != null) ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              key: ValueKey('report-student-${klass.id}'),
              isExpanded: true,
              initialValue: _student,
              decoration: InputDecoration(labelText: l10n.reportsStudent),
              items: [
                for (final s in students)
                  DropdownMenuItem(value: s.id, child: Text(s.name)),
              ],
              onChanged: (id) => setState(() => _student = id),
            ),
          ],
          if (klass != null && klass.subjects.isNotEmpty) ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<int?>(
              key: ValueKey('report-subject-${klass.id}'),
              isExpanded: true,
              initialValue: _subject,
              decoration: InputDecoration(labelText: l10n.reportsSubject),
              items: [
                DropdownMenuItem(child: Text(l10n.reportsNoSubject)),
                for (final s in klass.subjects)
                  DropdownMenuItem(value: s.id, child: Text(s.name)),
              ],
              onChanged: (id) => setState(() => _subject = id),
            ),
          ],
          const SizedBox(height: 16),
          PrimaryButton(
            key: const ValueKey('report-start'),
            label: l10n.reportsStart,
            loading: _saving,
            height: 52,
            onPressed: _start,
          ),
        ],
        AsyncValue(error: final e?) => [
          ErrorView(
            error: e,
            onRetry: () => ref.invalidate(reportTemplatesProvider),
          ),
        ],
        _ => [const SizedBox(height: 120, child: LoadingView())],
      },
    );
  }
}

/// One of the teacher's reports: its fields to fill in while it is a draft
/// or sent back, the school's comments, saving and sending.
class TeacherReportScreen extends ConsumerWidget {
  const TeacherReportScreen({super.key, required this.reportId});

  final int reportId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final async = ref.watch(teacherReportProvider(reportId));
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(async.value?.templateName ?? l10n.classroomReports),
      ),
      body: SafeArea(
        top: false,
        child: switch (async) {
          AsyncValue(value: final r?) => _ReportForm(
            key: ValueKey('report-form-${r.id}-${r.status.name}'),
            report: r,
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(teacherReportProvider(reportId)),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

class _ReportForm extends ConsumerStatefulWidget {
  const _ReportForm({super.key, required this.report});

  final TeacherReport report;

  @override
  ConsumerState<_ReportForm> createState() => _ReportFormState();
}

class _ReportFormState extends ConsumerState<_ReportForm> {
  late final _texts = {
    for (final f in widget.report.fields)
      if (f.type == ReportFieldType.text)
        f.id: TextEditingController(
          text: '${widget.report.answers[f.id] ?? ''}',
        ),
  };
  late final _picked = <String, Object>{
    for (final f in widget.report.fields)
      if (f.type != ReportFieldType.text && widget.report.answers[f.id] != null)
        f.id: widget.report.answers[f.id]!,
  };
  final _note = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    for (final c in _texts.values) {
      c.dispose();
    }
    _note.dispose();
    super.dispose();
  }

  ReportAnswers get _answers => {
    ..._picked,
    for (final MapEntry(:key, :value) in _texts.entries)
      if (value.text.trim().isNotEmpty) key: value.text.trim(),
  };

  void _refresh() {
    ref
      ..invalidate(teacherReportProvider(widget.report.id))
      ..invalidate(teacherReportsProvider(ReportStatus.draft))
      ..invalidate(teacherReportsProvider(ReportStatus.returned))
      ..invalidate(teacherReportsProvider(ReportStatus.sent));
  }

  Future<void> _save({required bool send}) async {
    final l10n = context.l10n;
    final answers = _answers;
    if (send) {
      final missing = widget.report.fields
          .where((f) => f.required && !answers.containsKey(f.id))
          .firstOrNull;
      if (missing != null) {
        showMessage(context, l10n.reportsRequiredMissing(missing.label));
        return;
      }
    }
    final api = ref.read(yallappApiProvider);
    setState(() => _saving = true);
    try {
      await api.updateTeacherReport(
        widget.report.id,
        ReportInput(subjectId: widget.report.subjectId, answers: answers),
      );
      if (send) {
        final note = _note.text.trim();
        await api.sendTeacherReport(
          widget.report.id,
          note: note.isEmpty ? null : note,
        );
      }
      if (!mounted) return;
      showMessage(
        context,
        send ? l10n.reportsSentDone : l10n.reportsDraftSaved,
      );
      _refresh();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _delete() async {
    final l10n = context.l10n;
    final sure = await confirmAction(
      context,
      title: l10n.reportsDelete,
      message: l10n.reportsDeleteConfirm,
      confirmLabel: l10n.reportsDelete,
      destructive: true,
    );
    if (!sure || !mounted) return;
    try {
      await ref.read(yallappApiProvider).deleteTeacherReport(widget.report.id);
      ref.invalidate(teacherReportsProvider(ReportStatus.draft));
      if (!mounted) return;
      showMessage(context, l10n.reportsDeleted);
      context.pop();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final r = widget.report;
    final editable = r.editable;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: ListView(
            key: const ValueKey('teacher-report'),
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      [
                        r.about,
                        if (r.student != null) ?r.className,
                        ?r.subject,
                        if (r.period case final period?)
                          l10n.reportsPeriod(
                            isoDayLabel(period.from),
                            isoDayLabel(period.to),
                          ),
                      ].join(' · '),
                      style: TextStyle(fontSize: 14, color: p.textSecondary),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: SchoolPill(
                      label: _statusName(l10n, r.status),
                      tone: _statusTone(r.status),
                    ),
                  ),
                ],
              ),
              if (r.status == ReportStatus.sent ||
                  r.status == ReportStatus.approved) ...[
                const SizedBox(height: 6),
                Text(
                  [
                    if (r.status == ReportStatus.sent)
                      r.read ? l10n.reportsRead : l10n.reportsNotRead,
                    if (r.shared) l10n.reportsShared,
                  ].join(' · '),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ],
              if (r.status == ReportStatus.returned) ...[
                const SizedBox(height: 10),
                AppCard(
                  key: const ValueKey('report-returned'),
                  padding: const EdgeInsets.all(12),
                  child: Text(
                    l10n.reportsReturnedBanner,
                    style: TextStyle(fontSize: 14, color: p.danger),
                  ),
                ),
              ],
              if (r.comments.isNotEmpty) ...[
                const SizedBox(height: 16),
                SectionHeader(title: l10n.reportsComments, size: 16),
                const SizedBox(height: 4),
                for (final c in r.comments) _CommentCard(comment: c),
              ],
              const SizedBox(height: 16),
              for (final field in r.fields) ...[
                if (editable)
                  _FieldInput(
                    field: field,
                    controller: _texts[field.id],
                    value: _picked[field.id],
                    onPick: (v) => setState(() {
                      if (v == null) {
                        _picked.remove(field.id);
                      } else {
                        _picked[field.id] = v;
                      }
                    }),
                  )
                else
                  _FieldAnswer(field: field, value: r.answers[field.id]),
                const SizedBox(height: 16),
              ],
              if (!editable)
                Text(
                  l10n.reportsLocked,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              if (editable)
                LabeledField(
                  key: const ValueKey('report-note'),
                  label: l10n.reportsNoteForSchool,
                  controller: _note,
                  lines: 2,
                  maxLength: 1000,
                ),
              if (r.status == ReportStatus.draft) ...[
                const SizedBox(height: 4),
                TextButton.icon(
                  key: const ValueKey('report-delete'),
                  onPressed: _saving ? null : _delete,
                  icon: AppIcon(AppIcons.delete, size: 20, color: p.danger),
                  label: Text(
                    l10n.reportsDelete,
                    style: TextStyle(color: p.danger),
                  ),
                ),
              ],
            ],
          ),
        ),
        if (editable)
          BottomActionBar(
            child: Row(
              children: [
                Expanded(
                  child: SecondaryButton(
                    key: const ValueKey('report-save'),
                    label: l10n.reportsSaveDraft,
                    height: 52,
                    onPressed: _saving ? null : () => _save(send: false),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: PrimaryButton(
                    key: const ValueKey('report-send'),
                    label: l10n.reportsSend,
                    loading: _saving,
                    height: 52,
                    onPressed: () => _save(send: true),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _CommentCard extends StatelessWidget {
  const _CommentCard({required this.comment});

  final ReportComment comment;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: AppCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              [
                comment.fromSchool
                    ? l10n.reportsFromSchool
                    : l10n.reportsFromYou,
                shortDate(comment.at.toLocal()),
              ].join(' · '),
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: comment.fromSchool ? p.primary : p.textSecondary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              comment.text,
              style: TextStyle(fontSize: 15, color: p.textBody),
            ),
          ],
        ),
      ),
    );
  }
}

/// A field to fill in: text, one of the choices, or a rating from 1 to 5.
class _FieldInput extends StatelessWidget {
  const _FieldInput({
    required this.field,
    required this.controller,
    required this.value,
    required this.onPick,
  });

  final ReportField field;
  final TextEditingController? controller;
  final Object? value;
  final ValueChanged<Object?> onPick;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final label = field.required ? '${field.label} *' : field.label;
    if (field.type == ReportFieldType.text) {
      return LabeledField(
        key: ValueKey('field-${field.id}'),
        label: label,
        controller: controller!,
        lines: 3,
        maxLength: 2000,
      );
    }
    final choices = field.type == ReportFieldType.rating
        ? [for (var i = 1; i <= 5; i++) i]
        : field.options;
    return Column(
      key: ValueKey('field-${field.id}'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: p.text,
          ),
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 6,
          runSpacing: 6,
          children: [
            for (final c in choices)
              PillChip(
                key: ValueKey('field-${field.id}-$c'),
                label: '$c',
                selected: value == c,
                height: 36,
                onTap: () => onPick(value == c ? null : c),
              ),
          ],
        ),
      ],
    );
  }
}

class _FieldAnswer extends StatelessWidget {
  const _FieldAnswer({required this.field, required this.value});

  final ReportField field;
  final Object? value;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          field.label,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: p.text,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value == null
              ? '—'
              : field.type == ReportFieldType.rating
              ? l10n.reportsRatingOf(value! as int)
              : '$value',
          style: TextStyle(fontSize: 15, color: p.textBody),
        ),
      ],
    );
  }
}
