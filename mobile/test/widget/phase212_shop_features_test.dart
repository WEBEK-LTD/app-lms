import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/api/yallapp_api.dart';
import 'package:yallapp/core/config/build_config_data.dart';
import 'package:yallapp/core/routing/app_router.dart';
import 'package:yallapp/core/routing/paths.dart';
import 'package:yallapp/core/services/push_service.dart';
import 'package:yallapp/core/widgets/buttons.dart';
import 'package:yallapp/modules/store/data/wishlist.dart';
import 'package:yallapp/modules/store/widgets/shop_features.dart';

import '../support/fake_api.dart';
import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 212 A store's wishlist (hearts on the cards and the page, the Wishlist
/// screen, a guest's hearts added on sign-in), reviews with photos on a
/// product's page and their form, "Notify me when it's back", and the
/// listing filters. An older server sends none of it: the hearts stay on
/// the phone, the page shows what it did, the shop its sort only.
void main() {
  Map<String, dynamic> store({bool features = true}) => {
    ...storeConfigJson(),
    if (features) ...{
      'reviews': true,
      'wishlist': true,
      'back_in_stock': true,
      'review_photos': {
        'max': 4,
        'max_bytes': 8388608,
        'types': ['image/jpeg', 'image/png', 'image/webp'],
      },
    },
  };

  Future<TestApp> open(
    WidgetTester tester, {
    bool signedIn = true,
    bool features = true,
    Map<String, dynamic>? product,
    Map<String, Object> preferences = const {},
    Map<String, dynamic>? filters,
  }) async {
    tester.view
      ..devicePixelRatio = 3
      ..physicalSize = const Size(390, 1800) * 3;
    addTearDown(tester.view.reset);
    final api = FakeApi(
      config: {
        ...configJson(lms: null, store: true),
        'store': store(features: features),
      },
    );
    if (product != null) api.product = product;
    api.shopFilters = filters;
    api.wishlistProducts = {21: productSummaryJson()};
    final app = TestApp(
      appType: AppType.store,
      api: api,
      signedIn: signedIn,
      preferences: preferences,
    );
    await app.pump(tester);
    await TestApp.settle(tester, 20);
    return app;
  }

  Future<void> go(WidgetTester tester, TestApp app, String path) async {
    app.container.read(appRouterProvider).go(path);
    await TestApp.settle(tester, 20);
  }

  FakeApi apiOf(TestApp app) => app.api;

  testWidgets('the heart saves a product to the account, the Wishlist screen '
      'shows it', (tester) async {
    final app = await open(tester);
    await go(tester, app, Paths.product(21));
    final heart = find.byKey(const ValueKey('wishlist-heart-21'));
    expect(heart, findsWidgets);
    // On the product's page, the same square tile as share and cart.
    expect(
      find.descendant(
        of: find.byType(SliverAppBar),
        matching: find.byWidgetPredicate(
          (w) =>
              w is SquareIconButton &&
              w.key == const ValueKey('wishlist-heart-21'),
        ),
      ),
      findsOneWidget,
    );
    await tester.tap(heart.first);
    await TestApp.settle(tester);
    expect(apiOf(app).calls, contains('addToShopWishlist'));
    expect(apiOf(app).wishlistIds, [21]);
    expect(find.bySemanticsLabel('Remove from wishlist'), findsWidgets);

    await go(tester, app, Paths.wishlist);
    expect(find.text('Wishlist'), findsWidgets);
    expect(find.text('Sunflower Basket'), findsOneWidget);
  });

  testWidgets('a guest\'s hearts stay on the phone, and are added once they '
      'sign in', (tester) async {
    final guest = await open(tester, signedIn: false);
    await go(tester, guest, Paths.product(21));
    await tester.tap(find.byKey(const ValueKey('wishlist-heart-21')).first);
    await TestApp.settle(tester);
    expect(apiOf(guest).calls, isNot(contains('addToShopWishlist')));
    expect(guest.container.read(shopWishlistProvider), {21});
  });

  testWidgets('signed in with hearts on the phone: they are merged', (
    tester,
  ) async {
    final app = await open(
      tester,
      preferences: {ShopWishlist.storageKey: '[5,6]'},
    );
    expect(apiOf(app).calls, contains('mergeWishlist'));
    expect(apiOf(app).wishlistIds, containsAll([5, 6]));
    expect(app.container.read(shopWishlistProvider), containsAll([5, 6]));
  });

  testWidgets('an older server: the hearts stay on the phone, no reviews '
      'block or notify me', (tester) async {
    final app = await open(
      tester,
      features: false,
      product: productDetailJson(stock: 'out_of_stock'),
    );
    await go(tester, app, Paths.product(21));
    await tester.tap(find.byKey(const ValueKey('wishlist-heart-21')).first);
    await TestApp.settle(tester);
    expect(apiOf(app).calls, isNot(contains('addToShopWishlist')));
    expect(find.text("Notify me when it's back"), findsNothing);
    expect(find.byKey(const ValueKey('product-reviews')), findsNothing);
  });

  testWidgets('notify me when it\'s back, then we\'ll tell you', (
    tester,
  ) async {
    final app = await open(
      tester,
      product: {
        ...productDetailJson(stock: 'out_of_stock'),
        'purchasable': false,
        'back_in_stock': {'waiting': false, 'variations': <int>[]},
      },
    );
    await go(tester, app, Paths.product(21));
    await tester.tap(find.text("Notify me when it's back"));
    await TestApp.settle(tester);
    expect(apiOf(app).stockWaits, [(21, null)]);
    expect(find.text("We'll tell you when it's back"), findsOneWidget);
  });

  testWidgets('the product page\'s reviews: the bars, the photos, writing one '
      'with its stars', (tester) async {
    final review = {
      'id': 7,
      'rating': 5,
      'text': 'Lovely flowers',
      'author': {'name': 'Ahmed K.', 'instructor': false},
      'created_at': '2026-11-20T10:00:00Z',
      'status': 'approved',
      'mine': false,
      'photos': [
        {'url': 'https://yallapp.test/m/a'},
      ],
    };
    final app = await open(
      tester,
      product: {
        ...productDetailJson(),
        'reviews_preview': {
          'summary': {
            'rating': 5,
            'rating_count': 1,
            'counts': {'1': 0, '2': 0, '3': 0, '4': 0, '5': 1},
          },
          'items': [review],
          'photos': [
            {'url': 'https://yallapp.test/m/a', 'review_id': 7},
          ],
          'photo_count': 1,
          'mine': null,
          'can_review': true,
        },
      },
    );
    await go(tester, app, Paths.product(21));
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('write-product-review')),
      300,
      scrollable: find.byType(Scrollable).first,
    );
    expect(find.text('Lovely flowers'), findsOneWidget);
    expect(find.text('Ahmed K.'), findsOneWidget);
    expect(find.text('Photos from customers'), findsOneWidget);
    expect(find.byKey(const ValueKey('product-review-photos')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('write-product-review')));
    await TestApp.settle(tester);
    // No stars yet: asked for them.
    await tester.tap(find.byKey(const ValueKey('review-send')));
    await TestApp.settle(tester);
    expect(apiOf(app).savedReviews, isEmpty);
    // The fourth star.
    await tester.tap(
      find
          .descendant(
            of: find.byType(ProductReviewComposer),
            matching: find.byType(InkResponse),
          )
          .at(3),
    );
    await tester.enterText(find.byKey(const ValueKey('review-text')), 'Fresh');
    await tester.tap(find.byKey(const ValueKey('review-send')));
    await TestApp.settle(tester);
    expect(apiOf(app).savedReviews.single.text, 'Fresh');
    expect(apiOf(app).savedReviews.single.productId, 21);
  });

  testWidgets('the shop\'s filters: the sizes and colours chosen are sent', (
    tester,
  ) async {
    final app = await open(
      tester,
      filters: {
        'choices': [
          {
            'key': 'size',
            'name': 'Size',
            'kind': 'size',
            'values': [
              {'value': 'S', 'label': 'S', 'count': 3},
              {'value': 'M', 'label': 'M', 'count': 4},
            ],
          },
          {
            'key': 'colour',
            'name': 'Colour',
            'kind': 'colour',
            'values': [
              {
                'value': 'Black',
                'label': 'Black',
                'count': 2,
                'swatch': '#111111',
              },
            ],
          },
        ],
        'price': {'min': '10.00', 'max': '300.00', 'currency': 'TRY'},
        'brands': <Object>[],
        'sorts': ['newest'],
      },
    );
    await go(tester, app, '${Paths.shop}?sort=newest');
    await tester.tap(find.byKey(const ValueKey('shop-filters-button')));
    await TestApp.settle(tester);
    await tester.tap(find.byKey(const ValueKey('filter-size-M')));
    await tester.tap(find.byKey(const ValueKey('filter-colour-Black')));
    await tester.tap(find.byKey(const ValueKey('filter-apply')));
    await TestApp.settle(tester);
    expect(apiOf(app).lastProductQuery?.filters, {
      'size': 'M',
      'colour': 'Black',
    });
    expect(find.bySemanticsLabel('Filters, 2 active'), findsOneWidget);
    await TestApp.settle(tester, 30);
  });

  testWidgets('an older server: the shop\'s sort only', (tester) async {
    final older = await open(tester);
    await go(tester, older, '${Paths.shop}?sort=newest');
    expect(find.byKey(const ValueKey('shop-filters-button')), findsNothing);
    await TestApp.settle(tester, 30);
  });

  test('a back-in-stock push opens its product; the models read the new '
      'fields and do without them', () {
    expect(
      pushTargetLocation({'type': 'back_in_stock', 'product_id': '21'}),
      '/product/21',
    );
    final config = StoreConfig.fromJson(store());
    expect(config.wishlist, isTrue);
    expect(config.backInStock, isTrue);
    expect(config.reviewPhotos?.max, 4);
    final old = StoreConfig.fromJson(storeConfigJson());
    expect(old.wishlist, isFalse);
    expect(old.reviewPhotos, isNull);
    final detail = ProductDetail.fromJson({
      ...productDetailJson(),
      'back_in_stock': {
        'waiting': false,
        'variations': [12],
      },
    });
    expect(detail.backInStock!.waitsFor(12), isTrue);
    expect(detail.backInStock!.waitsFor(null), isFalse);
    expect(detail.reviewsPreview, isNull);
    const query = ProductQuery(filters: {'size': 'M', 'min_price': '10'});
    expect(query.filterCount, 2);
    expect(query.toQuery()['size'], 'M');
    expect(const ProductQuery(ids: [3, 4]).toQuery()['ids'], '3,4');
    final filters = ShopFilters.fromJson({
      'choices': [
        {'key': 'fit', 'name': 'Fit', 'kind': 'choice', 'values': <Object>[]},
      ],
      'price': null,
      'brands': [
        {'value': 'Noun', 'count': 2},
      ],
      'sorts': <Object>[],
    });
    expect(filters.choices.single.param, 'f.fit');
    expect(filters.brands, ['Noun']);
    expect(ShopFilters.none.any, isFalse);
  });
}
