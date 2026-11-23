import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/routing/paths.dart';
import 'package:yallapp_business/core/services/push.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

/// 207 The new screens, light and dark, English and Arabic: Settings ›
/// Ringtones, a group's sounds, the ringing card over Today, and Mark as
/// shipped. Every case lays out without overflowing;
///
/// `YB_SHOTS_DIR=<dir> flutter test test/widget/phase207_shots_test.dart`
/// also writes them at 2x as `<dir>/<name>.png`.

final _shots = Platform.environment['YB_SHOTS_DIR'] ?? '';
const _frame = ValueKey('phase207-shot');

Future<void> _loadFonts() async {
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

Future<void> _shot(WidgetTester tester, String name) async {
  expect(tester.takeException(), isNull);
  if (_shots.isEmpty) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(_frame),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = File('$_shots/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
  });
}

Future<TestApp> _open(
  WidgetTester tester, {
  String appId = FakeOwnerApi.restaurantId,
  String language = 'en',
  Brightness brightness = Brightness.light,
  FakePush? push,
}) async {
  final app = TestApp(
    api: FakeOwnerApi()..language = language,
    appId: appId,
    language: language,
    brightness: brightness,
    push: push,
  );
  await app.pump(
    tester,
    size: const Size(400, 860),
    pixelRatio: 2,
    wrap: (root) => RepaintBoundary(key: _frame, child: root),
  );
  return app;
}

void main() {
  setUpAll(() async {
    if (_shots.isNotEmpty) await _loadFonts();
  });

  for (final language in ['en', 'ar']) {
    for (final brightness in Brightness.values) {
      final look = brightness == Brightness.dark ? 'dark' : 'light';
      testWidgets('Ringtones, $language, $look', (tester) async {
        final app = await _open(
          tester,
          language: language,
          brightness: brightness,
        );
        await push(tester, app, Paths.ringtones);
        await _shot(tester, 'ringtones-$language-$look');
        await tester.tap(find.byKey(const ValueKey('ring-group-orders')));
        await settle(tester);
        await _shot(tester, 'ringtones-orders-$language-$look');
      });

      testWidgets('the ringing card, $language, $look', (tester) async {
        final pushes = FakePush();
        final app = await _open(
          tester,
          language: language,
          brightness: brightness,
          push: pushes,
        );
        pushes.foregroundController.add(
          RemoteNotice(
            title: language == 'ar' ? 'طلب جديد 1043' : 'New order 1043',
            body: language == 'ar'
                ? 'مودا كافيه: ‏٤٥٠٫٠٠ ₺'
                : 'Moda Café: ₺450.00',
            data: const {'kind': 'new_order', 'order_id': '1042'},
          ),
        );
        await settle(tester);
        expect(app.ringer.ringing.value, isTrue);
        await _shot(tester, 'ringing-$language-$look');
      });
    }
  }

  testWidgets('Mark as shipped', (tester) async {
    final app = TestApp(
      api: FakeOwnerApi()..shippableOrders.add(3301),
      appId: FakeOwnerApi.academyId,
    );
    await app.pump(
      tester,
      size: const Size(400, 860),
      pixelRatio: 2,
      wrap: (root) => RepaintBoundary(key: _frame, child: root),
    );
    await push(tester, app, '/orders/3301');
    await Scrollable.ensureVisible(
      tester.element(find.byKey(const ValueKey('ship-order'))),
      alignment: 0.5,
    );
    await settle(tester);
    await _shot(tester, 'order-ship-button-en-light');
    await tester.tap(find.byKey(const ValueKey('ship-order')));
    await settle(tester);
    await _shot(tester, 'order-ship-sheet-en-light');
  });
}
