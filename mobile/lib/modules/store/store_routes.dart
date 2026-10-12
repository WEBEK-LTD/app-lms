import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/routing/paths.dart';
import '../../core/theme/app_icons.dart';
import '../../core/widgets/app_nav_bar.dart';
import '../shared/account/profile_screen.dart';
import '../shared/shared_routes.dart';
import 'data/cart_controller.dart';
import 'screens/cart_screen.dart';
import 'screens/product_reviews_screen.dart';
import 'screens/product_screen.dart';
import 'screens/shop_screen.dart';
import 'screens/store_home_screen.dart';

const storeDestinations = [
  NavDestination(AppIcons.home, 'Home'),
  NavDestination(AppIcons.shop, 'Shop'),
  NavDestination(AppIcons.cart, 'Cart'),
  NavDestination(AppIcons.account, 'Account'),
];

const _cartTab = 2;

/// The Store module's routes: sign-in, the four tabs and the pushed screens.
List<RouteBase> storeRoutes() => [
  signInRoute(),
  StatefulShellRoute.indexedStack(
    pageBuilder: (context, state, shell) =>
        appPage(state, _StoreShell(shell: shell)),
    branches: [
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.home,
            pageBuilder: (context, state) =>
                appPage(state, const StoreHomeScreen()),
          ),
        ],
      ),
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.shop,
            pageBuilder: (context, state) {
              final q = state.uri.queryParameters;
              return appPage(
                state,
                ShopScreen(
                  key: const ValueKey('shop'),
                  initialCategory: int.tryParse(q['category'] ?? ''),
                  initialOnSale: q['sale'] == '1',
                  initialOrder: productOrderFrom(q['sort']),
                  focusSearch: q['focus'] == '1',
                ),
              );
            },
          ),
        ],
      ),
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.cart,
            pageBuilder: (context, state) => appPage(state, const CartScreen()),
          ),
        ],
      ),
      StatefulShellBranch(
        routes: [
          GoRoute(
            path: Paths.account,
            pageBuilder: (context, state) =>
                appPage(state, const ProfileScreen()),
            routes: accountSubRoutes(),
          ),
        ],
      ),
    ],
  ),
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
  ...sharedPageRoutes(),
];

class _StoreShell extends ConsumerWidget {
  const _StoreShell({required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) => MainShell(
    shell: shell,
    destinations: storeDestinations,
    badges: {_cartTab: ref.watch(cartCountProvider)},
  );
}
