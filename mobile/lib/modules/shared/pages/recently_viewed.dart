import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/json.dart';
import '../../../core/api/models/models.dart';
import '../../../core/l10n/currency.dart';
import '../../../core/storage/local_settings.dart';

/// 112.4 The products this person opened lately, newest first, kept on this
/// phone for a Studio list of what was seen lately (`StudioNode.recent`).
/// Each keeps the name, picture and price it showed when opened; a tap
/// opens the product again, which shows it as it is now. 161 Its price with
/// its amount and currency, and in the customer's currency as it was then,
/// shown while the customer still chooses that one (else the shop's).
class RecentlyViewed extends Notifier<List<PageItem>> {
  static const storageKey = 'store.recently_viewed';
  static const maxItems = 20;

  @override
  List<PageItem> build() {
    final raw = ref.watch(sharedPreferencesProvider).getString(storageKey);
    if (raw == null) return const [];
    final currency = ref.watch(appCurrencyProvider);
    try {
      return [
        for (final entry in jsonDecode(raw) as List)
          if (entry is Map)
            PageItem.fromJson(_inCurrency(asJson(entry), currency)),
      ];
    } on Object {
      return const [];
    }
  }

  /// [entry] without its price in a currency the customer no longer chose.
  static Json _inCurrency(Json entry, String? currency) {
    final price = entry['price'];
    if (price is! Map) return entry;
    final display = price['display'];
    if (display is Map && display['currency'] == currency) return entry;
    return {
      ...entry,
      'price': {...asJson(price)}..remove('display'),
    };
  }

  /// [product] opened: first in the list, once.
  void opened(ProductSummary product) {
    final id = '${product.id}';
    final item = PageItem(
      source: ItemSource.products,
      id: id,
      title: product.name,
      imageUrl: product.imageUrl,
      priceLabel: product.price.formatted,
      price: product.price,
    );
    final items = [
      item,
      for (final i in state)
        if (i.id != id) i,
    ].take(maxItems).toList();
    state = List.unmodifiable(items);
    ref
        .read(sharedPreferencesProvider)
        .setString(
          storageKey,
          jsonEncode([
            for (final i in items)
              {
                'source': 'products',
                'id': i.id,
                'title': i.title,
                'image_url': i.imageUrl,
                'price_label': i.priceLabel,
                // 161 Its amount and currency, and in the customer's.
                if (i.price case final p?)
                  'price': {
                    'amount': p.amount,
                    'currency': p.currency,
                    'formatted': p.formatted,
                    'range': p.range,
                    'on_sale': p.onSale,
                    'display': ?p.display?.toJson(),
                  },
              },
          ]),
        );
  }
}

final recentlyViewedProvider = NotifierProvider<RecentlyViewed, List<PageItem>>(
  RecentlyViewed.new,
);
