import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/l10n/l10n.dart';

/// The height of a horizontal row of [PillChip]s at the current text size.
double chipRowHeight(BuildContext context) =>
    30 + MediaQuery.textScalerOf(context).scale(14);

/// "Free" or the business's formatted price.
String bookingPriceLabel(BookingPrice price) =>
    price.free ? currentL10n.free : price.formatted;

/// "30 min · ₺300.00".
String serviceFacts(ServiceSummary service, {BookingPrice? price}) =>
    '${formatMinutes(service.durationMinutes)} · '
    '${bookingPriceLabel(price ?? service.price)}';

/// "Monday, 19 October at 10:00", in the business's time zone.
String appointmentWhen(Appointment a) {
  final day = parseIsoDate(a.localDate);
  return day == null
      ? currentL10n.dayAtTime(a.localDate, a.localTime)
      : currentL10n.dayAtTime(dayLabel(day), a.localTime);
}

/// The colour of an appointment's status label.
Color statusColor(AppPalette p, AppointmentStatus status) => switch (status) {
  AppointmentStatus.approved || AppointmentStatus.completed => p.success,
  AppointmentStatus.pending => p.accent,
  AppointmentStatus.cancelled ||
  AppointmentStatus.rejected ||
  AppointmentStatus.noShow => p.danger,
  AppointmentStatus.unknown => p.textSecondary,
};

/// A service as a row: image, name, duration and price.
class ServiceTile extends StatelessWidget {
  const ServiceTile({super.key, required this.service, required this.onTap});

  final ServiceSummary service;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(12),
      semanticLabel: '${service.name}, ${serviceFacts(service)}',
      child: Row(
        children: [
          AppNetworkImage(
            url: service.imageUrl,
            seed: service.id,
            width: 64,
            height: 64,
            radius: 12,
            placeholderIcon: AppIcons.book,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  service.name,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  serviceFacts(service),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ],
            ),
          ),
          AppIcon(AppIcons.forward, color: p.textTertiary),
        ],
      ),
    );
  }
}

/// A round photo of a staff member, or their initial.
class StaffAvatar extends StatelessWidget {
  const StaffAvatar({super.key, required this.staff, this.size = 48});

  final StaffMember staff;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (staff.imageUrl != null && staff.imageUrl!.isNotEmpty) {
      return ClipOval(
        child: AppNetworkImage(
          url: staff.imageUrl,
          seed: staff.id,
          width: size,
          height: size,
        ),
      );
    }
    final initial = staff.name.trim().isEmpty
        ? '?'
        : staff.name.trim().characters.first.toUpperCase();
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: p.primarySoft, shape: BoxShape.circle),
      child: Text(
        initial,
        style: TextStyle(
          fontSize: size * 0.4,
          fontWeight: FontWeight.w700,
          color: p.onPrimarySoft,
        ),
      ),
    );
  }
}

/// An appointment: service, when, with whom and its status.
class AppointmentCard extends StatelessWidget {
  const AppointmentCard({
    super.key,
    required this.appointment,
    required this.onTap,
  });

  final Appointment appointment;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final a = appointment;
    final staff = a.staff;
    return AppCard(
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      semanticLabel: [
        a.serviceName,
        appointmentWhen(a),
        if (staff != null) context.l10n.withStaffLower(staff.name),
        a.statusLabel,
      ].join(', '),
      child: Row(
        children: [
          Container(
            width: 52,
            padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(
              color: p.primarySoft,
              borderRadius: BorderRadius.circular(context.shapes.button),
            ),
            child: Column(
              children: [
                Text(
                  _monthOf(a),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: p.onPrimarySoft,
                  ),
                ),
                Text(
                  _dayOf(a),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: p.onPrimarySoft,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  a.serviceName,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  [
                    _weekdayOf(a),
                    a.localTime,
                    if (staff != null) staff.name,
                  ].where((s) => s.isNotEmpty).join(' · '),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                const SizedBox(height: 3),
                Text(
                  a.statusLabel,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: statusColor(p, a.status),
                  ),
                ),
              ],
            ),
          ),
          AppIcon(AppIcons.forward, color: p.textTertiary),
        ],
      ),
    );
  }

  static String _monthOf(Appointment a) {
    final day = parseIsoDate(a.localDate);
    return day == null ? '' : shortMonth(day).toUpperCase();
  }

  static String _dayOf(Appointment a) {
    final day = parseIsoDate(a.localDate);
    return day == null ? '' : '${day.day}';
  }

  static String _weekdayOf(Appointment a) {
    final day = parseIsoDate(a.localDate);
    return day == null ? a.localDate : shortWeekday(day);
  }
}
