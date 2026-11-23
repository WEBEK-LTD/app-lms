// 215 The default look stays exactly as it was: its main screens, light and
// dark, in English and Arabic, drawn with the app's real fonts and compared
// pixel for pixel with goldens made before the Pharaonic theme existed.
//
// Text that changes with the clock (the hour's greeting, times like 21:28)
// is painted over, across the whole band it sits in, before the comparison;
// everything else must match.
//
//   flutter test test/golden                    compare
//   flutter test test/golden --update-goldens   remake (only on purpose)
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/routing/paths.dart';

import '../store/store_screenshots_test.dart' show loadAppFonts;
import '../support/nav.dart';
import '../support/test_app.dart';

const _size = Size(390, 844);
const _frame = ValueKey('golden-frame');

/// Texts that change with the clock or the day.
final _volatile = [
  // Times (21:28, ١٢:١٤) and dates with a year, in Western or Arabic digits.
  RegExp(r'[0-9٠-٩]{1,2}:[0-9٠-٩]{2}'),
  // A year (2026, ٢٠٢٦), not an order number like #1042.
  RegExp(r'(?:20|٢٠)[0-9٠-٩]{2}(?![0-9٠-٩])'),
  RegExp(r'^(Good (morning|afternoon|evening)|صباح الخير|مساء الخير)'),
];

class _Screen {
  const _Screen(this.name, this.open, {this.signedIn = true});
  final String name;
  final bool signedIn;
  final Future<void> Function(WidgetTester tester, TestApp app) open;
}

final _screens = [
  _Screen('sign-in', (tester, app) async {}, signedIn: false),
  _Screen('today', (tester, app) async {}),
  _Screen('orders', (tester, app) async => go(tester, app, Paths.orders)),
  _Screen('order', (tester, app) async => go(tester, app, Paths.order(1042))),
  _Screen('ringtones', (tester, app) async {
    await push(tester, app, Paths.ringtones);
  }),
  _Screen('ringtone-picker', (tester, app) async {
    await push(tester, app, Paths.ringtones);
    await tester.tap(find.byKey(const ValueKey('ring-group-orders')));
    await settle(tester);
  }),
  _Screen('kitchen', (tester, app) async => push(tester, app, Paths.kitchen)),
  _Screen('more', (tester, app) async => go(tester, app, Paths.more)),
];

/// The frame as an image, with the clock's texts painted over.
Future<ui.Image> _capture(WidgetTester tester) async {
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(_frame),
  );
  final origin = boundary.localToGlobal(Offset.zero);
  final masks = <Rect>[];
  for (final element in find.byType(RichText).evaluate()) {
    final paragraph = element.renderObject! as RenderParagraph;
    if (!paragraph.attached || !paragraph.hasSize) continue;
    final text = paragraph.text.toPlainText();
    if (!_volatile.any((r) => r.hasMatch(text))) continue;
    // The whole band across the screen: the text's width changes with
    // the time, so a mask of its own size would move.
    final top = (paragraph.localToGlobal(Offset.zero) - origin).dy;
    masks.add(
      Rect.fromLTWH(0, top - 1, boundary.size.width, paragraph.size.height + 2),
    );
  }
  return (await tester.runAsync(() async {
    final image = await boundary.toImage();
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder)..drawImage(image, Offset.zero, Paint());
    final paint = Paint()..color = const Color(0xFFFF00FF);
    for (final rect in masks) {
      canvas.drawRect(rect, paint);
    }
    final masked = await recorder.endRecording().toImage(
      image.width,
      image.height,
    );
    image.dispose();
    return masked;
  }))!;
}

void main() {
  setUpAll(loadAppFonts);

  for (final brightness in Brightness.values) {
    for (final lang in ['en', 'ar']) {
      for (final screen in _screens) {
        final name = '${screen.name}-$lang-${brightness.name}';
        testWidgets('default look: $name', (tester) async {
          final app = TestApp(
            api: FakeOwnerApi()..language = lang,
            language: lang,
            signedIn: screen.signedIn,
            brightness: brightness,
          );
          await app.pump(
            tester,
            size: _size,
            pixelRatio: 1,
            wrap: (root) => RepaintBoundary(key: _frame, child: root),
          );
          await screen.open(tester, app);
          final image = await _capture(tester);
          await expectLater(image, matchesGoldenFile('default/$name.png'));
          image.dispose();
        });
      }
    }
  }
}
