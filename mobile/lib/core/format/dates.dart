/// Dates as the plugin sends and expects them, and as the app shows them
/// in the app's language.
library;

import 'package:flutter/widgets.dart' show StringCharacters;
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
  // 110 Latin digits in every language, like the prices, order numbers and
  // times the app shows ("١٩ أكتوبر" next to "₺1,290" mixed two kinds).
  return (DateFormat(pattern, locale)..useNativeDigits = false).format(day);
}

/// "Monday, 12 October".
String dayLabel(DateTime day) => _format('EEEE, d MMMM', day);

/// "Mon".
String shortWeekday(DateTime day) => _format('EEE', day);

/// 110 "Mon" in a day picker's narrow chip; the one-letter form where the
/// language's short name is a whole word (Arabic "الأربعاء": "ر").
String chipWeekday(DateTime day) {
  final short = shortWeekday(day);
  return short.characters.length <= 4 ? short : _format('EEEEE', day);
}

/// 105.4 "Monday" for 1 … "Sunday" for 7 (a timetable's day).
String weekdayName(int weekday) =>
    _format('EEEE', DateTime(2024, 1, weekday.clamp(1, 7)));

/// 105.4 "Mon 12 Oct" for a `yyyy-MM-dd` date; the text itself otherwise.
String isoDayLabel(String date) {
  final day = parseIsoDate(date);
  return day == null ? date : shortDayLabel(day);
}

/// "Oct".
String shortMonth(DateTime day) => _format('MMM', day);

/// "Mon 12 Oct".
String shortDayLabel(DateTime day) => _format('EEE d MMM', day);

/// "12 Oct 2026".
String shortDate(DateTime time) => _format('d MMM y', time.toLocal());

/// "October 2026": a calendar's month.
String monthLabel(DateTime day) => _format('MMMM y', day);

/// "18 Oct, 19:42": a moment on this phone's clock.
String dayAndTime(DateTime time) => _format('d MMM, HH:mm', time.toLocal());

/// "2 April 1990": a calendar day with its year (an intake form's date).
String longDate(DateTime day) => _format('d MMMM y', day);

/// 26 "13:30": a time on the phone's clock.
String clockTime(DateTime time) => _format('HH:mm', time.toLocal());

/// 26 "Today 13:30", "Tomorrow 09:00", "Mon 12 Oct 09:00": when an order is for.
String whenLabel(DateTime time, {DateTime? now}) {
  final local = time.toLocal();
  final today = (now ?? DateTime.now()).toLocal();
  final day = DateTime(local.year, local.month, local.day);
  final days = day
      .difference(DateTime(today.year, today.month, today.day))
      .inDays;
  final clock = clockTime(local);
  if (days == 0) return currentL10n.orderToday(clock);
  if (days == 1) return currentL10n.orderTomorrow(clock);
  return '${shortDayLabel(day)} $clock';
}

/// 26 "09:00" today, else "Tue 09:00": when a closed kitchen opens.
String opensLabel(DateTime time, {DateTime? now}) {
  final local = time.toLocal();
  final today = (now ?? DateTime.now()).toLocal();
  final sameDay =
      local.year == today.year &&
      local.month == today.month &&
      local.day == today.day;
  return sameDay
      ? clockTime(local)
      : '${shortWeekday(local)} ${clockTime(local)}';
}

/// 110 A time zone as people say it: "Istanbul" for `Europe/Istanbul`,
/// "New York" for `America/New_York` (the city the zone is named after).
String zoneName(String zone) {
  final city = zone.split('/').last.replaceAll('_', ' ').trim();
  return city.isEmpty ? zone : city;
}
