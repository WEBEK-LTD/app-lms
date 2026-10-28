import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../store/widgets/product_widgets.dart' show QuantityControl;

/// 105.1 A dish's sheet: its choice groups (a size to pick, extras up to a
/// number), the quantity and a note for the kitchen. The server prices the
/// cart; the dish's own price is only shown here.
Future<FoodCartLine?> showDishSheet(BuildContext context, Dish dish) {
  final p = context.palette;
  return showModalBottomSheet<FoodCartLine>(
    context: context,
    isScrollControlled: true,
    backgroundColor: p.surface,
    showDragHandle: true,
    builder: (context) => DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.85,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scroll) =>
          DishSheet(dish: dish, scrollController: scroll),
    ),
  );
}

class DishSheet extends StatefulWidget {
  const DishSheet({super.key, required this.dish, this.scrollController});

  final Dish dish;
  final ScrollController? scrollController;

  @override
  State<DishSheet> createState() => _DishSheetState();
}

class _DishSheetState extends State<DishSheet> {
  final Set<int> _chosen = {};
  final _note = TextEditingController();
  int _quantity = 1;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  bool _single(DishChoiceGroup group) => group.max == 1;

  int _countIn(DishChoiceGroup group) =>
      group.choices.where((c) => _chosen.contains(c.id)).length;

  void _toggle(DishChoiceGroup group, DishChoice choice) => setState(() {
    if (_single(group)) {
      final had = _chosen.contains(choice.id);
      _chosen.removeAll(group.choices.map((c) => c.id));
      // A required single choice stays chosen; an optional one can be undone.
      if (!had || group.required) _chosen.add(choice.id);
      return;
    }
    if (_chosen.contains(choice.id)) {
      _chosen.remove(choice.id);
    } else if (_countIn(group) < group.max) {
      _chosen.add(choice.id);
    }
  });

  String _rule(DishChoiceGroup group) {
    final l10n = context.l10n;
    if (_single(group)) return l10n.optionsChooseOne;
    return group.min > 1
        ? '${l10n.optionsChooseAtLeast(group.min)} · ${l10n.optionsChooseUpTo(group.max)}'
        : l10n.optionsChooseUpTo(group.max);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final dish = widget.dish;
    final groups = dish.choiceGroups;
    final missing = [
      for (final g in groups)
        if (!g.fits(_chosen)) g,
    ];
    return Column(
      key: const ValueKey('dish-sheet'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          child: ListView(
            controller: widget.scrollController,
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
            children: [
              if (dish.imageUrl != null) ...[
                AppNetworkImage(
                  url: dish.imageUrl,
                  seed: dish.id,
                  radius: 14,
                  height: 180,
                  placeholderIcon: AppIcons.restaurant,
                ),
                const SizedBox(height: 12),
              ],
              Semantics(
                header: true,
                child: Text(
                  dish.name,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                dish.priceFormatted,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: p.text,
                ),
              ),
              if (dish.description != null) ...[
                const SizedBox(height: 6),
                Text(
                  dish.description!,
                  style: TextStyle(fontSize: 14, color: p.textBody),
                ),
              ],
              for (final group in groups) ...[
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
                for (final choice in group.choices)
                  _ChoiceRow(
                    key: ValueKey('choice-${choice.id}'),
                    choice: choice,
                    single: _single(group),
                    selected: _chosen.contains(choice.id),
                    enabled:
                        choice.available &&
                        (_single(group) ||
                            _chosen.contains(choice.id) ||
                            _countIn(group) < group.max),
                    onTap: () => _toggle(group, choice),
                  ),
              ],
              const SizedBox(height: 16),
              TextField(
                key: const ValueKey('dish-note'),
                controller: _note,
                maxLength: 200,
                decoration: InputDecoration(
                  labelText: l10n.dishNote,
                  counterText: '',
                ),
              ),
              const SizedBox(height: 16),
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
                    max: 50,
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
            key: const ValueKey('dish-add'),
            label: missing.isEmpty
                ? l10n.addToCart
                : l10n.optionsMissing(missing.map((g) => g.name).join(', ')),
            icon: missing.isEmpty ? AppIcons.cart : null,
            onPressed: missing.isEmpty
                ? () => Navigator.of(context).pop(
                    FoodCartLine(
                      dishId: dish.id,
                      name: dish.name,
                      quantity: _quantity,
                      choices: [
                        for (final g in groups)
                          for (final c in g.choices)
                            if (_chosen.contains(c.id)) c.id,
                      ],
                      choiceNames: [
                        for (final g in groups)
                          for (final c in g.choices)
                            if (_chosen.contains(c.id)) c.name,
                      ],
                      note: _note.text.trim().isEmpty
                          ? null
                          : _note.text.trim(),
                    ),
                  )
                : null,
          ),
        ),
      ],
    );
  }
}

class _ChoiceRow extends StatelessWidget {
  const _ChoiceRow({
    super.key,
    required this.choice,
    required this.single,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final DishChoice choice;
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
                  choice.name,
                  style: TextStyle(
                    fontSize: 15,
                    color: enabled ? p.text : p.textSecondary,
                  ),
                ),
              ),
              Text(
                choice.available
                    ? (choice.extraFormatted ?? '')
                    : context.l10n.dishSoldOut,
                style: TextStyle(fontSize: 14, color: p.textSecondary),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
