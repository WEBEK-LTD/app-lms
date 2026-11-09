import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/vendor_providers.dart';

typedef StockFilter = ({String query, bool outOnly});

/// The vendor's items for stock: a search, or the ones out of stock.
final vendorStockProvider = FutureProvider.autoDispose
    .family<Paged<MarketProduct>, StockFilter>(
      (ref, f) => ref
          .watch(yallappApiProvider)
          .listVendorProducts(
            query: f.query.isEmpty ? null : f.query,
            outOfStock: f.outOnly,
          ),
    );

/// 115 Stock: the vendor's dishes or products, each in or out of stock
/// with one switch; a search, and the ones out of stock on their own.
class VendorStockScreen extends ConsumerStatefulWidget {
  const VendorStockScreen({super.key});

  @override
  ConsumerState<VendorStockScreen> createState() => _VendorStockScreenState();
}

class _VendorStockScreenState extends ConsumerState<VendorStockScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  String _query = '';
  bool _outOnly = false;

  /// What the switches say while the server answers.
  final _pending = <int, bool>{};

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _typed(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (mounted) setState(() => _query = text.trim());
    });
  }

  Future<void> _toggle(MarketProduct item, bool inStock) async {
    setState(() => _pending[item.id] = inStock);
    try {
      await ref
          .read(yallappApiProvider)
          .updateVendorProductStock(item.id, inStock: inStock);
      ref.invalidate(vendorStockProvider);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _pending.remove(item.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final header = TabHeader(title: l10n.tabVendorStock);
    if (!ref.watch(isVendorProvider)) {
      return Scaffold(
        body: SafeArea(
          bottom: false,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              header,
              Expanded(
                child: MessageView(
                  icon: Symbols.inventory_2,
                  title: l10n.notVendorTitle,
                  message: l10n.notVendorMessage,
                ),
              ),
            ],
          ),
        ),
      );
    }
    final items = ref.watch(
      vendorStockProvider((query: _query, outOnly: _outOnly)),
    );
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            header,
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: TextField(
                key: const ValueKey('vendor-stock-search'),
                controller: _search,
                onChanged: _typed,
                decoration: InputDecoration(
                  prefixIcon: const Icon(Symbols.search),
                  hintText: l10n.vendorStockSearch,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Align(
                alignment: AlignmentDirectional.centerStart,
                child: FilterChip(
                  key: const ValueKey('vendor-stock-out'),
                  label: Text(l10n.vendorOutOfStockOnly),
                  selected: _outOnly,
                  onSelected: (v) => setState(() => _outOnly = v),
                ),
              ),
            ),
            Expanded(
              child: items.when(
                loading: () => const SkeletonList(layout: SkeletonLayout.text),
                error: (e, _) => ErrorView(
                  error: e,
                  onRetry: () => ref.invalidate(vendorStockProvider),
                ),
                data: (page) => page.items.isEmpty
                    ? MessageView(
                        icon: Symbols.inventory_2,
                        title: l10n.vendorStockEmpty,
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(8, 4, 8, 24),
                        itemCount: page.items.length,
                        itemBuilder: (context, i) {
                          final item = page.items[i];
                          final on = _pending[item.id] ?? item.inStock;
                          return SwitchListTile(
                            key: ValueKey('vendor-stock-${item.id}'),
                            value: on,
                            onChanged: _pending.containsKey(item.id)
                                ? null
                                : (v) => _toggle(item, v),
                            title: Text(item.name),
                            subtitle: Text(
                              on ? item.price.formatted : l10n.vendorOutOfStock,
                              style: TextStyle(
                                color: on ? p.textSecondary : p.danger,
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
