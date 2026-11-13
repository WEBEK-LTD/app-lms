/// 129.1–129.8 The gallery of Studio's premium motion and media elements,
/// for review and the docs: each element on a Studio page in the real app,
/// light, dark and in Arabic, written to
/// platform/web/public/screens/premium/`<element>`-`<light|dark|ar>`.png
/// (360 × 720 points at 2x). Skipped unless run with
/// `--dart-define=YALLAPP_PREMIUM_SHOTS=true`:
///
///   TZ=Europe/Istanbul flutter test \
///     test/screenshots/premium_motion_gallery_test.dart \
///     --dart-define=YALLAPP_PREMIUM_SHOTS=true --update-goldens
@Tags(['screenshots'])
library;

import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'support/shot.dart';

const _enabled = bool.fromEnvironment('YALLAPP_PREMIUM_SHOTS');
const _out = '../../../platform/web/public/screens/premium';
const _host = 'https://yallapp.test';
const _size = Size(360, 720);
const _ratio = 2.0;

/// One of Yallapp's photos (platform/web/public), at the address the page names.
String photo(String path) => '$_host/$path';

typedef Words = String Function(String en, String ar);

/// An element's page: its elements, in English or Arabic.
class PremiumShot {
  const PremiumShot(this.name, this.children, {this.background});

  final String name;
  final List<Map<String, dynamic>> Function(Words words) children;
  final String? background;
}

Map<String, dynamic> _text(
  String id,
  String text, {
  double size = 16,
  int weight = 400,
  String? color,
  Map<String, dynamic>? margin,
  bool uppercase = false,
  double? spacing,
}) => {
  'id': id,
  'type': 'text',
  'text': text,
  'font': {
    'size': size,
    'weight': weight,
    'uppercase': ?(uppercase ? true : null),
    'letter_spacing': ?spacing,
  },
  'color': ?color,
  'margin': ?margin,
};

Map<String, dynamic> _pad(double t, double e, double b, double s) => {
  'top': t,
  'end': e,
  'bottom': b,
  'start': s,
};

/// The heading over an element in the gallery.
List<Map<String, dynamic>> _heading(String title, String line) => [
  _text('h-title', title, size: 24, weight: 800, margin: _pad(18, 20, 2, 20)),
  _text('h-line', line, size: 13, margin: _pad(0, 20, 12, 20)),
];

Map<String, dynamic> _slide(
  String id,
  String photoPath,
  String kicker,
  String headline,
  String? cta, {
  double height = 420,
  double radius = 0,
}) => {
  'id': id,
  'type': 'photo_hero',
  'image_url': photo(photoPath),
  'height': height,
  'radius': ?(radius > 0 ? radius : null),
  'background': '#1F2A37',
  'scrim': {
    'color': '#000000',
    'from': 0.25,
    'middle': 0.05,
    'at': 40,
    'to': 0.8,
  },
  'align': 'end',
  'gap': 8,
  'padding': _pad(20, 20, radius > 0 ? 22 : 44, 20),
  'children': [
    if (radius == 0)
      _text(
        '$id-k',
        kicker,
        size: 12,
        weight: 800,
        color: '#F5C451',
        uppercase: true,
        spacing: 1.5,
      ),
    _text(
      '$id-h',
      headline,
      size: radius > 0 ? 20 : 28,
      weight: 800,
      color: '#FFFFFF',
    ),
    if (cta != null)
      {
        'id': '$id-b',
        'type': 'button',
        'text': cta,
        'width': 'hug',
        'height': 42,
        'radius': 21,
        'background': '#FFFFFF',
        'color': '#0E0D24',
        'font': {'size': 14, 'weight': 800},
        'padding': _pad(0, 20, 0, 20),
        'margin': _pad(6, 0, 0, 0),
      },
  ],
};

final premiumShots = <PremiumShot>[
  // 129.1 The hero slider and the card carousel.
  PremiumShot(
    'slider',
    (w) => [
      {
        'id': 'hero',
        'type': 'slider',
        'height': 340,
        'autoplay': true,
        'interval_ms': 5000,
        'indicator': 'progress',
        'ken_burns': true,
        'children': [
          _slide(
            'h1',
            'stories/multi-vendor/zad-market-aisle.jpg',
            w('New season', 'موسم جديد'),
            w('Made for the way you live', 'معمول على مزاجك'),
            w('Discover', 'اكتشف'),
            height: 340,
          ),
          _slide(
            'h2',
            'stories/multi-vendor/zad-cafe.jpg',
            w('Every morning', 'كل صباح'),
            w('Fresh every morning', 'طازج كل صباح'),
            w('Discover', 'اكتشف'),
            height: 340,
          ),
        ],
      },
      _text(
        'c-title',
        w('Card carousel', 'بطاقات متتالية'),
        size: 20,
        weight: 800,
        margin: _pad(18, 20, 10, 20),
      ),
      {
        'id': 'cards',
        'type': 'slider',
        'height': 180,
        'per_view': 1.2,
        'gap': 12,
        'indicator': 'pill',
        'padding': _pad(0, 0, 0, 16),
        'children': [
          _slide(
            'c1',
            'demo-photos/cover-grill.jpg',
            '',
            w('Grill night', 'ليلة المشويات'),
            null,
            height: 180,
            radius: 24,
          ),
          _slide(
            'c2',
            'demo-photos/cover-pizza.jpg',
            '',
            w('Stone-baked pizza', 'بيتزا على الحجر'),
            null,
            height: 180,
            radius: 24,
          ),
          _slide(
            'c3',
            'demo-photos/cover-market.jpg',
            '',
            w('The market', 'السوق'),
            null,
            height: 180,
            radius: 24,
          ),
        ],
      },
    ],
  ),
];

/// The photos [json] names, put in the image cache at their addresses.
Future<void> _seedPhotos(WidgetTester tester, Object? json) async {
  final paths = <String>{};
  void walk(Object? v) {
    if (v is String && v.startsWith('$_host/')) paths.add(v);
    if (v is Map) v.values.forEach(walk);
    if (v is List) v.forEach(walk);
  }

  walk(json);
  final cache = PaintingBinding.instance.imageCache
    ..maximumSizeBytes = 1 << 30
    ..maximumSize = 4000;
  for (final url in paths) {
    final image = await tester.runAsync(() async {
      final file = File(
        '../platform/web/public/${url.substring(_host.length + 1)}',
      );
      final codec = await ui.instantiateImageCodec(
        file.readAsBytesSync(),
        targetWidth: 900,
      );
      return (await codec.getNextFrame()).image;
    });
    cache.putIfAbsent(
      NetworkImage(url),
      () => OneFrameImageStreamCompleter(
        SynchronousFuture(ImageInfo(image: image!)),
      ),
    );
  }
}

void main() {
  setUpAll(() async {
    if (_enabled) await loadAppFonts();
  });

  for (final shot in premiumShots) {
    for (final variant in const ['light', 'dark', 'ar']) {
      testWidgets('${shot.name}-$variant', skip: !_enabled, (tester) async {
        final ar = variant == 'ar';
        final dark = variant == 'dark';
        final children = shot.children((en, arabic) => ar ? arabic : en);
        usePhone(tester, size: _size);
        tester.view.devicePixelRatio = _ratio;
        tester.view.physicalSize = _size * _ratio;
        tester.view.padding = const FakeViewPadding(top: statusBarHeight * 2);
        tester.view.viewPadding = const FakeViewPadding(
          top: statusBarHeight * 2,
        );
        await _seedPhotos(tester, children);
        final lightIcons = ValueNotifier(dark);
        addTearDown(lightIcons.dispose);
        final api =
            FakeApi(
                config: configJson(
                  languages: languagesJson(available: const ['en', 'ar', 'tr']),
                ),
              )
              ..navigation = navigationJson(
                tabs: [
                  navTabJson('home', ar ? 'الرئيسية' : 'Home', 'home', {
                    'type': 'page',
                    'page_slug': 'home',
                  }),
                  navTabJson('account', ar ? 'حسابي' : 'Account', 'person', {
                    'type': 'screen',
                    'screen': 'account',
                  }),
                ],
              )
              ..pages = {
                'home': {
                  ...appPageJson(blocks: [], showTitle: false),
                  'studio': {
                    'background': ?shot.background,
                    'body': {
                      'id': 'root',
                      'type': 'column',
                      'children': children,
                    },
                  },
                },
              };
        final app = TestApp(
          api: api,
          appType: AppType.lms,
          signedIn: true,
          preferences: {
            'settings.theme_mode': dark ? 'dark' : 'light',
            'settings.language': ar ? 'ar' : 'en',
          },
          wrap: (app) => withStatusBar(app, lightIcons: lightIcons),
        );
        await app.pump(tester);
        await TestApp.settle(tester, 30);
        await tester.pump(const Duration(milliseconds: 1500));
        lightIcons.value = appWantsLightStatusBar(tester);
        await tester.pump();
        final boundary = tester.renderObject<RenderRepaintBoundary>(
          find.byKey(shotKey),
        );
        final png = await tester.runAsync(() async {
          final image = await boundary.toImage(pixelRatio: _ratio);
          final data = await image.toByteData(format: ui.ImageByteFormat.png);
          image.dispose();
          return Uint8List.view(data!.buffer);
        });
        final file = Uri.parse('$_out/${shot.name}-$variant.png');
        await tester.runAsync(() async {
          if (autoUpdateGoldenFiles) {
            await goldenFileComparator.update(file, png!);
          } else {
            expect(await goldenFileComparator.compare(png!, file), isTrue);
          }
        });
        await tester.pumpWidget(const SizedBox());
        app.container.dispose();
        await TestApp.settle(tester, 2);
      });
    }
  }
}
