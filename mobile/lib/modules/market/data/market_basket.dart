import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/market_api_models.dart' as api;
import 'market_models.dart';

/// 115 One item in the basket, with how much and, at a shop, what to do
/// when it's out when picked. 115.23 A dish keeps the choices the customer
/// picked (its size, its extras: their ids for the server, their names to
/// show) and a note for the kitchen; the same dish with other choices is
/// another line. 115.40 At a shop, one line per product, with its own
/// "if something is missing" (or the order's), the customer's own item to
/// bring instead, and a note for the picker.
class MarketBasketLine {
  const MarketBasketLine({
    required this.item,
    required this.quantity,
    this.ifMissing,
    this.substitute,
    this.choices = const [],
    this.choiceNames = const [],
    this.extra = 0,
    this.note,
  });

  final MarketItem item;
  final double quantity;

  /// 115.40 The line's own choice; null follows the order's
  /// ([MarketBasket.ifMissing]).
  final api.MarketIfMissing? ifMissing;

  /// 115.40 The item to bring instead, for [api.MarketIfMissing.chosen].
  final MarketItem? substitute;

  /// The chosen choices' ids, as `MarketCartInput.lines[].choices`.
  final List<int> choices;

  /// The same choices' names, for the basket and the checkout.
  final List<String> choiceNames;

  /// What the choices add to one item, for the running total only.
  final double extra;

  /// For the kitchen, or (115.40) the picker: "Sliced", "One piece" or the
  /// customer's words.
  final String? note;

  /// What happens to this line when it's out: its own choice, else the order's.
  api.MarketIfMissing choiceIn(MarketBasket basket) =>
      ifMissing ?? basket.ifMissing;

  /// Whether [other] is the same item with the same choices and note.
  bool sameAs(MarketBasketLine other) =>
      item.id == other.item.id &&
      note == other.note &&
      choices.length == other.choices.length &&
      choices.toSet().containsAll(other.choices);

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
    choices: choices,
    choiceNames: choiceNames,
    extra: extra,
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

  /// How many of the item, whatever was chosen with it.
  double quantityOf(String itemId) => lines
      .where((l) => l.item.id == itemId)
      .fold(0, (sum, l) => sum + l.quantity);

  /// 115.40 A shop's line of the item (one per product).
  MarketBasketLine? lineOf(String itemId) =>
      lines.where((l) => l.item.id == itemId).firstOrNull;

  /// A running total for the basket bar; the checkout's quote has the real
  /// one, with the delivery, the coupon and the taxes.
  double get estimate => lines.fold(
    0,
    (sum, l) => sum + l.quantity * (l.item.priceValue + l.extra),
  );

  /// 115.40 The part of [estimate] that is weighed when picked.
  double get weighedEstimate => lines
      .where((l) => l.item.byWeight)
      .fold(0, (sum, l) => sum + l.quantity * l.item.priceValue);

  bool get hasWeighed => lines.any((l) => l.item.byWeight);

  /// 115.40 The most a cash order can come to once weighed: the weighed
  /// items' estimate plus the tolerance (10% unless the owner sets another).
  double mostAfterWeighing(double tolerancePercent) =>
      estimate + weighedEstimate * tolerancePercent / 100;

  /// The lines for `POST /market/quote` and `POST /market/orders`, each
  /// dish with its choices and note; 115.40 each shop line with its own
  /// "if something is missing" (none: the order's) and its chosen item.
  List<api.MarketCartLineInput> inputs({required bool shop}) => [
    for (final l in lines)
      if (int.tryParse(l.item.id) case final id?)
        api.MarketCartLineInput(
          productId: id,
          quantity: l.quantity,
          choices: l.choices,
          note: l.note,
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

  /// One more of [item] (a step of it); 115.23 with what was chosen for a
  /// dish, [count] of them at once (from its choices' sheet). 115.40 At a
  /// shop, one line per product, starting at its least amount and kept
  /// within its most.
  void add(
    MarketVendor vendor,
    MarketItem item, {
    required String currency,
    required int decimals,
    List<int> choices = const [],
    List<String> choiceNames = const [],
    double extra = 0,
    String? note,
    int count = 1,
  }) {
    final step = item.unit == MarketUnit.piece ? 1.0 : item.step;
    final same = state.vendor?.id == vendor.id;
    final shop = vendor.sellsGoods;
    final lines = same ? [...state.lines] : <MarketBasketLine>[];
    final line = MarketBasketLine(
      item: item,
      quantity: shop ? _fit(item, item.minAmount) : step * count,
      choices: choices,
      choiceNames: choiceNames,
      extra: extra,
      note: note,
    );
    final at = shop
        ? lines.indexWhere((l) => l.item.id == item.id)
        : lines.indexWhere((l) => l.sameAs(line));
    if (at < 0) {
      lines.add(line);
    } else {
      final more = lines[at].quantity + step * count;
      lines[at] = lines[at].copyWith(quantity: shop ? _fit(item, more) : more);
    }
    state = state._with(
      vendor: vendor,
      lines: lines,
      currency: currency,
      decimals: decimals,
      ifMissing: same ? null : api.MarketIfMissing.similar,
    );
  }

  /// 115.40 [quantity] of a shop's [item] in the basket at once (the
  /// product page's weight), with the picker's [note].
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

  /// One less of [item]: of [line] when given (a checkout row), else of
  /// the item's last line; under its least amount, the line goes.
  void remove(MarketItem item, {MarketBasketLine? line}) {
    final step = item.unit == MarketUnit.piece ? 1.0 : item.step;
    final lines = [...state.lines];
    final at = line != null
        ? lines.indexWhere((l) => l.sameAs(line))
        : lines.lastIndexWhere((l) => l.item.id == item.id);
    if (at < 0) return;
    final left = lines[at].quantity - step;
    if (left <= 0.0001 || left < item.minAmount - 0.0001) {
      lines.removeAt(at);
    } else {
      lines[at] = lines[at].copyWith(quantity: left);
    }
    state = state._with(clearVendor: lines.isEmpty, lines: lines);
  }

  /// One more of the same line (its choices and note kept).
  void again(MarketBasketLine line) {
    final step = line.item.unit == MarketUnit.piece ? 1.0 : line.item.step;
    state = state._with(
      lines: [
        for (final l in state.lines)
          l.sameAs(line) ? l.copyWith(quantity: l.quantity + step) : l,
      ],
    );
  }

  /// A shop line's own "if something is missing", with the item to bring
  /// instead for [api.MarketIfMissing.chosen].
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
                  choices: l.choices,
                  choiceNames: l.choiceNames,
                  extra: l.extra,
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
