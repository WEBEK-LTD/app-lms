/// 228 Lujain's look A's own product page (Studio's product page, the
/// pilot of lib/studio/product-page.ts), drawn by the real app from the
/// project its template starts (test/support/signatures/clothes_a.json,
/// written by platform/web/tests/unit/signature-looks.test.ts) for one of
/// Lujain's dresses with its own photos (platform/web/public/clothes-photos):
/// by day, by night and in Arabic, its top and further down. With
/// `--dart-define=YALLAPP_SCREENSHOTS=true` they are written to
/// docs/qa/2026-11-24-product-page; without it each is drawn and checked
/// for what it must show, and nothing is written.
@Tags(['screenshots'])
library;

import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import '../support/fixtures.dart';
import 'support/demo_api.dart';
import 'support/screens.dart';
import 'support/studio_demo.dart';

const _screens = bool.fromEnvironment('YALLAPP_SCREENSHOTS');
const _out = '../docs/qa/2026-11-24-product-page';

final _demo = StudioDemo.signature('clothes', 'a');
String _photo(String name) => '${_demo.base}/clothes-photos/$name.jpg';
const _photos = [
  'rust-1',
  'rust-2',
  'rust-3',
  'rust-4',
  'black-heels',
  'black-bag',
  'sunglasses',
  'beige-dress',
  'camel-dress',
  'red-dress',
];

/// One of Lujain's dresses as `GET /store/products/{id}` serves it, in
/// [language] (the shop names its pieces in Arabic too).
Map<String, dynamic> _dress(String language) {
  final ar = language == 'ar';
  Map<String, dynamic> sar(String amount, {String? regular}) => {
    ...priceJson(amount, regular: regular),
    'currency': 'SAR',
    'formatted': ar ? '$amount ر.س' : 'SAR $amount',
    'regular_formatted': regular == null
        ? null
        : (ar ? '$regular ر.س' : 'SAR $regular'),
  };
  Map<String, dynamic> piece(
    int id,
    String en,
    String arName,
    String image,
  ) => {
    ...productSummaryJson(id: id, name: ar ? arName : en, price: sar('420')),
    'image_url': _photo(image),
  };
  return {
    ...productSummaryJson(
      id: 30,
      name: ar ? 'فستان ساتان ميدي بلون الصدأ' : 'Rust satin midi dress',
      type: 'variable',
      price: sar('890', regular: '1,100'),
    ),
    'image_url': _photo('rust-1'),
    'rating': 4.8,
    'rating_count': 126,
    'description_html': ar
        ? '<p>ساتان منسدل مقصوص بالورب، بأكمام قصيرة وحزام ناعم عند الخصر. يُلبس في الأعراس والسهرات.</p>'
        : '<p>Fluid satin cut on the bias, with short sleeves and a soft tie at the waist. Made for weddings and long evenings.</p>',
    'short_description_html': null,
    'images': [
      for (final n in ['rust-1', 'rust-2', 'rust-3', 'rust-4'])
        {'url': _photo(n), 'alt': null},
    ],
    'sku': 'CL-101',
    'max_quantity': null,
    'attributes': [
      {
        'slug': 'a1',
        'name': ar ? 'المقاس' : 'Size',
        'variation': true,
        'options': [
          for (final s in ['XS', 'S', 'M', 'L', 'XL']) {'value': s, 'label': s},
        ],
      },
    ],
    'variations': [
      for (final (i, s) in ['XS', 'S', 'M', 'L', 'XL'].indexed)
        {
          'id': 100 + i,
          'attributes': {'a1': s},
          'price': sar('890', regular: '1,100'),
          'image_url': null,
          'stock_status': s == 'XL' ? 'out_of_stock' : 'in_stock',
          'max_quantity': s == 'XL' ? null : 3,
          'purchasable': s != 'XL',
        },
    ],
    'default_attributes': {'a1': 'M'},
    'specs': [
      {'label': ar ? 'الخامة' : 'Fabric', 'value': ar ? 'ساتان' : 'Satin'},
      {'label': ar ? 'القَصّة' : 'Fit', 'value': ar ? 'منسدلة' : 'Relaxed'},
      {
        'label': ar ? 'العناية' : 'Care',
        'value': ar ? 'تنظيف جاف' : 'Dry clean',
      },
    ],
    'categories': <Object>[],
    'related': [
      piece(51, 'Beige wrap dress', 'فستان ملفوف بيج', 'beige-dress'),
      piece(52, 'Camel shirt dress', 'فستان قميص جملي', 'camel-dress'),
      piece(53, 'Red evening dress', 'فستان سهرة أحمر', 'red-dress'),
    ],
    'complete_look': [
      piece(41, 'Black strappy heels', 'حذاء أسود بأشرطة', 'black-heels'),
      piece(42, 'Black leather bag', 'حقيبة جلد سوداء', 'black-bag'),
      piece(43, 'Tortoise sunglasses', 'نظارة شمسية', 'sunglasses'),
    ],
    'external_url': null,
    'permalink': 'https://lujain.example/product/30',
  };
}

Shot _shot(String name, {bool dark = false, String language = 'en'}) => Shot(
  name,
  api: () {
    final api = _demo.apply(
      DemoApi.store(primary: '#121212'),
      appName: 'Lujain',
      primaryColor: '#121212',
    );
    api
      ..config = {
        ...api.config,
        'store': {
          ...(api.config['store'] as Map<String, dynamic>),
          'returns': {'enabled': true, 'days': 14},
          'size_chart': {
            'headers': ['Size', 'Bust', 'Waist'],
            'rows': [
              ['XS', '80', '62'],
              ['S', '84', '66'],
              ['M', '88', '70'],
              ['L', '94', '76'],
              ['XL', '100', '82'],
            ],
            'unit': 'cm',
          },
        },
      }
      ..product = _dress(language);
    return api;
  },
  appName: 'Lujain',
  appType: AppType.store,
  dark: dark,
  language: language,
  location: '/product/30',
  designPictures: true,
  prepare: (tester) => _demo.prepare(tester, [
    for (final n in _photos) '/clothes-photos/$n.jpg',
  ]),
  shadows: true,
);

/// The page further down: its details, reviews and the pieces with it.
Future<void> _down(WidgetTester tester) async {
  final page = find
      .byWidgetPredicate(
        (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
      )
      .first;
  final position = tester.state<ScrollableState>(page).position;
  position.jumpTo((position.pixels + 640).clamp(0, position.maxScrollExtent));
  await tester.pump(const Duration(milliseconds: 800));
  await tester.pump(const Duration(milliseconds: 800));
}

Future<void> _write(WidgetTester tester, String name) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(shotKey),
  );
  final png = (await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: shotPixelRatio);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    return Uint8List.view(data!.buffer);
  }))!;
  await tester.runAsync(() async {
    await Directory(_out).create(recursive: true);
    await File('$_out/$name.png').writeAsBytes(png);
  });
}

void main() {
  setUpAll(() async {
    if (_screens) await loadAppFonts();
  });

  for (final (mode, dark, language) in [
    ('light', false, 'en'),
    ('dark', true, 'en'),
    ('ar', false, 'ar'),
  ]) {
    testWidgets('lujain-a-product-$mode', (tester) async {
      debugDisableShadows = false;
      await _shot(
        'lujain-a-product-$mode',
        dark: dark,
        language: language,
      ).render(tester);
      // Lujain's own product page, not the app's product screen.
      expect(
        find.byKey(const ValueKey('product-gallery-pager')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('product-exchange')), findsNothing);
      expect(
        find.byKey(const ValueKey('product-page-grid-a1')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('product-buy-now')), findsOneWidget);
      expect(
        tester.widget<Text>(find.byKey(const ValueKey('product-title'))).data,
        language == 'ar'
            ? 'فستان ساتان ميدي بلون الصدأ'
            : 'Rust satin midi dress',
      );
      // Over the photos, no band under the status bar.
      expect(
        tester
            .widget<AnimatedOpacity>(
              find.byKey(const ValueKey('product-page-top-band')),
            )
            .opacity,
        0,
      );
      if (_screens) await _write(tester, 'lujain-a-product-$mode');
      await _down(tester);
      expect(find.byKey(const ValueKey('product-specs-table')), findsOneWidget);
      // Scrolled past them: the band in the page's colour.
      expect(
        tester
            .widget<AnimatedOpacity>(
              find.byKey(const ValueKey('product-page-top-band')),
            )
            .opacity,
        1,
      );
      if (_screens) await _write(tester, 'lujain-a-product-$mode-2');
      expect(tester.takeException(), isNull);
      debugDisableShadows = true;
    });
  }
}
