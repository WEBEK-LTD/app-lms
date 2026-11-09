import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/market_models.dart';
import '../data/market_providers.dart';
import '../widgets/market_sections.dart' show MarketVendorRow;

/// 115 The marketplace's Search tab: one search across its places, their
/// dishes and the shops' products (`GET /market/search`). Before anything
/// is typed, the cuisines and departments to start from.
class MarketSearchScreen extends ConsumerStatefulWidget {
  const MarketSearchScreen({super.key});

  @override
  ConsumerState<MarketSearchScreen> createState() => _MarketSearchScreenState();
}

class _MarketSearchScreenState extends ConsumerState<MarketSearchScreen> {
  final _field = TextEditingController();
  Timer? _wait;
  String _query = '';

  /// The server answers from 2 letters on.
  static const _shortest = 2;

  @override
  void dispose() {
    _wait?.cancel();
    _field.dispose();
    super.dispose();
  }

  void _changed(String text) {
    _wait?.cancel();
    _wait = Timer(const Duration(milliseconds: 300), () {
      if (mounted) setState(() => _query = text.trim());
    });
  }

  void _searchFor(String text) {
    _wait?.cancel();
    _field.text = text;
    setState(() => _query = text.trim());
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Scaffold(
      backgroundColor: p.background,
      appBar: AppBar(leading: appBarBack(context), title: Text(l10n.tabSearch)),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: TextField(
              key: const ValueKey('market-search'),
              controller: _field,
              textInputAction: TextInputAction.search,
              onChanged: _changed,
              onSubmitted: _searchFor,
              decoration: InputDecoration(
                hintText: l10n.marketSearchHint,
                prefixIcon: Icon(Symbols.search_rounded, color: p.primary),
                suffixIcon: _query.isEmpty && _field.text.isEmpty
                    ? null
                    : IconButton(
                        tooltip: MaterialLocalizations.of(context)
                            .deleteButtonTooltip,
                        icon: const Icon(Symbols.close_rounded),
                        onPressed: () => _searchFor(''),
                      ),
              ),
            ),
          ),
          Expanded(
            child: _query.length < _shortest
                ? _Ideas(onPick: _searchFor)
                : _Results(query: _query),
          ),
        ],
      ),
    );
  }
}

/// The cuisines and departments to start from.
class _Ideas extends ConsumerWidget {
  const _Ideas({required this.onPick});

  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final cuisines = ref.watch(marketHomeProvider).value?.cuisines ?? const [];
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      children: [
        Text(
          l10n.marketSearchStart,
          style: TextStyle(fontSize: 15, color: p.textBody),
        ),
        if (cuisines.isNotEmpty) ...[
          const SizedBox(height: 20),
          Text(
            l10n.marketSearchTry,
            style: TextStyle(fontWeight: FontWeight.w800, color: p.text),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final c in cuisines)
                ActionChip(
                  label: Text(c.name),
                  onPressed: () => onPick(c.name),
                ),
            ],
          ),
        ],
      ],
    );
  }
}

class _Results extends ConsumerWidget {
  const _Results({required this.query});

  final String query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final found = ref.watch(marketSearchProvider(query));
    return found.when(
      loading: () => const SkeletonList(),
      error: (e, _) => MessageView(
        icon: Symbols.error,
        title: l10n.tabSearch,
        message: '$e',
        actionLabel: l10n.marketBrowse,
        onAction: () => ref.invalidate(marketSearchProvider(query)),
      ),
      data: (results) => results.isEmpty
          ? MessageView(
              icon: Symbols.search_off,
              title: l10n.marketSearchNone(query),
            )
          : ListView(
              padding: const EdgeInsets.only(bottom: 24),
              children: [
                if (results.places.isNotEmpty) ...[
                  _Head(l10n.marketSearchPlaces),
                  for (final v in results.places) MarketVendorRow(vendor: v),
                ],
                if (results.items.isNotEmpty) ...[
                  _Head(l10n.marketSearchItems),
                  for (final f in results.items) _FoundRow(found: f),
                ],
              ],
            ),
    );
  }
}

class _Head extends StatelessWidget {
  const _Head(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsetsDirectional.fromSTEB(16, 18, 16, 8),
    child: Text(
      text,
      style: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w800,
        color: context.palette.text,
      ),
    ),
  );
}

/// A dish or product, with the place that sells it; a tap opens the place.
class _FoundRow extends StatelessWidget {
  const _FoundRow({required this.found});

  final MarketFound found;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final item = found.item;
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: SizedBox(
          width: 52,
          height: 52,
          child: AppNetworkImage(url: item.imageUrl, seed: item.id.hashCode),
        ),
      ),
      title: Text(
        item.name,
        style: TextStyle(fontWeight: FontWeight.w700, color: p.text),
      ),
      subtitle: Text(
        found.vendor.name,
        style: TextStyle(color: p.textSecondary),
      ),
      trailing: Text(
        item.price,
        style: TextStyle(fontWeight: FontWeight.w800, color: p.text),
      ),
      onTap: () => context.push(Paths.marketVendor(found.vendor.id)),
    );
  }
}
