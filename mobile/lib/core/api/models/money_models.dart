import 'json.dart';

/// 133.5 The same money in the customer's currency (`display` on a price, a
/// cart or a menu's quote, `DisplayMoney` in the contract): each amount of
/// the object it is on with its formatted text, under the same names, at
/// the day's rate. Approximate: the customer pays the shop's amount unless
/// the cart's `charge` says otherwise.
class DisplayMoney {
  const DisplayMoney({
    required this.currency,
    required this.rate,
    this.rateDate,
    this.values = const {},
  });

  factory DisplayMoney.fromJson(Json json) => DisplayMoney(
    currency: reqString(json, 'currency'),
    rate: optDouble(json, 'rate') ?? 0,
    rateDate: optString(json, 'rate_date'),
    values: {
      for (final e in json.entries)
        if (e.value is String && e.key != 'currency' && e.key != 'rate_date')
          e.key: e.value as String,
    },
  );

  /// Null for anything that isn't one (missing, null, an older server).
  static DisplayMoney? tryParse(Object? raw) {
    if (raw is! Map<String, dynamic>) return null;
    try {
      return DisplayMoney.fromJson(raw);
    } on Object {
      return null;
    }
  }

  final String currency;

  /// Units of [currency] for one of the shop's.
  final double rate;

  /// The rates' day, "2026-11-16".
  final String? rateDate;
  final Map<String, String> values;

  /// A price's "$12.40".
  String? get formatted => values['formatted'];
  String? get regularFormatted => values['regular_formatted'];

  /// A cart's total ("$13.40"): `total` on a store cart, `total_formatted`
  /// on a menu's quote.
  String? get total => values['total_formatted'] ?? _formattedOnly('total');
  String? get subtotal =>
      values['subtotal_formatted'] ?? _formattedOnly('subtotal');

  String? _formattedOnly(String key) {
    final text = values[key];
    // A store cart's `total` is formatted; a menu's is the amount.
    return text == null || double.tryParse(text) != null ? null : text;
  }
}

/// 133.7 What the card is charged at checkout (`charge` on a cart and a
/// checkout link): the shop's currency, or the customer's when the shop
/// charges in it and its gateway takes it.
class CartCharge {
  const CartCharge({
    required this.currency,
    required this.total,
    required this.inCustomerCurrency,
    this.reason,
  });

  factory CartCharge.fromJson(Json json) => CartCharge(
    currency: reqString(json, 'currency'),
    total: reqString(json, 'total'),
    inCustomerCurrency: boolOr(json, 'in_customer_currency', false),
    reason: optString(json, 'reason'),
  );

  static CartCharge? tryParse(Object? raw) {
    if (raw is! Map<String, dynamic>) return null;
    try {
      return CartCharge.fromJson(raw);
    } on Object {
      return null;
    }
  }

  final String currency;

  /// "E£600.00", "$12.40".
  final String total;
  final bool inCustomerCurrency;

  /// `gateway`: the shop charges in the customer's currency, but its card
  /// gateway doesn't take this one, so the shop's is charged.
  final String? reason;
}

/// 133.7 An order's total in the customer's currency on the day it was
/// placed (`customer_currency` on an order).
class OrderCustomerCurrency {
  const OrderCustomerCurrency({
    required this.currency,
    required this.total,
    required this.charged,
    this.rateDate,
  });

  factory OrderCustomerCurrency.fromJson(Json json) => OrderCustomerCurrency(
    currency: reqString(json, 'currency'),
    total: reqString(json, 'total'),
    charged: boolOr(json, 'charged', false),
    rateDate: optString(json, 'rate_date'),
  );

  static OrderCustomerCurrency? tryParse(Object? raw) {
    if (raw is! Map<String, dynamic>) return null;
    try {
      return OrderCustomerCurrency.fromJson(raw);
    } on Object {
      return null;
    }
  }

  final String currency;
  final String total;

  /// The card was charged in it (else it was shown as approximate).
  final bool charged;
  final String? rateDate;
}

/// 133.5 A currency the app can show prices in (`GET /currencies`).
class CurrencyChoice {
  const CurrencyChoice({
    required this.code,
    required this.name,
    required this.symbol,
    this.digits = 2,
    this.usual = false,
  });

  factory CurrencyChoice.fromJson(Json json) => CurrencyChoice(
    code: reqString(json, 'code'),
    name: reqString(json, 'name'),
    symbol: optString(json, 'symbol') ?? reqString(json, 'code'),
    digits: intOr(json, 'digits', 2),
    usual: boolOr(json, 'usual', false),
  );

  final String code;

  /// In the app's language: "Kuwaiti Dinar", "دينار كويتي".
  final String name;
  final String symbol;
  final int digits;
  final bool usual;
}

/// 133.5 `GET /currencies`: every currency with a day's rate.
class CurrencyList {
  const CurrencyList({required this.items, this.rateDate});

  factory CurrencyList.fromJson(Json json) => CurrencyList(
    rateDate: optString(json, 'rate_date'),
    items: listOf(json, 'items', CurrencyChoice.fromJson),
  );

  final String? rateDate;
  final List<CurrencyChoice> items;
}
