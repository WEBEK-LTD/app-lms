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
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/school_providers.dart';
import '../data/university_providers.dart';
import '../widgets/school_widgets.dart';

/// 113.9 A university student's part of the School tab, for them and their
/// parents: the program and GPA, registering in the term's sections (sent
/// to the advisor), the week of lectures, results by term, the transcript
/// (and its PDF) and the study plan. Parents see it read only.

String uniStatusLabel(AppLocalizations l10n, UniRegistrationStatus s) =>
    switch (s) {
      UniRegistrationStatus.draft => l10n.uniStatusDraft,
      UniRegistrationStatus.submitted => l10n.uniStatusSubmitted,
      UniRegistrationStatus.approved => l10n.uniStatusApproved,
      UniRegistrationStatus.returned => l10n.uniStatusReturned,
    };

PillTone uniStatusTone(UniRegistrationStatus s) => switch (s) {
  UniRegistrationStatus.approved => PillTone.good,
  UniRegistrationStatus.returned => PillTone.bad,
  UniRegistrationStatus.submitted => PillTone.warn,
  UniRegistrationStatus.draft => PillTone.neutral,
};

(String, PillTone) uniEnrolmentLabel(
  AppLocalizations l10n,
  UniEnrolmentStatus s,
) => switch (s) {
  UniEnrolmentStatus.pending => (l10n.uniEnrolPending, PillTone.warn),
  UniEnrolmentStatus.enrolled => (l10n.uniEnrolEnrolled, PillTone.good),
  UniEnrolmentStatus.waitlisted => (l10n.uniEnrolWaitlisted, PillTone.neutral),
};

String uniPhaseText(AppLocalizations l10n, UniPhase phase, UniTerm term) =>
    switch (phase) {
      UniPhase.before => l10n.uniPhaseBefore(
        isoDayLabel(term.registrationOpens),
      ),
      UniPhase.open => l10n.uniPhaseOpen(isoDayLabel(term.registrationCloses)),
      UniPhase.drop => l10n.uniPhaseDrop(isoDayLabel(term.dropUntil)),
      UniPhase.closed => l10n.uniPhaseClosed,
    };

/// "Mon 09:00–10:30 · B2", each lecture of a section.
String meetingsText(List<UniMeeting> meetings) => meetings
    .map(
      (m) => [
        '${weekdayName(m.weekday)} ${m.starts}–${m.ends}',
        ?m.room,
      ].join(' · '),
    )
    .join(', ');

/// The School tab of a university: the student, their standing, today's
/// lectures and each part.
class UniversityOverview extends ConsumerWidget {
  const UniversityOverview({super.key, required this.student});

  final SchoolStudent student;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final id = student.id;
    void open(String part) => context.push(Paths.schoolPart(part, student: id));
    final standing = ref.watch(universityStudentProvider(id)).value;
    final fees = ref.watch(studentFeesProvider(id)).value;
    return RefreshIndicator(
      onRefresh: () async {
        ref
          ..invalidate(universityStudentProvider(id))
          ..invalidate(uniTimetableProvider(id));
      },
      child: ListView(
        key: const ValueKey('university-overview'),
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
        children: [
          AppCard(
            key: const ValueKey('uni-student'),
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
                      Text(
                        [
                          standing?.program?.title ?? l10n.uniNoProgram,
                          if (standing?.advisorName != null)
                            l10n.uniAdvisor(standing!.advisorName!),
                        ].join(' · '),
                        style: TextStyle(fontSize: 13, color: p.textSecondary),
                      ),
                    ],
                  ),
                ),
                if (standing != null)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        gpaText(standing.gpa),
                        key: const ValueKey('uni-gpa'),
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                      Text(
                        l10n.uniGpa,
                        style: TextStyle(fontSize: 12, color: p.textSecondary),
                      ),
                    ],
                  ),
              ],
            ),
          ),
          if (standing?.program != null) ...[
            const SizedBox(height: 8),
            Text(
              l10n.uniCreditsOf(
                creditsText(standing!.creditsEarned),
                creditsText(standing.program!.creditsRequired),
              ),
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
          ],
          if (standing?.registrationTerm != null) ...[
            const SizedBox(height: 12),
            AppCard(
              key: const ValueKey('uni-registration-card'),
              padding: const EdgeInsets.all(14),
              onTap: () => open('uni-registration'),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          standing!.registrationTerm!.name,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                        Text(
                          uniPhaseText(
                            l10n,
                            standing.registrationPhase,
                            standing.registrationTerm!,
                          ),
                          style: TextStyle(
                            fontSize: 13,
                            color: p.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  SchoolPill(
                    label: uniStatusLabel(l10n, standing.registrationStatus),
                    tone: uniStatusTone(standing.registrationStatus),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 20),
          SectionHeader(
            title: l10n.schoolToday,
            onSeeAll: () => open('uni-timetable'),
          ),
          const SizedBox(height: 4),
          _Today(studentId: id),
          const SizedBox(height: 20),
          SettingsGroup(
            title: l10n.schoolEverything,
            children: [
              SettingsTile(
                key: const ValueKey('uni-register'),
                icon: AppIcons.assignment,
                title: l10n.uniRegister,
                onTap: () => open('uni-registration'),
              ),
              SettingsTile(
                key: const ValueKey('uni-timetable'),
                icon: AppIcons.calendar,
                title: l10n.uniTimetable,
                onTap: () => open('uni-timetable'),
              ),
              SettingsTile(
                key: const ValueKey('uni-results'),
                icon: AppIcons.certificate,
                title: l10n.uniResults,
                onTap: () => open('uni-results'),
              ),
              SettingsTile(
                key: const ValueKey('uni-transcript'),
                icon: AppIcons.file,
                title: l10n.uniTranscript,
                onTap: () => open('uni-transcript'),
              ),
              SettingsTile(
                key: const ValueKey('uni-plan'),
                icon: AppIcons.list,
                title: l10n.uniStudyPlan,
                onTap: () => open('uni-plan'),
              ),
              SettingsTile(
                key: const ValueKey('school-fees'),
                icon: AppIcons.cash,
                title: l10n.schoolFees,
                subtitle: fees == null ? null : l10n.feesDue(fees.dueFormatted),
                onTap: () => open('fees'),
              ),
              SettingsTile(
                key: const ValueKey('school-news'),
                icon: AppIcons.campaignUpdate,
                title: l10n.schoolNews,
                onTap: () => open('news'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Today extends ConsumerWidget {
  const _Today({required this.studentId});

  final int studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    return switch (ref.watch(uniTimetableProvider(studentId))) {
      AsyncValue(value: final week?) => switch (week.on(
        DateTime.now().weekday,
      )) {
        final lectures when lectures.isEmpty => Text(
          context.l10n.uniNoLecturesToday,
          key: const ValueKey('uni-no-lectures'),
          style: TextStyle(fontSize: 14, color: p.textSecondary),
        ),
        final lectures => AppCard(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          child: Column(
            children: [
              for (final lecture in lectures) _LectureRow(lecture: lecture),
            ],
          ),
        ),
      },
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(uniTimetableProvider(studentId)),
      ),
      _ => const SizedBox(height: 60),
    };
  }
}

class _LectureRow extends StatelessWidget {
  const _LectureRow({required this.lecture});

  final UniLecture lecture;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 92,
            child: Text(
              '${lecture.starts}–${lecture.ends}',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: p.text,
              ),
            ),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${lecture.courseCode} · ${lecture.courseTitle}',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
                Text(
                  [?lecture.lecturerName, ?lecture.room].join(' · '),
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

/// A university page for the student [student] (a notification's) or the one chosen.
class _UniPage extends StatelessWidget {
  const _UniPage({
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

// Registration

class UniRegistrationScreen extends StatelessWidget {
  const UniRegistrationScreen({super.key, this.student});

  final int? student;

  @override
  Widget build(BuildContext context) => _UniPage(
    title: context.l10n.uniRegister,
    student: student,
    builder: (context, me, s) =>
        _Registration(studentId: s.id, readOnly: !me.isStudent),
  );
}

class _Registration extends ConsumerStatefulWidget {
  const _Registration({required this.studentId, required this.readOnly});

  final int studentId;
  final bool readOnly;

  @override
  ConsumerState<_Registration> createState() => _RegistrationState();
}

class _RegistrationState extends ConsumerState<_Registration> {
  int? _term;
  bool _busy = false;

  ({int student, int? term}) get _query =>
      (student: widget.studentId, term: _term);

  Future<void> _run(
    Future<UniRegistration> Function() task, [
    String? done,
  ]) async {
    setState(() => _busy = true);
    try {
      await task();
      ref
        ..invalidate(uniRegistrationProvider(_query))
        ..invalidate(universityStudentProvider(widget.studentId))
        ..invalidate(uniTimetableProvider(widget.studentId));
      if (mounted && done != null) showMessage(context, done);
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
    final api = ref.read(yallappApiProvider);
    return switch (ref.watch(uniRegistrationProvider(_query))) {
      AsyncValue(value: final reg?) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: ListView(
              key: const ValueKey('uni-registration'),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                if (reg.terms.length > 1) ...[
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      for (final t in reg.terms)
                        PillChip(
                          key: ValueKey('uni-term-${t.id}'),
                          label: t.name,
                          selected: t.id == reg.term.id,
                          height: 34,
                          onTap: () => setState(() => _term = t.id),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                ],
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        reg.term.name,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                    ),
                    SchoolPill(
                      key: const ValueKey('uni-status'),
                      label: uniStatusLabel(l10n, reg.status),
                      tone: uniStatusTone(reg.status),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    uniPhaseText(l10n, reg.phase, reg.term),
                    l10n.uniCreditsRange(
                      creditsText(reg.credits.taken),
                      creditsText(reg.credits.min),
                      creditsText(reg.credits.max),
                    ),
                  ].join(' · '),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                if (reg.note != null) ...[
                  const SizedBox(height: 10),
                  AppCard(
                    key: const ValueKey('uni-note'),
                    color: p.accentSoft,
                    padding: const EdgeInsets.all(12),
                    child: Text(
                      l10n.uniAdvisorNote(reg.note!),
                      style: TextStyle(fontSize: 14, color: p.text),
                    ),
                  ),
                ],
                if (widget.readOnly) ...[
                  const SizedBox(height: 10),
                  Text(
                    l10n.uniReadOnly,
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                ],
                const SizedBox(height: 20),
                SectionHeader(title: l10n.uniMySections, size: 16),
                const SizedBox(height: 4),
                if (reg.mine.isEmpty)
                  Text(
                    l10n.uniNoSections,
                    style: TextStyle(fontSize: 14, color: p.textSecondary),
                  ),
                for (final held in reg.mine) ...[
                  _SectionCard(
                    key: ValueKey('uni-mine-${held.section.id}'),
                    section: held.section,
                    pill: uniEnrolmentLabel(l10n, held.status),
                    action: widget.readOnly || !held.canDrop
                        ? null
                        : SecondaryButton(
                            key: ValueKey('uni-drop-${held.section.id}'),
                            label: l10n.uniDrop,
                            height: 40,
                            onPressed: _busy
                                ? null
                                : () async {
                                    final yes = await confirmAction(
                                      context,
                                      title: l10n.uniDropConfirm(
                                        held.section.label,
                                      ),
                                      message: held.section.course.title,
                                      confirmLabel: l10n.uniDrop,
                                      destructive: true,
                                    );
                                    if (yes) {
                                      await _run(
                                        () => api.dropUniSection(
                                          widget.studentId,
                                          held.section.id,
                                          termId: reg.term.id,
                                        ),
                                      );
                                    }
                                  },
                          ),
                  ),
                  const SizedBox(height: 10),
                ],
                const SizedBox(height: 12),
                SectionHeader(title: l10n.uniOffered, size: 16),
                const SizedBox(height: 4),
                if (reg.offered.isEmpty)
                  Text(
                    l10n.uniNoSections,
                    style: TextStyle(fontSize: 14, color: p.textSecondary),
                  ),
                for (final section in reg.offered) ...[
                  _SectionCard(
                    key: ValueKey('uni-offered-${section.id}'),
                    section: section,
                    problems: section.problems,
                    action: widget.readOnly || !reg.canAdd || !section.canAdd
                        ? null
                        : PrimaryButton(
                            key: ValueKey('uni-add-${section.id}'),
                            label: section.waitlist
                                ? l10n.uniJoinWaitlist
                                : l10n.uniAdd,
                            height: 40,
                            onPressed: _busy
                                ? null
                                : () => _run(
                                    () => api.addUniSection(
                                      widget.studentId,
                                      section.id,
                                      termId: reg.term.id,
                                    ),
                                  ),
                          ),
                  ),
                  const SizedBox(height: 10),
                ],
              ],
            ),
          ),
          if (!widget.readOnly && reg.canSubmit)
            BottomActionBar(
              child: PrimaryButton(
                key: const ValueKey('uni-submit'),
                label: l10n.uniSubmit,
                loading: _busy,
                height: 52,
                onPressed: () => _run(
                  () => api.submitUniRegistration(
                    widget.studentId,
                    termId: reg.term.id,
                  ),
                  l10n.uniSubmitted,
                ),
              ),
            ),
        ],
      ),
      AsyncValue(error: final ApiException e) when e.code == 'no_term' =>
        MessageView(icon: AppIcons.calendar, title: l10n.uniNoSections),
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(uniRegistrationProvider(_query)),
      ),
      _ => const LoadingView(),
    };
  }
}

/// A section with its course, lecturer, lectures and seats.
class _SectionCard extends StatelessWidget {
  const _SectionCard({
    super.key,
    required this.section,
    this.pill,
    this.problems = const [],
    this.action,
  });

  final UniSection section;
  final (String, PillTone)? pill;
  final List<String> problems;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
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
              if (pill != null) SchoolPill(label: pill!.$1, tone: pill!.$2),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            [
              l10n.uniCredits(creditsText(section.course.credits)),
              ?section.lecturerName,
              if (section.seatsLeft != null)
                l10n.uniSeatsLeft(section.seatsLeft!),
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
          if (section.meetings.isNotEmpty)
            Text(
              meetingsText(section.meetings),
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
          for (final problem in problems)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                problem,
                style: TextStyle(fontSize: 13, color: p.danger),
              ),
            ),
          if (action != null) ...[
            const SizedBox(height: 10),
            Align(alignment: AlignmentDirectional.centerEnd, child: action),
          ],
        ],
      ),
    );
  }
}

// Timetable

class UniTimetableScreen extends ConsumerWidget {
  const UniTimetableScreen({super.key, this.student});

  final int? student;

  @override
  Widget build(BuildContext context, WidgetRef ref) => _UniPage(
    title: context.l10n.uniTimetable,
    student: student,
    builder: (context, me, s) => switch (ref.watch(
      uniTimetableProvider(s.id),
    )) {
      AsyncValue(value: final week?) when week.days.isEmpty => MessageView(
        icon: AppIcons.calendar,
        title: context.l10n.uniNoLectures,
      ),
      AsyncValue(value: final week?) => ListView(
        key: const ValueKey('uni-week'),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          if (week.term != null)
            Text(
              week.term!.name,
              style: TextStyle(
                fontSize: 13,
                color: context.palette.textSecondary,
              ),
            ),
          for (final day in week.days) ...[
            const SizedBox(height: 16),
            SectionHeader(title: weekdayName(day.weekday), size: 16),
            const SizedBox(height: 4),
            AppCard(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              child: Column(
                children: [
                  for (final lecture in day.lectures)
                    _LectureRow(lecture: lecture),
                ],
              ),
            ),
          ],
        ],
      ),
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(uniTimetableProvider(s.id)),
      ),
      _ => const LoadingView(),
    },
  );
}

// Results and the transcript

class UniResultsScreen extends ConsumerWidget {
  const UniResultsScreen({super.key, this.student, this.transcript = false});

  final int? student;

  /// The transcript: the same, with the program and the PDF.
  final bool transcript;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return _UniPage(
      title: transcript ? l10n.uniTranscript : l10n.uniResults,
      student: student,
      builder: (context, me, s) {
        final provider = transcript
            ? uniTranscriptProvider(s.id)
            : uniResultsProvider(s.id);
        return switch (ref.watch(provider)) {
          AsyncValue(value: final results?) => _Results(
            results: results,
            student: s,
            transcript: transcript,
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(provider),
          ),
          _ => const LoadingView(),
        };
      },
    );
  }
}

class _Results extends ConsumerWidget {
  const _Results({
    required this.results,
    required this.student,
    required this.transcript,
  });

  final UniResults results;
  final SchoolStudent student;
  final bool transcript;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    return ListView(
      key: ValueKey(transcript ? 'uni-transcript' : 'uni-results'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
      children: [
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (transcript)
                      Text(
                        student.name,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    if (transcript && results.program != null)
                      Text(
                        results.program!.title,
                        style: TextStyle(fontSize: 13, color: p.textSecondary),
                      ),
                    Text(
                      l10n.uniCumulative,
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                    if (results.creditsRequired != null)
                      Text(
                        l10n.uniCreditsOf(
                          creditsText(results.creditsEarned),
                          creditsText(results.creditsRequired!),
                        ),
                        style: TextStyle(fontSize: 13, color: p.textSecondary),
                      ),
                  ],
                ),
              ),
              Text(
                gpaText(results.gpa),
                key: const ValueKey('uni-cumulative'),
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
            ],
          ),
        ),
        if (transcript && results.pdfUrl != null) ...[
          const SizedBox(height: 12),
          SecondaryButton(
            key: const ValueKey('uni-pdf'),
            label: l10n.uniOpenPdf,
            icon: AppIcons.download,
            onPressed: () => ref.read(openExternalProvider)(results.pdfUrl!),
          ),
        ],
        if (results.terms.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 24),
            child: MessageView(
              icon: AppIcons.certificate,
              title: l10n.uniNoResults,
              compact: true,
            ),
          ),
        for (final term in results.terms) ...[
          const SizedBox(height: 16),
          AppCard(
            key: ValueKey('uni-term-${term.term.id}'),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        term.term.name,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ),
                    Text(
                      l10n.uniTermGpa(gpaText(term.gpa)),
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                for (final course in term.courses)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 6),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${course.courseCode} · ${course.title}',
                                style: TextStyle(fontSize: 14, color: p.text),
                              ),
                              Text(
                                l10n.uniCredits(creditsText(course.credits)),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: p.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        SchoolPill(
                          label: course.grade,
                          tone: course.passed ? PillTone.good : PillTone.bad,
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

// The study plan

class UniStudyPlanScreen extends ConsumerWidget {
  const UniStudyPlanScreen({super.key, this.student});

  final int? student;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    return _UniPage(
      title: l10n.uniStudyPlan,
      student: student,
      builder: (context, me, s) => switch (ref.watch(uniPlanProvider(s.id))) {
        AsyncValue(value: final plan?) when plan.program == null => MessageView(
          icon: AppIcons.school,
          title: l10n.uniNoProgram,
        ),
        AsyncValue(value: final plan?) => ListView(
          key: const ValueKey('uni-plan'),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            Text(
              plan.program!.title,
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
            if (plan.credits != null)
              Text(
                l10n.uniPlanCredits(
                  creditsText(plan.credits!.done),
                  creditsText(plan.credits!.inProgress),
                  creditsText(plan.credits!.left),
                  creditsText(plan.credits!.required),
                ),
                key: const ValueKey('uni-plan-credits'),
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            for (final year in plan.years) ...[
              const SizedBox(height: 16),
              SectionHeader(title: l10n.uniYear(year.year), size: 16),
              const SizedBox(height: 4),
              AppCard(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 6,
                ),
                child: Column(
                  children: [
                    for (final course in year.courses)
                      Padding(
                        key: ValueKey('uni-plan-${course.courseCode}'),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${course.courseCode} · ${course.title}',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: p.text,
                                    ),
                                  ),
                                  Text(
                                    [
                                      l10n.uniCredits(
                                        creditsText(course.credits),
                                      ),
                                      if (!course.required) l10n.uniElective,
                                      ?course.grade,
                                    ].join(' · '),
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: p.textSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            SchoolPill(
                              label: switch (course.status) {
                                UniPlanStatus.done => l10n.uniPlanDone,
                                UniPlanStatus.inProgress =>
                                  l10n.uniPlanInProgress,
                                UniPlanStatus.left => l10n.uniPlanLeft,
                              },
                              tone: switch (course.status) {
                                UniPlanStatus.done => PillTone.good,
                                UniPlanStatus.inProgress => PillTone.warn,
                                UniPlanStatus.left => PillTone.neutral,
                              },
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(uniPlanProvider(s.id)),
        ),
        _ => const LoadingView(),
      },
    );
  }
}
