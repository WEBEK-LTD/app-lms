/// 33 Pictures of the ready-made designs (platform/web/src/lib/pages/designs)
/// in the real app, to review them. Skipped unless run with the designs as
/// JSON (an applied, validated `Layout` each, as the hosted API keeps them)
/// and a folder for the pictures:
///
///   flutter test test/screenshots/design_screenshots_test.dart \
///     --dart-define=YALLAPP_DESIGNS=/path/designs.json \
///     --dart-define=YALLAPP_SHOTS_OUT=/path/out [--plain-name academy]
@Tags(['screenshots'])
library;

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import 'support/demo_api.dart';
import 'support/demo_images.dart';
import 'support/screens.dart';

const _designs = String.fromEnvironment('YALLAPP_DESIGNS');
const _out = String.fromEnvironment('YALLAPP_SHOTS_OUT');

/// Demo entries for each list, with the demo pictures.
const _samples = <String, List<(String, String, String?)>>{
  'courses': [
    ('course-ux', 'UI Design Fundamentals', '₺450'),
    ('course-python', 'Python for Beginners', 'Free'),
    ('course-english', 'Business English', '₺380'),
    ('course-photo', 'Phone Photography', '₺290'),
  ],
  'products': [
    ('product-roses', 'Red Roses Bouquet', '₺650'),
    ('product-orchid', 'White Orchid', '₺890'),
    ('product-candle', 'Fig Candle', '₺240'),
    ('product-gift', 'Gift Box', '₺520'),
    ('product-tulips', 'Spring Tulips', '₺480'),
    ('product-delight', 'Turkish Delight', '₺190'),
  ],
  'dishes': [
    ('dish-burger', 'Grilled Burger', 'EGP 240'),
    ('dish-wrap', 'Chicken Wrap', 'EGP 160'),
    ('drink-coffee', 'Flat White', 'EGP 85'),
    ('dish-soup', 'Lentil Soup', 'EGP 90'),
    ('dish-cheesecake', 'Cheesecake', 'EGP 120'),
    ('drink-juice', 'Fresh Orange', 'EGP 70'),
  ],
  'services': [
    ('service-cut', 'Haircut & styling', 'EGP 450'),
    ('service-colour', 'Colour', 'EGP 1,200'),
    ('service-massage', 'Relaxing massage', 'EGP 900'),
    ('service-facial', 'Facial', 'EGP 750'),
  ],
  'listings': [
    ('home-nile', 'Nile view apartment', 'EGP 8,500,000'),
    ('home-villa', 'Garden villa', 'EGP 21,000,000'),
    ('home-duplex', 'Duplex in Maadi', 'EGP 12,400,000'),
    ('home-studio', 'Studio in Zamalek', 'EGP 4,250,000'),
  ],
  'articles': [
    ('article-harbour', 'The harbour gets a new ferry line', null),
    ('article-market', 'Saturday market moves to the square', null),
    ('article-stadium', 'Derby night: what to expect', null),
    ('article-books', 'Five books for the long weekend', null),
  ],
  'events': [
    ('event-jazz', 'Jazz on the Roof', '₺350'),
    ('event-film', 'Open-air Film Night', 'Free'),
    ('event-ceramics', 'Ceramics Workshop', '₺600'),
    ('event-talk', 'Design Talk', '₺150'),
  ],
  'campaigns': [
    ('campaign-parcels', 'Food parcels for winter', '62% raised'),
    ('campaign-lunch', 'School lunches', '38% raised'),
    ('campaign-coats', 'Warm coats', '81% raised'),
  ],
};

const _categories = {
  'courses': ['Design', 'Languages', 'Business', 'Photography'],
  'products': ['Flowers', 'Gifts', 'Sweets', 'Home'],
  'dishes': ['Breakfast', 'Mains', 'Drinks', 'Desserts'],
  'services': ['Hair', 'Nails', 'Skin'],
  'articles': ['City', 'Sport', 'Culture', 'Business'],
};

/// A LayoutBlock as the hosted API serves it: lists filled, nothing empty.
Map<String, dynamic>? _resolve(Map<String, dynamic> block, String kind) {
  final out = <String, dynamic>{};
  for (final MapEntry(:key, :value) in block.entries) {
    if (key == 'visibility' || key == 'query') continue;
    if ((key == 'action' || key == 'see_all') && value == null) continue;
    out[key] = value is List
        ? [
            for (final entry in value)
              entry is Map
                  ? {
                      for (final e in entry.entries)
                        if (!(e.key == 'action' && e.value == null))
                          e.key: e.value,
                    }
                  : entry,
          ]
        : value;
  }
  final source = block['source'] as String?;
  final list = kind == 'restaurant' && source == 'products' ? 'dishes' : source;
  switch (block['type']) {
    case 'items':
      final query = block['query'] as Map<String, dynamic>;
      final samples = _samples[list]!;
      final limit = (query['limit'] as int).clamp(1, samples.length);
      out['items'] = [
        for (final (i, (image, title, price)) in samples.take(limit).indexed)
          {
            ...itemJson(
              source: source!,
              id: '${i + 1}',
              title: title,
              priceLabel: price,
            ),
            'subtitle': null,
            'image_url': demoImage(image),
          },
      ];
    case 'categories':
      out['categories'] = [
        for (final (i, name) in (_categories[list] ?? const []).indexed)
          {'id': i + 1, 'name': name, 'count': 4 + i * 3},
      ];
    case 'continue_learning':
      out['course'] = myCourseJson();
  }
  return out;
}

AppType _appType(String engine) => switch (engine) {
  'lms' => AppType.lms,
  'store' => AppType.store,
  'booking' => AppType.booking,
  'real_estate' => AppType.realEstate,
  'news' => AppType.news,
  'events' => AppType.events,
  _ => AppType.donations,
};

DemoApi Function() _demo(String kind, Map<String, dynamic> appearance) {
  const primary = {
    'academy': '#0E0D24',
    'store': '#1E4D3F',
    'restaurant': '#7A2E1C',
    'bookings': '#4A2545',
    'clinic': '#123A5C',
    'fitness': '#111827',
    'real_estate': '#1F4E5F',
    'news': '#14213D',
    'events': '#2B1B4A',
    'charity': '#2F6B3A',
  };
  final color = primary[kind]!;
  return switch (kind) {
    'academy' => () => DemoApi.academy(appearance: appearance),
    'store' => () => DemoApi.store(appearance: appearance, primary: color),
    'restaurant' => DemoApi.restaurant,
    'bookings' => () => DemoApi.bookings(appearance: appearance),
    'clinic' => DemoApi.clinic,
    'fitness' => DemoApi.fitness,
    'real_estate' => () => DemoApi.realEstate(appearance: appearance),
    'news' => () => DemoApi.news(appearance: appearance, primary: color),
    'events' => () => DemoApi.events(appearance: appearance, primary: color),
    _ => () => DemoApi.charity(appearance: appearance, primary: color),
  };
}

void main() {
  final enabled = _designs.isNotEmpty && _out.isNotEmpty;
  final designs = enabled
      ? (jsonDecode(File(_designs).readAsStringSync()) as List)
            .cast<Map<String, dynamic>>()
      : const <Map<String, dynamic>>[];

  setUpAll(() async {
    if (enabled) await loadAppFonts();
  });

  for (final design in designs) {
    final id = design['id'] as String;
    final kind = design['kind'] as String;
    final appearance = design['appearance'] as Map<String, dynamic>;
    final pages = (design['pages'] as List).cast<Map<String, dynamic>>();
    final home = pages.first;
    // The top of the home page, and further down where the new blocks are.
    for (final (part, scroll) in [('top', 0.0), ('more', 1300.0)]) {
      testWidgets('$id $part', (tester) async {
        final make = _demo(kind, appearance);
        final shot = Shot(
          '$id-$part',
          appType: _appType(design['engine'] as String),
          template: AppTemplate.values.byName(appearance['template'] as String),
          api: () {
            final FakeApi api = make()
              ..config = {...make().config, 'appearance': appearance}
              ..navigation = {
                'version': 'design.$id',
                'tabs': design['tabs'],
                'pages': [
                  for (final p in pages)
                    {
                      'slug': p['slug'],
                      'title': p['title'],
                      'updated_at': p['updated_at'],
                    },
                ],
              }
              ..pages = {
                for (final p in pages)
                  p['slug'] as String: {
                    'slug': p['slug'],
                    'title': p['title'],
                    'updated_at': p['updated_at'],
                    'show_title': p['show_title'],
                    'blocks': [
                      for (final b
                          in (p['blocks'] as List).cast<Map<String, dynamic>>())
                        ?_resolve(b, kind),
                    ],
                  },
              };
            return api as DemoApi;
          },
          after: scroll == 0
              ? null
              : (tester, router) async {
                  await tester.drag(
                    find.byType(Scrollable).first,
                    Offset(0, -scroll),
                  );
                },
        );
        // Real shadows for raised cards (tests draw them as outlines).
        debugDisableShadows = false;
        await shot.render(tester);
        expect(home['blocks'], isNotEmpty);
        final boundary = tester.renderObject<RenderRepaintBoundary>(
          find.byKey(shotKey),
        );
        await tester.runAsync(() async {
          // A smaller picture than the website's: enough to review.
          final image = await boundary.toImage(pixelRatio: 2);
          final data = await image.toByteData(format: ui.ImageByteFormat.png);
          image.dispose();
          await File('$_out/$id-$part.png')
              .writeAsBytes(Uint8List.view(data!.buffer));
        });
        debugDisableShadows = true;
      });
    }
  }

  test('design screenshots are skipped without YALLAPP_DESIGNS', () {
    expect(enabled || designs.isEmpty, isTrue);
  });
}
