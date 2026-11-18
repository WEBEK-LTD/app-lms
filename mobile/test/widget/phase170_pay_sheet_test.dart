import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/app_environment.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/preview/preview.dart';
import 'package:yallapp/core/providers.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/web/pay_sheet.dart';
import 'package:yallapp/core/web/pay_sheet_view.dart';
import 'package:yallapp/core/web/web_page_screen.dart';
import 'package:yallapp/core/widgets/buttons.dart';

import '../../tool/src/build_config_tool.dart' show returnSchemeOf;
import '../support/test_app.dart';

/// 170 Paying in the app in the phone's browser sheet: Yallapp's payment
/// page opens in SFSafariViewController / Chrome Custom Tabs (Apple Pay and
/// Google Pay show there), the return link or the app coming back reads the
/// payment's state from the platform, and every other page, the preview and
/// builds without an app ID keep the web view.
void main() {
  const appId = '3f2a9c1e-7b4d-4e8a-9c0f-1a2b3c4d5e6f';
  const scheme = 'yallapp-3f2a9c1e7b4d4e8a9c0f1a2b3c4d5e6f';
  const token = 'tok_ABCdef0123456789-_xyz';
  const payUrl = 'https://yallapp.com.tr/pay/$token';

  BuildConfigData withAppId(BuildConfigData b) => b.copyWith(
    appId: appId,
    linkBaseUrl: 'https://yallapp.com.tr/a/$appId',
    apiBaseUrl: 'https://yallapp.com.tr/api/app/$appId',
  );

  AppEnvironment env(BuildConfigData build, {PreviewSession? preview}) =>
      AppEnvironment(
        build: build,
        platform: DevicePlatform.ios,
        appVersion: '1.0.0',
        deviceId: 'd',
        deviceName: 'phone',
        preview: preview,
      );

  group('which pages open in the sheet', () {
    final build = withAppId(testBuild);

    test("the app's own scheme, as the platform and the build make it", () {
      expect(payReturnScheme(build), scheme);
      expect(payReturnScheme(testBuild), isNull);
      // tool/apply_config.dart registers the same one.
      expect(
        returnSchemeOf({
          'links': {'app_id': appId},
        }),
        scheme,
      );
      expect(returnSchemeOf({}), 'yallapp-dev');
    });

    test("only Yallapp's payment page itself", () {
      String? token0(String url) => payPageToken(Uri.parse(url), build);
      expect(token0(payUrl), token);
      expect(token0('$payUrl/'), token);
      expect(token0('$payUrl?payment=failed'), token);
      expect(token0('$payUrl/order-received'), isNull);
      expect(token0('http://yallapp.com.tr/pay/$token'), isNull);
      expect(token0('https://evil.example/pay/$token'), isNull);
      expect(token0('https://yallapp.com.tr.evil.example/pay/$token'), isNull);
      // A donation's page and a shop's own website checkout.
      expect(token0('https://yallapp.com.tr/give/$token'), isNull);
      expect(token0('https://your-academy.com/checkout/'), isNull);
      expect(token0('https://yallapp.com.tr/pay/short'), isNull);
    });

    test('installed apps with an app ID; never the preview', () {
      final page = Uri.parse(payUrl);
      expect(opensInPaySheet(page, env(build)), isTrue);
      expect(opensInPaySheet(page, env(testBuild)), isFalse);
      expect(
        opensInPaySheet(
          page,
          env(
            build,
            preview: const PreviewSession(
              appId: appId,
              platformUrl: 'https://yallapp.com.tr',
              contentSource: PreviewContentSource.wordpress,
            ),
          ),
        ),
        isFalse,
      );
    });

    test('the sheet opens the payment page through its /app entry', () {
      expect(
        paySheetEntry(Uri.parse('$payUrl?x=1#f')).toString(),
        '$payUrl/app',
      );
    });

    test('the return link, as Android and iOS hand it', () {
      expect(isPayReturnLink(Uri.parse('/pay-return?order=7')), isTrue);
      expect(
        isPayReturnLink(Uri.parse('$scheme://app/pay-return?result=paid')),
        isTrue,
      );
      expect(isPayReturnLink(Uri.parse('https://x.test/pay-return')), isFalse);
      expect(isPayReturnLink(Uri.parse('$scheme://other/pay-return')), isFalse);
      expect(isPayReturnLink(Uri.parse('/pay-return/more')), isFalse);
      expect(isPayReturnLink(Uri.parse('/account/orders')), isFalse);
    });

    test("the platform's status, and the address reported as before", () {
      expect(PayStatus.fromJson({'state': 'paid'}).done, isTrue);
      expect(PayStatus.fromJson({'state': 'awaiting_payment'}).done, isTrue);
      expect(PayStatus.fromJson({'state': 'started'}).done, isFalse);
      expect(PayStatus.fromJson({'state': 'open'}).state, PayState.open);
      expect(PayStatus.fromJson('nonsense').state, PayState.notFound);
      final page = Uri.parse(payUrl);
      expect(
        payCompletedUrl(page, const PayStatus(PayState.paid)).toString(),
        '$payUrl/order-received',
      );
      expect(
        payCompletedUrl(
          page,
          PayStatus.fromJson({'state': 'paid', 'shop_order': 'placed'}),
        ).toString(),
        '$payUrl/order-received?shop_order=placed',
      );
    });
  });

  group('the launch mode', () {
    test('SFSafariViewController / Custom Tabs: inAppBrowserView', () async {
      final launched = <(Uri, LaunchMode)>[];
      var closed = 0;
      Future<bool> launch(
        Uri url, {
        LaunchMode mode = LaunchMode.platformDefault,
      }) async {
        launched.add((url, mode));
        return true;
      }

      final sheet = UrlLauncherPaySheet(
        launch: launch,
        canClose: (mode) async => mode == LaunchMode.inAppBrowserView,
        closeSheet: () async => closed++,
      );
      expect(await sheet.open(Uri.parse('$payUrl/app')), isTrue);
      expect(launched.single.$2, LaunchMode.inAppBrowserView);
      await sheet.close();
      expect(closed, 1);
      // Android: a Custom Tab can't be closed by the app.
      final android = UrlLauncherPaySheet(
        launch: launch,
        canClose: (_) async => false,
        closeSheet: () async => closed++,
      );
      await android.close();
      expect(closed, 1);
      // No browser for it: false, and the web view opens instead.
      final none = UrlLauncherPaySheet(
        launch: (url, {mode = LaunchMode.platformDefault}) async =>
            throw StateError('no browser'),
      );
      expect(await none.open(Uri.parse(payUrl)), isFalse);
    });
  });

  group('the payment screen', () {
    late _FakeSheet sheet;
    late StreamController<Uri> returns;
    late List<PayStatus> answers;
    late int reads;

    setUp(() {
      sheet = _FakeSheet();
      returns = StreamController<Uri>.broadcast();
      answers = [const PayStatus(PayState.open)];
      reads = 0;
    });
    tearDown(() => returns.close());

    PayStatus answer() {
      reads++;
      return answers.length > 1 ? answers.removeAt(0) : answers.first;
    }

    Future<({TestApp app, Future<bool?> popped, List<Uri> completed})> openPay(
      WidgetTester tester, {
      String url = payUrl,
      bool appIdInBuild = true,
      bool? sheetWorks,
    }) async {
      if (sheetWorks != null) sheet.works = sheetWorks;
      final app = TestApp(
        appType: AppType.store,
        signedIn: true,
        build: appIdInBuild ? withAppId : null,
        overrides: [
          // 188 Dormant by default: this build turns the sheet back on.
          opensInPaySheetProvider.overrideWith((ref) {
            final env = ref.watch(appEnvironmentProvider);
            return (url) => opensInPaySheet(url, env);
          }),
          paySheetLauncherProvider.overrideWithValue(sheet),
          payReturnsProvider.overrideWithValue(returns.stream),
          payStatusReaderProvider.overrideWithValue((page) async {
            expect(page, Uri.parse(url));
            return answer();
          }),
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

    Future<void> resume(WidgetTester tester) async {
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump();
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await TestApp.settle(tester, 6);
    }

    Future<void> closeScreen(WidgetTester tester) async {
      await tester.tap(
        find.descendant(
          of: find.byType(WebPageScreen),
          matching: find.byType(SquareIconButton),
        ),
      );
      await TestApp.settle(tester, 6);
    }

    testWidgets('opens in the sheet, not the web view', (tester) async {
      final opened = await openPay(tester);
      expect(sheet.opened, [Uri.parse('$payUrl/app')]);
      expect(find.byType(PaySheetFlow), findsOneWidget);
      expect(find.byKey(const ValueKey('pay-sheet-waiting')), findsOneWidget);
      expect(
        opened.app.webViews.requests.where(
          (r) => r.url?.host == 'yallapp.com.tr',
        ),
        isEmpty,
      );
      await closeScreen(tester);
      expect(await opened.popped, isFalse);
    });

    testWidgets('the return link closes the sheet and the order is through', (
      tester,
    ) async {
      final opened = await openPay(tester);
      answers = [
        PayStatus.fromJson({'state': 'paid', 'shop_order': 'placed'}),
      ];
      returns.add(Uri.parse('$scheme://app/pay-return?order=7&result=paid'));
      await TestApp.settle(tester, 6);
      expect(sheet.closed, greaterThanOrEqualTo(1));
      expect(await opened.popped, isTrue);
      expect(opened.completed, [
        Uri.parse('$payUrl/order-received?shop_order=placed'),
      ]);
      // The screen is gone once its route's exit has played.
      await TestApp.settle(tester, 12);
      expect(find.byType(PaySheetFlow), findsNothing);
    });

    testWidgets('a paid order is never "failed", whatever the link says', (
      tester,
    ) async {
      final opened = await openPay(tester);
      answers = [const PayStatus(PayState.paid)];
      returns.add(Uri.parse('/pay-return?order=7&result=failed'));
      await TestApp.settle(tester, 6);
      expect(await opened.popped, isTrue);
      expect(opened.completed.single.path, '/pay/$token/order-received');
    });

    testWidgets('a bank transfer placed counts as through, as before', (
      tester,
    ) async {
      final opened = await openPay(tester);
      answers = [const PayStatus(PayState.awaitingPayment)];
      returns.add(Uri.parse('/pay-return?order=7&result=placed'));
      await TestApp.settle(tester, 6);
      expect(await opened.popped, isTrue);
    });

    testWidgets('back without a link, paid: through', (tester) async {
      final opened = await openPay(tester);
      answers = [const PayStatus(PayState.paid)];
      await resume(tester);
      expect(await opened.popped, isTrue);
      expect(opened.completed, hasLength(1));
    });

    testWidgets('back without a link, started and not confirmed: pending, '
        'then paid by a later check', (tester) async {
      final opened = await openPay(tester);
      answers = [const PayStatus(PayState.started)];
      await resume(tester);
      expect(find.byKey(const ValueKey('pay-sheet-pending')), findsOneWidget);
      expect(find.text("Your payment isn't confirmed yet"), findsOneWidget);
      expect(find.textContaining('failed'), findsNothing);
      // The webhook arrived: the next check (every few seconds) finds it paid.
      answers = [const PayStatus(PayState.paid)];
      await tester.pump(PaySheetFlow.pollEvery);
      await TestApp.settle(tester, 4);
      expect(await opened.popped, isTrue);
    });

    testWidgets('back without a link, nothing paid: not paid, pay again', (
      tester,
    ) async {
      final opened = await openPay(tester);
      answers = [const PayStatus(PayState.open)];
      await resume(tester);
      expect(find.byKey(const ValueKey('pay-sheet-notPaid')), findsOneWidget);
      expect(
        find.text(
          'Nothing was charged for this order. You can pay now, or '
          'close and come back later.',
        ),
        findsOneWidget,
      );
      // Pay again: the sheet opens the same payment (never a new order).
      await tester.tap(find.byKey(const ValueKey('pay-sheet-open')));
      await TestApp.settle(tester, 4);
      expect(sheet.opened, [
        Uri.parse('$payUrl/app'),
        Uri.parse('$payUrl/app'),
      ]);
      await closeScreen(tester);
      expect(await opened.popped, isFalse);
      expect(opened.completed, isEmpty);
    });

    testWidgets('back without a link, order cancelled: closed', (tester) async {
      final opened = await openPay(tester);
      answers = [const PayStatus(PayState.closed)];
      await resume(tester);
      expect(find.byKey(const ValueKey('pay-sheet-closed')), findsOneWidget);
      expect(find.byKey(const ValueKey('pay-sheet-open')), findsNothing);
      await closeScreen(tester);
      expect(await opened.popped, isFalse);
    });

    testWidgets('the platform out of reach: says so, never "not paid"', (
      tester,
    ) async {
      final app = TestApp(
        appType: AppType.store,
        signedIn: true,
        build: withAppId,
        overrides: [
          // 188 Dormant by default: this build turns the sheet back on.
          opensInPaySheetProvider.overrideWith((ref) {
            final env = ref.watch(appEnvironmentProvider);
            return (url) => opensInPaySheet(url, env);
          }),
          paySheetLauncherProvider.overrideWithValue(sheet),
          payReturnsProvider.overrideWithValue(returns.stream),
          payStatusReaderProvider.overrideWithValue(
            (_) async => throw StateError('offline'),
          ),
        ],
      );
      await app.pump(tester);
      await TestApp.settle(tester, 10);
      final popped = app.container
          .read(appRouterProvider)
          .push<bool>(
            Paths.web,
            extra: const WebPageArgs(url: payUrl, title: 'Checkout'),
          );
      await TestApp.settle(tester, 6);
      await resume(tester);
      expect(find.byKey(const ValueKey('pay-sheet-error')), findsOneWidget);
      await closeScreen(tester);
      expect(await popped, isFalse);
    });

    testWidgets('a quiet check while the sheet is open changes nothing', (
      tester,
    ) async {
      final opened = await openPay(tester);
      answers = [const PayStatus(PayState.open)];
      await tester.pump(PaySheetFlow.pollEvery);
      await TestApp.settle(tester, 4);
      expect(reads, greaterThanOrEqualTo(1));
      expect(find.byKey(const ValueKey('pay-sheet-waiting')), findsOneWidget);
      await closeScreen(tester);
      expect(await opened.popped, isFalse);
    });

    group('the web view, as before', () {
      testWidgets('builds without an app ID (in the stores before this)', (
        tester,
      ) async {
        final opened = await openPay(tester, appIdInBuild: false);
        expect(sheet.opened, isEmpty);
        expect(find.byType(PaySheetFlow), findsNothing);
        expect(opened.app.webViews.requests.last.url, Uri.parse(payUrl));
        await closeScreen(tester);
      });

      testWidgets("a shop's own website checkout", (tester) async {
        const site = 'https://your-academy.com/checkout/';
        final opened = await openPay(tester, url: site);
        expect(sheet.opened, isEmpty);
        expect(opened.app.webViews.requests.last.url, Uri.parse(site));
        await closeScreen(tester);
      });

      testWidgets("a donation's page", (tester) async {
        const give = 'https://yallapp.com.tr/give/$token';
        final opened = await openPay(tester, url: give);
        expect(sheet.opened, isEmpty);
        expect(opened.app.webViews.requests.last.url, Uri.parse(give));
        await closeScreen(tester);
      });

      testWidgets('a phone without a browser for the sheet', (tester) async {
        final opened = await openPay(tester, sheetWorks: false);
        expect(sheet.opened, hasLength(1));
        expect(find.byType(PaySheetFlow), findsNothing);
        expect(opened.app.webViews.requests.last.url, Uri.parse(payUrl));
        await closeScreen(tester);
      });
    });
  });

  testWidgets('started by the return link: the router opens Orders', (
    tester,
  ) async {
    final app = TestApp(
      appType: AppType.store,
      signedIn: true,
      build: withAppId,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 10);
    final router = app.container.read(appRouterProvider);
    router.go('/pay-return?order=7&result=paid');
    await TestApp.settle(tester, 6);
    expect(router.state.uri.path, Paths.orders);
  });
}

class _FakeSheet implements PaySheetLauncher {
  final opened = <Uri>[];
  int closed = 0;
  bool works = true;

  @override
  Future<bool> open(Uri url) async {
    opened.add(url);
    return works;
  }

  @override
  Future<void> close() async => closed++;
}
