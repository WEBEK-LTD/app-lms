import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/market/wallet_prefs.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 115.60–115.62 The wallet (07a: credit only, where each amount came from
/// and went, never expires, never cashed out) and the delivery club (07b:
/// the member's savings, the plans, the renewal by reminder and payment
/// link, ending it), in English and Arabic, light and dark, with the text
/// at 1.3.
void main() {
  Map<String, dynamic> money(String a) => {'amount': a, 'formatted': 'EGP $a'};
  final now = DateTime.now().toUtc();

  Map<String, dynamic> plan(int id, String period, String price) => {
    'id': id,
    'name': period == 'year' ? 'Yearly' : 'Monthly',
    'period': period,
    'price': money(price),
    'benefits': ['Free delivery on orders over EGP 150.00'],
    'free_delivery_over': money('150.00'),
    'delivery_percent_off': null,
    'perks': ["Members' offers first"],
  };

  Map<String, dynamic> membership({
    String status = 'active',
    bool renews = true,
    required DateTime end,
  }) => {
    'plan': plan(1, 'month', '49.00'),
    'status': status,
    'renews': renews,
    'current_period_end': end.toIso8601String(),
    'saved': money('512.00'),
    'started_at': '2026-09-02T10:00:00Z',
    'remind_at': renews
        ? end.subtract(const Duration(days: 3)).toIso8601String()
        : null,
    'savings': {
      'total': money('512.00'),
      'this_month': money('186.00'),
      'delivery': money('400.00'),
      'offers': money('112.00'),
      'free_deliveries': 16,
      'deliveries': 19,
      'paid': money('147.00'),
    },
  };

  FakeApi marketApi({Map<String, dynamic>? club}) {
    final api = FakeApi(
      config: {
        ...configJson(lms: null, languages: languagesJson()),
        'market': {
          'currency': 'EGP',
          'kinds': ['restaurant', 'grocery'],
          'payment': {'cash': true, 'card': true, 'wallet': true},
          'club': true,
          'wallet': true,
        },
      },
    );
    api.me = userJson();
    api.marketWallet = {
      'balance': money('203.25'),
      'entries': [
        {
          'id': 4,
          'kind': 'refund',
          'amount': money('153.25'),
          'label': 'Refund for M-4821',
          'order_id': 4821,
          'order_reference': 'M-4821',
          'vendor_name': 'Zad Market',
          'complaint_reference': 'C-1093',
          'rest_paid_by': null,
          'at': now.toIso8601String(),
        },
        {
          'id': 3,
          'kind': 'payment',
          'amount': money('-120.00'),
          'label': 'Order',
          'order_id': 4790,
          'order_reference': 'M-4790',
          'vendor_name': 'Bab El Sharq Grill',
          'complaint_reference': null,
          'rest_paid_by': 'card',
          'at': '2026-11-14T12:00:00Z',
        },
        {
          'id': 2,
          'kind': 'credit',
          'amount': money('50.00'),
          'label': 'Welcome to Zad Club',
          'order_id': null,
          'order_reference': null,
          'vendor_name': null,
          'complaint_reference': null,
          'rest_paid_by': null,
          'at': '2026-11-02T12:00:00Z',
        },
        {
          'id': 1,
          'kind': 'refund',
          'amount': money('120.00'),
          'label': 'Order cancelled',
          'order_id': 4655,
          'order_reference': 'M-4655',
          'vendor_name': 'Nile Pizza Co.',
          'complaint_reference': null,
          'rest_paid_by': null,
          'at': '2026-10-28T12:00:00Z',
        },
      ],
      'page': 1,
      'total_pages': 1,
    };
    api.marketClub = {
      'name': 'Club',
      'description': null,
      'plans': [plan(1, 'month', '49.00'), plan(2, 'year', '490.00')],
    };
    api.myClub = club ?? membership(end: now.add(const Duration(days: 14)));
    return api;
  }

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(390, 1800) * 2
      ..devicePixelRatio = 2;
    tester.platformDispatcher.textScaleFactorTestValue = 1.3;
    addTearDown(tester.view.reset);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
  }

  for (final lang in ['en', 'ar']) {
    for (final dark in [false, true]) {
      final name = '$lang ${dark ? 'dark' : 'light'}';

      testWidgets('07a the wallet, $name, text at 1.3', (tester) async {
        phone(tester);
        final api = marketApi();
        final app = TestApp(
          api: api,
          appType: AppType.food,
          signedIn: true,
          preferences: {
            'settings.language': lang,
            'settings.theme_mode': dark ? 'dark' : 'light',
          },
        );
        await app.pump(tester);
        app.container.read(appRouterProvider).push(Paths.marketWallet);
        await TestApp.settle(tester, 20);
        expect(tester.takeException(), isNull);
        expect(find.byKey(const ValueKey('wallet-balance')), findsOneWidget);
        if (lang == 'en') {
          expect(find.text('YOUR BALANCE'), findsOneWidget);
          expect(
            find.text('Pays all or part of any order in Your Academy'),
            findsOneWidget,
          );
          expect(find.text('Use it at checkout first'), findsOneWidget);
          expect(find.text('Refunds land here at once'), findsOneWidget);
          expect(find.text('Your balance never expires'), findsOneWidget);
          expect(find.text('Today'), findsOneWidget);
          expect(find.text('Refund · complaint C-1093'), findsOneWidget);
          expect(
            find.textContaining('Zad Market · order M-4821 · '),
            findsOneWidget,
          );
          expect(find.text('+EGP 153.25'), findsOneWidget);
          expect(find.text('Paid toward order M-4790'), findsOneWidget);
          expect(
            find.text('Bab El Sharq Grill · the rest by card'),
            findsOneWidget,
          );
          expect(find.text('−EGP 120.00'), findsOneWidget);
          expect(find.text('Credit from Your Academy'), findsOneWidget);
          expect(find.text('Welcome to Zad Club'), findsOneWidget);
          expect(find.text('Refund · order M-4655 cancelled'), findsOneWidget);
          expect(find.text('14 November'), findsOneWidget);
          // No top-up and no cash-out anywhere.
          expect(
            find.textContaining(
              RegExp(
                'top up|Top up|cash out|Cash out|withdraw',
                caseSensitive: false,
              ),
            ),
            findsNothing,
          );
        } else {
          expect(find.text('المحفظة'), findsWidgets);
          expect(find.text('رصيدك'), findsOneWidget);
          expect(find.text('استخدمه أولًا عند الدفع'), findsOneWidget);
          expect(find.text('تصل المبالغ المستردة فورًا'), findsOneWidget);
          expect(find.text('رصيدك لا تنتهي صلاحيته'), findsOneWidget);
          expect(find.text('اليوم'), findsOneWidget);
          expect(find.textContaining('استرداد · الشكوى'), findsOneWidget);
          expect(find.textContaining('والباقي بالبطاقة'), findsOneWidget);
          expect(find.textContaining('120.00 ج.م'), findsWidgets);
          expect(find.text('14 نوفمبر'), findsOneWidget);
        }
        // The switch is kept on the phone.
        expect(app.container.read(walletUseFirstProvider), isTrue);
        await tester.tap(find.byType(Switch));
        await TestApp.settle(tester);
        expect(app.container.read(walletUseFirstProvider), isFalse);
      });

      testWidgets('07b the club for a member, $name, text at 1.3', (
        tester,
      ) async {
        phone(tester);
        final api = marketApi();
        final app = TestApp(
          api: api,
          appType: AppType.food,
          signedIn: true,
          preferences: {
            'settings.language': lang,
            'settings.theme_mode': dark ? 'dark' : 'light',
          },
        );
        await app.pump(tester);
        app.container.read(appRouterProvider).push(Paths.marketClub);
        await TestApp.settle(tester, 20);
        expect(tester.takeException(), isNull);
        expect(find.byKey(const ValueKey('club-card')), findsOneWidget);
        expect(find.byKey(const ValueKey('club-savings')), findsOneWidget);
        // Mid-period, on the member's own plan: no payment button.
        expect(find.byKey(const ValueKey('club-renew')), findsNothing);
        if (lang == 'en') {
          expect(find.text('Your Academy Club'), findsWidgets);
          expect(find.text('Member'), findsOneWidget);
          expect(
            find.text('Free delivery on orders over EGP 150'),
            findsOneWidget,
          );
          expect(find.text('Member since'), findsOneWidget);
          expect(find.text('2 September'), findsOneWidget);
          expect(find.textContaining('Next payment '), findsOneWidget);
          expect(find.text('Monthly · EGP 49'), findsOneWidget);
          expect(find.text("YOU'VE SAVED"), findsOneWidget);
          expect(find.text('3.5× what you paid'), findsOneWidget);
          expect(find.text('EGP 512.00'), findsOneWidget);
          expect(
            find.text('since you joined, for EGP 147.00 in fees'),
            findsOneWidget,
          );
          expect(find.text('This month'), findsOneWidget);
          expect(find.text('EGP 186.00'), findsOneWidget);
          expect(find.text('16 of 19'), findsOneWidget);
          expect(find.text("Members' offers"), findsOneWidget);
          expect(find.text('EGP 112.00'), findsOneWidget);
          expect(find.text('Two months free'), findsOneWidget);
          expect(
            find.text('Free delivery by the app\'s couriers over EGP 150'),
            findsOneWidget,
          );
          expect(find.text("Members' offers first"), findsOneWidget);
          expect(
            find.textContaining(
              'with a link to pay. Nothing is charged by itself.',
            ),
            findsOneWidget,
          );
          expect(find.text('End membership'), findsOneWidget);
        } else {
          expect(find.text('نادي Your Academy'), findsWidgets);
          expect(find.text('عضو'), findsOneWidget);
          expect(find.text('عضو منذ'), findsOneWidget);
          expect(find.text('2 سبتمبر'), findsOneWidget);
          expect(find.text('وفّرت'), findsOneWidget);
          expect(find.textContaining('512.00 ج.م'), findsOneWidget);
          expect(find.text('16 من 19'), findsOneWidget);
          expect(find.text('عروض الأعضاء'), findsOneWidget);
          expect(find.text('شهران مجانًا'), findsOneWidget);
          expect(find.textContaining('ولا يُخصم شيء تلقائيًا'), findsOneWidget);
          expect(find.text('إنهاء العضوية'), findsOneWidget);
        }
      });
    }
  }

  testWidgets(
    '07b picks the yearly plan for the next period and pays it on the payment page',
    (tester) async {
      phone(tester);
      final api = marketApi()..clubPayUrl = 'https://pay.test/club';
      final app = TestApp(api: api, appType: AppType.food, signedIn: true);
      await app.pump(tester);
      app.container.read(appRouterProvider).push(Paths.marketClub);
      await TestApp.settle(tester, 20);
      await tester.tap(find.text('Yearly'));
      await TestApp.settle(tester);
      expect(find.text('Switch to Yearly · EGP 490'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('club-renew')));
      await TestApp.settle(tester, 20);
      expect(api.clubRenewals, [2]);
      expect(
        app.webViews.requests.map((r) => '${r.url}'),
        contains('https://pay.test/club'),
      );
    },
  );

  testWidgets(
    '07b in its last days, or ended, pays the next period by its link',
    (tester) async {
      phone(tester);
      final api = marketApi(
        club: membership(end: now.add(const Duration(days: 2))),
      )..clubPayUrl = 'https://pay.test/club';
      final app = TestApp(api: api, appType: AppType.food, signedIn: true);
      await app.pump(tester);
      app.container.read(appRouterProvider).push(Paths.marketClub);
      await TestApp.settle(tester, 20);
      expect(find.text('Pay the next period · EGP 49'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('club-renew')));
      await TestApp.settle(tester, 20);
      expect(api.clubRenewals, [null]);
    },
  );

  testWidgets('07b ended: renews from today by its link', (tester) async {
    phone(tester);
    final ended = marketApi(
      club: membership(
        status: 'ended',
        renews: false,
        end: now.subtract(const Duration(days: 5)),
      ),
    );
    final again = TestApp(api: ended, appType: AppType.food, signedIn: true);
    await again.pump(tester);
    again.container.read(appRouterProvider).push(Paths.marketClub);
    await TestApp.settle(tester, 20);
    expect(find.text('Renew · EGP 49'), findsOneWidget);
    expect(find.text('End membership'), findsNothing);
    expect(find.textContaining('Ended '), findsOneWidget);
  });

  testWidgets('07b ends the membership after asking: no more reminders', (
    tester,
  ) async {
    phone(tester);
    final api = marketApi();
    final app = TestApp(api: api, appType: AppType.food, signedIn: true);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.marketClub);
    await TestApp.settle(tester, 20);
    await tester.tap(find.text('End membership'));
    await TestApp.settle(tester);
    expect(find.text('End your membership?'), findsOneWidget);
    await tester.tap(find.text('End membership').last);
    await TestApp.settle(tester, 20);
    expect(api.myClub!['status'], 'ending');
    expect(find.text('End membership'), findsNothing);
    expect(find.textContaining("we won't remind you again"), findsWidgets);
  });
}
