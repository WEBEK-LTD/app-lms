import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/modules/market/data/market_models.dart';
import 'package:yallapp/modules/market/data/market_providers.dart';
import 'package:yallapp/modules/market/data/market_samples.dart';

/// Zad, Studio's multi-vendor demo (platform/web/src/lib/demo/marketplace.ts),
/// as its customer sees it in Cairo: Bab El Sharq Grill (it delivers
/// itself), Nile Pizza Co. (Zad's couriers) and Zad Market, with the
/// drawn pictures the demo uses. For the website's story of a Friday lunch.
abstract final class Zad {
  static String _art(String name) => MarketSamples.picture('art-$name.png');

  static final grill = MarketVendor(
    id: '1',
    kind: MarketVendorKind.restaurant,
    name: 'Bab El Sharq Grill',
    coverUrl: _art('dish-wrap'),
    logoUrl: '',
    tags: const ['Grills', 'Egyptian'],
    rating: 4.8,
    ratings: 1240,
    etaMin: 35,
    etaMax: 50,
    deliveryFee: 'EGP 20.00',
    minOrder: 'EGP 100.00',
    deliveredBy: MarketDeliveredBy.vendor,
    promo: 'Free delivery over EGP 400',
    distanceKm: 2.4,
  );

  static final pizza = MarketVendor(
    id: '2',
    kind: MarketVendorKind.restaurant,
    name: 'Nile Pizza Co.',
    coverUrl: _art('dish-soup'),
    logoUrl: '',
    tags: const ['Pizza'],
    rating: 4.6,
    ratings: 860,
    etaMin: 30,
    etaMax: 40,
    freeDelivery: true,
    club: true,
    clubBenefit: 'Free with Club',
    distanceKm: 3.1,
  );

  static final market = MarketVendor(
    id: '3',
    kind: MarketVendorKind.grocery,
    name: 'Zad Market',
    coverUrl: _art('item-fruit'),
    logoUrl: '',
    tags: const ['Supermarket'],
    rating: 4.7,
    ratings: 2100,
    etaMin: 25,
    etaMax: 40,
    freeDelivery: true,
    minOrder: 'EGP 50.00',
    promo: 'Red apples 18% off',
    club: true,
    clubBenefit: 'Free with Club',
    distanceKm: 1.6,
  );

  static final vendors = [grill, pizza, market];

  static final home = MarketHome(
    address: 'Home · 14 Brazil Street, Zamalek',
    located: true,
    kinds: [
      MarketKindTile(
        id: 'food',
        title: 'Food',
        subtitle: '2 restaurants',
        imageUrl: _art('dish-burger'),
        kind: MarketVendorKind.restaurant,
      ),
      MarketKindTile(
        id: 'market',
        title: 'Market',
        subtitle: 'Groceries by the kilo',
        imageUrl: _art('item-fruit'),
        kind: MarketVendorKind.grocery,
      ),
    ],
    offers: [
      MarketOffer(
        id: 'zad15',
        title: '15% off',
        text: 'Your first order from any place, with the code ZAD15.',
        imageUrl: _art('banner-food'),
        from: '#1E6B52',
        to: '#0F4434',
        code: 'ZAD15',
      ),
      MarketOffer(
        id: 'grill',
        title: 'Free delivery over EGP 400',
        text: 'Bab El Sharq Grill brings it hot, with its own drivers.',
        imageUrl: _art('dish-wrap'),
        from: '#F2A93B',
        to: '#D9822B',
        vendorId: '1',
      ),
    ],
    cuisines: [
      MarketCuisine(id: 'grill', name: 'Grills', imageUrl: _art('dish-wrap')),
      MarketCuisine(id: 'pizza', name: 'Pizza', imageUrl: _art('dish-soup')),
      MarketCuisine(
        id: 'egyptian',
        name: 'Egyptian',
        imageUrl: _art('dish-breakfast'),
      ),
      MarketCuisine(
        id: 'desserts',
        name: 'Desserts',
        imageUrl: _art('dish-cheesecake'),
      ),
    ],
    vendors: vendors,
    reorders: const [
      MarketReorder(
        vendorId: '1',
        summary: 'Mixed grill for two, tahini',
        total: 'EGP 635.00',
        when: 'Last Friday',
      ),
    ],
    clubMember: true,
  );

  static MarketItem _dish(
    String id,
    String name,
    String description,
    double price, {
    String? picture,
    bool popular = false,
    bool choices = false,
  }) => MarketItem(
    id: id,
    name: name,
    description: description,
    price: 'EGP ${price.toStringAsFixed(2)}',
    priceValue: price,
    imageUrl: picture == null ? null : _art(picture),
    popular: popular,
    hasChoices: choices,
  );

  static MarketItem _kilo(
    String id,
    String name,
    double price, {
    String? picture,
    double step = 0.5,
    double? was,
    bool inStock = true,
  }) => MarketItem(
    id: id,
    name: name,
    price: 'EGP ${price.toStringAsFixed(2)}',
    priceValue: price,
    oldPrice: was == null ? null : 'EGP ${was.toStringAsFixed(2)}',
    imageUrl: picture == null ? null : _art(picture),
    unit: MarketUnit.kg,
    step: step,
    inStock: inStock,
  );

  static final _grillMenu = [
    MarketShelf(
      id: 'grills',
      name: 'Grills',
      items: [
        _dish(
          '11',
          'Mixed grill',
          'Kofta, shish tawook and lamb chops with rice, tahini and salad.',
          320,
          picture: 'dish-wrap',
          popular: true,
          choices: true,
        ),
        _dish(
          '12',
          'Kofta',
          'Half a kilo of charcoal kofta with grilled tomatoes and onions.',
          190,
          choices: true,
        ),
        _dish(
          '13',
          'Shish tawook',
          'Marinated chicken skewers with garlic sauce and fries.',
          170,
        ),
      ],
    ),
    MarketShelf(
      id: 'sandwiches',
      name: 'Sandwiches',
      items: [
        _dish(
          '14',
          'Kofta sandwich',
          'In baladi bread with tahini and pickles.',
          75,
          picture: 'dish-wrap',
          popular: true,
        ),
      ],
    ),
    MarketShelf(
      id: 'mezze',
      name: 'Mezze',
      items: [
        _dish('15', 'Tahini', 'With lemon and cumin.', 25),
        _dish('16', 'Baba ghanoush', 'Smoked aubergine with olive oil.', 35),
      ],
    ),
  ];

  static final _aisles = [
    MarketShelf(
      id: 'fruit',
      name: 'Fresh fruit',
      imageUrl: _art('item-fruit'),
      items: [
        _kilo('31', 'Red apples', 90, picture: 'item-fruit', was: 110),
        _kilo('32', 'Bananas', 35, picture: 'item-fruit'),
        _kilo('33', 'Oranges', 25, picture: 'item-fruit'),
        _kilo('34', 'Mangoes', 70, inStock: false),
      ],
    ),
    MarketShelf(
      id: 'veg',
      name: 'Vegetables',
      imageUrl: _art('item-veg'),
      items: [
        _kilo('35', 'Tomatoes', 18, picture: 'item-veg'),
        _kilo('36', 'Cucumbers', 20, picture: 'item-veg'),
        _kilo('37', 'Lemons', 40, step: 0.25),
      ],
    ),
    MarketShelf(
      id: 'bread',
      name: 'Bread',
      imageUrl: _art('item-bread'),
      items: [
        MarketItem(
          id: '38',
          name: 'Baladi bread, 5 loaves',
          price: 'EGP 10.00',
          priceValue: 10,
          imageUrl: _art('item-bread'),
        ),
      ],
    ),
  ];

  static MarketVendorPage page(String id) => switch (id) {
    '3' => MarketVendorPage(
      vendor: market,
      currency: 'EGP',
      about:
          'The neighbourhood supermarket in Mohandessin: fruit and vegetables '
          'by the kilo, dairy, bread, pantry and home.',
      address: 'Mohandessin',
      hours: '08:00–23:00',
      shelves: _aisles,
    ),
    _ => MarketVendorPage(
      vendor: grill,
      currency: 'EGP',
      about:
          'Charcoal grills, kofta and fresh mezze from Zamalek. Our own '
          'drivers bring them hot.',
      address: 'Zamalek',
      hours: '12:00–01:00',
      shelves: _grillMenu,
    ),
  };

  /// The marketplace's screens on Zad instead of the server.
  static final List<Override> overrides = [
    marketHomeProvider.overrideWith((ref) async => home),
    marketVendorPageProvider.overrideWith((ref, id) async => page(id)),
  ];
}

final _pictures = <String, ui.Image>{};

/// Puts the designs' drawn pictures (platform/web/public/design-pictures)
/// in the image cache under the addresses [MarketSamples.picture] gives.
Future<void> seedDesignPictures(WidgetTester tester) async {
  if (_pictures.isEmpty) {
    await tester.runAsync(() async {
      final folder = Directory('../platform/web/public/design-pictures');
      for (final file in folder.listSync().whereType<File>()) {
        if (!file.path.endsWith('.png')) continue;
        final codec = await ui.instantiateImageCodec(file.readAsBytesSync());
        final frame = await codec.getNextFrame();
        _pictures[MarketSamples.picture(file.uri.pathSegments.last)] =
            frame.image;
      }
    });
  }
  final cache = PaintingBinding.instance.imageCache
    ..maximumSizeBytes = 1 << 30
    ..maximumSize = 4000;
  for (final MapEntry(:key, :value) in _pictures.entries) {
    cache.putIfAbsent(
      NetworkImage(key),
      () => OneFrameImageStreamCompleter(
        SynchronousFuture(ImageInfo(image: value.clone())),
      ),
    );
  }
}
