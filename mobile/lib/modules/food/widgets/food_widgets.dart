import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';

/// 105.1 What the food screens share: an order's stage in words, its
/// stages, a restaurant and an order in a list.

String foodStatusLabel(AppLocalizations l10n, FoodOrderStatus status) =>
    switch (status) {
      FoodOrderStatus.awaitingPayment => l10n.foodAwaitingPayment,
      FoodOrderStatus.placed => l10n.foodPlaced,
      FoodOrderStatus.accepted => l10n.foodAccepted,
      FoodOrderStatus.ready => l10n.foodReady,
      FoodOrderStatus.pickedUp => l10n.foodPickedUp,
      FoodOrderStatus.onTheWay => l10n.foodOnTheWay,
      FoodOrderStatus.delivered => l10n.foodDelivered,
      FoodOrderStatus.rejected => l10n.foodRejected,
      FoodOrderStatus.cancelled => l10n.foodCancelled,
      FoodOrderStatus.failed => l10n.foodFailed,
    };

String rejectionLabel(AppLocalizations l10n, FoodRejection reason) =>
    switch (reason) {
      FoodRejection.closing => l10n.rejectClosing,
      FoodRejection.tooBusy => l10n.rejectTooBusy,
      FoodRejection.itemUnavailable => l10n.rejectItemUnavailable,
      FoodRejection.other => l10n.rejectOther,
    };

/// The stage as a coloured label.
class FoodStatusChip extends StatelessWidget {
  const FoodStatusChip({super.key, required this.status});

  final FoodOrderStatus status;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final (bg, fg) = switch (status) {
      FoodOrderStatus.delivered => (p.successSoft, p.success),
      FoodOrderStatus.rejected ||
      FoodOrderStatus.failed ||
      FoodOrderStatus.cancelled => (p.surfaceMuted, p.danger),
      FoodOrderStatus.placed ||
      FoodOrderStatus.awaitingPayment => (p.accentSoft, p.text),
      _ => (p.primarySoft, p.onPrimarySoft),
    };
    return DecoratedBox(
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        child: Text(
          foodStatusLabel(context.l10n, status),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: fg,
          ),
        ),
      ),
    );
  }
}

/// The stages an order went through, oldest first.
class FoodStagesTimeline extends StatelessWidget {
  const FoodStagesTimeline({super.key, required this.stages});

  final List<FoodOrderStage> stages;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < stages.length; i++)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Container(
                    width: 12,
                    height: 12,
                    margin: const EdgeInsets.only(top: 4),
                    decoration: BoxDecoration(
                      color: i == stages.length - 1 ? p.primary : p.border,
                      shape: BoxShape.circle,
                    ),
                  ),
                  if (i < stages.length - 1)
                    Container(width: 2, height: 36, color: p.border),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        foodStatusLabel(l10n, stages[i].status),
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                      Text(
                        dayAndTime(stages[i].at),
                        style: TextStyle(fontSize: 13, color: p.textSecondary),
                      ),
                      if (stages[i].note != null)
                        Text(
                          stages[i].note!,
                          style: TextStyle(fontSize: 13, color: p.textBody),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }
}

/// A line of an order: "2× Koshari", its choices and note, its total.
class FoodLineRow extends StatelessWidget {
  const FoodLineRow({super.key, required this.line});

  final FoodOrderLine line;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${line.quantity}× ${line.name}',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
                if (line.choices.isNotEmpty)
                  Text(
                    line.choices.join(' · '),
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                if (line.note != null)
                  Text(
                    line.note!,
                    style: TextStyle(
                      fontSize: 13,
                      fontStyle: FontStyle.italic,
                      color: p.textBody,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            line.totalFormatted,
            style: TextStyle(fontSize: 14, color: p.text),
          ),
        ],
      ),
    );
  }
}

/// A label and an amount on one row.
class AmountRow extends StatelessWidget {
  const AmountRow({
    super.key,
    required this.label,
    required this.value,
    this.strong = false,
  });

  final String label;
  final String value;
  final bool strong;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final style = TextStyle(
      fontSize: strong ? 17 : 15,
      fontWeight: strong ? FontWeight.w800 : FontWeight.w400,
      color: p.text,
    );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, style: style),
        ],
      ),
    );
  }
}

/// A restaurant in the list: its picture, cuisines, rating, whether it is
/// open, how long and what delivery costs.
class RestaurantTile extends StatelessWidget {
  const RestaurantTile({
    super.key,
    required this.restaurant,
    required this.onTap,
  });

  final RestaurantSummary restaurant;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final r = restaurant;
    final state = r.busy
        ? l10n.restaurantBusy
        : !r.open
        ? (r.opensAt != null
              ? l10n.restaurantOpensAt(opensLabel(r.opensAt!))
              : l10n.restaurantClosed)
        : r.delivers == false
        ? l10n.restaurantNoDelivery
        : null;
    final facts = [
      if (r.deliveryMinutes != null)
        l10n.restaurantMinutes(r.deliveryMinutes!)
      else
        l10n.restaurantMinutes(r.prepMinutes),
      if (r.deliveryFeeFormatted != null)
        l10n.restaurantFee(r.deliveryFeeFormatted!),
      if (r.minOrderFormatted != null)
        l10n.restaurantMinOrder(r.minOrderFormatted!),
    ];
    return Opacity(
      opacity: state == null ? 1 : 0.6,
      child: AppCard(
        key: ValueKey('restaurant-${r.id}'),
        padding: const EdgeInsets.all(12),
        onTap: onTap,
        child: Row(
          children: [
            AppNetworkImage(
              url: r.logoUrl ?? r.coverUrl,
              seed: r.id,
              radius: 12,
              width: 64,
              height: 64,
              placeholderIcon: AppIcons.restaurant,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    r.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                  if (r.cuisines.isNotEmpty)
                    Text(
                      r.cuisines.join(' · '),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      if (r.rating != null) ...[
                        AppIcon(
                          AppIcons.star,
                          size: 16,
                          color: p.star,
                          filled: true,
                        ),
                        const SizedBox(width: 2),
                        Text(
                          '${r.rating!.toStringAsFixed(1)} (${r.ratingsCount})',
                          style: TextStyle(fontSize: 13, color: p.text),
                        ),
                        const SizedBox(width: 8),
                      ],
                      Expanded(
                        child: Text(
                          facts.join(' · '),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 13,
                            color: p.textSecondary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (state != null)
                    Text(
                      state,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: p.danger,
                      ),
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

/// An order in the customer's list.
class FoodOrderTile extends StatelessWidget {
  const FoodOrderTile({super.key, required this.order, required this.onTap});

  final FoodOrder order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AppCard(
      padding: const EdgeInsets.all(16),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  order.restaurantName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Flexible(child: FoodStatusChip(status: order.status)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            order.lines.map((l) => '${l.quantity}× ${l.name}').join(', '),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 14, color: p.textBody),
          ),
          const SizedBox(height: 6),
          Text(
            [
              order.reference,
              shortDate(order.createdAt),
              order.totalFormatted,
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}

/// An order in the restaurant's lists.
class RestaurantOrderTile extends StatelessWidget {
  const RestaurantOrderTile({
    super.key,
    required this.order,
    required this.onTap,
  });

  final RestaurantOrder order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return AppCard(
      padding: const EdgeInsets.all(16),
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  order.reference,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Flexible(child: FoodStatusChip(status: order.status)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            order.lines.map((l) => '${l.quantity}× ${l.name}').join(', '),
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 14, color: p.textBody),
          ),
          const SizedBox(height: 6),
          Text(
            [
              order.customerName,
              clockTime(order.createdAt),
              order.subtotalFormatted,
              if (order.readyAt != null &&
                  order.status == FoodOrderStatus.accepted)
                l10n.foodReadyAt(clockTime(order.readyAt!)),
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}

/// One to five stars to pick.
class StarPicker extends StatelessWidget {
  const StarPicker({
    super.key,
    required this.keyPrefix,
    required this.value,
    required this.onChanged,
  });

  final String keyPrefix;
  final int value;
  final ValueChanged<int> onChanged;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      children: [
        for (var i = 1; i <= 5; i++)
          IconButton(
            key: ValueKey('$keyPrefix-$i'),
            tooltip: context.l10n.rateStar(i),
            onPressed: () => onChanged(i),
            icon: AppIcon(
              AppIcons.star,
              size: 30,
              filled: i <= value,
              color: i <= value ? p.star : p.textTertiary,
            ),
          ),
      ],
    );
  }
}
