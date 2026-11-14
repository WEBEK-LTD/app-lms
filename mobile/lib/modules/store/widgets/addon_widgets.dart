import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import 'gift_checkout.dart';

/// 131 "Add a little more": the gift add-ons offered with a product
/// (chocolates, a card, a vase), each with its photo, name, price and a
/// checkbox, on the product's page, in the cart and at checkout, drawn in
/// the checkout look Studio sets. Add-ons with choices to make, or that
/// can't be bought now, aren't offered.
class AddonPicker extends StatelessWidget {
  const AddonPicker({
    super.key,
    required this.addons,
    required this.selected,
    required this.onChanged,
    this.title,
    this.look,
    this.step,
  });

  final List<ProductSummary> addons;

  /// The IDs of the add-ons chosen.
  final Set<int> selected;
  final void Function(ProductSummary addon, bool on) onChanged;

  /// The owner's title; null: the app's words.
  final String? title;
  final CheckoutLook? look;
  final int? step;

  /// Those the app can add as they are.
  static List<ProductSummary> offered(List<ProductSummary> addons) => [
    for (final a in addons)
      if (a.purchasable && a.type != ProductType.variable) a,
  ];

  @override
  Widget build(BuildContext context) {
    final list = offered(addons);
    if (list.isEmpty) return const SizedBox.shrink();
    return CheckoutSection(
      key: const ValueKey('addons'),
      title: title ?? context.l10n.addonsTitle,
      subtitle: context.l10n.addonsHint,
      look: look,
      step: step,
      icon: AppIcons.gift,
      child: Column(
        children: [
          for (final (i, a) in list.indexed) ...[
            if (i > 0) const SizedBox(height: 8),
            _AddonRow(
              addon: a,
              on: selected.contains(a.id),
              onChanged: (v) => onChanged(a, v),
              radius: look?.radius,
              // 131.25 In the look's colour, by day and by night.
              accent: parseHexColor(
                look?.accentFor(dark: context.palette.isDark),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _AddonRow extends StatelessWidget {
  const _AddonRow({
    required this.addon,
    required this.on,
    required this.onChanged,
    this.radius,
    this.accent,
  });

  final ProductSummary addon;
  final bool on;
  final ValueChanged<bool> onChanged;
  final double? radius;

  /// The look's colour; null, the app's second colour.
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final sale = addon.sale?.liveAt(DateTime.now()) == true ? addon.sale : null;
    final r = BorderRadius.circular(radius ?? 14);
    final tone = accent ?? p.accent;
    return Semantics(
      checked: on,
      label: context.l10n.addonAdd(addon.name),
      excludeSemantics: true,
      child: Material(
        color: on ? tone.withValues(alpha: 0.10) : p.surfaceMuted,
        shape: RoundedRectangleBorder(
          borderRadius: r,
          side: BorderSide(
            color: on ? tone.withValues(alpha: 0.6) : Colors.transparent,
          ),
        ),
        child: InkWell(
          key: ValueKey('addon-${addon.id}'),
          borderRadius: r,
          onTap: () => onChanged(!on),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                AppNetworkImage(
                  url: addon.imageUrl,
                  seed: addon.id,
                  width: 52,
                  height: 52,
                  radius: 10,
                  placeholderIcon: AppIcons.gift,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        addon.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '+${sale?.nowFormatted ?? addon.price.formatted}',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: p.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Checkbox.adaptive(
                  value: on,
                  activeColor: tone,
                  onChanged: (v) => onChanged(v ?? false),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
