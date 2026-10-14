import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show SystemUiOverlayStyle;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/config/build_config_data.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_look.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../lms/data/lms_providers.dart' show unreadNotificationsProvider;
import '../data/store_providers.dart';
import '../widgets/product_widgets.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/vertical_wording.dart';

/// The Store app's Home: sections from `GET /store/home` in the order set in
/// the plugin, in the look of the app's template.
class StoreHomeScreen extends ConsumerWidget {
  const StoreHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sections = ref.watch(storeHomeProvider);
    Future<void> refresh() => ref.refresh(storeHomeProvider.future);
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: refresh,
        edgeOffset: MediaQuery.paddingOf(context).top,
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
          _ => SkeletonHome(label: context.l10n.loadingShop),
        },
      ),
    );
  }
}

class _Sections extends ConsumerWidget {
  const _Sections({required this.sections});

  final List<StoreHomeSection> sections;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final site = ref.watch(appConfigProvider).site.name;
    final template = ref.watch(appLookProvider).template;
    final known = [
      for (final s in sections)
        if (s.type != StoreSectionType.unknown) s,
    ];
    return ListView(
      padding: const EdgeInsets.only(bottom: 24),
      children: [
        switch (template) {
          AppTemplate.classic => _ClassicHeader(site: site),
          AppTemplate.bold => _BoldHeader(site: site),
          AppTemplate.minimal => _MinimalHeader(site: site),
        },
        if (known.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 48),
            child: MessageView(
              icon: AppIcons.shop,
              title: context.l10n.shopGettingReady,
              message: context.l10n.newProductsSoon,
              compact: true,
            ),
          ),
        for (final s in known) _section(context, s, template),
      ],
    );
  }

  Widget _section(
    BuildContext context,
    StoreHomeSection s,
    AppTemplate template,
  ) {
    switch (s.type) {
      case StoreSectionType.banner:
        final banner = s.banner;
        if (banner == null) return const SizedBox.shrink();
        return Padding(
          padding: EdgeInsets.fromLTRB(
            20,
            template == AppTemplate.bold ? 22 : 16,
            20,
            0,
          ),
          child: _Banner(banner: banner, title: s.title),
        );
      case StoreSectionType.categories:
        if (s.categories.isEmpty) return const SizedBox.shrink();
        final title = s.title ?? context.l10n.categories;
        void open(ProductCategory c) =>
            context.go(Paths.shopFiltered(category: c.id));
        if (template == AppTemplate.minimal) {
          // Minimal: names only, as chips.
          return _Block(
            title: title,
            template: template,
            onSeeAll: () => context.go(Paths.shop),
            child: SizedBox(
              height: chipRowHeight(context),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: s.categories.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, i) => PillChip(
                  label: s.categories[i].name,
                  selected: false,
                  onTap: () => open(s.categories[i]),
                ),
              ),
            ),
          );
        }
        return _Block(
          title: title,
          template: template,
          onSeeAll: () => context.go(Paths.shop),
          child: SizedBox(
            height: 76 + MediaQuery.textScalerOf(context).scale(36),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: s.categories.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, i) => CategoryChip(
                category: s.categories[i],
                square: template == AppTemplate.bold,
                onTap: () => open(s.categories[i]),
              ),
            ),
          ),
        );
      case StoreSectionType.featuredProducts:
      case StoreSectionType.saleProducts:
      case StoreSectionType.newProducts:
      case StoreSectionType.bestSellers:
        if (s.products.isEmpty) return const SizedBox.shrink();
        final width = template == AppTemplate.bold ? 184.0 : 160.0;
        final plain = template == AppTemplate.minimal;
        return _Block(
          title: s.title ?? _defaultTitle(s.type),
          template: template,
          onSeeAll: () => context.go(switch (s.type) {
            StoreSectionType.saleProducts => Paths.shopFiltered(onSale: true),
            StoreSectionType.bestSellers => '${Paths.shop}?sort=popular',
            _ => Paths.shop,
          }),
          child: SizedBox(
            height: width + productCardTextHeight(context),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: s.products.length,
              separatorBuilder: (_, _) => SizedBox(width: plain ? 16 : 12),
              itemBuilder: (context, i) {
                final product = s.products[i];
                return Align(
                  alignment: Alignment.topCenter,
                  child: ProductCard(
                    product: product,
                    width: width,
                    plain: plain,
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

/// Classic: the shop's name, notifications and a search field.
class _ClassicHeader extends StatelessWidget {
  const _ClassicHeader({required this.site});

  final String site;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        MediaQuery.paddingOf(context).top + 16,
        20,
        4,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
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
          const SizedBox(height: 14),
          _SearchField(onTap: () => context.go(_shopSearch)),
        ],
      ),
    );
  }
}

/// Bold: a block in the brand color with a pill search field.
class _BoldHeader extends StatelessWidget {
  const _BoldHeader({required this.site});

  final String site;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: overlayStyleOn(p.primary),
      child: Container(
        decoration: BoxDecoration(
          color: p.primary,
          borderRadius: BorderRadius.vertical(
            bottom: Radius.circular(context.shapes.r(28)),
          ),
        ),
        padding: EdgeInsets.fromLTRB(
          20,
          MediaQuery.paddingOf(context).top + 20,
          20,
          24,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        context.l10n.welcomeBack,
                        style: TextStyle(
                          fontSize: 14,
                          color: p.onPrimary.withValues(alpha: 0.78),
                        ),
                      ),
                      Semantics(
                        header: true,
                        child: Text(
                          site,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: p.onPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const _NotificationsButton(onPrimary: true),
              ],
            ),
            const SizedBox(height: 18),
            _SearchField(onTap: () => context.go(_shopSearch), pill: true),
          ],
        ),
      ),
    );
  }
}

/// Minimal: a large title with search and notifications as plain icons.
class _MinimalHeader extends StatelessWidget {
  const _MinimalHeader({required this.site});

  final String site;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        24,
        MediaQuery.paddingOf(context).top + 20,
        16,
        0,
      ),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              header: true,
              child: Text(
                site,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 30,
                  fontWeight: FontWeight.w800,
                  letterSpacing: -0.8,
                  height: 1.15,
                  color: p.text,
                ),
              ),
            ),
          ),
          SquareIconButton(
            icon: AppIcons.search,
            label: context.words.searchProducts,
            background: Colors.transparent,
            bordered: false,
            onPressed: () => context.go(_shopSearch),
          ),
          const _NotificationsButton(plain: true),
        ],
      ),
    );
  }
}

class _Block extends StatelessWidget {
  const _Block({
    required this.title,
    required this.child,
    required this.template,
    this.onSeeAll,
  });

  final String title;
  final Widget child;
  final AppTemplate template;
  final VoidCallback? onSeeAll;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(top: template == AppTemplate.minimal ? 28 : 22),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: EdgeInsetsDirectional.fromSTEB(
            template == AppTemplate.minimal ? 24 : 20,
            0,
            12,
            10,
          ),
          child: SectionHeader(
            title: title,
            onSeeAll: onSeeAll,
            size: template == AppTemplate.bold ? 20 : 18,
            weight: template == AppTemplate.classic
                ? FontWeight.w700
                : FontWeight.w800,
          ),
        ),
        child,
      ],
    ),
  );
}

class _Banner extends StatelessWidget {
  const _Banner({required this.banner, this.title});

  final StoreBanner banner;

  /// The section's title, written on the picture.
  final String? title;

  @override
  Widget build(BuildContext context) {
    final product = banner.linkProductId;
    final category = banner.linkCategoryId;
    final VoidCallback? onTap = product != null
        ? () => context.push(Paths.product(product))
        : category != null
        ? () => context.go(Paths.shopFiltered(category: category))
        : null;
    final heading = title?.trim() ?? '';
    return Semantics(
      button: onTap != null,
      image: true,
      label: heading.isEmpty ? context.l10n.offer : heading,
      excludeSemantics: true,
      child: Material(
        color: context.palette.placeholderFor(0),
        borderRadius: BorderRadius.circular(context.shapes.card),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: AspectRatio(
            aspectRatio: 16 / 7,
            child: Stack(
              fit: StackFit.expand,
              children: [
                AppNetworkImage(
                  url: banner.imageUrl,
                  placeholderIcon: AppIcons.sale,
                ),
                if (heading.isNotEmpty)
                  Align(
                    alignment: AlignmentDirectional.bottomStart,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsetsDirectional.fromSTEB(
                        18,
                        12,
                        18,
                        14,
                      ),
                      // A flat scrim keeps the title readable on any image.
                      color: const Color(0xA60E0D24),
                      child: Row(
                        children: [
                          Expanded(
                            child: Text(
                              heading,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                height: 1.25,
                              ),
                            ),
                          ),
                          if (onTap != null)
                            const AppIcon(
                              AppIcons.arrowForward,
                              size: 20,
                              color: Colors.white,
                            ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.onTap, this.pill = false});

  final VoidCallback onTap;
  final bool pill;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: context.words.searchProducts,
      excludeSemantics: true,
      child: Material(
        color: p.surface,
        shape: pill
            ? const StadiumBorder()
            : RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(context.shapes.button),
                side: BorderSide(color: p.border),
              ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: SizedBox(
            height: 50,
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: pill ? 18 : 16),
              child: Row(
                children: [
                  AppIcon(AppIcons.search, size: 20, color: p.textSecondary),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      context.words.searchProducts,
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
  const _NotificationsButton({this.onPrimary = false, this.plain = false});

  final bool onPrimary;
  final bool plain;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!ref.watch(authControllerProvider).isSignedIn) {
      return const SizedBox.shrink();
    }
    final p = context.palette;
    final unread = ref.watch(unreadNotificationsProvider).value ?? 0;
    return SquareIconButton(
      icon: AppIcons.notifications,
      label: unread > 0
          ? context.l10n.notificationsUnread(unread)
          : context.l10n.notifications,
      badge: unread > 0,
      background: onPrimary
          ? p.primarySoft
          : plain
          ? Colors.transparent
          : null,
      foreground: onPrimary ? p.onPrimarySoft : null,
      bordered: !onPrimary && !plain,
      radius: onPrimary ? 22 : 12,
      onPressed: () => context.push(Paths.notifications),
    );
  }
}
