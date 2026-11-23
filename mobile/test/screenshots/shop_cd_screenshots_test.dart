/// 224 The pictures of Velours's (cosmetics) and Ghurza's (crochet)
/// templates C and D, drawn by the real app from the projects their
/// templates start (`test/support/signatures/<demo>_<c|d>.json`, written by
/// platform/web/tests/unit/signature-looks.test.ts) with the demo shop's
/// own products and categories (`test/support/shops/<demo>.json`, written by
/// platform/web/tests/unit/shop-cd-shots.test.ts): each template's home by
/// day and by night (the first screen, and the whole page), its category
/// menu, the shop and a product, 390 wide at twice the pixels.
///
/// Skipped unless run with `--dart-define=YALLAPP_SHOP_CD=<folder>` (where
/// the pictures go) and `--dart-define=YALLAPP_SHOP_CD_FONTS=<folder>` (the
/// templates' free fonts, laid out as Google Fonts' `ofl/<family>/<file>`).
@Tags(['screenshots'])
library;

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/theme/fonts/font_cache.dart';
import 'package:yallapp/core/theme/fonts/remote_fonts.dart';

import 'support/demo_api.dart';
import 'support/screens.dart';
import 'support/studio_demo.dart';

const _out = String.fromEnvironment('YALLAPP_SHOP_CD');
const _fonts = String.fromEnvironment('YALLAPP_SHOP_CD_FONTS');

class _Cache implements FontCache {
  final _files = <String, Uint8List>{};
  @override
  Future<Uint8List?> read(String key) async => _files[key];
  @override
  Future<void> write(String key, Uint8List bytes) async => _files[key] = bytes;
}

/// The templates' fonts from the folder, by the path the platform serves them at.
final _fontOverrides = <Override>[
  remoteFontDepsProvider.overrideWithValue(
    RemoteFontDeps(
      fetch: (url) async {
        final at = Uri.decodeFull(url.path).indexOf('/fonts/');
        if (at < 0) return null;
        final file = File(
          '$_fonts/${Uri.decodeFull(url.path).substring(at + 7)}',
        );
        return file.existsSync() ? file.readAsBytesSync() : null;
      },
      cache: _Cache(),
      register: flutterFontRegistrar,
    ),
  ),
];

Map<String, dynamic> _shop(String demo) =>
    jsonDecode(File('test/support/shops/$demo.json').readAsStringSync())
        as Map<String, dynamic>;

String _money(int cents, String currency, String lang) {
  final whole = (cents ~/ 100).toString();
  final grouped = whole.length > 3
      ? '${whole.substring(0, whole.length - 3)},${whole.substring(whole.length - 3)}'
      : whole;
  return switch ((currency, lang)) {
    ('EGP', 'ar') => '$grouped ج.م',
    ('EGP', _) => 'E£ $grouped',
    ('AED', 'ar') => '$grouped د.إ',
    _ => 'AED $grouped',
  };
}

Map<String, dynamic> _price(int now, int? was, String currency, String lang) =>
    {
      'amount': '${now ~/ 100}.00',
      'regular_amount': was == null ? null : '${was ~/ 100}.00',
      'regular_formatted': was == null ? null : _money(was, currency, lang),
      'currency': currency,
      'formatted': _money(now, currency, lang),
      'on_sale': was != null,
      'range': false,
    };

/// The demo shop's app on [look]: its products, categories and a product's page.
DemoApi _shopApi(String demo, StudioDemo look, String primary, String lang) {
  final shop = _shop(demo);
  final base = look.base;
  final currency = shop['currency'] as String;
  final categories = (shop['categories'] as List).cast<Map<String, dynamic>>();
  final products = [
    for (final p in (shop['products'] as List).cast<Map<String, dynamic>>())
      {
        'id': p['id'],
        'name': p['name'],
        'type': 'simple',
        'image_url': '$base${(p['photos'] as List).first}',
        'price': _price(p['price'] as int, p['was'] as int?, currency, lang),
        'rating': null,
        'rating_count': 0,
        'stock_status': 'in_stock',
        'purchasable': true,
        'digital': false,
        '_main': p['main'],
        '_sub': p['sub'],
        '_photos': p['photos'],
      },
  ];
  List<Map<String, dynamic>> clean(Iterable<Map<String, dynamic>> list) => [
    for (final p in list) {...p}..removeWhere((k, _) => k.startsWith('_')),
  ];
  String name(Map<String, dynamic> c) =>
      (lang == 'ar' ? c['ar'] : (lang == 'tr' ? c['tr'] : c['name'])) as String;
  final first = products.first;
  final api = DemoApi.store(primary: primary)
    ..shopProducts = clean(products)
    ..shopCategories = [
      for (final c in categories)
        {
          'id': c['id'],
          'name': name(c),
          'parent_id': c['parent_id'],
          'count': 4,
          'image_url': c['photo'] == null ? null : '$base${c['photo']}',
        },
    ]
    ..product = {
      ...clean([first]).first,
      'description_html': '<p>${first['name']}</p>',
      'short_description_html': null,
      'images': [
        for (final photo in first['_photos'] as List)
          {'url': '$base$photo', 'alt': null},
      ],
      'sku': 'P-${first['id']}',
      'max_quantity': 5,
      'attributes': <dynamic>[],
      'variations': <dynamic>[],
      'default_attributes': <String, dynamic>{},
      'categories': [
        {
          'id': categories.first['id'],
          'name': categories.first['name'],
          'parent_id': null,
          'count': 4,
          'image_url': null,
        },
      ],
      'related': clean(products.skip(1).take(4)),
      'addons': <dynamic>[],
      'external_url': null,
      'permalink': 'https://shop.example/p/${first['id']}',
    };
  Map<String, dynamic> item(Map<String, dynamic> p) => {
    'source': 'products',
    'id': '${p['id']}',
    'title': p['name'],
    'subtitle': p['_sub'],
    'image_url': p['image_url'],
    'price_label': (p['price'] as Map)['formatted'],
    'badge': null,
    'action': {
      'type': 'item',
      'item': {'source': 'products', 'id': '${p['id']}'},
    },
  };
  // The category menu's rows as the servers fill them: each main category with its sub-categories.
  final tree = [
    for (final c in categories.where((c) => c['parent_id'] == null))
      {
        'id': c['id'],
        'name': name(c),
        'count': 4,
        'image_url': c['photo'] == null ? null : '$base${c['photo']}',
        'children': [
          for (final s in categories.where((s) => s['parent_id'] == c['id']))
            {
              'id': s['id'],
              'name': name(s),
              'count': 4,
              'image_url': s['photo'] == null ? null : '$base${s['photo']}',
            },
        ],
      },
  ];
  Object? withCategories(Object? json) => switch (json) {
    final Map<String, dynamic> map => {
      for (final MapEntry(:key, :value) in map.entries)
        key: withCategories(value),
      if (map['type'] == 'categories') 'categories': tree,
    },
    final List<dynamic> list => [for (final v in list) withCategories(v)],
    _ => json,
  };
  final applied = look.apply(
    api,
    appName: demo == 'beauty' ? 'Velours' : 'Ghurza',
    primaryColor: primary,
    items: {
      'products': [for (final p in products) item(p)],
    },
    couponOffer: {
      'code': demo == 'beauty' ? 'VELOURS10' : 'GHURZA10',
      'percent_off': 10,
      'min_order_formatted': _money(25000, currency, lang),
      'ends_at': null,
    },
  );
  applied.pages = {
    for (final MapEntry(:key, :value) in applied.pages.entries)
      key: withCategories(value) as Map<String, dynamic>,
  };
  return applied;
}

/// Every photo of the shop's and the template's, for the image cache.
List<String> _photoPaths(String demo) => [
  for (final f in Directory(
    '../platform/web/public/${demo == 'beauty' ? 'beauty' : 'crochet'}-photos',
  ).listSync().whereType<File>())
    if (f.path.endsWith('.jpg'))
      '/${demo == 'beauty' ? 'beauty' : 'crochet'}-photos/${f.uri.pathSegments.last}',
];

class _Pic {
  _Pic(this.name, this.shot, {this.site = false});
  final String name;
  final Shot shot;

  /// The website's picture (platform/web/public/screens): the phone's size, three times the pixels.
  final bool site;
}

const _tall = Size(390, 2700);
const _phone = Size(390, 844);

List<_Pic> _pics(String demo, String look, String primary) {
  final file = StudioDemo.signature(demo, look);
  Shot shot(
    String name, {
    bool dark = false,
    String lang = 'en',
    String? location,
    Size size = _phone,
  }) => Shot(
    name,
    api: () => _shopApi(demo, file, primary, lang),
    appName: demo == 'beauty' ? 'Velours' : 'Ghurza',
    appType: AppType.store,
    dark: dark,
    language: lang,
    location: location,
    size: size,
    overrides: _fontOverrides,
    designPictures: true,
    prepare: (tester) => file.prepare(tester, _photoPaths(demo)),
    shadows: true,
  );
  final p = '$demo-$look';
  return [
    _Pic('$p-home', shot('$p-home')),
    _Pic('$p-home-dark', shot('$p-home-dark', dark: true)),
    _Pic('$p-home-full', shot('$p-home-full', size: _tall)),
    _Pic(
      '$p-home-full-dark',
      shot('$p-home-full-dark', dark: true, size: _tall),
    ),
    _Pic('$p-home-ar', shot('$p-home-ar', lang: 'ar', size: _tall)),
    _Pic('$p-menu', shot('$p-menu', location: '/page/menu', size: _tall)),
    _Pic(
      '$p-menu-dark',
      shot('$p-menu-dark', dark: true, location: '/page/menu', size: _tall),
    ),
    _Pic('$p-listing', shot('$p-listing', location: '/shop', size: _tall)),
    _Pic(
      '$p-listing-dark',
      shot('$p-listing-dark', dark: true, location: '/shop', size: _tall),
    ),
    _Pic(
      '$p-product',
      shot('$p-product', location: '/product/100', size: _tall),
    ),
    _Pic(
      '$p-product-dark',
      shot(
        '$p-product-dark',
        dark: true,
        location: '/product/100',
        size: _tall,
      ),
    ),
    // The website's pictures (lib/marketing.ts APP_SCREENS), as the other looks' are.
    for (final (key, dark, location) in [
      ('home', false, null),
      ('home-dark', true, null),
      ('menu', false, '/page/menu'),
      ('product', false, '/product/100'),
    ])
      _Pic(
        '$demo-sig-$look-$key',
        shot(
          '$demo-sig-$look-$key',
          dark: dark,
          location: location,
          size: shotSize,
        ),
        site: true,
      ),
  ];
}

void main() {
  setUpAll(() async {
    if (_out.isNotEmpty) await loadAppFonts();
  });

  final pics = [
    ..._pics('beauty', 'c', '#2C6E74'),
    ..._pics('beauty', 'd', '#9B1B5A'),
    ..._pics('crochet', 'c', '#9A3B26'),
    ..._pics('crochet', 'd', '#C98F8C'),
  ];
  for (final pic in pics) {
    testWidgets(pic.name, skip: _out.isEmpty, (tester) async {
      debugDisableShadows = false;
      await pic.shot.render(tester);
      final boundary = tester.renderObject<RenderRepaintBoundary>(
        find.byKey(shotKey),
      );
      final png = await tester.runAsync(() async {
        final image = await boundary.toImage(
          pixelRatio: pic.site ? shotPixelRatio : 2,
        );
        final data = await image.toByteData(format: ui.ImageByteFormat.png);
        image.dispose();
        return Uint8List.view(data!.buffer);
      });
      await tester.runAsync(
        () =>
            File('$_out/${pic.site ? 'site/' : ''}${pic.name}.png')
                .writeAsBytes(png!),
      );
      debugDisableShadows = true;
    });
  }
}
