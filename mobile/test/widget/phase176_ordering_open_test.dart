import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 176.11 A hosted café with no way to be paid in the app yet (no card
/// gateway of its own, no cash or other way of its own): every dish said
/// "This item isn't sold in the app.", as if the dish were wrong. The store's
/// config now says ordering isn't open (`ordering_open: false`), and each
/// dish says so; a shop that doesn't say (WordPress, older servers) and
/// digital goods on iOS keep the old words.
void main() {
  Future<void> open(
    WidgetTester tester, {
    bool? orderingOpen,
    bool digital = false,
    DevicePlatform platform = DevicePlatform.android,
    String lang = 'en',
  }) async {
    final api = FakeApi(
      config: {
        ...configJson(lms: null, orders: true, languages: languagesJson()),
        'store': {...storeConfigJson(), 'ordering_open': ?orderingOpen},
      },
    )..product = {...productDetailJson(digital: digital), 'purchasable': false};
    final app = TestApp(
      appType: AppType.store,
      guest: true,
      platform: platform,
      api: api,
      preferences: {'settings.language': lang},
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push('/product/21');
    await TestApp.settle(tester);
  }

  testWidgets('no way to pay yet: ordering in the app isn\'t open yet', (
    tester,
  ) async {
    await open(tester, orderingOpen: false);
    expect(find.text("Ordering in the app isn't open yet."), findsOneWidget);
    expect(find.text("This item isn't sold in the app."), findsNothing);
    expect(find.text('Add to cart'), findsNothing);
  });

  for (final (lang, words) in [
    ('ar', 'الطلب من التطبيق غير متاح بعد.'),
    ('tr', 'Uygulamadan sipariş henüz açık değil.'),
  ]) {
    testWidgets('in $lang', (tester) async {
      await open(tester, orderingOpen: false, lang: lang);
      expect(find.text(words), findsOneWidget);
    });
  }

  testWidgets('a shop that doesn\'t say: as before', (tester) async {
    await open(tester);
    expect(find.text("This item isn't sold in the app."), findsOneWidget);
  });

  testWidgets('digital goods on iOS: not sold in the app, as before', (
    tester,
  ) async {
    await open(
      tester,
      orderingOpen: false,
      digital: true,
      platform: DevicePlatform.ios,
    );
    expect(find.text("This item isn't sold in the app."), findsOneWidget);
  });
}
