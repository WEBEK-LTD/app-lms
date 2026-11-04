import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/market_api_models.dart' as api;
import 'market_models.dart';

/// 115 One item in the basket, with how much and, at a shop, what to do
/// when it's out when picked.
class MarketBasketLine {
  const MarketBasketLine({
    required this.item,
    required this.quantity,
    this.ifMissing = api.MarketIfMissing.remove,
  });

  final MarketItem item;
  final double quantity;
  final api.MarketIfMissing ifMissing;

  MarketBasketLine copyWith({
    double? quantity,
    api.MarketIfMissing? ifMissing,
  }) => MarketBasketLine(
    item: item,
    quantity: quantity ?? this.quantity,
    ifMissing: ifMissing ?? this.ifMissing,
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

  double quantityOf(String itemId) =>
      lines.where((l) => l.item.id == itemId).firstOrNull?.quantity ?? 0;

  /// A running total for the basket bar; the checkout's quote has the real
  /// one, with the delivery, the coupon and the taxes.
  double get estimate =>
      lines.fold(0, (sum, l) => sum + l.quantity * l.item.priceValue);

  /// The lines for `POST /market/quote`.
  List<api.MarketCartLineInput> inputs({required bool shop}) => [
    for (final l in lines)
      if (int.tryParse(l.item.id) case final id?)
        api.MarketCartLineInput(
          productId: id,
          quantity: l.quantity,
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
      lines.add(MarketBasketLine(item: item, quantity: step));
    } else {
      lines[at] = lines[at].copyWith(quantity: lines[at].quantity + step);
    }
    state = MarketBasket(
      vendor: vendor,
      lines: lines,
      currency: currency,
      decimals: decimals,
    );
  }

  void remove(MarketItem item) {
    final step = item.unit == MarketUnit.piece ? 1.0 : item.step;
    final lines = [...state.lines];
    final at = lines.indexWhere((l) => l.item.id == item.id);
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

  void clear() => state = const MarketBasket();
}

final marketBasketProvider =
    NotifierProvider<MarketBasketController, MarketBasket>(
      MarketBasketController.new,
    );
