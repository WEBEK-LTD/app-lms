import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/real_estate_providers.dart';

/// Icons of the listing facts (Material Symbols Rounded).
abstract final class ListingIcons {
  static const area = Symbols.square_foot_rounded;
  static const bedrooms = Symbols.bed_rounded;
  static const bathrooms = Symbols.bathtub_rounded;
  static const floor = Symbols.stairs_rounded;
  static const yearBuilt = Symbols.calendar_month_rounded;
  static const furnished = Symbols.chair_rounded;
  static const call = Symbols.call_rounded;
  static const email = Symbols.mail_rounded;
  static const map = Symbols.map_rounded;
  static const send = Symbols.send_rounded;
}

/// "EGP 4,250,000", "EGP 18,000 / month".
String listingPriceText(AppLocalizations l10n, ListingPrice price) =>
    switch (price.period) {
      RentPeriod.month => l10n.pricePerMonth(price.formatted),
      RentPeriod.year => l10n.pricePerYear(price.formatted),
      null => price.formatted,
    };

/// "185 m²" or "1,990 ft²".
String areaText(BuildContext context, double area, AreaUnit unit) {
  final number = NumberFormat.decimalPattern(
    Localizations.localeOf(context).languageCode,
  ).format(area == area.roundToDouble() ? area.round() : area);
  return switch (unit) {
    AreaUnit.m2 => context.l10n.areaSquareMetres(number),
    AreaUnit.ft2 => context.l10n.areaSquareFeet(number),
  };
}

String purposeLabel(AppLocalizations l10n, ListingPurpose purpose) =>
    switch (purpose) {
      ListingPurpose.sale => l10n.forSale,
      ListingPurpose.rent => l10n.forRent,
    };

/// Sends a signed-out user to sign in, then back to [from].
void signInFor(BuildContext context, String from) => context.push(
  Uri(path: Paths.signIn, queryParameters: {'from': from}).toString(),
);

/// Saves or removes a listing, at once, with the sign-in screen for
/// signed-out users.
Future<void> toggleFavorite(
  BuildContext context,
  WidgetRef ref, {
  required int listingId,
  required bool current,
}) async {
  if (!ref.read(authControllerProvider).isSignedIn) {
    signInFor(context, Paths.listing(listingId));
    return;
  }
  try {
    await ref
        .read(favoriteOverridesProvider.notifier)
        .toggle(listingId, current: current);
  } on ApiException catch (e) {
    if (context.mounted) showMessage(context, e.message);
  }
}

/// The heart on listing cards and the listing page.
class FavoriteButton extends ConsumerWidget {
  const FavoriteButton({
    super.key,
    required this.listingId,
    required this.favorited,
    this.size = 40,
  });

  final int listingId;

  /// What the server last said.
  final bool favorited;
  final double size;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final on = ref.watch(favoriteOverridesProvider)[listingId] ?? favorited;
    return Semantics(
      toggled: on,
      child: SquareIconButton(
        icon: AppIcons.favorite,
        label: on ? l10n.removeFromFavorites : l10n.saveToFavorites,
        filled: on,
        size: size,
        iconSize: 20,
        radius: size / 2,
        bordered: false,
        background: p.surface,
        foreground: on ? p.accent : p.text,
        onPressed: () =>
            toggleFavorite(context, ref, listingId: listingId, current: on),
      ),
    );
  }
}

/// A small label on a listing's image ("For rent", "Featured").
class ListingTag extends StatelessWidget {
  const ListingTag(this.label, {super.key, this.accent = false});

  final String label;
  final bool accent;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: accent ? p.accent : p.surface,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: accent ? p.onAccent : p.text,
        ),
      ),
    );
  }
}

/// Area, bedrooms and bathrooms as icon and number.
class ListingFactsRow extends ConsumerWidget {
  const ListingFactsRow({super.key, required this.listing});

  final ListingSummary listing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final unit = ref.watch(listingsConfigProvider)?.areaUnit ?? AreaUnit.m2;
    Widget fact(IconData icon, String text) => Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        AppIcon(icon, size: 16, color: p.textSecondary),
        const SizedBox(width: 4),
        Text(text, style: TextStyle(fontSize: 13, color: p.textSecondary)),
      ],
    );
    return Wrap(
      spacing: 14,
      runSpacing: 4,
      children: [
        if (listing.area != null)
          fact(ListingIcons.area, areaText(context, listing.area!, unit)),
        if (listing.bedrooms != null)
          fact(ListingIcons.bedrooms, '${listing.bedrooms}'),
        if (listing.bathrooms != null)
          fact(ListingIcons.bathrooms, '${listing.bathrooms}'),
      ],
    );
  }
}

/// What a screen reader says for a listing card.
String listingSemantics(BuildContext context, ListingSummary l, AreaUnit unit) {
  final l10n = context.l10n;
  return [
    l.title,
    listingPriceText(l10n, l.price),
    if (l.price.negotiable) l10n.negotiable,
    l.place,
    if (l.area != null) areaText(context, l.area!, unit),
    if (l.bedrooms != null) l10n.bedroomsCount(l.bedrooms!),
    if (l.bathrooms != null) l10n.bathroomsCount(l.bathrooms!),
  ].join(', ');
}

/// A listing in search results, favorites and "similar".
class ListingCard extends ConsumerWidget {
  const ListingCard({super.key, required this.listing, this.compact = false});

  final ListingSummary listing;

  /// Smaller, for the "similar listings" row.
  final bool compact;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final unit = ref.watch(listingsConfigProvider)?.areaUnit ?? AreaUnit.m2;
    final l = listing;
    return AppCard(
      radius: context.shapes.card,
      onTap: () => context.push(Paths.listing(l.id)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AspectRatio(
            aspectRatio: compact ? 16 / 10 : 16 / 9,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Semantics(
                  button: true,
                  label: listingSemantics(context, l, unit),
                  excludeSemantics: true,
                  child: AppNetworkImage(url: l.imageUrl, seed: l.id),
                ),
                PositionedDirectional(
                  top: 10,
                  start: 10,
                  end: 56,
                  child: Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      ListingTag(purposeLabel(l10n, l.purpose)),
                      if (l.featured) ListingTag(l10n.featured, accent: true),
                    ],
                  ),
                ),
                PositionedDirectional(
                  top: 6,
                  end: 6,
                  child: FavoriteButton(
                    listingId: l.id,
                    favorited: l.favorited,
                  ),
                ),
              ],
            ),
          ),
          ExcludeSemantics(
            child: Padding(
              padding: EdgeInsets.fromLTRB(14, 12, 14, compact ? 12 : 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          listingPriceText(l10n, l.price),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: compact ? 16 : 18,
                            fontWeight: FontWeight.w800,
                            color: p.text,
                          ),
                        ),
                      ),
                      if (l.price.negotiable) ...[
                        const SizedBox(width: 8),
                        Text(
                          l10n.negotiable,
                          style: TextStyle(fontSize: 12, color: p.link),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    l.title,
                    maxLines: compact ? 1 : 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      AppIcon(
                        AppIcons.location,
                        size: 15,
                        color: p.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          l.place,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            color: p.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (!compact) ...[
                    const SizedBox(height: 8),
                    ListingFactsRow(listing: l),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Listing cards one per row on phones and two per row on tablets.
class ListingGrid extends StatelessWidget {
  const ListingGrid({
    super.key,
    required this.listings,
    this.padding = const EdgeInsets.fromLTRB(20, 4, 20, 24),
    this.loadingMore = false,
    this.onNearEnd,
  });

  final List<ListingSummary> listings;
  final EdgeInsets padding;
  final bool loadingMore;

  /// Called when the user scrolls close to the end (infinite scroll).
  final VoidCallback? onNearEnd;

  @override
  Widget build(BuildContext context) {
    return NotificationListener<ScrollNotification>(
      onNotification: (n) {
        if (n.metrics.extentAfter < 600) onNearEnd?.call();
        return false;
      },
      child: LayoutBuilder(
        builder: (context, box) {
          final columns = box.maxWidth >= 700 ? 2 : 1;
          final rows = (listings.length / columns).ceil();
          return ListView.builder(
            padding: padding,
            physics: const AlwaysScrollableScrollPhysics(),
            itemCount: rows + (loadingMore ? 1 : 0),
            itemBuilder: (context, r) {
              if (r >= rows) {
                return LoadingView(label: context.l10n.loadingMoreListings);
              }
              final cards = [
                for (var c = 0; c < columns; c++)
                  if (r * columns + c < listings.length)
                    listings[r * columns + c],
              ];
              return Padding(
                padding: EdgeInsets.only(top: r == 0 ? 0 : 14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (var c = 0; c < columns; c++) ...[
                      if (c > 0) const SizedBox(width: 14),
                      Expanded(
                        child: c < cards.length
                            ? ListingCard(
                                key: ValueKey('listing-${cards[c].id}'),
                                listing: cards[c],
                              )
                            : const SizedBox.shrink(),
                      ),
                    ],
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}

/// The header of the Real estate tabs: a big title and optional actions.
class TabHeader extends StatelessWidget {
  const TabHeader({super.key, required this.title, this.trailing});

  final String title;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 10),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              header: true,
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

/// Shown on Favorites and Messages to signed-out users.
class SignInPrompt extends StatelessWidget {
  const SignInPrompt({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    required this.from,
  });

  final IconData icon;
  final String title;
  final String message;
  final String from;

  @override
  Widget build(BuildContext context) => MessageView(
    icon: icon,
    title: title,
    message: message,
    actionLabel: context.l10n.signIn,
    onAction: () => signInFor(context, from),
  );
}
