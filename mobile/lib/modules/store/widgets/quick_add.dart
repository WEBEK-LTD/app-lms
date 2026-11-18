import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/routing/app_router.dart' show openLocation;
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../data/cart_controller.dart';

/// 193 Whether a product's card carries its own Add to cart: the gift
/// shops of Leqaa's looks (their checkout the gift checkout), Kech Flora's
/// and every app made from them, on every list of products.
bool quickAddShown(WidgetRef ref) =>
    ref.watch(appConfigProvider).screens?.checkout?.gift ?? false;

/// 193 The height [QuickAddButton] takes under a card's price, with the
/// space over it, at the phone's text size.
double quickAddHeight(BuildContext context) =>
    MediaQuery.textScalerOf(context).scale(16) + 36;

/// 193 Add to cart on a product's card. A product with nothing to choose
/// goes straight in the cart (one, its price as the shop sells it now), with
/// "Added to cart" and the way to the cart; one with sizes, variations or
/// options opens its page to choose them, so the wrong one never goes in.
/// Out of stock, or a shop that can't sell, the button is off.
class QuickAddButton extends ConsumerStatefulWidget {
  const QuickAddButton({super.key, required this.productId, this.summary});

  final int productId;

  /// What the list knows of it already (the shop's grid): a product with
  /// variations opens its page without asking the server first.
  final ProductSummary? summary;

  @override
  ConsumerState<QuickAddButton> createState() => _QuickAddButtonState();
}

class _QuickAddButtonState extends ConsumerState<QuickAddButton> {
  bool _busy = false;

  bool get _off {
    final s = widget.summary;
    return s != null &&
        (s.stockStatus == StockStatus.outOfStock || !s.purchasable);
  }

  void _openPage() => context.push(Paths.product(widget.productId));

  Future<void> _add() async {
    final s = widget.summary;
    if (s != null && (s.type == ProductType.variable || s.price.range)) {
      _openPage();
      return;
    }
    setState(() => _busy = true);
    final ProductDetail product;
    try {
      product = await ref.read(yallappApiProvider).getProduct(widget.productId);
    } on Object {
      if (mounted) {
        setState(() => _busy = false);
        _openPage();
      }
      return;
    }
    if (!mounted) return;
    setState(() => _busy = false);
    final summary = product.summary;
    if (summary.type == ProductType.variable ||
        summary.price.range ||
        product.variations.isNotEmpty ||
        product.choices.isNotEmpty ||
        product.optionGroups.isNotEmpty) {
      _openPage();
      return;
    }
    final messenger = ScaffoldMessenger.maybeOf(context);
    final words = context.l10n;
    if (summary.stockStatus == StockStatus.outOfStock || !summary.purchasable) {
      messenger
        ?..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(words.outOfStock)));
      return;
    }
    final price = summary.price;
    final added = ref
        .read(cartProvider.notifier)
        .add(
          CartItem(
            productId: product.id,
            quantity: 1,
            name: product.name,
            imageUrl: summary.imageUrl,
            price: price.formatted,
            // 161 And in the customer's currency.
            shownPrice: price.shown,
            shownCurrency: price.display?.currency,
            maxQuantity: product.maxQuantity,
          ),
        );
    messenger
      ?..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(added ? words.addedToCart : words.cartFull),
          action: added
              ? SnackBarAction(
                  label: words.viewCart,
                  onPressed: () => openLocation(context, Paths.cart),
                )
              : null,
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final scheme = Theme.of(context).colorScheme;
    final off = _off;
    return SizedBox(
      height: MediaQuery.textScalerOf(context).scale(16) + 24,
      child: FilledButton(
        key: ValueKey('quick-add-${widget.productId}'),
        onPressed: off || _busy ? null : _add,
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 10),
          minimumSize: Size.zero,
          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          disabledBackgroundColor: p.surfaceMuted,
          disabledForegroundColor: p.textTertiary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(context.shapes.button),
          ),
          // The theme's own label (its font and the Arabic one under it).
          textStyle:
              (Theme.of(context).textTheme.labelLarge ?? const TextStyle())
                  .copyWith(fontSize: 13, fontWeight: FontWeight.w700),
        ),
        child: _busy
            ? SizedBox.square(
                dimension: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: scheme.onPrimary,
                ),
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppIcon(
                    off ? AppIcons.cart : AppIcons.addToCart,
                    size: 16,
                    color: off ? p.textTertiary : scheme.onPrimary,
                  ),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      off ? context.l10n.outOfStock : context.l10n.addToCart,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}
