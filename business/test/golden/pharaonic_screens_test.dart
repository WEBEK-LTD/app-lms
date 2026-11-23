// 215 The Pharaonic theme's screens from the real app (the demo's fake API,
// the app's real fonts): every one lays out without overflow in English,
// Arabic and Turkish, light and dark. With YB_PHARAONIC_DIR set, each is
// written as a PNG to compare with design-refs/business-pharaonic:
//
//   YB_PHARAONIC_DIR=/tmp/pharaonic flutter test test/golden/pharaonic_screens_test.dart
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/routing/paths.dart';

import '../store/store_screenshots_test.dart' show loadAppFonts;
import '../support/nav.dart';
import '../support/test_app.dart';

const _frame = ValueKey('pharaonic-frame');

class _Screen {
  const _Screen(this.name, this.open, {this.signedIn = true, this.api});
  final String name;
  final bool signedIn;
  final FakeOwnerApi Function()? api;
  final Future<void> Function(WidgetTester tester, TestApp app) open;
}

final screens = [
  _Screen('sign-in', (tester, app) async {}, signedIn: false),
  _Screen('today', (tester, app) async {}),
  _Screen('order', (tester, app) async => go(tester, app, Paths.order(1041))),
  _Screen('ringtones', (tester, app) async {
    await push(tester, app, Paths.ringtones);
    await tester.tap(find.byKey(const ValueKey('ring-group-orders')));
    await settle(tester);
  }),
  _Screen('kitchen', (tester, app) async => push(tester, app, Paths.kitchen)),
  _Screen(
    'kitchen-empty',
    (tester, app) async => push(tester, app, Paths.kitchen),
    api: () => FakeOwnerApi()..clearOrders(FakeOwnerApi.restaurantId),
  ),
  _Screen(
    'appearance',
    (tester, app) async => push(tester, app, Paths.appearance),
  ),
  _Screen('orders', (tester, app) async => go(tester, app, Paths.orders)),
  _Screen('more', (tester, app) async => go(tester, app, Paths.more)),
  _Screen('stats', (tester, app) async => go(tester, app, Paths.stats)),
];

void main() {
  final out = Platform.environment['YB_PHARAONIC_DIR'] ?? '';
  setUpAll(loadAppFonts);

  for (final brightness in Brightness.values) {
    for (final lang in ['ar', 'en', 'tr']) {
      for (final screen in screens) {
        final name = '${screen.name}-$lang-${brightness.name}';
        testWidgets('pharaonic: $name', (tester) async {
          debugDisableShadows = false;
          try {
            final api = (screen.api?.call() ?? FakeOwnerApi())..language = lang;
            final app = TestApp(
              api: api,
              language: lang,
              signedIn: screen.signedIn,
              brightness: brightness,
              preferences: const {'yb.app_theme': 'pharaonic'},
            );
            await app.pump(
              tester,
              size: const Size(390, 844),
              pixelRatio: 2,
              padding: const EdgeInsets.only(top: 40, bottom: 22),
              wrap: (root) => RepaintBoundary(key: _frame, child: root),
            );
            await screen.open(tester, app);
            if (out.isEmpty) return;
            final boundary = tester.renderObject<RenderRepaintBoundary>(
              find.byKey(_frame),
            );
            await tester.runAsync(() async {
              final image = await boundary.toImage(pixelRatio: 2);
              final png = await image.toByteData(
                format: ui.ImageByteFormat.png,
              );
              image.dispose();
              File('$out/$name.png')
                ..parent.createSync(recursive: true)
                ..writeAsBytesSync(png!.buffer.asUint8List());
            });
          } finally {
            debugDisableShadows = true;
          }
        });
      }
    }
  }
}
