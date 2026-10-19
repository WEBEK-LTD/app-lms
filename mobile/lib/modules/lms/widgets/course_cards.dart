import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/format/dates.dart';
import '../data/lms_providers.dart';

String courseMeta(CourseSummary course) {
  final lessons = currentL10n.lessonCount(course.lessonCount);
  final instructor = course.instructor?.name;
  return instructor == null || instructor.isEmpty
      ? lessons
      : '$instructor · $lessons';
}

String _a11yLabel(CourseSummary course) {
  final parts = [
    course.title,
    courseMeta(course),
    if (course.enrolled) currentL10n.enrolled else course.price.label,
    if (course.rating != null)
      currentL10n.ratedOutOf5(course.rating!.toStringAsFixed(1)),
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
              radius: context.shapes.r(12),
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
                            ? EnrolledLabel(courseId: course.id)
                            : PriceLabel(course.price),
                      ),
                      if (course.rating != null)
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

/// "Enrolled", or 45 "Completed" once the student finished the course.
class EnrolledLabel extends ConsumerWidget {
  const EnrolledLabel({super.key, this.courseId});

  final int? courseId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final completed =
        courseId != null &&
        (ref.watch(completedCourseIdsProvider).value?.contains(courseId) ??
            false);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        AppIcon(
          completed ? AppIcons.checkCircle : AppIcons.check,
          size: 14,
          color: p.success,
          filled: completed,
        ),
        const SizedBox(width: 4),
        Flexible(
          child: Text(
            completed ? context.l10n.completed : context.l10n.enrolled,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: p.success,
            ),
          ),
        ),
      ],
    );
  }
}

class RatingLabel extends StatelessWidget {
  const RatingLabel(this.rating, {super.key, this.count = 0});

  final double rating;

  /// Shown in brackets after the rating when more than zero.
  final int count;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        AppIcon(AppIcons.star, size: 14, color: p.star, filled: true),
        const SizedBox(width: 4),
        Text(
          count > 0
              ? '${rating.toStringAsFixed(1)} ($count)'
              : rating.toStringAsFixed(1),
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
                          context.l10n.lessonCount(course.lessonCount),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 12, color: p.textSecondary),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: course.enrolled
                              ? EnrolledLabel(courseId: course.id)
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
        shape: context.cardShape(22),
        elevation: context.cardElevation,
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
                      EnrolledLabel(courseId: course.id)
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
                radius: context.shapes.r(10),
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
                EnrolledLabel(courseId: course.id)
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
  // 45 A finished course says so, with the date when known.
  if (course.progress.courseCompleted) return completedLine(course.progress);
  final next = course.nextItem;
  return next == null ? '' : next.title;
}

/// 45 "Completed on 12 Oct 2026", or "Completed".
String completedLine(Progress progress) {
  final date = progress.completedAt;
  return date == null
      ? currentL10n.completed
      : currentL10n.courseCompletedOn(shortDate(date));
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
      label: progress.courseCompleted
          ? context.l10n.completedCourseLabel(course.course.title)
          : next.isEmpty
          ? context.l10n.continueCourseLabel(
              course.course.title,
              progress.percent,
            )
          : context.l10n.continueCourseNextLabel(
              course.course.title,
              progress.percent,
              next,
            ),
      excludeSemantics: true,
      child: Material(
        color: p.primary,
        shape: context.cardShape(18),
        elevation: context.cardElevation,
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
                    SizedBox(
                      width: 64,
                      height: 64,
                      child: Stack(
                        fit: StackFit.expand,
                        children: [
                          AppNetworkImage(
                            url: course.course.imageUrl,
                            seed: seedFor(course.course),
                            radius: context.shapes.r(14),
                          ),
                          Center(
                            child: Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: p.primary.withValues(alpha: 0.72),
                                shape: BoxShape.circle,
                              ),
                              alignment: Alignment.center,
                              child: AppIcon(
                                AppIcons.play,
                                size: 20,
                                filled: true,
                                color: p.onPrimary,
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
                  // Ember when it shows on the card, else the card's text.
                  fill: contrastRatio(p.accent, p.primary) >= 3
                      ? p.accent
                      : p.onPrimary,
                ),
                const SizedBox(height: 8),
                DefaultTextStyle.merge(
                  style: TextStyle(
                    fontSize: 12,
                    color: p.onPrimary.withValues(alpha: 0.78),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Flexible(
                        child: Text(
                          context.l10n.lessonsDone(
                            progress.completedItems,
                            progress.totalItems,
                          ),
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
    final finished = course.progress.courseCompleted;
    return Semantics(
      button: true,
      label: finished
          ? context.l10n.completedCourseLabel(course.course.title)
          : context.l10n.continueCourseLabel(course.course.title, percent),
      excludeSemantics: true,
      child: Material(
        color: p.surface,
        shape: context.cardShape(22),
        elevation: context.cardElevation,
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
                        finished
                            ? completedLine(course.progress)
                            : context.l10n.continueAction,
                        style: TextStyle(
                          fontSize: 12,
                          color: finished ? p.success : p.textSecondary,
                        ),
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
                    finished ? AppIcons.review : AppIcons.play,
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
    final finished = course.progress.courseCompleted;
    return Semantics(
      button: true,
      label: finished
          ? context.l10n.completedCourseLabel(course.course.title)
          : context.l10n.continueCourseLabel(course.course.title, percent),
      excludeSemantics: true,
      child: Material(
        color: p.surfaceMuted,
        shape: context.cardShape(14),
        elevation: context.cardElevation,
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
                        (finished
                                ? context.l10n.completed
                                : context.l10n.continueAction)
                            .toUpperCase(),
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
