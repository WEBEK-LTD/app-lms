import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

/// Area D's screenshots: with `YC_SHOTS_DIR=<dir>`, [appShot] writes the
/// whole phone (390 × 844) at 2x as `<dir>/<name>.png`, with the real fonts
/// (test/flutter_test_config.dart) and photos.
final appShotsDir = Platform.environment['YC_SHOTS_DIR'] ?? '';

/// The design's phone: a 50-point status bar, a 34-point home bar.
void designInsets(WidgetTester tester) {
  tester.view.padding = const FakeViewPadding(top: 50 * 2, bottom: 34 * 2);
  tester.view.viewPadding = const FakeViewPadding(top: 50 * 2, bottom: 34 * 2);
  addTearDown(tester.view.resetPadding);
  addTearDown(tester.view.resetViewPadding);
}

/// Decodes every image on screen (tests don't, unless asked).
Future<void> loadImages(WidgetTester tester) async {
  final images = find.byType(Image).evaluate().toList();
  final decorated = find.byType(DecoratedBox).evaluate().toList();
  await tester.runAsync(() async {
    for (final e in images) {
      await precacheImage((e.widget as Image).image, e);
    }
    for (final e in decorated) {
      final d = (e.widget as DecoratedBox).decoration;
      if (d is BoxDecoration && d.image != null) {
        await precacheImage(d.image!.image, e);
      }
    }
  });
  await tester.pump();
}

Future<void> appShot(WidgetTester tester, String name) async {
  expect(tester.takeException(), isNull);
  // Text outside any Material gets Flutter's warning style (yellow double
  // underline, a fallback font): never on a screen of the app.
  for (final e in find.byType(RichText).evaluate()) {
    final style = (e.widget as RichText).text.style;
    expect(
      style?.decorationColor,
      isNot(const Color(0xFFFFFF00)),
      reason: '"${(e.widget as RichText).text.toPlainText()}" has no Material',
    );
  }
  if (appShotsDir.isEmpty) return;
  await loadImages(tester);
  // Shadows soft, as on a phone (tests draw them hard), for this one frame.
  void repaintAll() {
    void visit(RenderObject o) {
      o.markNeedsPaint();
      o.visitChildren(visit);
    }

    tester.binding.renderViews.forEach(visit);
  }

  debugDisableShadows = false;
  repaintAll();
  await tester.pump();
  final view = tester.binding.renderViews.first;
  final layer = view.debugLayer! as OffsetLayer;
  try {
    await _write(tester, view, layer, name);
  } finally {
    debugDisableShadows = true;
    repaintAll();
    await tester.pump();
  }
}

Future<void> _write(
  WidgetTester tester,
  RenderView view,
  OffsetLayer layer,
  String name,
) async {
  await tester.runAsync(() async {
    final image = await layer.toImage(
      Offset.zero & (view.size * tester.view.devicePixelRatio),
    );
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = File('$appShotsDir/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
  });
}
