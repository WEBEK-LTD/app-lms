import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

/// Area E's real screenshots: with `YC_SHOTS_DIR=<dir>`, a test writes the
/// whole phone (390 × 844) at 2x as `<dir>/<name>.png`, drawn with the app's
/// own fonts (Inter, IBM Plex Sans Arabic, Material Symbols Rounded).
final shotsDir = Platform.environment['YC_SHOTS_DIR'] ?? '';

/// The app's fonts (Inter, IBM Plex Sans Arabic, Readex Pro, Material
/// Symbols Rounded) are loaded for every test by test/flutter_test_config.dart.
Future<void> loadShotFonts() async {}

/// The phone's status bar (the design's 50 points over the header).
void phoneInsets(WidgetTester tester) {
  tester.view.padding = const FakeViewPadding(top: 50 * 2, bottom: 34 * 2);
  tester.view.viewPadding = const FakeViewPadding(top: 50 * 2, bottom: 34 * 2);
  addTearDown(tester.view.resetPadding);
  addTearDown(tester.view.resetViewPadding);
}

Future<void> shot(WidgetTester tester, String name) async {
  // Taken first, so a fault (an overflow's stripes) shows in the shot too.
  final fault = tester.takeException();
  await _write(tester, name);
  expect(fault, isNull);
}

Future<void> _write(WidgetTester tester, String name) async {
  if (shotsDir.isEmpty) return;
  // Shadows as a phone draws them, blurred, for this frame only (tests draw
  // them solid, and the flag must be back before the test ends).
  debugDisableShadows = false;
  tester.binding.renderViews.first.markNeedsPaint();
  for (final e in tester.allElements) {
    e.renderObject?.markNeedsPaint();
  }
  // Let pictures (covers, photos) decode, then draw them.
  await tester.runAsync(
    () => Future<void>.delayed(const Duration(milliseconds: 400)),
  );
  for (var i = 0; i < 6; i++) {
    await tester.pump(const Duration(milliseconds: 60));
  }
  final view = tester.binding.renderViews.first;
  final layer = view.debugLayer! as OffsetLayer;
  await tester.runAsync(() async {
    // The root layer already scales by the phone's 2x.
    final image = await layer.toImage(
      Offset.zero & (view.size * tester.view.devicePixelRatio),
    );
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = File('$shotsDir/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
  });
  debugDisableShadows = true;
  for (final e in tester.allElements) {
    e.renderObject?.markNeedsPaint();
  }
  await tester.pump();
}
