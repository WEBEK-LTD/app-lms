import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/format/bidi.dart';

/// 104 What the delivery screens share: a shipment's stage in words, its
/// stages, its places with directions.

String shipmentStatusLabel(AppLocalizations l10n, ShipmentStatus status) =>
    switch (status) {
      ShipmentStatus.awaitingPayment => l10n.shipmentAwaitingPayment,
      ShipmentStatus.pending => l10n.shipmentPending,
      ShipmentStatus.assigned => l10n.shipmentAssigned,
      ShipmentStatus.pickedUp => l10n.shipmentPickedUp,
      ShipmentStatus.onTheWay => l10n.shipmentOnTheWay,
      ShipmentStatus.delivered => l10n.shipmentDelivered,
      ShipmentStatus.failed => l10n.shipmentFailed,
      ShipmentStatus.cancelled => l10n.shipmentCancelled,
    };

String packageSizeLabel(AppLocalizations l10n, PackageSize size) =>
    switch (size) {
      PackageSize.small => l10n.parcelSmall,
      PackageSize.medium => l10n.parcelMedium,
      PackageSize.large => l10n.parcelLarge,
    };

/// The stage as a coloured label.
class ShipmentStatusChip extends StatelessWidget {
  const ShipmentStatusChip({super.key, required this.status});

  final ShipmentStatus status;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final (bg, fg) = switch (status) {
      ShipmentStatus.delivered => (p.successSoft, p.success),
      ShipmentStatus.failed ||
      ShipmentStatus.cancelled => (p.surfaceMuted, p.danger),
      ShipmentStatus.pending ||
      ShipmentStatus.awaitingPayment => (p.accentSoft, p.text),
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
          shipmentStatusLabel(context.l10n, status),
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

/// The stages a shipment went through, oldest first.
class StagesTimeline extends StatelessWidget {
  const StagesTimeline({super.key, required this.stages});

  final List<ShipmentStage> stages;

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
                        shipmentStatusLabel(l10n, stages[i].status),
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

/// Directions to a place in the phone's maps: Apple Maps on iPhone,
/// Google Maps elsewhere; by its address when it has no coordinates.
String directionsUrl(Place place, {required bool ios}) {
  final to = place.located
      ? '${place.lat},${place.lng}'
      : Uri.encodeComponent(place.address);
  return ios
      ? 'https://maps.apple.com/?daddr=$to'
      : 'https://www.google.com/maps/dir/?api=1&destination=$to';
}

/// A point on the phone's maps.
String pointUrl(double lat, double lng, {required bool ios}) => ios
    ? 'https://maps.apple.com/?ll=$lat,$lng&q=$lat,$lng'
    : 'https://www.google.com/maps/search/?api=1&query=$lat,$lng';

/// A pickup or drop-off: the address, its details, and directions.
class PlaceRow extends ConsumerWidget {
  const PlaceRow({
    super.key,
    required this.label,
    required this.place,
    required this.icon,
    this.directions = true,
  });

  final String label;
  final Place place;
  final IconData icon;
  final bool directions;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final ios = ref.watch(appEnvironmentProvider).isIos;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppIcon(icon, size: 22, color: p.textSecondary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: p.textSecondary,
                ),
              ),
              Text(
                isolate(place.address),
                style: TextStyle(fontSize: 15, color: p.text),
              ),
              if (place.details != null)
                Text(
                  isolate(place.details!),
                  style: TextStyle(fontSize: 13, color: p.textBody),
                ),
            ],
          ),
        ),
        if (directions)
          IconButton(
            tooltip: l10n.directionsButton,
            onPressed: () =>
                ref.read(openExternalProvider)(directionsUrl(place, ios: ios)),
            icon: AppIcon(AppIcons.directions, size: 22, color: p.link),
          ),
      ],
    );
  }
}

/// A number to call, as a button.
class CallButton extends ConsumerWidget {
  const CallButton({super.key, required this.phone, required this.label});

  final String phone;
  final String label;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    return TextButton.icon(
      onPressed: () => ref.read(openExternalProvider)('tel:$phone'),
      icon: AppIcon(AppIcons.call, size: 18, color: p.link),
      label: Text(label),
      style: TextButton.styleFrom(foregroundColor: p.link),
    );
  }
}

/// A shipment in the customer's list.
class ShipmentTile extends StatelessWidget {
  const ShipmentTile({super.key, required this.shipment, required this.onTap});

  final Shipment shipment;
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
                  shipment.reference,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Flexible(child: ShipmentStatusChip(status: shipment.status)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            isolate(shipment.pickup.address),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 14, color: p.textBody),
          ),
          Text(
            '${toArrow()} ${isolate(shipment.dropoff.address)}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 14, color: p.textBody),
          ),
          const SizedBox(height: 6),
          Text(
            [
              shortDate(shipment.createdAt),
              shipment.priceFormatted,
              shipment.recipientName,
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}

/// A job in the courier's lists.
class JobTile extends StatelessWidget {
  const JobTile({super.key, required this.job, required this.onTap});

  final CourierJob job;
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
                  job.reference,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Flexible(child: ShipmentStatusChip(status: job.status)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            isolate(job.pickup.address),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 14, color: p.textBody),
          ),
          Text(
            '${toArrow()} ${isolate(job.dropoff.address)}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 14, color: p.textBody),
          ),
          const SizedBox(height: 6),
          Text(
            [
              if (job.distanceKm != null)
                l10n.distanceKm(job.distanceKm!.toStringAsFixed(1)),
              packageSizeLabel(l10n, job.size),
              if (job.collectFormatted != null)
                l10n.jobCollect(job.collectFormatted!),
            ].join(' · '),
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        ],
      ),
    );
  }
}
