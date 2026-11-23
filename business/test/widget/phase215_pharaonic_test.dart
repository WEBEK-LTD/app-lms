import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp_business/core/api/fake_owner_api.dart';
import 'package:yallapp_business/core/providers.dart';
import 'package:yallapp_business/core/routing/paths.dart';
import 'package:yallapp_business/core/theme/pharaonic_widgets.dart';
import 'package:yallapp_business/core/theme/theme.dart';

import '../support/nav.dart';
import '../support/test_app.dart';

ThemeData _theme(WidgetTester tester) =>
    Theme.of(tester.element(find.byType(Scaffold).first));

const _pharaonic = {'yb.app_theme': 'pharaonic'};

void main() {
  testWidgets(
    '215 Settings › Appearance: the default first, Pharaonic beside it; the choice is kept on the phone',
    (tester) async {
      final app = TestApp();
      await app.pump(tester);
      // The default look: no ornaments anywhere.
      expect(_theme(tester).extension<YbOrnaments>(), isNull);
      await push(tester, app, Paths.appearance);
      expect(find.text('Theme'), findsOneWidget);
      expect(find.text('Yallapp'), findsOneWidget);
      expect(find.text('Default'), findsOneWidget);
      expect(find.text('Pharaonic'), findsOneWidget);
      // The default comes first.
      expect(
        tester.getTopLeft(find.byKey(const ValueKey('theme-standard'))).dx,
        lessThan(
          tester.getTopLeft(find.byKey(const ValueKey('theme-pharaonic'))).dx,
        ),
      );
      expect(
        tester.getSemantics(find.byKey(const ValueKey('theme-standard'))),
        matchesSemantics(
          label: 'Yallapp, chosen',
          isButton: true,
          isSelected: true,
          hasSelectedState: true,
        ),
      );

      await tester.tap(find.byKey(const ValueKey('theme-pharaonic')));
      await settle(tester);
      expect(app.container.read(appThemeProvider), AppTheme.pharaonic);
      expect(
        app.container.read(sharedPreferencesProvider).getString('yb.app_theme'),
        'pharaonic',
      );
      expect(_theme(tester).extension<YbOrnaments>(), isNotNull);
      // Light and dark still follow the same setting.
      expect(find.text('Same as the phone'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('theme-standard')));
      await settle(tester);
      expect(app.container.read(appThemeProvider), AppTheme.standard);
      expect(
        app.container.read(sharedPreferencesProvider).getString('yb.app_theme'),
        isNull,
      );
      expect(_theme(tester).extension<YbOrnaments>(), isNull);
    },
  );

  testWidgets('215 the default Today has no new-order card, no cornice', (
    tester,
  ) async {
    final app = TestApp();
    await app.pump(tester);
    expect(find.byType(Cornice), findsNothing);
    expect(find.byType(GiltCard), findsNothing);
    expect(find.byKey(const ValueKey('new-order-shimmer')), findsNothing);
  });

  testWidgets(
    '215 Pharaonic Today: the newest waiting order shimmers until it is accepted',
    (tester) async {
      final app = TestApp(preferences: _pharaonic);
      await app.pump(tester);
      expect(find.byType(Cornice), findsOneWidget);
      final card = find.byKey(const ValueKey('new-order-shimmer'));
      await tester.scrollUntilVisible(card, 200);
      await settle(tester);
      expect(find.text('New order'), findsOneWidget);
      expect(find.textContaining('#1042'), findsWidgets);
      expect(
        (tester.state(card) as dynamic).moving as bool,
        isTrue,
        reason: 'the light moves while the order waits',
      );

      await tester.tap(
        find.descendant(of: card, matching: find.text('Accept')),
      );
      await settle(tester);
      expect(app.api.calls, contains('changeOrderStatus:preparing'));
      // Accepted: the card goes (no other order waits).
      expect(find.byKey(const ValueKey('new-order-shimmer')), findsNothing);
    },
  );

  testWidgets(
    '215 the shimmer stays still when the phone asks for less motion',
    (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      final app = TestApp(preferences: _pharaonic);
      await app.pump(tester);
      final card = find.byKey(const ValueKey('new-order-shimmer'));
      await tester.scrollUntilVisible(card, 200);
      expect((tester.state(card) as dynamic).moving as bool, isFalse);
    },
  );

  testWidgets('215 Pharaonic: an empty Kitchen mode shows the medallion', (
    tester,
  ) async {
    final app = TestApp(
      api: FakeOwnerApi()..clearOrders(FakeOwnerApi.restaurantId),
      preferences: _pharaonic,
    );
    await app.pump(tester);
    await push(tester, app, Paths.kitchen);
    expect(find.text('No orders in the kitchen'), findsOneWidget);
    expect(find.byType(Medallion), findsOneWidget);
  });

  testWidgets('215 Pharaonic in Arabic: the theme picker and the welcome', (
    tester,
  ) async {
    final app = TestApp(
      language: 'ar',
      signedIn: false,
      preferences: _pharaonic,
      brightness: Brightness.dark,
    );
    await app.pump(tester);
    // The welcome: the mark, the cornice, the papyrus columns.
    expect(find.bySemanticsLabel('Yallapp Business'), findsOneWidget);
    expect(find.byType(WingedSun), findsOneWidget);
    expect(find.byType(Cornice), findsOneWidget);
    expect(find.byType(PapyrusColumn), findsNWidgets(2));
    expect(
      _theme(tester).extension<YbColors>()!.background,
      const Color(0xFF0A0F1E),
    );
  });

  testWidgets('215 the Arabic theme picker', (tester) async {
    final app = TestApp(language: 'ar');
    await app.pump(tester);
    await push(tester, app, Paths.appearance);
    expect(find.text('السمة'), findsOneWidget);
    expect(find.text('الافتراضي'), findsOneWidget);
    expect(find.text('فرعوني'), findsOneWidget);
    expect(find.text('فاتح أو داكن'), findsOneWidget);
  });
}
