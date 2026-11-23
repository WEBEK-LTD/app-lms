import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/modules/store/data/store_providers.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 210 Studio's home decor, crochet and furniture types in the app: the
/// `delivery_slots` element (the shop's next delivery days and times, kept
/// for the checkout, with the assembly line), a product's size in cm and
/// its days to make, and "Installments coming soon" under a furniture
/// product's price. Apps before it skip the element.
void main() {
  Map<String, dynamic> slotsNode({bool assembly = true}) => {
    'id': 'slots',
    'type': 'delivery_slots',
    'delivery_slots': {'days': 4, 'assembly': assembly},
    'color': '#1F241C',
    'border_color': '#4A3426',
  };

  Future<(TestApp, FakeApi)> open(
    WidgetTester tester, {
    bool deliveryDays = true,
    bool installments = false,
    Map<String, dynamic>? product,
  }) async {
    tester.view
      ..devicePixelRatio = 3
      ..physicalSize = const Size(390, 1400) * 3;
    addTearDown(tester.view.reset);
    final api =
        FakeApi(
            config: {
              ...configJson(
                lms: null,
                store: true,
                languages: languagesJson(available: const ['en', 'ar', 'tr']),
              ),
              'store': {
                ...storeConfigJson(deliveryDate: deliveryDays),
                'installments_soon': installments,
              },
            },
          )
          ..deliverySlotsJson = [
            {'id': 's1', 'start': '09:00', 'end': '12:00', 'label': ''},
            {
              'id': 's2',
              'start': '13:00',
              'end': '16:00',
              'label': '',
              'full': true,
              'available': false,
            },
            {'id': 's3', 'start': '17:00', 'end': '21:00', 'label': ''},
          ]
          ..navigation = navigationJson(
            tabs: [
              navTabJson('home', 'Home', 'home', {
                'type': 'page',
                'page_slug': 'home',
              }),
              navTabJson('shop', 'Shop', 'grid_view', {
                'type': 'screen',
                'screen': 'search',
              }),
            ],
          )
          ..pages = {
            'home': {
              ...appPageJson(blocks: []),
              'studio': {
                'header': {'type': 'title', 'title': 'Rukn'},
                'body': {
                  'id': 'root',
                  'type': 'column',
                  'children': [
                    {'id': 't', 'type': 'text', 'text': 'Welcome'},
                    slotsNode(),
                  ],
                },
              },
            },
          };
    if (product != null) api.product = product;
    final app = TestApp(appType: AppType.store, api: api, signedIn: true);
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    return (app, api);
  }

  test('reads the element, a product\'s size and days, and the tag', () {
    final node = StudioNode.tryParse(slotsNode())!;
    expect(node.type, StudioNodeType.deliverySlots);
    expect(node.deliverySlots.days, 4);
    expect(node.deliverySlots.assembly, isTrue);
    // Out of range or missing: 3 to 10 days, five by default, no assembly.
    final wide = StudioNode.tryParse({
      ...slotsNode(),
      'delivery_slots': {'days': 40},
    })!;
    expect(wide.deliverySlots.days, 10);
    expect(
      StudioNode.tryParse({'id': 'x', 'type': 'delivery_slots'})!.deliverySlots,
      isA<StudioDeliverySlots>()
          .having((d) => d.days, 'days', 5)
          .having((d) => d.assembly, 'assembly', isFalse),
    );
    final detail = ProductDetail.fromJson({
      ...productDetailJson(),
      'dimensions': {
        'width': 220,
        'depth': 95,
        'height': 82,
        'unit': 'cm',
        'text': 'W 220 × D 95 × H 82 cm',
      },
      'make_days': {'min': 3, 'max': 5, 'text': 'Made in 3–5 days'},
    });
    expect(detail.dimensions, 'W 220 × D 95 × H 82 cm');
    expect(detail.makeDays, 'Made in 3–5 days');
    expect(ProductDetail.fromJson(productDetailJson()).dimensions, isNull);
    expect(StoreConfig.fromJson(storeConfigJson()).installmentsSoon, isFalse);
    expect(
      StoreConfig.fromJson({...storeConfigJson(), 'installments_soon': true})
          .installmentsSoon,
      isTrue,
    );
  });

  testWidgets('the delivery days: a day and a time picked are the cart\'s, a '
      'full time not to pick, the assembly line', (tester) async {
    final (app, _) = await open(tester);
    expect(find.byKey(const ValueKey('studio-delivery-slots')), findsOneWidget);
    expect(find.textContaining('The team assembles it on the day.'), findsOne);
    await tester.tap(find.textContaining('17:00'));
    await TestApp.settle(tester, 10);
    final picked = app.container.read(cartDeliveryProvider);
    expect(picked.date, isNotNull);
    expect(picked.slot, 's3');
    // The full time: nothing changes.
    await tester.tap(find.textContaining('13:00'));
    await TestApp.settle(tester, 10);
    expect(app.container.read(cartDeliveryProvider).slot, 's3');
    expect(tester.takeException(), isNull);
    app.container.dispose();
  });

  testWidgets('a shop without delivery days: the element shows nothing', (
    tester,
  ) async {
    final (app, _) = await open(tester, deliveryDays: false);
    expect(find.byKey(const ValueKey('studio-delivery-slots')), findsNothing);
    expect(find.text('Welcome'), findsOneWidget);
    app.container.dispose();
  });

  testWidgets('a sofa: its dimensions, its days to make and installments '
      'coming soon', (tester) async {
    final (app, _) = await open(
      tester,
      installments: true,
      product: {
        ...productDetailJson(),
        'id': 30,
        'dimensions': {'text': 'W 220 × D 95 × H 82 cm'},
        'make_days': {'text': 'Made in 10–14 days'},
      },
    );
    app.container.read(appRouterProvider).push(Paths.product(30));
    await TestApp.settle(tester, 20);
    expect(find.byKey(const ValueKey('product-dimensions')), findsOneWidget);
    expect(find.text('W 220 × D 95 × H 82 cm'), findsOneWidget);
    expect(find.text('Dimensions'), findsOneWidget);
    expect(find.text('Made in 10–14 days'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('product-installments-soon')),
      findsOneWidget,
    );
    expect(find.text('Installments coming soon'), findsOneWidget);
    expect(tester.takeException(), isNull);
    app.container.dispose();
  });
}
