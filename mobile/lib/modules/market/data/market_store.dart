import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart' as api;
import '../../../core/auth/auth_controller.dart';
import '../../../core/providers.dart';
import 'market_models.dart';
import 'market_providers.dart';

/// 115.40 A supermarket's or a shop's catalog in the customer app: a
/// department's products by aisle, or this store's search (by words or a
/// barcode), loaded page after page by the server's cursor (by page number
/// from servers without one); "Buy again" from the customer's earlier
/// orders at this store.

/// What a product list shows: one department (and one of its aisles), or
/// this store's search.
typedef MarketShelfQuery = ({
  String vendorId,
  String? department,
  String? aisle,
  String? query,
  String? barcode,
});

class MarketProductList {
  const MarketProductList({
    this.items = const [],
    this.total = 0,
    this.loading = false,
    this.done = false,
    this.error,
    this.cursor,
    this.page = 0,
  });

  final List<MarketItem> items;

  /// How many there are in all (the server's count, else what is loaded).
  final int total;
  final bool loading;

  /// Everything is loaded.
  final bool done;
  final Object? error;

  /// The next page's cursor; null for the first page, or by page number.
  final String? cursor;
  final int page;

  bool get firstLoad => loading && items.isEmpty;

  MarketProductList copyWith({
    List<MarketItem>? items,
    int? total,
    bool? loading,
    bool? done,
    Object? error,
    bool clearError = false,
    String? cursor,
    int? page,
  }) => MarketProductList(
    items: items ?? this.items,
    total: total ?? this.total,
    loading: loading ?? this.loading,
    done: done ?? this.done,
    error: clearError ? null : (error ?? this.error),
    cursor: cursor ?? this.cursor,
    page: page ?? this.page,
  );
}

/// How many products a page asks for.
const marketPageSize = 24;

class MarketProductListController extends Notifier<MarketProductList> {
  MarketProductListController(this.query);

  final MarketShelfQuery query;
  int _generation = 0;

  @override
  MarketProductList build() {
    Future.microtask(_first);
    return const MarketProductList(loading: true);
  }

  Future<void> _first() async {
    final generation = ++_generation;
    state = const MarketProductList(loading: true);
    await _load(generation, replace: true);
  }

  /// The next page, when there is one and none is loading.
  Future<void> loadMore() async {
    if (state.loading || state.done || state.error != null) return;
    state = state.copyWith(loading: true);
    await _load(_generation, replace: false);
  }

  Future<void> retry() async {
    if (state.items.isEmpty) return _first();
    state = state.copyWith(loading: true, clearError: true);
    await _load(_generation, replace: false);
  }

  Future<void> _load(int generation, {required bool replace}) async {
    final vendorId = int.tryParse(query.vendorId);
    if (vendorId == null) {
      state = const MarketProductList(done: true);
      return;
    }
    try {
      final page = await ref
          .read(yallappApiProvider)
          .listMarketProducts(
            vendorId,
            page: replace ? 1 : state.page + 1,
            perPage: marketPageSize,
            department: int.tryParse(query.department ?? ''),
            aisle: int.tryParse(query.aisle ?? ''),
            query: query.query,
            barcode: query.barcode,
            cursor: replace ? null : state.cursor,
          );
      if (!ref.mounted || generation != _generation) return;
      final items = [
        if (!replace) ...state.items,
        for (final p in page.items) marketItemFrom(p),
      ];
      state = MarketProductList(
        items: items,
        total: page.meta.total > items.length ? page.meta.total : items.length,
        done: !page.hasMore || page.items.isEmpty,
        cursor: page.nextCursor,
        page: page.meta.page,
      );
    } on Object catch (e) {
      if (!ref.mounted || generation != _generation) return;
      state = state.copyWith(loading: false, error: e);
    }
  }
}

final marketProductListProvider = NotifierProvider.autoDispose
    .family<MarketProductListController, MarketProductList, MarketShelfQuery>(
      MarketProductListController.new,
    );

/// 115.40 An item from the customer's earlier orders at a store, to add again.
class MarketBuyAgain {
  const MarketBuyAgain({required this.items, required this.orders});

  final List<MarketItem> items;

  /// How many of the customer's orders they come from.
  final int orders;

  static const none = MarketBuyAgain(items: [], orders: 0);
}

/// 115.40 "Buy again" at [vendorId]: the items of the customer's finished
/// orders there, newest first, each once (none signed out, or when the
/// orders can't be read). Tests and screenshots override it.
final marketBuyAgainProvider = FutureProvider.autoDispose
    .family<MarketBuyAgain, String>((ref, vendorId) async {
      if (!ref.watch(authControllerProvider).isSignedIn) {
        return MarketBuyAgain.none;
      }
      final api.Paged<api.MarketOrder> page;
      try {
        page = await ref.contentApi.listMyMarketOrders();
      } on ApiException {
        return MarketBuyAgain.none;
      }
      final seen = <int>{};
      final items = <MarketItem>[];
      var orders = 0;
      for (final o in page.items) {
        if ('${o.vendor.id}' != vendorId) continue;
        if (o.status != api.MarketOrderStatus.delivered &&
            o.status != api.MarketOrderStatus.pickedUp) {
          continue;
        }
        orders += 1;
        for (final l in o.lines) {
          if (l.outcome == 'missing' || !seen.add(l.productId)) continue;
          items.add(marketItemFromLine(l));
          if (items.length >= 12) break;
        }
      }
      return MarketBuyAgain(items: items, orders: orders);
    });

/// An order's line as an item to add again (at the price it had then; the
/// checkout's quote has today's).
MarketItem marketItemFromLine(api.MarketOrderLine l) => MarketItem(
  id: '${l.productId}',
  name: l.name,
  imageUrl: l.imageUrl,
  photos: [if (l.imageUrl != null) l.imageUrl!],
  price: l.unitPrice.formatted,
  priceValue: double.tryParse(l.unitPrice.amount) ?? 0,
  unit: switch (l.unit) {
    api.ProductUnit.item => MarketUnit.piece,
    api.ProductUnit.kg => MarketUnit.kg,
    api.ProductUnit.g => MarketUnit.g,
    api.ProductUnit.l => MarketUnit.l,
  },
  step: switch (l.unit) {
    api.ProductUnit.item => 1,
    api.ProductUnit.g => 100,
    _ => 0.25,
  },
);

/// 115.40 The product with [barcode] (or that SKU) at [vendorId] only;
/// null when the store has none.
Future<MarketItem?> findMarketBarcode(
  WidgetRef ref,
  String vendorId,
  String barcode,
) async {
  final id = int.tryParse(vendorId);
  if (id == null || barcode.trim().isEmpty) return null;
  final page = await ref
      .read(yallappApiProvider)
      .listMarketProducts(id, barcode: barcode.trim(), perPage: 1);
  final found = page.items.firstOrNull;
  return found == null ? null : marketItemFrom(found);
}
