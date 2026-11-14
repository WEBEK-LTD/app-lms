/// 130.20–130.29 Premium chrome's gallery: the premium page headers and the
/// system screens in their premium looks, in the real app, light, dark and
/// in Arabic, written to platform/web/public/screens/premium/ as
/// `chrome-header-large-light.png`, `chrome-account-photo-dark.png`,
/// `chrome-sign-in-brand-ar.png` and so on, for review and for the docs.
/// Skipped unless run with
/// `--dart-define=YALLAPP_SCREENSHOTS=true --update-goldens`:
///
///   flutter test test/screenshots/premium_chrome_screenshots_test.dart \
///     --dart-define=YALLAPP_SCREENSHOTS=true --update-goldens
@Tags(['screenshots'])
library;

import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/shared/auth/otp_screen.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import 'support/screens.dart';

const _enabled = bool.fromEnvironment('YALLAPP_SCREENSHOTS');
const _out = '../../../platform/web/public/screens/premium';
const _ratio = 2.0;
const _host = 'https://demo.yallapp.test';
const _cover = '/stories/multi-vendor/zad-cafe.jpg';
const _hero = '/stories/rides/rides-night-city.jpg';
const _photos = [_cover, _hero, '/stories/academy/academy-desk.jpg'];

/// One picture of the gallery.
class _Chrome {
  const _Chrome(
    this.name, {
    this.header,
    this.system,
    this.location,
    this.signedIn = true,
    this.loading = false,
    this.empty = false,
    this.after,
  });

  final String name;

  /// The home page's header style.
  final String? header;

  /// The system screens' look.
  final String? system;
  final String? location;
  final bool signedIn;
  final bool loading;
  final bool empty;
  final Future<void> Function(WidgetTester tester, GoRouter router)? after;
}

final _shots = <_Chrome>[
  for (final style in ['large', 'glass', 'photo', 'brand', 'search'])
    _Chrome('header-$style', header: style),
  for (final look in ['large', 'glass', 'photo', 'brand'])
    _Chrome(
      'account-$look',
      system: look,
      after: (tester, router) async => router.go(Paths.account),
    ),
  const _Chrome('settings-large', system: 'large', location: Paths.settings),
  const _Chrome(
    'notifications-glass',
    system: 'glass',
    location: Paths.notifications,
  ),
  _Chrome(
    'language-brand',
    system: 'brand',
    location: Paths.settings,
    after: (tester, router) async {
      await tester.tap(find.byKey(const ValueKey('language-tile')));
    },
  ),
  const _Chrome(
    'edit-profile-large',
    system: 'large',
    location: Paths.editProfile,
  ),
  const _Chrome('orders-photo', system: 'photo', location: Paths.orders),
  const _Chrome(
    'sign-in-photo',
    system: 'photo',
    location: Paths.signIn,
    signedIn: false,
  ),
  const _Chrome(
    'sign-in-brand',
    system: 'brand',
    location: Paths.signIn,
    signedIn: false,
  ),
  _Chrome(
    'code-glass',
    system: 'glass',
    signedIn: false,
    after: (tester, router) async {
      router.push(
        Paths.signInCode,
        extra: const OtpArgs(
          countryCode: '+90',
          phone: '5321234567',
          request: OtpRequestResult(
            requestId: 'r1',
            codeLength: 6,
            resendAfterSeconds: 45,
            expiresInSeconds: 600,
          ),
        ),
      );
    },
  ),
  const _Chrome(
    'empty-large',
    system: 'large',
    location: Paths.notifications,
    empty: true,
  ),
  const _Chrome(
    'loading-glass',
    system: 'glass',
    location: Paths.notifications,
    loading: true,
  ),
];

Map<String, dynamic> _block(String id, String photo, String title) => {
  'id': id,
  'type': 'column',
  'radius': 22,
  'background': '#FFFFFF',
  'dark_background': '#1D1B2C',
  'margin': {'top': 8, 'end': 16, 'bottom': 8, 'start': 16},
  'children': [
    {
      'id': '$id-photo',
      'type': 'image',
      'image_url': '$_host$photo',
      'height': 170,
      'radius': 22,
    },
    {
      'id': '$id-title',
      'type': 'text',
      'text': title,
      'font_size': 17,
      'font_weight': 800,
      'padding': {'top': 12, 'end': 14, 'bottom': 14, 'start': 14},
    },
  ],
};

FakeApi _api(_Chrome shot, {required bool arabic}) {
  final api =
      (shot.loading ? _LoadingApi.new : FakeApi.new)(
          config: {
            ...configJson(
              languages: languagesJson(),
              store: true,
              orders: true,
            ),
            if (shot.system != null)
              'screens': {
                'system': {
                  'look': shot.system,
                  if (shot.system == 'photo') 'image_url': '$_host$_hero',
                },
                'sign_in': {
                  'style': 'classic',
                  'title': {
                    'en': 'Your table is set',
                    'ar': 'مائدتك جاهزة',
                    'tr': 'Masanız hazır',
                  },
                  'subtitle': {
                    'en': 'Sign in to order and follow your orders.',
                    'ar': 'سجّل الدخول لتطلب وتتابع طلباتك.',
                    'tr': 'Sipariş vermek ve takip etmek için giriş yapın.',
                  },
                  'show_logo': true,
                },
              },
          },
        )
        ..navigation = navigationJson(
          tabs: [
            navTabJson('home', arabic ? 'الرئيسية' : 'Home', 'home', {
              'type': 'page',
              'page_slug': 'home',
            }),
            navTabJson('orders', arabic ? 'طلباتي' : 'Orders', 'receipt_long', {
              'type': 'screen',
              'screen': 'orders',
            }),
            navTabJson('account', arabic ? 'حسابي' : 'Account', 'person', {
              'type': 'screen',
              'screen': 'account',
            }),
          ],
        )
        ..pages = {
          'home': {
            ...appPageJson(blocks: []),
            'studio': {
              'header': {
                'type': 'title',
                'style': ?shot.header,
                'title': arabic ? 'اكتشف' : 'Discover',
                'subtitle': arabic ? 'مختارات الليلة' : "Tonight's picks",
                'image_url': '$_host$_cover',
                'buttons': ['notifications', 'search', 'account'],
              },
              'body': {
                'id': 'root',
                'type': 'column',
                'children': [
                  _block(
                    'b1',
                    _cover,
                    arabic ? 'مقهى الزاوية' : 'The corner café',
                  ),
                  _block(
                    'b2',
                    _photos[2],
                    arabic ? 'مكتب هادئ' : 'A quiet desk',
                  ),
                ],
              },
            },
          },
        };
  if (shot.empty) api.notifications = [];
  return api;
}

final _images = <String, ui.Image>{};

Future<void> _seedPhotos(WidgetTester tester) async {
  await tester.runAsync(() async {
    for (final path in _photos) {
      if (_images.containsKey(path)) continue;
      final codec = await ui.instantiateImageCodec(
        File('../platform/web/public$path').readAsBytesSync(),
        targetWidth: 900,
      );
      _images[path] = (await codec.getNextFrame()).image;
    }
  });
  final cache = PaintingBinding.instance.imageCache
    ..maximumSizeBytes = 1 << 30
    ..maximumSize = 4000;
  for (final MapEntry(:key, :value) in _images.entries) {
    cache.putIfAbsent(
      NetworkImage('$_host$key'),
      () => OneFrameImageStreamCompleter(
        SynchronousFuture(ImageInfo(image: value.clone())),
      ),
    );
  }
}

void main() {
  setUpAll(() async {
    if (_enabled) await loadAppFonts();
  });

  for (final c in _shots) {
    for (final variant in ['light', 'dark', 'ar']) {
      final name = 'chrome-${c.name}-$variant';
      testWidgets(name, skip: !_enabled, (tester) async {
        debugDisableShadows = false;
        final arabic = variant == 'ar';
        final shot = Shot(
          name,
          api: () => _api(c, arabic: arabic),
          appType: AppType.store,
          dark: variant == 'dark',
          language: arabic ? 'ar' : 'en',
          signedIn: c.signedIn,
          location: c.location,
          after: c.after,
          shadows: true,
          prepare: _seedPhotos,
        );
        await shot.render(tester);
        await tester.pump(
          c.loading
              ? const Duration(milliseconds: 700)
              : const Duration(seconds: 1),
        );
        final boundary = tester.renderObject<RenderRepaintBoundary>(
          find.byKey(shotKey),
        );
        final png = await tester.runAsync(() async {
          final image = await boundary.toImage(pixelRatio: _ratio);
          final data = await image.toByteData(format: ui.ImageByteFormat.png);
          image.dispose();
          return Uint8List.view(data!.buffer);
        });
        final file = Uri.parse('$_out/$name.png');
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

/// The notifications never come: the screen stays loading.
class _LoadingApi extends FakeApi {
  _LoadingApi({super.config});

  @override
  Future<NotificationPage> listNotifications({
    int page = 1,
    int perPage = 20,
  }) => Completer<NotificationPage>().future;
}
