import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/palette.dart';

/// 105.3 A text field with its label above it, for the teachers' forms.
class LabeledField extends StatelessWidget {
  const LabeledField({
    super.key,
    required this.label,
    required this.controller,
    this.hint,
    this.lines = 1,
    this.maxLength,
    this.keyboard,
    this.validator,
  });

  final String label;
  final TextEditingController controller;
  final String? hint;
  final int lines;
  final int? maxLength;
  final TextInputType? keyboard;
  final FormFieldValidator<String>? validator;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text(
        label,
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: context.palette.text,
        ),
      ),
      const SizedBox(height: 8),
      TextFormField(
        controller: controller,
        keyboardType: lines > 1 ? TextInputType.multiline : keyboard,
        minLines: lines,
        maxLines: lines > 1 ? lines + 4 : 1,
        maxLength: maxLength,
        textCapitalization: TextCapitalization.sentences,
        decoration: InputDecoration(hintText: hint ?? label),
        validator: validator,
      ),
    ],
  );
}

/// "Arabic, Grammar" → ["Arabic", "Grammar"], without blanks or repeats.
List<String> splitSubjects(String text) {
  final out = <String>[];
  for (final part in text.split(RegExp('[,،]'))) {
    final subject = part.trim();
    if (subject.isNotEmpty && !out.contains(subject)) out.add(subject);
  }
  return out;
}

/// Where a teacher's course is, in the teacher's words.
String stageLabel(BuildContext context, CourseStage stage) => switch (stage) {
  CourseStage.draft => context.l10n.stageDraft,
  CourseStage.inReview => context.l10n.stageInReview,
  CourseStage.returned => context.l10n.stageReturned,
  CourseStage.published => context.l10n.stagePublished,
  CourseStage.hidden => context.l10n.stageHidden,
};

/// Where a teacher's course is, as a coloured label like an order's status.
class StagePill extends StatelessWidget {
  const StagePill({super.key, required this.stage});

  final CourseStage stage;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final (bg, fg) = switch (stage) {
      CourseStage.published => (p.successSoft, p.success),
      CourseStage.returned => (p.surfaceMuted, p.danger),
      CourseStage.inReview => (p.accentSoft, p.text),
      CourseStage.draft ||
      CourseStage.hidden => (p.primarySoft, p.onPrimarySoft),
    };
    return DecoratedBox(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        child: Text(
          stageLabel(context, stage),
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
