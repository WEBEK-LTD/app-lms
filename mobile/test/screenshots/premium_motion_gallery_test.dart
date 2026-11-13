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
  const PremiumShot(
    this.name,
    this.children, {
    this.background,
    this.preferences = const {},
    this.then,
  });

  final String name;
  final List<Map<String, dynamic>> Function(Words words) children;
  final String? background;

  /// What the phone already keeps (stories seen).
  final Map<String, Object> preferences;

  /// A second picture after a tap (`<name>-open-<variant>.png`): the
  /// stories full screen, the gallery's viewer.
  final Future<void> Function(WidgetTester tester)? then;
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

Map<String, dynamic> _banner(
  String id,
  String type,
  String photoPath, {
  required String title,
  required String line,
  required String cta,
  double height = 300,
  bool glass = false,
  double radius = 26,
  Map<String, dynamic>? margin,
  String align = 'end',
}) => {
  'id': id,
  'type': type,
  'image_url': photo(photoPath),
  if (type == 'video_hero') ...{
    'video_url': 'https://yallapp.test/videos/loop.mp4',
    'autoplay': true,
  },
  if (type == 'parallax_banner') 'parallax': {'speed': 0.5},
  'glass': ?(glass ? true : null),
  'height': height,
  'radius': ?(radius > 0 ? radius : null),
  'margin': ?margin,
  'background': '#10131F',
  'scrim': glass
      ? {'color': '#000000', 'from': 0.1, 'to': 0.45}
      : {'color': '#000000', 'from': 0.3, 'middle': 0.05, 'at': 40, 'to': 0.85},
  'align': align,
  'gap': 10,
  'padding': _pad(22, 22, glass ? 22 : 34, 22),
  'children': [
    _text('$id-t', title, size: 28, weight: 800, color: '#FFFFFF'),
    _text('$id-l', line, size: 15, color: '#FFFFFF'),
    {
      'id': '$id-b',
      'type': 'button',
      'text': cta,
      'width': 'hug',
      'height': 44,
      'radius': 22,
      'background': '#FFFFFF',
      'color': '#0E0D24',
      'font': {'size': 14, 'weight': 800},
      'padding': _pad(0, 22, 0, 22),
      'margin': _pad(6, 0, 0, 0),
    },
  ],
};

const _galleryPhotos = [
  ('demo-photos/mixed-grill.jpg', 'Mixed grill', 'مشويات مشكلة'),
  ('demo-photos/margherita.jpg', 'Margherita', 'مارغريتا'),
  ('demo-photos/kofta.jpg', 'Kofta', 'كفتة'),
  ('demo-photos/cover-market.jpg', 'The market', 'السوق'),
  ('demo-photos/croissants.jpg', 'Croissants', 'كرواسون'),
  ('demo-photos/shish-tawook.jpg', 'Shish tawook', 'شيش طاووق'),
  ('demo-photos/fruit.jpg', 'Fruit', 'فاكهة'),
];

List<Map<String, dynamic>> _galleryImages(Words w, {int from = 0}) => [
  for (final (path, en, ar) in _galleryPhotos.skip(from))
    {'image_url': photo(path), 'caption': w(en, ar)},
];

/// 129.8 A card that comes in as [enter] says, after [delay] ms.
Map<String, dynamic> _entering(
  String id,
  String enter,
  int delay,
  String icon,
  String title,
  String line,
) => {
  'id': id,
  'type': 'row',
  'gap': 14,
  'cross': 'center',
  'radius': 22,
  'background': '#FFFFFF',
  'dark_background': '#1E1C33',
  'border_color': '#E8E2D6',
  'dark_border_color': '#2E2B48',
  'border_width': 1,
  'padding': _pad(16, 16, 16, 16),
  'margin': _pad(0, 16, 12, 16),
  'motion': {'enter': enter, 'duration_ms': 600, 'delay_ms': delay},
  'children': [
    {
      'id': '$id-i',
      'type': 'icon',
      'icon': icon,
      'icon_size': 26,
      'width': 48,
      'height': 48,
      'radius': 16,
      'background': '#F5C451',
      'color': '#0E0D24',
      'align': 'center',
      'cross': 'center',
      'padding': _pad(11, 11, 11, 11),
    },
    {
      'id': '$id-c',
      'type': 'column',
      'gap': 2,
      'width': 'fill',
      'children': [
        _text('$id-t', title, size: 16, weight: 800),
        _text('$id-l', line, size: 13),
      ],
    },
  ],
};

final premiumShots = <PremiumShot>[
  _storiesShot,
  // 129.8 Entrances, caught as they play: each card comes in its own way.
  PremiumShot(
    'motion',
    (w) => [
      ..._heading(
        w('Entrances', 'الظهور'),
        w(
          'Each element can come in once, when it first shows.',
          'يمكن لكل عنصر أن يظهر مرة واحدة، أول ما يظهر.',
        ),
      ),
      _entering(
        'e1',
        'fade',
        0,
        'bolt',
        w('Fade in', 'يتلاشى للداخل'),
        w('Softly, from nothing.', 'بهدوء، من لا شيء.'),
      ),
      _entering(
        'e2',
        'slide_up',
        150,
        'trending_up',
        w('Rise', 'يرتفع'),
        w('Up into its place.', 'إلى مكانه من الأسفل.'),
      ),
      _entering(
        'e3',
        'zoom',
        300,
        'star',
        w('Scale up', 'يكبر'),
        w('Growing as it shows.', 'يكبر وهو يظهر.'),
      ),
      _entering(
        'e4',
        'slide_start',
        450,
        'arrow_forward',
        w('Slide in from the start', 'ينزلق من البداية'),
        w(
          'From the left, the right in Arabic.',
          'من اليسار، ومن اليمين بالعربية.',
        ),
      ),
    ],
  ),
  // 129.5 A bento with its captions, a filmstrip, and the full-screen viewer.
  PremiumShot(
    'gallery',
    (w) => [
      ..._heading(
        w('Gallery', 'معرض الصور'),
        w(
          'Masonry, bento or filmstrip; a tap opens them full screen.',
          'أعمدة أو بنتو أو شريط؛ تفتحها لمسة على الشاشة كلها.',
        ),
      ),
      {
        'id': 'g1',
        'type': 'gallery',
        'gap': 8,
        'padding': _pad(0, 16, 12, 16),
        'gallery': {'layout': 'bento', 'radius': 18, 'captions': true},
        'caption_style': 'pill',
        'images': _galleryImages(w).take(4).toList(),
      },
      {
        'id': 'g2',
        'type': 'gallery',
        'gap': 10,
        'height': 170,
        'padding': _pad(4, 0, 8, 16),
        'gallery': {'layout': 'filmstrip', 'radius': 16},
        'images': _galleryImages(w, from: 3),
      },
    ],
    then: (tester) async {
      await tester.tap(find.byKey(const ValueKey('studio-gallery-g1-0')));
      await TestApp.settle(tester, 20);
    },
  ),
  // 129.6 Before and after, its divider a third of the way.
  PremiumShot(
    'before_after',
    (w) => [
      ..._heading(
        w('Before and after', 'قبل وبعد'),
        w(
          'Drag the divider to compare the two photos.',
          'اسحب الخط الفاصل لتقارن بين الصورتين.',
        ),
      ),
      {
        'id': 'ba',
        'type': 'before_after',
        'aspect_ratio': 0.8,
        'radius': 24,
        'margin': _pad(0, 16, 8, 16),
        'compare': {'at': 45},
        'images': [
          {
            'image_url': photo('demo-photos/vegetables.jpg'),
            'caption': w('Before', 'قبل'),
          },
          {
            'image_url': photo('demo-photos/vegetable-pizza.jpg'),
            'caption': w('After', 'بعد'),
          },
        ],
      },
    ],
  ),
  // 129.4 A video banner on its poster, its play button in the corner.
  PremiumShot(
    'video_hero',
    (w) => [
      _banner(
        'vh',
        'video_hero',
        'stories/rides/rides-night-city.jpg',
        title: w('See the city move', 'شاهد المدينة تتحرك'),
        line: w(
          'A minute that says it all, muted and looping.',
          'دقيقة تقول كل شيء، بلا صوت وتتكرر.',
        ),
        cta: w('Ride now', 'اطلب رحلة'),
        height: 520,
        radius: 0,
      ),
      ..._heading(
        w('Video banner', 'بانر فيديو'),
        w(
          'Poster first; it waits on phones that save data.',
          'الغلاف أولًا؛ وينتظر في الهواتف التي توفر البيانات.',
        ),
      ),
    ],
  ),
  // 129.7 A parallax banner, its words in a frosted panel, and one without.
  PremiumShot(
    'parallax_banner',
    (w) => [
      ..._heading(
        w('Parallax banner', 'بانر بعمق'),
        w(
          'The photo moves slower than the page.',
          'الصورة تتحرك أبطأ من الصفحة.',
        ),
      ),
      _banner(
        'pb1',
        'parallax_banner',
        'stories/academy/academy-desk.jpg',
        title: w('Crafted with care', 'صُنع بعناية'),
        line: w('Every detail, by hand.', 'كل تفصيلة باليد.'),
        cta: w('Discover', 'اكتشف'),
        glass: true,
        align: 'center',
        margin: _pad(0, 16, 12, 16),
      ),
      _banner(
        'pb2',
        'parallax_banner',
        'stories/school/school-dawn.jpg',
        title: w('Mornings at school', 'صباح المدرسة'),
        line: w('Where every day starts.', 'حيث يبدأ كل يوم.'),
        cta: w('Visit', 'زُرنا'),
        height: 220,
        margin: _pad(0, 16, 12, 16),
      ),
    ],
  ),
  // 129.3 Tickers: words on a dark band, photos, big words toward the end.
  PremiumShot(
    'marquee',
    (w) => [
      ..._heading(
        w('Ticker', 'شريط متحرك'),
        w(
          'Words, logos or photos running endlessly; held while pressed.',
          'كلمات أو شعارات أو صور تمر بلا توقف، وتقف عند الضغط عليها.',
        ),
      ),
      {
        'id': 'm1',
        'type': 'marquee',
        'text': w(
          'Free delivery\nNew arrivals every week\nMembers save 10%',
          'توصيل مجاني\nجديد كل أسبوع\nالأعضاء يوفرون ١٠٪',
        ),
        'icon': 'star',
        'icon_size': 16,
        'gap': 18,
        'background': '#0E0D24',
        'color': '#FFFFFF',
        'dark_background': '#F4EFE6',
        'dark_color': '#0E0D24',
        'font': {'size': 15, 'weight': 700},
        'padding': _pad(12, 0, 12, 0),
        'margin': _pad(8, 0, 8, 0),
      },
      _text(
        'm-photos',
        w('From the market', 'من السوق'),
        size: 18,
        weight: 800,
        margin: _pad(18, 20, 10, 20),
      ),
      {
        'id': 'm2',
        'type': 'marquee',
        'gap': 12,
        'marquee': {'size': 64, 'speed': 30},
        'images': [
          for (final name in [
            'mangoes',
            'oranges',
            'tomatoes',
            'croissants',
            'cheese',
            'lemons',
          ])
            {'image_url': photo('demo-photos/$name.jpg'), 'caption': name},
        ],
      },
      {
        'id': 'm3',
        'type': 'marquee',
        'text': w('Fresh  Local  Daily', 'طازج  محلي  يومي'),
        'icon': 'spa',
        'icon_size': 28,
        'gap': 22,
        'color': '#1F7A4D',
        'dark_color': '#8FD3AE',
        'font': {'size': 40, 'weight': 900},
        'margin': _pad(24, 0, 8, 0),
        'marquee': {'direction': 'end'},
      },
      // A band turned -2 degrees with dots, and routes in pills.
      {
        'id': 'm4',
        'type': 'marquee',
        'text': w(
          'KOSHARY EGP 55\nMIXED GRILL EGP 240\nTAWOOK EGP 150',
          'كشري ٥٥ جنيه\nمشويات مشكلة ٢٤٠ جنيه\nطاووق ١٥٠ جنيه',
        ),
        'gap': 22,
        'background': '#14110F',
        'color': '#F5B23C',
        'dark_background': '#F5B23C',
        'dark_color': '#14110F',
        'font': {'size': 17, 'weight': 900, 'letter_spacing': 1},
        'padding': _pad(14, 0, 14, 0),
        'margin': _pad(26, 0, 18, 0),
        'marquee': {'tilt': -2, 'dot': true},
      },
      {
        'id': 'm5',
        'type': 'marquee',
        'text': w(
          'CAI → DXB  Dubai · 10:15\nCAI → IST  Istanbul · 06:40',
          'CAI → DXB  دبي · 10:15\nCAI → IST  إسطنبول · 06:40',
        ),
        'gap': 12,
        'font': {'size': 15, 'weight': 700},
        'marquee': {'chips': true, 'speed': 30},
      },
    ],
  ),
  // 129.1 A bar of segments: a course's lessons over a photo.
  PremiumShot(
    'segments',
    (w) => [
      {
        ..._slide(
          'sg',
          'stories/academy/academy-evening.jpg',
          w('Continue · lesson 12 of 18', 'تابع · الدرس ١٢ من ١٨'),
          w('Arabic Calligraphy for Beginners', 'الخط العربي للمبتدئين'),
          null,
          height: 520,
        ),
        'align': 'between',
        'children': [
          {
            'id': 'sg-bar',
            'type': 'segments',
            'color': '#E7C982',
            'segments': {'count': 18, 'done': 11, 'part': 0.6},
          },
          {
            'id': 'sg-words',
            'type': 'column',
            'gap': 8,
            'children': [
              _text(
                'sg-k',
                w('Continue · lesson 12 of 18', 'تابع · الدرس ١٢ من ١٨'),
                size: 12,
                weight: 800,
                color: '#E7C982',
                uppercase: true,
                spacing: 2,
              ),
              _text(
                'sg-h',
                w('Arabic Calligraphy for Beginners', 'الخط العربي للمبتدئين'),
                size: 34,
                weight: 800,
                color: '#FFFFFF',
              ),
            ],
          },
        ],
      },
      ..._heading(
        w('Progress segments', 'شريط التقدّم'),
        w(
          'The lessons of the course a student is taking, or any steps.',
          'دروس الكورس الذي يأخذه الطالب، أو أي خطوات.',
        ),
      ),
    ],
  ),
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
        // 129.1 The lines at the top in gold, "01/02" under them.
        'indicator_look': {
          'at': 'top',
          'inset': 44,
          'color': '#F5C451',
          'count': 'padded',
        },
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

// 129.2 Stories over the page's top, two of them already seen.
const _stories = [
  ('stories/multi-vendor/zad-friday.jpg', 'New', 'جديد'),
  ('stories/multi-vendor/zad-grill.jpg', 'Grill', 'مشويات'),
  ('stories/multi-vendor/zad-kitchen-rush.jpg', 'Kitchen', 'المطبخ'),
  ('stories/academy/academy-breakfast.jpg', 'Mornings', 'الصباح'),
  ('stories/delivery/delivery-rider.jpg', 'On the way', 'في الطريق'),
];

final _storiesShot = PremiumShot(
  'stories',
  (w) => [
    ..._heading(
      w('Stories', 'القصص'),
      w(
        'Round photos in a ring; a tap opens them full screen.',
        'صور دائرية في حلقة؛ تفتحها لمسة على الشاشة كلها.',
      ),
    ),
    {
      'id': 'st',
      'type': 'stories',
      'interval_ms': 5000,
      'padding': _pad(4, 16, 10, 16),
      'slides': [
        for (final (path, en, ar) in _stories)
          {
            'image_url': photo(path),
            'heading': w(en, ar),
            'subheading': w(
              'Fresh from the kitchen, this week only.',
              'طازج من المطبخ، هذا الأسبوع فقط.',
            ),
            'action': {'type': 'url', 'url': 'https://example.com/new'},
          },
        // Initials on a colour with a lit ring, and a dashed tile for all.
        {
          'heading': w('Salma', 'سلمى'),
          'label': 'SN',
          'color': '#9C1C4A',
          'ring': 'highlight',
          'ring_color': '#E5484D',
        },
        {
          'heading': w('All 8', 'الكل ٨'),
          'icon': 'apps',
          'ring': 'dashed',
          'action': {'type': 'screen', 'screen': 'courses'},
        },
      ],
    },
    _slide(
      'st-hero',
      'stories/multi-vendor/zad-cafe.jpg',
      w('Today', 'اليوم'),
      w('Coffee and something sweet', 'قهوة وشيء حلو'),
      null,
      height: 300,
      radius: 24,
    )..['margin'] = _pad(14, 16, 0, 16),
  ],
  preferences: {
    'studio.stories_seen': [
      for (final (path, _, _) in _stories.skip(3)) 'st|${photo(path)}',
    ],
  },
  then: (tester) async {
    await tester.tap(find.byKey(const ValueKey('studio-story-st-0')));
    await TestApp.settle(tester, 10);
    await tester.pump(const Duration(milliseconds: 2000));
    await tester.pump();
  },
);

/// The photos [json] names, put in the image cache at their addresses.
Future<void> _seedPhotos(WidgetTester tester, Object? json) async {
  final paths = <String>{};
  void walk(Object? v) {
    if (v is String && v.startsWith('$_host/') && !v.endsWith('.mp4')) {
      paths.add(v);
    }
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
            ...shot.preferences,
          },
          wrap: (app) => withStatusBar(app, lightIcons: lightIcons),
        );
        await app.pump(tester);
        await TestApp.settle(tester, 30);
        await tester.pump(const Duration(milliseconds: 1500));
        Future<void> capture(String name) async {
          lightIcons.value = appWantsLightStatusBar(tester);
          await tester.pump();
          expect(tester.takeException(), isNull, reason: name);
          final boundary = tester.renderObject<RenderRepaintBoundary>(
            find.byKey(shotKey),
          );
          final png = await tester.runAsync(() async {
            final image = await boundary.toImage(pixelRatio: _ratio);
            final data = await image.toByteData(format: ui.ImageByteFormat.png);
            image.dispose();
            return Uint8List.view(data!.buffer);
          });
          final file = Uri.parse('$_out/$name-$variant.png');
          await tester.runAsync(() async {
            if (autoUpdateGoldenFiles) {
              await goldenFileComparator.update(file, png!);
            } else {
              expect(await goldenFileComparator.compare(png!, file), isTrue);
            }
          });
        }

        await capture(shot.name);
        if (shot.then case final then?) {
          await then(tester);
          await capture('${shot.name}-open');
        }
        await tester.pumpWidget(const SizedBox());
        app.container.dispose();
        await TestApp.settle(tester, 2);
      });
    }
  }
}
