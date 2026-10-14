import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';

/// "20:30", a time on the organiser's clock.
String clockTime(DateTime t) =>
    '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

/// "Sat 18 Oct, 20:30–22:30", or over two days "Sat 18 Oct, 22:00 – Sun 19
/// Oct, 02:00", on the organiser's clock.
String eventWhen(EventSummary e) {
  final start = e.startsLocal;
  final end = e.endsLocal;
  final sameDay =
      start.year == end.year &&
      start.month == end.month &&
      start.day == end.day;
  return sameDay
      ? '${shortDayLabel(start)}, ${clockTime(start)}–${clockTime(end)}'
      : '${shortDayLabel(start)}, ${clockTime(start)} – ${shortDayLabel(end)}, ${clockTime(end)}';
}

/// The venue's name, or "Online".
String eventPlace(BuildContext context, EventSummary e) =>
    e.venue?.name ?? context.l10n.eventOnline;

/// A stable placeholder colour for an event without a picture.
int eventSeed(EventSummary e) => e.id * 7;

/// A short status word for a list: cancelled, ended or sold out.
String? eventStatusLabel(BuildContext context, EventSummary e) {
  final l10n = context.l10n;
  return switch (e.status) {
    EventStatus.cancelled => l10n.eventCancelledBadge,
    EventStatus.ended => l10n.eventEndedBadge,
    EventStatus.scheduled when e.soldOut => l10n.eventSoldOut,
    EventStatus.scheduled => null,
  };
}

/// Where "Open in maps" goes: the map position, else the address.
Uri? mapsUri(EventVenue venue) {
  final query = venue.latitude != null && venue.longitude != null
      ? '${venue.latitude},${venue.longitude}'
      : [
          venue.name,
          if (venue.address case final a? when a.trim().isNotEmpty) a,
        ].join(', ');
  if (query.trim().isEmpty) return null;
  return Uri.https('www.google.com', '/maps/search/', {
    'api': '1',
    'query': query,
  });
}

/// The event as an iCalendar file (RFC 5545) for "Add to calendar".
String eventIcs(EventSummary e, {required String host, String? url}) {
  String stamp(DateTime t) {
    final u = t.toUtc();
    String two(int n) => n.toString().padLeft(2, '0');
    return '${u.year}${two(u.month)}${two(u.day)}T${two(u.hour)}${two(u.minute)}${two(u.second)}Z';
  }

  // Commas, semicolons and backslashes are escaped; line breaks become \n.
  String text(String value) => value
      .replaceAll(r'\', r'\\')
      .replaceAll(';', r'\;')
      .replaceAll(',', r'\,')
      .replaceAll(RegExp(r'\r?\n'), r'\n');

  final venue = e.venue;
  final location = venue == null
      ? null
      : [
          venue.name,
          if (venue.address case final a? when a.trim().isNotEmpty) a,
        ].join(', ');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Yallapp//Events//EN',
    'BEGIN:VEVENT',
    'UID:event-${e.id}@$host',
    'DTSTAMP:${stamp(DateTime.now())}',
    'DTSTART:${stamp(e.startsAt)}',
    'DTEND:${stamp(e.endsAt)}',
    'SUMMARY:${text(e.title)}',
    if (location != null) 'LOCATION:${text(location)}',
    if (url != null) 'URL:$url',
    if (e.status == EventStatus.cancelled) 'STATUS:CANCELLED',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

/// The day of an event, as on a calendar page: "OCT" over "18".
class DateBadge extends StatelessWidget {
  const DateBadge({super.key, required this.day, this.size = 56});

  final DateTime day;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: p.primarySoft,
        borderRadius: BorderRadius.circular(context.shapes.r(12)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            shortMonth(day).toUpperCase(),
            maxLines: 1,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.6,
              color: p.onPrimarySoft,
            ),
          ),
          Text(
            '${day.day}',
            maxLines: 1,
            style: TextStyle(
              fontSize: 20,
              height: 1.1,
              fontWeight: FontWeight.w800,
              color: p.onPrimarySoft,
            ),
          ),
        ],
      ),
    );
  }
}

/// A small coloured label: "Sold out", "Cancelled", "Valid".
class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.label,
    this.tone = ChipTone.muted,
  });

  final String label;
  final ChipTone tone;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final (bg, fg) = switch (tone) {
      ChipTone.good => (p.successSoft, p.success),
      ChipTone.bad => (p.danger.withValues(alpha: 0.12), p.danger),
      ChipTone.muted => (p.segment, p.textSecondary),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        maxLines: 1,
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: fg),
      ),
    );
  }
}

enum ChipTone { good, bad, muted }

/// An event in a list: its day, title, time and place, price and picture.
class EventTile extends StatelessWidget {
  const EventTile({super.key, required this.event});

  final EventSummary event;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final status = eventStatusLabel(context, event);
    final when = eventWhen(event);
    final place = eventPlace(context, event);
    return AppCard(
      radius: context.shapes.card,
      padding: const EdgeInsets.all(12),
      semanticLabel: [
        event.title,
        when,
        place,
        ?event.priceLabel,
        ?status,
      ].join(', '),
      onTap: () => context.push(Paths.event(event.id)),
      child: ExcludeSemantics(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            DateBadge(day: event.startsLocal),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (event.category != null)
                    Text(
                      event.category!.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: p.link,
                      ),
                    ),
                  Text(
                    event.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      height: 1.3,
                      fontWeight: FontWeight.w700,
                      color: p.text,
                      decoration: event.status == EventStatus.cancelled
                          ? TextDecoration.lineThrough
                          : null,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    when,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                  Row(
                    children: [
                      AppIcon(
                        event.venue == null
                            ? AppIcons.online
                            : AppIcons.location,
                        size: 15,
                        color: p.textSecondary,
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          place,
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
                  if (status != null || event.priceLabel != null) ...[
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        if (status != null)
                          StatusChip(label: status, tone: ChipTone.bad)
                        else if (event.priceLabel != null)
                          Text(
                            event.priceLabel!,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: p.text,
                            ),
                          ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            if (event.imageUrl != null) ...[
              const SizedBox(width: 12),
              AppNetworkImage(
                url: event.imageUrl,
                seed: eventSeed(event),
                width: 72,
                height: 72,
                radius: 10,
                placeholderIcon: AppIcons.event,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
