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
import '../data/university_providers.dart';
import '../widgets/school_widgets.dart';
import 'university_screens.dart'
    show meetingsText, uniEnrolmentLabel, uniStatusLabel, uniStatusTone;

/// 113.9 The Classroom tab of a university, for its lecturers: their
/// sections this term (each lecture's attendance, the grades and publishing
/// the results) and the students they advise (approving their registration
/// or sending it back).
class LecturerHomeView extends ConsumerWidget {
  const LecturerHomeView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    return switch (ref.watch(lecturerHomeProvider)) {
      AsyncValue(value: final home?) => RefreshIndicator(
        onRefresh: () async => ref.invalidate(lecturerHomeProvider),
        child: ListView(
          key: const ValueKey('lecturer-home'),
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          children: [
            if (home.term != null)
              Text(
                home.term!.name,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            const SizedBox(height: 8),
            SettingsGroup(
              title: l10n.uniAdvisees,
              children: [
                SettingsTile(
                  key: const ValueKey('lecturer-advisees'),
                  icon: AppIcons.people,
                  title: l10n.uniAdvisees,
                  subtitle: l10n.uniAdviseesWaiting(home.adviseesWaiting),
                  onTap: () => context.push(Paths.classroomAdvisees),
                ),
              ],
            ),
            const SizedBox(height: 20),
            SectionHeader(title: l10n.uniMySections, size: 16),
            const SizedBox(height: 4),
            if (home.sections.isEmpty)
              Text(
                l10n.uniNoTeaching,
                style: TextStyle(fontSize: 14, color: p.textSecondary),
              ),
            for (final section in home.sections) ...[
              AppCard(
                key: ValueKey('lecturer-section-${section.id}'),
                padding: const EdgeInsets.all(14),
                onTap: () => context.push(Paths.classroomSection(section.id)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            '${section.label} · ${section.course.title}',
                            style: TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: p.text,
                            ),
                          ),
                        ),
                        if (section.resultsPublished)
                          SchoolPill(
                            label: l10n.uniPublished,
                            tone: PillTone.good,
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      [
                        l10n.uniStudents(section.students),
                        meetingsText(section.meetings),
                      ].where((x) => x.isNotEmpty).join(' · '),
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
        onRetry: () => ref.invalidate(lecturerHomeProvider),
      ),
      _ => const LoadingView(),
    };
  }
}

// A section: its students and grades

class LecturerSectionScreen extends ConsumerStatefulWidget {
  const LecturerSectionScreen({super.key, required this.sectionId});

  final int sectionId;

  @override
  ConsumerState<LecturerSectionScreen> createState() =>
      _LecturerSectionScreenState();
}

class _LecturerSectionScreenState extends ConsumerState<LecturerSectionScreen> {
  /// The grades chosen here, by student; '' clears one.
  final _grades = <int, String>{};
  final _marks = <int, TextEditingController>{};
  bool _busy = false;

  @override
  void dispose() {
    for (final c in _marks.values) {
      c.dispose();
    }
    super.dispose();
  }

  TextEditingController _mark(int studentId, double? value) =>
      _marks.putIfAbsent(
        studentId,
        () =>
            TextEditingController(text: value == null ? '' : scoreText(value)),
      );

  Future<void> _save(UniSectionDetail detail) async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    try {
      await ref.read(yallappApiProvider).saveSectionGrades(widget.sectionId, [
        for (final row in detail.students.where((r) => r.enrolled))
          () {
            final chosen = _grades[row.student.id];
            final markText = _marks[row.student.id]?.text.trim().replaceAll(
              ',',
              '.',
            );
            final mark = markText == null
                ? row.mark
                : markText.isEmpty
                ? null
                : double.tryParse(markText);
            // A percent changed without a letter gets the scale's letter.
            final grade = chosen != null
                ? (chosen.isEmpty ? null : chosen)
                : (markText != null && mark != row.mark ? null : row.grade);
            return (studentId: row.student.id, grade: grade, mark: mark);
          }(),
      ]);
      _grades.clear();
      for (final c in _marks.values) {
        c.dispose();
      }
      _marks.clear();
      ref.invalidate(lecturerSectionProvider(widget.sectionId));
      if (mounted) showMessage(context, l10n.uniGradesSaved);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _publish() async {
    final l10n = context.l10n;
    final yes = await confirmAction(
      context,
      title: l10n.uniPublish,
      message: l10n.uniPublishConfirm,
      confirmLabel: l10n.uniPublish,
    );
    if (!yes) return;
    setState(() => _busy = true);
    try {
      await ref
          .read(yallappApiProvider)
          .publishSectionResults(widget.sectionId);
      ref
        ..invalidate(lecturerSectionProvider(widget.sectionId))
        ..invalidate(lecturerHomeProvider);
      if (mounted) showMessage(context, l10n.uniResultsPublished);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(lecturerSectionProvider(widget.sectionId));
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(async.value?.section.label ?? ''),
      ),
      body: SafeArea(
        top: false,
        child: switch (async) {
          AsyncValue(value: final detail?) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: ListView(
                  key: const ValueKey('lecturer-section'),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  children: [
                    Text(
                      detail.section.course.title,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                    Text(
                      [
                        detail.term.name,
                        meetingsText(detail.section.meetings),
                      ].where((x) => x.isNotEmpty).join(' · '),
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                    const SizedBox(height: 12),
                    SettingsTile(
                      key: const ValueKey('section-attendance'),
                      icon: AppIcons.attendance,
                      title: l10n.classroomTakeAttendance,
                      onTap: () => context.push(
                        Paths.sectionAttendance(widget.sectionId),
                      ),
                    ),
                    if (detail.resultsPublishedAt != null)
                      Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: SchoolPill(
                          key: const ValueKey('section-published'),
                          label: l10n.uniPublished,
                          tone: PillTone.good,
                        ),
                      ),
                    const SizedBox(height: 16),
                    SectionHeader(
                      title: l10n.uniStudents(detail.students.length),
                      size: 16,
                    ),
                    for (final row in detail.students)
                      Padding(
                        key: ValueKey('grade-row-${row.student.id}'),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    row.student.name,
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: p.text,
                                    ),
                                  ),
                                  if (!row.enrolled)
                                    Text(
                                      l10n.uniEnrolPending,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: p.textSecondary,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                            if (row.enrolled) ...[
                              SizedBox(
                                width: 76,
                                child: TextField(
                                  key: ValueKey('mark-${row.student.id}'),
                                  controller: _mark(row.student.id, row.mark),
                                  keyboardType:
                                      const TextInputType.numberWithOptions(
                                        decimal: true,
                                      ),
                                  decoration: InputDecoration(
                                    labelText: l10n.uniMark,
                                    isDense: true,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              DropdownButton<String>(
                                key: ValueKey('grade-${row.student.id}'),
                                value:
                                    _grades[row.student.id] ?? row.grade ?? '',
                                onChanged: (value) => setState(
                                  () => _grades[row.student.id] = value ?? '',
                                ),
                                items: [
                                  DropdownMenuItem(
                                    value: '',
                                    child: Text(l10n.uniNoGrade),
                                  ),
                                  for (final step in detail.scale)
                                    DropdownMenuItem(
                                      value: step.letter,
                                      child: Text(step.letter),
                                    ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              BottomActionBar(
                child: Row(
                  children: [
                    Expanded(
                      child: SecondaryButton(
                        key: const ValueKey('section-publish'),
                        label: l10n.uniPublish,
                        height: 52,
                        onPressed: _busy ? null : _publish,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: PrimaryButton(
                        key: const ValueKey('section-save-grades'),
                        label: l10n.uniSaveGrades,
                        loading: _busy,
                        height: 52,
                        onPressed: () => _save(detail),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () =>
                ref.invalidate(lecturerSectionProvider(widget.sectionId)),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

// A lecture's attendance

class SectionAttendanceScreen extends ConsumerStatefulWidget {
  const SectionAttendanceScreen({super.key, required this.sectionId});

  final int sectionId;

  @override
  ConsumerState<SectionAttendanceScreen> createState() =>
      _SectionAttendanceScreenState();
}

class _SectionAttendanceScreenState
    extends ConsumerState<SectionAttendanceScreen> {
  /// Null: the university's today.
  String? _date;
  final _marks = <int, AttendanceStatus>{};
  bool _saving = false;

  ({int section, String? date}) get _query =>
      (section: widget.sectionId, date: _date);

  Future<void> _chooseDay(String shown) async {
    final today = DateTime.now();
    final first = addDays(today, -14);
    final initial = parseIsoDate(shown) ?? today;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isBefore(first) ? first : initial,
      firstDate: first,
      lastDate: today,
    );
    if (picked != null) {
      setState(() {
        _date = isoDate(picked);
        _marks.clear();
      });
    }
  }

  Future<void> _save(UniSectionAttendance sheet) async {
    final l10n = context.l10n;
    setState(() => _saving = true);
    try {
      await ref.read(yallappApiProvider).saveSectionAttendance(
        widget.sectionId,
        sheet.date,
        [
          for (final row in sheet.students)
            (
              studentId: row.student.id,
              status:
                  _marks[row.student.id] ??
                  row.status ??
                  AttendanceStatus.present,
            ),
        ],
      );
      ref.invalidate(sectionAttendanceProvider(_query));
      if (mounted) showMessage(context, l10n.uniAttendanceSaved);
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
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.classroomTakeAttendance),
      ),
      body: SafeArea(
        top: false,
        child: switch (ref.watch(sectionAttendanceProvider(_query))) {
          AsyncValue(value: final sheet?) when sheet.students.isEmpty =>
            MessageView(icon: AppIcons.staff, title: l10n.classroomNoStudents),
          AsyncValue(value: final sheet?) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
                child: SettingsTile(
                  key: const ValueKey('section-attendance-day'),
                  icon: AppIcons.calendar,
                  title: l10n.classroomDate,
                  value: isoDayLabel(sheet.date),
                  onTap: () => _chooseDay(sheet.date),
                ),
              ),
              Expanded(
                child: ListView.separated(
                  key: const ValueKey('section-attendance-sheet'),
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
                                    'uni-mark-${row.student.id}-${s.name}',
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
                  key: const ValueKey('section-attendance-save'),
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
            onRetry: () => ref.invalidate(sectionAttendanceProvider(_query)),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

// Advisees

class AdviseesScreen extends ConsumerWidget {
  const AdviseesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(l10n.uniAdvisees),
      ),
      body: SafeArea(
        top: false,
        child: switch (ref.watch(adviseesProvider)) {
          AsyncValue(value: final list?) when list.items.isEmpty => MessageView(
            icon: AppIcons.people,
            title: l10n.uniNoAdvisees,
          ),
          AsyncValue(value: final list?) => ListView(
            key: const ValueKey('advisees'),
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            children: [
              if (list.term != null)
                Text(
                  list.term!.name,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              for (final item in list.items) ...[
                const SizedBox(height: 10),
                AppCard(
                  key: ValueKey('advisee-${item.student.id}'),
                  padding: const EdgeInsets.all(14),
                  onTap: () =>
                      context.push(Paths.classroomAdvisee(item.student.id)),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item.student.name,
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: p.text,
                              ),
                            ),
                            Text(
                              [
                                ?item.programName,
                                l10n.uniCredits(creditsText(item.credits)),
                              ].join(' · '),
                              style: TextStyle(
                                fontSize: 13,
                                color: p.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      SchoolPill(
                        label: uniStatusLabel(l10n, item.status),
                        tone: uniStatusTone(item.status),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(adviseesProvider),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

class AdviseeScreen extends ConsumerStatefulWidget {
  const AdviseeScreen({super.key, required this.studentId});

  final int studentId;

  @override
  ConsumerState<AdviseeScreen> createState() => _AdviseeScreenState();
}

class _AdviseeScreenState extends ConsumerState<AdviseeScreen> {
  final _note = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _decide(bool approve) async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    try {
      final note = _note.text.trim();
      await ref
          .read(yallappApiProvider)
          .decideAdvisee(
            widget.studentId,
            approve: approve,
            note: note.isEmpty ? null : note,
          );
      ref
        ..invalidate(adviseeProvider(widget.studentId))
        ..invalidate(adviseesProvider)
        ..invalidate(lecturerHomeProvider);
      if (mounted) {
        showMessage(context, approve ? l10n.uniApproved : l10n.uniSentBack);
      }
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(adviseeProvider(widget.studentId));
    return Scaffold(
      appBar: AppBar(
        leading: appBarBack(context),
        title: Text(async.value?.student.name ?? ''),
      ),
      body: SafeArea(
        top: false,
        child: switch (async) {
          AsyncValue(value: final detail?) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Expanded(
                child: ListView(
                  key: const ValueKey('advisee'),
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            detail.term.name,
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: p.text,
                            ),
                          ),
                        ),
                        SchoolPill(
                          key: const ValueKey('advisee-status'),
                          label: uniStatusLabel(l10n, detail.status),
                          tone: uniStatusTone(detail.status),
                        ),
                      ],
                    ),
                    Text(
                      [
                        detail.program?.title ?? l10n.uniNoProgram,
                        '${l10n.uniGpa} ${gpaText(detail.gpa)}',
                        l10n.uniCreditsRange(
                          creditsText(detail.credits.taken),
                          creditsText(detail.credits.min),
                          creditsText(detail.credits.max),
                        ),
                      ].join(' · '),
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                    const SizedBox(height: 16),
                    for (final held in detail.sections) ...[
                      AppCard(
                        key: ValueKey('advisee-section-${held.section.id}'),
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${held.section.label} · ${held.section.course.title}',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w700,
                                      color: p.text,
                                    ),
                                  ),
                                  Text(
                                    [
                                      l10n.uniCredits(
                                        creditsText(
                                          held.section.course.credits,
                                        ),
                                      ),
                                      meetingsText(held.section.meetings),
                                    ].where((x) => x.isNotEmpty).join(' · '),
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: p.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            SchoolPill(
                              label: uniEnrolmentLabel(l10n, held.status).$1,
                              tone: uniEnrolmentLabel(l10n, held.status).$2,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                    ],
                    if (detail.canDecide) ...[
                      const SizedBox(height: 6),
                      TextField(
                        key: const ValueKey('advisee-note'),
                        controller: _note,
                        maxLength: 500,
                        maxLines: 3,
                        minLines: 2,
                        decoration: InputDecoration(
                          labelText: l10n.uniNoteHint,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              if (detail.canDecide)
                BottomActionBar(
                  child: Row(
                    children: [
                      Expanded(
                        child: SecondaryButton(
                          key: const ValueKey('advisee-return'),
                          label: l10n.uniSendBack,
                          height: 52,
                          onPressed: _busy ? null : () => _decide(false),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: PrimaryButton(
                          key: const ValueKey('advisee-approve'),
                          label: l10n.uniApprove,
                          loading: _busy,
                          height: 52,
                          onPressed: () => _decide(true),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(adviseeProvider(widget.studentId)),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}
