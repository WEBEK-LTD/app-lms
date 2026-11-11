import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart' show MyCoursesStatus;
import '../../../core/auth/auth_controller.dart';
import '../../../core/format/dates.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/palette.dart';
import '../coursework/coursework_providers.dart';
import '../data/lms_providers.dart';
import '../learning/learning_providers.dart';
import '../navigation.dart';
import '../../shared/pages/content_blocks.dart' show pageClockProvider;

/// 123 The student's own cards on an academy's Studio page (`learning`):
/// the course they are taking, their streak, their next live class. Each is
/// drawn from the signed-in student's learning, on the element's own
/// colours (its gradient, background and corners are the element's); none
/// shows signed out, or while there is nothing to show.

const _gold = Color(0xFFB8893A);
const _goldLight = Color(0xFFE7C982);
const _darkGold = Color(0xFFE2BE74);

/// The course the student is taking: the first of their courses in progress.
MyCourse? _taking(WidgetRef ref) {
  final state = ref.watch(myCoursesProvider(MyCoursesStatus.inProgress));
  for (final c in state.items) {
    if (!c.progress.courseCompleted) return c;
  }
  return null;
}

/// The student's next live class (or the one going on).
LiveSession? _nextLive(WidgetRef ref) {
  final list = ref.watch(myLiveSessionsProvider(false)).value ?? const [];
  final now = ref.watch(pageClockProvider)();
  final coming = [
    for (final s in list)
      if (s.endsAt.isAfter(now)) s,
  ]..sort((a, b) => a.startsAt.compareTo(b.startsAt));
  return coming.isEmpty ? null : coming.first;
}

/// Whether the card has something to show this student.
bool learningCardShows(StudioLearningSection section, WidgetRef ref) {
  if (ref.watch(authControllerProvider) is! SignedIn) return false;
  final features = ref.watch(appConfigProvider).features;
  return switch (section) {
    StudioLearningSection.continueCourse => _taking(ref) != null,
    StudioLearningSection.streak =>
      features.gamification &&
          (ref.watch(achievementsProvider).value?.streakDays ?? 0) > 0,
    StudioLearningSection.live =>
      features.liveClasses && _nextLive(ref) != null,
    // The week's learning time comes with the time the app records.
    StudioLearningSection.week => false,
  };
}

class StudioLearningCard extends ConsumerWidget {
  const StudioLearningCard({
    super.key,
    required this.section,
    required this.color,
    required this.title,
    required this.dark,
  });

  final StudioLearningSection section;

  /// The element's own text colour; null, the card's.
  final Color? color;

  /// The element's own title; null, the app's words.
  final String? title;
  final bool dark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return switch (section) {
      StudioLearningSection.continueCourse => _Continue(
        course: _taking(ref)!,
        color: color,
      ),
      StudioLearningSection.streak => _Streak(
        days: ref.watch(achievementsProvider).value?.streakDays ?? 0,
        now: ref.watch(pageClockProvider)(),
        color: color,
        title: title,
        dark: dark,
      ),
      StudioLearningSection.live => _Live(
        live: _nextLive(ref)!,
        now: ref.watch(pageClockProvider)(),
        color: color,
        title: title,
      ),
      StudioLearningSection.week => const SizedBox.shrink(),
    };
  }
}

class _Tag extends StatelessWidget {
  const _Tag({required this.text, this.icon});

  final String text;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
    decoration: BoxDecoration(
      color: const Color(0x2EFFFFFF),
      borderRadius: BorderRadius.circular(9),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[
          Icon(icon, size: 14, color: Colors.white),
          const SizedBox(width: 3),
        ],
        Flexible(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
        ),
      ],
    ),
  );
}

/// The course they are taking, on the element's gradient or picture.
class _Continue extends StatelessWidget {
  const _Continue({required this.course, required this.color});

  final MyCourse course;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final ink = color ?? Colors.white;
    final next = course.nextItem;
    final progress = course.progress;
    final current = (progress.completedItems + 1).clamp(
      1,
      progress.totalItems < 1 ? 1 : progress.totalItems,
    );
    final teacher = course.course.instructor?.name;
    final line = [?teacher, ?next?.title].join(' · ');
    return Semantics(
      button: true,
      label: course.course.title,
      child: InkWell(
        key: const ValueKey('learning-continue'),
        onTap: () => continueCourse(context, course),
        child: SizedBox(
          height: 206,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    // The lesson they're on takes the room the minutes leave.
                    Expanded(
                      child: Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: _Tag(
                          text: l10n.learningLessonOf(
                            current,
                            progress.totalItems,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (next?.durationMinutes case final minutes?)
                      _Tag(
                        icon: Symbols.schedule_rounded,
                        text: l10n.learningMinutesLeft(minutes),
                      ),
                  ],
                ),
                const Spacer(),
                Text(
                  course.course.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    height: 1.3,
                    color: ink,
                  ),
                ),
                if (line.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    line,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 13,
                      color: ink.withValues(alpha: 0.85),
                    ),
                  ),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: Container(
                          height: 6,
                          color: const Color(0x40FFFFFF),
                          alignment: AlignmentDirectional.centerStart,
                          child: FractionallySizedBox(
                            widthFactor: progress.percent / 100,
                            heightFactor: 1,
                            child: const DecoratedBox(
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [_gold, _goldLight],
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Text(
                      '${progress.percent}%',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: ink,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Symbols.play_arrow_rounded,
                        fill: 1,
                        size: 28,
                        color: Color(0xFF141A3A),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// The days in a row, with the last seven days.
class _Streak extends StatelessWidget {
  const _Streak({
    required this.days,
    required this.now,
    required this.color,
    required this.title,
    required this.dark,
  });

  final int days;
  final DateTime now;
  final Color? color;
  final String? title;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final ink = color ?? p.text;
    final mute = p.textSecondary;
    final gold = dark ? _darkGold : _gold;
    // This week, from its first day where the student lives: the days of
    // the streak lit, today lighter, the days to come empty.
    final today = DateUtils.dateOnly(now);
    final first = MaterialLocalizations.of(context).firstDayOfWeekIndex;
    final start = today.subtract(
      Duration(days: (today.weekday % 7 - first) % 7),
    );
    Color bar(int i) {
      final day = addDays(start, i);
      if (day.isAfter(today)) return p.divider;
      if (day == today) return _goldLight;
      return today.difference(day).inDays < days ? gold : p.divider;
    }

    return Padding(
      key: const ValueKey('learning-streak'),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  title ?? l10n.learningStreakTitle,
                  style: TextStyle(fontSize: 12, color: mute),
                ),
              ),
              const Icon(
                Symbols.local_fire_department_rounded,
                fill: 1,
                color: Color(0xFFFF7A45),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: '$days ',
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.w800,
                    color: ink,
                  ),
                ),
                TextSpan(
                  text: l10n.learningStreakDays(days),
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: mute,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              for (var i = 0; i < 7; i++) ...[
                if (i > 0) const SizedBox(width: 5),
                Expanded(
                  child: Container(
                    height: 24,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(7),
                      color: bar(i),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

/// The student's next live class, and when it starts.
class _Live extends StatelessWidget {
  const _Live({
    required this.live,
    required this.now,
    required this.color,
    required this.title,
  });

  final LiveSession live;
  final DateTime now;
  final Color? color;
  final String? title;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final ink = color ?? const Color(0xFF2A1D05);
    final starts = live.startsAt.toLocal();
    final time = clockTime(starts);
    final left = starts.difference(now);
    final when = !starts.isAfter(now)
        ? l10n.learningLiveNow(time)
        : left.inMinutes < 60
        ? l10n.learningLiveInMinutes(left.inMinutes.clamp(1, 59), time)
        : DateUtils.isSameDay(starts, now)
        ? l10n.learningLiveInHours(left.inHours, time)
        : l10n.learningLiveOn(dayLabel(starts), time);
    return Semantics(
      button: true,
      label: live.title,
      child: InkWell(
        key: const ValueKey('learning-live'),
        onTap: () => context.push(Paths.liveSession(live.id)),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: Icon(Symbols.videocam_rounded, fill: 1, color: ink),
              ),
              const SizedBox(height: 8),
              Text(
                title ?? l10n.learningLiveTitle,
                style: TextStyle(
                  fontSize: 12,
                  color: ink.withValues(alpha: 0.75),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                live.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  height: 1.25,
                  color: ink,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                when,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: ink,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
