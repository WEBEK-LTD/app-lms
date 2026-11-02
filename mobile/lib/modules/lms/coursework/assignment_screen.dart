import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../chat/data/chat_api.dart';
import '../../chat/data/chat_media.dart';
import '../../school/data/school_providers.dart'
    show homeworkFileOk, homeworkMaxBytes;
import '../../school/screens/student_screens.dart' show FileTile;
import '../../shared/account/account_scaffold.dart';
import '../lesson/content/html_content.dart';
import '../teachers/teacher_widgets.dart' show LabeledField;
import '../learning/rubric_widgets.dart';
import '../data/lms_providers.dart';
import 'coursework_providers.dart';

/// 112.5 An assignment of a course managed in Yallapp: its instructions and
/// files, the due date, what the student handed in and the teacher's grade
/// and note; handing in (again, until it's graded) with text, a photo or a
/// PDF.
class AssignmentScreen extends ConsumerWidget {
  const AssignmentScreen({super.key, required this.assignmentId});

  final int assignmentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(assignmentProvider(assignmentId));
    return AccountScaffold(
      title: state.value?.title ?? context.l10n.assignmentTitle,
      child: switch (state) {
        AsyncData(:final value) => _AssignmentBody(
          key: ValueKey('assignment-${value.id}-${value.submission?.id}'),
          assignment: value,
        ),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(assignmentProvider(assignmentId)),
        ),
        _ => const SkeletonList(
          layout: SkeletonLayout.text,
          count: 3,
          padding: EdgeInsets.zero,
        ),
      },
    );
  }
}

class _AssignmentBody extends ConsumerStatefulWidget {
  const _AssignmentBody({super.key, required this.assignment});

  final Assignment assignment;

  @override
  ConsumerState<_AssignmentBody> createState() => _AssignmentBodyState();
}

class _AssignmentBodyState extends ConsumerState<_AssignmentBody> {
  late final _text = TextEditingController(
    text: widget.assignment.submission?.text ?? '',
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
          ref.read(courseUploadsProvider),
          file,
          onProgress: (v) {
            if (mounted) setState(() => _progress = v);
          },
          cancelled: () => _closed,
        );
      }
      final id = widget.assignment.id;
      await ref
          .read(yallappApiProvider)
          .submitAssignment(id, text: text, uploadId: uploadId);
      if (!mounted) return;
      showMessage(context, l10n.homeworkSent);
      ref
        ..invalidate(assignmentProvider(id))
        ..invalidate(curriculumProvider(widget.assignment.courseId))
        ..invalidate(courseDetailProvider(widget.assignment.courseId));
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
    final a = widget.assignment;
    final submission = a.submission;
    final file = _file;
    final progress = _progress;
    final facts = [
      if (a.dueAt != null) l10n.homeworkDueOn(dayAndTime(a.dueAt!)),
      l10n.assignmentOutOf(a.maxPoints),
      if (a.passPoints != null) l10n.assignmentPassScore(a.passPoints!),
      // 113.7 The tries it allows.
      if (a.attemptsAllowed > 1)
        l10n.tryOf(
          submission == null ? 1 : submission.attempt,
          a.attemptsAllowed,
        ),
    ];
    final again = submission?.status == SubmissionStatus.graded && a.canSubmit;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (a.courseTitle.isNotEmpty)
          Text(
            a.courseTitle,
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        Text(
          facts.join(' · '),
          key: const ValueKey('assignment-facts'),
          style: TextStyle(fontSize: 13, color: p.textSecondary),
        ),
        if (a.instructionsHtml.trim().isNotEmpty) ...[
          const SizedBox(height: 12),
          HtmlContent(html: a.instructionsHtml),
        ],
        // 113.7 The rubric it's graded with, until it is.
        if (a.rubric.isNotEmpty &&
            submission?.status != SubmissionStatus.graded) ...[
          const SizedBox(height: 12),
          SectionHeader(title: l10n.rubricTitle, size: 16),
          const SizedBox(height: 6),
          RubricView(rubric: a.rubric),
        ],
        if (a.attachments.isNotEmpty) ...[
          const SizedBox(height: 12),
          SectionHeader(title: l10n.attachments, size: 16),
          for (final attachment in a.attachments)
            SettingsTile(
              icon: AppIcons.file,
              title: attachment.name,
              onTap: () => ref.read(openExternalProvider)(attachment.url),
            ),
        ],
        if (submission != null) ...[
          const SizedBox(height: 16),
          _Grade(submission: submission),
          const SizedBox(height: 12),
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
        ],
        if (again) ...[
          const SizedBox(height: 12),
          Text(
            l10n.triesLeft(a.attemptsAllowed - a.attemptsUsed),
            key: const ValueKey('assignment-tries'),
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          ),
        ],
        if (a.canSubmit) ...[
          const SizedBox(height: 16),
          LabeledField(
            key: const ValueKey('assignment-text'),
            label: l10n.homeworkAnswer,
            controller: _text,
            lines: 5,
            maxLength: 10000,
          ),
          const SizedBox(height: 8),
          if (file != null)
            SettingsTile(
              icon: AppIcons.file,
              title: file.name,
              chevron: false,
              trailing: IconButton(
                tooltip: l10n.homeworkRemoveFile,
                onPressed: _sending ? null : () => setState(() => _file = null),
                icon: AppIcon(AppIcons.close, size: 20, color: p.text),
              ),
            )
          else if (a.acceptsFiles)
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                SecondaryButton(
                  key: const ValueKey('assignment-photo'),
                  label: l10n.homeworkAddPhoto,
                  icon: AppIcons.photo,
                  height: 44,
                  onPressed: () => _pick(ChatPickSource.camera),
                ),
                SecondaryButton(
                  key: const ValueKey('assignment-file'),
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
            key: const ValueKey('assignment-send'),
            label: submission == null
                ? l10n.homeworkSend
                : again
                ? l10n.handInAgain
                : l10n.homeworkSendAgain,
            loading: _sending,
            height: 52,
            onPressed: _send,
          ),
        ],
      ],
    );
  }
}

/// Where the work is: waiting for a grade, sent back, or graded with its
/// score and the teacher's note.
class _Grade extends StatelessWidget {
  const _Grade({required this.submission});

  final AssignmentSubmission submission;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final s = submission;
    final (icon, color, title) = switch (s.status) {
      SubmissionStatus.submitted => (
        AppIcons.schedule,
        p.textSecondary,
        l10n.assignmentWaiting,
      ),
      SubmissionStatus.returned => (
        AppIcons.replay,
        p.danger,
        l10n.assignmentReturned,
      ),
      SubmissionStatus.graded => (
        s.passed == false ? AppIcons.replay : AppIcons.checkCircle,
        s.passed == false ? p.danger : p.success,
        l10n.assignmentGraded(s.score ?? 0, s.maxPoints),
      ),
    };
    return AppCard(
      key: ValueKey('assignment-${s.status.name}'),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              AppIcon(icon, size: 22, color: color, filled: true),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
            ],
          ),
          if (s.status == SubmissionStatus.graded && s.passed == false)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                l10n.assignmentBelowPass,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            ),
          // 113.7 The rubric's levels the teacher chose.
          if (s.rubricResult.isNotEmpty)
            RubricResultList(results: s.rubricResult),
          if (s.feedback != null && s.feedback!.trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              l10n.assignmentFeedback,
              style: TextStyle(fontSize: 13, color: p.textSecondary),
            ),
            const SizedBox(height: 2),
            Text(
              s.feedback!,
              style: TextStyle(fontSize: 15, color: p.textBody),
            ),
          ],
        ],
      ),
    );
  }
}
