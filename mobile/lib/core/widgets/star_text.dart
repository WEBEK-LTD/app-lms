import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

/// 128 The rating star ★, which none of the app's fonts draws (a box
/// instead): the filled rounded star icon, the size and colour of [style]'s
/// text, as a card's rating element draws it.
InlineSpan ratingStar(TextStyle style) => WidgetSpan(
  alignment: PlaceholderAlignment.middle,
  child: Icon(
    Symbols.star_rounded,
    key: const ValueKey('rating-star'),
    fill: 1,
    size: (style.fontSize ?? 14) + 1,
    color: style.color,
  ),
);

/// 128 A text with each ★ in it (a rating: "★ 4.6", "4.7 · 25 min") drawn
/// as [ratingStar]; otherwise a plain [Text].
class StarText extends StatelessWidget {
  const StarText(
    this.text, {
    super.key,
    this.style,
    this.textAlign,
    this.maxLines,
    this.overflow,
  });

  final String text;
  final TextStyle? style;
  final TextAlign? textAlign;
  final int? maxLines;
  final TextOverflow? overflow;

  @override
  Widget build(BuildContext context) {
    if (!text.contains('★')) {
      return Text(
        text,
        style: style,
        textAlign: textAlign,
        maxLines: maxLines,
        overflow: overflow,
      );
    }
    final shown = DefaultTextStyle.of(context).style.merge(style);
    final parts = text.split('★');
    return Text.rich(
      TextSpan(
        children: [
          for (var i = 0; i < parts.length; i++) ...[
            if (i > 0) ratingStar(shown),
            if (parts[i].isNotEmpty) TextSpan(text: parts[i]),
          ],
        ],
      ),
      style: style,
      textAlign: textAlign,
      maxLines: maxLines,
      overflow: overflow,
      semanticsLabel: text,
    );
  }
}
