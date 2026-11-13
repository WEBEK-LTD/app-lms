import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../data/travel_providers.dart';
import 'travel_ui.dart';

/// 126 The search's pickers: a city or an airport from the company's places,
/// the guests and rooms (or travellers), the dates.

Future<String?> pickCity(BuildContext context, WidgetRef ref) async {
  final places = await ref
      .read(travelPlacesProvider.future)
      .catchError((_) => const TravelPlaces());
  if (!context.mounted) return null;
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => _PlaceSheet(
      title: context.l10n.travelWhereTo,
      items: [
        for (final c in places.cities)
          (
            id: c.city,
            title: c.city,
            subtitle: [
              c.country,
              context.l10n.travelHotelsCount(c.hotels),
            ].whereType<String>().join(' · '),
          ),
      ],
    ),
  );
}

Future<TravelAirport?> pickAirport(
  BuildContext context,
  WidgetRef ref, {
  required String title,
}) async {
  final places = await ref
      .read(travelPlacesProvider.future)
      .catchError((_) => const TravelPlaces());
  if (!context.mounted) return null;
  final code = await showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => _PlaceSheet(
      title: title,
      items: [
        for (final a in places.airports)
          (
            id: a.code,
            title: '${a.city} · ${a.code}',
            subtitle: a.airport ?? '',
          ),
      ],
    ),
  );
  return code == null
      ? null
      : places.airports.where((a) => a.code == code).firstOrNull;
}

class _PlaceSheet extends ConsumerStatefulWidget {
  const _PlaceSheet({required this.title, required this.items});
  final String title;
  final List<({String id, String title, String subtitle})> items;

  @override
  ConsumerState<_PlaceSheet> createState() => _PlaceSheetState();
}

class _PlaceSheetState extends ConsumerState<_PlaceSheet> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final t = travelTokens(context, ref);
    final shown = widget.items
        .where(
          (i) => _q.isEmpty || i.title.toLowerCase().contains(_q.toLowerCase()),
        )
        .toList();
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          16,
          0,
          16,
          MediaQuery.viewInsetsOf(context).bottom + 12,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(widget.title, style: t.serif(22)),
            const SizedBox(height: 12),
            TextField(
              autofocus: false,
              decoration: InputDecoration(
                prefixIcon: const Icon(Symbols.search_rounded),
                hintText: context.l10n.travelSearchPlaces,
              ),
              onChanged: (v) => setState(() => _q = v.trim()),
            ),
            const SizedBox(height: 8),
            ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.sizeOf(context).height * 0.5,
              ),
              child: shown.isEmpty
                  ? Padding(
                      padding: const EdgeInsets.all(24),
                      child: Text(
                        context.l10n.travelNoPlaces,
                        textAlign: TextAlign.center,
                        style: t.ui(14, color: t.muted),
                      ),
                    )
                  : ListView(
                      shrinkWrap: true,
                      children: [
                        for (final i in shown)
                          ListTile(
                            leading: Icon(
                              Symbols.location_on_rounded,
                              color: t.muted,
                            ),
                            title: Text(
                              i.title,
                              style: t.ui(15, weight: FontWeight.w800),
                            ),
                            subtitle: i.subtitle.isEmpty
                                ? null
                                : Text(
                                    i.subtitle,
                                    style: t.ui(12.5, color: t.muted),
                                  ),
                            onTap: () => Navigator.of(context).pop(i.id),
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

/// Guests and rooms; with [rooms] false, travellers only.
Future<({int people, int rooms})?> pickPeople(
  BuildContext context,
  WidgetRef ref, {
  required int people,
  int rooms = 1,
  bool withRooms = true,
}) => showModalBottomSheet<({int people, int rooms})>(
  context: context,
  showDragHandle: true,
  builder: (context) =>
      _PeopleSheet(people: people, rooms: rooms, withRooms: withRooms),
);

class _PeopleSheet extends ConsumerStatefulWidget {
  const _PeopleSheet({
    required this.people,
    required this.rooms,
    required this.withRooms,
  });
  final int people;
  final int rooms;
  final bool withRooms;

  @override
  ConsumerState<_PeopleSheet> createState() => _PeopleSheetState();
}

class _PeopleSheetState extends ConsumerState<_PeopleSheet> {
  late int _people = widget.people;
  late int _rooms = widget.rooms;

  @override
  Widget build(BuildContext context) {
    final t = travelTokens(context, ref);
    final l = context.l10n;
    Widget stepper(
      String label,
      int value,
      int min,
      int max,
      ValueChanged<int> set,
    ) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Text(label, style: t.ui(16, weight: FontWeight.w700)),
          ),
          IconButton.outlined(
            tooltip: l.travelLess,
            onPressed: value > min
                ? () => setState(() => set(value - 1))
                : null,
            icon: const Icon(Symbols.remove_rounded),
          ),
          SizedBox(
            width: 40,
            child: Text(
              '$value',
              textAlign: TextAlign.center,
              style: t.ui(18, weight: FontWeight.w800),
            ),
          ),
          IconButton.outlined(
            tooltip: l.travelMore,
            onPressed: value < max
                ? () => setState(() => set(value + 1))
                : null,
            icon: const Icon(Symbols.add_rounded),
          ),
        ],
      ),
    );
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            stepper(
              widget.withRooms ? l.travelGuestsLabel : l.travelTravellers,
              _people,
              1,
              widget.withRooms ? 12 : 9,
              (v) => _people = v,
            ),
            if (widget.withRooms)
              stepper(l.travelRoomsLabel, _rooms, 1, 5, (v) => _rooms = v),
            const SizedBox(height: 12),
            TravelButton(
              label: l.travelDone,
              t: t,
              onPressed: () =>
                  Navigator.of(context).pop((people: _people, rooms: _rooms)),
            ),
          ],
        ),
      ),
    );
  }
}

Future<DateTimeRange?> pickDates(
  BuildContext context, {
  DateTime? from,
  DateTime? to,
}) {
  final today = DateUtils.dateOnly(DateTime.now());
  return showDateRangePicker(
    context: context,
    firstDate: today,
    lastDate: today.add(const Duration(days: 540)),
    initialDateRange: from != null && to != null && !from.isBefore(today)
        ? DateTimeRange(start: from, end: to)
        : null,
  );
}

Future<DateTime?> pickDay(
  BuildContext context, {
  DateTime? initial,
  DateTime? first,
}) {
  final today = DateUtils.dateOnly(DateTime.now());
  final start = first ?? today;
  return showDatePicker(
    context: context,
    firstDate: start,
    lastDate: today.add(const Duration(days: 540)),
    initialDate: initial != null && !initial.isBefore(start) ? initial : start,
  );
}
