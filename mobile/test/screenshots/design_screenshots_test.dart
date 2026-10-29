/// 33 Pictures of the ready-made designs (platform/web/src/lib/pages/designs)
/// in the real app, to review them. Skipped unless run with the designs as
/// JSON (an applied, validated `Layout` each, as the hosted API keeps them,
/// with Yallapp's translations filled in) and a folder for the pictures:
///
///   flutter test test/screenshots/design_screenshots_test.dart \
///     --dart-define=YALLAPP_DESIGNS=/path/designs.json \
///     --dart-define=YALLAPP_SHOTS_OUT=/path/out \
///     [--dart-define=YALLAPP_LANG=ar] [--plain-name academy]
///
/// 110 platform/web/tests/unit/design-layouts-export.test.ts writes the JSON
/// (`YALLAPP_DESIGNS_OUT=/path/designs.json npx vitest run
/// tests/unit/design-layouts-export.test.ts`). Every design of every kind,
/// in English, Arabic or Turkish (`YALLAPP_LANG`), with the side menu and
/// the design's own pictures (read from `YALLAPP_PICTURES`, by default the
/// platform's public/design-pictures). Each design gives three pictures:
/// `<id>-<lang>-top.png`, `-mid.png` and `-more.png`, further down.
/// 110.3 `YALLAPP_PAGES` (`home,about,contact,faq`; by default `home`) names
/// the pages to picture: another page gives `<id>-<lang>-<slug>-top.png`
/// and `-mid.png`, opened as from the side menu (a design without it is
/// skipped).
@Tags(['screenshots'])
library;

import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import 'support/demo_api.dart';
import 'support/demo_images.dart';
import 'support/screens.dart';

const _designs = String.fromEnvironment('YALLAPP_DESIGNS');
const _out = String.fromEnvironment('YALLAPP_SHOTS_OUT');
const _lang = String.fromEnvironment('YALLAPP_LANG', defaultValue: 'en');
const _pictures = String.fromEnvironment(
  'YALLAPP_PICTURES',
  defaultValue: '../platform/web/public/design-pictures',
);

/// 110.3 The pages to picture, by slug.
final _pageSlugs = const String.fromEnvironment(
  'YALLAPP_PAGES',
  defaultValue: 'home',
).split(',').map((s) => s.trim()).where((s) => s.isNotEmpty).toList();

/// Where the designs' pictures are served in the JSON (`pictureBase`).
const _pictureHost = 'https://yallapp.test/design-pictures/';

typedef _Sample = (String image, String title, String? price);

/// Demo entries for each list, with the demo pictures.
const _samplesEn = <String, List<_Sample>>{
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
  'delivery_services': [
    ('banner-store', 'Same-day delivery', null),
    ('product-gift', 'Express (2 hours)', null),
    ('home-studio', 'Moving small items', null),
  ],
  'restaurants': [
    ('dish-burger', 'Burger House', null),
    ('dish-breakfast', 'Sabah Breakfast', null),
    ('dish-cheesecake', 'Sweet Corner', null),
  ],
  'vehicle_types': [
    ('home-studio', 'Economy', null),
    ('home-villa', 'Comfort', null),
    ('home-duplex', 'Van', null),
  ],
  'school_news': [
    ('article-books', 'Book fair next Thursday', null),
    ('article-stadium', 'Sports day results', null),
    ('article-market', 'Parents meeting on Monday', null),
  ],
};

/// The same entries in Arabic, so an Arabic picture has no English in it.
const _samplesAr = <String, List<_Sample>>{
  'courses': [
    ('course-ux', 'أساسيات تصميم الواجهات', '٤٥٠ ₺'),
    ('course-python', 'بايثون للمبتدئين', 'مجاني'),
    ('course-english', 'إنجليزية الأعمال', '٣٨٠ ₺'),
    ('course-photo', 'التصوير بالهاتف', '٢٩٠ ₺'),
  ],
  'products': [
    ('product-roses', 'باقة ورد أحمر', '٦٥٠ ₺'),
    ('product-orchid', 'أوركيد أبيض', '٨٩٠ ₺'),
    ('product-candle', 'شمعة التين', '٢٤٠ ₺'),
    ('product-gift', 'صندوق هدايا', '٥٢٠ ₺'),
    ('product-tulips', 'توليب الربيع', '٤٨٠ ₺'),
    ('product-delight', 'راحة الحلقوم', '١٩٠ ₺'),
  ],
  'dishes': [
    ('dish-burger', 'برجر مشوي', '٢٤٠ ج.م'),
    ('dish-wrap', 'راب دجاج', '١٦٠ ج.م'),
    ('drink-coffee', 'فلات وايت', '٨٥ ج.م'),
    ('dish-soup', 'شوربة عدس', '٩٠ ج.م'),
    ('dish-cheesecake', 'تشيز كيك', '١٢٠ ج.م'),
    ('drink-juice', 'برتقال طازج', '٧٠ ج.م'),
  ],
  'services': [
    ('service-cut', 'قص وتصفيف الشعر', '٤٥٠ ج.م'),
    ('service-colour', 'صبغة', '١٬٢٠٠ ج.م'),
    ('service-massage', 'مساج استرخاء', '٩٠٠ ج.م'),
    ('service-facial', 'تنظيف البشرة', '٧٥٠ ج.م'),
  ],
  'listings': [
    ('home-nile', 'شقة بإطلالة على النيل', '٨٬٥٠٠٬٠٠٠ ج.م'),
    ('home-villa', 'فيلا بحديقة', '٢١٬٠٠٠٬٠٠٠ ج.م'),
    ('home-duplex', 'دوبلكس في المعادي', '١٢٬٤٠٠٬٠٠٠ ج.م'),
    ('home-studio', 'استوديو في الزمالك', '٤٬٢٥٠٬٠٠٠ ج.م'),
  ],
  'articles': [
    ('article-harbour', 'خط عبّارات جديد في الميناء', null),
    ('article-market', 'سوق السبت ينتقل إلى الساحة', null),
    ('article-stadium', 'ليلة الديربي: ماذا تتوقع', null),
    ('article-books', 'خمسة كتب لعطلة طويلة', null),
  ],
  'events': [
    ('event-jazz', 'جاز على السطح', '٣٥٠ ₺'),
    ('event-film', 'ليلة سينما في الهواء الطلق', 'مجاني'),
    ('event-ceramics', 'ورشة خزف', '٦٠٠ ₺'),
    ('event-talk', 'حديث عن التصميم', '١٥٠ ₺'),
  ],
  'campaigns': [
    ('campaign-parcels', 'طرود غذائية للشتاء', 'جُمع ٦٢٪'),
    ('campaign-lunch', 'وجبات مدرسية', 'جُمع ٣٨٪'),
    ('campaign-coats', 'معاطف دافئة', 'جُمع ٨١٪'),
  ],
  'delivery_services': [
    ('banner-store', 'توصيل في نفس اليوم', null),
    ('product-gift', 'سريع (ساعتان)', null),
    ('home-studio', 'نقل أغراض صغيرة', null),
  ],
  'restaurants': [
    ('dish-burger', 'بيت البرجر', null),
    ('dish-breakfast', 'فطور الصباح', null),
    ('dish-cheesecake', 'ركن الحلويات', null),
  ],
  'vehicle_types': [
    ('home-studio', 'اقتصادي', null),
    ('home-villa', 'مريح', null),
    ('home-duplex', 'فان', null),
  ],
  'school_news': [
    ('article-books', 'معرض الكتاب الخميس القادم', null),
    ('article-stadium', 'نتائج اليوم الرياضي', null),
    ('article-market', 'اجتماع أولياء الأمور يوم الاثنين', null),
  ],
};

const _categoriesEn = {
  'courses': ['Design', 'Languages', 'Business', 'Photography'],
  'products': ['Flowers', 'Gifts', 'Sweets', 'Home'],
  'dishes': ['Breakfast', 'Mains', 'Drinks', 'Desserts'],
  'services': ['Hair', 'Nails', 'Skin'],
  'articles': ['City', 'Sport', 'Culture', 'Business'],
};

const _categoriesAr = {
  'courses': ['تصميم', 'لغات', 'أعمال', 'تصوير'],
  'products': ['ورود', 'هدايا', 'حلويات', 'المنزل'],
  'dishes': ['فطور', 'أطباق رئيسية', 'مشروبات', 'حلويات'],
  'services': ['شعر', 'أظافر', 'بشرة'],
  'articles': ['المدينة', 'رياضة', 'ثقافة', 'أعمال'],
};

final _samples = _lang == 'ar' ? _samplesAr : _samplesEn;
final _categories = _lang == 'ar' ? _categoriesAr : _categoriesEn;

/// The texts of a block, a tab or an entry in [_lang], from its
/// `translations` (as the hosted API serves them), without them.
Map<String, dynamic> _translated(Map<String, dynamic> value) {
  final out = {...value}..remove('translations');
  final texts = (value['translations'] as Map?)?[_lang] as Map?;
  for (final MapEntry(:key, :value) in (texts ?? const {}).entries) {
    if (value is String && value.trim().isNotEmpty && out.containsKey(key)) {
      out[key as String] = value;
    }
  }
  return out;
}

/// A LayoutBlock as the hosted API serves it: lists filled, nothing empty.
Map<String, dynamic>? _resolve(Map<String, dynamic> block, String kind) {
  final out = <String, dynamic>{};
  for (final MapEntry(:key, :value) in _translated(block).entries) {
    if (key == 'visibility' || key == 'query') continue;
    if ((key == 'action' || key == 'see_all') && value == null) continue;
    out[key] = value is List
        ? [
            for (final entry in value)
              entry is Map<String, dynamic>
                  ? {
                      for (final e in _translated(entry).entries)
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
      final samples = _samples[list];
      if (samples == null) throw StateError('No demo entries for $list');
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
            'badge': null,
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
  'donations' => AppType.donations,
  'delivery' => AppType.delivery,
  'food' => AppType.food,
  'rides' => AppType.rides,
  'school' => AppType.school,
  _ => throw ArgumentError('Unknown engine $engine'),
};

/// The demo business of the design's kind, in the design's look, under the
/// name the JSON gives it.
DemoApi _demo(
  String kind,
  String? vertical,
  Map<String, dynamic> appearance,
  String name,
) {
  const primary = {
    'academy': '#0E0D24',
    'instructors': '#0E0D24',
    'store': '#1E4D3F',
    'restaurant': '#7A2E1C',
    'bookings': '#4A2545',
    'services': '#4A2545',
    'clinic': '#123A5C',
    'fitness': '#111827',
    'real_estate': '#1F4E5F',
    'news': '#14213D',
    'events': '#2B1B4A',
    'charity': '#2F6B3A',
    'delivery': '#123A5C',
    'food': '#D2552B',
    'rides': '#14857A',
    'taxi': '#111827',
    'school': '#1F4E79',
  };
  final color = primary[kind] ?? '#0E0D24';
  final api = switch (kind) {
    'academy' || 'instructors' => DemoApi.academy(appearance: appearance),
    'store' => DemoApi.store(appearance: appearance, primary: color),
    'restaurant' => DemoApi.restaurant(),
    'bookings' || 'services' => DemoApi.bookings(appearance: appearance),
    'clinic' => DemoApi.clinic(),
    'fitness' => DemoApi.fitness(),
    'real_estate' => DemoApi.realEstate(appearance: appearance),
    'news' => DemoApi.news(appearance: appearance, primary: color),
    'events' => DemoApi.events(appearance: appearance, primary: color),
    'charity' => DemoApi.charity(appearance: appearance, primary: color),
    'delivery' => DemoApi.delivery(),
    'food' => DemoApi.food(),
    'rides' || 'taxi' => DemoApi.rides(),
    // A school: the charity's demo with a school's config instead.
    'school' => DemoApi.charity(appearance: appearance, primary: color),
    _ => throw ArgumentError('No demo app for $kind'),
  };
  final config = {...api.config, 'appearance': appearance};
  if (vertical != null) config['vertical'] = vertical;
  // 105.3 The academy's teachers, so the Teachers tab and links show.
  if (kind == 'instructors') config['instructors'] = {'applications': true};
  if (kind == 'school') {
    config
      ..remove('donations')
      ..remove('vertical')
      ..['school'] = schoolConfigJson();
  }
  config['branding'] = {
    ...?(config['branding'] as Map<String, dynamic>?),
    'primary_color': color,
  };
  config['site'] = {...(config['site'] as Map<String, dynamic>), 'name': name};
  api.config = config;
  return api;
}

/// The designs' own pictures, decoded once, by their URL in the JSON.
final _pictureImages = <String, ui.Image>{};

void main() {
  final enabled = _designs.isNotEmpty && _out.isNotEmpty;
  final designs = enabled
      ? (jsonDecode(File(_designs).readAsStringSync()) as List)
            .cast<Map<String, dynamic>>()
      : const <Map<String, dynamic>>[];

  setUpAll(() async {
    if (!enabled) return;
    await loadAppFonts();
    final folder = Directory(_pictures);
    if (!folder.existsSync()) return;
    for (final file in folder.listSync().whereType<File>()) {
      // 110.3 The drawn pictures of the designs' pages are PNG files.
      if (!file.path.endsWith('.jpg') && !file.path.endsWith('.png')) continue;
      final codec = await ui.instantiateImageCodec(file.readAsBytesSync());
      final frame = await codec.getNextFrame();
      _pictureImages['$_pictureHost${file.uri.pathSegments.last}'] =
          frame.image;
    }
  });

  for (final design in designs) {
    final id = design['id'] as String;
    final kind = design['kind'] as String;
    final appearance = design['appearance'] as Map<String, dynamic>;
    final pages = (design['pages'] as List).cast<Map<String, dynamic>>();
    final home = pages.first;
    for (final slug in _pageSlugs) {
      if (!pages.any((p) => p['slug'] == slug)) continue;
      final isHome = slug == 'home';
      final name = isHome ? '$id-$_lang' : '$id-$_lang-$slug';
      // The top of the page, and further down where the other blocks are.
      for (final (part, scroll) in [
        ('top', 0.0),
        ('mid', 680.0),
        if (isHome) ('more', 1360.0),
      ]) {
        testWidgets('$id $_lang $slug $part', (tester) async {
          // The design's pictures, as the app would download them (the cache
          // must hold them all: they are bigger than its default size).
          final cache = PaintingBinding.instance.imageCache
            ..maximumSizeBytes = 1 << 30
            ..maximumSize = 2000;
          for (final MapEntry(:key, :value) in _pictureImages.entries) {
            if (!key.startsWith('$_pictureHost$id-') &&
                !key.startsWith('${_pictureHost}art-')) {
              continue;
            }
            cache.putIfAbsent(
              NetworkImage(key),
              () => OneFrameImageStreamCompleter(
                SynchronousFuture(ImageInfo(image: value.clone())),
              ),
            );
          }
          List<Map<String, dynamic>> tabs(String key) => [
            for (final t in (design[key] as List? ?? const []))
              _translated(t as Map<String, dynamic>),
          ];
          final shot = Shot(
            '$name-$part',
            location: isHome ? null : '${Paths.pagePrefix}$slug',
          // The app's own name, as its header shows it.
          build: (b) => b.copyWith(appName: design['name'] as String),
            appType: _appType(design['engine'] as String),
            template: AppTemplate.values.byName(
              appearance['template'] as String,
            ),
            language: _lang,
            api: () {
              final api =
                  _demo(
                      kind,
                      design['vertical'] as String?,
                      appearance,
                      design['name'] as String,
                    )
                    ..navigation = {
                      'version': 'design.$id.$_lang',
                      'tabs': tabs('tabs'),
                      'more': <Object>[],
                      // The About us and Contact pages are in the side menu.
                      'menu': tabs('menu'),
                      'pages': [
                        for (final p in pages)
                          {
                            'slug': p['slug'],
                            'title': _translated(p)['title'],
                            'updated_at': p['updated_at'],
                          },
                      ],
                    }
                    ..pages = {
                      for (final p in pages)
                        p['slug'] as String: {
                          'slug': p['slug'],
                          'title': _translated(p)['title'],
                          'updated_at': p['updated_at'],
                          'show_title': p['show_title'],
                          'blocks': [
                            for (final b
                                in (p['blocks'] as List)
                                    .cast<Map<String, dynamic>>())
                              ?_resolve(b, kind),
                          ],
                        },
                    };
              return api as FakeApi;
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
            await File('$_out/$name-$part.png')
                .writeAsBytes(Uint8List.view(data!.buffer));
          });
          debugDisableShadows = true;
        });
      }
    }
  }

  test('design screenshots are skipped without YALLAPP_DESIGNS', () {
    expect(enabled || designs.isEmpty, isTrue);
  });
}
