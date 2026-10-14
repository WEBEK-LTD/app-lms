import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/data/lms_providers.dart' show unreadNotificationsProvider;
import '../data/store_providers.dart';
import '../widgets/product_widgets.dart';
import '../../../core/l10n/l10n.dart';

/// The Store app's Home: sections from `GET /store/home` in the order set in
/// the plugin.
class StoreHomeScreen extends ConsumerWidget {
  const StoreHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sections = ref.watch(storeHomeProvider);
    Future<void> refresh() => ref.refresh(storeHomeProvider.future);
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: refresh,
          child: switch (sections) {
            AsyncData(:final value) => _Sections(sections: value),
            AsyncError(:final error) => ListView(
              children: [
                SizedBox(
                  height: MediaQuery.sizeOf(context).height * 0.8,
                  child: ErrorView(error: error, onRetry: refresh),
                ),
              ],
            ),
            _ => LoadingView(label: context.l10n.loadingShop),
          },
        ),
      ),
    );
  }
}

class _Sections extends ConsumerWidget {
  const _Sections({required this.sections});

  final List<StoreHomeSection> sections;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final site = ref.watch(appConfigProvider).site.name;
    final known = [
      for (final s in sections)
        if (s.type != StoreSectionType.unknown) s,
    ];
    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: Row(
            children: [
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(
                    site,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                ),
              ),
              const _NotificationsButton(),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 4),
          child: _SearchField(onTap: () => context.go(_shopSearch)),
        ),
        if (known.isEmpty)
          Padding(
            padding: EdgeInsets.only(top: 48),
            child: MessageView(
              icon: AppIcons.shop,
              title: context.l10n.shopGettingReady,
              message: context.l10n.newProductsSoon,
              compact: true,
            ),
          ),
        for (final s in known) _section(context, s),
      ],
    );
  }

  Widget _section(BuildContext context, StoreHomeSection s) {
    switch (s.type) {
      case StoreSectionType.banner:
        final banner = s.banner;
        if (banner == null) return const SizedBox.shrink();
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
          child: _Banner(banner: banner),
        );
      case StoreSectionType.categories:
        return _Block(
          title: s.title ?? context.l10n.categories,
          onSeeAll: () => context.go(Paths.shop),
          child: SizedBox(
            height: 76 + MediaQuery.textScalerOf(context).scale(36),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: s.categories.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final c = s.categories[i];
                return CategoryChip(
                  category: c,
                  onTap: () => context.go(Paths.shopFiltered(category: c.id)),
                );
              },
            ),
          ),
        );
      case StoreSectionType.featuredProducts:
      case StoreSectionType.saleProducts:
      case StoreSectionType.newProducts:
      case StoreSectionType.bestSellers:
        if (s.products.isEmpty) return const SizedBox.shrink();
        return _Block(
          title: s.title ?? _defaultTitle(s.type),
          onSeeAll: () => context.go(switch (s.type) {
            StoreSectionType.saleProducts => Paths.shopFiltered(onSale: true),
            StoreSectionType.bestSellers => '${Paths.shop}?sort=popular',
            _ => Paths.shop,
          }),
          child: SizedBox(
            height: 160 + productCardTextHeight(context),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: s.products.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) {
                final product = s.products[i];
                return Align(
                  alignment: Alignment.topCenter,
                  child: ProductCard(
                    product: product,
                    width: 160,
                    onTap: () => context.push(Paths.product(product.id)),
                  ),
                );
              },
            ),
          ),
        );
      case StoreSectionType.unknown:
        return const SizedBox.shrink();
    }
  }
}

final _shopSearch = Uri(
  path: Paths.shop,
  queryParameters: {'focus': '1'},
).toString();

String _defaultTitle(StoreSectionType type) => switch (type) {
  StoreSectionType.featuredProducts => currentL10n.featured,
  StoreSectionType.saleProducts => currentL10n.onSale,
  StoreSectionType.newProducts => currentL10n.newArrivals,
  StoreSectionType.bestSellers => currentL10n.bestSellers,
  _ => '',
};

class _Block extends StatelessWidget {
  const _Block({required this.title, required this.child, this.onSeeAll});

  final String title;
  final Widget child;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 22),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.fromSTEB(20, 0, 12, 10),
          child: SectionHeader(title: title, onSeeAll: onSeeAll),
        ),
        child,
      ],
    ),
  );
}

class _Banner extends StatelessWidget {
  const _Banner({required this.banner});

  final StoreBanner banner;

  @override
  Widget build(BuildContext context) {
    final product = banner.linkProductId;
    final category = banner.linkCategoryId;
    final VoidCallback? onTap = product != null
        ? () => context.push(Paths.product(product))
        : category != null
        ? () => context.go(Paths.shopFiltered(category: category))
        : null;
    return Semantics(
      button: onTap != null,
      image: true,
      label: context.l10n.offer,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: AspectRatio(
          aspectRatio: 16 / 7,
          child: AppNetworkImage(
            url: banner.imageUrl,
            radius: context.shapes.card,
          ),
        ),
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: context.l10n.searchProducts,
      excludeSemantics: true,
      child: Material(
        color: p.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(context.shapes.button),
          side: BorderSide(color: p.border),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(
            height: 50,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: [
                  AppIcon(AppIcons.search, size: 20, color: p.textSecondary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      context.l10n.searchProducts,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 15, color: p.textSecondary),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NotificationsButton extends ConsumerWidget {
  const _NotificationsButton();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!ref.watch(authControllerProvider).isSignedIn) {
      return const SizedBox.shrink();
    }
    final unread = ref.watch(unreadNotificationsProvider).value ?? 0;
    return SquareIconButton(
      icon: AppIcons.notifications,
      label: unread > 0
          ? context.l10n.notificationsUnread(unread)
          : context.l10n.notifications,
      badge: unread > 0,
      onPressed: () => context.push(Paths.notifications),
    );
  }
}
