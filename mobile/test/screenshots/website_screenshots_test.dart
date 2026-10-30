/// Screenshots of the real app for yallapp.com.tr, written to
/// platform/web/public/screens/. Skipped unless run through
/// tool/screenshots.sh (`--dart-define=YALLAPP_SCREENSHOTS=true`).
@Tags(['screenshots'])
library;

import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/screens.dart';

const _enabled = bool.fromEnvironment('YALLAPP_SCREENSHOTS');
const _out = '../../../platform/web/public/screens';

void main() {
  setUpAll(() async {
    if (_enabled) await loadAppFonts();
  });

  for (final shot in websiteShots) {
    testWidgets(shot.name, skip: !_enabled, (tester) async {
      final app = await shot.render(tester);
      // Captured at the phone's 3x, so the file is 1080 x 2340.
      final boundary = tester.renderObject<RenderRepaintBoundary>(
        find.byKey(shotKey),
      );
      final png = await tester.runAsync(() async {
        final image = await boundary.toImage(pixelRatio: shotPixelRatio);
        final data = await image.toByteData(format: ui.ImageByteFormat.png);
        image.dispose();
        return Uint8List.view(data!.buffer);
      });
      final file = Uri.parse('$_out/${shot.name}.png');
      await tester.runAsync(() async {
        if (autoUpdateGoldenFiles) {
          await goldenFileComparator.update(file, png!);
        } else {
          expect(await goldenFileComparator.compare(png!, file), isTrue);
        }
      });
      if (shot.mapTiles) await Shot.close(app, tester);
    });
  }
}
