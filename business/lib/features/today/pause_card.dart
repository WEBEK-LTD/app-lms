import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/models.dart';
import '../../core/api/shop_models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';

final shopPauseProvider = FutureProvider.autoDispose<ShopPauseState>(
  (ref) => ref.watch(apiProvider).shopPause(ref.watch(appIdProvider)),
);

/// 214 Whether the app can pause new orders: a shop, a food app's
/// restaurants, a marketplace's places.
bool canPause(AppSummary app) =>
    app.features.orders || app.features.restaurants || app.features.market;

/// 214 Pause the shop, on Today: not taking new orders for 15 minutes, 30
/// minutes, an hour or until reopened, with a reason customers read; or,
/// while paused, until when and Reopen.
class PauseCard extends ConsumerWidget {
  const PauseCard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final c = context.yb;
    final value = ref.watch(shopPauseProvider);
    final state = value.value;
    if (state == null) return const SizedBox.shrink();
    String until(ShopPause p) => p.until == null
        ? l10n.pausedUntilReopen
        : l10n.pausedUntil(context.time(p.until!));

    Future<void> reopen([String? placeId]) async {
      try {
        await ref
            .read(apiProvider)
            .reopenShop(ref.read(appIdProvider), placeId: placeId);
        ref.invalidate(shopPauseProvider);
        if (context.mounted) showMessage(context, l10n.reopenedNow);
      } on Object catch (e) {
        if (context.mounted) showError(context, e);
      }
    }

    final shop = state.shop;
    final paused = state.pausedPlaces;
    if (shop == null && paused.isEmpty) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
        child: OutlinedButton.icon(
          key: const ValueKey('pause-shop'),
          style: OutlinedButton.styleFrom(minimumSize: const Size(64, 48)),
          icon: const Icon(AppIcons.pauseShop),
          label: Text(l10n.pauseShop),
          onPressed: () => openPauseSheet(context, state),
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Panel(
        key: const ValueKey('paused-panel'),
        color: c.warningBg,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(AppIcons.pauseShop, color: c.warning),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    shop != null
                        ? l10n.pausedShopNow
                        : l10n.pausedPlacesNow(context.number(paused.length)),
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            if (shop != null) ...[
              Text(until(shop)),
              if (shop.reason != null)
                Text(l10n.pauseReasonShown(shop.reason!)),
              const SizedBox(height: 10),
              FilledButton(
                key: const ValueKey('reopen-shop'),
                onPressed: () => reopen(),
                child: Text(l10n.reopenNow),
              ),
            ] else ...[
              for (final p in paused)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(p.name),
                  subtitle: Text(
                    [until(p.paused!), ?p.paused!.reason].join(' · '),
                  ),
                  trailing: TextButton(
                    key: ValueKey('reopen-${p.id}'),
                    onPressed: () => reopen(p.id),
                    child: Text(l10n.reopenNow),
                  ),
                ),
              if (paused.length < state.places.length)
                OutlinedButton(
                  onPressed: () => openPauseSheet(context, state),
                  child: Text(l10n.pauseMore),
                ),
            ],
          ],
        ),
      ),
    );
  }
}

Future<void> openPauseSheet(BuildContext context, ShopPauseState state) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => PauseSheet(state: state),
    );

/// 214 How long, which place (a food app or a marketplace), and why.
class PauseSheet extends ConsumerStatefulWidget {
  const PauseSheet({super.key, required this.state});

  final ShopPauseState state;

  @override
  ConsumerState<PauseSheet> createState() => _PauseSheetState();
}

class _PauseSheetState extends ConsumerState<PauseSheet> {
  /// 15, 30, 60 or null (until reopened); -1: not chosen yet.
  int? _minutes = 30;
  String? _place;
  final _reason = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _pause() async {
    final l10n = context.l10n;
    setState(() => _busy = true);
    try {
      await ref
          .read(apiProvider)
          .pauseShop(
            ref.read(appIdProvider),
            minutes: _minutes,
            reason: _reason.text.trim().isEmpty ? null : _reason.text.trim(),
            placeId: _place,
          );
      ref.invalidate(shopPauseProvider);
      if (!mounted) return;
      showMessage(context, l10n.pausedNow);
      Navigator.pop(context);
    } on Object catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final s = widget.state;
    final choices = [
      (15, l10n.pauseFor15),
      (30, l10n.pauseFor30),
      (60, l10n.pauseFor60),
      (null, l10n.pauseUntilReopen),
    ];
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(l10n.pauseShop, style: theme.textTheme.titleLarge),
            const SizedBox(height: 6),
            Text(l10n.pauseHelp),
            if (s.byPlace) ...[
              const SizedBox(height: 16),
              Text(l10n.pauseWhich, style: theme.textTheme.titleSmall),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  ChoiceChip(
                    key: const ValueKey('pause-place-all'),
                    label: Text(l10n.pauseAllPlaces),
                    selected: _place == null,
                    onSelected: (_) => setState(() => _place = null),
                  ),
                  for (final p in s.places)
                    if (p.paused == null)
                      ChoiceChip(
                        key: ValueKey('pause-place-${p.id}'),
                        label: Text(p.name),
                        selected: _place == p.id,
                        onSelected: (_) => setState(() => _place = p.id),
                      ),
                ],
              ),
            ],
            const SizedBox(height: 16),
            Text(l10n.pauseHowLong, style: theme.textTheme.titleSmall),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final (minutes, label) in choices)
                  ChoiceChip(
                    key: ValueKey('pause-for-${minutes ?? 'reopen'}'),
                    label: Text(label),
                    selected: _minutes == minutes,
                    onSelected: (_) => setState(() => _minutes = minutes),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            TextField(
              key: const ValueKey('pause-reason'),
              controller: _reason,
              maxLength: 80,
              decoration: InputDecoration(
                labelText: l10n.pauseReason,
                helperText: l10n.pauseReasonHelp,
              ),
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              key: const ValueKey('pause-confirm'),
              style: FilledButton.styleFrom(minimumSize: const Size(64, 52)),
              icon: const Icon(AppIcons.pauseShop),
              label: Text(l10n.pauseConfirm),
              onPressed: _busy ? null : _pause,
            ),
          ],
        ),
      ),
    );
  }
}
