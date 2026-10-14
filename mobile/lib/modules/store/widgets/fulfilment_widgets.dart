import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';

/// 26 Pickup or delivery, the address and the time, in a restaurant's cart.

/// "Closed now — opens at 08:00", and what the customer can still do.
class ClosedNotice extends StatelessWidget {
  const ClosedNotice({super.key, required this.times, required this.later});

  final OrderTimes times;

  /// Orders for later are taken.
  final bool later;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final opens = times.opensAt;
    return Semantics(
      liveRegion: true,
      child: AppCard(
        color: p.surfaceMuted,
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppIcon(AppIcons.closed, size: 22, color: p.text),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    opens == null
                        ? l10n.closedNow
                        : l10n.closedNowOpensAt(opensLabel(opens)),
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    later ? l10n.closedOrderLater : l10n.closedComeBack,
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The cart's pickup or delivery choice, the address and the time.
class FulfilmentPanel extends StatelessWidget {
  const FulfilmentPanel({
    super.key,
    required this.config,
    required this.type,
    required this.onType,
    required this.address,
    required this.notes,
    required this.district,
    required this.onDistrict,
    required this.times,
    required this.later,
    required this.onLater,
    required this.slot,
    required this.onSlot,
  });

  final FulfilmentConfig config;
  final FulfilmentType type;
  final ValueChanged<FulfilmentType> onType;
  final TextEditingController address;
  final TextEditingController notes;
  final String? district;
  final ValueChanged<String?> onDistrict;

  /// Null while loading.
  final OrderTimes? times;

  /// A time for later rather than as soon as possible.
  final bool later;
  final ValueChanged<bool> onLater;
  final DateTime? slot;
  final ValueChanged<DateTime> onSlot;

  Future<void> _pickSlot(BuildContext context) async {
    final p = context.palette;
    final slots = times?.slots ?? const <DateTime>[];
    final picked = await showModalBottomSheet<DateTime>(
      context: context,
      backgroundColor: p.surface,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        builder: (context, scroll) => ListView(
          controller: scroll,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                context.l10n.orderChooseTime,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: p.text,
                ),
              ),
            ),
            for (final s in slots)
              ListTile(
                title: Text(whenLabel(s), style: TextStyle(color: p.text)),
                trailing: s == slot
                    ? AppIcon(AppIcons.check, color: p.text)
                    : null,
                onTap: () => Navigator.of(context).pop(s),
              ),
          ],
        ),
      ),
    );
    if (picked != null) onSlot(picked);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final types = config.types;
    final heading = TextStyle(
      fontSize: 16,
      fontWeight: FontWeight.w700,
      color: p.text,
    );
    final canLater = config.scheduled && (times?.slots.isNotEmpty ?? false);
    final canAsap = config.asap && (times?.asap ?? false);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Text(l10n.fulfilmentHow, style: heading),
        ),
        const SizedBox(height: 10),
        if (types.length > 1)
          SegmentedTabs(
            radio: true,
            labels: [
              for (final t in types)
                t == FulfilmentType.pickup
                    ? l10n.fulfilmentPickup
                    : l10n.fulfilmentDelivery,
            ],
            selected: types.indexOf(type),
            onChanged: (i) => onType(types[i]),
          ),
        const SizedBox(height: 12),
        if (type == FulfilmentType.pickup && config.pickupAddress != null)
          Row(
            children: [
              AppIcon(AppIcons.pickup, size: 20, color: p.textSecondary),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  l10n.fulfilmentPickupAt(config.pickupAddress!),
                  style: TextStyle(fontSize: 14, color: p.text),
                ),
              ),
            ],
          ),
        if (type == FulfilmentType.delivery) ...[
          if (config.deliveryNote != null) ...[
            Row(
              children: [
                AppIcon(AppIcons.delivery, size: 20, color: p.textSecondary),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    config.deliveryNote!,
                    style: TextStyle(fontSize: 14, color: p.textSecondary),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
          ],
          TextField(
            key: const ValueKey('delivery-address'),
            controller: address,
            minLines: 1,
            maxLines: 3,
            maxLength: 300,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: l10n.deliveryAddress,
              hintText: l10n.deliveryAddressHint,
              counterText: '',
            ),
          ),
          if (config.deliveryAreas.isNotEmpty) ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              key: const ValueKey('delivery-district'),
              initialValue: district,
              isExpanded: true,
              decoration: InputDecoration(labelText: l10n.deliveryDistrict),
              items: [
                for (final a in config.deliveryAreas)
                  DropdownMenuItem(value: a, child: Text(a)),
              ],
              onChanged: onDistrict,
            ),
          ],
          const SizedBox(height: 12),
          TextField(
            key: const ValueKey('delivery-notes'),
            controller: notes,
            maxLength: 300,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: l10n.deliveryNotes,
              counterText: '',
            ),
          ),
        ],
        const SizedBox(height: 18),
        Semantics(
          header: true,
          child: Text(l10n.orderTimeTitle, style: heading),
        ),
        const SizedBox(height: 6),
        if (times == null)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Center(child: CircularProgressIndicator()),
          )
        else ...[
          if (config.asap)
            _ChoiceRow(
              key: const ValueKey('time-asap'),
              title: l10n.orderAsap,
              subtitle: l10n.orderReadyIn(times!.readyInMinutes),
              selected: !later,
              enabled: canAsap,
              onTap: () => onLater(false),
            ),
          if (config.scheduled)
            _ChoiceRow(
              key: const ValueKey('time-later'),
              title: l10n.orderLater,
              subtitle: later && slot != null ? whenLabel(slot!) : null,
              selected: later,
              enabled: canLater,
              onTap: () {
                onLater(true);
                _pickSlot(context);
              },
            ),
        ],
      ],
    );
  }
}

class _ChoiceRow extends StatelessWidget {
  const _ChoiceRow({
    super.key,
    required this.title,
    required this.selected,
    required this.enabled,
    required this.onTap,
    this.subtitle,
  });

  final String title;
  final String? subtitle;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      checked: selected,
      inMutuallyExclusiveGroup: true,
      enabled: enabled,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(10),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 52),
          child: Row(
            children: [
              AppIcon(
                selected && enabled
                    ? AppIcons.radioChecked
                    : AppIcons.radioUnchecked,
                size: 22,
                filled: selected && enabled,
                color: enabled
                    ? (selected ? p.primary : p.textSecondary)
                    : p.border,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: enabled ? p.text : p.textSecondary,
                      ),
                    ),
                    if (subtitle != null)
                      Text(
                        subtitle!,
                        style: TextStyle(fontSize: 13, color: p.textSecondary),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
