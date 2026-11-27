import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart' show DateFormat;
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/theme.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/glass.dart';
import '../../../core/widgets/sym.dart';

/// 232–234 (area E) The flat pieces E's phase 2–4 screens share (#527: one
/// fill, a 1px line, cards at 12 and controls at 10, Readex Pro headings,
/// orange only where the member acts).

/// A screen with a back button and a title, over the tab bar.
class FlatPage extends StatelessWidget {
  const FlatPage({
    super.key,
    required this.title,
    required this.body,
    this.actions = const [],
  });

  final String title;
  final Widget body;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l = context.l10n;
    return Scaffold(
      backgroundColor: p.screen,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 6, 18, 10),
              child: Row(
                children: [
                  IconBtn(
                    icon: Directionality.of(context) == TextDirection.rtl
                        ? Symbols.arrow_forward_rounded
                        : Symbols.arrow_back_rounded,
                    label: l.commonBack,
                    onTap: () =>
                        context.canPop() ? context.pop() : context.go('/'),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: FlatHeading(title, size: 20)),
                  ...actions,
                ],
              ),
            ),
            Expanded(child: body),
          ],
        ),
      ),
    );
  }
}

/// A heading in Readex Pro.
class FlatHeading extends StatelessWidget {
  const FlatHeading(this.text, {super.key, this.size = 17, this.maxLines = 2});

  final String text;
  final double size;
  final int maxLines;

  @override
  Widget build(BuildContext context) => Text(
    text,
    maxLines: maxLines,
    overflow: TextOverflow.ellipsis,
    style: TextStyle(
      fontFamily: Fonts.brand,
      fontSize: size,
      height: 1.3,
      fontWeight: FontWeight.w600,
      color: context.palette.ink,
    ),
  );
}

/// A card: the palette's card, a 1px line, corners of 12.
class FlatCard extends StatelessWidget {
  const FlatCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(14),
    this.semanticLabel,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final card = Material(
      color: p.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: p.line),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(padding: padding, child: child),
      ),
    );
    return semanticLabel == null
        ? card
        : Semantics(button: onTap != null, label: semanticLabel, child: card);
  }
}

/// A small label: muted on the soft fill, or orange for what matters.
class FlatTag extends StatelessWidget {
  const FlatTag(this.text, {super.key, this.icon, this.accent = false});

  final String text;
  final IconData? icon;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final ink = accent ? Brand.orange : p.muted;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: accent ? Brand.orange.withValues(alpha: .12) : p.soft,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Sym(icon!, size: 14, color: ink),
            const SizedBox(width: 4),
          ],
          Text(
            text,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.w600,
              color: ink,
            ),
          ),
        ],
      ),
    );
  }
}

/// The one orange action on a screen; outlined when it is quieter.
class FlatButton extends StatelessWidget {
  const FlatButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.outlined = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool outlined;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(10),
    );
    final child = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Sym(icon!, size: 18, color: outlined ? p.ink : Colors.white),
          const SizedBox(width: 6),
        ],
        Flexible(
          child: Text(
            label,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
      ],
    );
    return SizedBox(
      height: 44,
      child: outlined
          ? OutlinedButton(
              onPressed: onPressed,
              style: OutlinedButton.styleFrom(
                foregroundColor: p.ink,
                side: BorderSide(color: p.line),
                shape: shape,
              ),
              child: child,
            )
          : FilledButton(
              onPressed: onPressed,
              style: FilledButton.styleFrom(
                backgroundColor: Brand.orange,
                foregroundColor: Colors.white,
                shape: shape,
              ),
              child: child,
            ),
    );
  }
}

/// A list from the server: loading, the error with Try again, empty, or
/// the items, with pull to refresh.
class FlatAsyncList<T> extends StatelessWidget {
  const FlatAsyncList({
    super.key,
    required this.value,
    required this.onRetry,
    required this.item,
    this.empty,
    this.header,
  });

  final AsyncValue<List<T>> value;
  final Future<void> Function() onRetry;
  final Widget Function(T item) item;
  final String? empty;
  final Widget? header;

  @override
  Widget build(BuildContext context) {
    final l = context.l10n;
    final p = context.palette;
    final items = value.value;
    final bottom = 120 + MediaQuery.paddingOf(context).bottom;
    Widget message(String text, {bool retry = false}) => ListView(
      padding: EdgeInsets.fromLTRB(16, 4, 16, bottom),
      children: [
        ?header,
        const SizedBox(height: 40),
        Text(
          text,
          textAlign: TextAlign.center,
          style: TextStyle(color: p.muted),
        ),
        if (retry)
          Center(
            child: TextButton(onPressed: onRetry, child: Text(l.commonRetry)),
          ),
      ],
    );
    final Widget body = switch (value) {
      AsyncError() when items == null => message(l.commonError, retry: true),
      _ when items == null => const Center(child: CircularProgressIndicator()),
      _ when items.isEmpty => message(empty ?? l.commonEmpty),
      _ => ListView.separated(
        padding: EdgeInsets.fromLTRB(16, 4, 16, bottom),
        itemCount: items.length + (header == null ? 0 : 1),
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (_, i) => header != null && i == 0
            ? header!
            : item(items[header == null ? i : i - 1]),
      ),
    };
    return RefreshIndicator(onRefresh: onRetry, child: body);
  }
}

/// A row of choices (a filter): the chosen one in ink, the others quiet.
class FlatChoices<T> extends StatelessWidget {
  const FlatChoices({
    super.key,
    required this.values,
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final List<T> values;
  final String Function(T value) label;
  final T selected;
  final ValueChanged<T> onSelected;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          for (final v in values)
            Padding(
              padding: const EdgeInsetsDirectional.only(end: 8),
              child: ChoiceChip(
                label: Text(label(v)),
                selected: v == selected,
                showCheckmark: false,
                onSelected: (_) => onSelected(v),
                labelStyle: TextStyle(
                  color: v == selected ? p.screen : p.ink,
                  fontWeight: FontWeight.w600,
                ),
                selectedColor: p.ink,
                backgroundColor: p.card,
                side: BorderSide(color: v == selected ? p.ink : p.line),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Opens a link outside the app; a note when it can't.
Future<void> openLink(BuildContext context, WidgetRef ref, String url) async {
  final uri = Uri.tryParse(url);
  final ok = uri != null && await ref.read(openExternalProvider)(uri);
  if (!ok && context.mounted) {
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(context.l10n.commonError)));
  }
}

/// A snack bar with the server's message, or the general one.
void showFailure(BuildContext context, Object error) {
  if (!context.mounted) return;
  ScaffoldMessenger.of(context)
      .showSnackBar(SnackBar(content: Text(context.l10n.commonError)));
}

/// A date and time at the viewer's own time ("Sat, Dec 6 · 13:00").
String localWhen(BuildContext context, DateTime at) {
  final locale = Localizations.localeOf(context).toLanguageTag();
  final local = at.toLocal();
  return '${DateFormat.MMMEd(locale).format(local)} · ${DateFormat.Hm(locale).format(local)}';
}

/// Asks for a line or a few of text (a link, a message); null when closed.
Future<String?> askText(
  BuildContext context, {
  required String title,
  required String hint,
  required String send,
  bool long = false,
  TextInputType? keyboard,
}) => showDialog<String>(
  context: context,
  builder: (context) => _TextDialog(
    title: title,
    hint: hint,
    send: send,
    long: long,
    keyboard: keyboard,
  ),
);

class _TextDialog extends StatefulWidget {
  const _TextDialog({
    required this.title,
    required this.hint,
    required this.send,
    required this.long,
    this.keyboard,
  });

  final String title;
  final String hint;
  final String send;
  final bool long;
  final TextInputType? keyboard;

  @override
  State<_TextDialog> createState() => _TextDialogState();
}

class _TextDialogState extends State<_TextDialog> {
  final _text = TextEditingController();

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: Text(widget.title),
    content: TextField(
      controller: _text,
      autofocus: true,
      keyboardType: widget.keyboard,
      minLines: widget.long ? 3 : 1,
      maxLines: widget.long ? 6 : 1,
      decoration: InputDecoration(hintText: widget.hint),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context, _text.text.trim()),
        child: Text(widget.send),
      ),
    ],
  );
}
