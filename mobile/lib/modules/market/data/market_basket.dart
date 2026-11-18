import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/market_api_models.dart' as api;
import 'market_models.dart';

/// 115 One item in the basket, with how much and, at a shop, what to do
/// when it's out when picked. 115.23 A dish keeps the choices the customer
/// picked (its size, its extras: their ids for the server, their names to
/// show) and a note for the kitchen; the same dish with other choices is
/// another line.
class MarketBasketLine {
  const MarketBasketLine({
    required this.item,
    required this.quantity,
    this.ifMissing = api.MarketIfMissing.remove,
    this.choices = const [],
    this.choiceNames = const [],
    this.extra = 0,
    this.note,
  });

  final MarketItem item;
  final double quantity;
  final api.MarketIfMissing ifMissing;

  /// The chosen choices' ids, as `MarketCartInput.lines[].choices`.
  final List<int> choices;

  /// The same choices' names, for the basket and the checkout.
  final List<String> choiceNames;

  /// What the choices add to one item, for the running total only.
  final double extra;
  final String? note;

  /// Whether [other] is the same item with the same choices and note.
  bool sameAs(MarketBasketLine other) =>
      item.id == other.item.id &&
      note == other.note &&
      choices.length == other.choices.length &&
      choices.toSet().containsAll(other.choices);

  MarketBasketLine copyWith({
    double? quantity,
    api.MarketIfMissing? ifMissing,
  }) => MarketBasketLine(
    item: item,
    quantity: quantity ?? this.quantity,
    ifMissing: ifMissing ?? this.ifMissing,
    choices: choices,
    choiceNames: choiceNames,
    extra: extra,
    note: note,
  );
}

/// The basket: one vendor's items at a time, as the order is one vendor's.
class MarketBasket {
  const MarketBasket({
    this.vendor,
    this.lines = const [],
    this.currency = 'EGP',
    this.decimals = 2,
  });

  final MarketVendor? vendor;
  final List<MarketBasketLine> lines;
  final String currency;
  final int decimals;

  bool get isEmpty => lines.isEmpty;
  int get count => lines.length;

  /// How many of the item, whatever was chosen with it.
  double quantityOf(String itemId) => lines
      .where((l) => l.item.id == itemId)
      .fold(0, (sum, l) => sum + l.quantity);

  /// A running total for the basket bar; the checkout's quote has the real
  /// one, with the delivery, the coupon and the taxes.
  double get estimate => lines.fold(
    0,
    (sum, l) => sum + l.quantity * (l.item.priceValue + l.extra),
  );

  /// The lines for `POST /market/quote` and `POST /market/orders`, each
  /// dish with its choices and note.
  List<api.MarketCartLineInput> inputs({required bool shop}) => [
    for (final l in lines)
      if (int.tryParse(l.item.id) case final id?)
        api.MarketCartLineInput(
          productId: id,
          quantity: l.quantity,
          choices: l.choices,
          note: l.note,
          ifMissing: shop ? l.ifMissing : null,
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
  /// dish, [count] of them at once (from its choices' sheet).
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
    final lines = same ? [...state.lines] : <MarketBasketLine>[];
    final line = MarketBasketLine(
      item: item,
      quantity: step * count,
      choices: choices,
      choiceNames: choiceNames,
      extra: extra,
      note: note,
    );
    final at = lines.indexWhere((l) => l.sameAs(line));
    if (at < 0) {
      lines.add(line);
    } else {
      lines[at] = lines[at].copyWith(
        quantity: lines[at].quantity + step * count,
      );
    }
    state = MarketBasket(
      vendor: vendor,
      lines: lines,
      currency: currency,
      decimals: decimals,
    );
  }

  /// One less of [item]: of [line] when given (a checkout row), else of
  /// the item's last line.
  void remove(MarketItem item, {MarketBasketLine? line}) {
    final step = item.unit == MarketUnit.piece ? 1.0 : item.step;
    final lines = [...state.lines];
    final at = line != null
        ? lines.indexWhere((l) => l.sameAs(line))
        : lines.lastIndexWhere((l) => l.item.id == item.id);
    if (at < 0) return;
    final left = lines[at].quantity - step;
    if (left <= 0.0001) {
      lines.removeAt(at);
    } else {
      lines[at] = lines[at].copyWith(quantity: left);
    }
    state = MarketBasket(
      vendor: lines.isEmpty ? null : state.vendor,
      lines: lines,
      currency: state.currency,
      decimals: state.decimals,
    );
  }

  /// One more of the same line (its choices and note kept).
  void again(MarketBasketLine line) {
    final step = line.item.unit == MarketUnit.piece ? 1.0 : line.item.step;
    state = MarketBasket(
      vendor: state.vendor,
      lines: [
        for (final l in state.lines)
          l.sameAs(line) ? l.copyWith(quantity: l.quantity + step) : l,
      ],
      currency: state.currency,
      decimals: state.decimals,
    );
  }

  void setIfMissing(String itemId, api.MarketIfMissing value) {
    state = MarketBasket(
      vendor: state.vendor,
      lines: [
        for (final l in state.lines)
          l.item.id == itemId ? l.copyWith(ifMissing: value) : l,
      ],
      currency: state.currency,
      decimals: state.decimals,
    );
  }

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
  );

  void clear() => state = const MarketBasket();
}

final marketBasketProvider =
    NotifierProvider<MarketBasketController, MarketBasket>(
      MarketBasketController.new,
    );
