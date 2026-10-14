import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/money.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import 'product_widgets.dart';

/// What the customer chose in the option sheet.
class OptionChoice {
  const OptionChoice({required this.options, required this.quantity});

  /// The chosen option IDs, in the groups' order.
  final List<ProductOption> options;
  final int quantity;
}

/// 26 The option picker: a product's option groups (required or optional,
/// with how many to choose), the quantity and a price that follows the
/// choices. The server prices the cart again; this price is only shown.
Future<OptionChoice?> showOptionSheet(
  BuildContext context, {
  required ProductDetail product,
  required ProductPrice price,
  required int maxQuantity,
}) {
  final p = context.palette;
  return showModalBottomSheet<OptionChoice>(
    context: context,
    isScrollControlled: true,
    backgroundColor: p.surface,
    showDragHandle: true,
    builder: (context) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scroll) => OptionSheet(
        product: product,
        price: price,
        maxQuantity: maxQuantity,
        scrollController: scroll,
      ),
    ),
  );
}

class OptionSheet extends StatefulWidget {
  const OptionSheet({
    super.key,
    required this.product,
    required this.price,
    required this.maxQuantity,
    this.scrollController,
  });

  final ProductDetail product;
  final ProductPrice price;
  final int maxQuantity;
  final ScrollController? scrollController;

  @override
  State<OptionSheet> createState() => _OptionSheetState();
}

class _OptionSheetState extends State<OptionSheet> {
  final Set<String> _chosen = {};
  int _quantity = 1;

  List<OptionGroup> get _groups => widget.product.optionGroups;

  void _toggle(OptionGroup group, ProductOption option) => setState(() {
    if (group.single) {
      final had = _chosen.contains(option.id);
      _chosen.removeAll(group.options.map((o) => o.id));
      // A required single choice stays chosen; an optional one can be undone.
      if (!had || group.required) _chosen.add(option.id);
      return;
    }
    if (_chosen.contains(option.id)) {
      _chosen.remove(option.id);
    } else if (group.options.where((o) => _chosen.contains(o.id)).length <
        group.max) {
      _chosen.add(option.id);
    }
  });

  String _rule(OptionGroup group) {
    final l10n = context.l10n;
    if (group.single) return l10n.optionsChooseOne;
    if (group.min > 1 && group.min == group.max) {
      return l10n.optionsChooseAtLeast(group.min);
    }
    return group.min > 1
        ? '${l10n.optionsChooseAtLeast(group.min)} · ${l10n.optionsChooseUpTo(group.max)}'
        : l10n.optionsChooseUpTo(group.max);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final unit =
        centsOf(widget.price.amount) + optionsDeltaCents(_groups, _chosen);
    final total = formatMoney(unit * _quantity, widget.price.currency);
    final missing = missingGroups(_groups, _chosen);
    final ready = optionsComplete(_groups, _chosen);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: ListView(
            controller: widget.scrollController,
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            children: [
              Semantics(
                header: true,
                child: Text(
                  widget.product.name,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              ProductPriceLabel(widget.price, size: 16),
              for (final group in _groups) ...[
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: Semantics(
                        header: true,
                        child: Text(
                          group.name,
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: group.required ? p.accentSoft : p.surfaceMuted,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        group.required
                            ? l10n.optionsRequired
                            : l10n.optionsOptional,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  _rule(group),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                const SizedBox(height: 6),
                for (final option in group.options)
                  _OptionRow(
                    option: option,
                    single: group.single,
                    selected: _chosen.contains(option.id),
                    enabled:
                        group.single ||
                        _chosen.contains(option.id) ||
                        group.options
                                .where((o) => _chosen.contains(o.id))
                                .length <
                            group.max,
                    onTap: () => _toggle(group, option),
                  ),
              ],
              const SizedBox(height: 20),
              Row(
                children: [
                  Text(
                    l10n.quantity,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  const Spacer(),
                  QuantityControl(
                    quantity: _quantity,
                    max: widget.maxQuantity,
                    onChanged: (q) => setState(() => _quantity = q),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                l10n.optionsPriceNote,
                style: TextStyle(fontSize: 12, color: p.textSecondary),
              ),
            ],
          ),
        ),
        BottomActionBar(
          child: PrimaryButton(
            key: const ValueKey('options-add'),
            label: ready
                ? l10n.optionsAddToCart(total)
                : l10n.optionsMissing(missing.map((g) => g.name).join(', ')),
            icon: ready ? AppIcons.cart : null,
            onPressed: ready
                ? () => Navigator.of(context).pop(
                    OptionChoice(
                      options: [
                        for (final g in _groups)
                          for (final o in g.options)
                            if (_chosen.contains(o.id)) o,
                      ],
                      quantity: _quantity,
                    ),
                  )
                : null,
          ),
        ),
      ],
    );
  }
}

class _OptionRow extends StatelessWidget {
  const _OptionRow({
    required this.option,
    required this.single,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final ProductOption option;
  final bool single;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final icon = single
        ? (selected ? AppIcons.radioChecked : AppIcons.radioUnchecked)
        : (selected ? AppIcons.checkboxChecked : AppIcons.checkboxUnchecked);
    return Semantics(
      checked: selected,
      inMutuallyExclusiveGroup: single,
      enabled: enabled,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(10),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Row(
            children: [
              AppIcon(
                icon,
                size: 22,
                filled: selected,
                color: enabled
                    ? (selected ? p.primary : p.textSecondary)
                    : p.border,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  option.name,
                  style: TextStyle(
                    fontSize: 15,
                    color: enabled ? p.text : p.textSecondary,
                  ),
                ),
              ),
              if (option.priceDeltaFormatted != null)
                Text(
                  option.priceDeltaFormatted!,
                  style: TextStyle(fontSize: 14, color: p.textSecondary),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
