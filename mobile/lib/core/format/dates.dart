/// Dates as the plugin sends and expects them, and as the app shows them.
/// English only, like every user-facing string.
library;

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

const weekdayNames = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/// "Monday, 12 October".
String dayLabel(DateTime day) =>
    '${weekdayNames[day.weekday - 1]}, ${day.day} ${monthNames[day.month - 1]}';

/// "Mon".
String shortWeekday(DateTime day) =>
    weekdayNames[day.weekday - 1].substring(0, 3);

/// "Oct".
String shortMonth(DateTime day) => monthNames[day.month - 1].substring(0, 3);

/// "Mon 12 Oct".
String shortDayLabel(DateTime day) =>
    '${shortWeekday(day)} ${day.day} ${shortMonth(day)}';
