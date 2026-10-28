import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';

/// 105.1 How the food delivery company takes orders (`Config.food`); the
/// defaults on older servers.
final foodConfigProvider = Provider<FoodConfig>((ref) {
  final gate = ref.watch(appGateProvider);
  return gate is GateReady
      ? (gate.config.food ?? const FoodConfig())
      : const FoodConfig();
});

/// The signed-in person works for one of the company's restaurants: the
/// Restaurant tab is theirs only.
final isRestaurantProvider = Provider<bool>((ref) {
  if (ref.watch(appEnvironmentProvider).build.appType != AppType.food) {
    return false;
  }
  return ref.watch(authControllerProvider).user?.isRestaurant ?? false;
});

/// The restaurants list's search and cuisine.
typedef RestaurantFilter = ({String query, String? cuisine});

class RestaurantFilterController extends Notifier<RestaurantFilter> {
  @override
  RestaurantFilter build() => (query: '', cuisine: null);

  void setQuery(String query) => state = (query: query, cuisine: state.cuisine);

  void setCuisine(String? cuisine) =>
      state = (query: state.query, cuisine: cuisine);
}

final restaurantFilterProvider =
    NotifierProvider<RestaurantFilterController, RestaurantFilter>(
      RestaurantFilterController.new,
    );

/// The company's restaurants, open ones first, filtered as the customer
/// chose.
class RestaurantsController extends PagedController<RestaurantSummary> {
  @override
  PagedState<RestaurantSummary> build() {
    ref.watch(restaurantFilterProvider);
    return super.build();
  }

  @override
  Future<Paged<RestaurantSummary>> fetch(int page) {
    final filter = ref.read(restaurantFilterProvider);
    return ref
        .read(yallappApiProvider)
        .listRestaurants(
          page: page,
          query: filter.query,
          cuisine: filter.cuisine,
        );
  }
}

final restaurantsProvider =
    NotifierProvider.autoDispose<
      RestaurantsController,
      PagedState<RestaurantSummary>
    >(RestaurantsController.new);

final restaurantProvider = FutureProvider.autoDispose.family<Restaurant, int>(
  (ref, id) => ref.contentApi.getRestaurant(id),
);

/// The cart: one restaurant's dishes at a time.
class FoodCart {
  const FoodCart({
    this.restaurantId,
    this.restaurantName,
    this.lines = const [],
  });

  final int? restaurantId;
  final String? restaurantName;
  final List<FoodCartLine> lines;

  bool get isEmpty => lines.isEmpty;
  int get count => lines.fold(0, (sum, l) => sum + l.quantity);
}

class FoodCartController extends Notifier<FoodCart> {
  @override
  FoodCart build() => const FoodCart();

  /// Whether adding from this restaurant replaces another one's dishes.
  bool replaces(int restaurantId) =>
      !state.isEmpty && state.restaurantId != restaurantId;

  /// Adds the line (to the same dish with the same choices when there is
  /// one); a dish of another restaurant starts a new cart.
  void add(int restaurantId, String restaurantName, FoodCartLine line) {
    final lines = state.restaurantId == restaurantId
        ? [...state.lines]
        : <FoodCartLine>[];
    final at = lines.indexWhere((l) => l.sameAs(line));
    if (at >= 0) {
      final merged = (lines[at].quantity + line.quantity).clamp(1, 50);
      lines[at] = lines[at].withQuantity(merged);
    } else {
      lines.add(line);
    }
    state = FoodCart(
      restaurantId: restaurantId,
      restaurantName: restaurantName,
      lines: lines,
    );
  }

  /// Sets a line's quantity; 0 takes it out.
  void setQuantity(int index, int quantity) {
    final lines = [...state.lines];
    if (index < 0 || index >= lines.length) return;
    if (quantity <= 0) {
      lines.removeAt(index);
    } else {
      lines[index] = lines[index].withQuantity(quantity.clamp(1, 50));
    }
    state = lines.isEmpty
        ? const FoodCart()
        : FoodCart(
            restaurantId: state.restaurantId,
            restaurantName: state.restaurantName,
            lines: lines,
          );
  }

  void clear() => state = const FoodCart();
}

final foodCartProvider = NotifierProvider<FoodCartController, FoodCart>(
  FoodCartController.new,
);

/// The signed-in customer's food orders, newest first.
class MyFoodOrdersController extends PagedController<FoodOrder> {
  @override
  Future<Paged<FoodOrder>> fetch(int page) =>
      ref.read(yallappApiProvider).listMyFoodOrders(page: page);
}

final myFoodOrdersProvider =
    NotifierProvider.autoDispose<MyFoodOrdersController, PagedState<FoodOrder>>(
      MyFoodOrdersController.new,
    );

final foodOrderProvider = FutureProvider.autoDispose.family<FoodOrder, int>(
  (ref, id) => ref.read(yallappApiProvider).getMyFoodOrder(id),
);

final restaurantDeskProvider = FutureProvider.autoDispose<RestaurantDesk>(
  (ref) => ref.read(yallappApiProvider).getRestaurantDesk(),
);

class _RestaurantOrdersController extends PagedController<RestaurantOrder> {
  _RestaurantOrdersController(this.scope);

  final RestaurantScope scope;

  @override
  Future<Paged<RestaurantOrder>> fetch(int page) =>
      ref.read(yallappApiProvider).listRestaurantOrders(scope, page: page);
}

final newRestaurantOrdersProvider =
    NotifierProvider.autoDispose<
      _RestaurantOrdersController,
      PagedState<RestaurantOrder>
    >(() => _RestaurantOrdersController(RestaurantScope.newOrders));
final activeRestaurantOrdersProvider =
    NotifierProvider.autoDispose<
      _RestaurantOrdersController,
      PagedState<RestaurantOrder>
    >(() => _RestaurantOrdersController(RestaurantScope.active));
final doneRestaurantOrdersProvider =
    NotifierProvider.autoDispose<
      _RestaurantOrdersController,
      PagedState<RestaurantOrder>
    >(() => _RestaurantOrdersController(RestaurantScope.done));

final restaurantOrderProvider = FutureProvider.autoDispose
    .family<RestaurantOrder, int>(
      (ref, id) => ref.read(yallappApiProvider).getRestaurantOrder(id),
    );
