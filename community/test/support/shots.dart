import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// Area E's real screenshots: with `YC_SHOTS_DIR=<dir>`, a test writes the
/// whole phone (390 × 844) at 2x as `<dir>/<name>.png`, drawn with the app's
/// own fonts (Inter, IBM Plex Sans Arabic, Material Symbols Rounded).
final shotsDir = Platform.environment['YC_SHOTS_DIR'] ?? '';

var _fontsLoaded = false;

/// Loads the bundled fonts once, so text is drawn as on a phone (tests
/// otherwise draw boxes). Only when shots are asked for.
Future<void> loadShotFonts() async {
  if (shotsDir.isEmpty || _fontsLoaded) return;
  _fontsLoaded = true;
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

/// The phone's status bar (the design's 50 points over the header).
void phoneInsets(WidgetTester tester) {
  tester.view.padding = const FakeViewPadding(top: 50 * 2, bottom: 34 * 2);
  tester.view.viewPadding = const FakeViewPadding(top: 50 * 2, bottom: 34 * 2);
  addTearDown(tester.view.resetPadding);
  addTearDown(tester.view.resetViewPadding);
}

Future<void> shot(WidgetTester tester, String name) async {
  expect(tester.takeException(), isNull);
  if (shotsDir.isEmpty) return;
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
}
