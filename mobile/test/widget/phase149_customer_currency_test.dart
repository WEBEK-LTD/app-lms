import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/http_client.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/currency.dart';
import 'package:yallapp/core/l10n/language.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/storage/local_settings.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 149 Prices in the customer's currency, per app: the owner turns them
/// off, or allows only some currencies (`Config.customer_currency`). The
/// app then shows no currency choice, or only those, and sends no
/// `X-Currency` for a currency that isn't allowed.
FakeApi _shop(Map<String, dynamic>? rule) {
  final config = configJson(lms: null, store: true, orders: true);
  config['store'] = {...storeConfigJson(), 'currency': 'EGP'};
  if (rule != null) config['customer_currency'] = rule;
  return FakeApi(config: config);
}

Future<TestApp> _open(
  WidgetTester tester,
  FakeApi api, {
  String region = 'KW',
  Map<String, Object> preferences = const {},
}) async {
  final app = TestApp(
    signedIn: true,
    api: api,
    appType: AppType.store,
    preferences: preferences,
    overrides: [
      deviceLocalesProvider.overrideWithValue([Locale('en', region)]),
    ],
  );
  await app.pump(tester);
  return app;
}

/// What the app's requests carry, as its HTTP client sends them.
String? _sent(TestApp app) {
  final options = RequestOptions(path: '/store/products');
  CurrencyInterceptor(() => app.container.read(appCurrencyProvider))
      .onRequest(options, RequestInterceptorHandler());
  return options.headers['X-Currency'] as String?;
}

void main() {
  group('149 the rule in the config', () {
    test('is read, and an older server means on, any currency', () {
      final rule = CustomerCurrencyRule.fromJson({
        'enabled': true,
        'currencies': ['USD', 'KWD', 'nope', 3],
      });
      expect(rule.currencies, ['USD', 'KWD']);
      expect(rule.allows('USD'), isTrue);
      expect(rule.allows('JPY'), isFalse);
      // The shop's own is always allowed.
      expect(rule.allows('EGP', shop: 'EGP'), isTrue);
      expect(rule.offersChoice(shop: 'EGP'), isTrue);
      expect(
        const CustomerCurrencyRule(currencies: ['EGP'])
            .offersChoice(shop: 'EGP'),
        isFalse,
      );

      final off = CustomerCurrencyRule.fromJson({
        'enabled': false,
        'currencies': <Object>[],
      });
      expect(off.allows('USD'), isFalse);
      expect(off.allows('EGP', shop: 'EGP'), isTrue);
      expect(off.offersChoice(shop: 'EGP'), isFalse);

      final old = AppConfig.fromJson(configJson(lms: null, store: true));
      expect(old.customerCurrency, CustomerCurrencyRule.any);
      expect(old.customerCurrency.allows('JPY'), isTrue);
      final given = AppConfig.fromJson({
        ...configJson(lms: null, store: true),
        'customer_currency': {
          'enabled': true,
          'currencies': ['USD'],
        },
      });
      expect(
        given.customerCurrency,
        const CustomerCurrencyRule(currencies: ['USD']),
      );
    });
  });

  testWidgets(
    '149 switched off: no Settings › Currency, and no X-Currency, even for a currency picked before',
    (tester) async {
      final app = await _open(
        tester,
        _shop({'enabled': false, 'currencies': <Object>[]}),
        preferences: {'settings.currency': 'JPY'},
      );
      expect(app.container.read(appCurrencyProvider), isNull);
      expect(_sent(app), isNull);

      app.container.read(appRouterProvider).push('/account/settings');
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('currency-tile')), findsNothing);
      // The pick stays saved, for when the owner turns it back on.
      expect(
        app.container
            .read(sharedPreferencesProvider)
            .getString('settings.currency'),
        'JPY',
      );
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    '149 only some currencies: the region\'s is sent when it is one of them, else none',
    (tester) async {
      final rule = {
        'enabled': true,
        'currencies': ['USD', 'JPY'],
      };
      final kuwait = await _open(tester, _shop(rule));
      expect(kuwait.container.read(appCurrencyProvider), isNull);
      expect(_sent(kuwait), isNull);
      await tester.pumpWidget(const SizedBox());

      final us = await _open(tester, _shop(rule), region: 'US');
      expect(us.container.read(appCurrencyProvider), 'USD');
      expect(_sent(us), 'USD');
      await tester.pumpWidget(const SizedBox());

      // The shop's own is always allowed (the server adds no `display` for it).
      final egypt = await _open(tester, _shop(rule), region: 'EG');
      expect(egypt.container.read(appCurrencyProvider), 'EGP');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    '149 only some currencies: the picker lists the shop\'s and those, even from an answer that lists more',
    (tester) async {
      final api = _shop({
        'enabled': true,
        'currencies': ['USD', 'JPY'],
      });
      final app = await _open(tester, api);
      app.container.read(appRouterProvider).push('/account/settings');
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('currency-tile')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('currency-tile')));
      await TestApp.settle(tester);
      expect(find.byKey(const ValueKey('currency-EGP')), findsOneWidget);
      expect(find.byKey(const ValueKey('currency-USD')), findsOneWidget);
      expect(find.byKey(const ValueKey('currency-JPY')), findsOneWidget);
      expect(find.byKey(const ValueKey('currency-KWD')), findsNothing);
      // The region's (KWD) isn't one of them: not offered.
      expect(find.text('Your region'), findsNothing);
      await tester.tap(find.byKey(const ValueKey('currency-JPY')));
      await TestApp.settle(tester);
      expect(app.container.read(appCurrencyProvider), 'JPY');
      expect(_sent(app), 'JPY');
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('149 only the shop\'s own allowed: no choice to offer', (
    tester,
  ) async {
    final app = await _open(
      tester,
      _shop({
        'enabled': true,
        'currencies': ['EGP'],
      }),
    );
    expect(app.container.read(appCurrencyProvider), isNull);
    app.container.read(appRouterProvider).push('/account/settings');
    await TestApp.settle(tester);
    expect(find.byKey(const ValueKey('currency-tile')), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
