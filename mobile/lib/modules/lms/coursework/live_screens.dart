import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../shared/account/account_scaffold.dart';
import 'coursework_providers.dart';

/// 112.5 Live classes of courses managed in Yallapp: one class (when it
/// starts, the academy's notes, joining from 15 minutes before it starts in
/// the meeting app, the recording once it's over) and the student's live
/// classes, coming and past.

String liveWhen(BuildContext context, LiveSession live) =>
    '${dayAndTime(live.startsAt)} · ${formatMinutes(live.durationMinutes)}';

class LiveSessionScreen extends ConsumerWidget {
  const LiveSessionScreen({super.key, required this.liveId});

  final int liveId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(liveSessionProvider(liveId));
    final live = state.value;
    final open = ref.read(openExternalProvider);
    return AccountScaffold(
      title: live?.title ?? context.l10n.liveClass,
      footer: live == null
          ? null
          : live.joinUrl != null
          ? PrimaryButton(
              key: const ValueKey('live-join'),
              label: context.l10n.liveJoin,
              icon: AppIcons.live,
              height: 54,
              onPressed: () => open(live.joinUrl!),
            )
          : live.recordingUrl != null
          ? PrimaryButton(
              key: const ValueKey('live-recording'),
              label: context.l10n.liveRecording,
              icon: AppIcons.playCircle,
              height: 54,
              onPressed: () => open(live.recordingUrl!),
            )
          : null,
      child: switch (state) {
        AsyncData(:final value) => _LiveBody(live: value),
        AsyncError(:final error) => ErrorView(
          error: error,
          onRetry: () => ref.invalidate(liveSessionProvider(liveId)),
        ),
        _ => const SkeletonList(
          layout: SkeletonLayout.text,
          count: 2,
          padding: EdgeInsets.zero,
        ),
      },
    );
  }
}

class _LiveBody extends StatelessWidget {
  const _LiveBody({required this.live});

  final LiveSession live;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final status = switch (live.status) {
      LiveStatus.live => l10n.liveNow,
      LiveStatus.ended => l10n.liveEnded,
      LiveStatus.upcoming =>
        live.joinUrl == null ? l10n.liveJoinSoon : l10n.liveStartsSoon,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          child: Column(
            children: [
              SettingsTile(
                icon: AppIcons.calendar,
                title: liveWhen(context, live),
                chevron: false,
              ),
              Divider(height: 1, color: p.divider),
              SettingsTile(icon: AppIcons.live, title: status, chevron: false),
              if (live.courseTitle.isNotEmpty) ...[
                Divider(height: 1, color: p.divider),
                SettingsTile(
                  icon: AppIcons.myCourses,
                  title: live.courseTitle,
                  onTap: () => context.push(Paths.course(live.courseId)),
                ),
              ],
            ],
          ),
        ),
        if (live.notes.trim().isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(live.notes, style: TextStyle(fontSize: 15, color: p.textBody)),
        ],
      ],
    );
  }
}

/// The student's live classes: coming up (soonest first), past, and 112.5
/// a month's calendar with the days that have one.
class LiveClassesScreen extends ConsumerStatefulWidget {
  const LiveClassesScreen({super.key});

  @override
  ConsumerState<LiveClassesScreen> createState() => _LiveClassesScreenState();
}

class _LiveClassesScreenState extends ConsumerState<LiveClassesScreen> {
  int _view = 0;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return AccountScaffold(
      title: l10n.liveClasses,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SegmentedTabs(
            labels: [l10n.liveUpcoming, l10n.livePast, l10n.liveCalendar],
            selected: _view,
            onChanged: (i) => setState(() => _view = i),
          ),
          const SizedBox(height: 12),
          if (_view == 2)
            const _LiveCalendar()
          else
            _LiveList(past: _view == 1),
        ],
      ),
    );
  }
}

class _LiveTiles extends StatelessWidget {
  const _LiveTiles({required this.items});

  final List<LiveSession> items;

  @override
  Widget build(BuildContext context) => AppCard(
    child: Column(
      children: [
        for (final (i, live) in items.indexed) ...[
          if (i > 0) Divider(height: 1, color: context.palette.divider),
          SettingsTile(
            key: ValueKey('live-${live.id}'),
            icon: AppIcons.live,
            title: live.title,
            subtitle: '${live.courseTitle} · ${liveWhen(context, live)}',
            value: live.status == LiveStatus.live ? context.l10n.liveNow : null,
            onTap: () => context.push(Paths.liveSession(live.id)),
          ),
        ],
      ],
    ),
  );
}

class _LiveList extends ConsumerWidget {
  const _LiveList({required this.past});

  final bool past;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return switch (ref.watch(myLiveSessionsProvider(past))) {
      AsyncData(:final value) when value.isEmpty => MessageView(
        icon: AppIcons.live,
        title: past ? l10n.liveNonePast : l10n.liveNone,
        compact: true,
      ),
      AsyncData(:final value) => _LiveTiles(items: value),
      AsyncError(:final error) => ErrorView(
        error: error,
        onRetry: () => ref.invalidate(myLiveSessionsProvider(past)),
      ),
      _ => const SkeletonList(
        layout: SkeletonLayout.text,
        count: 3,
        padding: EdgeInsets.zero,
      ),
    };
  }
}

/// 112.5 A month at a time: the days with a live class marked; a day's
/// classes under it (today's, or the first day with one, at first).
class _LiveCalendar extends ConsumerStatefulWidget {
  const _LiveCalendar();

  @override
  ConsumerState<_LiveCalendar> createState() => _LiveCalendarState();
}

class _LiveCalendarState extends ConsumerState<_LiveCalendar> {
  DateTime? _month;
  DateTime? _day;

  static DateTime _dayOf(DateTime t) {
    final local = t.toLocal();
    return DateTime(local.year, local.month, local.day);
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final coming = ref.watch(myLiveSessionsProvider(false));
    final past = ref.watch(myLiveSessionsProvider(true));
    final error = coming.error ?? past.error;
    if (error != null) {
      return ErrorView(
        error: error,
        onRetry: () => ref.invalidate(myLiveSessionsProvider),
      );
    }
    if (!coming.hasValue || !past.hasValue) {
      return const SkeletonList(
        layout: SkeletonLayout.text,
        count: 3,
        padding: EdgeInsets.zero,
      );
    }
    final all = [...past.value!, ...coming.value!];
    final byDay = <DateTime, List<LiveSession>>{};
    for (final live in all) {
      (byDay[_dayOf(live.startsAt)] ??= []).add(live);
    }
    for (final list in byDay.values) {
      list.sort((a, b) => a.startsAt.compareTo(b.startsAt));
    }
    final today = _dayOf(DateTime.now());
    final firstComing = coming.value!.isEmpty
        ? null
        : _dayOf(coming.value!.first.startsAt);
    final day = _day ?? firstComing ?? today;
    final month = _month ?? DateTime(day.year, day.month);
    final first = DateTime(month.year, month.month);
    final days = DateTime(month.year, month.month + 1, 0).day;
    // Weeks start on the language's first day (Sunday in Arabic, Monday in Turkish).
    final startIndex = MaterialLocalizations.of(context).firstDayOfWeekIndex;
    final lead = (first.weekday % 7 - startIndex) % 7;
    final cells = [
      for (var i = 0; i < lead; i++) null,
      for (var d = 1; d <= days; d++) DateTime(month.year, month.month, d),
    ];
    final weekdays = [
      for (var i = 0; i < 7; i++)
        // 2023-01-01 was a Sunday.
        chipWeekday(DateTime(2023, 1, 1 + (startIndex + i) % 7)),
    ];
    final chosen = byDay[day] ?? const <LiveSession>[];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          padding: const EdgeInsets.fromLTRB(8, 4, 8, 10),
          child: Column(
            children: [
              Row(
                children: [
                  IconButton(
                    key: const ValueKey('calendar-previous'),
                    tooltip: l10n.calendarPrevious,
                    onPressed: () => setState(
                      () => _month = DateTime(month.year, month.month - 1),
                    ),
                    icon: AppIcon(AppIcons.back, size: 22, color: p.text),
                  ),
                  Expanded(
                    child: Text(
                      monthLabel(month),
                      key: const ValueKey('calendar-month'),
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                  ),
                  IconButton(
                    key: const ValueKey('calendar-next'),
                    tooltip: l10n.calendarNext,
                    onPressed: () => setState(
                      () => _month = DateTime(month.year, month.month + 1),
                    ),
                    icon: AppIcon(AppIcons.forward, size: 22, color: p.text),
                  ),
                ],
              ),
              Row(
                children: [
                  for (final w in weekdays)
                    Expanded(
                      child: Text(
                        w,
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: p.textSecondary),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 4),
              GridView.count(
                crossAxisCount: 7,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.1,
                children: [
                  for (final cell in cells)
                    if (cell == null)
                      const SizedBox.shrink()
                    else
                      _DayCell(
                        day: cell,
                        selected: cell == day,
                        today: cell == today,
                        count: byDay[cell]?.length ?? 0,
                        onTap: () => setState(() => _day = cell),
                      ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Text(
          dayLabel(day),
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: p.text,
          ),
        ),
        const SizedBox(height: 8),
        if (chosen.isEmpty)
          Text(
            l10n.liveNoneThisDay,
            style: TextStyle(fontSize: 14, color: p.textSecondary),
          )
        else
          _LiveTiles(items: chosen),
      ],
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.selected,
    required this.today,
    required this.count,
    required this.onTap,
  });

  final DateTime day;
  final bool selected;
  final bool today;
  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      selected: selected,
      label: [
        dayLabel(day),
        if (count > 0) context.l10n.liveClassesCount(count),
      ].join(', '),
      excludeSemantics: true,
      child: InkWell(
        key: ValueKey('calendar-day-${day.day}'),
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            color: selected ? p.text : null,
            borderRadius: BorderRadius.circular(10),
            border: today && !selected ? Border.all(color: p.border) : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                '${day.day}',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: count > 0 ? FontWeight.w700 : FontWeight.w400,
                  color: selected ? p.surface : p.text,
                ),
              ),
              const SizedBox(height: 2),
              Container(
                width: 5,
                height: 5,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: count > 0
                      ? (selected ? p.surface : p.link)
                      : Colors.transparent,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
