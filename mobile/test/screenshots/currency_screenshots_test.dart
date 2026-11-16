/// 133 Every currency, drawn by the real app for the owner's review (not
/// kept in the repository): with `--dart-define=YALLAPP_GALLERY=<folder>`,
/// a shop in Egyptian pounds seen by a customer in dollars and in Kuwaiti
/// dinars (English and Arabic), the currency picker, and a shop that sells
/// in dinars, at 2x.
@Tags(['screenshots'])
library;

import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/language.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fixtures.dart';
import 'support/demo_api.dart';
import 'support/demo_images.dart';
import 'support/screens.dart';

const _gallery = String.fromEnvironment('YALLAPP_GALLERY');

/// Units of each currency for one US dollar (the fake day's rates).
const _perDollar = {'EGP': 48.5, 'USD': 1.0, 'KWD': 0.306};

String _money(int cents, String currency) {
  final value = cents / 100;
  return switch (currency) {
    'USD' => '\$${value.toStringAsFixed(2)}',
    'KWD' => 'KWD ${value.toStringAsFixed(3)}',
    'EGP' =>
      'E£${value.toStringAsFixed(2).replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (m) => ',')}',
    _ => '$currency $value',
  };
}

/// A price as the hosted API sends it, with `display` in [shown] (null: none).
Map<String, dynamic> _price(
  int cents,
  String base,
  String? shown, {
  int? regular,
}) {
  Map<String, dynamic>? display;
  if (shown != null) {
    final rate = _perDollar[shown]! / _perDollar[base]!;
    int convert(int c) => (c * rate).round();
    display = {
      'currency': shown,
      'amount': (convert(cents) / 100).toStringAsFixed(shown == 'KWD' ? 3 : 2),
      'formatted': _money(convert(cents), shown),
      if (regular != null) 'regular_formatted': _money(convert(regular), shown),
      'rate': rate,
      'rate_date': '2026-11-16',
    };
  }
  return {
    'amount': (cents / 100).toStringAsFixed(base == 'KWD' ? 3 : 2),
    'regular_amount': regular == null
        ? null
        : (regular / 100).toStringAsFixed(2),
    'regular_formatted': regular == null ? null : _money(regular, base),
    'currency': base,
    'formatted': _money(cents, base),
    'on_sale': regular != null,
    'range': false,
    'display': ?display,
  };
}

const _sweets = [
  (31, 'Basbousa tray', 'بسبوسة صينية', 60000, null, 'product-delight'),
  (32, 'Konafa with cream', 'كنافة بالقشطة', 45000, 52000, 'product-gift'),
  (33, 'Date maamoul box', 'علبة معمول بالتمر', 38000, null, 'product-coffee'),
  (34, 'Om Ali for two', 'أم علي لشخصين', 24000, null, 'product-tea'),
];

DemoApi _shop({required String base, String? shown, bool arabic = false}) {
  final api = DemoApi.store(primary: '#7A3E1D');
  api.config['store'] = {...storeConfigJson(), 'currency': base};
  api.shopProducts = [
    for (final (id, en, ar, cents, regular, image) in _sweets)
      {
        ...productSummaryJson(
          id: id,
          name: arabic ? ar : en,
          price: _price(
            base == 'KWD' ? (cents / 160).round() : cents,
            base,
            shown,
            regular: regular == null
                ? null
                : (base == 'KWD' ? (regular / 160).round() : regular),
          ),
        ),
        'image_url': demoImage(image),
      },
  ];
  return api;
}

Shot _grid(
  String name, {
  required String base,
  String? shown,
  String language = 'en',
  String region = 'EG',
}) => Shot(
  name,
  api: () => _shop(base: base, shown: shown, arabic: language == 'ar'),
  appType: AppType.store,
  appName: language == 'ar' ? 'حلواني دانة' : 'Dana Sweets',
  language: language,
  location: Paths.shop,
  preferences: {'settings.currency': ?shown},
  overrides: [
    deviceLocalesProvider.overrideWithValue([Locale(language, region)]),
  ],
);

final _shots = <Shot>[
  _grid('currency-egp-shop-usd-en', base: 'EGP', shown: 'USD'),
  _grid('currency-egp-shop-kwd-en', base: 'EGP', shown: 'KWD'),
  _grid('currency-egp-shop-usd-ar', base: 'EGP', shown: 'USD', language: 'ar'),
  _grid('currency-egp-shop-kwd-ar', base: 'EGP', shown: 'KWD', language: 'ar'),
  _grid('currency-kwd-shop-en', base: 'KWD', region: 'KW'),
  Shot(
    'currency-picker-en',
    api: () => _shop(base: 'EGP', shown: null),
    appType: AppType.store,
    appName: 'Dana Sweets',
    location: '/account/settings',
    overrides: [
      deviceLocalesProvider.overrideWithValue(const [Locale('en', 'KW')]),
    ],
    after: (tester, router) async {
      await tester.tap(find.byKey(const ValueKey('currency-tile')));
    },
  ),
  Shot(
    'currency-picker-ar',
    api: () => _shop(base: 'EGP', shown: null),
    appType: AppType.store,
    appName: 'حلواني دانة',
    language: 'ar',
    location: '/account/settings',
    overrides: [
      deviceLocalesProvider.overrideWithValue(const [Locale('ar', 'KW')]),
    ],
    after: (tester, router) async {
      await tester.tap(find.byKey(const ValueKey('currency-tile')));
    },
  ),
];

Future<Uint8List> _png(WidgetTester tester) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(shotKey),
  );
  return (await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    return Uint8List.view(data!.buffer);
  }))!;
}

void main() {
  setUpAll(() async {
    if (_gallery.isNotEmpty) await loadAppFonts();
  });
  for (final shot in _shots) {
    testWidgets(shot.name, skip: _gallery.isEmpty, (tester) async {
      final app = await shot.render(tester);
      final png = await _png(tester);
      await tester.runAsync(() async {
        await Directory(_gallery).create(recursive: true);
        await File('$_gallery/${shot.name}.png').writeAsBytes(png);
      });
      await Shot.close(app, tester);
    });
  }
}
