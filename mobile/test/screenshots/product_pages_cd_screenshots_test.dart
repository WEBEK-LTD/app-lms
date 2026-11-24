/// 228.7 The furniture and decor looks C and D's own product pages (MIZAN,
/// MANZIL, ATHAR, MAZAJ), drawn by the real app from the projects their
/// templates start (test/support/signatures, written by
/// platform/web/tests/unit/signature-looks.test.ts) for one of each demo's
/// pieces with its own CC0 photos: 390 points wide at 2x, by day and by
/// night, in English and Arabic, the page's top and further down. With
/// `--dart-define=YALLAPP_PRODUCT_CD=<folder>` they are written there (not
/// kept in the repository), with `--dart-define=YALLAPP_SHOP_CD_FONTS=<folder>`
/// the looks' own fonts (Google Fonts' `ofl/<family>/<file>`), as 224's
/// shots draw them; skipped without them.
@Tags(['screenshots'])
library;

import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/theme/fonts/font_cache.dart';
import 'package:yallapp/core/theme/fonts/remote_fonts.dart';

import '../support/fixtures.dart';
import 'support/demo_api.dart';
import 'support/screens.dart';
import 'support/studio_demo.dart';

const _out = String.fromEnvironment('YALLAPP_PRODUCT_CD');
const _fonts = String.fromEnvironment('YALLAPP_SHOP_CD_FONTS');

class _Cache implements FontCache {
  final _files = <String, Uint8List>{};
  @override
  Future<Uint8List?> read(String key) async => _files[key];
  @override
  Future<void> write(String key, Uint8List bytes) async => _files[key] = bytes;
}

/// The looks' fonts from the folder, by the path the platform serves them at.
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

/// A piece of the demo, as `GET /store/products/{id}` serves it.
class _Piece {
  const _Piece({
    required this.dir,
    required this.name,
    required this.nameAr,
    required this.price,
    required this.photos,
    required this.choice,
    required this.choiceAr,
    required this.options,
    required this.dimensions,
    required this.dimensionsAr,
    required this.description,
    required this.descriptionAr,
    required this.related,
  });

  final String dir;
  final String name;
  final String nameAr;
  final String price;
  final List<String> photos;
  final String choice;
  final String choiceAr;
  final List<String> options;
  final String dimensions;
  final String dimensionsAr;
  final String description;
  final String descriptionAr;
  final List<(String, String, String)> related;
}

const _sofa = _Piece(
  dir: 'furniture-photos',
  name: 'Najd leather sofa, 3 seats',
  nameAr: 'كنبة نجد الجلدية، 3 مقاعد',
  price: '5,900',
  photos: ['najd-sofa', 'room-living', 'lounge', 'hero-living'],
  choice: 'Colour',
  choiceAr: 'اللون',
  options: ['Ivory', 'Sand', 'Charcoal'],
  dimensions: 'W 220 × D 95 × H 82 cm',
  dimensionsAr: '220 × 95 × 82 سم',
  description: 'A low, deep three-seater in soft natural leather on a slim steel base, the heart of the Najd set.',
  descriptionAr: 'كنبة منخفضة وعميقة بثلاثة مقاعد من الجلد الطبيعي الناعم على قاعدة فولاذية نحيفة، قلب طقم نجد.',
  related: [
    ('najd-armchair', 'Najd armchair', 'كرسي نجد بذراعين'),
    ('coffee-table', 'Oak coffee table', 'طاولة قهوة من البلوط'),
    ('loveseat', 'Linen loveseat', 'كنبة كتان لشخصين'),
  ],
);

const _vase = _Piece(
  dir: 'decor-photos',
  name: 'Ribbed ceramic vase',
  nameAr: 'مزهرية خزفية مضلّعة',
  price: '165',
  photos: ['ribbed-vase', 'sage-jars', 'pink-vase', 'twin-vases'],
  choice: 'Size',
  choiceAr: 'المقاس',
  options: ['Small', 'Large'],
  dimensions: 'W 14 × D 14 × H 28 cm',
  dimensionsAr: '14 × 14 × 28 سم',
  description: 'A tall matte vase with fine ribs, thrown in stoneware and glazed inside so it holds water for fresh stems.',
  descriptionAr: 'مزهرية طويلة غير لامعة بأضلاع رفيعة، مصنوعة من الحجر الخزفي ومزججة من الداخل لتحمل الماء للزهور الطازجة.',
  related: [
    ('sage-jars', 'Sage glazed bottle vases', 'مزهريات قارورية بلون المريمية'),
    ('pink-vase', 'Blush vase with pampas', 'مزهرية وردية مع عشب البامباس'),
    ('twin-vases', 'Twin vases on an oak tray', 'مزهريتان على صينية بلوط'),
  ],
);

Map<String, dynamic> _detail(StudioDemo demo, _Piece p, String language) {
  final ar = language == 'ar';
  String photo(String n) => '${demo.base}/${p.dir}/$n.jpg';
  Map<String, dynamic> sar(String amount) => {
    ...priceJson(amount.replaceAll(',', '')),
    'currency': 'SAR',
    'formatted': ar ? '$amount ر.س' : 'SAR $amount',
  };
  return {
    ...productSummaryJson(
      id: 30,
      name: ar ? p.nameAr : p.name,
      type: 'variable',
      price: sar(p.price),
    ),
    'image_url': photo(p.photos.first),
    'rating': 4.7,
    'rating_count': 38,
    'description_html': '<p>${ar ? p.descriptionAr : p.description}</p>',
    'short_description_html': null,
    'images': [
      for (final n in p.photos) {'url': photo(n), 'alt': null},
    ],
    'sku': 'X-1',
    'max_quantity': null,
    'attributes': [
      {
        'slug': 'a1',
        'name': ar ? p.choiceAr : p.choice,
        'variation': true,
        'options': [
          for (final o in p.options) {'value': o, 'label': o},
        ],
      },
    ],
    'variations': [
      for (final (i, o) in p.options.indexed)
        {
          'id': 100 + i,
          'attributes': {'a1': o},
          'price': sar(p.price),
          'image_url': null,
          'stock_status': 'in_stock',
          'max_quantity': 3,
          'purchasable': true,
        },
    ],
    'default_attributes': {'a1': p.options.first},
    'dimensions': {'text': ar ? p.dimensionsAr : p.dimensions},
    'categories': <Object>[],
    'related': [
      for (final (i, (n, en, arName)) in p.related.indexed)
        {
          ...productSummaryJson(
            id: 40 + i,
            name: ar ? arName : en,
            price: sar(p.price),
          ),
          'image_url': photo(n),
        },
    ],
    'external_url': null,
    'permalink': 'https://example.com/product/30',
  };
}

Shot _shot(
  String demoName,
  String look,
  _Piece piece, {
  required bool dark,
  required String language,
}) {
  final demo = StudioDemo.signature(demoName, look);
  return Shot(
    '$demoName-$look-product',
    api: () {
      final primary =
          (demo.appearance['primary_color'] as String?) ?? '#111111';
      final api = demo.apply(
        DemoApi.store(primary: primary),
        appName: demoName == 'furniture' ? 'Rukn' : 'Sakan',
        primaryColor: primary,
      );
      api
        ..config = {
          ...api.config,
          'store': {
            ...(api.config['store'] as Map<String, dynamic>),
            'returns': {'enabled': true, 'days': 14},
          },
        }
        ..product = _detail(demo, piece, language);
      return api;
    },
    appName: demoName == 'furniture' ? 'Rukn' : 'Sakan',
    appType: AppType.store,
    dark: dark,
    language: language,
    location: '/product/30',
    size: const Size(390, 844),
    overrides: _fontOverrides,
    designPictures: true,
    prepare: (tester) => demo.prepare(tester, [
      for (final n in [...piece.photos, ...piece.related.map((r) => r.$1)])
        '/${piece.dir}/$n.jpg',
    ]),
    shadows: true,
  );
}

Future<void> _down(WidgetTester tester) async {
  final page = find
      .byWidgetPredicate(
        (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
      )
      .first;
  final position = tester.state<ScrollableState>(page).position;
  position.jumpTo((position.pixels + 700).clamp(0, position.maxScrollExtent));
  await tester.pump(const Duration(milliseconds: 800));
  await tester.pump(const Duration(milliseconds: 800));
}

Future<void> _write(WidgetTester tester, String name) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(shotKey),
  );
  final png = (await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
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
    if (_out.isNotEmpty) await loadAppFonts();
  });

  for (final (demo, look, piece) in [
    ('furniture', 'c', _sofa),
    ('furniture', 'd', _sofa),
    ('decor', 'c', _vase),
    ('decor', 'd', _vase),
  ]) {
    for (final (mode, dark, language) in [
      ('en-light', false, 'en'),
      ('en-dark', true, 'en'),
      ('ar-light', false, 'ar'),
      ('ar-dark', true, 'ar'),
    ]) {
      final name = '$demo-$look-product-$mode';
      testWidgets(name, skip: _out.isEmpty || _fonts.isEmpty, (tester) async {
        debugDisableShadows = false;
        await _shot(
          demo,
          look,
          piece,
          dark: dark,
          language: language,
        ).render(tester);
        // The look's own product page, bound to the piece.
        expect(find.byKey(const ValueKey('product-title')), findsOneWidget);
        expect(find.byKey(const ValueKey('product-exchange')), findsNothing);
        // 228.8 MIZAN heads its notes with the piece's size.
        expect(
          find.byKey(const ValueKey('product-dimensions-headline')),
          demo == 'furniture' && look == 'c' ? findsOneWidget : findsNothing,
        );
        if (_out.isNotEmpty) await _write(tester, name);
        await _down(tester);
        if (_out.isNotEmpty) await _write(tester, '$name-2');
        expect(tester.takeException(), isNull);
        debugDisableShadows = true;
      });
    }
  }
}
