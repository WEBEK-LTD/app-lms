import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/config.dart';
import 'package:yallapp_community/core/providers.dart';
import 'package:yallapp_community/core/routing/feature_routes.dart';
import 'package:yallapp_community/core/routing/paths.dart';

import '../support/app_shots.dart';
import '../support/finders.dart';
import '../support/test_app.dart';

/// The stores' screenshot sets, from the demo build (`YC_DEMO=true`): the
/// 6.9" iPhone (1320 × 2868) and an Android phone (1080 × 1920), six
/// screens each, full bleed with the phone's own bars left to the phone.
/// `YC_SHOTS_DIR=<dir> flutter test test/shots/store_shots_test.dart`
/// writes them as `<dir>/store/<phone>/<n>-<screen>.png`.
void main() {
  const phones = [
    // 440 × 956 points at 3x; a 62-point status bar, a 34-point home bar.
    ('iphone-6.9', Size(440, 956), 3.0, 62.0, 34.0),
    // 411 × 731 dp at 2.625 (1080 × 1920); a 24 dp status bar, a gesture
    // bar of 16 dp.
    ('android-phone', Size(1080 / 2.625, 1920 / 2.625), 2.625, 24.0, 16.0),
  ];
  final screens = <(String, String?, bool)>[
    ('1-welcome', null, false),
    ('2-home', Paths.home, false),
    ('3-question', FeatureLinks.question('q-product-page'), false),
    ('4-learn', FeatureLinks.learn, false),
    ('5-profile', Paths.me, false),
    ('6-menu', Paths.home, true),
  ];

  for (final (phone, size, ratio, top, bottom) in phones) {
    for (final (name, path, menu) in screens) {
      testWidgets('$phone $name', (tester) async {
        final app = await TestApp.start(
          tester,
          signedIn: path != null,
          overrides: [
            configProvider.overrideWithValue(
              const AppConfig(
                apiBaseUrl: 'https://community.example/api/community/v1',
                websiteUrl: 'https://community.example',
                demo: true,
              ),
            ),
            newQuestionsProvider.overrideWithValue(12),
          ],
        );
        tester.view
          ..devicePixelRatio = ratio
          ..physicalSize = size * ratio
          ..padding = FakeViewPadding(top: top * ratio, bottom: bottom * ratio)
          ..viewPadding = FakeViewPadding(
            top: top * ratio,
            bottom: bottom * ratio,
          );
        addTearDown(tester.view.resetPadding);
        addTearDown(tester.view.resetViewPadding);
        if (path != null && path != Paths.home) app.go(path);
        await TestApp.settle(tester);
        if (menu) await tap(tester, 'header-menu');
        await TestApp.settle(tester);
        await appShot(tester, 'store/$phone/$name');
      });
    }
  }
}
