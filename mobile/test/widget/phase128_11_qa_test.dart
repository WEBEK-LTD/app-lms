import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/modules/travel/travel_paths.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import '../support/travel_fixtures.dart';

/// 128.11 QA of the Studio demos: a transparent header over a cover takes
/// the page's background once the page scrolls under it (Rawaq's name never
/// over its cover's words), at once with reduced motion; and a hotel's
/// scores keep their names apart from their numbers, in English and Arabic.
void main() {
  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(390, 844) * 2
      ..devicePixelRatio = 2
      ..padding = const FakeViewPadding(top: 80, bottom: 68)
      ..viewPadding = const FakeViewPadding(top: 80, bottom: 68);
    addTearDown(tester.view.reset);
  }

  Map<String, dynamic> text(String id, String value) => {
    'id': id,
    'type': 'text',
    'text': value,
  };

  FakeApi studioApi(List<Map<String, dynamic>> children) =>
      FakeApi(config: configJson())
        ..navigation = navigationJson(
          tabs: [
            navTabJson('home', 'Home', 'home', {
              'type': 'page',
              'page_slug': 'home',
            }),
            navTabJson('account', 'Account', 'person', {
              'type': 'screen',
              'screen': 'account',
            }),
          ],
        )
        ..pages = {
          'home': {
            ...appPageJson(blocks: []),
            'studio': {
              'header': {
                'type': 'transparent',
                'buttons': ['notifications'],
              },
              'background': '#F7F4EC',
              'body': {'id': 'root', 'type': 'column', 'children': children},
            },
          },
        };

  final cover = {
    'id': 'photo',
    'type': 'stack',
    'height': 300,
    'image_background_url': 'https://cdn.test/library.jpg',
    'scrim': {'color': '#0E221B', 'from': 0.2, 'to': 0.9},
    'children': [text('on', 'Learn from people who do it')],
  };
  final more = [for (var i = 0; i < 40; i++) text('more$i', 'Course $i')];

  Color? behind(WidgetTester tester) {
    final box = find.byKey(const ValueKey('studio-header-scrolled-under'));
    return box.evaluate().isEmpty ? null : tester.widget<ColoredBox>(box).color;
  }

  group('A transparent header over a cover', () {
    testWidgets('takes the page\'s background once the page scrolls under '
        'it, and gives it back at the top', (tester) async {
      phone(tester);
      await TestApp(
        appType: AppType.lms,
        signedIn: true,
        api: studioApi([cover, ...more]),
      ).pump(tester);
      await TestApp.settle(tester, 20);
      expect(behind(tester)!.a, 0);
      await tester.drag(find.text('Course 3'), const Offset(0, -200));
      await tester.pumpAndSettle();
      expect(behind(tester), const Color(0xFFF7F4EC));
      await tester.drag(find.text('Course 3'), const Offset(0, 400));
      await tester.pumpAndSettle();
      expect(behind(tester)!.a, 0);
    });

    testWidgets('with reduced motion, at once', (tester) async {
      phone(tester);
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(disableAnimations: true);
      addTearDown(
        tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
      );
      await TestApp(
        appType: AppType.lms,
        signedIn: true,
        api: studioApi([cover, ...more]),
      ).pump(tester);
      await TestApp.settle(tester, 20);
      await tester.drag(find.text('Course 3'), const Offset(0, -200));
      await tester.pump();
      await tester.pump();
      expect(behind(tester), const Color(0xFFF7F4EC));
    });

    testWidgets('over anything else: as before, nothing behind it', (
      tester,
    ) async {
      phone(tester);
      await TestApp(
        signedIn: true,
        api: studioApi([text('first', 'Welcome back'), ...more]),
      ).pump(tester);
      await TestApp.settle(tester, 20);
      await tester.drag(find.text('Course 3'), const Offset(0, -200));
      await tester.pumpAndSettle();
      expect(behind(tester), isNull);
    });
  });

  group('A hotel\'s scores', () {
    for (final lang in ['en', 'ar']) {
      testWidgets('keep each name apart from its number ($lang)', (
        tester,
      ) async {
        tester.view
          ..physicalSize = const Size(360, 780) * 3
          ..devicePixelRatio = 3;
        addTearDown(tester.view.reset);
        final api = travelFake(mode: 'hotels');
        final serve = api.travelHandler!;
        api.travelHandler = (method, path, query, body) {
          final out = serve(method, path, query, body);
          if (out is Map<String, dynamic> && path == '/travel/hotels/1') {
            return {
              ...out,
              'score': 8.9,
              'reviews': 412,
              'scores': {
                'staff': 9.1,
                'clean': 9.3,
                'location': 9.6,
                'value': 8.3,
              },
            };
          }
          return out;
        };
        final app = TestApp(
          api: api,
          appType: AppType.travel,
          signedIn: true,
          preferences: {'settings.language': lang},
        );
        await app.pump(tester);
        app.container.read(appRouterProvider).push(TravelPaths.hotel(1));
        await TestApp.settle(tester, 20);
        final rtl = lang == 'ar';
        final names = rtl
            ? {
                'staff': 'الموظفون',
                'clean': 'النظافة',
                'location': 'الموقع',
                'value': 'القيمة مقابل السعر',
              }
            : {
                'staff': 'Staff',
                'clean': 'Cleanliness',
                'location': 'Location',
                'value': 'Value for money',
              };
        for (final MapEntry(:key, value: label) in names.entries) {
          final row = find.byKey(ValueKey('hotel-score-$key'));
          expect(row, findsOneWidget, reason: key);
          final bar = tester.getRect(
            find.descendant(
              of: row,
              matching: find.byType(LinearProgressIndicator),
            ),
          );
          final number = tester.getRect(
            find.descendant(of: row, matching: find.byType(Text)),
          );
          final name = tester.getRect(find.text(label));
          // The name above, the number after its bar (on its left in
          // Arabic), never touching either.
          expect(name.bottom, lessThanOrEqualTo(bar.top), reason: key);
          final gap = rtl ? bar.left - number.right : number.left - bar.right;
          expect(gap, greaterThanOrEqualTo(8), reason: '$key in $lang');
        }
        expect(tester.takeException(), isNull);
      });
    }
  });
}
