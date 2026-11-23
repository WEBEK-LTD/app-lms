import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/storage/local_settings.dart';

/// 212 The store's wishlist: the products the customer saved with a heart.
/// A guest's stay on this phone; once they sign in to a shop that keeps
/// wishlists (`StoreConfig.wishlist`) they are added to the account's
/// (`POST /store/wishlist/merge`) and the account's list is the one shown,
/// on every phone. A shop without it (an older server, a site without the
/// plugin's wishlist) keeps the hearts on the phone.
class ShopWishlist extends Notifier<Set<int>> {
  static const storageKey = 'store.wishlist';
  static const maxItems = 200;

  bool _synced = false;

  /// Whether the hearts are the account's (signed in to a shop that keeps
  /// them), else the phone's.
  bool get synced => _synced;

  @override
  Set<int> build() {
    final signedIn = ref.watch(
      authControllerProvider.select((s) => s.isSignedIn),
    );
    _synced = false;
    final local = _readLocal();
    if (signedIn && _serverKeeps()) {
      // The account's list once it answers; the phone's until then.
      unawaited(_sync(local));
    }
    return local;
  }

  bool _serverKeeps() {
    try {
      return ref.read(appConfigProvider).store?.wishlist ?? false;
    } on Object {
      return false;
    }
  }

  Set<int> _readLocal() {
    final raw = ref.read(sharedPreferencesProvider).getString(storageKey);
    if (raw == null) return const {};
    try {
      return {
        for (final v in jsonDecode(raw) as List)
          if (v is num) v.toInt(),
      };
    } on Object {
      return const {};
    }
  }

  void _writeLocal(Set<int> ids) => ref
      .read(sharedPreferencesProvider)
      .setString(storageKey, jsonEncode(ids.take(maxItems).toList()));

  Future<void> _sync(Set<int> local) async {
    final api = ref.read(yallappApiProvider);
    try {
      final ids = local.isEmpty
          ? (await api.getWishlist()).ids
          : await api.mergeWishlist(local.toList());
      // The guest's hearts are the account's now: the phone keeps none.
      _writeLocal(const {});
      _synced = true;
      state = Set.unmodifiable(ids);
    } on Object {
      // Offline or refused: the phone's hearts stay as they are.
    }
  }

  bool contains(int productId) => state.contains(productId);

  /// Saves it, or removes it when saved; throws when the shop refused (the
  /// heart goes back as it was).
  Future<void> toggle(int productId) async {
    final saved = state.contains(productId);
    final before = state;
    final next = saved
        ? ({...state}..remove(productId))
        : {productId, ...state};
    state = Set.unmodifiable(next);
    if (!_synced) {
      _writeLocal(next);
      return;
    }
    final api = ref.read(yallappApiProvider);
    try {
      if (saved) {
        await api.removeFromShopWishlist(productId);
      } else {
        await api.addToShopWishlist(productId);
      }
    } on Object {
      state = before;
      rethrow;
    }
  }
}

final shopWishlistProvider = NotifierProvider<ShopWishlist, Set<int>>(
  ShopWishlist.new,
);

/// The wishlist's products as the shop serves them now: the account's, or
/// the phone's hearts asked for by id.
final wishlistProductsProvider =
    FutureProvider.autoDispose<List<ProductSummary>>((ref) async {
      final ids = ref.watch(shopWishlistProvider);
      final api = ref.watch(yallappApiProvider);
      final list = ref.read(shopWishlistProvider.notifier);
      if (list.synced) return (await api.getWishlist()).page.items;
      if (ids.isEmpty) return const [];
      final page = await api.listProducts(
        ProductQuery(ids: ids.take(50).toList(), perPage: 50),
      );
      final byId = {for (final p in page.items) p.id: p};
      return [for (final id in ids) ?byId[id]];
    });
