import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/format/bidi.dart';
import '../../../core/format/dates.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../events/data/events_providers.dart' show shareCalendarFileProvider;
import '../../lms/teachers/teacher_widgets.dart' show LabeledField;
import '../data/school_life_providers.dart';
import '../data/school_providers.dart';
import '../widgets/school_widgets.dart';
import '../../../core/widgets/studio_screen_scope.dart';

/// 113.8 The school's calendar (a month, or a list of what is coming), the
/// exams' timetable and the behaviour record, for a student and each child
/// of a parent; for teachers the calendar and the exams of their classes,
/// and each class's behaviour, where they write merits and notes. Events
/// and exams go to the phone's calendar as an `.ics` file, as an event's do.

/// A page of the school for the student [student] (a notification's) or the
/// one chosen; the teacher's own ([classroom]) without choosing.
class _Page extends StatelessWidget {
  const _Page({
    required this.title,
    required this.student,
    required this.classroom,
    required this.builder,
  });

  final String title;
  final int? student;
  final bool classroom;
  final Widget Function(BuildContext context, int? studentId) builder;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: studioBar(
      context,
      AppBar(leading: appBarBack(context), title: Text(title)),
    ),
    body: SafeArea(
      top: false,
      child: classroom
          ? builder(context, null)
          : StudentGate(
              wanted: student,
              builder: (context, me, s) => builder(context, s.id),
            ),
    ),
  );
}

// The phone's calendar

/// An `.ics` of a day (or days) of the school's calendar: all day, or from
/// [starts] to [ends] on its first day, in the phone's time.
String schoolIcs({
  required String uid,
  required String title,
  required String startsOn,
  required String endsOn,
  required String host,
  String? starts,
  String? ends,
  String? place,
  String? notes,
}) {
  String text(String value) => value
      .replaceAll(r'\', r'\\')
      .replaceAll(';', r'\;')
      .replaceAll(',', r'\,')
      .replaceAll(RegExp(r'\r?\n'), r'\n');
  String day(String iso) => iso.replaceAll('-', '');
  String two(int n) => n.toString().padLeft(2, '0');
  final now = DateTime.now().toUtc();
  final stamp =
      '${now.year}${two(now.month)}${two(now.day)}T${two(now.hour)}${two(now.minute)}${two(now.second)}Z';
  final last = parseIsoDate(endsOn) ?? parseIsoDate(startsOn)!;
  final dates = starts == null
      ? [
          'DTSTART;VALUE=DATE:${day(startsOn)}',
          'DTEND;VALUE=DATE:${day(isoDate(addDays(last, 1)))}',
        ]
      : [
          'DTSTART:${day(startsOn)}T${starts.replaceAll(':', '')}00',
          'DTEND:${day(startsOn)}T${(ends ?? starts).replaceAll(':', '')}00',
        ];
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Yallapp//School//EN',
    'BEGIN:VEVENT',
    'UID:$uid@$host',
    'DTSTAMP:$stamp',
    ...dates,
    'SUMMARY:${text(title)}',
    if (place != null && place.trim().isNotEmpty) 'LOCATION:${text(place)}',
    if (notes != null && notes.trim().isNotEmpty) 'DESCRIPTION:${text(notes)}',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

/// The button that hands an `.ics` to the phone's calendar.
class _AddToPhone extends ConsumerWidget {
  const _AddToPhone({required this.name, required this.ics});

  final String name;
  final String Function(String host) ics;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    return IconButton(
      key: ValueKey('calendar-add-$name'),
      tooltip: context.l10n.eventAddToCalendar,
      icon: AppIcon(AppIcons.calendarAdd, size: 22, color: p.text),
      onPressed: () async {
        final site = ref.read(appConfigProvider).site;
        final host = Uri.tryParse(site.url)?.host ?? '';
        await ref.read(shareCalendarFileProvider)(
          '$name.ics',
          ics(host.isEmpty ? 'yallapp.com.tr' : host),
        );
      },
    );
  }
}

// The calendar

class SchoolCalendarScreen extends StatelessWidget {
  const SchoolCalendarScreen({super.key, this.student, this.classroom = false});

  final int? student;

  /// A teacher's own calendar (the Classroom tab).
  final bool classroom;

  @override
  Widget build(BuildContext context) => _Page(
    title: context.l10n.schoolCalendar,
    student: student,
    classroom: classroom,
    builder: (context, id) => _Calendar(studentId: id),
  );
}

/// A day or an exam on the calendar, as the screens list it.
class _Item {
  const _Item({
    required this.key,
    required this.title,
    required this.startsOn,
    required this.endsOn,
    required this.pill,
    required this.tone,
    this.starts,
    this.ends,
    this.details = const [],
    this.notes,
    this.place,
  });

  factory _Item.event(BuildContext context, SchoolEvent e) {
    final l10n = context.l10n;
    return _Item(
      key: 'event-${e.id}',
      title: e.title,
      startsOn: e.startsOn,
      endsOn: e.endsOn,
      starts: e.allDay ? null : e.starts,
      ends: e.allDay ? null : e.ends,
      pill: switch (e.kind) {
        SchoolEventKind.holiday => l10n.calendarDayOff,
        SchoolEventKind.exam => l10n.calendarExamDays,
        SchoolEventKind.event =>
          e.audience == 'staff' ? l10n.calendarStaffOnly : null,
      },
      tone: e.kind == SchoolEventKind.holiday
          ? PillTone.warn
          : PillTone.neutral,
      details: [?e.place, ?e.forName],
      place: e.place,
      notes: e.notes,
    );
  }

  factory _Item.exam(BuildContext context, SchoolExam x) => _Item(
    key: 'exam-${x.id}',
    title: x.subject,
    startsOn: x.date,
    endsOn: x.date,
    starts: x.starts,
    ends: x.ends,
    pill: context.l10n.calendarExam,
    tone: PillTone.bad,
    details: [
      if (x.room case final room?) context.l10n.schoolRoom(isolate(room)),
      ?x.forName,
    ],
    place: x.room == null ? null : context.l10n.schoolRoom(x.room!),
    notes: x.notes,
  );

  final String key;
  final String title;
  final String startsOn;
  final String endsOn;
  final String? starts;
  final String? ends;
  final String? pill;
  final PillTone tone;
  final List<String> details;
  final String? notes;
  final String? place;

  bool on(String day) =>
      startsOn.compareTo(day) <= 0 && endsOn.compareTo(day) >= 0;
}

List<_Item> _itemsOf(BuildContext context, SchoolCalendar calendar) {
  final items = [
    for (final e in calendar.events) _Item.event(context, e),
    for (final x in calendar.exams) _Item.exam(context, x),
  ];
  items.sort((a, b) {
    final day = a.startsOn.compareTo(b.startsOn);
    return day != 0 ? day : (a.starts ?? '').compareTo(b.starts ?? '');
  });
  return items;
}

class _Calendar extends ConsumerStatefulWidget {
  const _Calendar({required this.studentId});

  final int? studentId;

  @override
  ConsumerState<_Calendar> createState() => _CalendarState();
}

class _CalendarState extends ConsumerState<_Calendar> {
  int _view = 0;
  DateTime? _month;
  DateTime? _day;

  static DateTime _today() {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final today = _today();
    final month = _month ?? DateTime(today.year, today.month);
    final query = _view == 0
        ? (
            from: isoDate(DateTime(month.year, month.month)),
            to: isoDate(DateTime(month.year, month.month + 1, 0)),
            student: widget.studentId,
          )
        : (
            from: isoDate(today),
            to: isoDate(addDays(today, 90)),
            student: widget.studentId,
          );
    final async = ref.watch(schoolCalendarProvider(query));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
          child: SegmentedTabs(
            labels: [l10n.calendarMonth, l10n.calendarList],
            selected: _view,
            onChanged: (i) => setState(() => _view = i),
          ),
        ),
        Expanded(
          child: switch (async) {
            AsyncValue(value: final calendar?) => RefreshIndicator(
              onRefresh: () async =>
                  ref.invalidate(schoolCalendarProvider(query)),
              child: ListView(
                key: ValueKey(_view == 0 ? 'calendar-grid' : 'calendar-list'),
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
                children: _view == 0
                    ? _monthView(context, calendar, month, today)
                    : _listView(context, calendar),
              ),
            ),
            AsyncValue(error: final e?) => ErrorView(
              error: e,
              onRetry: () => ref.invalidate(schoolCalendarProvider(query)),
            ),
            _ => const SkeletonList(layout: SkeletonLayout.text, count: 3),
          },
        ),
      ],
    );
  }

  List<Widget> _monthView(
    BuildContext context,
    SchoolCalendar calendar,
    DateTime month,
    DateTime today,
  ) {
    final p = context.palette;
    final l10n = context.l10n;
    final items = _itemsOf(context, calendar);
    final first = DateTime(month.year, month.month);
    final days = DateTime(month.year, month.month + 1, 0).day;
    final inMonth = _day != null && _day!.month == month.month
        ? _day!
        : (today.month == month.month && today.year == month.year
              ? today
              : first);
    // Weeks start on the language's first day (Sunday in Arabic, Monday in Turkish).
    final startIndex = MaterialLocalizations.of(context).firstDayOfWeekIndex;
    final lead = (first.weekday % 7 - startIndex) % 7;
    final cells = [
      for (var i = 0; i < lead; i++) null,
      for (var d = 1; d <= days; d++) DateTime(month.year, month.month, d),
    ];
    final chosen = items.where((i) => i.on(isoDate(inMonth))).toList();
    return [
      AppCard(
        padding: const EdgeInsets.fromLTRB(8, 4, 8, 10),
        child: Column(
          children: [
            Row(
              children: [
                IconButton(
                  key: const ValueKey('calendar-previous'),
                  tooltip: l10n.calendarPrevious,
                  onPressed: () => setState(() {
                    _month = DateTime(month.year, month.month - 1);
                    _day = null;
                  }),
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
                  onPressed: () => setState(() {
                    _month = DateTime(month.year, month.month + 1);
                    _day = null;
                  }),
                  icon: AppIcon(AppIcons.forward, size: 22, color: p.text),
                ),
              ],
            ),
            Row(
              children: [
                for (var i = 0; i < 7; i++)
                  Expanded(
                    child: Text(
                      // 2023-01-01 was a Sunday.
                      chipWeekday(DateTime(2023, 1, 1 + (startIndex + i) % 7)),
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
                      selected: cell == inMonth,
                      today: cell == today,
                      items: items.where((i) => i.on(isoDate(cell))).toList(),
                      onTap: () => setState(() => _day = cell),
                    ),
              ],
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      Text(
        dayLabel(inMonth),
        style: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w700,
          color: p.text,
        ),
      ),
      const SizedBox(height: 8),
      if (chosen.isEmpty)
        Text(
          l10n.calendarNothingThisDay,
          key: const ValueKey('calendar-day-empty'),
          style: TextStyle(fontSize: 14, color: p.textSecondary),
        )
      else
        for (final item in chosen) ...[
          _ItemCard(item: item),
          const SizedBox(height: 8),
        ],
    ];
  }

  List<Widget> _listView(BuildContext context, SchoolCalendar calendar) {
    final items = _itemsOf(context, calendar);
    if (items.isEmpty) {
      return [
        const SizedBox(height: 24),
        MessageView(
          icon: AppIcons.event,
          title: context.l10n.calendarNothingAhead,
          compact: true,
        ),
      ];
    }
    final out = <Widget>[];
    String? last;
    for (final item in items) {
      if (item.startsOn != last) {
        last = item.startsOn;
        out.add(
          Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 6),
            child: Text(
              isoDayLabel(item.startsOn),
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: context.palette.text,
              ),
            ),
          ),
        );
      }
      out
        ..add(_ItemCard(item: item))
        ..add(const SizedBox(height: 8));
    }
    return out;
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.selected,
    required this.today,
    required this.items,
    required this.onTap,
  });

  final DateTime day;
  final bool selected;
  final bool today;
  final List<_Item> items;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final off = items.any((i) => i.tone == PillTone.warn);
    return Semantics(
      button: true,
      selected: selected,
      label: [
        dayLabel(day),
        if (items.isNotEmpty) context.l10n.calendarItems(items.length),
      ].join(', '),
      excludeSemantics: true,
      child: InkWell(
        key: ValueKey('calendar-day-${day.day}'),
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          margin: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            color: selected ? p.text : (off ? p.accentSoft : null),
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
                  fontWeight: items.isNotEmpty
                      ? FontWeight.w700
                      : FontWeight.w400,
                  color: selected ? p.surface : p.text,
                ),
              ),
              const SizedBox(height: 2),
              Container(
                width: 5,
                height: 5,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: items.isEmpty
                      ? Colors.transparent
                      : (selected ? p.surface : p.primary),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// An event or an exam: what, when and where, with Add to calendar.
class _ItemCard extends StatelessWidget {
  const _ItemCard({required this.item});

  final _Item item;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final when = [
      if (item.endsOn != item.startsOn)
        l10n.calendarDays(isoDayLabel(item.startsOn), isoDayLabel(item.endsOn)),
      if (item.starts == null)
        l10n.calendarAllDay
      else
        item.ends == null ? item.starts! : '${item.starts}–${item.ends}',
    ];
    return AppCard(
      key: ValueKey('calendar-${item.key}'),
      padding: const EdgeInsets.fromLTRB(14, 10, 4, 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        item.title,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ),
                    if (item.pill case final pill?) ...[
                      const SizedBox(width: 8),
                      SchoolPill(label: pill, tone: item.tone),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  [...when, ...item.details.map(isolate)].join(' · '),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                if (item.notes case final notes?) ...[
                  const SizedBox(height: 4),
                  Text(notes, style: TextStyle(fontSize: 14, color: p.text)),
                ],
              ],
            ),
          ),
          _AddToPhone(
            name: item.key,
            ics: (host) => schoolIcs(
              uid: 'school-${item.key}',
              title: item.title,
              startsOn: item.startsOn,
              endsOn: item.endsOn,
              starts: item.starts,
              ends: item.ends,
              place: item.place,
              notes: item.notes,
              host: host,
            ),
          ),
        ],
      ),
    );
  }
}

// The exams' timetable

class SchoolExamsScreen extends StatefulWidget {
  const SchoolExamsScreen({super.key, this.student, this.classroom = false});

  final int? student;

  /// The teacher's classes' exams (the Classroom tab).
  final bool classroom;

  @override
  State<SchoolExamsScreen> createState() => _SchoolExamsScreenState();
}

class _SchoolExamsScreenState extends State<SchoolExamsScreen> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) => _Page(
    title: context.l10n.schoolExams,
    student: widget.student,
    classroom: widget.classroom,
    builder: (context, id) => Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
          child: SegmentedTabs(
            labels: [context.l10n.examsComing, context.l10n.examsDone],
            selected: _tab,
            onChanged: (i) => setState(() => _tab = i),
          ),
        ),
        Expanded(
          child: _Exams(studentId: id, past: _tab == 1),
        ),
      ],
    ),
  );
}

class _Exams extends ConsumerWidget {
  const _Exams({required this.studentId, required this.past});

  final int? studentId;
  final bool past;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    return switch (ref.watch(schoolExamsProvider(studentId))) {
      AsyncValue(value: final lists?) => switch (past
          ? lists.past
          : lists.upcoming) {
        final exams when exams.isEmpty => MessageView(
          key: const ValueKey('exams-empty'),
          icon: AppIcons.quiz,
          title: l10n.examsNone,
          message: l10n.examsNoneMessage,
        ),
        final exams => RefreshIndicator(
          onRefresh: () async => ref.invalidate(schoolExamsProvider(studentId)),
          child: ListView(
            key: const ValueKey('school-exams'),
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            children: [
              for (final exam in exams) ...[
                _ExamCard(exam: exam),
                const SizedBox(height: 10),
              ],
            ],
          ),
        ),
      },
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(schoolExamsProvider(studentId)),
      ),
      _ => const SkeletonList(layout: SkeletonLayout.text, count: 3),
    };
  }
}

class _ExamCard extends StatelessWidget {
  const _ExamCard({required this.exam});

  final SchoolExam exam;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return AppCard(
      key: ValueKey('exam-${exam.id}'),
      padding: const EdgeInsets.fromLTRB(14, 12, 4, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  exam.subject,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  isoDayLabel(exam.date),
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: p.text,
                  ),
                ),
                Text(
                  [
                    l10n.examTime(exam.starts, exam.ends, exam.durationMinutes),
                    if (exam.room case final room?)
                      l10n.schoolRoom(isolate(room)),
                    if (exam.forName case final name?) isolate(name),
                  ].join(' · '),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                if (exam.notes case final notes?) ...[
                  const SizedBox(height: 6),
                  Text(notes, style: TextStyle(fontSize: 14, color: p.text)),
                ],
              ],
            ),
          ),
          _AddToPhone(
            name: 'exam-${exam.id}',
            ics: (host) => schoolIcs(
              uid: 'school-exam-${exam.id}',
              title: '${l10n.calendarExam}: ${exam.subject}',
              startsOn: exam.date,
              endsOn: exam.date,
              starts: exam.starts,
              ends: exam.ends,
              place: exam.room == null ? null : l10n.schoolRoom(exam.room!),
              notes: exam.notes,
              host: host,
            ),
          ),
        ],
      ),
    );
  }
}

// Behaviour

/// "+2", "-1", "0".
String signedPoints(int points) => points > 0 ? '+$points' : '$points';

class BehaviourScreen extends StatelessWidget {
  const BehaviourScreen({super.key, this.student});

  final int? student;

  @override
  Widget build(BuildContext context) => _Page(
    title: context.l10n.schoolBehaviour,
    student: student,
    classroom: false,
    builder: (context, id) => _Behaviour(studentId: id!),
  );
}

class _Totals extends StatelessWidget {
  const _Totals({required this.totals});

  final BehaviourTotals totals;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final cells = [
      ('points', signedPoints(totals.points), l10n.behaviourPoints),
      ('merits', '${totals.positiveCount}', l10n.behaviourMerits),
      ('notes', '${totals.negativeCount}', l10n.behaviourNotes),
    ];
    return Row(
      children: [
        for (final (i, (id, value, label)) in cells.indexed) ...[
          if (i > 0) const SizedBox(width: 8),
          Expanded(
            child: AppCard(
              key: ValueKey('behaviour-$id'),
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  Text(
                    value,
                    textDirection: TextDirection.ltr,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                  Text(
                    label,
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _Behaviour extends ConsumerWidget {
  const _Behaviour({required this.studentId});

  final int studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    return switch (ref.watch(studentBehaviourProvider(studentId))) {
      AsyncValue(value: final record?) => RefreshIndicator(
        onRefresh: () async =>
            ref.invalidate(studentBehaviourProvider(studentId)),
        child: ListView(
          key: const ValueKey('school-behaviour'),
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            _Totals(totals: record.totals),
            const SizedBox(height: 16),
            if (record.items.isEmpty)
              Text(
                l10n.behaviourNone,
                style: TextStyle(fontSize: 14, color: p.textSecondary),
              )
            else
              for (final note in record.items) ...[
                _NoteCard(note: note),
                const SizedBox(height: 8),
              ],
          ],
        ),
      ),
      AsyncValue(error: final e?) => ErrorView(
        error: e,
        onRetry: () => ref.invalidate(studentBehaviourProvider(studentId)),
      ),
      _ => const LoadingView(),
    };
  }
}

/// A merit or a note: its category and points, who wrote it and when.
class _NoteCard extends StatelessWidget {
  const _NoteCard({required this.note, this.showStudent = false, this.action});

  final BehaviourNote note;
  final bool showStudent;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final positive = note.kind == BehaviourKind.positive;
    return AppCard(
      key: ValueKey('behaviour-note-${note.id}'),
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          AppIcon(
            positive ? AppIcons.star : AppIcons.warning,
            size: 22,
            color: positive ? p.success : p.danger,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  showStudent
                      ? '${note.studentName} · ${note.category}'
                      : note.category,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
                Text(
                  [
                    note.teacherName ?? l10n.behaviourFromSchool,
                    shortDate(note.createdAt),
                  ].map(isolate).join(' · '),
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
                if (note.note case final text?) ...[
                  const SizedBox(height: 4),
                  Text(text, style: TextStyle(fontSize: 14, color: p.text)),
                ],
                ?action,
              ],
            ),
          ),
          SchoolPill(
            label: l10n.behaviourPointsValue(signedPoints(note.points)),
            tone: positive ? PillTone.good : PillTone.bad,
          ),
        ],
      ),
    );
  }
}

/// A class's behaviour for its teachers: each student's points (tap one to
/// write a merit or a note) and the latest ones, the teacher's own taken
/// back on the day.
class ClassBehaviourScreen extends ConsumerWidget {
  const ClassBehaviourScreen({super.key, required this.classId});

  final int classId;

  Future<void> _write(
    BuildContext context,
    WidgetRef ref,
    SchoolStudent student,
  ) async {
    final done = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => _WriteSheet(student: student),
    );
    if (done == true) ref.invalidate(classBehaviourProvider(classId));
  }

  Future<void> _takeBack(
    BuildContext context,
    WidgetRef ref,
    BehaviourNote note,
  ) async {
    final l10n = context.l10n;
    try {
      await ref.read(yallappApiProvider).deleteBehaviour(note.id);
      ref.invalidate(classBehaviourProvider(classId));
      if (context.mounted) showMessage(context, l10n.behaviourTakenBack);
    } on ApiException catch (e) {
      if (context.mounted) showMessage(context, e.message);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final async = ref.watch(classBehaviourProvider(classId));
    final me = ref.watch(classroomMeProvider).value?.name;
    return Scaffold(
      appBar: studioBar(
        context,
        AppBar(
          leading: appBarBack(context),
          title: Text(
            async.value == null
                ? l10n.schoolBehaviour
                : '${l10n.schoolBehaviour} · ${async.value!.className}',
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        child: switch (async) {
          AsyncValue(value: final klass?) when klass.students.isEmpty =>
            MessageView(icon: AppIcons.staff, title: l10n.classroomNoStudents),
          AsyncValue(value: final klass?) => RefreshIndicator(
            onRefresh: () async =>
                ref.invalidate(classBehaviourProvider(classId)),
            child: ListView(
              key: const ValueKey('class-behaviour'),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                AppCard(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 4,
                  ),
                  child: Column(
                    children: [
                      for (final row in klass.students)
                        ListTile(
                          key: ValueKey('behaviour-student-${row.student.id}'),
                          contentPadding: EdgeInsets.zero,
                          leading: InitialsAvatar(
                            name: row.student.name,
                            imageUrl: row.student.photoUrl,
                            size: 36,
                          ),
                          title: Text(row.student.name),
                          subtitle: Text(
                            '${l10n.behaviourMerits}: ${row.totals.positiveCount} · ${l10n.behaviourNotes}: ${row.totals.negativeCount}',
                          ),
                          trailing: SchoolPill(
                            label: l10n.behaviourPointsValue(
                              signedPoints(row.totals.points),
                            ),
                            tone: row.totals.points < 0
                                ? PillTone.bad
                                : PillTone.good,
                          ),
                          onTap: () => _write(context, ref, row.student),
                        ),
                    ],
                  ),
                ),
                if (klass.recent.isNotEmpty) ...[
                  const SizedBox(height: 20),
                  SectionHeader(title: l10n.behaviourLatest, size: 16),
                  const SizedBox(height: 4),
                  for (final note in klass.recent) ...[
                    _NoteCard(
                      note: note,
                      showStudent: true,
                      action:
                          me != null &&
                              note.teacherName == me &&
                              DateTime.now()
                                      .difference(note.createdAt)
                                      .inHours <
                                  24
                          ? Align(
                              alignment: AlignmentDirectional.centerStart,
                              child: TextButton(
                                key: ValueKey('behaviour-take-back-${note.id}'),
                                onPressed: () => _takeBack(context, ref, note),
                                child: Text(l10n.behaviourTakeBack),
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(height: 8),
                  ],
                ],
                const SizedBox(height: 8),
                Text(
                  l10n.behaviourWrite,
                  style: TextStyle(fontSize: 13, color: p.textSecondary),
                ),
              ],
            ),
          ),
          AsyncValue(error: final e?) => ErrorView(
            error: e,
            onRetry: () => ref.invalidate(classBehaviourProvider(classId)),
          ),
          _ => const LoadingView(),
        },
      ),
    );
  }
}

class _WriteSheet extends ConsumerStatefulWidget {
  const _WriteSheet({required this.student});

  final SchoolStudent student;

  @override
  ConsumerState<_WriteSheet> createState() => _WriteSheetState();
}

class _WriteSheetState extends ConsumerState<_WriteSheet> {
  final _note = TextEditingController();
  int? _category;
  bool _saving = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = context.l10n;
    final category = _category;
    if (category == null) {
      showMessage(context, l10n.behaviourChooseCategory);
      return;
    }
    setState(() => _saving = true);
    try {
      await ref
          .read(yallappApiProvider)
          .writeBehaviour(
            studentId: widget.student.id,
            categoryId: category,
            note: _note.text,
          );
      if (!mounted) return;
      showMessage(context, l10n.behaviourSaved);
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.behaviourWrite,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text(
                l10n.behaviourFor(widget.student.name),
                style: TextStyle(fontSize: 13, color: p.textSecondary),
              ),
              const SizedBox(height: 12),
              Text(
                l10n.behaviourCategory,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: p.text,
                ),
              ),
              const SizedBox(height: 6),
              switch (ref.watch(behaviourCategoriesProvider)) {
                AsyncValue(value: final list?) when list.isEmpty => Text(
                  l10n.behaviourNoCategories,
                  style: TextStyle(fontSize: 14, color: p.textSecondary),
                ),
                AsyncValue(value: final list?) => Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final c in list)
                      PillChip(
                        key: ValueKey('behaviour-category-${c.id}'),
                        label: '${c.name} (${signedPoints(c.points)})',
                        selected: _category == c.id,
                        onTap: () => setState(() => _category = c.id),
                      ),
                  ],
                ),
                AsyncValue(error: final e?) => ErrorView(
                  error: e,
                  onRetry: () => ref.invalidate(behaviourCategoriesProvider),
                ),
                _ => const SizedBox(
                  height: 40,
                  child: Center(child: CircularProgressIndicator()),
                ),
              },
              const SizedBox(height: 12),
              LabeledField(
                key: const ValueKey('behaviour-note'),
                label: l10n.behaviourNoteHint,
                controller: _note,
                lines: 3,
                maxLength: 500,
              ),
              const SizedBox(height: 16),
              PrimaryButton(
                key: const ValueKey('behaviour-save'),
                label: l10n.save,
                loading: _saving,
                height: 52,
                onPressed: _save,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
