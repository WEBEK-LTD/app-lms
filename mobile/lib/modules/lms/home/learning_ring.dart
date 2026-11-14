import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/format/dates.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../navigation.dart';

/// 130.18 Two generic options of the student's cards (`learning`), as the
/// Signature looks of Ufuq Academy draw them: the week's days under a
/// streak (`StudioLearning.days`), and the course they are taking in a
/// gold ring (`StudioLearning.style` `ring`).

const _gold = Color(0xFFC99B4A);
const _goldLight = Color(0xFFE7C982);
const _goldDeep = Color(0xFF7A5C14);

/// This week from its first day where the student lives: each day's letter
/// (round letters) or a short pill, the days learned filled in gold (the
/// streak's days when the days learned aren't known), today ringed, the
/// days to come quiet.
class StreakWeek extends StatelessWidget {
  const StreakWeek({
    super.key,
    required this.style,
    required this.days,
    required this.learned,
    required this.now,
    required this.dark,
  });

  final StudioLearningDays style;
  final int days;
  final Set<DateTime> learned;
  final DateTime now;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final material = MaterialLocalizations.of(context);
    final today = DateUtils.dateOnly(now);
    final first = material.firstDayOfWeekIndex;
    final start = today.subtract(
      Duration(days: (today.weekday % 7 - first) % 7),
    );
    final quiet = dark ? const Color(0xFF2A2C38) : const Color(0xFFEFE6D3);
    final fill = dark ? _goldLight : _gold;
    bool done(DateTime day) {
      if (day.isAfter(today)) return false;
      if (learned.isNotEmpty) return learned.contains(day);
      return today.difference(day).inDays < days;
    }

    // A narrow card shrinks the week to fit rather than cutting it.
    final week = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < 7; i++) ...[
          if (i > 0) SizedBox(width: style == StudioLearningDays.pills ? 4 : 3),
          Builder(
            builder: (context) {
              final day = addDays(start, i);
              final isToday = day == today;
              final lit = done(day);
              final ring = isToday
                  ? Border.all(color: dark ? _goldLight : _goldDeep, width: 1.6)
                  : null;
              if (style == StudioLearningDays.pills) {
                return Container(
                  width: isToday ? 18 : 12,
                  height: isToday ? 22 : 18,
                  decoration: BoxDecoration(
                    color: lit ? fill : quiet,
                    borderRadius: BorderRadius.circular(5),
                    border: ring,
                  ),
                );
              }
              final letter = material.narrowWeekdays[(first + i) % 7];
              return Container(
                width: isToday ? 22 : 18,
                height: isToday ? 22 : 18,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: lit ? fill : Colors.transparent,
                  shape: BoxShape.circle,
                  border: ring ?? (lit ? null : Border.all(color: quiet)),
                ),
                child: Text(
                  letter,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    height: 1,
                    color: lit ? const Color(0xFF2A1D05) : p.textSecondary,
                  ),
                ),
              );
            },
          ),
        ],
      ],
    );
    return FittedBox(
      key: ValueKey('learning-streak-week-${style.name}'),
      fit: BoxFit.scaleDown,
      alignment: AlignmentDirectional.centerStart,
      child: week,
    );
  }
}

/// The course the student is taking as its photo in a round frame, a gold
/// ring around it filled to how far they are (ticks around it, a knob at
/// its end), the lesson they are on over the photo's foot; under it the
/// card's kicker, the course's name, the minutes left and how far they
/// are, and a button that opens the lesson. Centred, in the element's own
/// colour.
class RingContinueCard extends StatelessWidget {
  const RingContinueCard({
    super.key,
    required this.course,
    required this.color,
    required this.dark,
  });

  final MyCourse course;
  final Color? color;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final p = context.palette;
    final ink = color ?? p.text;
    final progress = course.progress;
    final share = (progress.percent / 100).clamp(0.0, 1.0);
    final current = (progress.completedItems + 1).clamp(
      1,
      progress.totalItems < 1 ? 1 : progress.totalItems,
    );
    final minutes = course.nextItem?.durationMinutes;
    final line = [
      if (minutes != null) l10n.learningMinutesLeft(minutes),
      l10n.learningPercentOfCourse(progress.percent.round()),
    ].join(' · ');
    final picture = course.course.imageUrl;
    const size = 236.0;
    return Semantics(
      button: true,
      label: course.course.title,
      child: Padding(
        key: const ValueKey('learning-continue-ring'),
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox.square(
              dimension: size,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Positioned.fill(
                    child: CustomPaint(
                      painter: _RingPainter(
                        share: share,
                        track: dark
                            ? const Color(0xFF262833)
                            : const Color(0xFFE9DFCB),
                        tick: dark
                            ? const Color(0xFF3A3C4A)
                            : const Color(0xFFCDBE9F),
                        fill: dark ? _goldLight : _gold,
                        knob: dark ? const Color(0xFF15161D) : Colors.white,
                        rtl: Directionality.of(context) == TextDirection.rtl,
                      ),
                    ),
                  ),
                  ClipOval(
                    child: SizedBox.square(
                      dimension: size - 48,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          if (picture != null)
                            AppNetworkImage(url: picture)
                          else
                            const ColoredBox(color: Color(0xFF1D2B4F)),
                          Align(
                            alignment: const Alignment(0, 0.78),
                            child: Container(
                              key: const ValueKey('learning-ring-chip'),
                              height: 30,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xB3141626),
                                borderRadius: BorderRadius.circular(15),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(
                                    Symbols.play_arrow_rounded,
                                    fill: 1,
                                    size: 16,
                                    color: _goldLight,
                                  ),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      l10n.learningLessonShort(
                                        current,
                                        progress.totalItems,
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            Text(
              l10n.continueLearning.toUpperCase(),
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 2.4,
                color: dark ? _goldLight : _goldDeep,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              course.course.title,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 26,
                height: 1.12,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.6,
                color: ink,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              line,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 14, color: p.textSecondary),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              key: const ValueKey('learning-ring-resume'),
              onPressed: () => continueCourse(context, course),
              style: FilledButton.styleFrom(
                backgroundColor: dark ? _goldLight : const Color(0xFF1D2B4F),
                foregroundColor: dark ? const Color(0xFF2A1D05) : Colors.white,
                minimumSize: const Size(0, 52),
                padding: const EdgeInsets.symmetric(horizontal: 26),
                shape: const StadiumBorder(),
                // The app's font, bolder (a bare style would drop it).
                textStyle: Theme.of(context).textTheme.labelLarge
                    ?.copyWith(fontSize: 16, fontWeight: FontWeight.w800),
              ),
              icon: const Icon(Symbols.play_arrow_rounded, fill: 1),
              label: Text(l10n.learningResumeLesson),
            ),
          ],
        ),
      ),
    );
  }
}

/// The ring: its track, 48 ticks just outside it, the arc filled from the
/// top round toward the end side and a knob where it stops.
class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.share,
    required this.track,
    required this.tick,
    required this.fill,
    required this.knob,
    required this.rtl,
  });

  final double share;
  final Color track;
  final Color tick;
  final Color fill;
  final Color knob;
  final bool rtl;

  @override
  void paint(Canvas canvas, Size size) {
    final c = size.center(Offset.zero);
    final r = size.shortestSide / 2 - 14;
    final ticks = Paint()
      ..color = tick
      ..strokeWidth = 1.4
      ..strokeCap = StrokeCap.round;
    for (var i = 0; i < 48; i++) {
      final a = i / 48 * 2 * math.pi;
      final dir = Offset(math.cos(a), math.sin(a));
      canvas.drawLine(c + dir * (r + 8), c + dir * (r + 12), ticks);
    }
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;
    canvas.drawCircle(c, r, stroke..color = track);
    final sweep = 2 * math.pi * share * (rtl ? -1 : 1);
    final rect = Rect.fromCircle(center: c, radius: r);
    canvas.drawArc(rect, -math.pi / 2, sweep, false, stroke..color = fill);
    final end = -math.pi / 2 + sweep;
    final at = c + Offset(math.cos(end), math.sin(end)) * r;
    canvas.drawCircle(at, 9, Paint()..color = fill);
    canvas.drawCircle(at, 5, Paint()..color = knob);
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.share != share ||
      old.track != track ||
      old.fill != fill ||
      old.rtl != rtl;
}
