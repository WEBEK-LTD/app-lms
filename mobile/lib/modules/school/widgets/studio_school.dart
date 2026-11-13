import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/palette.dart';
import '../../shared/pages/content_blocks.dart' show pageClockProvider;
import '../data/parent_providers.dart';
import '../data/school_providers.dart';

/// 128 The family's school day on a school's Studio page (`school`): the
/// greeting with today's date, the children to switch between and today's
/// card for the chosen child (in at the gate, the class now and next, the
/// bus home), drawn from the signed-in parent's own children (the Parent
/// tab's data). The element's background, corners and colours are its own;
/// a part with nothing to show isn't drawn, nor one signed out (but the
/// greeting, which says the element's own words then).

/// The parent's children, once read; empty for anyone else.
List<ParentChild> _children(WidgetRef ref) {
  if (ref.watch(isSchoolParentProvider) != true) return const [];
  return ref.watch(parentMeProvider).value?.children ?? const [];
}

/// The child the parent chose (shared with the Parent tab), else the first.
ParentChild? _chosen(WidgetRef ref) {
  final me = ref.watch(parentMeProvider).value;
  if (me == null || ref.watch(isSchoolParentProvider) != true) return null;
  return childOf(me, ref.watch(chosenStudentProvider));
}

ChildDay? _day(WidgetRef ref) {
  final child = _chosen(ref);
  return child == null ? null : ref.watch(childDayProvider(child.id)).value;
}

/// Whether the part has something to show this person.
bool studioSchoolShows(StudioSchoolSection section, WidgetRef ref) {
  if (section == StudioSchoolSection.greeting) return true;
  if (ref.watch(authControllerProvider) is! SignedIn) return false;
  return switch (section) {
    StudioSchoolSection.children => _children(ref).isNotEmpty,
    StudioSchoolSection.today => _day(ref) != null,
    StudioSchoolSection.greeting => true,
  };
}

String _first(String name) => name.trim().split(RegExp(r'\s+')).first;

/// A class's short name on a chip ("Grade 5 A": "5A"); else its name.
String _shortClass(String name) {
  final m = RegExp(r'(\d+)\s*(\S)$').firstMatch(name.trim());
  return m == null ? name : '${m.group(1)}${m.group(2)}';
}

/// The main colour softened behind an icon or initials: light by day, deep
/// by night.
Color _soft(BuildContext context, bool dark) {
  final p = context.palette;
  return dark
      ? Color.lerp(p.primary, const Color(0xFF09131F), 0.55)!
      : Color.lerp(p.primary, Colors.white, 0.86)!;
}

/// What sits on [_soft]: the main colour by day, a light one of it by night.
Color _onSoft(BuildContext context, bool dark) {
  final p = context.palette;
  return dark ? Color.lerp(p.primary, Colors.white, 0.6)! : p.primary;
}

class StudioSchoolPart extends ConsumerWidget {
  const StudioSchoolPart({
    super.key,
    required this.section,
    required this.color,
    required this.text,
    required this.dark,
  });

  final StudioSchoolSection section;

  /// The element's own text colour; null, the app's.
  final Color? color;

  /// The element's own words: the greeting's when signed out.
  final String? text;
  final bool dark;

  @override
  Widget build(BuildContext context, WidgetRef ref) => switch (section) {
    StudioSchoolSection.greeting => _Greeting(color: color, text: text),
    StudioSchoolSection.children => _Children(dark: dark),
    StudioSchoolSection.today => _Today(day: _day(ref)!, dark: dark),
  };
}

/// Today's date over "Good morning, Lina's family" (after noon "Good
/// evening"); a student's own name; signed out, the element's words.
class _Greeting extends ConsumerWidget {
  const _Greeting({required this.color, required this.text});

  final Color? color;
  final String? text;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final ink = color ?? p.text;
    final now = ref.watch(pageClockProvider)();
    final morning = now.hour < 12;
    final auth = ref.watch(authControllerProvider);
    final children = _children(ref);
    final own = auth is SignedIn ? _first(auth.user?.name ?? '') : '';
    final hello = children.isNotEmpty
        ? (morning
              ? l10n.studioSchoolMorning(_first(children.first.student.name))
              : l10n.studioSchoolEvening(_first(children.first.student.name)))
        : auth is SignedIn && own.isNotEmpty
        ? (morning
              ? l10n.studioGreetingMorning(own)
              : l10n.studioGreetingEvening(own))
        : (text ?? '');
    return Column(
      key: const ValueKey('studio-school-greeting'),
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          dayLabel(now),
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: Color.lerp(p.accent, Colors.white, 0.45),
          ),
        ),
        const SizedBox(height: 4),
        Semantics(
          header: true,
          child: Text(
            hello,
            style: TextStyle(
              fontSize: 28,
              height: 1.08,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
              color: ink,
            ),
          ),
        ),
      ],
    );
  }
}

/// The parent's children as chips: the chosen one filled in the main
/// colour, a tap chooses another (the Parent tab and the School's parts
/// follow it).
class _Children extends ConsumerWidget {
  const _Children({required this.dark});

  final bool dark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final children = _children(ref);
    final chosen = _chosen(ref)?.id;
    String initials(String name) => name
        .trim()
        .split(RegExp(r'\s+'))
        .take(2)
        .map((w) => w.characters.first.toUpperCase())
        .join();
    return SingleChildScrollView(
      key: const ValueKey('studio-school-children'),
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final (i, c) in children.indexed) ...[
            if (i > 0) const SizedBox(width: 8),
            Semantics(
              button: true,
              selected: c.id == chosen,
              child: InkWell(
                key: ValueKey('studio-school-child-${c.id}'),
                borderRadius: BorderRadius.circular(22),
                onTap: () =>
                    ref.read(chosenStudentProvider.notifier).choose(c.id),
                child: Container(
                  height: 44,
                  padding: const EdgeInsetsDirectional.fromSTEB(6, 0, 14, 0),
                  decoration: BoxDecoration(
                    color: c.id == chosen ? p.primary : p.surface,
                    borderRadius: BorderRadius.circular(22),
                    border: c.id == chosen ? null : Border.all(color: p.border),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: c.id == chosen
                              ? p.accent
                              : _soft(context, dark),
                        ),
                        child: Text(
                          initials(c.student.name),
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: c.id == chosen
                                ? p.onAccent
                                : _onSoft(context, dark),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        [
                          _first(c.student.name),
                          if (c.student.className case final k?) _shortClass(k),
                        ].join(' · '),
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: c.id == chosen
                              ? FontWeight.w800
                              : FontWeight.w700,
                          color: c.id == chosen ? p.onPrimary : p.text,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// `HH:MM` of [t].
String _hm(DateTime t) =>
    '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

/// Today's card: in at the gate, the class now and next, the bus home.
class _Today extends ConsumerWidget {
  const _Today({required this.day, required this.dark});

  final ChildDay day;
  final bool dark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final p = context.palette;
    final now = _hm(ref.watch(pageClockProvider)());
    final name = _first(day.student.name);
    final ok = dark ? const Color(0xFF74D6A0) : const Color(0xFF1F7A4D);
    final okSoft = dark ? const Color(0xFF12392A) : const Color(0xFFE3F2E9);
    final warn = dark ? const Color(0xFFF4B860) : const Color(0xFF8A5300);
    final warnSoft = dark ? const Color(0xFF3E2D0F) : const Color(0xFFFBEBD0);
    final rows = <Widget>[];

    if (day.dayOff case final off?) {
      rows.add(
        _Row(
          icon: Symbols.event_busy_rounded,
          tile: _soft(context, dark),
          ink: _onSoft(context, dark),
          title: l10n.studioSchoolDayOff,
          line: off,
        ),
      );
    } else {
      // In at the gate.
      final c = day.checkin;
      if (c != null) {
        final away = {
          CheckinState.absent,
          CheckinState.excused,
          CheckinState.leave,
        }.contains(c.state);
        rows.add(
          _Row(
            icon: Symbols.how_to_reg_rounded,
            filled: c.isIn,
            tile: c.isIn ? okSoft : warnSoft,
            ink: c.isIn ? ok : warn,
            title: away
                ? l10n.studioSchoolAway(name)
                : c.isOut
                ? l10n.studioSchoolLeft(name, c.outTime!)
                : c.isIn
                ? l10n.studioSchoolCheckedIn(name, c.inTime!)
                : l10n.studioSchoolNotYet(name),
            line: c.isIn
                ? (c.late ? l10n.studioSchoolLate : l10n.studioSchoolOnTime)
                : null,
          ),
        );
      }
      // The class now and next.
      final lessons = [...day.lessons]
        ..sort((a, b) => a.starts.compareTo(b.starts));
      if (lessons.isNotEmpty) {
        final current = lessons
            .where(
              (l) => l.starts.compareTo(now) <= 0 && l.ends.compareTo(now) > 0,
            )
            .firstOrNull;
        final next = lessons
            .where((l) => l.starts.compareTo(now) > 0)
            .firstOrNull;
        final teacher = current?.teacherName;
        final (title, line) = current != null
            ? (
                teacher == null || teacher.isEmpty
                    ? l10n.studioSchoolNowAlone(current.subject)
                    : l10n.studioSchoolNow(current.subject, teacher),
                next != null
                    ? l10n.studioSchoolNext(next.subject, next.starts)
                    : l10n.studioSchoolLastLesson,
              )
            : next != null
            ? (
                l10n.studioSchoolFirst(next.subject, next.starts),
                next.teacherName,
              )
            : (
                l10n.studioSchoolLessonsOver,
                l10n.studioSchoolLessonsEnded(lessons.last.ends),
              );
        rows.add(
          _Row(
            icon: Symbols.menu_book_rounded,
            tile: _soft(context, dark),
            ink: _onSoft(context, dark),
            title: title,
            line: line,
          ),
        );
      }
      // The bus: on its way, else the bus home.
      final running = day.bus
          .where((b) => b.run?.status == BusRunStatus.running)
          .firstOrNull;
      final home = day.bus
          .where((b) => b.trip == BusTrip.afternoon)
          .firstOrNull;
      final bus = running ?? home;
      if (bus != null) {
        final leaves = bus.stops.firstOrNull?.time ?? bus.stop.time;
        final title = running != null && running.run?.etaMinutes != null
            ? l10n.studioSchoolBusComing('${running.run!.etaMinutes}')
            : leaves != null
            ? l10n.studioSchoolBusLeaves(leaves)
            : null;
        if (title != null) {
          rows.add(
            _Row(
              icon: Symbols.directions_bus_rounded,
              tile: warnSoft,
              ink: warn,
              title: title,
              line: bus.routeName.isEmpty
                  ? bus.stop.name
                  : l10n.studioSchoolBusRoute(bus.routeName, bus.stop.name),
            ),
          );
        }
      }
    }
    return Padding(
      key: const ValueKey('studio-school-today'),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final (i, row) in rows.indexed) ...[
            if (i > 0)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Divider(height: 1, thickness: 1, color: p.border),
              ),
            row,
          ],
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.icon,
    required this.tile,
    required this.ink,
    required this.title,
    this.line,
    this.filled = false,
  });

  final IconData icon;
  final Color tile;
  final Color ink;
  final String title;
  final String? line;
  final bool filled;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return MergeSemantics(
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: tile,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 22, color: ink, fill: filled ? 1 : 0),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                if (line != null && line!.isNotEmpty)
                  Text(
                    line!,
                    style: TextStyle(fontSize: 12, color: p.textSecondary),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
