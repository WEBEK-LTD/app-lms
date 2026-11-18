import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/web/pay_sheet.dart';
import 'package:yallapp/core/web/pay_sheet_view.dart';
import 'package:yallapp/core/web/stripe_pay_sheet.dart';
import 'package:yallapp/core/web/web_page_screen.dart';

import '../../tool/src/build_config_tool.dart'
    show applePayMerchantIdOf, renderDartConfig, validateBuildConfig;
import '../support/test_app.dart';

/// 188 Stripe's PaymentSheet in the app: the payment page stays in the
/// app's web view; when the buyer pays with Stripe there, the page asks the
/// app (`YallappPay`), the app gets the PaymentIntent with the payment's
/// token, shows Stripe's native sheet (card, Apple Pay, Google Pay), and the
/// platform's status, never the sheet alone, says whether it's paid.
void main() {
  const appId = '3f2a9c1e-7b4d-4e8a-9c0f-1a2b3c4d5e6f';
  const token = 'tok_ABCdef0123456789-_xyz';
  const page = 'https://yallapp.com.tr/pay/$token';
  const inApp = '$page/in-app';
  final request = jsonEncode({'type': 'stripe_sheet'});

  BuildConfigData withAppId(BuildConfigData b) => b.copyWith(
    appId: appId,
    linkBaseUrl: 'https://yallapp.com.tr/a/$appId',
    apiBaseUrl: 'https://yallapp.com.tr/api/app/$appId',
  );

  const ready = {
    'state': 'ready',
    'publishable_key': 'pk_test_51Abcdefghijklmnop',
    'client_secret': 'pi_test_1fake_secret_fake',
    'merchant_country': 'AE',
    'currency': 'USD',
    'amount_cents': 4500,
    'merchant_name': 'Harbour Mugs',
    'test_mode': true,
  };

  group('the payment page and its messages', () {
    final build = withAppId(testBuild);

    test("the payment page itself, or the link the apps are handed", () {
      Uri? of(String url) => payPageOf(Uri.parse(url), build);
      expect(of(page), Uri.parse(page));
      expect(of(inApp), Uri.parse(page));
      expect(of('$inApp?payment=failed'), Uri.parse(page));
      expect(of('$page/order-received'), isNull);
      expect(of('$page/app'), isNull);
      expect(of('http://yallapp.com.tr/pay/$token'), isNull);
      expect(of('https://evil.example/pay/$token/in-app'), isNull);
      expect(of('https://yallapp.com.tr/give/$token'), isNull);
      expect(of('https://yallapp.com.tr/pay/short/in-app'), isNull);
      // Builds without the platform's hosts never take it.
      expect(payPageOf(Uri.parse(inApp), testBuild), isNull);
    });

    test('only a sheet request starts the sheet', () {
      expect(isSheetRequest(request), isTrue);
      expect(isSheetRequest('{"type":"other"}'), isFalse);
      expect(isSheetRequest('not json'), isFalse);
      expect(isSheetRequest('[1]'), isFalse);
      expect(jsonDecode(sheetResultMessage('canceled')), {
        'type': 'stripe_sheet',
        'result': 'canceled',
      });
    });

    test("reads the platform's answer, and nothing that isn't a sheet's", () {
      final answer = SheetAnswer.fromJson(ready);
      expect(answer.state, SheetAnswerState.ready);
      expect(answer.setup!.publishableKey, 'pk_test_51Abcdefghijklmnop');
      expect(answer.setup!.clientSecret, 'pi_test_1fake_secret_fake');
      expect(answer.setup!.merchantCountry, 'AE');
      expect(answer.setup!.currency, 'USD');
      expect(answer.setup!.amountCents, 4500);
      expect(answer.setup!.testMode, isTrue);
      // A secret key is never a publishable key.
      expect(
        SheetAnswer.fromJson({...ready, 'publishable_key': 'sk_test_x'}).state,
        SheetAnswerState.failed,
      );
      expect(
        SheetAnswer.fromJson({...ready, 'merchant_country': 'xx1'})
            .setup!
            .merchantCountry,
        isNull,
      );
      expect(
        SheetAnswer.fromJson({'state': 'paid'}).state,
        SheetAnswerState.paid,
      );
      expect(
        SheetAnswer.fromJson({'state': 'unavailable'}).state,
        SheetAnswerState.unavailable,
      );
      expect(
        SheetAnswer.fromJson({'state': 'expired'}).state,
        SheetAnswerState.closed,
      );
      expect(SheetAnswer.fromJson(null).state, SheetAnswerState.failed);
    });
  });

  group('the hand-off', () {
    late _FakePresenter presenter;
    late List<String> sent;
    late List<Uri> paid;
    late List<PayStatus> statuses;
    late SheetAnswer answer;

    setUp(() {
      presenter = _FakePresenter();
      sent = [];
      paid = [];
      statuses = [const PayStatus(PayState.started)];
      answer = SheetAnswer.fromJson(ready);
    });

    StripePagePayment payment({String? merchant}) => StripePagePayment(
      page: Uri.parse(page),
      readSetup: (p) async {
        expect(p, Uri.parse(page));
        return answer;
      },
      presenter: presenter,
      readStatus: (p) async {
        expect(p, Uri.parse(page));
        return statuses.length > 1 ? statuses.removeAt(0) : statuses.first;
      },
      toPage: (m) async => sent.add(m),
      onPaid: paid.add,
      applePayMerchantId: merchant,
      waits: const [Duration.zero, Duration.zero],
    );

    test('paid once the platform says so: the order received page', () async {
      presenter.outcome = SheetOutcome.completed;
      statuses = [
        const PayStatus(PayState.started),
        const PayStatus(PayState.paid, shopOrder: 'placed'),
      ];
      await payment(merchant: 'merchant.com.harbour.mugs').run();
      expect(presenter.shown.single.clientSecret, 'pi_test_1fake_secret_fake');
      expect(presenter.merchants.single, 'merchant.com.harbour.mugs');
      expect(paid, [Uri.parse('$page/order-received?shop_order=placed')]);
      expect(sent, isEmpty);
    });

    test('the sheet saying done is not enough: pending until the platform '
        'sees it', () async {
      presenter.outcome = SheetOutcome.completed;
      await payment().run();
      expect(paid, isEmpty);
      expect(sent, [sheetResultMessage('pending')]);
    });

    test('cancelled or failed: back on the page, to pay again', () async {
      presenter.outcome = SheetOutcome.canceled;
      await payment().run();
      presenter.outcome = SheetOutcome.failed;
      await payment().run();
      expect(sent, [
        sheetResultMessage('canceled'),
        sheetResultMessage('failed'),
      ]);
      expect(paid, isEmpty);
    });

    test('cancelled, but the platform has it paid: paid', () async {
      presenter.outcome = SheetOutcome.canceled;
      statuses = [const PayStatus(PayState.paid)];
      await payment().run();
      expect(paid, [Uri.parse('$page/order-received')]);
    });

    test("paid already: no sheet; Stripe's own form when the sheet can't "
        'take it', () async {
      answer = const SheetAnswer(SheetAnswerState.paid);
      statuses = [const PayStatus(PayState.paid)];
      await payment().run();
      expect(presenter.shown, isEmpty);
      expect(paid, hasLength(1));
      answer = const SheetAnswer(SheetAnswerState.unavailable);
      await payment().run();
      expect(sent, [sheetResultMessage('unavailable')]);
      expect(presenter.shown, isEmpty);
    });

    test('one sheet at a time', () async {
      final p = payment();
      presenter.outcome = SheetOutcome.canceled;
      await Future.wait([p.run(), p.run()]);
      expect(presenter.shown, hasLength(1));
    });

    test('the platform out of reach: the page offers it again', () async {
      final p = StripePagePayment(
        page: Uri.parse(page),
        readSetup: (_) async => throw Exception('offline'),
        presenter: presenter,
        readStatus: (_) async => const PayStatus(PayState.started),
        toPage: (m) async => sent.add(m),
        onPaid: paid.add,
      );
      await p.run();
      expect(sent, [sheetResultMessage('failed')]);
    });
  });

  group('the payment screen', () {
    late _FakePresenter presenter;
    late List<PayStatus> statuses;

    setUp(() {
      presenter = _FakePresenter()..outcome = SheetOutcome.completed;
      statuses = [const PayStatus(PayState.paid)];
    });

    Future<({TestApp app, Future<bool?> popped, List<Uri> completed})> open(
      WidgetTester tester, {
      String url = inApp,
      StripeSheetPresenter? sheet,
      bool withSheet = true,
    }) async {
      final app = TestApp(
        appType: AppType.store,
        signedIn: true,
        build: withAppId,
        overrides: [
          stripeSheetPresenterProvider.overrideWithValue(
            withSheet ? (sheet ?? presenter) : null,
          ),
          sheetSetupReaderProvider.overrideWithValue(
            (_) async => SheetAnswer.fromJson(ready),
          ),
          payStatusReaderProvider.overrideWithValue(
            (_) async =>
                statuses.length > 1 ? statuses.removeAt(0) : statuses.first,
          ),
        ],
      );
      await app.pump(tester);
      await TestApp.settle(tester, 10);
      final completed = <Uri>[];
      final popped = app.container
          .read(appRouterProvider)
          .push<bool>(
            Paths.web,
            extra: WebPageArgs(
              url: url,
              title: 'Checkout',
              completesOn: (u) => u.pathSegments.contains('order-received'),
              onCompleted: completed.add,
            ),
          );
      await TestApp.settle(tester, 6);
      return (app: app, popped: popped, completed: completed);
    }

    testWidgets("stays in the app's web view, never the browser sheet", (
      tester,
    ) async {
      final opened = await open(tester);
      expect(find.byType(PaySheetFlow), findsNothing);
      final pageView = opened.app.webViews.requests.last;
      expect(pageView.url, Uri.parse(inApp));
      expect(pageView.channels.keys, contains(payChannelName));
    });

    testWidgets(
      "the page's request: Stripe's sheet, then the order as before",
      (tester) async {
        final opened = await open(tester);
        opened.app.webViews.post(payChannelName, request);
        await TestApp.settle(tester, 6);
        expect(presenter.shown, hasLength(1));
        expect(opened.completed, [Uri.parse('$page/order-received')]);
        expect(await opened.popped, isTrue);
      },
    );

    testWidgets('cancelled: the page hears it and the screen stays', (
      tester,
    ) async {
      presenter.outcome = SheetOutcome.canceled;
      statuses = [const PayStatus(PayState.started)];
      final opened = await open(tester);
      opened.app.webViews.post(payChannelName, request);
      await TestApp.settle(tester, 6);
      expect(opened.app.webViews.sent, [sheetResultMessage('canceled')]);
      expect(opened.completed, isEmpty);
      expect(find.byType(WebPageScreen), findsOneWidget);
    });

    testWidgets('another message from the page changes nothing', (
      tester,
    ) async {
      final opened = await open(tester);
      opened.app.webViews.post(payChannelName, '{"type":"other"}');
      await TestApp.settle(tester, 4);
      expect(presenter.shown, isEmpty);
      expect(opened.completed, isEmpty);
    });

    testWidgets("a shop's own website checkout has no channel", (tester) async {
      final opened = await open(
        tester,
        url: 'https://your-academy.com/checkout/',
      );
      expect(
        opened.app.webViews.requests.last.channels.keys,
        isNot(contains(payChannelName)),
      );
    });

    testWidgets("where the sheet can't show: Stripe's form in the page", (
      tester,
    ) async {
      final opened = await open(tester, withSheet: false);
      expect(
        opened.app.webViews.requests.last.channels.keys,
        isNot(contains(payChannelName)),
      );
    });
  });

  group('the build config', () {
    Map<String, dynamic> config([Map<String, dynamic>? payments]) => {
      'schema_version': 1,
      'app_type': 'store',
      'app_name': 'Harbour Mugs',
      'short_name': 'Mugs',
      'site_url': 'https://yallapp.com.tr',
      'android_package': 'com.harbour.mugs',
      'ios_bundle_id': 'com.harbour.mugs',
      'version_name': '1.0.0',
      'version_code': 1,
      'branding': {
        'primary_color': '#0E0D24',
        'splash_color': '#FFFFFF',
        'template': 'classic',
        'font': 'Bricolage Grotesque',
      },
      'payments': ?payments,
    };

    test('carries the Apple Pay merchant ID into the app', () {
      final c = config({'apple_pay_merchant_id': 'merchant.com.harbour.mugs'});
      expect(validateBuildConfig(c).errors, isEmpty);
      expect(applePayMerchantIdOf(c), 'merchant.com.harbour.mugs');
      expect(
        renderDartConfig(c),
        contains("applePayMerchantId: 'merchant.com.harbour.mugs',"),
      );
      expect(renderDartConfig(config()), contains('applePayMerchantId: null,'));
    });

    test('refuses a merchant ID that is not one', () {
      expect(
        validateBuildConfig(
          config({'apple_pay_merchant_id': 'com.harbour.mugs'}),
        ).errors,
        isNotEmpty,
      );
      expect(
        validateBuildConfig(config({'other': 'x'})).errors,
        contains('Unknown field "payments.other".'),
      );
    });
  });
}

class _FakePresenter implements StripeSheetPresenter {
  SheetOutcome outcome = SheetOutcome.canceled;
  final shown = <StripeSheetSetup>[];
  final merchants = <String?>[];

  @override
  Future<SheetOutcome> present(
    StripeSheetSetup setup, {
    String? applePayMerchantId,
    required bool dark,
  }) async {
    shown.add(setup);
    merchants.add(applePayMerchantId);
    await Future<void>.delayed(Duration.zero);
    return outcome;
  }
}
