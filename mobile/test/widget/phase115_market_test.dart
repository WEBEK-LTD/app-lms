import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_symbols_icons/symbols.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/l10n/l10n.dart';
import 'package:yallapp/core/theme/app_theme.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/providers.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/modules/delivery/data/delivery_providers.dart';
import 'package:yallapp/modules/market/data/market_models.dart';
import 'package:yallapp/modules/market/data/market_place.dart';
import 'package:yallapp/modules/market/data/market_providers.dart';
import 'package:yallapp/modules/market/screens/market_vendor_screen.dart';
import 'package:yallapp/modules/market/widgets/market_look.dart';
import 'package:yallapp/modules/shared/pages/studio_page.dart';

import '../support/fake_api.dart';
import '../support/market_fixtures.dart';

class _Here implements Locator {
  @override
  Future<LocateResult> current() async =>
      const LocateResult.found((lat: 29.96, lng: 31.25, accuracy: 10));
}

/// 115 The marketplace's Studio sections and a vendor's page, on the
/// sample marketplace, in English and in Arabic (right to left).
void main() {
  Widget app(Widget home, {String lang = 'en', bool dark = false}) =>
      ProviderScope(
        overrides: marketSampleOverrides,
        child: MaterialApp(
          theme: buildAppTheme(
            primary: const Color(0xFF0E7C66),
            secondary: const Color(0xFFF2994A),
            brightness: dark ? Brightness.dark : Brightness.light,
            template: AppTemplate.bold,
            fontFamily: 'Plus Jakarta Sans',
          ),
          locale: Locale(lang),
          supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          home: Scaffold(body: home),
        ),
      );

  void phone(WidgetTester tester) {
    tester.view
      ..physicalSize = const Size(360, 3400) * 2
      ..devicePixelRatio = 2;
    addTearDown(tester.view.reset);
  }

  test('a market element reads its section, style, kind and sort', () {
    final node = StudioNode.tryParse({
      'id': 'm',
      'type': 'market',
      'title': 'Fastest near you',
      'market': {
        'section': 'vendors',
        'style': 'spotlight',
        'kind': 'restaurant',
        'sort': 'fastest',
        'limit': 99,
      },
    })!;
    expect(node.type, StudioNodeType.market);
    expect(node.market!.section, StudioMarketSection.vendors);
    expect(node.market!.style, StudioMarketStyle.spotlight);
    expect(node.market!.kind, StudioMarketKind.restaurant);
    expect(node.market!.sort, StudioMarketSort.fastest);
    expect(node.market!.limit, 40);
    // A section this app doesn't know is left out.
    expect(
      StudioNode.tryParse({
        'id': 'x',
        'type': 'market',
        'market': {'section': 'later'},
      })!.market,
      isNull,
    );
  });

  test('the server\'s vendor and product as the screens show them', () {
    const config = MarketConfig(
      currency: 'EGP',
      categories: [
        MarketCategory(
          id: 'grills',
          name: 'Grills',
          kind: VendorKind.restaurant,
        ),
      ],
    );
    final vendor = marketVendorFrom(
      MarketVendorSummary.fromJson({
        'id': 7,
        'kind': 'shop',
        'name': 'Corner Shop',
        'categories': ['grills', 'unknown'],
        'rating': null,
        'ratings_count': 0,
        'open': false,
        'opens_at': '2026-11-05T07:00:00Z',
        'busy': false,
        'delivery_by': 'vendor',
        'delivery_minutes': null,
        'delivery_fee': {'amount': '15.00', 'formatted': 'EGP 15.00'},
        'min_order': {'amount': '100.00', 'formatted': 'EGP 100.00'},
        'club_benefit': 'Free delivery',
        'offer': '10% off',
      }),
      config,
    );
    expect(vendor.id, '7');
    expect(vendor.sellsGoods, isTrue);
    expect(vendor.tags, ['Grills', 'unknown']);
    expect(vendor.rating, isNull);
    expect(vendor.etaMin, isNull);
    expect(vendor.deliveryFee, 'EGP 15.00');
    expect(vendor.freeDelivery, isFalse);
    expect(vendor.state, MarketVendorState.closed);
    expect(vendor.deliveredBy, MarketDeliveredBy.vendor);
    expect(vendor.clubBenefit, 'Free delivery');
    expect(vendor.promo, '10% off');

    final item = marketItemFrom(
      MarketProduct.fromJson({
        'id': 3,
        'name': 'Apples',
        'price': {'amount': '65.00', 'formatted': 'EGP 65.00'},
        'was_price': {'amount': '80.00', 'formatted': 'EGP 80.00'},
        'unit': 'kg',
        'step': 0.5,
        'in_stock': true,
        'choices': [],
        'tags': ['popular'],
      }),
    );
    expect(item.price, 'EGP 65.00');
    expect(item.priceValue, 65);
    expect(item.oldPrice, 'EGP 80.00');
    expect(item.unit, MarketUnit.kg);
    expect(item.step, 0.5);
    expect(item.popular, isTrue);
  });

  test(
    'the delivery place: the phone\'s position and its address, kept',
    () async {
      SharedPreferences.setMockInitialValues({});
      final prefs = await SharedPreferences.getInstance();
      final api = FakeApi()
        ..mapAddress = {
          'id': 'p1',
          'name': 'Road 233',
          'address': '9 Road 233, Maadi',
          'lat': 29.96,
          'lng': 31.25,
        };
      ProviderContainer container() => ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(prefs),
          locatorProvider.overrideWithValue(_Here()),
          yallappApiProvider.overrideWithValue(api),
        ],
      );
      final first = container();
      addTearDown(first.dispose);
      expect(first.read(marketPlaceProvider), isNull);
      expect(
        await first.read(marketPlaceProvider.notifier).useMyLocation(),
        isNull,
      );
      expect(first.read(marketPlaceProvider)?.address, '9 Road 233, Maadi');
      // The next launch remembers it.
      final next = container();
      addTearDown(next.dispose);
      expect(next.read(marketPlaceProvider)?.lat, 29.96);
    },
  );

  for (final (lang, dark) in [('en', false), ('ar', false), ('en', true)]) {
    testWidgets('the marketplace home in $lang${dark ? ', dark' : ''}', (
      tester,
    ) async {
      phone(tester);
      final page = StudioPage.tryParse(homePage())!;
      await tester.pumpWidget(
        app(
          StudioPageView(page: page, pageSlug: 'home'),
          lang: lang,
          dark: dark,
        ),
      );
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.takeException(), isNull);
      expect(find.text('Hungry? Order in minutes.'), findsOneWidget);
      expect(find.text('Fastest near you'), findsOneWidget);
      expect(find.text('Supermarkets & shops'), findsOneWidget);
      // Restaurants only in the restaurants' sections, shops in the shops'.
      expect(find.text('Fresh Basket'), findsWidgets);
      expect(find.text('Ember & Bun'), findsWidgets);
      if (lang == 'ar') {
        expect(find.text('التوصيل إلى'), findsOneWidget);
      }
    });
  }

  testWidgets('a restaurant: its menu, offer, delivery and no contact', (
    tester,
  ) async {
    phone(tester);
    await tester.pumpWidget(
      app(const MarketVendorScreen(vendorId: 'ember-bun')),
    );
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.takeException(), isNull);
    expect(find.text('Ember & Bun'), findsOneWidget);
    expect(find.text('20% off your first order'), findsOneWidget);
    expect(find.text('Live tracking'), findsOneWidget);
    expect(find.text('Smoked double'), findsOneWidget);
    expect(find.textContaining('support team'), findsOneWidget);
    expect(find.byIcon(Icons.phone), findsNothing);
  });

  test('a vendor outside the customer\'s delivery area', () {
    final vendor = marketVendorFrom(
      MarketVendorSummary.fromJson({
        'id': 8,
        'kind': 'restaurant',
        'name': 'Far Grill',
        'categories': [],
        'rating': null,
        'ratings_count': 0,
        'open': true,
        'busy': false,
        'delivery_by': 'app',
        'delivery_minutes': null,
        'delivery_fee': null,
        'delivers': false,
      }),
      null,
    );
    expect(vendor.delivers, isFalse);
    expect(vendor.outsideArea, isTrue);
    // Unknown (no address yet) is not outside.
    expect(
      const MarketVendor(
        id: '1',
        kind: MarketVendorKind.restaurant,
        name: 'X',
        coverUrl: '',
        logoUrl: '',
        tags: [],
      ).outsideArea,
      isFalse,
    );
  });

  group('outside the delivery area', () {
    const far = MarketVendor(
      id: 'far',
      kind: MarketVendorKind.restaurant,
      name: 'Far Grill',
      coverUrl: '',
      logoUrl: '',
      tags: ['Grill'],
      // Even with a time and a fee in hand, neither shows.
      etaMin: 2994,
      etaMax: 3009,
      deliveryFee: 'EGP 15.00',
      delivers: false,
    );
    Widget vendorPage(String lang) => ProviderScope(
      overrides: [
        marketVendorPageProvider.overrideWith(
          (ref, id) async => const MarketVendorPage(
            vendor: far,
            shelves: [],
            currency: 'EGP',
            hours: marketAllDay,
          ),
        ),
      ],
      child: MaterialApp(
        theme: buildAppTheme(
          primary: const Color(0xFF0E7C66),
          secondary: const Color(0xFFF2994A),
          brightness: Brightness.light,
          template: AppTemplate.bold,
          fontFamily: 'Plus Jakarta Sans',
        ),
        locale: Locale(lang),
        supportedLocales: const [Locale('en'), Locale('ar'), Locale('tr')],
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        home: const MarketVendorScreen(vendorId: 'far'),
      ),
    );

    testWidgets('the vendor page says so instead of a time and a fee', (
      tester,
    ) async {
      phone(tester);
      await tester.pumpWidget(vendorPage('en'));
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.takeException(), isNull);
      expect(find.text('Outside delivery area'), findsOneWidget);
      expect(
        find.text("This place doesn't deliver to your address."),
        findsOneWidget,
      );
      expect(find.text('Use my location'), findsOneWidget);
      expect(find.textContaining('2994'), findsNothing);
      expect(find.textContaining('EGP 15.00'), findsNothing);
      // Open all day: "Open 24 hours", never "Open 00:00–23:59".
      expect(find.text('Open 24 hours'), findsOneWidget);
    });

    testWidgets('in Arabic', (tester) async {
      phone(tester);
      await tester.pumpWidget(vendorPage('ar'));
      await tester.pump(const Duration(milliseconds: 300));
      expect(tester.takeException(), isNull);
      expect(find.text('خارج نطاق التوصيل'), findsOneWidget);
      expect(find.text('مفتوح 24 ساعة'), findsOneWidget);
    });

    testWidgets('the card\'s facts', (tester) async {
      await tester.pumpWidget(app(const MarketVendorFacts(vendor: far)));
      await tester.pump();
      expect(find.text('Outside delivery area'), findsOneWidget);
      expect(find.textContaining('min'), findsNothing);
      expect(find.textContaining('EGP 15.00'), findsNothing);
    });
  });

  testWidgets('a shop: aisles and items by weight', (tester) async {
    phone(tester);
    await tester.pumpWidget(
      app(const MarketVendorScreen(vendorId: 'daily-bread')),
    );
    await tester.pump(const Duration(milliseconds: 300));
    expect(tester.takeException(), isNull);
    expect(find.text('Own delivery'), findsOneWidget);
    expect(find.text('Fruit & vegetables'), findsWidgets);
    expect(find.textContaining('/ kg'), findsWidgets);
    // Red apples are sold by the kilo, half a kilo at a time.
    await tester.tap(find.text('Add').first);
    await tester.pump();
    expect(find.text('0.5 kg'), findsOneWidget);
    await tester.tap(find.byIcon(Symbols.add_rounded).first);
    await tester.pump();
    expect(find.text('1 kg'), findsOneWidget);
    expect(find.text('View basket'), findsOneWidget);
  });
}
