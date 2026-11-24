import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart' show Bidi;

/// What a member wrote reads in its own language's direction, whatever the
/// app's: an English question stays left to right in the Arabic app, an
/// Arabic answer right to left in the English one.
TextDirection contentDirection(String text) =>
    Bidi.detectRtlDirectionality(text, isHtml: false)
    ? TextDirection.rtl
    : TextDirection.ltr;
