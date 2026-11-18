/// Money as the shop shows it, for prices the app adds up itself (a dish
/// with its options). The server still prices the cart.
///
/// 135.2 Any ISO 4217 currency, each with its own digits after the point
/// (ISO 4217's minor units: none for the yen and the won, three for the
/// dinars), and never an error for a code the app doesn't know: it is then
/// written before the number. Amounts are cents (hundredths) for every
/// currency, as the hosted API keeps them.
library;

import 'package:intl/intl.dart';

const _symbols = {'TRY': '₺', 'USD': r'$', 'EUR': '€', 'GBP': '£'};

const _zeroDigits = {
  'BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', //
  'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
};
const _threeDigits = {'BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'};

/// 135.2 Digits after the point: 0 (JPY), 3 (KWD) or 2.
int currencyDigits(String currency) {
  final code = currency.toUpperCase();
  if (_zeroDigits.contains(code)) return 0;
  if (_threeDigits.contains(code)) return 3;
  return 2;
}

/// The sign written before the number: ours for a few, intl's when it is a
/// sign (E£, ¥, ₹), else the code and a no-break space ("KWD 1.250", where
/// intl would write "din"), as the server writes them.
String _symbolOf(String currency) {
  final own = _symbols[currency];
  if (own != null) return own;
  try {
    final symbol = NumberFormat.simpleCurrency(
      locale: 'en_US',
      name: currency,
    ).currencySymbol;
    if (symbol.isEmpty || RegExp(r'^[A-Za-z. ]+$').hasMatch(symbol)) {
      return '$currency\u00a0';
    }
    return symbol;
  } catch (_) {
    return '$currency\u00a0';
  }
}

/// "₺1,234.50", "KWD 1.250", "¥1,250", like the hosted API's prices. Latin
/// digits in every language, as the server writes them.
String formatMoney(int cents, String currency) {
  final digits = currencyDigits(currency);
  final symbol = _symbolOf(currency);
  try {
    return NumberFormat.currency(
      locale: 'en_US',
      symbol: symbol,
      decimalDigits: digits,
    ).format(cents / 100);
  } catch (_) {
    return '$symbol${(cents / 100).toStringAsFixed(digits)}';
  }
}

/// 161 The shop's [cents] in the customer's currency [to] at [rate] (units
/// of it for one of the shop's, a `display`'s), rounded to what [to] holds
/// (whole yen): as the server converts (lib/money/rates.ts
/// `convertCents`), for an amount the app adds up itself (a bouquet with
/// its options, times how many).
int convertCents(int cents, double rate, String to) {
  final step = currencyDigits(to) == 0 ? 100 : 1;
  return ((cents * rate).round() / step).round() * step;
}
