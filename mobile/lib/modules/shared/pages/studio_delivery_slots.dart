import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/palette.dart';
import '../../store/data/store_providers.dart';

/// 210 The `delivery_slots` element: the shop's next delivery days
/// (`StoreConfig.delivery_date`) as chips, the chosen day's times under
/// them (a full one dimmed and not to choose), and with `assembly` a line
/// that the team assembles on the day. What the person picks is the cart's
/// day and time ([cartDeliveryProvider]), so the checkout opens with them.
/// Nothing when the shop has no delivery days; an app before it skips it.
class StudioDeliverySlotsView extends ConsumerStatefulWidget {
  const StudioDeliverySlotsView({
    super.key,
    required this.node,
    this.color,
    this.accent,
  });

  final StudioNode node;

  /// The element's ink (its `color`); else the theme's text.
  final Color? color;

  /// The chosen chip's fill (its `border_color`); else [color].
  final Color? accent;

  /// Whether the shop delivers on days the person can pick.
  static bool shows(WidgetRef ref) {
    final rules = ref.watch(appConfigProvider).store?.deliveryDate;
    return rules != null && rules.enabled;
  }

  @override
  ConsumerState<StudioDeliverySlotsView> createState() =>
      _StudioDeliverySlotsViewState();
}

class _StudioDeliverySlotsViewState
    extends ConsumerState<StudioDeliverySlotsView> {
  /// The shop's next open days, from its own today.
  List<DateTime> _days(DeliveryDateRules rules) {
    final today = rules.shopNow(DateTime.now());
    final start = DateTime(today.year, today.month, today.day);
    final out = <DateTime>[];
    for (
      var i = 0;
      i <= rules.maxDays && out.length < widget.node.deliverySlots.days;
      i++
    ) {
      final day = addDays(start, i);
      if (!rules.allows(day, start)) continue;
      if (i == 0 && !rules.todayOpen(today)) continue;
      out.add(day);
    }
    return out;
  }

  void _pick(String date, String? slot) {
    final now = ref.read(cartDeliveryProvider);
    ref.read(cartDeliveryProvider.notifier).set((
      date: date,
      slot: slot,
      country: now.country,
      city: now.city,
      lat: now.lat,
      lng: now.lng,
    ));
  }

  @override
  Widget build(BuildContext context) {
    final rules = ref.watch(appConfigProvider).store?.deliveryDate;
    if (rules == null || !rules.enabled) return const SizedBox.shrink();
    final l10n = context.l10n;
    final p = context.palette;
    final ink = widget.color ?? p.text;
    final lit = widget.accent ?? ink;
    final onLit = lit.computeLuminance() > 0.5 ? Colors.black : Colors.white;
    final days = _days(rules);
    if (days.isEmpty) {
      return Text(
        l10n.deliverySlotsNone,
        style: TextStyle(color: ink, fontSize: 13),
      );
    }
    final picked = ref.watch(cartDeliveryProvider);
    final chosen =
        days.where((d) => isoDate(d) == picked.date).firstOrNull ?? days.first;
    final date = isoDate(chosen);
    // The day's times as the shop has them now (which are full), else its list.
    final live = ref.watch(deliverySlotsProvider(date)).asData?.value;
    final slots = live?.slots ?? rules.slots;
    final slotId = picked.date == date ? picked.slot : null;

    Widget chip({
      required bool on,
      required Widget child,
      required VoidCallback? onTap,
      required String label,
      bool enabled = true,
    }) => Semantics(
      button: true,
      selected: on,
      enabled: enabled,
      label: label,
      excludeSemantics: true,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: enabled ? onTap : null,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 160),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: on ? lit : ink.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: on ? lit : Colors.transparent),
          ),
          child: Opacity(opacity: enabled ? 1 : 0.4, child: child),
        ),
      ),
    );

    return Column(
      key: const ValueKey('studio-delivery-slots'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final d in days)
                Padding(
                  padding: const EdgeInsetsDirectional.only(end: 8),
                  child: chip(
                    on: d == chosen,
                    label: dayLabel(d),
                    onTap: () => _pick(isoDate(d), null),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          chipWeekday(d),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: d == chosen ? onLit : ink,
                          ),
                        ),
                        Text(
                          '${d.day}',
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: d == chosen ? onLit : ink,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
        if (slots.isNotEmpty) ...[
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final s in slots)
                chip(
                  on: s.id == slotId,
                  enabled: s.available && !s.full,
                  label: s.label.isNotEmpty ? s.label : '${s.start}–${s.end}',
                  onTap: () => _pick(date, s.id),
                  child: Text(
                    // Times read left to right in every language.
                    '\u2066${s.start}–${s.end}\u2069',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: s.id == slotId ? onLit : ink,
                    ),
                  ),
                ),
            ],
          ),
        ],
        const SizedBox(height: 10),
        Text(
          widget.node.deliverySlots.assembly
              ? '${l10n.deliverySlotsAssembly} ${l10n.deliverySlotsKept}'
              : l10n.deliverySlotsKept,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: ink.withValues(alpha: 0.8),
          ),
        ),
      ],
    );
  }
}
