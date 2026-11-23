import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/storage/local_settings.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';

/// 211 An electronics shop's parts on a product's page and in its Studio
/// elements: the specifications table, the compare table and the compare
/// list kept on the phone, matching accessories and the "Installments
/// coming soon" tag.

/// A product's specs as a two-column table: the name muted, the value bold,
/// a line between the rows. [rows] at most (null: all).
class SpecsTable extends StatelessWidget {
  const SpecsTable({super.key, required this.specs, this.rows, this.color});

  final List<ProductSpec> specs;
  final int? rows;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final ink = color ?? p.text;
    final shown = rows == null || rows! >= specs.length
        ? specs
        : specs.sublist(0, rows!.clamp(0, specs.length));
    return Column(
      key: const ValueKey('specs-table'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, s) in shown.indexed)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 11),
            decoration: BoxDecoration(
              border: i == 0 ? null : Border(top: BorderSide(color: p.divider)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  flex: 2,
                  child: Text(
                    s.label,
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: color == null
                          ? p.textSecondary
                          : ink.withValues(alpha: 0.7),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 3,
                  child: Text(
                    s.value,
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w700,
                      height: 1.35,
                      color: ink,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// A product page's specifications: the first six, then all of them.
class ProductSpecsSection extends StatefulWidget {
  const ProductSpecsSection({super.key, required this.specs});

  final List<ProductSpec> specs;

  static const first = 6;

  @override
  State<ProductSpecsSection> createState() => _ProductSpecsSectionState();
}

class _ProductSpecsSectionState extends State<ProductSpecsSection> {
  bool _all = false;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final more = widget.specs.length > ProductSpecsSection.first;
    return Column(
      key: const ValueKey('product-specs'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(title: context.l10n.specsTitle),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
          decoration: BoxDecoration(
            color: p.surfaceMuted,
            borderRadius: BorderRadius.circular(18),
          ),
          child: SpecsTable(
            specs: widget.specs,
            rows: _all ? null : ProductSpecsSection.first,
          ),
        ),
        if (more)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              key: const ValueKey('product-specs-all'),
              onPressed: () => setState(() => _all = !_all),
              icon: AppIcon(
                _all ? AppIcons.collapse : AppIcons.expand,
                size: 18,
              ),
              label: Text(
                _all ? context.l10n.specsFewer : context.l10n.specsAll,
              ),
            ),
          ),
      ],
    );
  }
}

/// Products side by side, spec by spec: a column per product (its photo,
/// name and price; a tap opens it), then a row per spec, those all share
/// first, "—" where a product has none.
class CompareTable extends StatelessWidget {
  const CompareTable({
    super.key,
    required this.products,
    required this.onOpen,
    this.onRemove,
    this.accent,
    this.color,
  });

  final List<TechProduct> products;
  final void Function(int id) onOpen;
  final void Function(int id)? onRemove;
  final Color? accent;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final ink = color ?? p.text;
    final soft = color == null ? p.textSecondary : ink.withValues(alpha: 0.7);
    final rows = compareRows([for (final x in products) x.specs]);
    final highlight = (accent ?? p.primary).withValues(alpha: 0.08);
    Widget cell(Widget child, int column) => Expanded(
      child: Container(
        color: column == 0 ? highlight : null,
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 10),
        alignment: Alignment.center,
        child: child,
      ),
    );
    return Column(
      key: const ValueKey('compare-table'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final (i, x) in products.indexed)
                cell(
                  Semantics(
                    button: true,
                    label: '${x.title}, ${x.price}',
                    excludeSemantics: true,
                    child: InkWell(
                      key: ValueKey('compare-open-${x.id}'),
                      borderRadius: BorderRadius.circular(14),
                      onTap: () => onOpen(x.id),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Stack(
                            children: [
                              AppNetworkImage(
                                url: x.imageUrl,
                                seed: x.id,
                                width: 76,
                                height: 76,
                                radius: 14,
                              ),
                              if (onRemove != null)
                                PositionedDirectional(
                                  top: 0,
                                  end: 0,
                                  child: Material(
                                    color: p.surface,
                                    shape: const CircleBorder(),
                                    child: InkWell(
                                      key: ValueKey('compare-remove-${x.id}'),
                                      customBorder: const CircleBorder(),
                                      onTap: () => onRemove!(x.id),
                                      child: Tooltip(
                                        message: context.l10n.compareRemove,
                                        child: Padding(
                                          padding: const EdgeInsets.all(3),
                                          child: AppIcon(
                                            AppIcons.close,
                                            size: 16,
                                            color: p.text,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(
                            x.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              height: 1.25,
                              color: ink,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            x.price,
                            maxLines: 1,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.w800,
                              color: accent ?? p.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  i,
                ),
            ],
          ),
        ),
        for (final row in rows) ...[
          Padding(
            padding: const EdgeInsets.only(top: 10, bottom: 2),
            child: Text(
              row.label,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                letterSpacing: 0.2,
                color: soft,
              ),
            ),
          ),
          Container(
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: p.divider)),
            ),
            child: IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final (i, v) in row.values.indexed)
                    cell(
                      Text(
                        v ?? '—',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: v == null
                              ? FontWeight.w400
                              : FontWeight.w700,
                          height: 1.3,
                          color: v == null ? soft : ink,
                        ),
                      ),
                      i,
                    ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// A product as the compare table draws it, from its page's detail.
TechProduct techProductOf(ProductDetail d) => TechProduct(
  id: d.id,
  title: d.name,
  imageUrl: d.summary.imageUrl,
  price: d.summary.sale?.nowFormatted ?? d.summary.price.shown,
  wasPrice: d.summary.price.onSale ? d.summary.price.shownRegular : null,
  specs: d.specs,
);

/// The products to compare, kept on the phone: at most three, in the order
/// they were added.
class CompareList extends Notifier<List<int>> {
  static const storageKey = 'store.compare';
  static const max = 3;

  @override
  List<int> build() {
    final raw = ref.watch(sharedPreferencesProvider).getString(storageKey);
    if (raw == null) return const [];
    try {
      return [
        for (final id in jsonDecode(raw) as List)
          if (id is int) id,
      ].take(max).toList();
    } on Object {
      return const [];
    }
  }

  void _save(List<int> ids) {
    state = List.unmodifiable(ids);
    ref.read(sharedPreferencesProvider).setString(storageKey, jsonEncode(ids));
  }

  /// Adds or removes [id]; false when the list is full (three already).
  bool toggle(int id) {
    if (state.contains(id)) {
      remove(id);
      return true;
    }
    if (state.length >= max) return false;
    _save([...state, id]);
    return true;
  }

  void remove(int id) => _save([
    for (final x in state)
      if (x != id) x,
  ]);
}

final compareListProvider = NotifierProvider<CompareList, List<int>>(
  CompareList.new,
);

/// A product page's Compare button: adds it to the compare list (or takes
/// it out), and once two or more are in it, opens the compare screen.
class CompareButtons extends ConsumerWidget {
  const CompareButtons({super.key, required this.productId});

  final int productId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final list = ref.watch(compareListProvider);
    final inIt = list.contains(productId);
    return Wrap(
      key: const ValueKey('product-compare'),
      spacing: 8,
      runSpacing: 8,
      children: [
        OutlinedButton.icon(
          key: const ValueKey('product-compare-toggle'),
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(0, 44),
            foregroundColor: inIt ? p.primary : p.text,
            side: BorderSide(color: inIt ? p.primary : p.border),
            shape: const StadiumBorder(),
            visualDensity: VisualDensity.compact,
          ),
          onPressed: () {
            final ok = ref.read(compareListProvider.notifier).toggle(productId);
            if (!ok) {
              ScaffoldMessenger.maybeOf(context)
                ?..hideCurrentSnackBar()
                ..showSnackBar(
                  SnackBar(
                    content: Text(context.l10n.compareFull),
                    persist: false,
                    action: SnackBarAction(
                      label: context.l10n.compareOpen(list.length),
                      onPressed: () => context.push(Paths.compare),
                    ),
                  ),
                );
            }
          },
          icon: AppIcon(inIt ? AppIcons.check : AppIcons.compare, size: 18),
          label: Text(
            inIt ? context.l10n.compareAdded : context.l10n.compareAdd,
          ),
        ),
        if (list.length >= 2)
          FilledButton.tonalIcon(
            key: const ValueKey('product-compare-open'),
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 44),
              shape: const StadiumBorder(),
              visualDensity: VisualDensity.compact,
            ),
            onPressed: () => context.push(Paths.compare),
            icon: const AppIcon(AppIcons.compare, size: 18),
            label: Text(context.l10n.compareOpen(list.length)),
          ),
      ],
    );
  }
}

/// "Installments coming soon": a soft pill with a clock. Never a way to pay.
class InstallmentsSoonTag extends StatelessWidget {
  const InstallmentsSoonTag({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      key: const ValueKey('installments-soon'),
      padding: const EdgeInsetsDirectional.fromSTEB(10, 5, 12, 5),
      decoration: BoxDecoration(
        color: p.surfaceMuted,
        borderRadius: BorderRadius.circular(99),
        border: Border.all(color: p.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppIcon(AppIcons.schedule, size: 16, color: p.textSecondary),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              context.l10n.installmentsSoon,
              style: TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w700,
                color: p.textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// "Goes with it": the matching accessories, each to tick, and a button
/// that adds the product with those ticked.
class AccessoriesPicker extends StatelessWidget {
  const AccessoriesPicker({
    super.key,
    required this.accessories,
    required this.selected,
    required this.onChanged,
    required this.onAdd,
  });

  final List<ProductSummary> accessories;
  final Set<int> selected;
  final void Function(ProductSummary accessory, bool on) onChanged;

  /// Null while the product itself can't go in the cart yet (its choices).
  final VoidCallback? onAdd;

  /// The accessories that can go in the cart on their own.
  static List<ProductSummary> offered(List<ProductSummary> all) => [
    for (final a in all)
      if (a.purchasable &&
          a.type != ProductType.variable &&
          a.stockStatus != StockStatus.outOfStock)
        a,
  ];

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Column(
      key: const ValueKey('product-accessories'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(title: context.l10n.accessoriesTitle),
        const SizedBox(height: 8),
        Material(
          color: p.surface,
          clipBehavior: Clip.antiAlias,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: BorderSide(color: p.border),
          ),
          child: Column(
            children: [
              for (final a in accessories)
                CheckboxListTile(
                  key: ValueKey('accessory-${a.id}'),
                  value: selected.contains(a.id),
                  onChanged: (on) => onChanged(a, on ?? false),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: const EdgeInsetsDirectional.only(
                    start: 6,
                    end: 12,
                  ),
                  secondary: AppNetworkImage(
                    url: a.imageUrl,
                    seed: a.id,
                    width: 52,
                    height: 52,
                    radius: 12,
                  ),
                  title: Text(
                    a.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: p.text,
                    ),
                  ),
                  subtitle: Text(
                    [
                      ?a.specLine,
                      a.sale?.nowFormatted ?? a.price.shown,
                    ].join(' · '),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12.5, color: p.textSecondary),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: FilledButton.icon(
            key: const ValueKey('accessories-add'),
            style: FilledButton.styleFrom(
              minimumSize: const Size(0, 44),
              shape: const StadiumBorder(),
            ),
            onPressed: onAdd,
            icon: const AppIcon(AppIcons.cart, size: 18),
            label: Text(context.l10n.accessoriesAdd(selected.length + 1)),
          ),
        ),
      ],
    );
  }
}

/// A part's words and icon (Build your PC).
String pcPartName(BuildContext context, PcPart part) => switch (part) {
  PcPart.cpu => context.l10n.pcPartCpu,
  PcPart.board => context.l10n.pcPartBoard,
  PcPart.ram => context.l10n.pcPartRam,
  PcPart.gpu => context.l10n.pcPartGpu,
  PcPart.storage => context.l10n.pcPartStorage,
  PcPart.cooler => context.l10n.pcPartCooler,
  PcPart.psu => context.l10n.pcPartPsu,
  PcPart.$case => context.l10n.pcPartCase,
};

IconData pcPartIcon(PcPart part) => switch (part) {
  PcPart.cpu => AppIcons.pcCpu,
  PcPart.board => AppIcons.pcBoard,
  PcPart.ram => AppIcons.pcRam,
  PcPart.gpu => AppIcons.pcGpu,
  PcPart.storage => AppIcons.pcStorage,
  PcPart.cooler => AppIcons.pcCooler,
  PcPart.psu => AppIcons.pcPsu,
  PcPart.$case => AppIcons.pcCase,
};

/// A trade-in grade's words.
String tradeInGradeName(BuildContext context, TradeInGrade grade) =>
    switch (grade) {
      TradeInGrade.likeNew => context.l10n.tradeInGradeLikeNew,
      TradeInGrade.good => context.l10n.tradeInGradeGood,
      TradeInGrade.fair => context.l10n.tradeInGradeFair,
      TradeInGrade.broken => context.l10n.tradeInGradeBroken,
    };
