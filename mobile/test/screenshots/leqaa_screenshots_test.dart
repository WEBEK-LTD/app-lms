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
import 'package:yallapp/core/theme/fonts/font_cache.dart';
import 'package:yallapp/core/theme/fonts/remote_fonts.dart';
import 'package:yallapp/modules/shared/pages/studio_flash_sale.dart';

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
  double scroll = 0,
  Future<void> Function(WidgetTester tester)? then,
}) => Shot(
  name,
  api: () => leqaaStudioApi(look: demo, primaryColor: primary, lang: language),
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
  after: then != null
      ? (tester, _) => then(tester)
      : scroll <= 0
      ? null
      : (tester, _) => _scrollPage(tester, scroll),
);

/// The page scrolled so [target] is at its top (a section under the fold),
/// in whichever of the page's lists holds it (a Studio page's, the cart's).
Future<void> _scrollTo(WidgetTester tester, Finder target) async {
  // The page's lists as they are now, the innermost first.
  List<ScrollPosition> lists() => [
    for (final e
        in find
            .byWidgetPredicate(
              (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
            )
            .evaluate()
            .toList()
            .reversed)
      if (e.mounted) ((e as StatefulElement).state as ScrollableState).position,
  ];
  // From the top, unless it is in sight already.
  if (target.evaluate().isEmpty) {
    for (final p in lists().reversed) {
      p.jumpTo(0);
      await tester.pump();
    }
  }
  for (var i = 0; target.evaluate().isEmpty && i < lists().length; i++) {
    while (target.evaluate().isEmpty) {
      final now = lists();
      if (i >= now.length) break;
      final position = now[i];
      if (position.pixels >= position.maxScrollExtent) break;
      position.jumpTo(
        (position.pixels + 300).clamp(0.0, position.maxScrollExtent),
      );
      await tester.pump();
    }
  }
  final element = target.evaluate().first;
  final position = Scrollable.of(element).position;
  final box = element.renderObject!;
  final reveal = RenderAbstractViewport.of(box).getOffsetToReveal(box, 0);
  position.jumpTo((reveal.offset - 96).clamp(0.0, position.maxScrollExtent));
  await tester.pump(const Duration(milliseconds: 800));
  await tester.pump(const Duration(milliseconds: 800));
}

/// 131.25 The gift checkout as a customer fills it in: who it is from, who
/// it is for in Cairo, tomorrow afternoon, a birthday's ready message.
Future<void> _fillGift(WidgetTester tester, String language) async {
  final ar = language == 'ar';
  Future<void> type(String key, String text) async {
    await _scrollTo(tester, find.byKey(ValueKey(key)));
    await tester.enterText(find.byKey(ValueKey(key)), text);
    await tester.pump();
  }

  Future<void> tap(String key) async {
    await _scrollTo(tester, find.byKey(ValueKey(key)));
    await tester.tap(find.byKey(ValueKey(key)));
    await tester.pump(const Duration(milliseconds: 600));
  }

  await type('gift-sender-name', ar ? 'عمر حسن' : 'Omar Hassan');
  await type('gift-sender-phone', '+20 100 555 0142');
  await type('gift-sender-email', 'omar@example.com');
  await type('gift-recipient-name', ar ? 'سلمى عادل' : 'Salma Adel');
  await type('gift-recipient-phone', '+20 122 555 0187');
  await tap('gift-city');
  await tester.tap(find.text(ar ? 'القاهرة' : 'Cairo').last);
  await tester.pump(const Duration(milliseconds: 600));
  await type(
    'gift-recipient-address',
    ar ? '12 شارع شجرة الدر، الزمالك' : '12 Shagaret El Dor St., Zamalek',
  );
  await tap('delivery-tomorrow');
  await tap('delivery-slot-s2');
  await tap('gift-occasion-birthday');
  await tap('gift-template-birthday-t1');
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pump(const Duration(milliseconds: 600));
}

/// The page [by] further down (its sections under the fold).
Future<void> _scrollPage(WidgetTester tester, double by) async {
  final page = find
      .byWidgetPredicate(
        (w) => w is Scrollable && w.axisDirection == AxisDirection.down,
      )
      .first;
  final position = tester.state<ScrollableState>(page).position;
  position.jumpTo(by.clamp(0.0, position.maxScrollExtent));
  await tester.pump(const Duration(milliseconds: 800));
  await tester.pump(const Duration(milliseconds: 800));
}

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
  // 131.25 The premium gift checkout on the store's real one: the cart.
  _leqaa(
    'leqaa-checkout',
    leqaaDemo,
    location: '/page/cart',
    preferences: leqaaCartPreferences(leqaaDemo),
    then: (tester) async {
      await _fillGift(tester, 'en');
      await _scrollTo(tester, find.byKey(const ValueKey('gift-card-preview')));
    },
  ),
];

/// The owner's gallery: each look's pages by day, by night and in Arabic.
List<Shot> get _galleryShots => [
  for (final look in ['a', 'b'])
    for (final (mode, dark, language) in [
      ('light', false, 'en'),
      ('dark', true, 'en'),
      ('ar', false, 'ar'),
    ])
      for (final (page, location, scroll) in [
        ('home', null, 0.0),
        // The home's sections under the fold.
        ('home-2', null, 700.0),
        ('home-3', null, 1400.0),
        ('home-4', null, 2100.0),
        ('bouquet', '/page/bouquet', 0.0),
        ('bouquet-2', '/page/bouquet', 760.0),
        ('product', '/product/101', 0.0),
        ('shop', '/page/shop', 0.0),
        ('cart', '/page/cart', 0.0),
        ('orders', '/page/orders', 0.0),
        ('wishlist', '/page/wishlist', 0.0),
        ('account', '/account', 0.0),
      ])
        _leqaa(
          'leqaa-$look-$page-$mode',
          StudioDemo.signature('flowers', look),
          dark: dark,
          language: language,
          location: location,
          primary: look == 'a' ? '#8E2445' : '#2F5D50',
          preferences: page == 'cart'
              ? leqaaCartPreferences(
                  StudioDemo.signature('flowers', look),
                  lang: language,
                )
              : const {},
          scroll: scroll,
          // The cart as a customer has it ready: the gift filled in, the
          // checkout button on.
          then: page == 'cart'
              ? (tester) async {
                  await _fillGift(tester, language);
                  // Back at the top of the page and of the cart.
                  for (final e
                      in find
                          .byWidgetPredicate(
                            (w) =>
                                w is Scrollable &&
                                w.axisDirection == AxisDirection.down,
                          )
                          .evaluate()
                          .toList()
                          .reversed) {
                    if (!e.mounted) continue;
                    ((e as StatefulElement).state as ScrollableState).position
                        .jumpTo(0);
                    await tester.pump();
                  }
                  await tester.pump(const Duration(milliseconds: 800));
                }
              : null,
        ),
  // 131.25 The premium gift checkout on the real cart, at each of its parts:
  // the card and who it is from, who it is for, when, the card's message,
  // the summary; 131 the flash sale on the home and on its bouquet's page.
  for (final look in ['a', 'b'])
    for (final (mode, dark, language) in [
      ('light', false, 'en'),
      ('dark', true, 'en'),
      ('ar', false, 'ar'),
    ]) ...[
      for (final (step, key) in [
        ('checkout', 'gift-card-preview'),
        ('for', 'gift-recipient'),
        ('when', 'delivery-picker'),
        ('message', 'gift-card'),
        ('summary', 'gift-arrives'),
      ])
        _leqaa(
          'leqaa-$look-$step-$mode',
          StudioDemo.signature('flowers', look),
          dark: dark,
          language: language,
          location: '/page/cart',
          primary: look == 'a' ? '#8E2445' : '#2F5D50',
          preferences: leqaaCartPreferences(
            StudioDemo.signature('flowers', look),
            lang: language,
          ),
          then: (tester) async {
            await _fillGift(tester, language);
            await _scrollTo(tester, find.byKey(ValueKey(key)));
          },
        ),
      _leqaa(
        'leqaa-$look-flash-$mode',
        StudioDemo.signature('flowers', look),
        dark: dark,
        language: language,
        primary: look == 'a' ? '#8E2445' : '#2F5D50',
        then: (tester) => _scrollTo(tester, find.byType(StudioFlashSale)),
      ),
      _leqaa(
        'leqaa-$look-product-flash-$mode',
        StudioDemo.signature('flowers', look),
        dark: dark,
        language: language,
        location: '/product/101',
        primary: look == 'a' ? '#8E2445' : '#2F5D50',
        then: (tester) =>
            _scrollTo(tester, find.byKey(const ValueKey('product-sale'))),
      ),
    ],
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
}
