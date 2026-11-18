import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/travel/widgets/travel_words.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';
import 'fitness_test.dart' show gymApi, openGym;

/// 180.5–180.7 Words the servers write in English, in the app's language.
void main() {
  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(360, 800) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  testWidgets('180.5 an appointment\'s state in Arabic', (tester) async {
    phone(tester);
    final app = TestApp(
      appType: AppType.booking,
      signedIn: true,
      api: FakeApi(
        config: configJson(
          lms: null,
          bookings: true,
          languages: languagesJson(),
        ),
      ),
      preferences: {'settings.language': 'ar'},
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.appointment(7));
    await TestApp.settle(tester, 20);
    // The server said "Approved".
    expect(find.text('تمت الموافقة'), findsWidgets);
    expect(find.text('Approved'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('180.6 a home\'s type in Arabic, on its page and in the '
      'filters', (tester) async {
    phone(tester);
    final app = TestApp(
      appType: AppType.realEstate,
      signedIn: true,
      api: FakeApi(
        config: configJson(
          lms: null,
          languages: languagesJson(),
          listings: listingsConfigJson(),
        ),
      ),
      preferences: {'settings.language': 'ar'},
    );
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.listing(42));
    await TestApp.settle(tester, 20);
    expect(find.textContaining('شقة'), findsWidgets);
    expect(find.textContaining('Apartment'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('180.7 what a flight has on board, in Arabic and Turkish', (
    tester,
  ) async {
    for (final (lang, power, lounge) in [
      ('ar', 'مقبس كهرباء', 'صالة انتظار'),
      ('tr', 'Priz', 'Bekleme salonu'),
    ]) {
      final app = TestApp(
        api: FakeApi(config: configJson(lms: null, languages: languagesJson())),
        preferences: {'settings.language': lang},
      );
      await app.pump(tester);
      final l = tester.element(find.byType(Scaffold).first).l10n;
      expect(flightAmenityName(l, 'power'), power);
      expect(flightAmenityName(l, 'lounge'), lounge);
      expect(flightAmenityName(l, 'entertainment'), isNot('entertainment'));
      expect(flightAmenityName(l, 'wifi'), l.travelWifi);
      expect(flightAmenityName(l, 'massage'), 'massage');
      await tester.pumpWidget(const SizedBox());
      app.container.dispose();
    }
  });

  testWidgets('180.8 a membership plan\'s price in the customer\'s '
      'currency too', (tester) async {
    final api = gymApi();
    api.plans = [
      {
        ...api.plans.first,
        'price': {
          ...bookingPriceJson('1800.00'),
          'display': {
            'currency': 'USD',
            'amount': '52.20',
            'formatted': r'$52.20',
            'rate': '0.029',
            'rate_date': '2026-11-18',
          },
        },
      },
    ];
    final app = await openGym(tester, api: api);
    app.container.read(appRouterProvider).go('/memberships');
    await TestApp.settle(tester);
    expect(find.textContaining(r'$52.20'), findsOneWidget);
    expect(find.textContaining('₺1800.00'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('180.14 a category with no services yet says so, and leads '
      'to all of them', (tester) async {
    phone(tester);
    final api = _NoServicesIn(
      config: configJson(lms: null, bookings: true, languages: languagesJson()),
    );
    final app = TestApp(appType: AppType.booking, signedIn: true, api: api);
    await app.pump(tester);
    app.container
        .read(appRouterProvider)
        .go(Paths.servicesFiltered(category: 2));
    await TestApp.settle(tester, 20);
    expect(find.text('No services in this category yet'), findsOneWidget);
    expect(find.text('No services yet'), findsNothing);
    await tester.tap(find.text('See all services'));
    await TestApp.settle(tester, 20);
    expect(api.lastServicesQuery?.category, isNull);
    expect(find.text('No services in this category yet'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('180.14 an open conversation shows the office\'s new reply', (
    tester,
  ) async {
    phone(tester);
    final api = FakeApi(
      config: configJson(
        lms: null,
        languages: languagesJson(),
        listings: listingsConfigJson(),
      ),
    );
    final app = TestApp(appType: AppType.realEstate, signedIn: true, api: api);
    await app.pump(tester);
    app.container.read(appRouterProvider).push(Paths.conversation(7));
    await TestApp.settle(tester, 20);
    expect(find.text('Yes, viewings on Saturday.'), findsOneWidget);
    api.inquiry = {
      ...api.inquiry,
      'messages': [
        ...(api.inquiry['messages'] as List),
        {
          'id': 3,
          'from': 'office',
          'text': 'See you at 11.',
          'created_at': '2026-10-12T11:00:00Z',
        },
      ],
    };
    await tester.pump(const Duration(seconds: 21));
    await TestApp.settle(tester, 20);
    expect(find.text('See you at 11.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

/// Bookings whose category 2 has nothing in it yet.
class _NoServicesIn extends FakeApi {
  _NoServicesIn({required super.config});

  @override
  Future<Paged<ServiceSummary>> listServices({
    int page = 1,
    String? search,
    int? category,
  }) {
    if (category == 2) {
      lastServicesQuery = (search: search, category: category);
      return Future.value(
        Paged.fromJson(pageJson([]), ServiceSummary.fromJson),
      );
    }
    return super.listServices(page: page, search: search, category: category);
  }
}
