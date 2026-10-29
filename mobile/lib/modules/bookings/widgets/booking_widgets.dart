import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/format/bidi.dart';

/// "Free" or the business's formatted price.
String bookingPriceLabel(BookingPrice price) =>
    price.free ? currentL10n.free : isolate(price.formatted);

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
            radius: context.shapes.r(12),
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
    // 21 "Dr. Kerem Aksoy" is KA, not DA.
    final initial = InitialsAvatar.initialsOf(
      staff.name.replaceFirst(
        RegExp(r'^(dr|dt|prof)\.?\s+', caseSensitive: false),
        '',
      ),
    );
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: p.primarySoft, shape: BoxShape.circle),
      child: Text(
        initial,
        style: TextStyle(
          fontSize: size * 0.34,
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
                    ltrRun(a.localTime),
                    if (staff != null) isolate(staff.name),
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

/// 21 A staff member's profile (a doctor's): role, specialties, the
/// languages they speak and a few lines about them.
class StaffProfile extends StatelessWidget {
  const StaffProfile({super.key, required this.staff});

  final StaffMember staff;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final bio = staff.bio?.trim() ?? '';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            StaffAvatar(staff: staff, size: 64),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Semantics(
                    header: true,
                    child: Text(
                      staff.name,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                  ),
                  if (staff.title != null && staff.title!.trim().isNotEmpty)
                    Text(
                      staff.title!,
                      style: TextStyle(fontSize: 14, color: p.textSecondary),
                    ),
                ],
              ),
            ),
          ],
        ),
        if (staff.specialties.isNotEmpty) ...[
          const SizedBox(height: 16),
          _ProfileHeading(context.l10n.staffSpecialties),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final s in staff.specialties)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: p.primarySoft,
                    borderRadius: BorderRadius.circular(context.shapes.chip),
                  ),
                  child: Text(
                    s,
                    style: TextStyle(fontSize: 13, color: p.onPrimarySoft),
                  ),
                ),
            ],
          ),
        ],
        if (staff.languages.isNotEmpty) ...[
          const SizedBox(height: 14),
          _ProfileHeading(context.l10n.staffLanguages),
          const SizedBox(height: 4),
          Text(
            staff.languages.join(' · '),
            style: TextStyle(fontSize: 15, color: p.text),
          ),
        ],
        if (bio.isNotEmpty) ...[
          const SizedBox(height: 14),
          _ProfileHeading(context.l10n.staffAbout(staff.name)),
          const SizedBox(height: 4),
          Text(
            bio,
            style: TextStyle(fontSize: 15, height: 1.45, color: p.text),
          ),
        ],
      ],
    );
  }
}

class _ProfileHeading extends StatelessWidget {
  const _ProfileHeading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Text(
    text,
    style: TextStyle(
      fontSize: 13,
      fontWeight: FontWeight.w700,
      color: context.palette.textSecondary,
    ),
  );
}

/// Shows a staff member's profile in a sheet.
Future<void> showStaffProfile(BuildContext context, StaffMember staff) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: StaffProfile(staff: staff),
        ),
      ),
    );
