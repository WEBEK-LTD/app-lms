import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/widgets/common.dart';
import '../data/real_estate_providers.dart';
import '../widgets/listing_widgets.dart';

import 'package:go_router/go_router.dart';

/// The listings the user saved with the heart.
class FavoritesScreen extends ConsumerWidget {
  const FavoritesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final signedIn = ref.watch(authControllerProvider).isSignedIn;
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.tabFavorites),
            Expanded(
              child: signedIn
                  ? const _FavoritesList()
                  : SignInPrompt(
                      icon: AppIcons.favorite,
                      title: l10n.favoritesSignInTitle,
                      message: l10n.favoritesSignInMessage,
                      from: Paths.favorites,
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FavoritesList extends ConsumerWidget {
  const _FavoritesList();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(favoritesProvider);
    final controller = ref.read(favoritesProvider.notifier);
    final overrides = ref.watch(favoriteOverridesProvider);
    // Hearts removed here disappear at once.
    final items = [
      for (final l in state.items)
        if (overrides[l.id] ?? true) l,
    ];
    final error = state.error;
    final Widget body;
    if (state.isInitialLoading) {
      body = SkeletonList(
        layout: SkeletonLayout.media,
        count: 3,
        label: l10n.loadingFavorites,
      );
    } else if (error != null && items.isEmpty) {
      body = ListView(
        children: [
          SizedBox(
            height: 400,
            child: ErrorView(error: error, onRetry: controller.retry),
          ),
        ],
      );
    } else if (items.isEmpty) {
      body = ListView(
        children: [
          SizedBox(
            height: 400,
            child: MessageView(
              icon: AppIcons.favorite,
              title: l10n.noFavoritesTitle,
              message: l10n.noFavoritesMessage,
              // 110 Every empty list leads somewhere.
              actionLabel: l10n.browseListings,
              onAction: () => context.go(Paths.search),
            ),
          ),
        ],
      );
    } else {
      body = ListingGrid(
        listings: items,
        loadingMore: state.hasMore && error == null,
        onNearEnd: controller.loadMore,
      );
    }
    return RefreshIndicator(onRefresh: controller.refresh, child: body);
  }
}
