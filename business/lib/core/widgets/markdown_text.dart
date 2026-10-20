import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';

/// 63 The small Markdown of Yallapp's announcements, as the dashboard's bell
/// shows it: **bold**, *italic*, `code` and [links](https://…) inside lines,
/// `#` headings in bold and `-` items with a bullet. Nothing else is read as
/// Markdown, and links open only http(s) and mailto addresses.
class MarkdownText extends StatefulWidget {
  const MarkdownText(this.source, {super.key, this.style, this.onLink});

  final String source;
  final TextStyle? style;
  final void Function(String url)? onLink;

  @override
  State<MarkdownText> createState() => _MarkdownTextState();
}

class _MarkdownTextState extends State<MarkdownText> {
  final _recognizers = <TapGestureRecognizer>[];

  void _clear() {
    for (final r in _recognizers) {
      r.dispose();
    }
    _recognizers.clear();
  }

  @override
  void dispose() {
    _clear();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    _clear();
    final base = widget.style ?? DefaultTextStyle.of(context).style;
    final link = base.copyWith(
      color: Theme.of(context).colorScheme.primary,
      decoration: TextDecoration.underline,
    );
    final spans = <InlineSpan>[];
    final lines = widget.source.replaceAll('\r\n', '\n').split('\n');
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var style = base;
      final heading = RegExp(r'^\s{0,3}#{1,6}\s+').firstMatch(line);
      if (heading != null) {
        line = line.substring(heading.end);
        style = base.copyWith(fontWeight: FontWeight.w700);
      }
      final bullet = RegExp(r'^\s*[-*+]\s+').firstMatch(line);
      if (bullet != null) line = '• ${line.substring(bullet.end)}';
      spans.addAll(_inline(line, style, link));
      if (i < lines.length - 1) spans.add(const TextSpan(text: '\n'));
    }
    return Text.rich(TextSpan(children: spans), style: base);
  }

  static final _token = RegExp(
    r'\*\*(.+?)\*\*|__(.+?)__|(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?!\w)|(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?!\w)|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)',
  );

  List<InlineSpan> _inline(String text, TextStyle style, TextStyle link) {
    final out = <InlineSpan>[];
    var at = 0;
    for (final m in _token.allMatches(text)) {
      if (m.start > at) {
        out.add(TextSpan(text: text.substring(at, m.start), style: style));
      }
      final bold = m.group(1) ?? m.group(2);
      final italic = m.group(3) ?? m.group(4);
      if (bold != null) {
        out.addAll(
          _inline(bold, style.copyWith(fontWeight: FontWeight.w700), link),
        );
      } else if (italic != null) {
        out.addAll(
          _inline(italic, style.copyWith(fontStyle: FontStyle.italic), link),
        );
      } else if (m.group(5) != null) {
        out.add(
          TextSpan(
            text: m.group(5),
            style: style.copyWith(fontFamily: 'monospace'),
          ),
        );
      } else {
        final url = m.group(7)!;
        final safe = RegExp(r'^(https?://|mailto:)', caseSensitive: false);
        if (widget.onLink != null && safe.hasMatch(url)) {
          final recognizer = TapGestureRecognizer()
            ..onTap = () => widget.onLink!(url);
          _recognizers.add(recognizer);
          out.add(
            TextSpan(text: m.group(6), style: link, recognizer: recognizer),
          );
        } else {
          out.add(TextSpan(text: m.group(6), style: style));
        }
      }
      at = m.end;
    }
    if (at < text.length) {
      out.add(TextSpan(text: text.substring(at), style: style));
    }
    return out;
  }
}
