import '../../l10n/l10n.dart';
import 'json.dart';

/// 161 A price as the customer sees it: in their currency when the server
/// sent it in it ([converted], a `display`'s text), approximate ("≈ \$12.40",
/// as the shop's prices are), else the shop's own ([shop]). Every price the
/// app shows goes through this, so none stays in the shop's currency while
/// the customer chose another. [exact]: the amount the card is charged in
/// that currency (no "≈").
String customerPrice(String shop, String? converted, {bool exact = false}) {
  if (converted == null || converted.isEmpty) return shop;
  return exact ? converted : currentL10n.approxPrice(converted);
}

/// 161 A price added to another ("+E£60.00"), a [customerPrice]'s
/// approximate sign before the plus ("≈ +\$1.25").
String addedPrice(String shown) => signedPrice('+', shown);

/// 161 A price taken off ("−E£60.00", "≈ −\$1.25").
String takenOffPrice(String shown) => signedPrice('−', shown);

/// 161 [sign] before a price, after a [customerPrice]'s approximate sign.
String signedPrice(String sign, String shown) {
  final approx = currentL10n.approxPrice('');
  if (approx.isNotEmpty && shown.startsWith(approx)) {
    return currentL10n.approxPrice('$sign${shown.substring(approx.length)}');
  }
  return '$sign$shown';
}

/// 161 [customerPrice] for a text that may be missing.
String? customerPriceOr(String? shop, String? converted) =>
    shop == null ? null : customerPrice(shop, converted);

/// 161 The money text [key] of [json] as the customer sees it: the same
/// key of its `display` (the server's conversion) when there is one
/// ([shownKey] when it is named otherwise there), else the shop's. For
/// texts only shown (a line's total, a fee, a coupon's amount), read this
/// way where they are parsed, so no screen shows one in the shop's
/// currency while the customer chose another.
String? customerText(Json json, String key, {String? shownKey}) =>
    customerPriceOr(
      optString(json, key),
      DisplayMoney.tryParse(json['display'])?[shownKey ?? key],
    );

/// 135.5 The same money in the customer's currency (`display` on a price, a
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

  /// 161 The text of [key] in the customer's currency ("total", "fee_formatted").
  String? operator [](String key) => values[key];

  /// 161 As the server sent it, to keep on the phone (a product seen lately).
  Json toJson() => {
    'currency': currency,
    ...values,
    'rate': rate,
    'rate_date': rateDate,
  };

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

/// 135.7 What the card is charged at checkout (`charge` on a cart and a
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

/// 135.7 An order's total in the customer's currency on the day it was
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

/// 135.5 A currency the app can show prices in (`GET /currencies`).
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

/// 135.5 `GET /currencies`: every currency with a day's rate.
class CurrencyList {
  const CurrencyList({required this.items, this.rateDate});

  factory CurrencyList.fromJson(Json json) => CurrencyList(
    rateDate: optString(json, 'rate_date'),
    items: listOf(json, 'items', CurrencyChoice.fromJson),
  );

  final String? rateDate;
  final List<CurrencyChoice> items;
}
