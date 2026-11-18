import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart' show MyCoursesStatus;
import '../../../core/auth/auth_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../data/lms_providers.dart';
import 'course_look_kit.dart';
import '../../../core/format/text_case.dart';

/// 130.52 A course in the lists in the course screens' look (`Config.
/// screens.courses.card`): `poster` the photo whole under a scrim with the
/// course over it, `ticket` the photo over a perforated stub, `glass` a
/// frosted label over the photo, `row` a compact row; the rating as five
/// star icons with its count, the teacher's photo and name, the lessons,
/// the price, and for an enrolled student how far they are. Each part is
/// the course's own and left out when it has none.

/// How far the signed-in student is in a course they are in (0 to 1); null
/// when they aren't, or it isn't known yet.
final courseShareProvider = Provider.autoDispose.family<double?, int>((
  ref,
  id,
) {
  if (!ref.watch(authControllerProvider).isSignedIn) return null;
  if (ref.watch(completedCourseIdsProvider).value?.contains(id) ?? false) {
    return 1;
  }
  final going = ref.watch(myCoursesProvider(MyCoursesStatus.inProgress));
  for (final c in going.items) {
    if (c.course.id == id) return c.progress.percent / 100;
  }
  return null;
});

class StudioCourseCard extends ConsumerWidget {
  const StudioCourseCard({
    super.key,
    required this.course,
    required this.onTap,
    required this.look,
    this.share,
  });

  final CourseSummary course;
  final VoidCallback onTap;
  final CourseScreensLook look;

  /// How far the student is, when the list knows (My courses); else from
  /// their courses when they are enrolled.
  final double? share;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final design = look.card;
    final colors = CourseLookColors.of(context, look);
    final progress = !design.shows(CourseCardPart.progress)
        ? null
        : share ??
              (course.enrolled
                  ? ref.watch(courseShareProvider(course.id))
                  : null);
    final facts = _Facts(course: course, design: design, progress: progress);
    final card = switch (design.layout) {
      CourseCardLayout.poster => _Poster(facts: facts, colors: colors),
      CourseCardLayout.ticket => _Ticket(facts: facts, colors: colors),
      CourseCardLayout.glass => _GlassCard(facts: facts, colors: colors),
      CourseCardLayout.row => _Row(facts: facts, colors: colors),
    };
    return Semantics(
      button: true,
      label: [
        course.title,
        if (facts.teacher != null) facts.teacher!.name,
        if (facts.rating != null)
          context.l10n.courseLookStars(facts.rating!.toStringAsFixed(1)),
        if (facts.lessons) context.l10n.lessonCount(course.lessonCount),
        if (progress != null)
          context.l10n.learningPercentOfCourse((progress * 100).round())
        else if (facts.price)
          course.price.label,
      ].join(', '),
      excludeSemantics: true,
      child: GestureDetector(
        key: ValueKey('studio-course-card-${design.layout.name}-${course.id}'),
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: card,
      ),
    );
  }
}

/// What a card shows of its course, as the owner chose.
class _Facts {
  _Facts({required this.course, required this.design, this.progress});

  final CourseSummary course;
  final CourseCardDesign design;
  final double? progress;

  Instructor? get teacher =>
      design.shows(CourseCardPart.teacher) &&
          (course.instructor?.name.trim().isNotEmpty ?? false)
      ? course.instructor
      : null;

  double? get rating =>
      design.shows(CourseCardPart.rating) &&
          course.rating != null &&
          course.ratingCount > 0
      ? course.rating
      : null;

  bool get lessons =>
      design.shows(CourseCardPart.lessons) && course.lessonCount > 0;

  /// The price shows for those not in the course.
  bool get price =>
      design.shows(CourseCardPart.price) &&
      !course.enrolled &&
      course.price.label.isNotEmpty;

  /// The course's badge (new, or one of the most taken).
  String? badge(BuildContext context) => switch (course.badge) {
    CourseBadge.fresh => context.l10n.courseBadgeNew,
    CourseBadge.bestseller => context.l10n.courseBadgeBestseller,
    null => null,
  };
}

/// The price: free, or the site's, the old one struck through on a sale.
class CoursePriceText extends StatelessWidget {
  const CoursePriceText({
    super.key,
    required this.price,
    required this.color,
    this.size = 15,
    this.mutedColor,
  });

  final Price price;
  final Color color;
  final Color? mutedColor;
  final double size;

  @override
  Widget build(BuildContext context) {
    final now = num.tryParse(price.saleAmount ?? '');
    final was = num.tryParse(price.amount ?? '');
    final sale = !price.isFree && now != null && was != null && was > now;
    return Row(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        if (sale) ...[
          Text(
            _plain(price.amount!),
            style: TextStyle(
              fontSize: size * 0.72,
              decoration: TextDecoration.lineThrough,
              color: mutedColor ?? color.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(width: 6),
        ],
        Flexible(
          child: Text(
            price.label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: size,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
        ),
      ],
    );
  }
}

String _plain(String amount) =>
    amount.endsWith('.00') ? amount.substring(0, amount.length - 3) : amount;

/// The teacher's photo (else their initials) and name.
class _Teacher extends StatelessWidget {
  const _Teacher({required this.teacher, required this.color, this.size = 22});

  final Instructor teacher;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      InitialsAvatar(
        name: teacher.name,
        imageUrl: teacher.avatarUrl,
        size: size,
      ),
      const SizedBox(width: 7),
      Flexible(
        child: Text(
          teacher.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ),
    ],
  );
}

/// The lessons with their icon.
class _Lessons extends StatelessWidget {
  const _Lessons({required this.count, required this.color});

  final int count;
  final Color color;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(Symbols.play_lesson_rounded, size: 15, color: color),
      const SizedBox(width: 4),
      Flexible(
        child: Text(
          context.l10n.lessonCount(count),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ),
    ],
  );
}

/// The photo whole under a scrim, the course over its foot.
class _Poster extends StatelessWidget {
  const _Poster({required this.facts, required this.colors});

  final _Facts facts;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final course = facts.course;
    final design = facts.design;
    final scrim = design.scrim;
    final badge = facts.badge(context);
    const white = Colors.white;
    return ClipRRect(
      borderRadius: BorderRadius.circular(design.radius),
      child: AspectRatio(
        aspectRatio: design.aspect,
        child: Stack(
          fit: StackFit.expand,
          children: [
            AppNetworkImage(url: course.imageUrl, seed: course.id),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withValues(alpha: scrim * 0.25),
                    Colors.black.withValues(alpha: scrim * 0.15),
                    Colors.black.withValues(
                      alpha: (scrim + 0.12).clamp(0, 0.95),
                    ),
                  ],
                  stops: const [0, 0.42, 1],
                ),
              ),
            ),
            PositionedDirectional(
              top: 14,
              start: 14,
              end: 14,
              child: Row(
                children: [
                  if (badge != null)
                    CourseTag(
                      badge,
                      background: colors.accent,
                      color: colors.onAccent,
                      icon: Symbols.workspace_premium_rounded,
                    ),
                  const Spacer(),
                  if (facts.price)
                    CourseGlass(
                      radius: 999,
                      blur: 12,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      child: CoursePriceText(
                        price: course.price,
                        color: white,
                        size: 14,
                      ),
                    ),
                ],
              ),
            ),
            PositionedDirectional(
              start: 18,
              end: 18,
              bottom: 18,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (facts.rating != null) ...[
                    CourseStars(
                      rating: facts.rating!,
                      count: course.ratingCount,
                      color: colors.accent,
                      textColor: white,
                    ),
                    const SizedBox(height: 8),
                  ],
                  Text(
                    course.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 22,
                      height: 1.22,
                      fontWeight: FontWeight.w800,
                      color: white,
                    ),
                  ),
                  if (facts.teacher != null || facts.lessons) ...[
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        if (facts.teacher != null)
                          Flexible(
                            child: _Teacher(
                              teacher: facts.teacher!,
                              color: white.withValues(alpha: 0.92),
                            ),
                          ),
                        if (facts.teacher != null && facts.lessons)
                          const SizedBox(width: 12),
                        if (facts.lessons)
                          _Lessons(
                            count: course.lessonCount,
                            color: white.withValues(alpha: 0.85),
                          ),
                      ],
                    ),
                  ],
                  if (facts.progress != null) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: CourseProgressBar(
                            value: facts.progress!,
                            color: colors.accent,
                            track: white.withValues(alpha: 0.25),
                            height: 5,
                          ),
                        ),
                        const SizedBox(width: 10),
                        Text(
                          '${(facts.progress! * 100).round()}%',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: white,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The photo over a stub, a perforation between them.
class _Ticket extends StatelessWidget {
  const _Ticket({required this.facts, required this.colors});

  final _Facts facts;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final course = facts.course;
    final design = facts.design;
    final badge = facts.badge(context);
    final radius = design.radius;
    return Container(
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: colors.line),
        boxShadow: colors.shadow,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.all(8),
            child: ClipRRect(
              borderRadius: BorderRadius.circular((radius - 6).clamp(0, 32)),
              child: AspectRatio(
                aspectRatio: design.aspect,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    AppNetworkImage(url: course.imageUrl, seed: course.id),
                    if (badge != null)
                      PositionedDirectional(
                        top: 10,
                        start: 10,
                        child: CourseTag(
                          badge,
                          background: colors.accent,
                          color: colors.onAccent,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
          _Perforation(color: colors.line, notch: p.background),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  course.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 17,
                    height: 1.3,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
                if (facts.teacher != null) ...[
                  const SizedBox(height: 8),
                  _Teacher(teacher: facts.teacher!, color: p.textSecondary),
                ],
                const SizedBox(height: 12),
                Row(
                  children: [
                    if (facts.rating != null) ...[
                      CourseStars(
                        rating: facts.rating!,
                        count: course.ratingCount,
                        size: 13,
                        color: colors.accent,
                      ),
                      const SizedBox(width: 10),
                    ],
                    Expanded(
                      child: facts.lessons
                          ? Align(
                              alignment: AlignmentDirectional.centerStart,
                              child: _Lessons(
                                count: course.lessonCount,
                                color: p.textSecondary,
                              ),
                            )
                          : const SizedBox.shrink(),
                    ),
                    if (facts.progress == null && facts.price)
                      CoursePriceText(
                        price: course.price,
                        color: colors.accent,
                        mutedColor: p.textTertiary,
                        size: 16,
                      ),
                  ],
                ),
                if (facts.progress != null) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: CourseProgressBar(
                          value: facts.progress!,
                          color: colors.accent,
                          track: colors.track,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        '${(facts.progress! * 100).round()}%',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          color: p.text,
                        ),
                      ),
                    ],
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

/// A dashed line between two half circles cut out of the card's sides.
class _Perforation extends StatelessWidget {
  const _Perforation({required this.color, required this.notch});

  final Color color;
  final Color notch;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 18,
    child: CustomPaint(painter: _PerforationPainter(color, notch)),
  );
}

class _PerforationPainter extends CustomPainter {
  _PerforationPainter(this.color, this.notch);

  final Color color;
  final Color notch;

  @override
  void paint(Canvas canvas, Size size) {
    final y = size.height / 2;
    final fill = Paint()..color = notch;
    canvas
      ..drawCircle(Offset(-1, y), 9, fill)
      ..drawCircle(Offset(size.width + 1, y), 9, fill);
    final dash = Paint()
      ..color = color
      ..strokeWidth = 1.2;
    for (var x = 16.0; x < size.width - 16; x += 9) {
      canvas.drawLine(Offset(x, y), Offset(x + 4.5, y), dash);
    }
  }

  @override
  bool shouldRepaint(_PerforationPainter old) =>
      old.color != color || old.notch != notch;
}

/// The photo with a frosted label over its foot.
class _GlassCard extends StatelessWidget {
  const _GlassCard({required this.facts, required this.colors});

  final _Facts facts;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final course = facts.course;
    final design = facts.design;
    final badge = facts.badge(context);
    const white = Colors.white;
    return ClipRRect(
      borderRadius: BorderRadius.circular(design.radius),
      child: AspectRatio(
        aspectRatio: design.aspect,
        child: Stack(
          fit: StackFit.expand,
          children: [
            AppNetworkImage(url: course.imageUrl, seed: course.id),
            DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black.withValues(alpha: design.scrim),
                  ],
                  stops: const [0.3, 1],
                ),
              ),
            ),
            PositionedDirectional(
              top: 12,
              start: 12,
              end: 12,
              child: Row(
                children: [
                  if (badge != null)
                    CourseTag(
                      badge.toUpperCaseIn(context),
                      background: colors.look.look == CourseLook.onAir
                          ? colors.live
                          : colors.accent,
                      color: colors.look.look == CourseLook.onAir
                          ? white
                          : colors.onAccent,
                    ),
                  const Spacer(),
                  if (facts.price)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: colors.accent,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: CoursePriceText(
                        price: course.price,
                        color: colors.onAccent,
                        size: 13.5,
                      ),
                    ),
                ],
              ),
            ),
            PositionedDirectional(
              start: 10,
              end: 10,
              bottom: 10,
              child: CourseGlass(
                radius: (design.radius - 6).clamp(8, 30),
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            course.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 16.5,
                              height: 1.25,
                              fontWeight: FontWeight.w800,
                              color: white,
                            ),
                          ),
                          if (facts.teacher != null ||
                              facts.rating != null) ...[
                            const SizedBox(height: 7),
                            Wrap(
                              spacing: 10,
                              runSpacing: 4,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                if (facts.teacher != null)
                                  _Teacher(
                                    teacher: facts.teacher!,
                                    color: white.withValues(alpha: 0.92),
                                    size: 20,
                                  ),
                                if (facts.rating != null)
                                  CourseStars(
                                    rating: facts.rating!,
                                    count: course.ratingCount,
                                    size: 12,
                                    color: const Color(0xFFF5C451),
                                    textColor: white,
                                  ),
                              ],
                            ),
                          ],
                          if (facts.lessons && facts.teacher == null) ...[
                            const SizedBox(height: 6),
                            _Lessons(
                              count: course.lessonCount,
                              color: white.withValues(alpha: 0.85),
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (facts.progress != null) ...[
                      const SizedBox(width: 10),
                      CourseProgressRing(
                        value: facts.progress!,
                        color: colors.accent,
                        track: white.withValues(alpha: 0.25),
                        size: 42,
                        textColor: white,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A compact row: the photo, the course, and the price or a ring.
class _Row extends StatelessWidget {
  const _Row({required this.facts, required this.colors});

  final _Facts facts;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final course = facts.course;
    final design = facts.design;
    final badge = facts.badge(context);
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(design.radius),
        border: Border.all(color: colors.line),
        boxShadow: colors.shadow,
      ),
      child: Row(
        children: [
          AppNetworkImage(
            url: course.imageUrl,
            seed: course.id,
            width: 92,
            height: 92,
            radius: (design.radius - 6).clamp(0, 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (badge != null) ...[
                  Text(
                    badge.toUpperCaseIn(context),
                    style: TextStyle(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1,
                      color: colors.accent,
                    ),
                  ),
                  const SizedBox(height: 3),
                ],
                Text(
                  course.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 15.5,
                    height: 1.3,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
                if (facts.teacher != null) ...[
                  const SizedBox(height: 6),
                  _Teacher(
                    teacher: facts.teacher!,
                    color: p.textSecondary,
                    size: 18,
                  ),
                ],
                if (facts.rating != null || facts.lessons) ...[
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 10,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      if (facts.rating != null)
                        CourseStars(
                          rating: facts.rating!,
                          count: course.ratingCount,
                          size: 12,
                          color: colors.accent,
                        ),
                      if (facts.lessons)
                        _Lessons(
                          count: course.lessonCount,
                          color: p.textSecondary,
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          if (facts.progress != null) ...[
            const SizedBox(width: 10),
            CourseProgressRing(
              value: facts.progress!,
              color: colors.accent,
              track: colors.track,
              size: 48,
            ),
          ] else if (facts.price) ...[
            const SizedBox(width: 10),
            CoursePriceText(
              price: course.price,
              color: p.text,
              mutedColor: p.textTertiary,
              size: 15,
            ),
          ],
        ],
      ),
    );
  }
}
