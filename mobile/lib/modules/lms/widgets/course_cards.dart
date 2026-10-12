import 'package:flutter/material.dart';

import '../../../core/api/models/models.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';

String courseMeta(CourseSummary course) {
  final lessons = plural(course.lessonCount, 'lesson');
  final instructor = course.instructor?.name;
  return instructor == null || instructor.isEmpty
      ? lessons
      : '$instructor · $lessons';
}

String _a11yLabel(CourseSummary course) {
  final parts = [
    course.title,
    courseMeta(course),
    if (course.enrolled) 'Enrolled' else course.price.label,
    if (course.rating != null)
      'Rated ${course.rating!.toStringAsFixed(1)} of 5',
  ];
  return parts.where((p) => p.isNotEmpty).join(', ');
}

/// The row card of the Courses list: image left, details right.
class CourseListCard extends StatelessWidget {
  const CourseListCard({super.key, required this.course, required this.onTap});

  final CourseSummary course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AppCard(
      onTap: onTap,
      semanticLabel: _a11yLabel(course),
      padding: const EdgeInsets.all(10),
      child: ExcludeSemantics(
        child: Row(
          children: [
            AppNetworkImage(
              url: course.imageUrl,
              seed: seedFor(course),
              width: 96,
              height: 96,
              radius: 12,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    course.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      height: 1.4,
                      color: p.text,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    courseMeta(course),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 12, color: p.textSecondary),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: course.enrolled
                            ? const EnrolledLabel()
                            : PriceLabel(course.price),
                      ),
                      if (course.rating != null) RatingLabel(course.rating!),
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

class EnrolledLabel extends StatelessWidget {
  const EnrolledLabel({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        AppIcon(AppIcons.check, size: 14, color: p.success),
        const SizedBox(width: 4),
        Text(
          'Enrolled',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: p.success,
          ),
        ),
      ],
    );
  }
}

class RatingLabel extends StatelessWidget {
  const RatingLabel(this.rating, {super.key});

  final double rating;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        AppIcon(AppIcons.star, size: 14, color: p.star, filled: true),
        const SizedBox(width: 4),
        Text(
          rating.toStringAsFixed(1),
          style: TextStyle(fontSize: 12, color: p.textSecondary),
        ),
      ],
    );
  }
}

/// The 210-wide card of the Classic home's horizontal list.
class CourseTileCard extends StatelessWidget {
  const CourseTileCard({super.key, required this.course, required this.onTap});

  final CourseSummary course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return SizedBox(
      width: 210,
      child: AppCard(
        onTap: onTap,
        semanticLabel: _a11yLabel(course),
        child: ExcludeSemantics(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppNetworkImage(
                url: course.imageUrl,
                seed: seedFor(course),
                height: 110,
              ),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      course.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        height: 1.4,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      course.instructor?.name ??
                          plural(course.lessonCount, 'lesson'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: p.textSecondary),
                    ),
                    const SizedBox(height: 6),
                    if (course.enrolled)
                      const EnrolledLabel()
                    else
                      PriceLabel(course.price),
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

/// The large image card of the Bold home ("Popular now").
class CourseFeatureCard extends StatelessWidget {
  const CourseFeatureCard({
    super.key,
    required this.course,
    required this.onTap,
  });

  final CourseSummary course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: _a11yLabel(course),
      excludeSemantics: true,
      child: Material(
        color: p.surface,
        borderRadius: BorderRadius.circular(22),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              AppNetworkImage(
                url: course.imageUrl,
                seed: seedFor(course),
                height: 150,
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            course.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: p.text,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            courseMeta(course),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 13,
                              color: p.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    if (course.enrolled)
                      const EnrolledLabel()
                    else
                      DefaultTextStyle.merge(
                        style: const TextStyle(fontWeight: FontWeight.w800),
                        child: PriceLabel(course.price),
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

/// The compact row of the Minimal home.
class CourseRow extends StatelessWidget {
  const CourseRow({
    super.key,
    required this.course,
    required this.onTap,
    this.showDivider = true,
  });

  final CourseSummary course;
  final VoidCallback onTap;
  final bool showDivider;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      button: true,
      label: _a11yLabel(course),
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            border: showDivider
                ? Border(bottom: BorderSide(color: p.divider))
                : null,
          ),
          child: Row(
            children: [
              AppNetworkImage(
                url: course.imageUrl,
                seed: seedFor(course),
                width: 52,
                height: 52,
                radius: 10,
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      course.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      courseMeta(course),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 13, color: p.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              if (course.enrolled)
                const EnrolledLabel()
              else
                PriceLabel(course.price, size: 14),
            ],
          ),
        ),
      ),
    );
  }
}

String nextLabel(MyCourse course) {
  final next = course.nextItem;
  return next == null ? '' : next.title;
}

/// The dark "Continue learning" card of the Classic home.
class ContinueCardClassic extends StatelessWidget {
  const ContinueCardClassic({
    super.key,
    required this.course,
    required this.onTap,
  });

  final MyCourse course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final progress = course.progress;
    final next = nextLabel(course);
    return Semantics(
      button: true,
      label:
          'Continue ${course.course.title}, ${progress.percent}% complete'
          '${next.isEmpty ? '' : ', next: $next'}',
      excludeSemantics: true,
      child: Material(
        color: p.primary,
        borderRadius: BorderRadius.circular(18),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: p.primarySoft,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      alignment: Alignment.center,
                      child: AppIcon(
                        AppIcons.playCircle,
                        size: 28,
                        color: p.onPrimarySoft,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            course.course.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: p.onPrimary,
                            ),
                          ),
                          if (next.isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text(
                              next,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                color: p.onPrimary.withValues(alpha: 0.78),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                ProgressTrack(
                  percent: progress.percent,
                  track: p.onPrimary.withValues(alpha: 0.2),
                  fill: p.onPrimary,
                ),
                const SizedBox(height: 6),
                DefaultTextStyle(
                  style: TextStyle(
                    fontSize: 12,
                    color: p.onPrimary.withValues(alpha: 0.78),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Text(
                          '${progress.completedItems} of ${progress.totalItems} lessons',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text('${progress.percent}%'),
                    ],
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

/// The white card with a progress ring of the Bold home.
class ContinueCardBold extends StatelessWidget {
  const ContinueCardBold({
    super.key,
    required this.course,
    required this.onTap,
  });

  final MyCourse course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final percent = course.progress.percent;
    return Semantics(
      button: true,
      label: 'Continue ${course.course.title}, $percent% complete',
      excludeSemantics: true,
      child: Material(
        color: p.surface,
        borderRadius: BorderRadius.circular(22),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                SizedBox(
                  width: 56,
                  height: 56,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      CircularProgressIndicator(
                        value: percent / 100,
                        strokeWidth: 5,
                        color: p.accent,
                        backgroundColor: p.accentSoft,
                        strokeCap: StrokeCap.round,
                      ),
                      Center(
                        child: Text(
                          '$percent%',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: p.text,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Continue',
                        style: TextStyle(fontSize: 12, color: p.textSecondary),
                      ),
                      Text(
                        course.course.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: p.primary,
                    shape: BoxShape.circle,
                  ),
                  alignment: Alignment.center,
                  child: AppIcon(
                    AppIcons.play,
                    size: 18,
                    color: p.onPrimary,
                    filled: true,
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

/// The quiet "CONTINUE" panel of the Minimal home.
class ContinueCardMinimal extends StatelessWidget {
  const ContinueCardMinimal({
    super.key,
    required this.course,
    required this.onTap,
  });

  final MyCourse course;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final percent = course.progress.percent;
    final next = nextLabel(course);
    return Semantics(
      button: true,
      label: 'Continue ${course.course.title}, $percent% complete',
      excludeSemantics: true,
      child: Material(
        color: p.surfaceMuted,
        borderRadius: BorderRadius.circular(14),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'CONTINUE',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1,
                          color: p.textSecondary,
                        ),
                      ),
                    ),
                    Text(
                      '$percent%',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  course.course.title,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
                if (next.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    next,
                    style: TextStyle(fontSize: 14, color: p.textSecondary),
                  ),
                ],
                const SizedBox(height: 10),
                ProgressTrack(
                  percent: percent,
                  height: 3,
                  rounded: false,
                  track: p.border,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
