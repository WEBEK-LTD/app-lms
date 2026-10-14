/// Dates as the plugin sends and expects them, and as the app shows them
/// in the app's language.
library;

import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';

import '../l10n/l10n.dart';

/// `yyyy-MM-dd`.
String isoDate(DateTime day) =>
    '${day.year.toString().padLeft(4, '0')}-'
    '${day.month.toString().padLeft(2, '0')}-'
    '${day.day.toString().padLeft(2, '0')}';

/// A `yyyy-MM-dd` date as a local calendar day, or null.
DateTime? parseIsoDate(String value) {
  final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})$').firstMatch(value);
  if (m == null) return null;
  return DateTime(int.parse(m[1]!), int.parse(m[2]!), int.parse(m[3]!));
}

/// A calendar day [days] after [day], safe across daylight saving changes.
DateTime addDays(DateTime day, int days) =>
    DateTime(day.year, day.month, day.day + days);

/// Formats [day] with an `intl` [pattern] in the app's language.
String _format(String pattern, DateTime day) {
  final locale = currentL10n.localeName;
  // Loads every locale's date names (bundled, synchronous).
  initializeDateFormatting(locale);
  return DateFormat(pattern, locale).format(day);
}

/// "Monday, 12 October".
String dayLabel(DateTime day) => _format('EEEE, d MMMM', day);

/// "Mon".
String shortWeekday(DateTime day) => _format('EEE', day);

/// "Oct".
String shortMonth(DateTime day) => _format('MMM', day);

/// "Mon 12 Oct".
String shortDayLabel(DateTime day) => _format('EEE d MMM', day);

/// "12 Oct 2026".
String shortDate(DateTime time) => _format('d MMM y', time.toLocal());

/// "2 April 1990": a calendar day with its year (an intake form's date).
String longDate(DateTime day) => _format('d MMMM y', day);
