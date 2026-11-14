/// 130.63 The gallery of Studio's new premium options for the owner's
/// review, as the app draws them: Monochrome luxe's home for every kind
/// (`new-mono-<kind>-<light|dark>.png`) and the six new landings, each for
/// a kind of its own (`new-<landing>-<light|dark>[-ar].png`), written to
/// platform/web/public/screens/premium/ (rendered on demand, not kept in
/// the repository). They come from test/support/new_premium.json, written
/// by platform/web/tests/unit/phase130-new-premium.test.ts (with
/// YALLAPP_WRITE_NEW_PREMIUM=1). Skipped unless run with
/// `--dart-define=YALLAPP_SCREENSHOTS=true --update-goldens`; Arabic, right
/// to left, with `--dart-define=YALLAPP_DESIGN_LANG=ar`; only the landings
/// or only the design with `--dart-define=YALLAPP_NEW_ONLY=landings|mono`:
///
///   flutter test test/screenshots/new_premium_screenshots_test.dart \
///     --dart-define=YALLAPP_SCREENSHOTS=true --update-goldens
@Tags(['screenshots'])
library;

import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import 'support/screens.dart';

const _enabled = bool.fromEnvironment('YALLAPP_SCREENSHOTS');
const _only = String.fromEnvironment('YALLAPP_NEW_ONLY');
const _out = '../../../platform/web/public/screens/premium';

/// Arabic, right to left (`--dart-define=YALLAPP_DESIGN_LANG=ar`), `-ar`
/// at the end of each name, where `--dart-define=YALLAPP_DESIGN_OUT=<folder>`
/// says, for checking.
const _lang = String.fromEnvironment('YALLAPP_DESIGN_LANG', defaultValue: 'en');
const _outOther = String.fromEnvironment('YALLAPP_DESIGN_OUT');
const _ratio = 1.25;
// The whole home, to its last element.
const _size = Size(360, 2900);

final Map<String, dynamic> _gallery = jsonDecode(
  File('test/support/new_premium.json').readAsStringSync(),
) as Map<String, dynamic>;

/// The page as the hosted API serves it: no translations, each list filled
/// with the gallery's entries.
/// [json] in the language shown: each text's translation in its place.
Object? _translated(Object? json) => switch (json) {
  final Map<String, dynamic> map => <String, dynamic>{
    for (final MapEntry(:key, :value) in map.entries)
      if (key != 'translations') key: _translated(value),
    if (map['translations'] case {_lang: final Map<String, dynamic> own})
      ...own,
  },
  final List<dynamic> list => [for (final v in list) _translated(v)],
  _ => json,
};

Map<String, dynamic> _served(Map<String, dynamic> node) {
  final out = {...node}
    ..remove('translations')
    ..remove('query');
  if (node['type'] == 'items') {
    final q = node['query'] as Map<String, dynamic>;
    final items = (_gallery['items'] as Map<String, dynamic>)[node['source']];
    // A list of what this person opened lately starts empty on a phone.
    out['items'] = node['recent'] == true
        ? <dynamic>[]
        : ((items as List?) ?? const []).take(q['limit'] as int).toList();
  }
  if (node['children'] case final List children) {
    out['children'] = [
      for (final c in children) _served(c as Map<String, dynamic>),
    ];
  }
  if (node['card'] case final Map<String, dynamic> card) {
    out['card'] = _served(card);
  }
  return out;
}

AppType _appType(String engine) => switch (engine) {
  'real_estate' => AppType.realEstate,
  _ => AppType.values.byName(engine),
};

FakeApi _api(Map<String, dynamic> design) {
  final home = design['home'] as Map<String, dynamic>;
  final api = FakeApi(
    config: {
      ...configJson(
        languages: languagesJson(),
        store: true,
        orders: true,
        bookings: true,
        appearance: {
          'template': 'bold',
          'theme_mode': 'system',
          'user_can_change_mode': true,
          'secondary_color': design['secondary'],
          // Monochrome luxe's Bricolage Grotesque, the landings' Manrope: both in the app.
          'font': design['font'],
          'corners': 'round',
          'cards': 'elevated',
        },
      ),
      'branding': {'logo_url': null, 'primary_color': design['accent']},
      'screens': {'system': ?design['system']},
    },
  );
  api.config = {
    ...api.config,
    'site': {...(api.config['site'] as Map<String, dynamic>), 'name': 'Nour'},
  };
  api.navigation = {
    'version': '1',
    'tabs': design['tabs'],
    'more': <dynamic>[],
    'tab_bar': design['tab_bar'],
    'menu': <dynamic>[],
    'pages': [
      {'slug': 'home', 'title': 'Home', 'updated_at': '2026-11-14T10:00:00Z'},
    ],
  };
  api.pages = {
    'home': {
      ...appPageJson(title: 'Home', showTitle: false, blocks: []),
      'studio': {
        ...home,
        if (home['header'] case final Map<String, dynamic> header)
          'header': _translated(header),
        'body': _served(_translated(home['body']) as Map<String, dynamic>),
      },
    },
  };
  return api;
}

final _photos = <String, ui.Image>{};
final _photoPath = RegExp(
  r'^https?://[^/]+(/(?:demo-photos|demo-screens|stories|travel-photos)/[^"]+\.jpg)$',
);

Iterable<String> _urls(Object? json) sync* {
  switch (json) {
    case final String url when _photoPath.hasMatch(url):
      yield url;
    case final Map<String, dynamic> map:
      for (final v in map.values) {
        yield* _urls(v);
      }
    case final List<dynamic> list:
      for (final v in list) {
        yield* _urls(v);
      }
  }
}

/// The platform's own photos the gallery shows, read once, at the
/// addresses the pages name.
Future<void> _seed(WidgetTester tester) async {
  final urls = {..._urls(_gallery)};
  await tester.runAsync(() async {
    for (final url in urls) {
      final path = _photoPath.firstMatch(url)!.group(1)!;
      if (_photos.containsKey(path)) continue;
      final codec = await ui.instantiateImageCodec(
        File('../platform/web/public$path').readAsBytesSync(),
        targetWidth: 900,
      );
      _photos[path] = (await codec.getNextFrame()).image;
    }
  });
  final cache = PaintingBinding.instance.imageCache
    ..maximumSizeBytes = 1 << 30
    ..maximumSize = 4000;
  for (final url in urls) {
    final path = _photoPath.firstMatch(url)!.group(1)!;
    cache.putIfAbsent(
      NetworkImage(url),
      () => OneFrameImageStreamCompleter(
        SynchronousFuture(ImageInfo(image: _photos[path]!.clone())),
      ),
    );
  }
}

void main() {
  setUpAll(() async {
    if (_enabled) await loadAppFonts();
  });

  final shots = <(String, Map<String, dynamic>)>[
    if (_only != 'landings')
      for (final d in (_gallery['mono'] as List).cast<Map<String, dynamic>>())
        ('new-mono-${d['kind']}', d),
    if (_only != 'mono')
      for (final d
          in (_gallery['landings'] as List).cast<Map<String, dynamic>>())
        ('new-${(d['id'] as String).replaceAll('_', '-')}', d),
  ];
  for (final (base, design) in shots) {
    for (final mode in ['light', 'dark']) {
      final name = '$base-$mode${_lang == 'en' ? '' : '-$_lang'}';
      testWidgets(name, skip: !_enabled, (tester) async {
        debugDisableShadows = false;
        final shot = Shot(
          name,
          api: () => _api(design),
          appType: _appType(design['engine'] as String),
          template: AppTemplate.bold,
          dark: mode == 'dark',
          language: _lang,
          appName: 'Nour',
          signedIn: false,
          size: _size,
          shadows: true,
          prepare: _seed,
        );
        await shot.render(tester);
        await tester.pump(const Duration(seconds: 2));
        final boundary = tester.renderObject<RenderRepaintBoundary>(
          find.byKey(shotKey),
        );
        final png = await tester.runAsync(() async {
          final image = await boundary.toImage(pixelRatio: _ratio);
          final data = await image.toByteData(format: ui.ImageByteFormat.png);
          image.dispose();
          return Uint8List.view(data!.buffer);
        });
        final file = Uri.parse(
          '${_outOther.isEmpty ? _out : _outOther}/$name.png',
        );
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
