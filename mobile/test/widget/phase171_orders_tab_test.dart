import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/modules/lms/teachers/teachers_screen.dart';
import 'package:yallapp/modules/shared/account/notifications_screen.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/widgets/app_nav_bar.dart';
import 'package:yallapp/core/widgets/buttons.dart';
import 'package:yallapp/core/widgets/premium_chrome.dart';
import 'package:yallapp/modules/shared/account/order_journey.dart';
import 'package:yallapp/modules/shared/account/order_screen.dart';
import 'package:yallapp/modules/shared/auth/sign_in_screen.dart';
import 'package:yallapp/modules/shared/pages/premium/premium_timeline.dart';

import '../screenshots/support/leqaa.dart';
import '../screenshots/support/shot.dart' show loadAppFonts;
import '../screenshots/support/studio_demo.dart';
import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 171 QA on Leqaa's app (its two Signature looks, the petal bar): the
/// Orders tab opened Orders on top, a back button and no bar, Account and
/// the other tabs out of reach until Back. Now each of the five tabs shows
/// its screen in its place, the bar under it, signed in; signed out the
/// Orders and Account tabs ask to sign in, and "Not now" comes back to the
/// tabs. An order opened from the Orders tab covers the bar, and Back
/// returns to the tab. And "How your flowers travel" with no order showed
/// a sample journey, "Order placed" lit: now nothing but "No orders yet";
/// with an order, that order's own step. Look A and B, English and Arabic
/// (left to right and right to left).

Map<String, dynamic> _order({
  int id = 1043,
  String status = 'processing',
  Map<String, Object?>? stage,
  String created = '2026-11-16T09:00:00Z',
}) => {
  ...orderJson(),
  'id': id,
  'number': '$id',
  'status': status,
  'status_label': status == 'completed' ? 'Completed' : 'Processing',
  'created_at': created,
  'items': [
    {'name': 'Blush Garden', 'product_id': 101, 'quantity': 1},
  ],
  'stage': stage,
};

const _shipped = {'code': 'shipped', 'label': 'Out for delivery'};

/// The tabs' places, in the bar's order (Leqaa's five): its home is its
/// Studio page.
final _places = [
  Paths.page('home'),
  Paths.shop,
  Paths.cart,
  Paths.orders,
  Paths.account,
];

class _Leqaa {
  _Leqaa(this.app, this.labels, this.journeyTitle);

  final TestApp app;

  /// The tabs' names in the bar, in its order.
  final List<String> labels;

  /// "How your flowers travel" in the app's language.
  final String journeyTitle;

  /// Where the app is: the screen on top, pushed or not.
  String get where =>
      app.container.read(appRouterProvider).state.uri.toString();
}

Future<_Leqaa> _open(
  WidgetTester tester, {
  required String look,
  String lang = 'en',
  bool signedIn = true,
  List<Map<String, dynamic>> orders = const [],
}) async {
  tester.view
    ..physicalSize = const Size(390, 844) * 2
    ..devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  StudioDemo.language = lang;
  final demo = StudioDemo.signature('flowers', look);
  final api = leqaaStudioApi(look: demo, lang: lang)..orders = [...orders];
  await demo.prepare(tester, leqaaPhotoPaths);
  final app = TestApp(
    api: api,
    appType: AppType.store,
    signedIn: signedIn,
    guest: !signedIn,
    preferences: {'settings.language': lang},
  );
  await app.pump(tester);
  await TestApp.settle(tester, 30);
  final tabs = (api.navigation!['tabs'] as List).cast<Map<String, dynamic>>();
  expect(tabs.map((t) => t['id']), [
    'home',
    'shop',
    'cart',
    'orders',
    'account',
  ]);
  // The heading over the journey, as the page has it.
  final body =
      ((api.pages['orders']!['studio'] as Map)['body'] as Map)['children']
          as List;
  String? firstText(Object? node) {
    if (node is! Map) return null;
    if (node['type'] == 'text') return node['text'] as String?;
    for (final c in (node['children'] as List? ?? const [])) {
      final t = firstText(c);
      if (t != null) return t;
    }
    return null;
  }

  return _Leqaa(app, [
    for (final t in tabs) t['label'] as String,
  ], firstText(body.first)!);
}

Finder _bar() => find.byType(AppNavBar);

Finder _tab(String label) => find.descendant(
  of: _bar(),
  matching: find.byWidgetPredicate(
    (w) =>
        w is Semantics &&
        w.properties.button == true &&
        (w.properties.label ?? '').startsWith(label),
  ),
);

Finder _back() => find.byWidgetPredicate(
  (w) => w is AppBackButton || w is ChromeBackButton || w is BackButton,
);

Future<void> _tapTab(WidgetTester tester, _Leqaa l, int i) async {
  final tab = _tab(l.labels[i]);
  expect(tab, findsOneWidget, reason: 'the ${l.labels[i]} tab');
  await tester.tap(tab, warnIfMissed: false);
  await TestApp.settle(tester, 30);
}

/// The bar is on screen and nothing is over it.
void _expectTabs(_Leqaa l, String place) {
  expect(Uri.parse(l.where).path, place);
  expect(_bar(), findsOneWidget, reason: 'the bar under $place');
  expect(_bar().hitTestable(), findsOneWidget, reason: 'the bar on top');
  expect(_back(), findsNothing, reason: 'no back button on $place');
}

void main() {
  // The app's own fonts, as on a phone (the test font is wider).
  setUpAll(loadAppFonts);

  for (final look in ['a', 'b']) {
    for (final lang in ['en', 'ar']) {
      final named = 'look ${look.toUpperCase()}, $lang';

      group('171 Leqaa ($named)', () {
        testWidgets('signed in: every tab in its place, the bar under it', (
          tester,
        ) async {
          final l = await _open(
            tester,
            look: look,
            lang: lang,
            orders: [_order(stage: _shipped)],
          );
          expect(
            Directionality.of(tester.element(_bar())),
            lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
          );
          _expectTabs(l, _places.first);
          for (final i in [3, 4, 1, 2, 3, 0, 4, 3]) {
            await _tapTab(tester, l, i);
            _expectTabs(l, _places[i]);
          }
          expect(tester.takeException(), isNull);
        });

        testWidgets('signed in: an order covers the bar, Back returns to '
            'the Orders tab', (tester) async {
          final l = await _open(
            tester,
            look: look,
            lang: lang,
            orders: [_order(stage: _shipped)],
          );
          await _tapTab(tester, l, 3);
          _expectTabs(l, Paths.orders);
          // The journey over the list opens its order.
          await tester.tap(find.byType(OrderJourneyTimeline));
          await TestApp.settle(tester, 30);
          expect(find.byType(OrderScreen), findsOneWidget);
          expect(l.where, Paths.order(1043));
          expect(_bar().hitTestable(), findsNothing);
          expect(_back().hitTestable(), findsWidgets);
          await tester.tap(_back().hitTestable().first);
          await TestApp.settle(tester, 30);
          _expectTabs(l, Paths.orders);
          // Account from there, then the Orders tab again: its list.
          await _tapTab(tester, l, 4);
          _expectTabs(l, Paths.account);
          await _tapTab(tester, l, 3);
          _expectTabs(l, Paths.orders);
        });

        testWidgets('signed in, no orders: "No orders yet", no journey', (
          tester,
        ) async {
          final l = await _open(tester, look: look, lang: lang);
          await _tapTab(tester, l, 3);
          _expectTabs(l, Paths.orders);
          expect(
            find.text(lang == 'ar' ? 'لا توجد طلبات بعد' : 'No orders yet'),
            findsOneWidget,
          );
          expect(find.byType(PremiumTimeline), findsNothing);
          expect(find.byType(OrderJourneyTimeline), findsNothing);
          expect(find.text(l.journeyTitle), findsNothing);
          expect(
            find.bySemanticsLabel(RegExp('Current step|الخطوة الحالية')),
            findsNothing,
          );
        });

        testWidgets('signed in, an order on its way: its own step', (
          tester,
        ) async {
          final l = await _open(
            tester,
            look: look,
            lang: lang,
            orders: [
              _order(stage: _shipped),
              _order(
                id: 1040,
                stage: {'code': 'preparing', 'label': 'Preparing'},
                created: '2026-11-10T09:00:00Z',
              ),
            ],
          );
          await _tapTab(tester, l, 3);
          _expectTabs(l, Paths.orders);
          expect(find.text(l.journeyTitle), findsOneWidget);
          final timeline = tester.widget<PremiumTimeline>(
            find.byType(PremiumTimeline),
          );
          // Shipped: "On its way", the third of the four steps.
          expect(timeline.activeStep, 2);
          expect(
            find.descendant(
              of: find.byType(OrderJourneyTimeline),
              matching: find.text(
                lang == 'ar' ? 'الطلب رقم 1043' : 'Order #1043',
              ),
            ),
            findsOneWidget,
          );
        });

        testWidgets('signed in, only a delivered order: the last step', (
          tester,
        ) async {
          final l = await _open(
            tester,
            look: look,
            lang: lang,
            // 200.3 Delivered a few hours ago, by today's clock: the journey
            // keeps a delivered order for three days (deliveredJourneyKept),
            // so a fixed date stops being followed once it is past.
            orders: [
              _order(
                id: 1050,
                status: 'completed',
                created: DateTime.now()
                    .toUtc()
                    .subtract(const Duration(hours: 6))
                    .toIso8601String(),
              ),
            ],
          );
          await _tapTab(tester, l, 3);
          _expectTabs(l, Paths.orders);
          final timeline = tester.widget<PremiumTimeline>(
            find.byType(PremiumTimeline),
          );
          expect(timeline.activeStep, 3);
        });

        testWidgets('signed out: the shop\'s tabs keep the bar; Orders asks '
            'to sign in and "Not now" comes back', (tester) async {
          final l = await _open(
            tester,
            look: look,
            lang: lang,
            signedIn: false,
          );
          _expectTabs(l, _places.first);
          for (final i in [1, 2, 0]) {
            await _tapTab(tester, l, i);
            _expectTabs(l, _places[i]);
          }
          await _tapTab(tester, l, 3);
          expect(find.byType(SignInScreen), findsOneWidget);
          expect(Uri.parse(l.where).path, Paths.signIn);
          expect(Uri.parse(l.where).queryParameters['from'], Paths.orders);
          await tester.tap(
            find.text(lang == 'ar' ? 'ليس الآن' : 'Not now').first,
          );
          await TestApp.settle(tester, 30);
          expect(find.byType(SignInScreen), findsNothing);
          expect(_bar(), findsOneWidget);
          expect(_back(), findsNothing);
          // No journey signed out, nor orders asked.
          expect(find.byType(OrderJourneyTimeline), findsNothing);
          expect(l.app.api.count('listOrders'), 0);
        });
      });
    }
  }

  // 171 Every other tab of a screen that can also open on top: an
  // academy's teachers (Rawaq Academy's Teachers tab) and the
  // notifications, in its place with the bar; from the home's buttons and
  // the bell, on top as before.
  group('171 other tabs of screens that open on top too', () {
    FakeApi academy(List<Map<String, dynamic>> middle) =>
        FakeApi(
            config: {
              ...configJson(lms: null),
              'vertical': 'instructors',
              'instructors': {'applications': true, 'timezone': 'Africa/Cairo'},
            },
          )
          ..navigation = navigationJson(
            tabs: [
              navTabJson('home', 'Home', 'home', {
                'type': 'screen',
                'screen': 'courses',
              }),
              navTabJson('mine', 'My courses', 'school', {
                'type': 'screen',
                'screen': 'my_courses',
              }),
              ...middle,
              navTabJson('account', 'Account', 'person', {
                'type': 'screen',
                'screen': 'account',
              }),
            ],
          );

    Future<TestApp> start(WidgetTester tester, FakeApi api, String lang) async {
      tester.view
        ..physicalSize = const Size(390, 844) * 2
        ..devicePixelRatio = 2;
      addTearDown(tester.view.reset);
      final app = TestApp(
        api: api,
        signedIn: true,
        preferences: {'settings.language': lang},
      );
      await app.pump(tester);
      await TestApp.settle(tester, 30);
      return app;
    }

    String where(TestApp app) =>
        app.container.read(appRouterProvider).state.uri.path;

    for (final lang in ['en', 'ar']) {
      testWidgets('the Teachers tab ($lang)', (tester) async {
        final app = await start(
          tester,
          academy([
            navTabJson('teachers', 'Teachers', 'co_present', {
              'type': 'screen',
              'screen': 'teachers',
            }),
          ]),
          lang,
        );
        await tester.tap(_tab('Teachers'));
        await TestApp.settle(tester, 30);
        expect(where(app), Paths.teachers);
        expect(find.byType(TeachersScreen), findsOneWidget);
        expect(_bar().hitTestable(), findsOneWidget);
        expect(_back(), findsNothing);
        await tester.tap(_tab('Account'));
        await TestApp.settle(tester, 30);
        expect(where(app), Paths.account);
        await tester.tap(_tab('Teachers'));
        await TestApp.settle(tester, 30);
        expect(where(app), Paths.teachers);
        expect(_bar().hitTestable(), findsOneWidget);
      });

      testWidgets('the Notifications tab ($lang)', (tester) async {
        final app = await start(
          tester,
          academy([
            navTabJson('alerts', 'Alerts', 'notifications', {
              'type': 'screen',
              'screen': 'notifications',
            }),
          ]),
          lang,
        );
        await tester.tap(_tab('Alerts'));
        await TestApp.settle(tester, 30);
        expect(where(app), Paths.notifications);
        expect(find.byType(NotificationsScreen), findsOneWidget);
        expect(_bar().hitTestable(), findsOneWidget);
        expect(_back(), findsNothing);
        await tester.tap(_tab('Home'));
        await TestApp.settle(tester, 30);
        expect(where(app), Paths.courses);
        expect(_bar().hitTestable(), findsOneWidget);
      });
    }

    testWidgets('without a tab, the teachers open on top with a back button', (
      tester,
    ) async {
      final app = await start(tester, academy([]), 'en');
      final home = where(app);
      app.container.read(appRouterProvider).push(Paths.teachers);
      await TestApp.settle(tester, 30);
      expect(find.byType(TeachersScreen), findsOneWidget);
      expect(_bar().hitTestable(), findsNothing);
      expect(_back().hitTestable(), findsWidgets);
      await tester.tap(_back().hitTestable().first);
      await TestApp.settle(tester, 30);
      expect(where(app), home);
      expect(_bar().hitTestable(), findsOneWidget);
    });
  });
}
