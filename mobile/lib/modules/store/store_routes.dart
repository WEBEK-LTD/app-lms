import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/models/models.dart';
import '../../core/config/build_config_data.dart';
import '../../core/l10n/l10n.dart';
import '../../core/l10n/vertical_wording.dart';
import '../../core/routing/app_module.dart';
import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'data/cart_controller.dart';
import 'screens/cart_screen.dart';
import 'screens/menu_screen.dart';
import 'screens/product_reviews_screen.dart';
import 'screens/product_screen.dart';
import 'screens/shop_screen.dart';
import 'screens/store_home_screen.dart';

/// The Store module: home, shop, cart and the account as tabs, and the
/// product pages.
final storeModule = AppModule(
  tabPaths: {Paths.home, Paths.shop, Paths.cart, Paths.account},
  screens: _screens,
  defaultTabs: (_) => _defaultTabs,
  screenLocation: (screen, config) => switch (screen) {
    BuiltInScreen.courses => Paths.shop,
    // 26 A restaurant's Menu tab (the layout's search screen) opens its menu.
    BuiltInScreen.search =>
      config?.vertical == AppVertical.restaurant
          ? Paths.shop
          : '${Paths.shop}?focus=1',
    BuiltInScreen.account => Paths.account,
    BuiltInScreen.settings => Paths.settings,
    BuiltInScreen.notifications => Paths.notifications,
    BuiltInScreen.cart => Paths.cart,
    BuiltInScreen.orders => Paths.orders,
    BuiltInScreen.myCourses ||
    BuiltInScreen.favorites ||
    BuiltInScreen.messages ||
    BuiltInScreen.services ||
    BuiltInScreen.appointments ||
    BuiltInScreen.articles ||
    BuiltInScreen.bookmarks => null,
  },
  routes: _pushedRoutes,
  badges: (ref) => {Paths.cart: ref.watch(cartCountProvider)},
);

final _defaultTabs = [
  ShellTab(
    icon: AppIcons.home,
    label: (c) => c.l10n.tabHome,
    location: Paths.home,
  ),
  ShellTab(
    icon: AppIcons.shop,
    label: (c) => c.words.shop,
    location: Paths.shop,
  ),
  ShellTab(
    icon: AppIcons.cart,
    label: (c) => c.l10n.tabCart,
    location: Paths.cart,
  ),
  ShellTab(
    icon: AppIcons.account,
    label: (c) => c.l10n.tabAccount,
    location: Paths.account,
  ),
];

List<TabScreen> _screens() => [
  TabScreen(Paths.home, (state) => const StoreHomeScreen()),
  TabScreen(Paths.shop, (state) {
    final q = state.uri.queryParameters;
    // 26 A restaurant's Shop tab is its menu; search and filters stay the shop's.
    if (q.isEmpty) return const _MenuOrShop();
    return ShopScreen(
      key: const ValueKey('shop'),
      initialCategory: int.tryParse(q['category'] ?? ''),
      initialOnSale: q['sale'] == '1',
      initialOrder: productOrderFrom(q['sort']),
      focusSearch: q['focus'] == '1',
    );
  }),
  TabScreen(Paths.cart, (state) => const CartScreen()),
  TabScreen(
    Paths.account,
    (state) => const ProfileScreen(),
    routes: accountSubRoutes(),
  ),
];

/// 26 The Shop tab: a restaurant's menu, or the shop.
class _MenuOrShop extends ConsumerWidget {
  const _MenuOrShop();

  @override
  Widget build(BuildContext context, WidgetRef ref) =>
      ref.watch(appVerticalProvider) == AppVertical.restaurant
      ? const MenuScreen()
      : const ShopScreen(key: ValueKey('shop'));
}

List<RouteBase> _pushedRoutes() => [
  GoRoute(
    path: '/product/:id',
    pageBuilder: (context, state) {
      final id = intParam(state, 'id');
      return appPage(
        state,
        id == null ? const NotFoundScreen() : ProductScreen(productId: id),
      );
    },
    routes: [
      GoRoute(
        path: 'reviews',
        pageBuilder: (context, state) {
          final id = intParam(state, 'id');
          return appPage(
            state,
            id == null
                ? const NotFoundScreen()
                : ProductReviewsScreen(productId: id),
          );
        },
      ),
    ],
  ),
];
