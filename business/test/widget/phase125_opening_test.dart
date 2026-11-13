import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/theme/theme.dart';
import 'package:yallapp_business/features/launch/opening_screen.dart';

import '../support/test_app.dart';

/// 125 The opening: 1.2 seconds of motion from the launch screen's dot,
/// then Today; still with reduced motion; the Prime opening with the app.
void main() {
  testWidgets('the first frame is the launch screen: the dot in the middle', (
    tester,
  ) async {
    final app = TestApp(opening: true);
    await app.pump(tester, size: const Size(375, 812), frames: 0);
    expect(find.byKey(const ValueKey('opening-motion')), findsOneWidget);
    // Ivory, as Android's launch_background and iOS's LaunchScreen.
    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold).first);
    expect(scaffold.backgroundColor, Brand.ivory);
    // The Ember dot, 48 points, in the middle.
    final dot = find.byWidgetPredicate(
      (w) =>
          w is DecoratedBox &&
          w.decoration is BoxDecoration &&
          (w.decoration as BoxDecoration).color == Brand.ember &&
          (w.decoration as BoxDecoration).shape == BoxShape.circle,
    );
    expect(dot, findsOneWidget);
    expect(tester.getSize(dot), const Size(48, 48));
    expect(tester.getCenter(dot), const Offset(375 / 2, 812 / 2));

    // Halfway: the dot has grown and moved to the corner; Today isn't open.
    await tester.pump(const Duration(milliseconds: 600));
    expect(tester.getSize(dot).width, greaterThan(100));
    expect(tester.getCenter(dot).dx, greaterThan(375 / 2));
    expect(find.text('Needs you now'), findsNothing);

    // At 1.2 seconds "Business" and the line; then Today.
    await tester.pump(const Duration(milliseconds: 600));
    expect(find.text('Business'), findsOneWidget);
    expect(
      find.text('Every order, booking and message. One place.'),
      findsOneWidget,
    );
    await settle(tester);
    expect(find.text('Needs you now'), findsOneWidget);
  });

  testWidgets('with reduced motion it is still, then Today opens', (
    tester,
  ) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    final app = TestApp(opening: true);
    await app.pump(tester, frames: 0);
    expect(find.byKey(const ValueKey('opening-still')), findsOneWidget);
    expect(find.byKey(const ValueKey('opening-motion')), findsNothing);
    // The last frame at once: no movement.
    expect(find.text('Business'), findsOneWidget);
    expect(tester.hasRunningAnimations, isFalse);
    await settle(tester, 3);
    expect(find.text('Needs you now'), findsOneWidget);
  });

  testWidgets('a Prime app opens with PRIME and its name, at night', (
    tester,
  ) async {
    final app = TestApp(
      opening: true,
      appId: FakeOwnerApi.foodId,
      brightness: Brightness.dark,
    );
    await app.pump(tester, frames: 0);
    final scaffold = tester.widget<Scaffold>(find.byType(Scaffold).first);
    expect(scaffold.backgroundColor, Brand.midnight);
    await settle(tester, 11);
    await tester.pump(const Duration(milliseconds: 60));
    expect(find.text('PRIME'), findsOneWidget);
    expect(find.textContaining('Opening Yalla Food.'), findsOneWidget);
    expect(find.text('EN · AR · TR'), findsNothing);
    await settle(tester);
    expect(find.textContaining('Morning brief'), findsOneWidget);
    expect(openingDuration, const Duration(milliseconds: 1200));
  });
}
