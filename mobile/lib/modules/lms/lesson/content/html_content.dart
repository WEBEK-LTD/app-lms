import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_widget_from_html_core/flutter_widget_from_html_core.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/gate/app_gate.dart';
import '../../../../core/services/external_links.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/theme/palette.dart';
import '../embeds/inline_embed.dart';
import 'code_block.dart';
import 'lesson_html.dart';

/// Renders a lesson's (or course description's) HTML natively in the app's
/// typography: code blocks with highlighting and Copy, and embeds as inline
/// web views (design: TextLesson).
class HtmlContent extends ConsumerStatefulWidget {
  const HtmlContent({
    super.key,
    required this.html,
    this.embeds = const [],
    this.title = '',
    this.embedHeight,
  });

  final String html;
  final List<Embed> embeds;

  /// The lesson title, for the full-screen embed view.
  final String title;

  /// The lesson's `embed_height` override.
  final EmbedHeightMode? embedHeight;

  @override
  ConsumerState<HtmlContent> createState() => _HtmlContentState();
}

class _HtmlContentState extends ConsumerState<HtmlContent> {
  late String _prepared;
  late Map<String, Embed> _byPlaceholder;

  @override
  void initState() {
    super.initState();
    _prepare();
  }

  @override
  void didUpdateWidget(HtmlContent old) {
    super.didUpdateWidget(old);
    if (old.html != widget.html || old.embeds != widget.embeds) _prepare();
  }

  void _prepare() {
    _prepared = widget.embeds.isEmpty
        ? widget.html
        : prepareLessonHtml(widget.html, widget.embeds);
    _byPlaceholder = {for (final e in widget.embeds) e.placeholder: e};
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final highlight = ref.watch(
      appConfigProvider.select((c) => c.content.codeHighlighting),
    );

    return HtmlWidget(
      _prepared,
      textStyle: TextStyle(fontSize: 15, height: 1.7, color: p.textBody),
      onTapUrl: (url) async {
        await openExternal(url);
        return true;
      },
      customStylesBuilder: (element) => switch (element.localName) {
        'code' when element.parent?.localName != 'pre' => {
          'font-family': '"$codeFontFamily"',
          'font-size': '13px',
          'background-color': _css(p.inlineCode),
          'padding': '2px 6px',
          'border-radius': '4px',
        },
        'a' => {'color': _css(p.link)},
        'h1' => {
          'font-size': '22px',
          'font-weight': '700',
          'color': _css(p.text),
        },
        'h2' => {
          'font-size': '17px',
          'font-weight': '700',
          'color': _css(p.text),
        },
        'h3' => {
          'font-size': '16px',
          'font-weight': '700',
          'color': _css(p.text),
        },
        'blockquote' => {
          'border-left': '3px solid ${_css(p.accent)}',
          'padding-left': '12px',
          'margin-left': '0',
          'color': _css(p.textSecondary),
        },
        'table' => {'border-collapse': 'collapse'},
        'td' ||
        'th' => {'border': '1px solid ${_css(p.border)}', 'padding': '6px'},
        _ => null,
      },
      customWidgetBuilder: (element) {
        switch (element.localName) {
          case 'pre':
            return CodeBlock(
              code: element.text,
              language: detectCodeLanguage(element),
              highlight: highlight,
            );
          case embedTag:
            final embed =
                _byPlaceholder[element.attributes['data-placeholder']];
            if (embed == null) return const SizedBox.shrink();
            return InlineEmbed(
              embed: embed,
              title: widget.title,
              heightMode: widget.embedHeight,
            );
          case 'iframe':
            // An iframe the server didn't extract: size it like an embed.
            final src = element.attributes['src'];
            if (src == null || src.isEmpty) return const SizedBox.shrink();
            return InlineEmbed(
              embed: Embed(
                placeholder: 'iframe-${src.hashCode}',
                src: src,
                provider: _guessProvider(src),
                width: element.attributes['width'],
                height: element.attributes['height'],
              ),
              title: widget.title,
              heightMode: widget.embedHeight,
            );
        }
        return null;
      },
    );
  }
}

EmbedProvider _guessProvider(String src) {
  final host = Uri.tryParse(src)?.host ?? '';
  if (host.contains('youtube') || host == 'youtu.be') {
    return EmbedProvider.youtube;
  }
  if (host.contains('vimeo')) return EmbedProvider.vimeo;
  return EmbedProvider.other;
}

String _css(Color c) {
  int ch(double v) => (v * 255).round().clamp(0, 255);
  return 'rgb(${ch(c.r)}, ${ch(c.g)}, ${ch(c.b)})';
}
