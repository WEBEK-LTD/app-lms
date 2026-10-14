import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';

/// 21 The intake form step of booking: the business's questions
/// (`BookingsConfig.intake_fields`), checked like the server checks them.
/// Pops with the answers by question ID, or null when the customer goes
/// back. Answers are health data for a clinic: they only go to the booking.
class IntakeFormScreen extends StatefulWidget {
  const IntakeFormScreen({
    super.key,
    required this.fields,
    required this.business,
    this.initial = const {},
  });

  final List<IntakeField> fields;

  /// The business's name, for the privacy line.
  final String business;

  /// Answers given before (after a time was taken, the form opens filled).
  final Map<String, String> initial;

  static Future<Map<String, String>?> open(
    BuildContext context, {
    required List<IntakeField> fields,
    required String business,
    Map<String, String> initial = const {},
  }) => Navigator.of(context).push<Map<String, String>>(
    MaterialPageRoute(
      fullscreenDialog: true,
      builder: (_) => IntakeFormScreen(
        fields: fields,
        business: business,
        initial: initial,
      ),
    ),
  );

  @override
  State<IntakeFormScreen> createState() => _IntakeFormScreenState();
}

class _IntakeFormScreenState extends State<IntakeFormScreen> {
  final _form = GlobalKey<FormState>();
  late final Map<String, TextEditingController> _text = {
    for (final f in widget.fields)
      if (_typed(f)) f.id: TextEditingController(text: widget.initial[f.id]),
  };

  /// Choices and dates.
  late final Map<String, String?> _picked = {
    for (final f in widget.fields)
      if (!_typed(f)) f.id: _validPick(f, widget.initial[f.id]),
  };

  static bool _typed(IntakeField f) =>
      f.type == IntakeFieldType.text || f.type == IntakeFieldType.textarea;

  static String? _validPick(IntakeField f, String? value) => switch (f.type) {
    IntakeFieldType.choice when f.options.contains(value) => value,
    IntakeFieldType.date when value != null && parseIsoDate(value) != null =>
      value,
    _ => null,
  };

  @override
  void dispose() {
    for (final c in _text.values) {
      c.dispose();
    }
    super.dispose();
  }

  void _submit() {
    if (!(_form.currentState?.validate() ?? false)) return;
    final answers = <String, String>{};
    for (final f in widget.fields) {
      final value = (_text[f.id]?.text ?? _picked[f.id] ?? '').trim();
      if (value.isNotEmpty) answers[f.id] = value;
    }
    Navigator.of(context).pop(answers);
  }

  String? _checkText(IntakeField f, String? value) {
    final text = (value ?? '').trim();
    if (text.isEmpty) return f.required ? context.l10n.intakeRequired : null;
    if (text.length > f.maxLength) {
      return context.l10n.intakeTooLong(f.maxLength);
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Scaffold(
      backgroundColor: p.surface,
      appBar: AppBar(
        leading: IconButton(
          tooltip: context.l10n.close,
          icon: const AppIcon(AppIcons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text(context.l10n.intakeTitle),
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: readablePadding(context, top: 8, bottom: 24),
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppIcon(AppIcons.lock, size: 20, color: p.textSecondary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    context.l10n.intakeIntro(widget.business),
                    style: TextStyle(fontSize: 14, color: p.textSecondary),
                  ),
                ),
              ],
            ),
            for (final f in widget.fields) ...[
              const SizedBox(height: 20),
              _Label(field: f),
              const SizedBox(height: 8),
              _question(f),
            ],
          ],
        ),
      ),
      bottomNavigationBar: BottomActionBar(
        child: PrimaryButton(
          label: context.l10n.continueAction,
          onPressed: _submit,
        ),
      ),
    );
  }

  Widget _question(IntakeField f) => switch (f.type) {
    IntakeFieldType.text || IntakeFieldType.textarea => TextFormField(
      key: ValueKey('intake-${f.id}'),
      controller: _text[f.id],
      maxLength: f.maxLength,
      minLines: f.type == IntakeFieldType.textarea ? 3 : 1,
      maxLines: f.type == IntakeFieldType.textarea ? 6 : 1,
      textCapitalization: TextCapitalization.sentences,
      textInputAction: f.type == IntakeFieldType.textarea
          ? TextInputAction.newline
          : TextInputAction.next,
      decoration: InputDecoration(hintText: f.label, counterText: ''),
      validator: (v) => _checkText(f, v),
    ),
    IntakeFieldType.choice => FormField<String>(
      key: ValueKey('intake-${f.id}'),
      initialValue: _picked[f.id],
      validator: (v) =>
          f.required && v == null ? context.l10n.intakeChooseOne : null,
      builder: (state) => _Errored(
        error: state.errorText,
        child: Wrap(
          spacing: 8,
          runSpacing: 4,
          children: [
            for (final option in f.options)
              PillChip(
                label: option,
                selected: state.value == option,
                onTap: () {
                  final next = state.value == option ? null : option;
                  _picked[f.id] = next;
                  state.didChange(next);
                },
              ),
          ],
        ),
      ),
    ),
    IntakeFieldType.date => FormField<String>(
      key: ValueKey('intake-${f.id}'),
      initialValue: _picked[f.id],
      validator: (v) =>
          f.required && v == null ? context.l10n.intakeRequired : null,
      builder: (state) => _Errored(
        error: state.errorText,
        child: _DateButton(
          label: f.label,
          value: state.value,
          onChanged: (value) {
            _picked[f.id] = value;
            state.didChange(value);
          },
        ),
      ),
    ),
  };
}

class _Label extends StatelessWidget {
  const _Label({required this.field});

  final IntakeField field;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Text.rich(
      TextSpan(
        text: field.label,
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w700,
          color: p.text,
        ),
        children: [
          if (!field.required)
            TextSpan(
              text: '  ${context.l10n.intakeOptional}',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: p.textSecondary,
              ),
            ),
        ],
      ),
    );
  }
}

/// A question with its error under it.
class _Errored extends StatelessWidget {
  const _Errored({required this.child, this.error});

  final Widget child;
  final String? error;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      child,
      if (error != null)
        Padding(
          padding: const EdgeInsets.only(top: 6),
          child: Text(
            error!,
            style: TextStyle(fontSize: 13, color: context.palette.danger),
          ),
        ),
    ],
  );
}

class _DateButton extends StatelessWidget {
  const _DateButton({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  final String label;

  /// `yyyy-MM-dd`.
  final String? value;
  final ValueChanged<String?> onChanged;

  Future<void> _pick(BuildContext context) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: parseIsoDate(value ?? '') ?? now,
      firstDate: DateTime(1900),
      lastDate: DateTime(now.year + 5, 12, 31),
      helpText: label,
    );
    if (picked != null) onChanged(isoDate(picked));
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final day = parseIsoDate(value ?? '');
    return Semantics(
      button: true,
      label: day == null ? '$label, ${context.l10n.intakeChooseDate}' : null,
      child: InkWell(
        onTap: () => _pick(context),
        borderRadius: BorderRadius.circular(context.shapes.button),
        child: Container(
          constraints: const BoxConstraints(minHeight: 52),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(context.shapes.button),
            border: Border.all(color: p.border),
          ),
          child: Row(
            children: [
              AppIcon(AppIcons.calendar, size: 20, color: p.textSecondary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  day == null ? context.l10n.intakeChooseDate : longDate(day),
                  style: TextStyle(
                    fontSize: 15,
                    color: day == null ? p.textSecondary : p.text,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The customer's answers on their appointment, with who sees them.
class IntakeAnswersCard extends StatelessWidget {
  const IntakeAnswersCard({
    super.key,
    required this.answers,
    required this.business,
  });

  final List<IntakeAnswer> answers;
  final String business;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(title: context.l10n.yourAnswers),
        const SizedBox(height: 10),
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final (i, a) in answers.indexed) ...[
                if (i > 0) const SizedBox(height: 12),
                Text(
                  a.label,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                const SizedBox(height: 2),
                Text(
                  _shown(a.value),
                  style: TextStyle(fontSize: 15, color: p.text),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppIcon(AppIcons.lock, size: 16, color: p.textSecondary),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                context.l10n.answersPrivate(business),
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
            ),
          ],
        ),
      ],
    );
  }

  /// A date answer in words; anything else as written.
  static String _shown(String value) {
    final day = parseIsoDate(value);
    return day == null ? value : longDate(day);
  }
}
