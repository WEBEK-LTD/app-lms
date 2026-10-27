import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/analytics.dart' show randomUuid;
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../chat/data/chat_api.dart';
import '../../chat/data/chat_providers.dart';
import '../../real_estate/widgets/listing_widgets.dart' show signInFor;
import 'page_blocks.dart';

/// 99.4 A form block: its fields, checked on the phone as the server checks
/// them, then sent by email (`POST /forms/{slug}/{block_id}`) or as one chat
/// message to the business (signed in). Once sent, the block's text for
/// after (else the app's own "Sent") takes the form's place.
class FormView extends ConsumerStatefulWidget {
  const FormView({
    super.key,
    required this.block,
    required this.style,
    required this.pageSlug,
  });

  final FormBlock block;
  final PageStyle style;

  /// The page the form is on.
  final String pageSlug;

  @override
  ConsumerState<FormView> createState() => _FormViewState();
}

class _FormViewState extends ConsumerState<FormView> {
  late final Map<String, TextEditingController> _text = {
    for (final f in widget.block.fields)
      if (f.kind != FormFieldKind.choice) f.id: TextEditingController(),
  };

  /// The option picked in each choice field.
  final _picked = <String, String>{};

  /// What needs a change, by field id: the phone's checks or the server's.
  var _errors = <String, String>{};

  /// Why the answers didn't go (the server's message): shown above the
  /// button, which then tries again. The answers stay in the form.
  String? _failure;
  var _sending = false;
  var _sent = false;

  /// The chat message's `client_id`, kept until it's sent, so trying again
  /// after a network error never sends it twice.
  String? _clientId;

  @override
  void dispose() {
    for (final c in _text.values) {
      c.dispose();
    }
    super.dispose();
  }

  Map<String, String> get _raw => {
    for (final MapEntry(:key, :value) in _text.entries) key: value.text,
    ..._picked,
  };

  String _message(PageFormField field, FormProblem problem) {
    final l10n = context.l10n;
    return switch (problem) {
      FormProblem.missing when field.kind == FormFieldKind.choice =>
        l10n.pageFormChooseOne,
      FormProblem.missing => l10n.pageFormRequired,
      FormProblem.email => l10n.pageFormInvalidEmail,
      FormProblem.phone => l10n.pageFormInvalidPhone,
      FormProblem.number => l10n.pageFormInvalidNumber,
      FormProblem.choice => l10n.pageFormChooseOne,
    };
  }

  Future<void> _submit() async {
    final block = widget.block;
    // Answers for the chat need the person signed in to it.
    if (block.sendTo == FormSendTo.chat &&
        !ref.read(authControllerProvider).isSignedIn) {
      signInFor(context, Paths.page(widget.pageSlug));
      return;
    }
    final check = block.check(_raw);
    setState(() {
      _failure = null;
      _errors = {
        for (final field in block.fields)
          if (check.problems[field.id] != null)
            field.id: _message(field, check.problems[field.id]!),
      };
    });
    if (!check.ok) return;
    final unavailable = context.l10n.chatUnavailable;
    setState(() => _sending = true);
    try {
      if (block.sendTo == FormSendTo.email) {
        await ref
            .read(yallappApiProvider)
            .sendFormAnswers(widget.pageSlug, block.id, check.answers);
      } else {
        await _sendToChat(check.answers, unavailable);
      }
      if (!mounted) return;
      for (final c in _text.values) {
        c.clear();
      }
      setState(() {
        _picked.clear();
        _clientId = null;
        _sent = true;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      // The server's word for each field it knows; else its message.
      final fields = e.code == 'invalid_answers'
          ? FormBlock.fieldErrors(e.details)
          : const <String, String>{};
      final shown = {
        for (final field in block.fields)
          if (fields[field.id] != null) field.id: fields[field.id]!,
      };
      setState(() {
        if (shown.isEmpty) {
          _failure = e.message;
        } else {
          _errors = shown;
        }
      });
    } on Object catch (e) {
      if (mounted) setState(() => _failure = friendlyError(e));
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  /// One message in the conversation with the business: the form's title,
  /// then a line for each answer.
  Future<void> _sendToChat(
    Map<String, String> answers,
    String unavailable,
  ) async {
    final chat = ref.read(chatApiProvider);
    if (chat == null) {
      throw ApiException(code: ChatErrors.notAvailable, message: unavailable);
    }
    final list = await chat.conversations();
    final business = list.items
        .where((c) => c.kind == ChatConversationKind.direct)
        .firstOrNull;
    if (business == null) {
      throw ApiException(code: ChatErrors.notAvailable, message: unavailable);
    }
    await chat.send(
      business.id,
      clientId: _clientId ??= randomUuid(),
      text: widget.block.chatText(answers),
    );
  }

  void _edited(String id) {
    if (!_errors.containsKey(id)) return;
    setState(() {
      _errors.remove(id);
    });
  }

  void _pick(String id, String option) {
    setState(() {
      _picked[id] = option;
      _errors.remove(id);
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final block = widget.block;
    if (_sent) {
      final text = block.successText?.trim() ?? '';
      return AppCard(
        key: ValueKey('form-sent-${block.id}'),
        padding: const EdgeInsets.all(16),
        child: Semantics(
          liveRegion: true,
          child: Row(
            children: [
              AppIcon(
                AppIcons.checkCircle,
                size: 24,
                color: p.success,
                filled: true,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  text.isEmpty ? l10n.pageFormSent : text,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.4,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }
    final signedOut =
        block.sendTo == FormSendTo.chat &&
        !ref.watch(authControllerProvider).isSignedIn;
    final failure = _failure;
    final own = block.submitLabel?.trim() ?? '';
    final String label;
    if (signedOut) {
      label = l10n.pageFormSignIn;
    } else if (failure != null) {
      label = l10n.tryAgain;
    } else {
      label = own.isEmpty ? l10n.send : own;
    }
    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, field) in block.fields.indexed) ...[
            if (i > 0) const SizedBox(height: 16),
            _FieldLabel(field: field),
            const SizedBox(height: 8),
            if (field.kind == FormFieldKind.choice)
              _choice(field)
            else
              _input(field),
          ],
          if (failure != null) ...[
            const SizedBox(height: 14),
            Semantics(
              liveRegion: true,
              child: Text(
                failure,
                key: ValueKey('form-failure-${block.id}'),
                style: TextStyle(fontSize: 14, height: 1.4, color: p.danger),
              ),
            ),
          ],
          const SizedBox(height: 18),
          PrimaryButton(
            key: ValueKey('form-send-${block.id}'),
            label: label,
            height: 50,
            loading: _sending,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }

  Widget _input(PageFormField field) {
    final long = field.kind == FormFieldKind.longText;
    final words = switch (field.kind) {
      FormFieldKind.text || FormFieldKind.longText => true,
      _ => false,
    };
    return TextField(
      key: ValueKey('form-${widget.block.id}-${field.id}'),
      controller: _text[field.id],
      maxLength: PageFormField.maxLength,
      minLines: long ? 3 : 1,
      maxLines: long ? 6 : 1,
      keyboardType: switch (field.kind) {
        FormFieldKind.longText => TextInputType.multiline,
        FormFieldKind.email => TextInputType.emailAddress,
        FormFieldKind.phone => TextInputType.phone,
        FormFieldKind.number => const TextInputType.numberWithOptions(
          signed: true,
          decimal: true,
        ),
        FormFieldKind.text || FormFieldKind.choice => TextInputType.text,
      },
      textCapitalization: words
          ? TextCapitalization.sentences
          : TextCapitalization.none,
      autocorrect: words,
      textInputAction: long ? TextInputAction.newline : TextInputAction.next,
      decoration: InputDecoration(
        counterText: '',
        errorText: _errors[field.id],
        errorMaxLines: 3,
      ),
      onChanged: (_) => _edited(field.id),
    );
  }

  /// A few options as a list to tick; more in a menu.
  Widget _choice(PageFormField field) {
    final p = context.palette;
    final error = _errors[field.id];
    final picked = _picked[field.id];
    if (field.options.length > 4) {
      return DropdownButtonFormField<String>(
        key: ValueKey('form-${widget.block.id}-${field.id}'),
        initialValue: picked,
        isExpanded: true,
        hint: Text(context.l10n.choose),
        decoration: InputDecoration(errorText: error, errorMaxLines: 3),
        items: [
          for (final option in field.options)
            DropdownMenuItem(value: option, child: Text(option)),
        ],
        onChanged: (value) {
          if (value != null) _pick(field.id, value);
        },
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final option in field.options)
          _Option(
            label: option,
            selected: picked == option,
            onTap: () => _pick(field.id, option),
          ),
        if (error != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(error, style: TextStyle(fontSize: 13, color: p.danger)),
          ),
      ],
    );
  }
}

/// A field's label, with a mark when it must be filled in.
class _FieldLabel extends StatelessWidget {
  const _FieldLabel({required this.field});

  final PageFormField field;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      label: field.required
          ? '${field.label}, ${context.l10n.optionsRequired}'
          : field.label,
      excludeSemantics: true,
      child: Text.rich(
        TextSpan(
          text: field.label,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: p.text,
          ),
          children: [
            if (field.required)
              TextSpan(
                text: ' *',
                style: TextStyle(color: p.danger),
              ),
          ],
        ),
      ),
    );
  }
}

/// One option of a choice field.
class _Option extends StatelessWidget {
  const _Option({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      checked: selected,
      inMutuallyExclusiveGroup: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Row(
            children: [
              AppIcon(
                selected ? AppIcons.radioChecked : AppIcons.radioUnchecked,
                size: 22,
                filled: selected,
                color: selected ? p.primary : p.textSecondary,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(fontSize: 15, color: p.text),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
