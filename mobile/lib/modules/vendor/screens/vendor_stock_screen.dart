import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/gate/app_gate.dart' show appConfigProvider;
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../market/data/market_providers.dart';
import '../../market/screens/market_scanner_screen.dart'
    show MarketScannerScreen, marketScannerCameraProvider;
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/vendor_providers.dart';
import '../widgets/vendor_widgets.dart';

typedef StockFilter = ({String query, bool outOnly});

/// The vendor's items for stock: a search, or the ones out of stock.
final vendorStockProvider = FutureProvider.autoDispose
    .family<Paged<VendorStockItem>, StockFilter>(
      (ref, f) => ref
          .watch(yallappApiProvider)
          .listVendorStock(
            query: f.query.isEmpty ? null : f.query,
            outOfStock: f.outOnly,
          ),
    );

/// 115.72 The camera scanner on phones (the customers' app's, 115.40): it
/// reads a barcode, or null when the person closes it. Without a camera
/// (the web, tests), the barcode is typed or pasted.
final vendorBarcodeScannerProvider =
    Provider<Future<String?> Function(BuildContext context)?>((ref) {
      if (!ref.watch(marketScannerCameraProvider)) return null;
      final store = ref.watch(vendorDeskProvider).value?.name ?? '';
      return (context) => Navigator.of(context).push<String>(
        MaterialPageRoute(
          fullscreenDialog: true,
          builder: (_) => MarketScannerScreen(storeName: store),
        ),
      );
    });

/// 115.72 Stock's filters (design 10).
enum StockView { all, out, weight, offers }

/// 115 Stock: the vendor's dishes or products, each in or out of stock
/// with one switch. 115.72 As designed (10): the deep header with the
/// place's counts and Add; search by name, SKU or barcode, or scan one;
/// All, Out of stock, By weight and Offers; each product with its codes,
/// its stock and its price; a price changed on the spot, at once for new
/// orders and never for those placed, shown as an offer or not; out of
/// stock hides it from customers at once.
class VendorStockScreen extends ConsumerStatefulWidget {
  const VendorStockScreen({super.key});

  @override
  ConsumerState<VendorStockScreen> createState() => _VendorStockScreenState();
}

class _VendorStockScreenState extends ConsumerState<VendorStockScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  Timer? _toastTimer;
  String _query = '';
  StockView _view = StockView.all;
  int? _editing;
  VendorStockItem? _scanned;

  /// What the switches say while the server answers.
  final _pending = <int, bool>{};

  @override
  void dispose() {
    _debounce?.cancel();
    _toastTimer?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _typed(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (mounted) setState(() => _query = text.trim());
    });
  }

  void _reload() {
    ref.invalidate(vendorStockProvider);
  }

  Future<void> _toggle(VendorStockItem item, bool inStock) async {
    setState(() => _pending[item.id] = inStock);
    try {
      await ref
          .read(yallappApiProvider)
          .updateVendorProductStock(item.id, inStock: inStock);
      _reload();
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _pending.remove(item.id));
    }
  }

  Future<void> _scan() async {
    final l10n = context.l10n;
    final camera = ref.read(vendorBarcodeScannerProvider);
    final code = camera != null
        ? await camera(context)
        : await showDialog<String>(
            context: context,
            builder: (_) => const _TypedCodeDialog(),
          );
    if (code == null || code.trim().isEmpty || !mounted) return;
    try {
      final found = await ref
          .read(yallappApiProvider)
          .listVendorStock(barcode: code.trim());
      if (!mounted) return;
      if (found.items.isEmpty) {
        showMessage(context, l10n.vendorScanNotFound(code.trim()));
        return;
      }
      _toastTimer?.cancel();
      setState(() => _scanned = found.items.first);
      _toastTimer = Timer(const Duration(seconds: 8), () {
        if (mounted) setState(() => _scanned = null);
      });
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    }
  }

  void _openScanned() {
    final item = _scanned;
    if (item == null) return;
    final code = item.barcode ?? item.sku ?? item.product.name;
    _search.text = code;
    _toastTimer?.cancel();
    setState(() {
      _scanned = null;
      _query = code;
      _view = StockView.all;
      _editing = item.id;
    });
  }

  Future<void> _add() async {
    final l10n = context.l10n;
    final added = await showModalBottomSheet<VendorStockItem>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      backgroundColor: context.palette.surface,
      builder: (_) => const _AddProductSheet(),
    );
    if (added == null || !mounted) return;
    showMessage(context, l10n.vendorProductAdded);
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    if (!ref.watch(isVendorProvider)) {
      return Scaffold(
        body: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TabHeader(title: l10n.tabVendorStock),
              Expanded(
                child: MessageView(
                  icon: Symbols.inventory_2_rounded,
                  title: l10n.notVendorTitle,
                  message: l10n.notVendorMessage,
                ),
              ),
            ],
          ),
        ),
      );
    }
    final desk = ref.watch(vendorDeskProvider).value;
    final everything = ref.watch(
      vendorStockProvider((query: '', outOnly: false)),
    );
    final outAll = ref.watch(vendorStockProvider((query: '', outOnly: true)));
    final list = ref.watch(
      vendorStockProvider((query: _query, outOnly: _view == StockView.out)),
    );
    final searched = ref.watch(
      vendorStockProvider((query: _query, outOnly: false)),
    );
    final searchedOut = ref.watch(
      vendorStockProvider((query: _query, outOnly: true)),
    );
    final loaded = searched.value?.items ?? const <VendorStockItem>[];
    final counts = {
      StockView.all: searched.value?.meta.total,
      StockView.out: searchedOut.value?.meta.total,
      StockView.weight: loaded.where((i) => i.byWeight).length,
      StockView.offers: loaded.where((i) => i.onOffer).length,
    };
    // The price is the place's owner's and managers' (order takers only put
    // items in and out of stock).
    final mayEdit =
        desk != null &&
        (desk.role == VendorRole.owner || desk.role == VendorRole.manager);
    final mayAdd =
        desk != null && desk.canEditPlace && desk.kind != VendorKind.restaurant;
    // The orders already placed with each product: a new price never
    // reaches them.
    final placed = <int, int>{};
    for (final scope in [VendorOrderScope.fresh, VendorOrderScope.active]) {
      for (final o in ref.watch(vendorOrdersProvider(scope)).items) {
        for (final id in {for (final l in o.lines) l.productId}) {
          placed[id] = (placed[id] ?? 0) + 1;
        }
      }
    }
    final team = ref.watch(appConfigProvider).site.name;
    return Scaffold(
      backgroundColor: p.background,
      body: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              VendorHead(
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
                                l10n.tabVendorStock,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              if (desk != null &&
                                  everything.value != null &&
                                  outAll.value != null)
                                Padding(
                                  padding: const EdgeInsets.only(top: 3),
                                  child: Text(
                                    l10n.vendorStockSummary(
                                      desk.name,
                                      everything.value!.meta.total,
                                      outAll.value!.meta.total,
                                    ),
                                    key: const ValueKey('vendor-stock-summary'),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      color: vendorOnHead.withValues(
                                        alpha: 0.75,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                        if (mayAdd)
                          VendorRoundButton(
                            key: const ValueKey('vendor-stock-add'),
                            icon: Symbols.add_rounded,
                            label: l10n.vendorAddProduct,
                            onTap: _add,
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            key: const ValueKey('vendor-stock-search'),
                            controller: _search,
                            onChanged: _typed,
                            style: const TextStyle(color: vendorOnHead),
                            cursorColor: vendorOnHead,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: vendorGlass,
                              hintText: l10n.vendorStockHint,
                              hintStyle: TextStyle(
                                color: vendorOnHead.withValues(alpha: 0.75),
                              ),
                              prefixIcon: Icon(
                                Symbols.search_rounded,
                                color: vendorOnHead.withValues(alpha: 0.85),
                              ),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(15),
                                borderSide: BorderSide.none,
                              ),
                              enabledBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(15),
                                borderSide: BorderSide.none,
                              ),
                              focusedBorder: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(15),
                                borderSide: BorderSide(
                                  color: vendorOnHead.withValues(alpha: 0.5),
                                ),
                              ),
                              contentPadding: const EdgeInsets.symmetric(
                                vertical: 12,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Semantics(
                          button: true,
                          label: l10n.vendorScanTitle,
                          child: Material(
                            color: p.accent,
                            borderRadius: BorderRadius.circular(15),
                            child: InkWell(
                              key: const ValueKey('vendor-stock-scan'),
                              borderRadius: BorderRadius.circular(15),
                              onTap: _scan,
                              child: SizedBox(
                                width: 46,
                                height: 46,
                                child: Icon(
                                  Symbols.barcode_scanner_rounded,
                                  color: p.onAccent,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: 54,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 2),
                  children: [
                    for (final v in StockView.values)
                      Padding(
                        padding: const EdgeInsetsDirectional.only(end: 6),
                        child: _FilterChip(
                          key: ValueKey('vendor-stock-filter-${v.name}'),
                          label: switch (v) {
                            StockView.all => l10n.vendorFilterAll,
                            StockView.out => l10n.vendorFilterOut,
                            StockView.weight => l10n.vendorFilterWeight,
                            StockView.offers => l10n.vendorFilterOffers,
                          },
                          icon: switch (v) {
                            StockView.all => null,
                            StockView.out => Symbols.block_rounded,
                            StockView.weight => Symbols.scale_rounded,
                            StockView.offers => Symbols.sell_rounded,
                          },
                          count: counts[v],
                          warn: v == StockView.out,
                          selected: _view == v,
                          onTap: () => setState(() => _view = v),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: list.when(
                  loading: () =>
                      const SkeletonList(layout: SkeletonLayout.text),
                  error: (e, _) => ErrorView(error: e, onRetry: _reload),
                  data: (page) {
                    final items = [
                      for (final i in page.items)
                        if (switch (_view) {
                          StockView.weight => i.byWeight,
                          StockView.offers => i.onOffer,
                          _ => true,
                        })
                          i,
                    ];
                    if (items.isEmpty) {
                      return MessageView(
                        icon: Symbols.inventory_2_rounded,
                        title: l10n.vendorStockEmpty,
                      );
                    }
                    return RefreshIndicator(
                      onRefresh: () async => _reload(),
                      child: ListView.builder(
                        key: const ValueKey('vendor-stock-list'),
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
                        itemCount: items.length,
                        itemBuilder: (context, i) {
                          final item = items[i];
                          final on = _pending[item.id] ?? item.product.inStock;
                          final toggle = Switch(
                            key: ValueKey('vendor-stock-${item.id}'),
                            value: on,
                            onChanged: _pending.containsKey(item.id)
                                ? null
                                : (v) => _toggle(item, v),
                          );
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 7),
                            child: _editing == item.id && mayEdit
                                ? _PriceEditor(
                                    key: ValueKey('vendor-price-${item.id}'),
                                    item: item,
                                    toggle: toggle,
                                    placed: placed[item.id] ?? 0,
                                    team: team,
                                    onDone: (saved) {
                                      setState(() => _editing = null);
                                      if (saved) _reload();
                                    },
                                  )
                                : _StockRow(
                                    item: item,
                                    on: on,
                                    toggle: toggle,
                                    onPrice: mayEdit
                                        ? () =>
                                              setState(() => _editing = item.id)
                                        : null,
                                  ),
                          );
                        },
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
          if (_scanned case final s?)
            PositionedDirectional(
              start: 16,
              end: 16,
              bottom: 16,
              child: SafeArea(
                top: false,
                child: _ScanToast(item: s, onOpen: _openScanned),
              ),
            ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    super.key,
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
    this.icon,
    this.warn = false,
  });

  final String label;
  final int? count;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;
  final bool warn;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final fg = selected
        ? p.background
        : warn
        ? p.danger
        : p.text;
    return Semantics(
      selected: selected,
      button: true,
      child: Material(
        color: selected ? p.text : p.surface,
        shape: StadiumBorder(
          side: BorderSide(color: selected ? p.text : p.border),
        ),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 15, color: fg),
                  const SizedBox(width: 5),
                ],
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: fg,
                  ),
                ),
                if (count != null) ...[
                  const SizedBox(width: 5),
                  Text(
                    '$count',
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: fg.withValues(alpha: 0.6),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The product's photo, grey while it's out of stock.
class _Photo extends StatelessWidget {
  const _Photo({required this.url, required this.out});

  final String? url;
  final bool out;

  @override
  Widget build(BuildContext context) {
    final photo = AppNetworkImage(
      url: url,
      width: 46,
      height: 46,
      radius: 13,
      placeholderIcon: Symbols.inventory_2_rounded,
    );
    if (!out) return photo;
    return Opacity(
      opacity: 0.5,
      child: ColorFiltered(
        colorFilter: const ColorFilter.matrix([
          0.33, 0.33, 0.33, 0, 0, //
          0.33, 0.33, 0.33, 0, 0, //
          0.33, 0.33, 0.33, 0, 0, //
          0, 0, 0, 1, 0,
        ]),
        child: photo,
      ),
    );
  }
}

/// Its SKU and barcode, as they're printed.
String _codes(VendorStockItem i) => [?i.sku, ?i.barcode].join(' · ');

class _StockRow extends StatelessWidget {
  const _StockRow({
    required this.item,
    required this.on,
    required this.toggle,
    required this.onPrice,
  });

  final VendorStockItem item;
  final bool on;
  final Widget toggle;
  final VoidCallback? onPrice;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final product = item.product;
    final unit = product.unit == ProductUnit.item
        ? null
        : unitShort(l10n, product.unit);
    final codes = _codes(item);
    final stock = !on
        ? l10n.vendorLineOut
        : item.stock != null
        ? l10n.vendorInStockLeft(
            product.unit == ProductUnit.item
                ? item.stock!.round().toString()
                : amountText(l10n, item.stock!, product.unit),
          )
        : l10n.vendorInStock;
    return Container(
      key: ValueKey('vendor-stock-row-${item.id}'),
      padding: const EdgeInsets.fromLTRB(10, 9, 6, 9),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: p.isDark ? 0.35 : 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          _Photo(url: product.imageUrl, out: !on),
          const SizedBox(width: 10),
          Expanded(
            flex: 5,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  product.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                if (codes.isNotEmpty)
                  Text(
                    codes,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    textDirection: TextDirection.ltr,
                    style: TextStyle(
                      fontSize: 10.5,
                      fontFamily: vendorMono,
                      color: p.textTertiary,
                    ),
                  ),
                Text(
                  stock,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: on ? p.success : p.danger,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 6),
          Flexible(
            flex: 4,
            child: Semantics(
              button: onPrice != null,
              child: InkWell(
                key: ValueKey('vendor-stock-price-${item.id}'),
                borderRadius: BorderRadius.circular(10),
                onTap: onPrice,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: p.border),
                  ),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          product.price.formatted,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                        if (unit != null)
                          Text(
                            ' /$unit',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: p.textSecondary,
                            ),
                          ),
                        if (onPrice != null) ...[
                          const SizedBox(width: 4),
                          Icon(
                            Symbols.edit_rounded,
                            size: 14,
                            color: p.textSecondary,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          toggle,
        ],
      ),
    );
  }
}

/// 115.72 A product's price changed on the spot (design 10): the new price,
/// the price it was when shown as an offer, and who it reaches.
class _PriceEditor extends ConsumerStatefulWidget {
  const _PriceEditor({
    super.key,
    required this.item,
    required this.toggle,
    required this.placed,
    required this.team,
    required this.onDone,
  });

  final VendorStockItem item;
  final Widget toggle;
  final int placed;
  final String team;
  final ValueChanged<bool> onDone;

  @override
  ConsumerState<_PriceEditor> createState() => _PriceEditorState();
}

class _PriceEditorState extends ConsumerState<_PriceEditor> {
  late final TextEditingController _price = TextEditingController(
    text: widget.item.product.price.amount,
  );
  late bool _offer = widget.item.onOffer;
  bool _saving = false;

  /// The price it was: the offer's, else today's.
  MarketMoney get _was =>
      widget.item.product.wasPrice ?? widget.item.product.price;

  @override
  void dispose() {
    _price.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = context.l10n;
    final product = widget.item.product;
    final dot = product.price.amount.indexOf('.');
    final decimals = dot < 0 ? 0 : product.price.amount.length - dot - 1;
    final value = double.tryParse(_price.text.trim().replaceAll(',', '.'));
    if (value == null || value <= 0) {
      showMessage(context, l10n.vendorPriceInvalid);
      return;
    }
    if (_offer && value >= moneyValue(_was) - 1e-9) {
      showMessage(context, l10n.vendorWasAbove);
      return;
    }
    setState(() => _saving = true);
    try {
      await ref
          .read(yallappApiProvider)
          .updateVendorProductPrice(
            product.id,
            price: value.toStringAsFixed(decimals),
            wasPrice: _offer ? _was.amount : null,
          );
      if (!mounted) return;
      showMessage(context, l10n.vendorPriceSaved);
      widget.onDone(true);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final product = widget.item.product;
    final unit = product.unit == ProductUnit.item
        ? null
        : unitShort(l10n, product.unit);
    final codes = _codes(widget.item);
    TextStyle small() => TextStyle(
      fontSize: 11,
      fontWeight: FontWeight.w700,
      color: p.textSecondary,
    );
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: p.surface,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: p.primary, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: p.isDark ? 0.4 : 0.1),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _Photo(url: product.imageUrl, out: !product.inStock),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                    Text(
                      [
                        if (codes.isNotEmpty) codes,
                        if (product.unit == ProductUnit.kg) l10n.vendorPerKg,
                      ].join(' · '),
                      style: TextStyle(fontSize: 10.5, color: p.textTertiary),
                    ),
                  ],
                ),
              ),
              widget.toggle,
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: TextField(
                  key: const ValueKey('vendor-price-new'),
                  controller: _price,
                  autofocus: true,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                  ],
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                  decoration: InputDecoration(
                    labelText: unit == null
                        ? l10n.vendorNewPrice
                        : l10n.vendorNewPricePer(unit),
                    floatingLabelBehavior: FloatingLabelBehavior.always,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: p.primary, width: 2),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 11,
                    vertical: 9,
                  ),
                  decoration: BoxDecoration(
                    color: p.surfaceMuted.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: p.border),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(l10n.vendorShownAsWas, style: small()),
                      Text(
                        _was.amount,
                        key: const ValueKey('vendor-price-was'),
                        style: TextStyle(
                          fontSize: 19,
                          fontWeight: FontWeight.w700,
                          decoration: TextDecoration.lineThrough,
                          color: _offer ? p.textSecondary : p.textTertiary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Wrap(
            alignment: WrapAlignment.spaceBetween,
            crossAxisAlignment: WrapCrossAlignment.center,
            spacing: 8,
            runSpacing: 6,
            children: [
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 200),
                child: InkWell(
                  key: const ValueKey('vendor-price-offer'),
                  onTap: () => setState(() => _offer = !_offer),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Checkbox(
                        value: _offer,
                        onChanged: (v) => setState(() => _offer = v ?? false),
                        materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        visualDensity: VisualDensity.compact,
                      ),
                      Flexible(
                        child: Text(
                          l10n.vendorShowOffer,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  OutlinedButton(
                    key: const ValueKey('vendor-price-cancel'),
                    onPressed: _saving ? null : () => widget.onDone(false),
                    style: OutlinedButton.styleFrom(
                      shape: const StadiumBorder(),
                      minimumSize: const Size(0, 40),
                      foregroundColor: p.text,
                      side: BorderSide(color: p.border, width: 1.5),
                    ),
                    child: Text(l10n.vendorCancel),
                  ),
                  const SizedBox(width: 8),
                  FilledButton(
                    key: const ValueKey('vendor-price-save'),
                    onPressed: _saving ? null : _save,
                    style: FilledButton.styleFrom(
                      shape: const StadiumBorder(),
                      minimumSize: const Size(0, 40),
                      backgroundColor: p.primary,
                      foregroundColor: p.onPrimary,
                    ),
                    child: Text(l10n.vendorSave),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text.rich(
            TextSpan(
              children: [
                WidgetSpan(
                  alignment: PlaceholderAlignment.middle,
                  child: Icon(
                    Symbols.info_rounded,
                    size: 15,
                    color: p.textSecondary,
                  ),
                ),
                TextSpan(
                  text:
                      ' ${l10n.vendorPriceApplies(widget.placed)} ${l10n.vendorPriceUndo(widget.team)}',
                ),
              ],
            ),
            key: const ValueKey('vendor-price-note'),
            style: TextStyle(fontSize: 12.5, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}

class _ScanToast extends StatelessWidget {
  const _ScanToast({required this.item, required this.onOpen});

  final VendorStockItem item;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Container(
      key: const ValueKey('vendor-scan-toast'),
      decoration: BoxDecoration(
        color: p.text,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: p.isDark ? 0.5 : 0.2),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 10, 6, 10),
          child: Row(
            children: [
              AppNetworkImage(
                url: item.product.imageUrl,
                width: 32,
                height: 32,
                radius: 9,
                placeholderIcon: Symbols.inventory_2_rounded,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  l10n.vendorScanned(item.product.name),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: p.background,
                  ),
                ),
              ),
              TextButton(
                key: const ValueKey('vendor-scan-open'),
                onPressed: onOpen,
                style: TextButton.styleFrom(foregroundColor: p.accent),
                child: Text(
                  l10n.vendorOpen,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The barcode or SKU, typed or pasted (until a camera scanner is in).
class _TypedCodeDialog extends StatefulWidget {
  const _TypedCodeDialog();

  @override
  State<_TypedCodeDialog> createState() => _TypedCodeDialogState();
}

class _TypedCodeDialogState extends State<_TypedCodeDialog> {
  final _code = TextEditingController();

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AlertDialog(
      title: Text(l10n.vendorScanTitle),
      content: TextField(
        key: const ValueKey('vendor-scan-code'),
        controller: _code,
        autofocus: true,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(labelText: l10n.vendorScanTyped),
        onSubmitted: (v) => Navigator.of(context).pop(v),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text(l10n.vendorCancel),
        ),
        FilledButton(
          key: const ValueKey('vendor-scan-find'),
          onPressed: () => Navigator.of(context).pop(_code.text),
          child: Text(l10n.vendorScanFind),
        ),
      ],
    );
  }
}

/// 115.72 A product added from Stock: its name, price, how it's sold, its
/// codes.
class _AddProductSheet extends ConsumerStatefulWidget {
  const _AddProductSheet();

  @override
  ConsumerState<_AddProductSheet> createState() => _AddProductSheetState();
}

class _AddProductSheetState extends ConsumerState<_AddProductSheet> {
  final _name = TextEditingController();
  final _price = TextEditingController();
  final _sku = TextEditingController();
  final _barcode = TextEditingController();
  bool _byWeight = false;
  bool _saving = false;

  @override
  void dispose() {
    for (final c in [_name, _price, _sku, _barcode]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = context.l10n;
    final price = double.tryParse(_price.text.trim().replaceAll(',', '.'));
    if (_name.text.trim().isEmpty) return;
    if (price == null || price <= 0) {
      showMessage(context, l10n.vendorPriceInvalid);
      return;
    }
    final decimals = ref.read(marketConfigProvider)?.currencyDecimals ?? 2;
    String? text(TextEditingController c) =>
        c.text.trim().isEmpty ? null : c.text.trim();
    setState(() => _saving = true);
    try {
      final made = await ref
          .read(yallappApiProvider)
          .createVendorProduct(
            VendorProductDraft(
              name: _name.text.trim(),
              price: price.toStringAsFixed(decimals),
              byWeight: _byWeight,
              sku: text(_sku),
              barcode: text(_barcode),
            ),
          );
      if (mounted) Navigator.of(context).pop(made);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.vendorAddProduct,
                style: TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const ValueKey('vendor-add-name'),
                controller: _name,
                autofocus: true,
                decoration: InputDecoration(labelText: l10n.vendorProductName),
              ),
              const SizedBox(height: 10),
              TextField(
                key: const ValueKey('vendor-add-price'),
                controller: _price,
                keyboardType: const TextInputType.numberWithOptions(
                  decimal: true,
                ),
                decoration: InputDecoration(labelText: l10n.vendorPrice),
              ),
              const SizedBox(height: 10),
              SegmentedButton<bool>(
                segments: [
                  ButtonSegment(
                    value: false,
                    label: Text(l10n.vendorSoldByItem),
                  ),
                  ButtonSegment(value: true, label: Text(l10n.vendorSoldByKg)),
                ],
                selected: {_byWeight},
                onSelectionChanged: (v) => setState(() => _byWeight = v.first),
              ),
              const SizedBox(height: 10),
              TextField(
                key: const ValueKey('vendor-add-sku'),
                controller: _sku,
                decoration: InputDecoration(labelText: l10n.vendorSku),
              ),
              const SizedBox(height: 10),
              TextField(
                key: const ValueKey('vendor-add-barcode'),
                controller: _barcode,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(labelText: l10n.vendorBarcode),
              ),
              const SizedBox(height: 16),
              FilledButton(
                key: const ValueKey('vendor-add-save'),
                onPressed: _saving ? null : _save,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(50),
                  shape: const StadiumBorder(),
                ),
                child: Text(l10n.vendorAdd),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
