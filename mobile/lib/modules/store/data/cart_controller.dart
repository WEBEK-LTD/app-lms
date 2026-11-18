import '../../../core/services/analytics_providers.dart';

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
    this.options = const [],
    this.optionNames = const [],
    this.addonOf,
    this.bouquet,
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
    options: [
      for (final o in (json['options'] as List? ?? const []))
        if (o is String) o,
    ],
    optionNames: [
      for (final o in (json['option_names'] as List? ?? const []))
        if (o is String) o,
    ],
    addonOf: optInt(json, 'addon_of'),
    bouquet: BouquetPart.tryParse(json['bouquet']),
  );

  /// 162 Part of a bouquet the customer built (its flowers, wrap and card
  /// go in, show and leave the cart together); null for any other line.
  final BouquetPart? bouquet;

  /// 131 A gift add-on: the product of the line it goes with (removed with
  /// it); null for an ordinary line.
  final int? addonOf;

  bool get isAddon => addonOf != null;

  final int productId;
  final int? variationId;
  final int quantity;
  final String name;

  /// Options chosen for attributes the variation leaves as "any".
  final Map<String, String> attributes;
  final String? imageUrl;
  final String? price;
  final int? maxQuantity;

  /// 26 The IDs of the chosen options of the product's option groups.
  final List<String> options;

  /// Their names, as chosen ("Double, Cheddar"); the cart shows the server's.
  final List<String> optionNames;

  /// Lines with the same product, variation and options merge.
  String get key {
    final keys = attributes.keys.toList()..sort();
    final chosen = [...options]..sort();
    return [
      productId,
      variationId ?? 0,
      for (final k in keys) '$k=${attributes[k]}',
      if (chosen.isNotEmpty) 'o=${chosen.join(',')}',
      if (addonOf != null) 'a=$addonOf',
      // 162 A bouquet's lines never merge with another's or the shop's.
      if (bouquet != null) 'b=${bouquet!.id}',
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
    options: options,
    optionNames: optionNames,
    addonOf: addonOf,
    bouquet: bouquet,
  );

  CartLineInput toInput() => CartLineInput(
    productId: productId,
    variationId: variationId,
    quantity: quantity,
    attributes: attributes,
    options: options,
    addonOf: addonOf,
    bouquet: bouquet,
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
    if (options.isNotEmpty) 'options': options,
    if (optionNames.isNotEmpty) 'option_names': optionNames,
    if (addonOf != null) 'addon_of': addonOf,
    if (bouquet != null) 'bouquet': bouquet!.toJson(),
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
    // 44 For the owner's statistics; counting never stops the cart.
    try {
      ref
          .read(analyticsProvider)
          .item(
            'add_to_cart',
            kind: 'product',
            id: item.productId,
            title: item.name,
          );
    } on Object {
      // Not counted.
    }
    return true;
  }

  void setQuantity(String key, int quantity) {
    if (quantity < 1) return remove(key);
    _save([
      for (final i in state)
        i.key == key ? i.withQuantity(_cap(quantity, i.maxQuantity)) : i,
    ]);
  }

  /// Removes a line; 131 a main item's last line takes its add-ons with it.
  void remove(String key) {
    final gone = state.where((i) => i.key == key).firstOrNull;
    final rest = [
      for (final i in state)
        if (i.key != key) i,
    ];
    final main = gone != null && !gone.isAddon ? gone.productId : null;
    final orphaned =
        main != null && !rest.any((i) => !i.isAddon && i.productId == main);
    _save([
      for (final i in rest)
        if (!(orphaned && i.addonOf == main)) i,
    ]);
  }

  /// 131 Adds or removes a gift add-on linked to [mainId]'s line.
  bool toggleAddon(CartItem addon, int mainId, bool on) {
    final linked = CartItem(
      productId: addon.productId,
      quantity: addon.quantity,
      name: addon.name,
      imageUrl: addon.imageUrl,
      price: addon.price,
      maxQuantity: addon.maxQuantity,
      addonOf: mainId,
    );
    if (on) {
      if (state.any((i) => i.key == linked.key)) return true;
      return add(linked);
    }
    remove(linked.key);
    return true;
  }

  /// 162 Adds a bouquet's lines (its flowers, wrap and card, all with the
  /// same `bouquet`) as one; false when the cart has no room for them all.
  bool addBouquet(List<CartItem> lines) {
    if (lines.isEmpty) return false;
    if (state.length + lines.length > maxLines) return false;
    _save([
      ...state,
      for (final l in lines) l.withQuantity(_cap(l.quantity, l.maxQuantity)),
    ]);
    try {
      ref
          .read(analyticsProvider)
          .item(
            'add_to_cart',
            kind: 'product',
            id: lines.first.productId,
            title: lines.first.name,
          );
    } on Object {
      // Not counted.
    }
    return true;
  }

  /// 162 Takes a bouquet out of the cart, all its lines.
  void removeBouquet(String id) => _save([
    for (final i in state)
      if (i.bouquet?.id != id) i,
  ]);

  void clear() => _save(const []);
}

final cartProvider = NotifierProvider<CartController, List<CartItem>>(
  CartController.new,
);

/// The cart's count on its tab: 162 a bouquet counts once.
final cartCountProvider = Provider<int>((ref) {
  final items = ref.watch(cartProvider);
  final bouquets = {
    for (final i in items)
      if (i.bouquet != null) i.bouquet!.id,
  };
  return bouquets.length +
      items
          .where((i) => i.bouquet == null)
          .fold(0, (sum, i) => sum + i.quantity);
});
