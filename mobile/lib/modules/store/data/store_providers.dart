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

/// The cart as the shop prices it now. Reloads when the cart changes.
final cartQuoteProvider = FutureProvider.autoDispose<CartQuote?>((ref) {
  final items = ref.watch(cartProvider);
  if (items.isEmpty) return Future.value();
  return ref.contentApi.quoteCart([for (final i in items) i.toInput()]);
});

/// 26 Whether a restaurant's kitchen is open now and the times an order can
/// be for. Asked again whenever the cart opens.
final orderTimesProvider = FutureProvider.autoDispose<OrderTimes>(
  (ref) => ref.contentApi.getOrderTimes(),
);
