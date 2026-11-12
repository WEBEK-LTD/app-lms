import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import 'course_cards.dart';

/// 122 The course card the owner designed in Studio (`Config.screens.
/// course_card`): its shape, corners and what it shows; the app's own row
/// card without one. Used wherever the lists show courses.
class DesignedCourseCard extends ConsumerWidget {
  const DesignedCourseCard({
    super.key,
    required this.course,
    required this.onTap,
  });

  final CourseSummary course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gate = ref.watch(appGateProvider);
    final look = gate is GateReady ? gate.config.screens?.courseCard : null;
    if (look == null ||
        (look.style == CourseCardStyle.classic &&
            look.radius == null &&
            look.hide.isEmpty)) {
      return CourseListCard(course: course, onTap: onTap);
    }
    return switch (look.style) {
      CourseCardStyle.classic || CourseCardStyle.rich => _RowCard(
        course: course,
        onTap: onTap,
        look: look,
        rich: look.style == CourseCardStyle.rich,
      ),
      CourseCardStyle.cover => _CoverCard(
        course: course,
        onTap: onTap,
        look: look,
      ),
      CourseCardStyle.tile => _TileCard(
        course: course,
        onTap: onTap,
        look: look,
      ),
      CourseCardStyle.premium => _PremiumCard(
        course: course,
        onTap: onTap,
        look: look,
      ),
    };
  }
}

String _meta(CourseSummary course, CourseCardLook look) {
  final teacher = course.instructor?.name;
  return [
    if (look.shows(CourseCardFact.teacher) &&
        teacher != null &&
        teacher.isNotEmpty)
      teacher,
    if (look.shows(CourseCardFact.lessons))
      currentL10n.lessonCount(course.lessonCount),
  ].join(' · ');
}

Widget _price(CourseSummary course, CourseCardLook look) {
  if (course.enrolled) return EnrolledLabel(courseId: course.id);
  if (!look.shows(CourseCardFact.price)) return const SizedBox.shrink();
  return PriceLabel(course.price);
}

class _RowCard extends StatelessWidget {
  const _RowCard({
    required this.course,
    required this.onTap,
    required this.look,
    required this.rich,
  });

  final CourseSummary course;
  final VoidCallback onTap;
  final CourseCardLook look;
  final bool rich;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final radius = look.radius ?? context.shapes.r(rich ? 22 : 12);
    final size = rich ? 108.0 : 96.0;
    final meta = _meta(course, look);
    final teacher = course.instructor;
    return AppCard(
      key: ValueKey('course-card-${rich ? 'rich' : 'classic'}-${course.id}'),
      onTap: onTap,
      semanticLabel: course.title,
      padding: EdgeInsets.all(rich ? 12 : 10),
      child: ExcludeSemantics(
        child: Row(
          children: [
            AppNetworkImage(
              url: course.imageUrl,
              seed: course.id,
              width: size,
              height: size,
              radius: radius,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (rich &&
                      look.shows(CourseCardFact.rating) &&
                      course.rating != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: RatingLabel(
                        course.rating!,
                        count: course.ratingCount,
                      ),
                    ),
                  Text(
                    course.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: rich ? 16 : 15,
                      fontWeight: FontWeight.w700,
                      height: 1.35,
                      color: p.text,
                    ),
                  ),
                  if (rich &&
                      look.shows(CourseCardFact.teacher) &&
                      teacher != null) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        ClipOval(
                          child: AppNetworkImage(
                            url: teacher.avatarUrl,
                            seed: teacher.id,
                            width: 20,
                            height: 20,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            teacher.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 12,
                              color: p.textSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ] else if (meta.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      meta,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: p.textSecondary),
                    ),
                  ],
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(child: _price(course, look)),
                      if (!rich &&
                          look.shows(CourseCardFact.rating) &&
                          course.rating != null)
                        RatingLabel(course.rating!, count: course.ratingCount),
                    ],
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

class _CoverCard extends StatelessWidget {
  const _CoverCard({
    required this.course,
    required this.onTap,
    required this.look,
  });

  final CourseSummary course;
  final VoidCallback onTap;
  final CourseCardLook look;

  @override
  Widget build(BuildContext context) {
    final radius = look.radius ?? context.shapes.r(22);
    final meta = _meta(course, look);
    return Semantics(
      button: true,
      label: course.title,
      child: GestureDetector(
        key: ValueKey('course-card-cover-${course.id}'),
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(radius),
          child: AspectRatio(
            aspectRatio: 16 / 10,
            child: Stack(
              fit: StackFit.expand,
              children: [
                AppNetworkImage(url: course.imageUrl, seed: course.id),
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0x00000000), Color(0xCC000000)],
                      stops: [0.35, 1],
                    ),
                  ),
                ),
                PositionedDirectional(
                  start: 14,
                  end: 14,
                  bottom: 14,
                  child: ExcludeSemantics(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          course.title,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.w800,
                            height: 1.3,
                            color: Color(0xFFFFFFFF),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                meta,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  color: Color(0xE6FFFFFF),
                                ),
                              ),
                            ),
                            if (look.shows(CourseCardFact.rating) &&
                                course.rating != null) ...[
                              const AppIcon(
                                AppIcons.star,
                                size: 15,
                                color: Color(0xFFF4C76B),
                              ),
                              const SizedBox(width: 3),
                              Text(
                                course.rating!.toStringAsFixed(1),
                                style: const TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFFFFFFFF),
                                ),
                              ),
                            ],
                            if (!course.enrolled &&
                                look.shows(CourseCardFact.price)) ...[
                              const SizedBox(width: 10),
                              DecoratedBox(
                                decoration: BoxDecoration(
                                  color: const Color(0xF2FFFFFF),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10,
                                    vertical: 5,
                                  ),
                                  child: Text(
                                    course.price.label,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF15131A),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _TileCard extends StatelessWidget {
  const _TileCard({
    required this.course,
    required this.onTap,
    required this.look,
  });

  final CourseSummary course;
  final VoidCallback onTap;
  final CourseCardLook look;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final radius = look.radius ?? context.shapes.r(18);
    final meta = _meta(course, look);
    return AppCard(
      key: ValueKey('course-card-tile-${course.id}'),
      onTap: onTap,
      semanticLabel: course.title,
      padding: const EdgeInsets.all(10),
      child: ExcludeSemantics(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            AspectRatio(
              aspectRatio: 16 / 9,
              child: AppNetworkImage(
                url: course.imageUrl,
                seed: course.id,
                radius: radius,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              course.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                height: 1.35,
                color: p.text,
              ),
            ),
            if (meta.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                meta,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 12.5, color: p.textSecondary),
              ),
            ],
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: _price(course, look)),
                if (look.shows(CourseCardFact.rating) && course.rating != null)
                  RatingLabel(course.rating!, count: course.ratingCount),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// 123 The premium academy's row: a square picture at the start, the
/// lessons and rating over the course's name, the teacher with their
/// photo, the price at the end, in the second colour.
class _PremiumCard extends StatelessWidget {
  const _PremiumCard({
    required this.course,
    required this.onTap,
    required this.look,
  });

  final CourseSummary course;
  final VoidCallback onTap;
  final CourseCardLook look;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final radius = look.radius ?? 18;
    final teacher = course.instructor;
    // The star drawn as an icon: not every font has the character.
    final rated = look.shows(CourseCardFact.rating) && course.rating != null;
    final lessons = look.shows(CourseCardFact.lessons)
        ? l10n.lessonCount(course.lessonCount)
        : null;
    final price = course.enrolled
        ? EnrolledLabel(courseId: course.id)
        : look.shows(CourseCardFact.price)
        ? DefaultTextStyle.merge(
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: p.accent,
            ),
            child: Text(
              course.price.isFree ? l10n.free : (course.price.formatted ?? ''),
            ),
          )
        : const SizedBox.shrink();
    return Semantics(
      button: true,
      label: course.title,
      child: InkWell(
        key: ValueKey('course-card-premium-${course.id}'),
        borderRadius: BorderRadius.circular(radius),
        onTap: onTap,
        child: ExcludeSemantics(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Row(
              children: [
                AppNetworkImage(
                  url: course.imageUrl,
                  seed: course.id,
                  width: 96,
                  height: 96,
                  radius: radius,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (rated || lessons != null || course.badge != null)
                        Text.rich(
                          TextSpan(
                            children: [
                              if (course.badge case final badge?)
                                TextSpan(
                                  text:
                                      '${switch (badge) {
                                        CourseBadge.fresh => l10n.courseBadgeNew,
                                        CourseBadge.bestseller => l10n.courseBadgeBestseller,
                                      }}  ',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color: p.accent,
                                  ),
                                ),
                              if (rated) ...[
                                WidgetSpan(
                                  alignment: PlaceholderAlignment.middle,
                                  child: Icon(
                                    AppIcons.star,
                                    size: 13,
                                    fill: 1,
                                    color: p.star,
                                  ),
                                ),
                                TextSpan(
                                  text:
                                      ' ${course.rating!.toStringAsFixed(1)}'
                                      '${lessons != null ? ' · ' : ''}',
                                ),
                              ],
                              ?lessons == null ? null : TextSpan(text: lessons),
                            ],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            color: p.textSecondary,
                          ),
                        ),
                      const SizedBox(height: 4),
                      Text(
                        course.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          height: 1.35,
                          color: p.text,
                        ),
                      ),
                      if (look.shows(CourseCardFact.teacher) &&
                          teacher != null) ...[
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            ClipOval(
                              child: AppNetworkImage(
                                url: teacher.avatarUrl,
                                seed: teacher.id,
                                width: 22,
                                height: 22,
                              ),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                teacher.name,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: p.textSecondary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                price,
              ],
            ),
          ),
        ),
      ),
    );
  }
}
