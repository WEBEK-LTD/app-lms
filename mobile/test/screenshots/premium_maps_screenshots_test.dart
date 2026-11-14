/// 129.21–129.24 The gallery of the drawn map's premium looks, written to
/// platform/web/public/screens/premium/map-[look]-[light|dark|ar].png for
/// the owner's review and the docs: a living map, a horizon, two inks, a
/// radar lens and a live route, each a Studio home drawn by the real app
/// (light, dark, and Arabic right to left). Skipped unless run with
/// `--dart-define=YALLAPP_SCREENSHOTS=true` (tool/screenshots.sh does for
/// the website's; run this file the same way).
@Tags(['screenshots'])
library;

import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import 'support/screens.dart';

const _enabled = bool.fromEnvironment('YALLAPP_SCREENSHOTS');
const _out = '../../../platform/web/public/screens/premium';

/// The words on the gallery's homes, in English and in Arabic.
String _w(bool ar, String en, String arabic) => ar ? arabic : en;

Map<String, dynamic> _text(
  String id,
  String text, {
  double size = 16,
  int weight = 700,
  String? color,
  String? dark,
}) => {
  'id': id,
  'type': 'text',
  'text': text,
  'font': {'size': size, 'weight': weight},
  'color': ?color,
  'dark_color': ?dark,
};

/// A card under (or hanging over) the map: a title and a line.
Map<String, dynamic> _sheet(
  String id,
  String title,
  String line, {
  String bg = '#FFFFFF',
  String darkBg = '#101826',
  String ink = '#141B2E',
  String darkInk = '#F1F2F7',
}) => {
  'id': id,
  'type': 'column',
  'gap': 4,
  'radius': 26,
  'background': bg,
  'dark_background': darkBg,
  'color': ink,
  'dark_color': darkInk,
  'padding': {'top': 18, 'end': 20, 'bottom': 18, 'start': 20},
  'margin': {'top': 0, 'end': 12, 'bottom': 0, 'start': 12},
  'children': [
    _text('$id-t', title, size: 20, weight: 800),
    _text('$id-l', line, size: 14, weight: 500),
  ],
};

Map<String, dynamic> _page(
  List<Map<String, dynamic>> children, {
  String bg = '#F6F4EF',
  String dark = '#0E1324',
}) => {
  'background': bg,
  'dark_background': dark,
  'show_tabs': false,
  'body': {'id': 'root', 'type': 'column', 'children': children},
};

Map<String, dynamic> _map(
  int height,
  Map<String, dynamic> drawing, {
  List<Map<String, dynamic>> children = const [],
  int overlap = 0,
  String? background,
  String? darkBackground,
  String align = 'start',
  Map<String, dynamic> padding = const {
    'top': 44,
    'end': 18,
    'bottom': 16,
    'start': 18,
  },
}) => {
  'id': 'map',
  'type': 'map_header',
  'height': height,
  'background': ?background,
  'dark_background': ?darkBackground,
  'align': align,
  'overlap': overlap,
  'padding': padding,
  'map_drawing': drawing,
  'children': children,
};

/// Each look's home, in English or Arabic.
final Map<String, Map<String, dynamic> Function(bool ar)> _looks = {
  // 129.21 Masar A: a living map, saved places, a pickup and the car on its
  // way to it.
  'natural': (ar) => _page(
    [
      _map(
        700,
        {
          'style': 'natural',
          'accent': '#F2B544',
          'chip': '#21403C',
          'markers': [
            {'x': 14, 'y': 30},
            {'x': 88, 'y': 40},
            {'x': 30, 'y': 72},
            {'x': 76, 'y': 78},
            {'x': 56, 'y': 64},
          ],
          'me': true,
          'me_at': {'x': 41, 'y': 52},
          'places': [
            {
              'x': 22,
              'y': 24,
              'label': _w(ar, 'Home', 'البيت'),
              'icon': 'home',
            },
            {
              'x': 70,
              'y': 60,
              'label': _w(ar, 'Office', 'العمل'),
              'icon': 'work',
            },
          ],
          'labels': [
            {'x': 26, 'y': 86, 'text': _w(ar, 'Zamalek', 'الزمالك')},
            {'x': 76, 'y': 46, 'text': _w(ar, 'Downtown', 'وسط البلد')},
            {'x': 70, 'y': 92, 'text': _w(ar, 'Tahrir', 'التحرير')},
          ],
          'route': {
            'points': [
              {'x': 80, 'y': 36},
              {'x': 45, 'y': 39},
              {'x': 41, 'y': 52},
            ],
            'to_label': _w(ar, 'Pickup', 'الركوب'),
            'eta': _w(ar, '3 min', '3 د'),
            'color': '#0F766C',
            'dark_color': '#3FC7B4',
            'moving': true,
          },
        },
        overlap: 130,
        children: [
          _text(
            'hello',
            _w(ar, 'Good evening, Omar', 'مساء الخير يا عمر'),
            size: 20,
            weight: 800,
            color: '#0B2422',
            dark: '#E9F5F3',
          ),
          _sheet(
            'where',
            _w(ar, 'Where to?', 'إلى أين؟'),
            _w(
              ar,
              'Economy from E£35 · 4 seats',
              'اقتصادي من 35 ج.م · 4 مقاعد',
            ),
            bg: '#F4F7F5',
            darkBg: '#0F1F1D',
            ink: '#0B2422',
            darkInk: '#E9F5F3',
          ),
        ],
      ),
    ],
    bg: '#EDF0EA',
    dark: '#0C1716',
  ),
  // 129.22 Masar B: tilted to a foggy horizon, a headline over the fog.
  'horizon': (ar) => _page(
    [
      _map(
        520,
        {
          'style': 'horizon',
          'accent': '#F2B544',
          'chip': '#21403C',
          'markers': [
            {'x': 18, 'y': 64},
            {'x': 90, 'y': 74},
            {'x': 64, 'y': 92},
          ],
          'me': true,
          'me_at': {'x': 46, 'y': 82},
          'labels': [
            {'x': 54, 'y': 94, 'text': _w(ar, 'Garden City', 'جاردن سيتي')},
          ],
          'route': {
            'points': [
              {'x': 84, 'y': 62},
              {'x': 84, 'y': 72},
              {'x': 46, 'y': 72},
              {'x': 46, 'y': 82},
            ],
            'to_label': _w(ar, 'Pickup', 'الركوب'),
            'eta': _w(ar, 'Hossam', 'حسام'),
            'icon': 'local_taxi',
            'color': '#0F766C',
            'dark_color': '#3FC7B4',
          },
        },
        children: [
          _text(
            'headline',
            _w(ar, 'Where to,\nOmar?', 'إلى أين\nيا عمر؟'),
            size: 52,
            weight: 800,
            color: '#0B2422',
            dark: '#E9F5F3',
          ),
        ],
      ),
      _sheet(
        'eta',
        _w(ar, '3 min · Hossam is on the way', '3 د · حسام في الطريق'),
        _w(ar, 'MS 3391 · Black sedan · 4.9', 'MS 3391 · سيدان سوداء · 4.9'),
        bg: '#FFFFFF',
        darkBg: '#0C1C1B',
        ink: '#0B2422',
        darkInk: '#E9F5F3',
      ),
    ],
    bg: '#F1EFE9',
    dark: '#061110',
  ),
  // 129.23 Lamha A: two inks, roof-sign taxis, a checker band at its foot.
  'two-ink': (ar) => _page(
    [
      _map(460, {
        'style': 'two_ink',
        'accent': '#F5B700',
        'chip': '#1C2541',
        'markers': [
          {'x': 26, 'y': 26},
          {'x': 54, 'y': 20},
          {'x': 82, 'y': 30},
          {'x': 44, 'y': 42},
          {'x': 88, 'y': 58},
          {'x': 34, 'y': 86},
          {'x': 70, 'y': 88},
        ],
        'me': true,
        'me_at': {'x': 54, 'y': 64},
        'labels': [
          {'x': 34, 'y': 49, 'text': _w(ar, 'Maadi', 'المعادي')},
          {'x': 6, 'y': 72, 'text': _w(ar, 'Nile', 'النيل')},
        ],
        'route': {
          'points': [
            {'x': 74, 'y': 60},
            {'x': 54, 'y': 64},
          ],
          'eta': _w(ar, '1 min', '1 د'),
        },
      }),
      _sheet(
        'nearest',
        _w(ar, '1 min · Nearest free taxi', '1 د · أقرب تاكسي فاضي'),
        _w(ar, '8 taxis around you, live', '8 سيارات حولك، مباشر'),
        bg: '#FFFDF6',
        darkBg: '#1A2138',
      ),
    ],
    bg: '#FFFDF6',
    dark: '#0E1324',
  ),
  // 129.23 Lamha B: a radar lens, minute rings, a sweep, trails.
  'lens': (ar) => _page(
    [
      _map(
        600,
        {
          'style': 'lens',
          'accent': '#F5B700',
          'chip': '#1C2541',
          'markers': [
            {'x': 62, 'y': 40},
            {'x': 19, 'y': 39},
            {'x': 56, 'y': 82},
            {'x': 78, 'y': 19},
            {'x': 8, 'y': 65},
            {'x': 92, 'y': 64},
            {'x': 34, 'y': 8},
            {'x': 35, 'y': 92},
          ],
          'me': true,
          'labels': [
            {'x': 9, 'y': 30, 'text': _w(ar, 'Mohandessin', 'المهندسين')},
            {'x': 70, 'y': 50, 'text': _w(ar, 'Agouza', 'العجوزة')},
          ],
        },
        children: [
          _text(
            'headline',
            _w(ar, '8 free taxis\naround you.', '8 تاكسيات فاضية\nحولك.'),
            size: 40,
            weight: 800,
            color: '#141B2E',
            dark: '#F1F2F7',
          ),
        ],
      ),
      _sheet(
        'where',
        _w(ar, 'Where to?', 'إلى أين؟'),
        _w(ar, 'Taxi from E£35', 'تاكسي من 35 ج.م'),
        bg: '#1C2541',
        darkBg: '#1C2541',
        ink: '#FFFFFF',
        darkInk: '#FFFFFF',
      ),
    ],
    bg: '#F6F5F1',
    dark: '#0A0F1E',
  ),
  // 129.24 Sahm B: the shipment's route, done solid, the courier on it.
  'route': (ar) => _page(
    [
      _map(
        500,
        {
          'accent': '#F2A12E',
          'chip': '#0D1B2A',
          'labels': [
            {'x': 56, 'y': 26, 'text': _w(ar, 'Nasr City', 'مدينة نصر')},
            {'x': 30, 'y': 72, 'text': _w(ar, 'Maadi', 'المعادي')},
          ],
          'route': {
            'points': [
              {'x': 80, 'y': 36},
              {'x': 80, 'y': 84},
              {'x': 30, 'y': 84},
            ],
            'at': 42,
            'from_label': _w(ar, 'Abbas El Akkad St.', 'شارع عباس العقاد'),
            'eta': _w(ar, 'Karim · 6 min', 'كريم · 6 د'),
            'icon': 'two_wheeler',
            'color': '#1F6FB2',
            'dark_color': '#6DB3F2',
          },
        },
        background: '#E8EDF2',
        darkBackground: '#0C1623',
        overlap: 28,
        children: [
          _sheet(
            'parcel',
            _w(ar, 'Karim is 6 min from Maadi', 'كريم على بعد 6 د من المعادي'),
            _w(ar, 'S-1001 · On the way', 'S-1001 · في الطريق'),
            bg: '#F7F9FC',
            darkBg: '#08111C',
            ink: '#0D1B2A',
            darkInk: '#EAF1F8',
          ),
        ],
      ),
    ],
    bg: '#F7F9FC',
    dark: '#08111C',
  ),
};

FakeApi _api(Map<String, dynamic> studio) =>
    FakeApi(config: configJson(languages: languagesJson()))
      ..navigation = navigationJson(
        tabs: [
          navTabJson('home', 'Home', 'home', {
            'type': 'page',
            'page_slug': 'home',
          }),
          navTabJson('account', 'Account', 'person', {
            'type': 'screen',
            'screen': 'account',
          }),
        ],
      )
      ..pages = {
        'home': {...appPageJson(blocks: []), 'studio': studio},
      };

void main() {
  setUpAll(() async {
    if (_enabled) await loadAppFonts();
  });

  for (final MapEntry(key: look, value: page) in _looks.entries) {
    for (final variant in const ['light', 'dark', 'ar']) {
      final ar = variant == 'ar';
      final shot = Shot(
        'map-$look-$variant',
        api: () => _api(page(ar)),
        appType: AppType.rides,
        dark: variant == 'dark',
        language: ar ? 'ar' : 'en',
      );
      testWidgets(shot.name, skip: !_enabled, (tester) async {
        // Real shadows under the glass pins and chips.
        debugDisableShadows = false;
        await shot.render(tester);
        final boundary = tester.renderObject<RenderRepaintBoundary>(
          find.byKey(shotKey),
        );
        final png = await tester.runAsync(() async {
          final image = await boundary.toImage(pixelRatio: 2);
          final data = await image.toByteData(format: ui.ImageByteFormat.png);
          image.dispose();
          return Uint8List.view(data!.buffer);
        });
        final file = Uri.parse('$_out/${shot.name}.png');
        await tester.runAsync(() async {
          if (autoUpdateGoldenFiles) {
            await goldenFileComparator.update(file, png!);
          } else {
            expect(await goldenFileComparator.compare(png!, file), isTrue);
          }
        });
        debugDisableShadows = true;
      });
    }
  }
}
