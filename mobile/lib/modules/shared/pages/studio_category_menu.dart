import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/app_router.dart' show openLocation;
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import 'page_actions.dart';

/// 206 The category menu (a `categories` element drawn as `rows`): every
/// main category of the shop a row of cards that slides sideways, its own
/// card first ("All …", it opens the shop on the main category), then its
/// sub-categories, each with its photo and name, each opening the shop on
/// it. [StudioCategoryMenuLook.lead] draws the main category as a tall
/// card (its number, name, count and an arrow over its photo) with the
/// sub-categories' photos and names under them; [StudioCategoryMenuLook
/// .label] puts the number, name and count over the row and draws every
/// card as a photo with its name over a shade, "All" on the first.
/// The categories are the shop's own, as the platform serves them
/// (`Category.children`); nothing shows without them.
class StudioCategoryMenuView extends ConsumerWidget {
  const StudioCategoryMenuView({
    super.key,
    required this.node,
    this.color,
    this.accent,
  });

  final StudioNode node;

  /// The element's colour (its words), by day or by night.
  final Color? color;

  /// The look's accent ("All" on the label look); null, the app's colour.
  final Color? accent;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final categories = node.categories;
    if (categories.isEmpty) return const SizedBox.shrink();
    final appType = ref.watch(appEnvironmentProvider).build.appType;
    VoidCallback? open(Category c) {
      final location = categoryLocation(node.source, appType, c.id);
      return location == null ? null : () => openLocation(context, location);
    }

    final menu = node.categoryMenu;
    return Column(
      key: ValueKey('category-menu-${menu.look.name}'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, c) in categories.indexed) ...[
          if (i > 0) const SizedBox(height: 18),
          _Row(
            category: c,
            number: menu.numbers ? '${i + 1}'.padLeft(2, '0') : null,
            menu: menu,
            color: color,
            accent: accent,
            open: open,
          ),
        ],
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.category,
    required this.number,
    required this.menu,
    required this.color,
    required this.accent,
    required this.open,
  });

  final Category category;
  final String? number;
  final StudioCategoryMenu menu;
  final Color? color;
  final Color? accent;
  final VoidCallback? Function(Category) open;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final ink = color ?? p.text;
    final scale = MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 1.4);
    final lead = menu.look == StudioCategoryMenuLook.lead;
    final mainSize = lead ? const Size(136, 176) : const Size(120, 120);
    final subSize = lead ? const Size(104, 134) : const Size(120, 120);
    final cards = <Widget>[
      _Card(
        key: ValueKey('category-menu-all-${category.id}'),
        category: category,
        size: mainSize,
        radius: menu.radius,
        title: lead ? category.name : l10n.categoryAllOf(category.name),
        // The lead card says how many there are; the label card says All.
        line: lead ? l10n.itemCount(category.count) : null,
        number: lead ? number : null,
        badge: lead ? null : l10n.filterAll,
        badgeColor: accent ?? p.primary,
        arrow: lead,
        onTap: open(category),
      ),
      for (final sub in category.children)
        lead
            ? _Under(
                key: ValueKey('category-menu-sub-${sub.id}'),
                category: sub,
                size: subSize,
                radius: (menu.radius - 4).clamp(0, 40),
                color: ink,
                onTap: open(sub),
              )
            : _Card(
                key: ValueKey('category-menu-sub-${sub.id}'),
                category: sub,
                size: subSize,
                radius: menu.radius,
                title: sub.name,
                onTap: open(sub),
              ),
    ];
    // The lead's sub-categories' names sit under their shorter cards.
    final height = lead ? mainSize.height : subSize.height;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!lead)
          Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(16, 0, 16, 8),
            child: Semantics(
              header: true,
              label: l10n.categoryMenuRow(
                category.name,
                l10n.itemCount(category.count),
              ),
              excludeSemantics: true,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  if (number != null) ...[
                    Text(
                      number!,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: accent ?? p.primary,
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  Flexible(
                    child: Text(
                      category.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: ink,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    l10n.itemCount(category.count),
                    style: TextStyle(fontSize: 12, color: p.textSecondary),
                  ),
                ],
              ),
            ),
          ),
        SizedBox(
          height: height * scale,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            clipBehavior: Clip.none,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: cards.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (_, i) =>
                Align(alignment: Alignment.topCenter, child: cards[i]),
          ),
        ),
      ],
    );
  }
}

/// A card: the category's photo under a shade, its name over the shade's
/// foot (and its number, count, "All" and an arrow where the look has them).
class _Card extends StatelessWidget {
  const _Card({
    super.key,
    required this.category,
    required this.size,
    required this.radius,
    required this.title,
    required this.onTap,
    this.line,
    this.number,
    this.badge,
    this.badgeColor,
    this.arrow = false,
  });

  final Category category;
  final Size size;
  final double radius;
  final String title;
  final String? line;
  final String? number;
  final String? badge;
  final Color? badgeColor;
  final bool arrow;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(1).clamp(1.0, 1.4);
    return Semantics(
      button: true,
      label: line == null ? title : '$title, $line',
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(radius),
          child: SizedBox(
            width: size.width,
            height: size.height * scale,
            child: Stack(
              fit: StackFit.expand,
              children: [
                _Photo(category: category),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0x00000000), Color(0xA6000000)],
                      stops: [0.35, 1],
                    ),
                  ),
                ),
                if (number != null)
                  PositionedDirectional(
                    top: 8,
                    end: 10,
                    child: Text(
                      number!,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                if (badge != null)
                  PositionedDirectional(
                    top: 8,
                    end: 8,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: badgeColor,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 2,
                        ),
                        child: Text(
                          badge!.toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                  ),
                PositionedDirectional(
                  start: 10,
                  end: 10,
                  bottom: 10,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: arrow ? 17 : 13,
                          fontWeight: FontWeight.w800,
                          height: 1.2,
                        ),
                      ),
                      if (line != null || arrow)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Row(
                            children: [
                              if (line != null)
                                Expanded(
                                  child: Text(
                                    line!,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 11.5,
                                    ),
                                  ),
                                ),
                              if (arrow)
                                const Icon(
                                  AppIcons.arrowForward,
                                  color: Colors.white,
                                  size: 18,
                                ),
                            ],
                          ),
                        ),
                    ],
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

/// A sub-category in the lead look: its photo, its name under it.
class _Under extends StatelessWidget {
  const _Under({
    super.key,
    required this.category,
    required this.size,
    required this.radius,
    required this.color,
    required this.onTap,
  });

  final Category category;
  final Size size;
  final double radius;
  final Color color;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: category.name,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: SizedBox(
          width: size.width,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(radius),
                child: SizedBox(
                  width: size.width,
                  height: size.height,
                  child: _Photo(category: category),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                category.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                  color: color,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Photo extends StatelessWidget {
  const _Photo({required this.category});

  final Category category;

  @override
  Widget build(BuildContext context) {
    final url = category.imageUrl;
    if (url != null) return AppNetworkImage(url: url, seed: category.id);
    return ColoredBox(color: context.palette.placeholderFor(category.id));
  }
}
