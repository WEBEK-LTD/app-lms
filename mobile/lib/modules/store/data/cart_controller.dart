import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/json.dart';
import '../../../core/api/models/models.dart';
import '../../../core/storage/local_settings.dart';

/// One line of the cart kept on the device. The name, image and price are
/// what the customer saw when adding it; the shop prices the cart again
/// before checkout (`POST /store/cart`).
@immutable
class CartItem {
  const CartItem({
    required this.productId,
    required this.quantity,
    required this.name,
    this.variationId,
    this.attributes = const {},
    this.imageUrl,
    this.price,
    this.maxQuantity,
  });

  factory CartItem.fromJson(Json json) => CartItem(
    productId: reqInt(json, 'product_id'),
    variationId: optInt(json, 'variation_id'),
    quantity: reqInt(json, 'quantity'),
    name: reqString(json, 'name'),
    attributes: {
      if (json['attributes'] is Map)
        for (final e in (json['attributes'] as Map).entries)
          '${e.key}': '${e.value}',
    },
    imageUrl: optString(json, 'image_url'),
    price: optString(json, 'price'),
    maxQuantity: optInt(json, 'max_quantity'),
  );

  final int productId;
  final int? variationId;
  final int quantity;
  final String name;

  /// Options chosen for attributes the variation leaves as "any".
  final Map<String, String> attributes;
  final String? imageUrl;
  final String? price;
  final int? maxQuantity;

  /// Lines with the same product, variation and options merge.
  String get key {
    final options = attributes.keys.toList()..sort();
    return [
      productId,
      variationId ?? 0,
      for (final k in options) '$k=${attributes[k]}',
    ].join('|');
  }

  CartItem withQuantity(int value) => CartItem(
    productId: productId,
    variationId: variationId,
    quantity: value,
    name: name,
    attributes: attributes,
    imageUrl: imageUrl,
    price: price,
    maxQuantity: maxQuantity,
  );

  CartLineInput toInput() => CartLineInput(
    productId: productId,
    variationId: variationId,
    quantity: quantity,
    attributes: attributes,
  );

  Json toJson() => {
    'product_id': productId,
    'variation_id': variationId,
    'quantity': quantity,
    'name': name,
    'attributes': attributes,
    'image_url': imageUrl,
    'price': price,
    'max_quantity': maxQuantity,
  };
}

/// The cart, kept on this device until checkout.
class CartController extends Notifier<List<CartItem>> {
  static const storageKey = 'store.cart';
  static const maxLines = 100;
  static const maxQuantity = 9999;

  @override
  List<CartItem> build() {
    final raw = ref.watch(sharedPreferencesProvider).getString(storageKey);
    if (raw == null) return const [];
    try {
      return [
        for (final line in jsonDecode(raw) as List)
          CartItem.fromJson(asJson(line)),
      ];
    } on Object {
      return const [];
    }
  }

  void _save(List<CartItem> items) {
    state = List.unmodifiable(items);
    ref
        .read(sharedPreferencesProvider)
        .setString(storageKey, jsonEncode([for (final i in items) i.toJson()]));
  }

  int _cap(int quantity, int? max) {
    final limit = (max != null && max > 0 && max < maxQuantity)
        ? max
        : maxQuantity;
    return quantity.clamp(1, limit);
  }

  /// Adds [item], merging with the same line. Returns false when the cart is
  /// full.
  bool add(CartItem item) {
    final items = [...state];
    final at = items.indexWhere((i) => i.key == item.key);
    if (at >= 0) {
      final current = items[at];
      items[at] = item.withQuantity(
        _cap(current.quantity + item.quantity, item.maxQuantity),
      );
    } else {
      if (items.length >= maxLines) return false;
      items.add(item.withQuantity(_cap(item.quantity, item.maxQuantity)));
    }
    _save(items);
    return true;
  }

  void setQuantity(String key, int quantity) {
    if (quantity < 1) return remove(key);
    _save([
      for (final i in state)
        i.key == key ? i.withQuantity(_cap(quantity, i.maxQuantity)) : i,
    ]);
  }

  void remove(String key) => _save([
    for (final i in state)
      if (i.key != key) i,
  ]);

  void clear() => _save(const []);
}

final cartProvider = NotifierProvider<CartController, List<CartItem>>(
  CartController.new,
);

final cartCountProvider = Provider<int>(
  (ref) => ref.watch(cartProvider).fold(0, (sum, i) => sum + i.quantity),
);
