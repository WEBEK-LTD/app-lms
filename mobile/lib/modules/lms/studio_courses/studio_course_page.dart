import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/models/models.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/share_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/common.dart';
import '../../../core/format/dates.dart';
import '../courses/course_questions.dart';
import '../courses/course_reviews.dart';
import '../data/lms_providers.dart';
import '../lesson/content/html_content.dart';
import '../navigation.dart';
import '../teachers/follow_button.dart';
import 'course_look_kit.dart';

/// 130.52 A course's page in the course screens' look (`Config.screens.
/// courses.page`): its hero (`cinema` the cover full bleed under a scrim
/// with the course on it, `framed` a rounded photo on the page, `split`
/// the photo over an editorial panel with the facts in columns), then the
/// teacher's profile, what you'll learn, the curriculum as a timeline
/// (done, the student's place, locked), the reviews with their summary
/// and the description, each the course's own and left out without it.
/// The enrol bar is the page's own (course_detail_screen.dart), in the
/// look's style, with the course's real price.

class StudioCourseHero extends StatelessWidget {
  const StudioCourseHero({
    super.key,
    required this.course,
    required this.look,
    required this.onBack,
    this.wishlisted,
    this.onWishlist,
  });

  final CourseDetail course;
  final CourseScreensLook look;
  final VoidCallback onBack;

  /// Null where the wishlist is off.
  final bool? wishlisted;
  final VoidCallback? onWishlist;

  @override
  Widget build(BuildContext context) {
    final colors = CourseLookColors.of(context, look);
    return switch (look.page.hero) {
      CoursePageHero.cinema => _Cinema(hero: this, colors: colors),
      CoursePageHero.framed => _Framed(hero: this, colors: colors),
      CoursePageHero.split => _Split(hero: this, colors: colors),
    };
  }

  /// The way back, the share and the wishlist, on glass over a photo.
  Widget buttons(BuildContext context, {required bool onPhoto}) {
    final l10n = context.l10n;
    final p = context.palette;
    return Row(
      children: [
        CourseRoundButton(
          key: const ValueKey('studio-course-back'),
          icon: Symbols.arrow_back_rounded,
          label: l10n.back,
          onPhoto: onPhoto,
          onPressed: onBack,
        ),
        const Spacer(),
        ShareLinkButton(
          kind: 'course',
          id: course.id,
          title: course.title,
          bordered: false,
          onImage: true,
          size: 42,
          background: onPhoto
              ? Colors.black.withValues(alpha: 0.32)
              : p.surface,
          foreground: onPhoto ? Colors.white : p.text,
        ),
        if (wishlisted != null) ...[
          const SizedBox(width: 8),
          CourseRoundButton(
            key: const ValueKey('studio-course-wishlist'),
            icon: Symbols.favorite_rounded,
            filled: wishlisted!,
            color: wishlisted! ? const Color(0xFFFF4D67) : null,
            label: wishlisted! ? l10n.removeFromWishlist : l10n.addToWishlist,
            onPhoto: onPhoto,
            onPressed: onWishlist,
          ),
        ],
      ],
    );
  }

  /// The course's facts: lessons, length, students, level.
  List<(IconData, String)> facts(BuildContext context) {
    final l10n = context.l10n;
    return [
      if (course.lessonCount > 0)
        (Symbols.play_lesson_rounded, l10n.lessonCount(course.lessonCount)),
      if (course.durationMinutes case final m? when m > 0)
        (Symbols.schedule_rounded, formatMinutes(m)),
      if (course.studentCount case final s? when s > 0)
        (Symbols.group_rounded, l10n.studentCount(s)),
      if (course.level case final level? when level.trim().isNotEmpty)
        (Symbols.signal_cellular_alt_rounded, level),
      if (course.hasCertificate)
        (Symbols.workspace_premium_rounded, l10n.certificate),
    ];
  }

  String? get subject =>
      course.categories.isEmpty ? null : course.categories.first.name;

  bool get rated => course.rating != null && course.ratingCount > 0;
}

/// The cover full bleed under a scrim, the course over its foot.
class _Cinema extends StatelessWidget {
  const _Cinema({required this.hero, required this.colors});

  final StudioCourseHero hero;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final course = hero.course;
    final top = MediaQuery.paddingOf(context).top;
    const white = Colors.white;
    final facts = hero.facts(context);
    final teacher = course.instructor;
    return SizedBox(
      key: const ValueKey('studio-course-hero-cinema'),
      height: 470 + top,
      child: Stack(
        fit: StackFit.expand,
        children: [
          AppNetworkImage(
            url: course.introVideo?.posterUrl ?? course.imageUrl,
            seed: course.id,
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.45),
                  Colors.black.withValues(alpha: 0.05),
                  colors.ink.withValues(alpha: 0.8),
                  colors.ink,
                ],
                stops: const [0, 0.3, 0.72, 1],
              ),
            ),
          ),
          PositionedDirectional(
            top: top + 12,
            start: 16,
            end: 16,
            child: hero.buttons(context, onPhoto: true),
          ),
          PositionedDirectional(
            start: 20,
            end: 20,
            bottom: 26,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    if (colors.look.look == CourseLook.onAir &&
                        course.badge != null)
                      CourseTag(
                        course.badge == CourseBadge.fresh
                            ? context.l10n.courseBadgeNew.toUpperCase()
                            : context.l10n.courseBadgeBestseller.toUpperCase(),
                        background: colors.live,
                        color: white,
                      ),
                    if (hero.subject != null)
                      CourseTag(
                        hero.subject!,
                        background: colors.accent,
                        color: colors.onAccent,
                      ),
                  ],
                ),
                const SizedBox(height: 12),
                Semantics(
                  header: true,
                  child: Text(
                    course.title,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 30,
                      height: 1.15,
                      fontWeight: FontWeight.w800,
                      color: white,
                    ),
                  ),
                ),
                if (hero.rated) ...[
                  const SizedBox(height: 12),
                  CourseStars(
                    rating: course.rating!,
                    count: course.ratingCount,
                    size: 16,
                    color: colors.accent,
                    textColor: white,
                  ),
                ],
                if (facts.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  Wrap(
                    spacing: 14,
                    runSpacing: 8,
                    children: [
                      for (final (icon, label) in facts)
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(icon, size: 16, color: colors.accent),
                            const SizedBox(width: 5),
                            Text(
                              label,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: white.withValues(alpha: 0.9),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                ],
                if (teacher != null && teacher.name.trim().isNotEmpty) ...[
                  const SizedBox(height: 16),
                  CourseGlass(
                    radius: 999,
                    padding: const EdgeInsetsDirectional.fromSTEB(4, 4, 14, 4),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        InitialsAvatar(
                          name: teacher.name,
                          imageUrl: teacher.avatarUrl,
                          size: 30,
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: Text(
                            teacher.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: white,
                            ),
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

/// A rounded photo on the page, the course under it.
class _Framed extends StatelessWidget {
  const _Framed({required this.hero, required this.colors});

  final StudioCourseHero hero;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final course = hero.course;
    final top = MediaQuery.paddingOf(context).top;
    final facts = hero.facts(context);
    return Padding(
      key: const ValueKey('studio-course-hero-framed'),
      padding: EdgeInsets.fromLTRB(18, top + 10, 18, 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          hero.buttons(context, onPhoto: false),
          const SizedBox(height: 14),
          DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(30),
              boxShadow: [
                BoxShadow(
                  color: colors.accent.withValues(
                    alpha: p.isDark ? 0.18 : 0.28,
                  ),
                  blurRadius: 34,
                  offset: const Offset(0, 16),
                ),
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(30),
              child: AspectRatio(
                aspectRatio: 16 / 11,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    AppNetworkImage(
                      url: course.introVideo?.posterUrl ?? course.imageUrl,
                      seed: course.id,
                    ),
                    if (hero.subject != null)
                      PositionedDirectional(
                        top: 14,
                        start: 14,
                        child: CourseGlass(
                          radius: 999,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          child: Text(
                            hero.subject!,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 18),
          Semantics(
            header: true,
            child: Text(
              course.title,
              style: TextStyle(
                fontSize: 26,
                height: 1.2,
                fontWeight: FontWeight.w800,
                color: p.text,
              ),
            ),
          ),
          if (hero.rated) ...[
            const SizedBox(height: 10),
            CourseStars(
              rating: course.rating!,
              count: course.ratingCount,
              size: 16,
              color: colors.accent,
            ),
          ],
          if (facts.isNotEmpty) ...[
            const SizedBox(height: 14),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final (icon, label) in facts)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: colors.accentSoft,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(icon, size: 16, color: colors.accent),
                        const SizedBox(width: 6),
                        Text(
                          label,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: p.text,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

/// The photo over an editorial panel: the subject in small capitals, the
/// title large, the facts in columns between hairlines.
class _Split extends StatelessWidget {
  const _Split({required this.hero, required this.colors});

  final StudioCourseHero hero;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final course = hero.course;
    final top = MediaQuery.paddingOf(context).top;
    final facts = hero.facts(context).take(3).toList();
    return Column(
      key: const ValueKey('studio-course-hero-split'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SizedBox(
          height: 300 + top,
          child: Stack(
            fit: StackFit.expand,
            children: [
              AppNetworkImage(
                url: course.introVideo?.posterUrl ?? course.imageUrl,
                seed: course.id,
              ),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withValues(alpha: 0.4),
                      Colors.transparent,
                    ],
                    stops: const [0, 0.45],
                  ),
                ),
              ),
              PositionedDirectional(
                top: top + 12,
                start: 16,
                end: 16,
                child: hero.buttons(context, onPhoto: true),
              ),
            ],
          ),
        ),
        Transform.translate(
          offset: const Offset(0, -28),
          child: Container(
            padding: const EdgeInsets.fromLTRB(22, 22, 22, 4),
            decoration: BoxDecoration(
              color: p.background,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(28),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (hero.subject != null) ...[
                  Text(
                    hero.subject!.toUpperCase(),
                    style: TextStyle(
                      fontSize: 12,
                      letterSpacing: 2,
                      fontWeight: FontWeight.w800,
                      color: colors.accent,
                    ),
                  ),
                  const SizedBox(height: 10),
                ],
                Semantics(
                  header: true,
                  child: Text(
                    course.title,
                    style: TextStyle(
                      fontSize: 30,
                      height: 1.12,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.4,
                      color: p.text,
                    ),
                  ),
                ),
                if (hero.rated) ...[
                  const SizedBox(height: 12),
                  CourseStars(
                    rating: course.rating!,
                    count: course.ratingCount,
                    size: 15,
                    color: colors.accent,
                  ),
                ],
                if (facts.isNotEmpty) ...[
                  const SizedBox(height: 18),
                  Divider(height: 1, color: colors.line),
                  IntrinsicHeight(
                    child: Row(
                      children: [
                        for (final (i, (icon, label)) in facts.indexed) ...[
                          if (i > 0)
                            VerticalDivider(width: 1, color: colors.line),
                          Expanded(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                vertical: 14,
                                horizontal: 6,
                              ),
                              child: Column(
                                children: [
                                  Icon(icon, size: 20, color: colors.accent),
                                  const SizedBox(height: 6),
                                  Text(
                                    label,
                                    textAlign: TextAlign.center,
                                    maxLines: 2,
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w700,
                                      color: p.text,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  Divider(height: 1, color: colors.line),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// The page's sections under the hero, each the course's own.
class StudioCourseSections extends ConsumerWidget {
  const StudioCourseSections({
    super.key,
    required this.course,
    required this.topics,
    required this.look,
    required this.reviews,
    required this.questions,
    this.onTeacher,
  });

  final CourseDetail course;
  final AsyncValue<List<Topic>> topics;
  final CourseScreensLook look;

  /// The academy has reviews on (and the owner shows them).
  final bool reviews;

  /// The student can ask questions on this course.
  final bool questions;
  final VoidCallback? onTeacher;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colors = CourseLookColors.of(context, look);
    final page = look.page;
    final l10n = context.l10n;
    var number = 0;
    final teacher = course.instructor;
    final learn = course.about.learn;
    final items = topics.value ?? const <Topic>[];
    final about = course.descriptionHtml.trim();
    final parts = <Widget>[
      if (page.shows(CoursePagePart.teacher) &&
          teacher != null &&
          teacher.name.trim().isNotEmpty) ...[
        CourseSectionTitle(l10n.instructor, colors: colors, number: ++number),
        const SizedBox(height: 12),
        _TeacherProfile(teacher: teacher, colors: colors, onTap: onTeacher),
      ],
      if (page.shows(CoursePagePart.learn) && learn.isNotEmpty) ...[
        CourseSectionTitle(l10n.courseLearn, colors: colors, number: ++number),
        const SizedBox(height: 12),
        _Learn(items: learn, colors: colors),
      ],
      if (page.shows(CoursePagePart.curriculum) &&
          items.any((t) => t.items.isNotEmpty)) ...[
        CourseSectionTitle(
          l10n.curriculum,
          colors: colors,
          number: ++number,
          trailing: Text(
            l10n.lessonCount(course.lessonCount),
            style: TextStyle(
              fontSize: 12.5,
              color: context.palette.textSecondary,
            ),
          ),
        ),
        const SizedBox(height: 14),
        StudioCurriculum(topics: items, courseId: course.id, colors: colors),
      ],
      if (page.shows(CoursePagePart.reviews) && reviews)
        _Reviews(courseId: course.id, colors: colors, number: ++number),
      if (page.shows(CoursePagePart.about) && about.isNotEmpty) ...[
        CourseSectionTitle(l10n.aboutCourse, colors: colors, number: ++number),
        const SizedBox(height: 10),
        HtmlContent(html: course.descriptionHtml),
      ],
      if (questions)
        _Link(
          key: const ValueKey('studio-course-questions'),
          icon: Symbols.forum_rounded,
          label: l10n.courseLookQuestions,
          colors: colors,
          onTap: () => _sheet(context, CourseQuestionsTab(courseId: course.id)),
        ),
    ];
    // Each section apart from the next.
    final spaced = <Widget>[];
    for (final w in parts) {
      final heading = w is CourseSectionTitle || w is _Reviews || w is _Link;
      if (heading && spaced.isNotEmpty) spaced.add(const SizedBox(height: 28));
      spaced.add(w);
    }
    return Column(
      key: const ValueKey('studio-course-sections'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: spaced,
    );
  }
}

Future<void> _sheet(BuildContext context, Widget child) =>
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => FractionallySizedBox(
        heightFactor: 0.88,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
          children: [child],
        ),
      ),
    );

/// The teacher's profile: their photo in the accent's ring, their name,
/// their bio and following them.
class _TeacherProfile extends StatelessWidget {
  const _TeacherProfile({
    required this.teacher,
    required this.colors,
    this.onTap,
  });

  final Instructor teacher;
  final CourseLookColors colors;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final bio = teacher.bio?.trim();
    final index = colors.look.look == CourseLook.faculty;
    return Material(
      color: index ? Colors.transparent : colors.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(index ? 0 : 24),
        side: index ? BorderSide.none : BorderSide(color: colors.line),
      ),
      child: InkWell(
        key: const ValueKey('studio-course-teacher'),
        borderRadius: BorderRadius.circular(index ? 0 : 24),
        onTap: onTap,
        child: Padding(
          padding: EdgeInsets.all(index ? 0 : 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: SweepGradient(
                        colors: [
                          colors.accent,
                          Color.lerp(colors.accent, Colors.white, 0.45)!,
                          colors.accent,
                        ],
                      ),
                    ),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: p.surface, width: 2),
                      ),
                      child: InitialsAvatar(
                        name: teacher.name,
                        imageUrl: teacher.avatarUrl,
                        size: 54,
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          teacher.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: p.text,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          context.l10n.instructor,
                          style: TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w600,
                            color: colors.accent,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (teacher.following case final following?
                      when teacher.id > 0)
                    FollowButton(
                      instructorId: teacher.id,
                      name: teacher.name,
                      following: following,
                    )
                  else if (onTap != null)
                    AppIcon(
                      Symbols.arrow_forward_rounded,
                      size: 20,
                      color: p.textSecondary,
                    ),
                ],
              ),
              if (bio != null && bio.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  bio,
                  maxLines: 4,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 13.5,
                    height: 1.55,
                    color: p.textSecondary,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// What you'll learn: each with a check in the accent.
class _Learn extends StatelessWidget {
  const _Learn({required this.items, required this.colors});

  final List<String> items;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final index = colors.look.look == CourseLook.faculty;
    final rows = [
      for (final (i, text) in items.indexed)
        Padding(
          padding: EdgeInsets.only(top: i == 0 ? 0 : 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 24,
                height: 24,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: index ? Colors.transparent : colors.accent,
                  border: index ? Border.all(color: colors.accent) : null,
                ),
                child: index
                    ? Text(
                        '${i + 1}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: colors.accent,
                        ),
                      )
                    : Icon(
                        Symbols.check_rounded,
                        size: 16,
                        weight: 700,
                        color: colors.onAccent,
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  text,
                  style: TextStyle(fontSize: 14.5, height: 1.45, color: p.text),
                ),
              ),
            ],
          ),
        ),
    ];
    if (index) return Column(children: rows);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.accentSoft,
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(children: rows),
    );
  }
}

/// The curriculum as a timeline: the topics, and each item on a line, those
/// done in the accent with a check, the student's place ringed, the locked
/// with a lock; a tap opens one the student may open.
class StudioCurriculum extends StatelessWidget {
  const StudioCurriculum({
    super.key,
    required this.topics,
    required this.courseId,
    required this.colors,
  });

  final List<Topic> topics;
  final int courseId;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final here = nextItemToOpen(topics);
    final shown = topics.where((t) => t.items.isNotEmpty).toList();
    return Column(
      key: const ValueKey('studio-curriculum'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (ti, topic) in shown.indexed) ...[
          if (ti > 0) const SizedBox(height: 18),
          Row(
            children: [
              Text(
                (ti + 1).toString().padLeft(2, '0'),
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: colors.accent,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  topic.title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
              ),
              Text(
                context.l10n.lessonsDoneOf(
                  topic.items.where((i) => i.completed).length,
                  topic.items.length,
                ),
                style: TextStyle(fontSize: 12, color: p.textSecondary),
              ),
            ],
          ),
          const SizedBox(height: 8),
          for (final (i, item) in topic.items.indexed)
            _Node(
              item: item,
              courseId: courseId,
              colors: colors,
              here: here?.id == item.id && here?.type == item.type,
              first: i == 0,
              last: i == topic.items.length - 1,
            ),
        ],
      ],
    );
  }
}

class _Node extends StatelessWidget {
  const _Node({
    required this.item,
    required this.courseId,
    required this.colors,
    required this.here,
    required this.first,
    required this.last,
  });

  final CurriculumItem item;
  final int courseId;
  final CourseLookColors colors;
  final bool here;
  final bool first;
  final bool last;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final done = item.completed;
    final locked = item.locked;
    final line = colors.track;
    final kind = switch (item.type) {
      CurriculumItemType.quiz => Symbols.quiz_rounded,
      CurriculumItemType.assignment => Symbols.assignment_rounded,
      CurriculumItemType.live => Symbols.live_tv_rounded,
      CurriculumItemType.lesson => Symbols.play_arrow_rounded,
    };
    final detail =
        item.type == CurriculumItemType.quiz && item.questionCount != null
        ? l10n.questionCount(item.questionCount!)
        : item.durationMinutes != null && item.durationMinutes! > 0
        ? formatMinutes(item.durationMinutes!)
        : item.type == CurriculumItemType.live && item.startsAt != null
        ? dayAndTime(item.startsAt!)
        : null;
    final dot = Container(
      width: 26,
      height: 26,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: done
            ? colors.accent
            : here
            ? p.surface
            : p.background,
        border: Border.all(
          color: done || here ? colors.accent : line,
          width: here ? 2.5 : 1.5,
        ),
        boxShadow: here
            ? [
                BoxShadow(
                  color: colors.accent.withValues(alpha: 0.35),
                  blurRadius: 10,
                ),
              ]
            : null,
      ),
      child: Icon(
        done
            ? Symbols.check_rounded
            : locked
            ? Symbols.lock_rounded
            : kind,
        size: 14,
        weight: 700,
        fill: here ? 1 : 0,
        color: done
            ? colors.onAccent
            : here
            ? colors.accent
            : p.textSecondary,
      ),
    );
    final open = !(locked && item.lockedReason != LockedReason.previousNotDone);
    return Semantics(
      button: open,
      label: [
        item.title,
        if (done) l10n.completedLower,
        if (locked) l10n.lockedLower,
        if (here) l10n.courseLookYouAreHere,
        ?detail,
      ].join(', '),
      excludeSemantics: true,
      child: InkWell(
        key: ValueKey('studio-curriculum-${item.type.name}-${item.id}'),
        borderRadius: BorderRadius.circular(14),
        onTap: open
            ? () => openCurriculumItem(context, item, courseId: courseId)
            : null,
        child: IntrinsicHeight(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(
                width: 30,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Column(
                      children: [
                        Expanded(
                          child: Container(
                            width: 2,
                            color: first ? Colors.transparent : line,
                          ),
                        ),
                        Expanded(
                          child: Container(
                            width: 2,
                            color: last ? Colors.transparent : line,
                          ),
                        ),
                      ],
                    ),
                    dot,
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  child: Container(
                    padding: here
                        ? const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          )
                        : EdgeInsets.zero,
                    decoration: here
                        ? BoxDecoration(
                            color: colors.accentSoft,
                            borderRadius: BorderRadius.circular(14),
                          )
                        : null,
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (here)
                                Text(
                                  l10n.courseLookYouAreHere,
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: colors.accent,
                                  ),
                                ),
                              Text(
                                item.title,
                                style: TextStyle(
                                  fontSize: 14.5,
                                  height: 1.35,
                                  fontWeight: here
                                      ? FontWeight.w800
                                      : FontWeight.w600,
                                  color: locked ? p.textSecondary : p.text,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (item.preview && !locked)
                          CourseTag(
                            l10n.freePreview,
                            background: colors.accentSoft,
                            color: colors.accent,
                          )
                        else if (detail != null)
                          Text(
                            detail,
                            style: TextStyle(
                              fontSize: 12,
                              color: p.textSecondary,
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// The reviews: their summary (the rating large, its stars and count, a
/// bar per star) and the newest as cards to swipe, with all of them a tap
/// away. Nothing without reviews.
class _Reviews extends ConsumerWidget {
  const _Reviews({
    required this.courseId,
    required this.colors,
    required this.number,
  });

  final int courseId;
  final CourseLookColors colors;
  final int number;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final state = ref.watch(courseReviewsProvider(courseId));
    final summary = state.head?.summary;
    final list = state.items
        .where(
          (r) => r.status == ReviewStatus.approved && r.text.trim().isNotEmpty,
        )
        .take(6)
        .toList();
    if (summary == null || summary.ratingCount == 0 || summary.rating == null) {
      return const SizedBox.shrink();
    }
    final most = summary.counts.values.fold<int>(1, (a, b) => b > a ? b : a);
    return Column(
      key: const ValueKey('studio-course-reviews'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        CourseSectionTitle(
          l10n.reviews,
          colors: colors,
          number: number,
          trailing: TextButton(
            key: const ValueKey('studio-course-all-reviews'),
            onPressed: () =>
                _sheet(context, CourseReviewsTab(courseId: courseId)),
            child: Text(
              l10n.courseLookAllReviews,
              style: TextStyle(
                fontWeight: FontWeight.w800,
                color: colors.accent,
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  summary.rating!.toStringAsFixed(1),
                  style: TextStyle(
                    fontSize: 44,
                    height: 1,
                    fontWeight: FontWeight.w800,
                    color: p.text,
                  ),
                ),
                const SizedBox(height: 6),
                CourseStars(
                  rating: summary.rating!,
                  size: 15,
                  color: colors.accent,
                  showNumber: false,
                ),
                const SizedBox(height: 4),
                Text(
                  l10n.ratingCount(summary.ratingCount),
                  style: TextStyle(fontSize: 12, color: p.textSecondary),
                ),
              ],
            ),
            const SizedBox(width: 22),
            Expanded(
              child: Column(
                children: [
                  for (var star = 5; star >= 1; star--)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2.5),
                      child: Row(
                        children: [
                          SizedBox(
                            width: 14,
                            child: Text(
                              '$star',
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: p.textSecondary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: CourseProgressBar(
                              value: (summary.counts[star] ?? 0) / most,
                              color: colors.accent,
                              track: colors.track,
                              height: 5,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
        if (list.isNotEmpty) ...[
          const SizedBox(height: 16),
          SizedBox(
            height: 168,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: list.length,
              separatorBuilder: (_, _) => const SizedBox(width: 12),
              itemBuilder: (context, i) =>
                  _ReviewCard(review: list[i], colors: colors),
            ),
          ),
        ],
      ],
    );
  }
}

class _ReviewCard extends StatelessWidget {
  const _ReviewCard({required this.review, required this.colors});

  final Review review;
  final CourseLookColors colors;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      width: 270,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colors.card,
        borderRadius: BorderRadius.circular(
          colors.look.look == CourseLook.faculty ? 14 : 22,
        ),
        border: Border.all(color: colors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              InitialsAvatar(
                name: review.author.name,
                imageUrl: review.author.avatarUrl,
                size: 34,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      review.author.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: p.text,
                      ),
                    ),
                    CourseStars(
                      rating: review.rating.toDouble(),
                      size: 12,
                      color: colors.accent,
                      showNumber: false,
                    ),
                  ],
                ),
              ),
              Icon(
                Symbols.format_quote_rounded,
                size: 26,
                fill: 1,
                color: colors.accent.withValues(alpha: 0.5),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Expanded(
            child: Text(
              review.text.trim(),
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 13.5, height: 1.5, color: p.text),
            ),
          ),
        ],
      ),
    );
  }
}

/// A row opening more of the course (its questions).
class _Link extends StatelessWidget {
  const _Link({
    super.key,
    required this.icon,
    required this.label,
    required this.colors,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final CourseLookColors colors;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Material(
      color: colors.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: colors.line),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: colors.accentSoft,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 20, color: colors.accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w700,
                    color: p.text,
                  ),
                ),
              ),
              AppIcon(AppIcons.forward, color: p.textSecondary),
            ],
          ),
        ),
      ),
    );
  }
}

/// The teacher's page, where the academy has teachers' pages.
VoidCallback? teacherOpener(
  BuildContext context,
  Instructor? teacher,
  bool teachersOn,
) => teachersOn && teacher != null && teacher.id > 0
    ? () => context.push(Paths.teacherPage(teacher.id))
    : null;
