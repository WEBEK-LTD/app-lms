import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/providers.dart';
import 'cart_controller.dart';

final storeHomeProvider = FutureProvider.autoDispose<List<StoreHomeSection>>(
  (ref) => ref.contentApi.getStoreHome(),
);

final productCategoriesProvider = FutureProvider<List<ProductCategory>>(
  (ref) => ref.contentApi.listProductCategories(),
);

final productProvider = FutureProvider.autoDispose.family<ProductDetail, int>(
  (ref, id) => ref.contentApi.getProduct(id),
);

/// The catalog for one search, category, filter and order.
class ProductsController extends PagedController<ProductSummary> {
  ProductsController(this.query);

  final ProductQuery query;

  @override
  Future<Paged<ProductSummary>> fetch(int page) =>
      ref.read(yallappApiProvider).listProducts(query.copyWith(page: page));
}

final productsProvider = NotifierProvider.autoDispose
    .family<ProductsController, PagedState<ProductSummary>, ProductQuery>(
      ProductsController.new,
    );

class ProductReviewsController extends PagedController<Review> {
  ProductReviewsController(this.productId);

  final int productId;
  RatingSummary? summary;

  @override
  Future<Paged<Review>> fetch(int page) async {
    final result = await ref
        .read(yallappApiProvider)
        .listProductReviews(productId, page: page);
    summary = result.summary;
    return result.page;
  }
}

final productReviewsProvider = NotifierProvider.autoDispose
    .family<ProductReviewsController, PagedState<Review>, int>(
      ProductReviewsController.new,
    );

/// 91.1 The coupon code the customer typed in the cart; null without one.
class CartCouponController extends Notifier<String?> {
  @override
  String? build() => null;

  void set(String? code) {
    final value = code?.trim().replaceAll(RegExp(r'\s+'), '').toUpperCase();
    state = value == null || value.isEmpty ? null : value;
  }
}

final cartCouponProvider = NotifierProvider<CartCouponController, String?>(
  CartCouponController.new,
);

/// 91.4 Whether the customer uses their loyalty points on this order.
class CartUsePointsController extends Notifier<bool> {
  @override
  bool build() => false;

  void set(bool use) => state = use;
}

final cartUsePointsProvider = NotifierProvider<CartUsePointsController, bool>(
  CartUsePointsController.new,
);

/// The cart as the shop prices it now, with the customer's coupon (91.4 and
/// points). Reloads when the cart, the coupon or the points choice changes.
final cartQuoteProvider = FutureProvider.autoDispose<CartQuote?>((ref) {
  final items = ref.watch(cartProvider);
  final coupon = ref.watch(cartCouponProvider);
  final usePoints = ref.watch(cartUsePointsProvider);
  if (items.isEmpty) return Future.value();
  return ref.contentApi.quoteCart(
    [for (final i in items) i.toInput()],
    coupon: coupon,
    usePoints: usePoints,
  );
});

/// 26 Whether a restaurant's kitchen is open now and the times an order can
/// be for. Asked again whenever the cart opens.
final orderTimesProvider = FutureProvider.autoDispose<OrderTimes>(
  (ref) => ref.contentApi.getOrderTimes(),
);
