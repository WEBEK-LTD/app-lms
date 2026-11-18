import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/market_api_models.dart' as api;
import 'market_models.dart';

/// 115 One item in the basket, with how much and, at a shop, what to do
/// when it's out when picked.
class MarketBasketLine {
  const MarketBasketLine({
    required this.item,
    required this.quantity,
    this.ifMissing,
    this.substitute,
    this.note,
  });

  final MarketItem item;
  final double quantity;

  /// 115.40 The line's own choice; null follows the order's
  /// ([MarketBasket.ifMissing]).
  final api.MarketIfMissing? ifMissing;

  /// 115.40 The item to bring instead, for [api.MarketIfMissing.chosen].
  final MarketItem? substitute;

  /// 115.40 For the picker ("Sliced", "One piece", or the customer's words).
  final String? note;

  /// What happens to this line when it's out: its own choice, else the order's.
  api.MarketIfMissing choiceIn(MarketBasket basket) =>
      ifMissing ?? basket.ifMissing;

  MarketBasketLine copyWith({
    double? quantity,
    api.MarketIfMissing? ifMissing,
    MarketItem? substitute,
    String? note,
    bool clearNote = false,
  }) => MarketBasketLine(
    item: item,
    quantity: quantity ?? this.quantity,
    ifMissing: ifMissing ?? this.ifMissing,
    substitute: substitute ?? this.substitute,
    note: clearNote ? null : (note ?? this.note),
  );
}

/// The basket: one vendor's items at a time, as the order is one vendor's.
class MarketBasket {
  const MarketBasket({
    this.vendor,
    this.lines = const [],
    this.currency = 'EGP',
    this.decimals = 2,
    this.ifMissing = api.MarketIfMissing.similar,
  });

  final MarketVendor? vendor;
  final List<MarketBasketLine> lines;
  final String currency;
  final int decimals;

  /// 115.40 "If something is missing", for the whole order (a similar item
  /// unless the customer changes it); each line can change its own.
  final api.MarketIfMissing ifMissing;

  MarketBasket _with({
    MarketVendor? vendor,
    bool clearVendor = false,
    List<MarketBasketLine>? lines,
    String? currency,
    int? decimals,
    api.MarketIfMissing? ifMissing,
  }) => MarketBasket(
    vendor: clearVendor ? null : (vendor ?? this.vendor),
    lines: lines ?? this.lines,
    currency: currency ?? this.currency,
    decimals: decimals ?? this.decimals,
    ifMissing: ifMissing ?? this.ifMissing,
  );

  bool get isEmpty => lines.isEmpty;
  int get count => lines.length;

  double quantityOf(String itemId) =>
      lines.where((l) => l.item.id == itemId).firstOrNull?.quantity ?? 0;

  MarketBasketLine? lineOf(String itemId) =>
      lines.where((l) => l.item.id == itemId).firstOrNull;

  /// A running total for the basket bar; the checkout's quote has the real
  /// one, with the delivery, the coupon and the taxes.
  double get estimate =>
      lines.fold(0, (sum, l) => sum + l.quantity * l.item.priceValue);

  /// 115.40 The part of [estimate] that is weighed when picked.
  double get weighedEstimate => lines
      .where((l) => l.item.byWeight)
      .fold(0, (sum, l) => sum + l.quantity * l.item.priceValue);

  bool get hasWeighed => lines.any((l) => l.item.byWeight);

  /// 115.40 The most a cash order can come to once weighed: the weighed
  /// items' estimate plus the tolerance (10% unless the owner sets another).
  double mostAfterWeighing(double tolerancePercent) =>
      estimate + weighedEstimate * tolerancePercent / 100;

  /// The lines for `POST /market/quote`.
  List<api.MarketCartLineInput> inputs({required bool shop}) => [
    for (final l in lines)
      if (int.tryParse(l.item.id) case final id?)
        api.MarketCartLineInput(
          productId: id,
          quantity: l.quantity,
          note: shop ? l.note : null,
          // A chosen item without one picked yet follows the order's choice.
          ifMissing: !shop
              ? null
              : l.ifMissing == api.MarketIfMissing.chosen &&
                    l.substitute == null
              ? null
              : l.ifMissing,
          substituteProductId: l.substitute == null
              ? null
              : int.tryParse(l.substitute!.id),
        ),
  ];
}

class MarketBasketController extends Notifier<MarketBasket> {
  @override
  MarketBasket build() => const MarketBasket();

  /// Whether adding from [vendor] would replace another vendor's basket.
  bool wouldReplace(MarketVendor vendor) =>
      !state.isEmpty && state.vendor?.id != vendor.id;

  void add(
    MarketVendor vendor,
    MarketItem item, {
    required String currency,
    required int decimals,
  }) {
    final step = item.unit == MarketUnit.piece ? 1.0 : item.step;
    final same = state.vendor?.id == vendor.id;
    final lines = same ? [...state.lines] : <MarketBasketLine>[];
    final at = lines.indexWhere((l) => l.item.id == item.id);
    if (at < 0) {
      // 115.40 Weighed items start at their least amount.
      lines.add(
        MarketBasketLine(item: item, quantity: _fit(item, item.minAmount)),
      );
    } else {
      lines[at] = lines[at].copyWith(
        quantity: _fit(item, lines[at].quantity + step),
      );
    }
    state = state._with(
      vendor: vendor,
      lines: lines,
      currency: currency,
      decimals: decimals,
      ifMissing: same ? null : api.MarketIfMissing.similar,
    );
  }

  /// 115.40 [quantity] of [item] in the basket at once (the product page's
  /// weight), with the picker's [note].
  void put(
    MarketVendor vendor,
    MarketItem item,
    double quantity, {
    required String currency,
    required int decimals,
    String? note,
  }) {
    final same = state.vendor?.id == vendor.id;
    final lines = same ? [...state.lines] : <MarketBasketLine>[];
    final at = lines.indexWhere((l) => l.item.id == item.id);
    final amount = _fit(item, quantity);
    if (at < 0) {
      lines.add(MarketBasketLine(item: item, quantity: amount, note: note));
    } else {
      lines[at] = lines[at].copyWith(
        quantity: amount,
        note: note,
        clearNote: note == null,
      );
    }
    state = state._with(
      vendor: vendor,
      lines: lines,
      currency: currency,
      decimals: decimals,
      ifMissing: same ? null : api.MarketIfMissing.similar,
    );
  }

  /// Within the item's least and most, rounded to its step.
  static double _fit(MarketItem item, double quantity) {
    final step = item.unit == MarketUnit.piece ? 1.0 : item.step;
    var q = (quantity / step).round() * step;
    if (item.maxQuantity case final max?) q = q > max ? max : q;
    final min = item.minAmount;
    return double.parse((q < min ? min : q).toStringAsFixed(3));
  }

  void remove(MarketItem item) {
    final step = item.unit == MarketUnit.piece ? 1.0 : item.step;
    final lines = [...state.lines];
    final at = lines.indexWhere((l) => l.item.id == item.id);
    if (at < 0) return;
    final left = lines[at].quantity - step;
    if (left < item.minAmount - 0.0001) {
      lines.removeAt(at);
    } else {
      lines[at] = lines[at].copyWith(quantity: left);
    }
    state = state._with(clearVendor: lines.isEmpty, lines: lines);
  }

  void setIfMissing(
    String itemId,
    api.MarketIfMissing value, {
    MarketItem? substitute,
  }) {
    state = state._with(
      lines: [
        for (final l in state.lines)
          l.item.id == itemId
              ? MarketBasketLine(
                  item: l.item,
                  quantity: l.quantity,
                  ifMissing: value,
                  note: l.note,
                  substitute: value == api.MarketIfMissing.chosen
                      ? (substitute ?? l.substitute)
                      : null,
                )
              : l,
      ],
    );
  }

  /// 115.40 The order's "if something is missing": every line that didn't
  /// choose its own follows it.
  void setOrderIfMissing(api.MarketIfMissing value) =>
      state = state._with(ifMissing: value);

  /// 115 Order again: the basket becomes [lines] from [vendor].
  void refill(
    MarketVendor vendor,
    List<MarketBasketLine> lines, {
    required String currency,
    required int decimals,
  }) => state = MarketBasket(
    vendor: vendor,
    lines: lines,
    currency: currency,
    decimals: decimals,
    ifMissing: state.ifMissing,
  );

  void clear() => state = const MarketBasket();
}

final marketBasketProvider =
    NotifierProvider<MarketBasketController, MarketBasket>(
      MarketBasketController.new,
    );
