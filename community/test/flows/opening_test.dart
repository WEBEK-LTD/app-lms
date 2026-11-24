import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_community/core/routing/paths.dart';
import 'package:yallapp_community/features/opening/opening_page.dart';

import '../support/finders.dart';
import '../support/test_app.dart';

void main() {
  testWidgets('the opening plays 1.2s, then the welcome screen opens', (
    tester,
  ) async {
    final app = await TestApp.start(tester, signedIn: false, opening: true);
    // The session is known at once; the opening still plays to its end.
    expect(find.byType(OpeningPage), findsOneWidget);
    expect(app.path, '/restoring');
    await tester.pump(OpeningPage.duration);
    await TestApp.settle(tester);
    expect(find.byType(OpeningPage), findsNothing);
    expect(app.path, Paths.welcome);
  });

  testWidgets('signed in, the opening leads to Home', (tester) async {
    final app = await TestApp.start(tester, opening: true);
    await tester.pump(OpeningPage.duration);
    await TestApp.settle(tester);
    expect(app.path, Paths.home);
  });

  testWidgets('the final frame: the logo and "yallapp. COMMUNITY"', (
    tester,
  ) async {
    final app = await TestApp.start(tester, signedIn: false, opening: true);
    expect(app.path, '/restoring');
    await tester.pump(OpeningPage.duration);
    expect(key('opening-word'), findsOneWidget);
    expect(find.text('COMMUNITY'), findsOneWidget);
    expect(find.text('Build apps. Build together.'), findsOneWidget);
  });

  testWidgets('with reduced motion, the final frame stands still', (
    tester,
  ) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAccessibilityFeaturesTestValue);
    final app = await TestApp.start(tester, signedIn: false, opening: true);
    // The words already fully shown (moving, they're still hidden now).
    double wordsOpacity() => tester
        .widget<Opacity>(
          find
              .ancestor(of: key('opening-word'), matching: find.byType(Opacity))
              .first,
        )
        .opacity;
    expect(wordsOpacity(), 1);
    await tester.pump(OpeningPage.duration);
    await TestApp.settle(tester);
    expect(app.path, Paths.welcome);
  });
}
