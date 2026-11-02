import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../school/screens/student_screens.dart' show FileTile;
import 'teacher_widgets.dart' show LabeledField;
import 'teachers_providers.dart';

/// 112.5 The Teacher tab's Grading: the assignments handed in on the
/// teacher's courses (waiting first, the first handed in first), each
/// graded with a score and a note or sent back for another try.
class TeacherGrading extends ConsumerStatefulWidget {
  const TeacherGrading({super.key});

  @override
  ConsumerState<TeacherGrading> createState() => _TeacherGradingState();
}

class _TeacherGradingState extends ConsumerState<TeacherGrading> {
  bool _graded = false;

  Future<void> _open(TeacherSubmission s) async {
    final done = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _GradeSheet(submission: s),
    );
    if (done == true) ref.invalidate(teacherSubmissionsProvider);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final state = ref.watch(teacherSubmissionsProvider(_graded));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 8),
          child: SegmentedTabs(
            labels: [l10n.gradingToGrade, l10n.gradingGraded],
            selected: _graded ? 1 : 0,
            height: 38,
            onChanged: (i) => setState(() => _graded = i == 1),
          ),
        ),
        Expanded(
          child: switch (state) {
            AsyncData(:final value) when value.isEmpty => MessageView(
              icon: AppIcons.assignment,
              title: _graded ? l10n.gradingNoneGraded : l10n.gradingNone,
              compact: true,
            ),
            AsyncData(:final value) => RefreshIndicator(
              onRefresh: () async =>
                  ref.invalidate(teacherSubmissionsProvider(_graded)),
              child: ListView.separated(
                key: const ValueKey('teacher-submissions'),
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                itemCount: value.length,
                separatorBuilder: (_, _) => const SizedBox(height: 10),
                itemBuilder: (context, i) {
                  final s = value[i];
                  return AppCard(
                    key: ValueKey('teacher-submission-${s.id}'),
                    padding: const EdgeInsets.all(14),
                    onTap: () => _open(s),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${s.courseTitle} · ${s.assignmentTitle}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: p.textSecondary,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          s.studentName,
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                        if (s.text.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            s.text,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(fontSize: 14, color: p.textBody),
                          ),
                        ],
                        const SizedBox(height: 6),
                        Text(
                          [
                            dayAndTime(s.submittedAt),
                            if (s.late) l10n.homeworkLate,
                            if (s.status == SubmissionStatus.graded)
                              l10n.assignmentGraded(s.score ?? 0, s.maxPoints),
                            if (s.status == SubmissionStatus.returned)
                              l10n.gradingSentBackLabel,
                          ].join(' · '),
                          style: TextStyle(
                            fontSize: 13,
                            color: s.late ? p.danger : p.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            AsyncError(:final error) => ErrorView(
              error: error,
              onRetry: () =>
                  ref.invalidate(teacherSubmissionsProvider(_graded)),
            ),
            _ => SkeletonList(
              layout: SkeletonLayout.text,
              label: l10n.loadingEllipsis,
            ),
          },
        ),
      ],
    );
  }
}

class _GradeSheet extends ConsumerStatefulWidget {
  const _GradeSheet({required this.submission});

  final TeacherSubmission submission;

  @override
  ConsumerState<_GradeSheet> createState() => _GradeSheetState();
}

class _GradeSheetState extends ConsumerState<_GradeSheet> {
  late final _score = TextEditingController(
    text: widget.submission.score?.toString() ?? '',
  );
  late final _note = TextEditingController(
    text: widget.submission.feedback ?? '',
  );
  bool _saving = false;

  @override
  void dispose() {
    _score.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _save({required bool sendBack}) async {
    final l10n = context.l10n;
    final s = widget.submission;
    final score = int.tryParse(_score.text.trim());
    if (!sendBack && (score == null || score < 0 || score > s.maxPoints)) {
      showMessage(context, l10n.gradingScoreRange(s.maxPoints));
      return;
    }
    if (sendBack && _note.text.trim().isEmpty) {
      showMessage(context, l10n.gradingNeedsNote);
      return;
    }
    setState(() => _saving = true);
    try {
      await ref
          .read(yallappApiProvider)
          .gradeTeacherSubmission(
            s.id,
            sendBack: sendBack,
            score: sendBack ? null : score,
            feedback: _note.text.trim(),
          );
      if (!mounted) return;
      showMessage(context, sendBack ? l10n.gradingSentBack : l10n.gradingSaved);
      Navigator.of(context).pop(true);
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
    final s = widget.submission;
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
                s.assignmentTitle,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text(
                '${s.studentName} · ${dayAndTime(s.submittedAt)}',
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
              if (s.text.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(s.text, style: TextStyle(fontSize: 15, color: p.textBody)),
              ],
              if (s.file != null) FileTile(file: s.file!),
              const SizedBox(height: 16),
              LabeledField(
                key: const ValueKey('grade-score'),
                label: l10n.gradingScore(s.maxPoints),
                controller: _score,
                keyboard: TextInputType.number,
              ),
              const SizedBox(height: 12),
              LabeledField(
                key: const ValueKey('grade-note'),
                label: l10n.gradingNote,
                controller: _note,
                lines: 3,
                maxLength: 5000,
              ),
              const SizedBox(height: 16),
              PrimaryButton(
                key: const ValueKey('grade-save'),
                label: l10n.gradingSave,
                loading: _saving,
                height: 52,
                onPressed: () => _save(sendBack: false),
              ),
              const SizedBox(height: 8),
              SecondaryButton(
                key: const ValueKey('grade-send-back'),
                label: l10n.gradingSendBack,
                onPressed: _saving ? null : () => _save(sendBack: true),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
