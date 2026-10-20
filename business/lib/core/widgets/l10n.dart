import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

import '../../l10n/app_localizations.dart';

extension L10nContext on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
  String get lang => Localizations.localeOf(this).languageCode;
}

/// 59 Dates and times in the person's language.
extension Dates on BuildContext {
  String date(DateTime t) => DateFormat.yMMMd(lang).format(t.toLocal());
  String time(DateTime t) => DateFormat.Hm(lang).format(t.toLocal());
  String dateTime(DateTime t) =>
      DateFormat.yMMMd(lang).add_Hm().format(t.toLocal());
  String day(String isoDate) {
    final parsed = DateTime.tryParse(isoDate);
    return parsed == null ? isoDate : DateFormat.MMMEd(lang).format(parsed);
  }

  /// "5 min ago", "3 h ago", or the date.
  String ago(DateTime t, {DateTime? now}) {
    final diff = (now ?? DateTime.now()).difference(t.toLocal());
    if (diff.inMinutes < 1) return l10n.justNow;
    if (diff.inMinutes < 60) return l10n.minutesAgo(diff.inMinutes);
    if (diff.inHours < 24) return l10n.hoursAgo(diff.inHours);
    return date(t);
  }

  String number(num value) => NumberFormat.decimalPattern(lang).format(value);
  String percent(double share) =>
      NumberFormat.percentPattern(lang).format(share);
}
