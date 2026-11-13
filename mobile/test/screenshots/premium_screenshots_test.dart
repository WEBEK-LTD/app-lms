/// 129.11–129.20 The premium library's gallery: each premium content
/// element on a Studio page in the real app, light, dark and in Arabic,
/// written to platform/web/public/screens/premium/ as
/// `testimonials-light.png`, `testimonials-dark.png`, `testimonials-ar.png`
/// and so on, for review and for the docs. Skipped unless run with
/// `--dart-define=YALLAPP_SCREENSHOTS=true --update-goldens`:
///
///   flutter test test/screenshots/premium_screenshots_test.dart \
///     --dart-define=YALLAPP_SCREENSHOTS=true --update-goldens
@Tags(['screenshots'])
library;

import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/premium_content_fixtures.dart';
import 'support/screens.dart';

const _enabled = bool.fromEnvironment('YALLAPP_SCREENSHOTS');
const _out = '../../../platform/web/public/screens/premium';

/// The gallery's pictures are smaller than the website's: 360 x 780 at 2x.
const _ratio = 2.0;

FakeApi _api(String element, {required bool arabic}) =>
    FakeApi(config: configJson(languages: languagesJson()))
      ..navigation = {
        ...navigationJson(
          tabs: [
            navTabJson('home', arabic ? 'الرئيسية' : 'Home', 'home', {
              'type': 'page',
              'page_slug': 'home',
            }),
            navTabJson('search', arabic ? 'بحث' : 'Search', 'search', {
              'type': 'screen',
              'screen': 'search',
            }),
            navTabJson('account', arabic ? 'حسابي' : 'Account', 'person', {
              'type': 'screen',
              'screen': 'account',
            }),
          ],
        ),
        // 129 The progress page under the small dock (the gold ring's board).
        if (element == 'progress')
          'tab_bar': {
            'design': 'dock',
            'active': '#B8862F',
            'dark_active': '#E6C26E',
            'background': '#FFFFFF',
            'dark_background': '#1D1B2C',
          },
      }
      ..pages = {'home': premiumPage(element, arabic: arabic)};

/// Yallapp's photos the pages show, in the image cache at their addresses.
final _photos = <String, ui.Image>{};

Future<void> _seedPhotos(WidgetTester tester) async {
  await tester.runAsync(() async {
    for (final path in premiumPhotoPaths) {
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
  for (final MapEntry(:key, :value) in _photos.entries) {
    cache.putIfAbsent(
      NetworkImage('https://demo.yallapp.test$key'),
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

  for (final element in premiumElements) {
    for (final variant in ['light', 'dark', 'ar']) {
      final name = '$element-$variant';
      testWidgets(name, skip: !_enabled, (tester) async {
        debugDisableShadows = false;
        final arabic = variant == 'ar';
        final shot = Shot(
          name,
          api: () => _api(element, arabic: arabic),
          appType: AppType.lms,
          dark: variant == 'dark',
          language: arabic ? 'ar' : 'en',
          signedIn: false,
          shadows: true,
          prepare: _seedPhotos,
        );
        await shot.render(tester);
        // Numbers counted up, bars filled.
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
