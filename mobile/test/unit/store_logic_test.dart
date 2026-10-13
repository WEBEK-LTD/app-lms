import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';
import 'package:yallapp/core/format/dates.dart';
import 'package:yallapp/core/purchase/purchase_rules.dart';
import 'package:yallapp/core/storage/local_settings.dart';
import 'package:yallapp/modules/store/data/cart_controller.dart';
import 'package:yallapp/modules/store/screens/cart_screen.dart';

import '../support/fixtures.dart';

void main() {
  group('Store models', () {
    test('config: store settings and no LMS', () {
      final c = AppConfig.fromJson({
        ...configJson(lms: null),
        'store': storeConfigJson(),
      });
      expect(c.features.lms, isNull);
      expect(c.store!.currency, 'TRY');
      expect(c.store!.checkoutOpensIn, CheckoutOpensIn.inApp);
      expect(c.store!.deliveryDate.closedWeekdays, [0]);
      expect(c.store!.giftMessage.maxLength, 100);
      expect(AppConfig.fromJson(configJson()).store, isNull);
    });

    test('variable product: options, variations and "any" values', () {
      final p = ProductDetail.fromJson(variableProductJson());
      expect(p.summary.type, ProductType.variable);
      expect(p.summary.price.range, isTrue);
      expect(p.choices.single.labelOf('large'), 'Large');
      final large = p.variations.last;
      expect(large.matches({'pa_size': 'large'}), isTrue);
      expect(large.matches({'pa_size': 'small'}), isFalse);
      const any = ProductVariation(
        id: 1,
        attributes: {'color': ''},
        price: ProductPrice(
          amount: '50.00',
          currency: 'TRY',
          formatted: '₺50.00',
          onSale: false,
          range: false,
        ),
        stockStatus: StockStatus.inStock,
        purchasable: true,
      );
      expect(any.matches({'color': 'red'}), isTrue);
    });

    test('home sections tolerate new types', () {
      final sections = [
        for (final s in storeHomeJson()['sections'] as List)
          StoreHomeSection.fromJson(s as Map<String, dynamic>),
      ];
      expect(sections.map((s) => s.type), [
        StoreSectionType.categories,
        StoreSectionType.featuredProducts,
        StoreSectionType.unknown,
      ]);
    });

    test('cart quote and store order lines', () {
      final q = CartQuote.fromJson(cartQuoteJson(problem: true));
      expect(q.lines.single.available, isFalse);
      expect(q.lines.single.problem, 'Only 1 left in stock.');
      final line = OrderLine.fromJson({
        'name': 'Chocolate Box',
        'course_id': null,
        'product_id': 22,
        'quantity': 3,
        'image_url': null,
      });
      expect(line.productId, 22);
      expect(line.quantity, 3);
      expect(OrderLine.fromJson({'name': 'Course'}).quantity, 1);
    });

    test('product queries use the contract names', () {
      expect(
        const ProductQuery(
          category: 5,
          onSale: true,
          orderBy: ProductOrder.priceDesc,
          search: ' roses ',
        ).toQuery(),
        {
          'page': 1,
          'per_page': 20,
          'search': 'roses',
          'category': 5,
          'on_sale': true,
          'orderby': 'price_desc',
        },
      );
    });
  });

  group('Delivery dates', () {
    const rules = DeliveryDateRules(
      enabled: true,
      required: true,
      minDays: 1,
      maxDays: 14,
      closedWeekdays: [0],
    );
    // A Saturday.
    final today = DateTime(2026, 10, 10, 18, 30);

    test('within the window and not on closed days', () {
      expect(rules.allows(DateTime(2026, 10, 10), today), isFalse);
      // Sunday is closed.
      expect(rules.allows(DateTime(2026, 10, 11), today), isFalse);
      expect(rules.allows(DateTime(2026, 10, 12), today), isTrue);
      expect(rules.allows(DateTime(2026, 10, 24), today), isTrue);
      expect(rules.allows(DateTime(2026, 10, 25), today), isFalse);
    });

    test('the first open day skips closed ones', () {
      expect(rules.firstDay(today), DateTime(2026, 10, 12));
      const closed = DeliveryDateRules(
        enabled: true,
        required: true,
        minDays: 0,
        maxDays: 6,
        closedWeekdays: [0, 1, 2, 3, 4, 5, 6],
      );
      expect(closed.firstDay(today), isNull);
    });

    test('dates go to the plugin as yyyy-MM-dd', () {
      expect(isoDate(DateTime(2026, 3, 7)), '2026-03-07');
      expect(dayLabel(DateTime(2026, 10, 12)), 'Monday, 12 October');
    });

    test('the order received page ends the checkout', () {
      expect(
        isOrderReceived(
          Uri.parse('https://shop.test/checkout/order-received/5/'),
        ),
        isTrue,
      );
      expect(
        isOrderReceived(
          Uri.parse('https://shop.test/?page_id=7&order-received=5'),
        ),
        isTrue,
      );
      expect(
        isOrderReceived(
          Uri.parse('https://yallapp.com.tr/pay/abc123/order-received'),
        ),
        isTrue,
      );
      expect(
        isOrderReceived(
          Uri.parse('https://shop.myshopify.com/checkouts/cn/abc/thank_you'),
        ),
        isTrue,
      );
      expect(
        isOrderReceived(Uri.parse('https://shop.test/checkout/')),
        isFalse,
      );
    });
  });

  group('Product button', () {
    ProductSummary summary({
      String type = 'simple',
      bool digital = false,
      String stock = 'in_stock',
      bool purchasable = true,
    }) => ProductSummary.fromJson(
      productSummaryJson(
        type: type,
        digital: digital,
        stock: stock,
        purchasable: purchasable,
      ),
    );

    test('iOS never offers digital goods; Android does', () {
      expect(
        resolveProductCta(
          product: summary(digital: true),
          platform: DevicePlatform.ios,
        ),
        ProductCta.notInApp,
      );
      expect(
        resolveProductCta(
          product: summary(digital: true),
          platform: DevicePlatform.android,
        ),
        ProductCta.addToCart,
      );
      expect(
        resolveProductCta(product: summary(), platform: DevicePlatform.ios),
        ProductCta.addToCart,
      );
    });

    test('stock, product types and variable options', () {
      expect(
        resolveProductCta(
          product: summary(stock: 'out_of_stock', purchasable: false),
          platform: DevicePlatform.android,
        ),
        ProductCta.outOfStock,
      );
      expect(
        resolveProductCta(
          product: summary(type: 'grouped'),
          platform: DevicePlatform.android,
        ),
        ProductCta.notInApp,
      );
      final variable = ProductDetail.fromJson(variableProductJson());
      expect(
        resolveProductCta(
          product: variable.summary,
          platform: DevicePlatform.android,
          choicesComplete: false,
        ),
        ProductCta.chooseOptions,
      );
      expect(
        resolveProductCta(
          product: variable.summary,
          platform: DevicePlatform.android,
        ),
        ProductCta.unavailableOption,
      );
      expect(
        resolveProductCta(
          product: variable.summary,
          platform: DevicePlatform.android,
          variation: variable.variations.first,
        ),
        ProductCta.addToCart,
      );
    });
  });

  group('Cart', () {
    late ProviderContainer container;
    late SharedPreferences prefs;

    setUp(() async {
      SharedPreferences.setMockInitialValues({});
      prefs = await SharedPreferences.getInstance();
      container = ProviderContainer(
        overrides: [sharedPreferencesProvider.overrideWithValue(prefs)],
      );
      addTearDown(container.dispose);
    });

    CartController cart() => container.read(cartProvider.notifier);

    test('merges the same line, caps at the stock and saves', () {
      const roses = CartItem(
        productId: 20,
        variationId: 203,
        quantity: 1,
        name: 'Red Roses Bouquet – Large',
        maxQuantity: 2,
      );
      cart()
        ..add(roses)
        ..add(roses)
        ..add(roses);
      final items = container.read(cartProvider);
      expect(items.single.quantity, 2);
      expect(container.read(cartCountProvider), 2);
      final saved = jsonDecode(prefs.getString(CartController.storageKey)!);
      expect((saved as List).single['variation_id'], 203);
    });

    test('options the variation leaves open make separate lines', () {
      const red = CartItem(
        productId: 30,
        variationId: 301,
        quantity: 1,
        name: 'Silk Ribbon – Red',
        attributes: {'color': 'Red'},
      );
      const gold = CartItem(
        productId: 30,
        variationId: 301,
        quantity: 1,
        name: 'Silk Ribbon – Gold',
        attributes: {'color': 'Gold'},
      );
      cart()
        ..add(red)
        ..add(gold);
      expect(container.read(cartProvider), hasLength(2));
      expect(red.toInput().toJson(), {
        'product_id': 30,
        'variation_id': 301,
        'quantity': 1,
        'attributes': {'color': 'Red'},
      });
    });

    test('quantity zero removes; clear empties', () {
      const box = CartItem(productId: 22, quantity: 3, name: 'Chocolate Box');
      cart().add(box);
      cart().setQuantity(box.key, 0);
      expect(container.read(cartProvider), isEmpty);
      cart()
        ..add(box)
        ..clear();
      expect(container.read(cartProvider), isEmpty);
    });

    test('a damaged saved cart starts empty', () async {
      SharedPreferences.setMockInitialValues({
        CartController.storageKey: '{not json',
      });
      final damaged = ProviderContainer(
        overrides: [
          sharedPreferencesProvider.overrideWithValue(
            await SharedPreferences.getInstance(),
          ),
        ],
      );
      addTearDown(damaged.dispose);
      expect(damaged.read(cartProvider), isEmpty);
    });
  });
}
