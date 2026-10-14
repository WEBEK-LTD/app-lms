import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../shared/account/notifications_screen.dart' show timeAgo;
import '../../../core/l10n/l10n.dart';

/// Who wrote a review, question or reply, with an "Instructor" tag.
class PersonLine extends StatelessWidget {
  const PersonLine({
    super.key,
    required this.person,
    required this.time,
    this.you = false,
  });

  final Person person;
  final DateTime time;
  final bool you;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final initial = person.name.trim().isEmpty
        ? '?'
        : person.name.trim().characters.first.toUpperCase();
    return Row(
      children: [
        ClipOval(
          child: person.avatarUrl != null
              ? AppNetworkImage(url: person.avatarUrl, width: 32, height: 32)
              : Container(
                  width: 32,
                  height: 32,
                  color: p.placeholderFor(person.name.length),
                  alignment: Alignment.center,
                  child: Text(
                    initial,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      you ? context.l10n.personYou(person.name) : person.name,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                  ),
                  if (person.instructor) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: p.accentSoft,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        context.l10n.instructor,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              Text(
                timeAgo(time),
                style: TextStyle(fontSize: 12, color: p.textSecondary),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// A row of five stars, read-only or tappable.
class StarRow extends StatelessWidget {
  const StarRow({
    super.key,
    required this.rating,
    this.size = 18,
    this.onChanged,
  });

  final double rating;
  final double size;
  final ValueChanged<int>? onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (onChanged == null) {
      return Semantics(
        label: context.l10n.ratingOutOf5(
          rating.toStringAsFixed(rating % 1 == 0 ? 0 : 1),
        ),
        excludeSemantics: true,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 1; i <= 5; i++)
              AppIcon(
                AppIcons.star,
                size: size,
                color: p.star,
                filled: rating >= i - 0.25,
              ),
          ],
        ),
      );
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 1; i <= 5; i++)
          Semantics(
            button: true,
            selected: rating >= i,
            label: context.l10n.starCount(i),
            excludeSemantics: true,
            child: InkResponse(
              onTap: () => onChanged!(i),
              radius: size,
              child: Padding(
                padding: const EdgeInsets.all(4),
                child: AppIcon(
                  AppIcons.star,
                  size: size,
                  color: p.star,
                  filled: rating >= i,
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// A bottom sheet with a text field and a send button. Returns once [onSend]
/// succeeds; [onSend] shows its own errors and returns false to keep the
/// sheet open.
Future<void> showTextSheet(
  BuildContext context, {
  required String title,
  required String hint,
  required String sendLabel,
  required Future<bool> Function(String text) onSend,
  String initial = '',
  Widget? header,
  bool allowEmpty = false,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  builder: (context) => _TextSheet(
    title: title,
    hint: hint,
    sendLabel: sendLabel,
    onSend: onSend,
    initial: initial,
    header: header,
    allowEmpty: allowEmpty,
  ),
);

class _TextSheet extends StatefulWidget {
  const _TextSheet({
    required this.title,
    required this.hint,
    required this.sendLabel,
    required this.onSend,
    required this.initial,
    required this.allowEmpty,
    this.header,
  });

  final String title;
  final String hint;
  final String sendLabel;
  final Future<bool> Function(String text) onSend;
  final String initial;
  final Widget? header;
  final bool allowEmpty;

  @override
  State<_TextSheet> createState() => _TextSheetState();
}

class _TextSheetState extends State<_TextSheet> {
  late final _text = TextEditingController(text: widget.initial);
  bool _sending = false;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _text.text.trim();
    if (text.isEmpty && !widget.allowEmpty) return;
    setState(() => _sending = true);
    final ok = await widget.onSend(text);
    if (!mounted) return;
    setState(() => _sending = false);
    if (ok) Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
    child: SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(widget.title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            if (widget.header != null) ...[
              widget.header!,
              const SizedBox(height: 12),
            ],
            TextField(
              controller: _text,
              autofocus: widget.header == null,
              minLines: 3,
              maxLines: 8,
              maxLength: 2000,
              textCapitalization: TextCapitalization.sentences,
              decoration: InputDecoration(hintText: widget.hint),
            ),
            const SizedBox(height: 8),
            ListenableBuilder(
              listenable: _text,
              builder: (context, _) => PrimaryButton(
                label: widget.sendLabel,
                loading: _sending,
                height: 52,
                onPressed: _text.text.trim().isEmpty && !widget.allowEmpty
                    ? null
                    : _send,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
