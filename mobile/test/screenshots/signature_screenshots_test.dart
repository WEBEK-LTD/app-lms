/// 130 The Signature looks' pictures, written to
/// platform/web/public/screens/[demo]-sig-[a|b]-home(-dark).png for /start,
/// /demo/studio and the docs: the home of a project started from each
/// look's template (test/support/signatures, written by
/// platform/web/tests/unit/signature-looks.test.ts), drawn by the real app
/// with the demo's own data, light and dark. Skipped unless run with
/// `--dart-define=YALLAPP_SCREENSHOTS=true` (as tool/screenshots.sh runs
/// the website's).
@Tags(['screenshots'])
library;

import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/shared/pages/content_blocks.dart'
    show pageClockProvider;

import 'support/screens.dart';
import 'support/shot.dart';
import 'support/studio_demo.dart';

const _enabled = bool.fromEnvironment('YALLAPP_SCREENSHOTS');
const _out = '../../../platform/web/public/screens';

/// Each look's home, light then dark.
List<Shot> _looks(
  String demo,
  String look,
  Shot Function(String name, bool dark) shot,
) => [
  shot('$demo-sig-$look-home', false),
  shot('$demo-sig-$look-home-dark', true),
];

/// 130.7 130.8 Masar Rides: its ride on the way, its car types; the home is its Ride tab.
List<Shot> _masar(String look) => _looks('rides', look, (name, dark) {
  final demo = StudioDemo.signature('rides', look);
  return Shot(
    name,
    api: () => masarStudioApi(look: demo),
    appName: 'Masar Rides',
    appType: AppType.rides,
    template: AppTemplate.bold,
    dark: dark,
    prepare: demo.prepare,
    shadows: true,
    after: (tester, router) async => router.go('/page/home'),
  );
});

/// 130.9 130.10 Lamha Taxi: the free taxis around Tahrir Square, live; no
/// ride on its way.
List<Shot> _lamha(String look) => _looks('taxi', look, (name, dark) {
  final demo = StudioDemo.signature('taxi', look);
  return Shot(
    name,
    api: () => lamhaStudioApi(ride: false, look: demo),
    appName: 'Lamha Taxi',
    appType: AppType.rides,
    template: AppTemplate.bold,
    dark: dark,
    prepare: demo.prepare,
    overrides: atTahrir,
    mapTiles: true,
    shadows: true,
    after: (tester, router) async => router.go('/page/home'),
  );
});

/// 130.12 Safra: its stays, and Layla's trip to Bali four days ahead (the
/// demo's booking, the phone's clock on the evening of 1 March).
List<Shot> _safra(String look) => _looks('travel', look, (name, dark) {
  final demo = StudioDemo.signature('travel', look);
  return Shot(
    name,
    api: () => safraStudioApi(look: demo),
    appName: 'Safra',
    appType: AppType.travel,
    dark: dark,
    prepare: (tester) async {
      await demo.prepare(tester);
      await prepareSafra(tester);
    },
    overrides: [
      pageClockProvider.overrideWithValue(() => DateTime(2027, 3, 1, 19, 30)),
    ],
    shadows: true,
  );
});

final signatureShots = <Shot>[
  ..._masar('a'),
  ..._masar('b'),
  ..._lamha('a'),
  ..._lamha('b'),
  ..._safra('a'),
  ..._safra('b'),
];

void main() {
  setUpAll(() async {
    if (_enabled) await loadAppFonts();
  });

  for (final shot in signatureShots) {
    testWidgets(shot.name, skip: !_enabled, (tester) async {
      if (shot.shadows) debugDisableShadows = false;
      final app = await shot.render(tester);
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
      debugDisableShadows = true;
    });
  }
}
