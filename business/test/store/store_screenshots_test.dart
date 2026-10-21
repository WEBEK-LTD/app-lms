// 65 The store screenshots of Yallapp Business, drawn from the demo's
// sample apps (the fake API of `YB_DEMO`) with the app's real fonts and
// icons, in English, Arabic and Turkish, at the sizes Google Play and the
// App Store ask for. 74 Each screen is then framed under its caption
// (poster.dart): the file is the framed one.
//
// `flutter test` lays every screenshot out (nothing may overflow) without
// writing files. The release workflow writes the PNG files:
//
//   YB_SCREENSHOTS_DIR=/tmp/shots flutter test test/store
//
// → <dir>/<device>/<language>/<n>_<screen>.png, which
// build/scripts/business_store.py puts where fastlane wants them.
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';

import '../support/nav.dart';
import '../support/test_app.dart';
import 'poster.dart';

/// A phone or tablet: the screenshot's size in pixels, its pixel ratio and
/// its system bars (logical pixels).
class Device {
  const Device(
    this.name,
    this.pixels,
    this.pixelRatio,
    this.padding, {
    this.tablet = false,
  });

  final String name;
  final Size pixels;
  final double pixelRatio;
  final EdgeInsets padding;
  final bool tablet;

  Size get logical => pixels / pixelRatio;
}

/// Google Play's phones (9:16) and tablets (7" and 10", 10:16), the App
/// Store's 6.9" iPhone (1290 × 2796), 6.5" iPhone (1284 × 2778) and 13" iPad.
const devices = [
  Device(
    'android-phone',
    Size(1080, 1920),
    2.5,
    EdgeInsets.only(top: 24, bottom: 16),
  ),
  Device(
    'android-tablet',
    Size(1600, 2560),
    2,
    EdgeInsets.only(top: 24, bottom: 16),
    tablet: true,
  ),
  Device('iphone', Size(1290, 2796), 3, EdgeInsets.only(top: 59, bottom: 34)),
  Device(
    'iphone-65',
    Size(1284, 2778),
    3,
    EdgeInsets.only(top: 47, bottom: 34),
  ),
  Device(
    'ipad',
    Size(2064, 2752),
    2,
    EdgeInsets.only(top: 24, bottom: 20),
    tablet: true,
  ),
];

const languages = ['en', 'ar', 'tr'];

/// What the notification composer holds in each language: sample text of the
/// demo's restaurant, not interface strings.
const _notice = {
  'en': (
    title: 'Iftar menu',
    message: 'Our iftar menu is back from tonight. Book your table.',
  ),
  'ar': (
    title: 'قائمة الإفطار',
    message: 'قائمة الإفطار تعود من الليلة. احجز طاولتك.',
  ),
  'tr': (
    title: 'İftar menüsü',
    message: 'İftar menümüz bu akşam geri dönüyor. Masanızı ayırtın.',
  ),
};

/// A screen of the listing: the demo app it shows and how to get there.
class Shot {
  const Shot(this.name, this.appId, this.open, {this.dark = false});

  final String name;
  final String appId;

  /// The screen is dark (light status bar icons).
  final bool dark;
  final Future<void> Function(WidgetTester tester, TestApp app, String lang)
  open;
}

final shots = [
  Shot('today', FakeOwnerApi.restaurantId, (tester, app, lang) async {}),
  Shot('orders', FakeOwnerApi.restaurantId, (tester, app, lang) async {
    await go(tester, app, '/orders');
  }),
  // The door: the scanner's own screen with a ticket just let in (the camera
  // is the test's dark stand-in, never a photo).
  Shot('scanner', FakeOwnerApi.eventsId, (tester, app, lang) async {
    await push(tester, app, '/scan');
    app.scanner.see(FakeOwnerApi.ticketCode);
    await settle(tester);
  }, dark: true),
  Shot('notify', FakeOwnerApi.restaurantId, (tester, app, lang) async {
    await push(tester, app, '/notify');
    final fields = find.byType(TextField);
    await tester.enterText(fields.at(0), _notice[lang]!.title);
    await tester.enterText(fields.at(1), _notice[lang]!.message);
    FocusManager.instance.primaryFocus?.unfocus();
    await settle(tester);
  }),
  Shot('stats', FakeOwnerApi.restaurantId, (tester, app, lang) async {
    await go(tester, app, '/stats');
  }),
];

/// The fonts the app bundles (Bricolage Grotesque, IBM Plex Sans Arabic,
/// Material Symbols Rounded), so the screenshots look like the phone.
Future<void> loadAppFonts() async {
  final manifest =
      json.decode(await rootBundle.loadString('FontManifest.json')) as List;
  for (final entry in manifest.cast<Map<String, dynamic>>()) {
    final loader = FontLoader(entry['family'] as String);
    for (final font in (entry['fonts'] as List).cast<Map<String, dynamic>>()) {
      loader.addFont(rootBundle.load(font['asset'] as String));
    }
    await loader.load();
  }
}

/// What [frame] shows, at the device's own size in pixels.
Future<ui.Image> capture(WidgetTester tester, Key frame, Device device) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(frame),
  );
  final image = (await tester.runAsync(
    () => boundary.toImage(pixelRatio: device.pixelRatio),
  ))!;
  expect(Size(image.width.toDouble(), image.height.toDouble()), device.pixels);
  return image;
}

void main() {
  final out = Platform.environment['YB_SCREENSHOTS_DIR'] ?? '';
  const frame = ValueKey('store-screenshot');

  setUpAll(loadAppFonts);

  for (final device in devices) {
    for (final lang in languages) {
      for (final (index, shot) in shots.indexed) {
        testWidgets('${device.name} $lang ${shot.name}', (tester) async {
          // Real shadows, as on a phone (tests turn them off by default).
          debugDisableShadows = false;
          try {
            final app = TestApp(
              api: FakeOwnerApi()..language = lang,
              appId: shot.appId,
              language: lang,
            );
            await app.pump(
              tester,
              size: device.logical,
              pixelRatio: device.pixelRatio,
              padding: device.padding,
              wrap: (root) => RepaintBoundary(key: frame, child: root),
            );
            await shot.open(tester, app, lang);
            final caption = captions[shot.name]![lang]!;
            final screen = await capture(tester, frame, device);
            try {
              await tester.pumpWidget(
                RepaintBoundary(
                  key: frame,
                  child: StorePoster(
                    screen: screen,
                    screenSize: device.logical,
                    bars: device.padding,
                    caption: caption,
                    language: lang,
                    tablet: device.tablet,
                    dark: index.isEven,
                    darkScreen: shot.dark,
                  ),
                ),
              );
              await tester.pump();
              // Every caption fits in its two lines.
              for (final text in tester.widgetList<Text>(
                find.descendant(
                  of: find.byType(StorePoster),
                  matching: find.byType(Text),
                ),
              )) {
                final paragraph = tester.renderObject<RenderParagraph>(
                  find.byWidget(text),
                );
                expect(
                  paragraph.didExceedMaxLines,
                  isFalse,
                  reason: '${text.data} is too long for ${device.name}',
                );
              }
              if (out.isEmpty) return;
              final poster = await capture(tester, frame, device);
              final file = File(
                '$out/${device.name}/$lang/${index + 1}_${shot.name}.png',
              );
              await tester.runAsync(() async {
                final png = await poster.toByteData(
                  format: ui.ImageByteFormat.png,
                );
                poster.dispose();
                file.parent.createSync(recursive: true);
                file.writeAsBytesSync(png!.buffer.asUint8List());
              });
            } finally {
              screen.dispose();
            }
          } finally {
            debugDisableShadows = true;
          }
        });
      }
    }
  }
}
