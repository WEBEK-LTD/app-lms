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
import '../../../core/widgets/common.dart';
import '../coursework/coursework_providers.dart';
import '../data/lms_providers.dart';
import '../learning/learning_providers.dart';
import '../navigation.dart';
import 'learning_ring.dart';
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
    StudioLearningSection.week => ref.watch(learningTimeProvider).hasValue,
  };
}

class StudioLearningCard extends ConsumerWidget {
  const StudioLearningCard({
    super.key,
    required this.section,
    required this.color,
    required this.title,
    required this.dark,
    this.style = StudioLearningStyle.card,
    this.days = StudioLearningDays.none,
    this.ownPicture = false,
  });

  /// 130.18 The week's days under a streak.
  final StudioLearningDays days;

  final StudioLearningSection section;

  /// 128.8 On a photo, as the approved academy home draws them.
  final StudioLearningStyle style;

  /// 128.8 Whether the element has its own picture (drawn under the card);
  /// without one the course they are taking shows its own.
  final bool ownPicture;

  /// The element's own text colour; null, the card's.
  final Color? color;

  /// The element's own title; null, the app's words.
  final String? title;
  final bool dark;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 130.18 The days of this week the student learned on, when known.
    Set<DateTime> learned() => {
      for (final d in ref.watch(learningTimeProvider).value?.days ?? const [])
        if (d.minutes > 0) DateUtils.dateOnly(d.date),
    };
    // 130.18 The ring: the course they are taking in a gold ring; its
    // other cards as on a photo.
    if (style == StudioLearningStyle.ring &&
        section == StudioLearningSection.continueCourse) {
      return RingContinueCard(course: _taking(ref)!, color: color, dark: dark);
    }
    if (style != StudioLearningStyle.card) {
      switch (section) {
        case StudioLearningSection.continueCourse:
          return PhotoContinueCard(
            course: _taking(ref)!,
            color: color,
            ownPicture: ownPicture,
          );
        case StudioLearningSection.live:
          return PhotoLiveCard(
            live: _nextLive(ref)!,
            now: ref.watch(pageClockProvider)(),
            color: color,
          );
        case StudioLearningSection.streak:
          return CompactStreakCard(
            days: ref.watch(achievementsProvider).value?.streakDays ?? 0,
            color: color,
            title: title,
            week: days,
            learned: days == StudioLearningDays.none ? const {} : learned(),
            now: ref.watch(pageClockProvider)(),
            dark: dark,
          );
        case StudioLearningSection.week:
          break;
      }
    }
    return switch (section) {
      StudioLearningSection.continueCourse => _Continue(
        course: _taking(ref)!,
        color: color,
      ),
      StudioLearningSection.streak => _Streak(
        days: ref.watch(achievementsProvider).value?.streakDays ?? 0,
        learned: {
          for (final d
              in ref.watch(learningTimeProvider).value?.days ?? const [])
            if (d.minutes > 0) DateUtils.dateOnly(d.date),
        },
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
      StudioLearningSection.week => LearningWeek(
        time: ref.watch(learningTimeProvider).value!,
        color: color,
        title: title,
      ),
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
    required this.learned,
    required this.now,
    required this.color,
    required this.title,
    required this.dark,
  });

  final int days;

  /// 123 The days of the last seven the student learned on, when known.
  final Set<DateTime> learned;
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
      if (day == today) return learned.contains(day) ? gold : _goldLight;
      if (learned.isNotEmpty) return learned.contains(day) ? gold : p.divider;
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

/// 123 This week's learning time, each day of it as a bar (the most in
/// gold), against the week before; on the element's own colours (a dark
/// card in the premium academy).
class LearningWeek extends StatelessWidget {
  const LearningWeek({
    super.key,
    required this.time,
    required this.color,
    required this.title,
  });

  final LearningTime time;
  final Color? color;
  final String? title;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final ink = color ?? Colors.white;
    final hours = time.weekMinutes ~/ 60;
    final minutes = time.weekMinutes % 60;
    final most = time.days.fold<int>(
      0,
      (m, d) => d.minutes > m ? d.minutes : m,
    );
    final change = time.change;
    final names = MaterialLocalizations.of(context).narrowWeekdays;
    return Padding(
      key: const ValueKey('learning-week'),
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title ?? l10n.learningWeekTitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: ink.withValues(alpha: 0.7),
                      ),
                    ),
                    const SizedBox(height: 2),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: AlignmentDirectional.centerStart,
                      child: Text(
                        hours > 0
                            ? l10n.learningHoursMinutes(hours, minutes)
                            : l10n.learningMinutesOnly(minutes),
                        maxLines: 1,
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w800,
                          color: ink,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              if (change != null && change != 0)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 5,
                  ),
                  decoration: BoxDecoration(
                    color: ink.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    change > 0
                        ? l10n.learningWeekUp(change)
                        : l10n.learningWeekDown(-change),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: ink,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 96,
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                for (final (i, d) in time.days.indexed) ...[
                  if (i > 0) const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Container(
                          height: most == 0
                              ? 8
                              : (8 + 64 * d.minutes / most).toDouble(),
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(10),
                            gradient: d.minutes == most && most > 0
                                ? const LinearGradient(
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                    colors: [_goldLight, _gold],
                                  )
                                : null,
                            color: d.minutes == most && most > 0
                                ? null
                                : ink.withValues(alpha: 0.14),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          names[d.date.weekday % 7],
                          style: TextStyle(
                            fontSize: 10,
                            color: ink.withValues(alpha: 0.6),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 128.8 The board's gold for fills (how far they are, the live class's
/// time), as approved for the premium academy.
const _goldFill = Color(0xFFE6C26E);

/// 128.8 The course the student is taking over its photo (the element's
/// own picture, drawn under it, else the course's) with a dark scrim: the
/// lesson they are on and the minutes left on one chip, the course's name,
/// how far they are in gold and a round play button.
class PhotoContinueCard extends StatelessWidget {
  const PhotoContinueCard({
    super.key,
    required this.course,
    required this.color,
    required this.ownPicture,
  });

  final MyCourse course;
  final Color? color;
  final bool ownPicture;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final ink = color ?? Colors.white;
    final progress = course.progress;
    final current = (progress.completedItems + 1).clamp(
      1,
      progress.totalItems < 1 ? 1 : progress.totalItems,
    );
    final minutes = course.nextItem?.durationMinutes;
    final chip = [
      l10n.learningLessonShort(current, progress.totalItems),
      if (minutes != null) l10n.learningMinutesLeft(minutes),
    ].join(' · ');
    final picture = ownPicture ? null : course.course.imageUrl;
    return Semantics(
      button: true,
      label: course.course.title,
      child: InkWell(
        key: const ValueKey('learning-continue-photo'),
        onTap: () => continueCourse(context, course),
        child: SizedBox(
          height: 236,
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (picture != null) AppNetworkImage(url: picture),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Color(0x260E1228), Color(0xEB0E1228)],
                  ),
                ),
              ),
              PositionedDirectional(
                start: 14,
                top: 14,
                end: 14,
                child: Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Container(
                    key: const ValueKey('learning-photo-chip'),
                    height: 26,
                    padding: const EdgeInsets.symmetric(horizontal: 10),
                    decoration: BoxDecoration(
                      color: const Color(0x33FFFFFF),
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            chip,
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
                  ),
                ),
              ),
              PositionedDirectional(
                start: 16,
                end: 16,
                bottom: 16,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      course.course.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 22,
                        height: 1.1,
                        fontWeight: FontWeight.w800,
                        color: ink,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(3),
                            child: Container(
                              key: const ValueKey('learning-photo-progress'),
                              height: 5,
                              color: const Color(0x4DFFFFFF),
                              alignment: AlignmentDirectional.centerStart,
                              child: FractionallySizedBox(
                                widthFactor: (progress.percent / 100).clamp(
                                  0.0,
                                  1.0,
                                ),
                                heightFactor: 1,
                                child: const DecoratedBox(
                                  decoration: BoxDecoration(color: _goldFill),
                                ),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Container(
                          width: 44,
                          height: 44,
                          decoration: const BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Symbols.play_arrow_rounded,
                            fill: 1,
                            size: 24,
                            color: Color(0xFF1D2B4F),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 128.8 The student's next live class on the element's photo: when it
/// starts in gold, with a dot, over its name.
class PhotoLiveCard extends StatelessWidget {
  const PhotoLiveCard({
    super.key,
    required this.live,
    required this.now,
    required this.color,
  });

  final LiveSession live;
  final DateTime now;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final ink = color ?? Colors.white;
    final starts = live.startsAt.toLocal();
    final time = clockTime(starts);
    final when = !starts.isAfter(now)
        ? l10n.learningLiveNowShort
        : DateUtils.isSameDay(starts, now)
        ? l10n.learningLiveAt(time)
        : l10n.learningLiveOn(dayLabel(starts), time).toUpperCase();
    return Semantics(
      button: true,
      label: live.title,
      child: InkWell(
        key: const ValueKey('learning-live-photo'),
        onTap: () => context.push(Paths.liveSession(live.id)),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: _goldFill,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      when,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: _goldFill,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Text(
                live.title,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  height: 1.25,
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

/// 128.8 The days in a row as one figure, beside the live class.
class CompactStreakCard extends StatelessWidget {
  const CompactStreakCard({
    super.key,
    required this.days,
    required this.color,
    required this.title,
    this.week = StudioLearningDays.none,
    this.learned = const {},
    this.now,
    this.dark = false,
  });

  final int days;
  final Color? color;
  final String? title;

  /// 130.18 This week's days under the figure, the days learned filled and
  /// today ringed.
  final StudioLearningDays week;
  final Set<DateTime> learned;
  final DateTime? now;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    return Padding(
      key: const ValueKey('learning-streak-compact'),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Icon(
                Symbols.local_fire_department_rounded,
                fill: 1,
                size: 16,
                color: Color(0xFFE8742F),
              ),
              const SizedBox(width: 4),
              Flexible(
                child: Text(
                  title ?? l10n.learningStreakShort,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 12, color: p.textSecondary),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: AlignmentDirectional.centerStart,
            child: Text(
              '$days ${l10n.learningStreakDays(days)}',
              maxLines: 1,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: color ?? p.text,
              ),
            ),
          ),
          if (week != StudioLearningDays.none) ...[
            const SizedBox(height: 10),
            StreakWeek(
              style: week,
              days: days,
              learned: learned,
              now: now ?? DateTime.now(),
              dark: dark,
            ),
          ],
        ],
      ),
    );
  }
}
