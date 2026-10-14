/// Money as the shop shows it, for prices the app adds up itself (a dish
/// with its options). The server still prices the cart.
library;

import 'package:intl/intl.dart';

const _symbols = {'TRY': '₺', 'USD': r'$', 'EUR': '€', 'GBP': '£'};

/// "₺1,234.50", like the hosted API's prices.
String formatMoney(int cents, String currency) {
  final symbol =
      _symbols[currency] ??
      NumberFormat.simpleCurrency(name: currency).currencySymbol;
  return NumberFormat.currency(
    locale: 'en_US',
    symbol: symbol,
    decimalDigits: 2,
  ).format(cents / 100);
}
