/// 131.20–131.27 Leqaa's pictures, drawn by the real app from the
/// platform's projects (test/support/leqaa_demo.json, signatures/flowers_*,
/// petal_chrome.json, written by platform/web/tests/unit/
/// signature-looks.test.ts and leqaa-flowers.test.ts):
///
/// - with `--dart-define=YALLAPP_SCREENSHOTS=true`, the pictures the website
///   keeps in platform/web/public/screens: each look's home by day and by
///   night (`flowers-sig-<look>-home(-dark).png`, /start's LOOK_SHOTS) and
///   the guide's screens (`leqaa-home`, `leqaa-product`, `leqaa-checkout`);
/// - with `--dart-define=YALLAPP_GALLERY=<folder>`, the owner's gallery (not
///   kept in the repository): both looks' home, the bouquet, the cart, the
///   account and the gift checkout (its when, message and summary steps
///   too), by day, by night and in Arabic, and the petal chrome on an
///   academy and a clinic.
@Tags(['screenshots'])
library;

import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:yallapp/core/theme/fonts/font_cache.dart';
import 'package:yallapp/core/theme/fonts/remote_fonts.dart';
import 'package:yallapp/modules/store/widgets/gift_checkout_look.dart';

import '../support/gift_checkout_sample.dart';
import 'support/demo_api.dart';
import 'support/leqaa.dart';
import 'support/screens.dart';
import 'support/studio_demo.dart';

const _screens = bool.fromEnvironment('YALLAPP_SCREENSHOTS');
const _gallery = String.fromEnvironment('YALLAPP_GALLERY');
const _out = '../platform/web/public/screens';

/// The look's own font (Fraunces, look A's `font_family`) from the
/// platform's copy kept with the tests.
final leqaaFontOverrides = <Override>[
  remoteFontDepsProvider.overrideWithValue(
    RemoteFontDeps(
      fetch: (url) async => url.path.toLowerCase().contains('fraunces')
          ? File('test/screenshots/support/fonts/Fraunces.ttf')
                .readAsBytesSync()
          : null,
      cache: _Cache(),
      register: flutterFontRegistrar,
    ),
  ),
];

class _Cache implements FontCache {
  final _files = <String, Uint8List>{};
  @override
  Future<Uint8List?> read(String key) async => _files[key];
  @override
  Future<void> write(String key, Uint8List bytes) async => _files[key] = bytes;
}

/// A shot of Leqaa's app on [demo] (a look's project or the demo).
Shot _leqaa(
  String name,
  StudioDemo demo, {
  bool dark = false,
  String language = 'en',
  String? location,
  String primary = '#8E2445',
  Map<String, Object> preferences = const {},
}) => Shot(
  name,
  api: () => leqaaStudioApi(look: demo, primaryColor: primary),
  appName: 'Leqaa',
  appType: AppType.store,
  dark: dark,
  language: language,
  location: location,
  preferences: preferences,
  overrides: leqaaFontOverrides,
  designPictures: true,
  prepare: (tester) => demo.prepare(tester, leqaaPhotoPaths),
  shadows: true,
);

/// /start's pictures of the two looks and the guide's.
List<Shot> get _website => [
  for (final look in ['a', 'b'])
    for (final dark in [false, true])
      _leqaa(
        'flowers-sig-$look-home${dark ? '-dark' : ''}',
        StudioDemo.signature('flowers', look),
        dark: dark,
        primary: look == 'a' ? '#8E2445' : '#2F5D50',
      ),
  _leqaa('leqaa-home', leqaaDemo),
  _leqaa('leqaa-product', leqaaDemo, location: '/product/101'),
];

/// The owner's gallery: each look's pages by day, by night and in Arabic.
List<Shot> get _galleryShots => [
  for (final look in ['a', 'b'])
    for (final (mode, dark, language) in [
      ('light', false, 'en'),
      ('dark', true, 'en'),
      ('ar', false, 'ar'),
    ])
      for (final (page, location) in [
        ('home', null),
        ('bouquet', '/page/bouquet'),
        ('product', '/product/101'),
        ('shop', '/page/shop'),
        ('cart', '/page/cart'),
        ('orders', '/page/orders'),
        ('wishlist', '/page/wishlist'),
        ('account', '/account'),
      ])
        _leqaa(
          'leqaa-$look-$page-$mode',
          StudioDemo.signature('flowers', look),
          dark: dark,
          language: language,
          location: location,
          primary: look == 'a' ? '#8E2445' : '#2F5D50',
          preferences: page == 'cart'
              ? leqaaCartPreferences(StudioDemo.signature('flowers', look))
              : const {},
        ),
];

/// 131.21–131.27 The petal chrome on another kind (test/support/
/// petal_chrome.json): its home the petal landing, a page in the petal
/// header, its account in the petal look and the petal bar.
Shot _petalKind(
  int index,
  String page, {
  bool dark = false,
  String language = 'en',
}) {
  final file = jsonDecode(
    File('test/support/petal_chrome.json').readAsStringSync(),
  ) as Map<String, dynamic>;
  final items =
      (jsonDecode(File('test/support/new_premium.json').readAsStringSync())
              as Map<String, dynamic>)['items']
          as Map<String, dynamic>;
  final kind = (file['kinds'] as List)[index] as Map<String, dynamic>;
  final academy = kind['engine'] == 'lms';
  final source = academy ? 'courses' : 'services';
  final name = academy ? "Selin's Academy" : 'Nile Clinic';
  Map<String, dynamic> served(Map<String, dynamic> node) {
    final out = StudioDemo.localized(node)..remove('query');
    if (node['type'] == 'items') {
      final limit = (node['query'] as Map<String, dynamic>)['limit'] as int;
      out['items'] = ((items[node['source']] as List?) ?? const [])
          .take(limit)
          .toList();
    }
    if (node['children'] case final List children) {
      out['children'] = [
        for (final c in children) served(c as Map<String, dynamic>),
      ];
    }
    if (node['card'] case final Map<String, dynamic> card) {
      out['card'] = served(card);
    }
    return out;
  }

  final home = kind['home'] as Map<String, dynamic>;
  return Shot(
    'petal-${kind['kind']}-$page-${language == 'ar'
        ? 'ar'
        : dark
        ? 'dark'
        : 'light'}',
    api: () {
      final api = academy ? DemoApi.academy() : DemoApi.clinic();
      api.config = {
        ...api.config,
        'site': {...(api.config['site'] as Map<String, dynamic>), 'name': name},
        'branding': {'logo_url': null, 'primary_color': kind['brand']},
        'appearance': {
          'template': 'classic',
          'font': 'Manrope',
          'secondary_color': kind['accent'],
          'corners': 'round',
          'cards': 'outlined',
        },
        'screens': {'system': kind['system']},
      };
      api.navigation = {
        'version': '1',
        'tabs': [
          {
            'id': 'home',
            'label': 'Home',
            'icon': 'home',
            'target': {'type': 'page', 'page_slug': 'home'},
          },
          {
            'id': 'main',
            'label': academy ? 'Courses' : 'Services',
            'icon': academy ? 'menu_book' : 'event_available',
            'target': {'type': 'screen', 'screen': source},
          },
          {
            'id': 'about',
            'label': 'About',
            'icon': 'local_florist',
            'target': {'type': 'page', 'page_slug': 'about'},
          },
        ],
        'more': <dynamic>[],
        'tab_bar': kind['tab_bar'],
        'menu': <dynamic>[],
        'pages': [
          {
            'slug': 'home',
            'title': 'Home',
            'updated_at': '2026-11-14T12:00:00Z',
          },
          {
            'slug': 'about',
            'title': 'About',
            'updated_at': '2026-11-14T12:00:00Z',
          },
        ],
      };
      api.pages = {
        'home': {
          'slug': 'home',
          'title': 'Home',
          'updated_at': '2026-11-14T12:00:00Z',
          'show_title': false,
          'blocks': <dynamic>[],
          'studio': {
            ...home,
            if (home['header'] case final Map<String, dynamic> h)
              'header': StudioDemo.localized(h),
            'body': served(home['body'] as Map<String, dynamic>),
          },
        },
        'about': {
          'slug': 'about',
          'title': 'About',
          'updated_at': '2026-11-14T12:00:00Z',
          'show_title': false,
          'blocks': <dynamic>[],
          'studio': {
            'header': {
              'type': 'title',
              'style': 'petal',
              'title': language == 'ar' ? 'عنّا' : 'About us',
              'subtitle': language == 'ar'
                  ? 'قصتنا في سطرين'
                  : 'Our story in two lines',
              'buttons': ['search', 'notifications'],
            },
            'body': served(home['body'] as Map<String, dynamic>),
          },
        },
      };
      return api;
    },
    appName: name,
    appType: academy ? AppType.lms : AppType.booking,
    dark: dark,
    language: language,
    location: page == 'home'
        ? null
        : page == 'page'
        ? '/page/about'
        : '/account',
    designPictures: true,
    // Every photo the landing names, at the address it names it by.
    prepare: (tester) => StudioDemo.signature('flowers', 'a').prepare(tester, {
      for (final m in RegExp(
        r'https?://[^/"]+(/[^"]+\.(?:jpg|png))',
      ).allMatches(jsonEncode(home)))
        m.group(1)!,
    }),
    shadows: true,
  );
}

Future<Uint8List> _png(WidgetTester tester) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(shotKey),
  );
  return (await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: shotPixelRatio);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    return Uint8List.view(data!.buffer);
  }))!;
}

Future<void> _write(WidgetTester tester, String folder, String name) async {
  final png = await _png(tester);
  await tester.runAsync(() async {
    await Directory(folder).create(recursive: true);
    await File('$folder/$name.png').writeAsBytes(png);
  });
}

/// 131.25 The gift checkout's look in the app's theme, as its screen, from
/// its step [at] (its top when null) under the steps.
Future<void> _checkout(
  WidgetTester tester, {
  required bool dark,
  required String language,
  required Color brand,
  required Color accent,
  required String font,
  required String photo,
  String? at,
}) async {
  usePhone(tester);
  final light = ValueNotifier(dark);
  addTearDown(light.dispose);
  await tester.pumpWidget(
    withStatusBar(
      MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(
          primary: brand,
          secondary: accent,
          brightness: dark ? Brightness.dark : Brightness.light,
          template: AppTemplate.classic,
          fontFamily: font,
        ),
        locale: Locale(language),
        supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        home: Scaffold(
          body: GiftCheckoutLook(
            data: giftSample(language: language, photoUrl: photo),
            accent: brand,
            top: statusBarHeight,
          ),
        ),
      ),
      lightIcons: light,
    ),
  );
  await tester.pumpAndSettle();
  if (at != null) {
    final list = find
        .descendant(
          of: find.byType(ListView),
          matching: find.byType(Scrollable),
        )
        .first;
    final step = find.byKey(ValueKey(at));
    await tester.scrollUntilVisible(step, 300, scrollable: list);
    final position = tester.state<ScrollableState>(list).position;
    final box = tester.renderObject(step);
    final reveal = RenderAbstractViewport.of(box).getOffsetToReveal(box, 0);
    position.jumpTo((reveal.offset - 12).clamp(0.0, position.maxScrollExtent));
    await tester.pumpAndSettle();
  }
}

void main() {
  setUpAll(() async {
    if (_screens || _gallery.isNotEmpty) await loadAppFonts();
  });

  final photosReady = leqaaPhotosReady;

  for (final shot in _website) {
    testWidgets(shot.name, skip: !_screens || !photosReady, (tester) async {
      debugDisableShadows = false;
      await shot.render(tester);
      await _write(tester, _out, shot.name);
      debugDisableShadows = true;
    });
  }

  testWidgets('leqaa-checkout', skip: !_screens || !photosReady, (
    tester,
  ) async {
    final demo = leqaaDemo;
    await demo.prepare(tester, leqaaPhotoPaths);
    await _checkout(
      tester,
      dark: false,
      language: 'en',
      brand: const Color(0xFF8E2445),
      accent: const Color(0xFFC89B6D),
      font: 'DM Sans',
      photo: '${demo.base}/flower-photos/blush-bouquet.jpg',
    );
    await _write(tester, _out, 'leqaa-checkout');
  });

  final gallery = _gallery;
  for (final shot in _galleryShots) {
    testWidgets('gallery ${shot.name}', skip: gallery.isEmpty || !photosReady, (
      tester,
    ) async {
      debugDisableShadows = false;
      await shot.render(tester);
      await _write(tester, gallery, shot.name);
      debugDisableShadows = true;
    });
  }

  // The petal chrome on an academy and a clinic.
  final petalShots = [
    for (final index in [0, 1])
      for (final page in ['home', 'page', 'account'])
        for (final (dark, language) in [
          (false, 'en'),
          (true, 'en'),
          (false, 'ar'),
        ])
          (index, page, dark, language),
  ];
  for (final (index, page, dark, language) in petalShots) {
    testWidgets(
      'gallery petal $index $page $dark $language',
      skip: gallery.isEmpty || !photosReady,
      (tester) async {
        final shot = _petalKind(index, page, dark: dark, language: language);
        debugDisableShadows = false;
        await shot.render(tester);
        await _write(tester, gallery, shot.name);
        debugDisableShadows = true;
      },
    );
  }

  // The gift checkout in each look: the order, the message step, the summary.
  final checkouts = [
    for (final look in ['a', 'b'])
      for (final (mode, dark, language) in [
        ('light', false, 'en'),
        ('dark', true, 'en'),
        ('ar', false, 'ar'),
      ])
        for (final (step, at) in [
          ('checkout', null),
          ('when', 'gift-when'),
          ('message', 'gift-message'),
          ('summary', 'gift-summary'),
        ])
          (look, mode, dark, language, step, at),
  ];
  for (final (look, mode, dark, language, step, at) in checkouts) {
    testWidgets(
      'gallery leqaa-$look-$step-$mode',
      skip: gallery.isEmpty || !photosReady,
      (tester) async {
        final demo = StudioDemo.signature('flowers', look);
        await demo.prepare(tester, leqaaPhotoPaths);
        final a = look == 'a';
        await _checkout(
          tester,
          dark: dark,
          language: language,
          brand: a
              ? (dark ? const Color(0xFFF3A9C0) : const Color(0xFF8E2445))
              : (dark ? const Color(0xFFB9D9C6) : const Color(0xFF2F5D50)),
          accent: a ? const Color(0xFFC89B6D) : const Color(0xFFE8A486),
          font: a ? 'DM Sans' : 'Manrope',
          photo:
              '${demo.base}/flower-photos/${a ? 'blush-bouquet' : 'ranunculus'}.jpg',
          at: at,
        );
        await _write(tester, gallery, 'leqaa-$look-$step-$mode');
      },
    );
  }
}
