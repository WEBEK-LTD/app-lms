import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/theme/palette.dart';
import 'package:yallapp/core/widgets/premium_chrome.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 130.58 The staff app's screens in the project's premium chrome: in a
/// Studio project with a system screens' look (`Config.screens.system`) a
/// payslip, the payslips and leave are drawn as the system screens are (the
/// look's header with the round glass back button, its backdrop and its
/// cards), light and dark, right to left, snapping with reduced motion;
/// without a look, the classic app bar exactly as before.
void main() {
  FakeApi staffApi({String? look}) {
    final api = FakeApi(
      config: {
        ...configJson(lms: null, languages: languagesJson()),
        'school': schoolConfigJson(),
        if (look != null)
          'screens': {
            'system': {'look': look},
          },
      },
    );
    api.me = {
      ...userJson(),
      'roles': ['staff'],
    };
    api.schoolMe = schoolMeJson(roles: ['staff']);
    return api;
  }

  Future<TestApp> open(
    WidgetTester tester,
    FakeApi api, {
    bool dark = false,
    String language = 'en',
  }) async {
    final view = tester.view
      ..physicalSize = const Size(390, 844) * 2
      ..devicePixelRatio = 2;
    addTearDown(view.reset);
    final app = TestApp(
      api: api,
      appType: AppType.school,
      signedIn: true,
      preferences: {
        'settings.theme_mode': dark ? 'dark' : 'light',
        'settings.language': language,
      },
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    final router = app.container.read(appRouterProvider);
    router.go(Paths.staff);
    await TestApp.settle(tester, 20);
    router.push(Paths.staffPayslips);
    await TestApp.settle(tester, 20);
    router.push(Paths.staffPayslip(42));
    await TestApp.settle(tester, 20);
    return app;
  }

  final payslip = find.byKey(const ValueKey('payslip'));
  final net = find.byKey(const ValueKey('payslip-net'));

  group('130.58 the staff app in the premium chrome', () {
    for (final look in ['large', 'glass', 'photo', 'brand']) {
      testWidgets('a payslip in the $look look', (tester) async {
        await open(tester, staffApi(look: look));
        expect(payslip, findsOneWidget);
        expect(find.byKey(ValueKey('system-screen-app-$look')), findsOneWidget);
        expect(find.byKey(ValueKey('chrome-header-$look')), findsOneWidget);
        expect(find.byKey(const ValueKey('chrome-back')), findsOneWidget);
        // The title large in the header (and its compact bar's, folded).
        expect(find.text('October 2026'), findsWidgets);
        // No classic app bar on the payslip.
        expect(
          find.ancestor(of: payslip, matching: find.byType(Scaffold)),
          findsOneWidget,
        );
        expect(
          find.descendant(
            of: find.byKey(ValueKey('system-screen-app-$look')),
            matching: find.byType(AppBar),
          ),
          findsNothing,
        );
        // Its parts in the look: the lines on a soft inset card.
        expect(SystemScreenArea.lookOf(tester.element(net))?.name, look);

        // Back to the payslips, also in the look.
        await tester.tap(find.byKey(const ValueKey('chrome-back')));
        await TestApp.settle(tester, 20);
        expect(find.byKey(const ValueKey('payslips')), findsOneWidget);
        expect(find.byKey(ValueKey('system-screen-app-$look')), findsOneWidget);
      });
    }

    testWidgets('without a look, the classic app bar as before', (
      tester,
    ) async {
      await open(tester, staffApi());
      expect(payslip, findsOneWidget);
      expect(find.byKey(const ValueKey('chrome-back')), findsNothing);
      expect(
        find.byWidgetPredicate((w) => w is Scaffold && w.key is ValueKey),
        findsNothing,
      );
      final bar = find.byType(AppBar);
      expect(bar, findsOneWidget);
      expect(
        find.descendant(of: bar, matching: find.text('October 2026')),
        findsOneWidget,
      );
      expect(SystemScreenArea.lookOf(tester.element(net)), isNull);
    });

    testWidgets('dark: the look by night', (tester) async {
      await open(tester, staffApi(look: 'glass'), dark: true);
      final frame = find.byKey(const ValueKey('system-screen-app-glass'));
      expect(frame, findsOneWidget);
      final p = tester.element(net).palette;
      expect(p.isDark, isTrue);
      expect(tester.widget<Scaffold>(frame).backgroundColor, p.background);
    });

    testWidgets('right to left: the back button at the start, on the right', (
      tester,
    ) async {
      await open(tester, staffApi(look: 'brand'), language: 'ar');
      expect(
        find.byKey(const ValueKey('system-screen-app-brand')),
        findsOneWidget,
      );
      final back = find.byKey(const ValueKey('chrome-back'));
      expect(Directionality.of(tester.element(back)), TextDirection.rtl);
      expect(tester.getCenter(back).dx, greaterThan(390 / 2));
    });

    testWidgets('with reduced motion the header snaps as it folds', (
      tester,
    ) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await open(tester, staffApi(look: 'photo'));
      final header = find.byKey(const ValueKey('chrome-header-photo'));
      final open0 = tester.getSize(header).height;
      await tester.drag(payslip, const Offset(0, -20));
      await tester.pump();
      expect(tester.getSize(header).height, open0);
      await tester.drag(payslip, const Offset(0, -200));
      await tester.pump();
      expect(tester.getSize(header).height, lessThan(open0 - 100));
      await tester.pump(const Duration(seconds: 3));
    });

    testWidgets('leave keeps its button in the look', (tester) async {
      final app = await open(tester, staffApi(look: 'large'));
      app.container.read(appRouterProvider).push(Paths.staffLeave);
      await TestApp.settle(tester, 20);
      expect(
        find.byKey(const ValueKey('system-screen-app-large')),
        findsWidgets,
      );
      expect(find.byKey(const ValueKey('leave-ask')), findsOneWidget);
    });
  });
}
