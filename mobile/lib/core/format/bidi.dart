/// 110 Text of either direction inside the app's own: names, addresses,
/// times and amounts typed by the business or its customers, which the
/// Unicode bidi rules would reorder inside Arabic text ("12 Main St"
/// showing as "Main St 12", "20:30–22:30" as "22:30–20:30").
library;

import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart' show Bidi;

import '../l10n/l10n.dart';
import '../l10n/locales.dart';

/// Whether the app shows a right-to-left language now.
bool get appIsRtl =>
    directionOf(currentL10n.localeName.split('_').first) == TextDirection.rtl;

/// [text] kept in its own direction, from its first letter, inside the
/// app's text (a first strong isolate). Unchanged in a left-to-right app.
String isolate(String text) =>
    appIsRtl && text.isNotEmpty ? '\u2068$text\u2069' : text;

/// [text] kept left to right (times, ranges, counters, codes) inside the
/// app's text. Unchanged in a left-to-right app.
String ltrRun(String text) =>
    appIsRtl && text.isNotEmpty ? '\u2066$text\u2069' : text;

/// The direction [text] is written in, from its first letter: for a line
/// cut short, so the "…" goes at its end.
TextDirection directionOfText(String text, {TextDirection? fallback}) {
  for (final rune in text.runes) {
    final c = String.fromCharCode(rune);
    if (Bidi.startsWithRtl(c)) return TextDirection.rtl;
    if (RegExp(r'\p{L}', unicode: true).hasMatch(c)) return TextDirection.ltr;
  }
  return fallback ?? (appIsRtl ? TextDirection.rtl : TextDirection.ltr);
}

/// "→" from a pickup to a drop-off, pointing the way the text reads.
String toArrow() => appIsRtl ? '←' : '→';
