import 'dart:convert';
import 'dart:io';

import 'package:yallapp/modules/store/data/cart_controller.dart';

import 'demo_api.dart';
import 'studio_demo.dart';

/// 131.20 Leqaa, the flower shop, as its app is (the platform's
/// lib/demo/flowers.ts): its bouquets and add-ons with their photos
/// (platform/web/public/flower-photos) in Egyptian pounds, its collections
/// and occasions, a bouquet with its sizes and what goes with it, and a
/// cart; on its demo (test/support/leqaa_demo.json) or one of its two
/// Signature looks (test/support/signatures/flowers_a.json and _b.json).

/// The photos Leqaa's products show, by product.
const _photos = {
  101: 'blush-bouquet',
  102: 'roses-red',
  103: 'tulips',
  104: 'peonies',
  105: 'white-lilies',
  106: 'gerberas',
  107: 'hydrangea',
  108: 'orchid',
  109: 'sunflowers',
  110: 'rose-box',
  201: 'vase',
  202: 'chocolates',
  203: 'greeting-card',
};

/// The paths of the photos the products show, for [StudioDemo.prepare].
final leqaaPhotoPaths = [
  for (final name in {..._photos.values, 'atelier', 'stems'})
    '/flower-photos/$name.jpg',
];

Map<String, dynamic> _money(String amount, String formatted, {String? was}) => {
  'amount': amount,
  'regular_amount': was?.replaceAll(RegExp(r'[^0-9]'), ''),
  'regular_formatted': was,
  'currency': 'EGP',
  'formatted': formatted,
  'on_sale': was != null,
  'range': false,
};

Map<String, dynamic> _product(
  String base,
  int id,
  String name,
  String price, {
  String? was,
  double rating = 4.9,
  int ratings = 0,
}) => {
  'id': id,
  'name': name,
  'type': 'simple',
  'image_url': '$base/flower-photos/${_photos[id]}.jpg',
  'price': _money(price.replaceAll(RegExp(r'[^0-9]'), ''), price, was: was),
  'rating': ratings == 0 ? null : rating,
  'rating_count': ratings,
  'stock_status': 'in_stock',
  'purchasable': true,
  'digital': false,
};

/// Leqaa's products as the shop lists them.
List<Map<String, dynamic>> leqaaProducts(String base) => [
  _product(base, 101, 'Blush Garden', 'E£ 1,450'),
  _product(base, 102, 'Velvet Red Roses', 'E£ 1,590', was: 'E£ 1,850'),
  _product(base, 104, 'Peony Cloud', 'E£ 2,400'),
  _product(base, 110, 'Rose Box', 'E£ 2,900'),
  _product(base, 108, 'Orchid Elegance', 'E£ 2,200'),
  _product(base, 103, 'Morning Tulips', 'E£ 1,100'),
  _product(base, 109, 'Sunflower Field', 'E£ 850', was: 'E£ 980'),
  _product(base, 105, 'White Serenity', 'E£ 1,650'),
  _product(base, 106, 'Little Sunshine', 'E£ 950'),
  _product(base, 107, 'Hydrangea Hush', 'E£ 1,750'),
];

List<Map<String, dynamic>> _categories(String base) => [
  for (final (i, (name, photo)) in [
    ('Signature bouquets', 'blush-bouquet'),
    ('Roses', 'roses-red'),
    ('In season', 'peonies'),
    ('Plants', 'orchid'),
    ('Gift sets', 'rose-box'),
  ].indexed)
    {
      'id': 30 + i,
      'name': name,
      'parent_id': null,
      'count': 4,
      'image_url': '$base/flower-photos/$photo.jpg',
    },
];

/// Blush Garden as its page shows it: its photos, its three sizes and
/// what goes with it.
Map<String, dynamic> leqaaBouquet(String base) => {
  ...leqaaProducts(base).first,
  'description_html':
      '<p>Blush roses, lisianthus and eucalyptus, made on the day it is '
      'delivered and wrapped in our blush paper with a silk ribbon.</p>'
      '<p>Classic has 12 stems, Deluxe 24 and Grand 36.</p>',
  'short_description_html': '<p>Blush roses, lisianthus and eucalyptus.</p>',
  'images': [
    for (final photo in ['blush-bouquet', 'peonies', 'atelier'])
      {'url': '$base/flower-photos/$photo.jpg', 'alt': null},
  ],
  'sku': 'LQ-101',
  'max_quantity': 5,
  'attributes': <Object>[],
  'variations': <Object>[],
  'categories': [_categories(base).first],
  'related': leqaaProducts(base).skip(1).take(3).toList(),
  'external_url': null,
  'permalink': 'https://leqaa.example/bouquets/blush-garden',
  'option_groups': [
    {
      'id': 'size',
      'name': 'Size',
      'min': 1,
      'max': 1,
      'options': [
        {
          'id': 'classic',
          'name': 'Classic · 12 stems',
          'price_delta': '0.00',
          'price_delta_formatted': null,
        },
        {
          'id': 'deluxe',
          'name': 'Deluxe · 24 stems',
          'price_delta': '650.00',
          'price_delta_formatted': '+E£ 650',
        },
        {
          'id': 'grand',
          'name': 'Grand · 36 stems',
          'price_delta': '1250.00',
          'price_delta_formatted': '+E£ 1,250',
        },
      ],
    },
    {
      'id': 'with',
      'name': 'Add to it',
      'min': 0,
      'max': 3,
      'options': [
        {
          'id': 'vase',
          'name': 'Glass vase',
          'price_delta': '350.00',
          'price_delta_formatted': '+E£ 350',
        },
        {
          'id': 'chocolates',
          'name': 'Chocolate box',
          'price_delta': '320.00',
          'price_delta_formatted': '+E£ 320',
        },
        {
          'id': 'card',
          'name': 'Greeting card',
          'price_delta': '60.00',
          'price_delta_formatted': '+E£ 60',
        },
      ],
    },
  ],
};

/// The cart as the phone keeps it: a bouquet, a card and chocolates.
String leqaaCart(String base) => jsonEncode([
  for (final (p, q) in [
    (leqaaProducts(base)[0], 1),
    (leqaaProducts(base)[3], 1),
  ])
    {
      'product_id': p['id'],
      'variation_id': null,
      'quantity': q,
      'name': p['name'],
      'attributes': <String, String>{},
      'image_url': p['image_url'],
      'price': (p['price'] as Map)['formatted'],
      'max_quantity': 5,
    },
]);

Map<String, dynamic> _quote(String base) => {
  'lines': [
    for (final (p, total) in [
      (leqaaProducts(base)[0], 'E£ 1,450'),
      (leqaaProducts(base)[3], 'E£ 2,900'),
    ])
      {
        'product_id': p['id'],
        'variation_id': null,
        'quantity': 1,
        'name': p['name'],
        'image_url': p['image_url'],
        'unit_price': (p['price'] as Map)['formatted'],
        'line_total': total,
        'available': true,
        'problem': null,
        'max_quantity': 5,
        'digital': false,
      },
  ],
  'item_count': 2,
  'subtotal': 'E£ 4,350',
  'subtotal_amount': '4350.00',
  'currency': 'EGP',
};

/// Leqaa's app on [look] (its demo when null), with its shop.
DemoApi leqaaStudioApi({
  required StudioDemo look,
  String primaryColor = '#8E2445',
}) {
  final base = look.base;
  final api = DemoApi.leqaa()
    ..shopProducts = leqaaProducts(base)
    ..shopCategories = _categories(base)
    ..product = leqaaBouquet(base)
    ..cartQuote = _quote(base);
  return look.apply(
    api,
    appName: 'Leqaa',
    primaryColor: primaryColor,
    items: {
      'products': [
        for (final p in leqaaProducts(base))
          {
            'source': 'products',
            'id': '${p['id']}',
            'title': p['name'],
            'subtitle': null,
            'image_url': p['image_url'],
            'price_label': (p['price'] as Map)['formatted'],
            'badge': (p['price'] as Map)['on_sale'] == true ? 'Sale' : null,
            'action': {
              'type': 'item',
              'item': {'source': 'products', 'id': '${p['id']}'},
            },
          },
      ],
    },
  );
}

/// The phone's cart, for the cart's page.
Map<String, Object> leqaaCartPreferences(StudioDemo look) => {
  CartController.storageKey: leqaaCart(look.base),
};

/// The demo, as the platform made it (test/support/leqaa_demo.json).
StudioDemo get leqaaDemo => StudioDemo.file('leqaa_demo.json');

/// Whether the photos are there (public/flower-photos).
bool get leqaaPhotosReady =>
    File('../platform/web/public/flower-photos/blush-bouquet.jpg').existsSync();
