import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/bidi.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/currency.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/l10n/language.dart';
import '../../../core/providers.dart';
import '../../../core/storage/local_settings.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/rates_attribution.dart';

/// 135.5 The currencies prices can be shown in (`GET /currencies`), named
/// in the app's language; reloaded when it changes.
final currencyListProvider = FutureProvider<CurrencyList>(
  (ref) => ref.contentApi.listCurrencies(),
);

/// 135.5 The shop's own currency, from `/config` (a shop, a menu, events or
/// bookings); null for an app that doesn't sell.
String? shopCurrencyOf(AppConfig config) => config.shopCurrency;

/// 135.5 The currency choices in the picker's order: the shop's first, then
/// the phone's region's, then all the others as the server lists them (the
/// usual ones, then A–Z by name). Each once.
List<({String group, List<CurrencyChoice> items})> currencyGroups(
  List<CurrencyChoice> all, {
  required String? shop,
  required String? region,
  required String query,
  required AppLocalizations l10n,
}) {
  final q = query.trim().toLowerCase();
  bool matches(CurrencyChoice c) =>
      q.isEmpty ||
      c.code.toLowerCase().contains(q) ||
      c.name.toLowerCase().contains(q) ||
      c.symbol.toLowerCase() == q;
  final shown = all.where(matches).toList();
  final shopItems = shown.where((c) => c.code == shop).toList();
  final regionItems = shown
      .where((c) => c.code == region && c.code != shop)
      .toList();
  final rest = shown.where((c) => c.code != shop && c.code != region).toList();
  return [
    if (shopItems.isNotEmpty) (group: l10n.currencyShop, items: shopItems),
    if (regionItems.isNotEmpty)
      (group: l10n.currencyYourRegion, items: regionItems),
    if (rest.isNotEmpty) (group: l10n.currencyAll, items: rest),
  ];
}

/// 135.5 Settings › Currency: a searchable list, the shop's currency first.
Future<void> showCurrencyPicker(BuildContext context) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => const FractionallySizedBox(
        heightFactor: 0.9,
        child: CurrencyPickerSheet(),
      ),
    );

class CurrencyPickerSheet extends ConsumerStatefulWidget {
  const CurrencyPickerSheet({super.key});

  @override
  ConsumerState<CurrencyPickerSheet> createState() =>
      _CurrencyPickerSheetState();
}

class _CurrencyPickerSheetState extends ConsumerState<CurrencyPickerSheet> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final current = ref.watch(appCurrencyProvider);
    final picked = ref.watch(localSettingsProvider.select((s) => s.currency));
    final region = regionCurrency(
      ref.watch(deviceLocalesProvider).firstOrNull?.countryCode,
    );
    final shop = shopCurrencyOf(ref.watch(appConfigProvider));
    // 149 Only the app's currencies (the server lists only those too).
    final rule = ref.watch(appConfigProvider).customerCurrency;
    final list = ref.watch(currencyListProvider);
    void choose(String? code) {
      changeCurrency(ref, code);
      Navigator.of(context).pop();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 4),
          child: Text(
            l10n.currencyLabel,
            style: Theme.of(context).textTheme.titleMedium,
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.currencyPickerHint,
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
              // 135.10 The rates' source, as its terms ask.
              const RatesAttribution(
                alignment: AlignmentDirectional.centerStart,
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
          child: TextField(
            key: const Key('currency-search'),
            onChanged: (v) => setState(() => _query = v),
            textInputAction: TextInputAction.search,
            decoration: InputDecoration(
              hintText: l10n.currencySearch,
              prefixIcon: const AppIcon(AppIcons.search),
              isDense: true,
            ),
          ),
        ),
        Expanded(
          child: list.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (_, _) => Center(child: Text(l10n.currencyNoMatch)),
            data: (data) {
              final groups = currencyGroups(
                [
                  for (final c in data.items)
                    if (rule.allows(c.code, shop: shop)) c,
                ],
                shop: shop,
                region: region,
                query: _query,
                l10n: l10n,
              );
              if (groups.isEmpty) {
                return Center(child: Text(l10n.currencyNoMatch));
              }
              return ListView(
                key: const Key('currency-list'),
                children: [
                  if (picked != null &&
                      region != null &&
                      rule.allows(region, shop: shop) &&
                      _query.isEmpty)
                    ListTile(
                      key: const Key('currency-use-region'),
                      leading: const AppIcon(AppIcons.web),
                      title: Text(l10n.currencyUseRegion),
                      onTap: () => choose(null),
                    ),
                  for (final g in groups) ...[
                    Padding(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
                      child: Text(
                        g.group,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: p.textSecondary,
                        ),
                      ),
                    ),
                    for (final c in g.items)
                      ListTile(
                        key: ValueKey('currency-${c.code}'),
                        minTileHeight: 52,
                        title: Text(c.name),
                        subtitle: Text(
                          isolate(
                            c.symbol == c.code
                                ? c.code
                                : '${c.code} · ${c.symbol}',
                          ),
                        ),
                        trailing: c.code == current
                            ? AppIcon(AppIcons.check, color: p.text)
                            : null,
                        selected: c.code == current,
                        onTap: () => choose(c.code),
                      ),
                  ],
                ],
              );
            },
          ),
        ),
      ],
    );
  }
}
