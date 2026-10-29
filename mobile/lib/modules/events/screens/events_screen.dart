import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../real_estate/widgets/listing_widgets.dart' show TabHeader;
import '../data/events_providers.dart';
import '../widgets/event_widgets.dart';

/// The Events tab: what's coming up as a list (search and categories) or a
/// month calendar, where a day shows its events.
class EventsScreen extends ConsumerStatefulWidget {
  const EventsScreen({
    super.key,
    this.initialCategory,
    this.focusSearch = false,
  });

  final String? initialCategory;
  final bool focusSearch;

  @override
  ConsumerState<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends ConsumerState<EventsScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  late EventQuery _query = EventQuery(category: widget.initialCategory);
  bool _calendar = false;

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _searchChanged(String text) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      setState(
        () =>
            _query = EventQuery(search: text.trim(), category: _query.category),
      );
    });
  }

  void _category(String? id) =>
      setState(() => _query = EventQuery(search: _query.search, category: id));

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final categories =
        ref.watch(eventFiltersProvider).value?.categories ?? const [];
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TabHeader(title: l10n.tabEvents),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
              child: SegmentedTabs(
                labels: [l10n.eventsListView, l10n.eventsCalendarView],
                selected: _calendar ? 1 : 0,
                onChanged: (i) => setState(() => _calendar = i == 1),
              ),
            ),
            if (_calendar)
              const Expanded(child: _MonthView())
            else ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
                child: TextField(
                  controller: _search,
                  autofocus: widget.focusSearch,
                  onChanged: _searchChanged,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    hintText: l10n.eventsSearchHint,
                    prefixIcon: AppIcon(
                      AppIcons.search,
                      color: context.palette.textSecondary,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(
                        context.shapes.button,
                      ),
                    ),
                  ),
                ),
              ),
              if (categories.isNotEmpty)
                SizedBox(
                  height: chipRowHeight(context),
                  child: ListView(
                    key: const ValueKey('event-categories'),
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    children: [
                      PillChip(
                        label: l10n.eventsAll,
                        selected: _query.category == null,
                        onTap: () => _category(null),
                      ),
                      for (final c in categories) ...[
                        const SizedBox(width: 8),
                        PillChip(
                          label: c.name,
                          selected: _query.category == c.id,
                          onTap: () => _category(c.id),
                        ),
                      ],
                    ],
                  ),
                ),
              const SizedBox(height: 4),
              Expanded(child: _EventList(query: _query)),
            ],
          ],
        ),
      ),
    );
  }
}

class _EventList extends ConsumerWidget {
  const _EventList({required this.query});

  final EventQuery query;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final state = ref.watch(eventsProvider(query));
    final notifier = ref.read(eventsProvider(query).notifier);
    final filtered = query.search.isNotEmpty || query.category != null;
    if (state.isInitialLoading) {
      return SkeletonList(
        layout: SkeletonLayout.media,
        label: l10n.loadingEvents,
      );
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: notifier.retry);
    }
    if (state.items.isEmpty) {
      return MessageView(
        icon: filtered ? AppIcons.search : AppIcons.event,
        title: filtered ? l10n.noEventsFoundTitle : l10n.noEventsTitle,
        message: filtered ? l10n.noEventsFoundMessage : l10n.noEventsMessage,
      );
    }
    return RefreshIndicator(
      onRefresh: notifier.refresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.extentAfter < 300 && state.hasMore) notifier.loadMore();
          return false;
        },
        child: ListView.separated(
          key: const ValueKey('events-list'),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          itemCount: state.items.length + (state.hasMore ? 1 : 0),
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) {
            if (i >= state.items.length) {
              return const Padding(
                padding: EdgeInsets.all(16),
                child: Center(child: CircularProgressIndicator()),
              );
            }
            return EventTile(event: state.items[i]);
          },
        ),
      ),
    );
  }
}

/// A month on the organiser's calendar: days with events are marked; a tap
/// on one lists them below.
class _MonthView extends ConsumerStatefulWidget {
  const _MonthView();

  @override
  ConsumerState<_MonthView> createState() => _MonthViewState();
}

class _MonthViewState extends ConsumerState<_MonthView> {
  late DateTime _month = DateTime(DateTime.now().year, DateTime.now().month);
  DateTime? _day;

  String get _key =>
      '${_month.year.toString().padLeft(4, '0')}-${_month.month.toString().padLeft(2, '0')}';

  void _move(int months) => setState(() {
    _month = DateTime(_month.year, _month.month + months);
    _day = null;
  });

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final events = ref.watch(monthEventsProvider(_key));
    final list = events.value ?? const <EventSummary>[];
    final byDay = <String, List<EventSummary>>{};
    for (final e in list) {
      // An event over several days is marked on each of them.
      var day = DateTime(
        e.startsLocal.year,
        e.startsLocal.month,
        e.startsLocal.day,
      );
      final last = DateTime(
        e.endsLocal.year,
        e.endsLocal.month,
        e.endsLocal.day,
      );
      for (var i = 0; i < 31 && !day.isAfter(last); i++) {
        byDay.putIfAbsent(isoDate(day), () => []).add(e);
        day = addDays(day, 1);
      }
    }
    final selected = _day == null ? null : byDay[isoDate(_day!)] ?? const [];
    return ListView(
      key: const ValueKey('events-calendar'),
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      children: [
        Row(
          children: [
            SquareIconButton(
              icon: AppIcons.back,
              label: l10n.eventsPreviousMonth,
              onPressed: () => _move(-1),
            ),
            Expanded(
              child: Semantics(
                header: true,
                child: Text(
                  monthLabel(_month),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
            ),
            SquareIconButton(
              icon: AppIcons.forward,
              label: l10n.eventsNextMonth,
              onPressed: () => _move(1),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _MonthGrid(
          month: _month,
          marked: {for (final e in byDay.entries) e.key: e.value.length},
          selected: _day,
          onTap: (day) => setState(() => _day = day),
        ),
        if (events.isLoading && list.isEmpty)
          const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: CircularProgressIndicator()),
          ),
        if (events.hasError && list.isEmpty)
          ErrorView(
            error: events.error!,
            onRetry: () => ref.invalidate(monthEventsProvider(_key)),
          ),
        if (selected != null) ...[
          const SizedBox(height: 16),
          SectionHeader(title: dayLabel(_day!)),
          const SizedBox(height: 8),
          if (selected.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                l10n.noEventsOnDay,
                style: TextStyle(fontSize: 15, color: p.textSecondary),
              ),
            )
          else
            for (final e in selected) ...[
              EventTile(event: e),
              const SizedBox(height: 10),
            ],
        ],
      ],
    );
  }
}

class _MonthGrid extends StatelessWidget {
  const _MonthGrid({
    required this.month,
    required this.marked,
    required this.selected,
    required this.onTap,
  });

  final DateTime month;

  /// Events per `yyyy-MM-dd` day.
  final Map<String, int> marked;
  final DateTime? selected;
  final ValueChanged<DateTime> onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final first = DateTime(month.year, month.month);
    final days = DateTime(month.year, month.month + 1, 0).day;
    // Weeks start on Monday.
    final lead = (first.weekday + 6) % 7;
    final today = DateTime.now();
    final cells = <Widget>[
      for (var i = 0; i < 7; i++)
        Center(
          child: Text(
            chipWeekday(DateTime(2024, 1, 1 + i)),
            maxLines: 1,
            style: TextStyle(fontSize: 12, color: p.textSecondary),
          ),
        ),
      for (var i = 0; i < lead; i++) const SizedBox.shrink(),
      for (var d = 1; d <= days; d++)
        Builder(
          builder: (context) {
            final day = DateTime(month.year, month.month, d);
            final count = marked[isoDate(day)] ?? 0;
            final isSelected =
                selected != null &&
                selected!.year == day.year &&
                selected!.month == day.month &&
                selected!.day == day.day;
            final isToday =
                today.year == day.year &&
                today.month == day.month &&
                today.day == day.day;
            return Semantics(
              button: true,
              selected: isSelected,
              label: count > 0
                  ? '${dayLabel(day)}, ${l10n.eventsOnDay(count)}'
                  : dayLabel(day),
              excludeSemantics: true,
              child: InkWell(
                key: ValueKey('day-${isoDate(day)}'),
                borderRadius: BorderRadius.circular(context.shapes.r(10)),
                onTap: () => onTap(day),
                child: Container(
                  decoration: BoxDecoration(
                    color: isSelected ? p.primary : null,
                    borderRadius: BorderRadius.circular(context.shapes.r(10)),
                    border: isToday && !isSelected
                        ? Border.all(color: p.primary)
                        : null,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$d',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: count > 0
                              ? FontWeight.w700
                              : FontWeight.w400,
                          color: isSelected ? p.onPrimary : p.text,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Container(
                        width: 6,
                        height: 6,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: count == 0
                              ? Colors.transparent
                              : isSelected
                              ? p.onPrimary
                              : p.accent,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
    ];
    return GridView.count(
      crossAxisCount: 7,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 4,
      crossAxisSpacing: 4,
      childAspectRatio: 0.9,
      children: cells,
    );
  }
}
