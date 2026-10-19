import 'course_questions.dart';
import 'course_reviews.dart';

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/purchase/purchase_rules.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../../core/format/dates.dart';
import '../data/lms_providers.dart';
import '../downloads/download_widgets.dart';
import '../lesson/content/html_content.dart';
import '../navigation.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/services/share_links.dart';

/// A course page with overview, curriculum, reviews summary, wishlist and
/// the main action decided by [resolveCourseCta] (design: CourseDetail).
class CourseDetailScreen extends ConsumerStatefulWidget {
  const CourseDetailScreen({super.key, required this.courseId});

  final int courseId;

  @override
  ConsumerState<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends ConsumerState<CourseDetailScreen>
    with WidgetsBindingObserver {
  /// The open tab; null until the student picks one.
  int? _tab;
  bool? _wishlisted;
  bool _busy = false;
  bool _awaitingCheckout = false;

  /// 50 The curriculum's open topics, by position; null until it loads.
  Set<int>? _openTopics;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Back from the browser checkout: check whether the student is enrolled.
    if (state == AppLifecycleState.resumed && _awaitingCheckout) {
      _awaitingCheckout = false;
      invalidateCourse(ref, widget.courseId);
    }
  }

  bool get _signedIn => ref.read(authControllerProvider).isSignedIn;

  void _signIn() => context.push(
    Uri(
      path: Paths.signIn,
      queryParameters: {'from': Paths.course(widget.courseId)},
    ).toString(),
  );

  Future<void> _toggleWishlist(CourseDetail course) async {
    if (!_signedIn) return _signIn();
    final next = !(_wishlisted ?? course.wishlisted);
    setState(() => _wishlisted = next);
    try {
      final api = ref.read(yallappApiProvider);
      if (next) {
        await api.addToWishlist(course.id);
      } else {
        await api.removeFromWishlist(course.id);
      }
      ref.invalidate(wishlistProvider);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _wishlisted = !next);
      showMessage(context, e.message);
    }
  }

  Future<void> _enrollFree(CourseDetail course) async {
    if (!_signedIn) return _signIn();
    setState(() => _busy = true);
    try {
      await ref.read(yallappApiProvider).enrollFree(course.id);
      if (!mounted) return;
      invalidateCourse(ref, course.id);
      showMessage(context, context.l10n.enrolledMessage);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _checkout(CourseDetail course) async {
    final env = ref.read(appEnvironmentProvider);
    // Never on iOS, whatever the server said.
    if (!canOpenCheckout(env.platform)) return;
    if (!_signedIn) return _signIn();
    setState(() => _busy = true);
    try {
      final link = await ref
          .read(yallappApiProvider)
          .createCheckoutLink(course.id);
      if (!mounted) return;
      final rules = ref.read(appConfigProvider).purchases;
      final inApp =
          link.openIn == CheckoutTarget.inApp &&
          rules.checkoutOpensIn != CheckoutOpensIn.browser;
      if (inApp) {
        await context.push(
          Paths.web,
          extra: WebPageArgs(url: link.url, title: context.l10n.checkout),
        );
        if (mounted) invalidateCourse(ref, course.id);
      } else {
        _awaitingCheckout = true;
        final opened = await openExternal(link.url);
        if (!opened && mounted) {
          _awaitingCheckout = false;
          showMessage(context, context.l10n.checkoutFailed);
        }
      }
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// 50 Topics start closed but for the one the student is at, the way
  /// Tutor LMS shows a course: every topic's title shows, and the student's
  /// place is open.
  Set<int> _topicsOpen(List<Topic> topics) =>
      _openTopics ??= {if (topics.isNotEmpty) currentTopicIndex(topics)};

  void _toggleTopic(List<Topic> topics, int index) => setState(() {
    final open = {..._topicsOpen(topics)};
    if (!open.remove(index)) open.add(index);
    _openTopics = open;
  });

  void _continue(List<Topic>? topics, CourseDetail course) {
    final next = nextItemToOpen(topics ?? const <Topic>[]);
    if (next == null) {
      setState(() => _tab = 1);
      return;
    }
    openCurriculumItem(context, next, courseId: course.id);
  }

  @override
  Widget build(BuildContext context) {
    final detail = ref.watch(courseDetailProvider(widget.courseId));
    return switch (detail) {
      AsyncData(:final value) => _build(context, value),
      AsyncError(:final error) => Scaffold(
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Padding(
                padding: EdgeInsets.all(16),
                child: AppBackButton(),
              ),
              Expanded(
                child: ErrorView(
                  error: error,
                  onRetry: () =>
                      ref.invalidate(courseDetailProvider(widget.courseId)),
                ),
              ),
            ],
          ),
        ),
      ),
      _ => Scaffold(body: SkeletonDetail(label: context.l10n.loadingCourse)),
    };
  }

  Widget _build(BuildContext context, CourseDetail course) {
    final p = context.palette;
    final config = ref.watch(appConfigProvider);
    final env = ref.watch(appEnvironmentProvider);
    final topics = ref.watch(curriculumProvider(course.id));
    final cta = resolveCourseCta(
      serverAction: course.purchaseAction,
      platform: env.platform,
      rules: config.purchases,
      enrolled: course.enrolled,
    );
    final wishlisted = _wishlisted ?? course.wishlisted;
    // 45 A finished course says so, and its button reviews the curriculum.
    final finished = courseFinished(course, topics.value);
    // Q&A is for enrolled students, when the site and the course have it on.
    final showQna =
        config.features.qna && (course.qna ?? true) && course.enrolled;
    final l10n = context.l10n;
    final tabs = [
      _CourseTab.overview,
      _CourseTab.curriculum,
      if (config.features.reviews) _CourseTab.reviews,
      if (showQna) _CourseTab.qna,
    ];
    // 30 Students start on the curriculum; visitors on the overview when it
    // says what the course teaches.
    final first = course.enrolled || course.about.isEmpty ? 1 : 0;
    final tab = (_tab ?? first).clamp(0, tabs.length - 1);

    return Scaffold(
      body: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                invalidateCourse(ref, course.id);
                ref
                  ..invalidate(courseReviewsProvider(course.id))
                  ..invalidate(courseQuestionsProvider(course.id));
                await ref.read(courseDetailProvider(course.id).future);
              },
              child: ListView(
                padding: EdgeInsets.zero,
                children: [
                  SizedBox(
                    height: 220 + MediaQuery.paddingOf(context).top,
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        AppNetworkImage(
                          url: course.introVideo?.posterUrl ?? course.imageUrl,
                          seed: course.id,
                        ),
                        const HeroScrim(),
                        PositionedDirectional(
                          top: MediaQuery.paddingOf(context).top + 16,
                          start: 20,
                          child: const AppBackButton(),
                        ),
                        PositionedDirectional(
                          top: MediaQuery.paddingOf(context).top + 16,
                          end: 20,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // 46 A link that opens the course in the app.
                              ShareLinkButton(
                                kind: 'course',
                                id: course.id,
                                title: course.title,
                                bordered: false,
                              ),
                              if (config.features.wishlist) ...[
                                const SizedBox(width: 4),
                                SquareIconButton(
                                  icon: AppIcons.favorite,
                                  filled: wishlisted,
                                  foreground: wishlisted ? p.link : p.text,
                                  bordered: false,
                                  label: wishlisted
                                      ? l10n.removeFromWishlist
                                      : l10n.addToWishlist,
                                  onPressed: () => _toggleWishlist(course),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: readablePadding(context, top: 20, bottom: 20),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Semantics(
                          header: true,
                          child: Text(
                            course.title,
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                        ),
                        if (course.instructor != null) ...[
                          const SizedBox(height: 14),
                          _InstructorRow(instructor: course.instructor!),
                        ],
                        const SizedBox(height: 14),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            if (course.rating != null && course.ratingCount > 0)
                              _MetaChip(
                                '${course.rating!.toStringAsFixed(1)} · '
                                '${l10n.ratingCount(course.ratingCount)}',
                                icon: AppIcons.star,
                                iconColor: p.star,
                              ),
                            _MetaChip(
                              l10n.lessonCount(course.lessonCount),
                              icon: AppIcons.courses,
                            ),
                            if (course.durationMinutes != null)
                              _MetaChip(
                                formatMinutes(course.durationMinutes!),
                                icon: AppIcons.schedule,
                              ),
                            if ((course.studentCount ?? 0) > 0)
                              _MetaChip(
                                l10n.studentCount(course.studentCount!),
                                icon: AppIcons.group,
                              ),
                            if (course.level != null &&
                                course.level!.isNotEmpty)
                              _MetaChip(course.level!, icon: AppIcons.level),
                            if (course.hasCertificate)
                              _MetaChip(
                                l10n.certificate,
                                icon: AppIcons.certificate,
                              ),
                          ],
                        ),
                        if (finished) ...[
                          const SizedBox(height: 16),
                          CourseCompletedBanner(
                            completedAt: course.progress?.completedAt,
                            certificateUrl: course.certificateUrl,
                          ),
                        ],
                        if (course.enrolled) ...[
                          const SizedBox(height: 12),
                          CourseDownloadButton(
                            course: course,
                            topics: topics.value,
                          ),
                        ],
                        const SizedBox(height: 16),
                        SegmentedTabs(
                          labels: [
                            for (final t in tabs)
                              switch (t) {
                                _CourseTab.overview => l10n.overview,
                                _CourseTab.curriculum => l10n.curriculum,
                                _CourseTab.reviews => l10n.reviews,
                                _CourseTab.qna => l10n.questionsAndAnswers,
                              },
                          ],
                          selected: tab,
                          onChanged: (i) => setState(() => _tab = i),
                        ),
                        const SizedBox(height: 16),
                        switch (tabs[tab]) {
                          _CourseTab.overview => _Overview(course: course),
                          _CourseTab.reviews => CourseReviewsTab(
                            courseId: course.id,
                          ),
                          _CourseTab.qna => CourseQuestionsTab(
                            courseId: course.id,
                          ),
                          _CourseTab.curriculum => _Curriculum(
                            topics: topics,
                            courseId: course.id,
                            enrolled: course.enrolled,
                            open: switch (topics) {
                              AsyncData(:final value) => _topicsOpen(value),
                              _ => const {},
                            },
                            onToggle: (index) =>
                                _toggleTopic(topics.value ?? const [], index),
                          ),
                        },
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          _CtaBar(
            course: course,
            cta: cta,
            busy: _busy,
            finished: finished,
            onReview: () =>
                setState(() => _tab = tabs.indexOf(_CourseTab.curriculum)),
            onContinue: () => _continue(topics.value, course),
            onEnrollFree: () => _enrollFree(course),
            onCheckout: () => _checkout(course),
          ),
        ],
      ),
    );
  }
}

class _InstructorRow extends StatelessWidget {
  const _InstructorRow({required this.instructor});

  final Instructor instructor;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Row(
      children: [
        InitialsAvatar(
          name: instructor.name,
          imageUrl: instructor.avatarUrl,
          size: 40,
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              instructor.name,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: p.text,
              ),
            ),
            Text(
              context.l10n.instructor,
              style: TextStyle(fontSize: 12, color: p.textSecondary),
            ),
          ],
        ),
      ],
    );
  }
}

enum _CourseTab { overview, curriculum, reviews, qna }

/// A fact about the course (lessons, length, level) with its icon.
class _MetaChip extends StatelessWidget {
  const _MetaChip(this.label, {required this.icon, this.iconColor});

  final String label;
  final IconData icon;
  final Color? iconColor;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      constraints: const BoxConstraints(minHeight: 32),
      padding: const EdgeInsetsDirectional.fromSTEB(10, 6, 12, 6),
      decoration: BoxDecoration(
        color: p.surface,
        border: Border.all(color: p.border),
        borderRadius: BorderRadius.circular(context.shapes.chip),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          AppIcon(
            icon,
            size: 16,
            color: iconColor ?? p.textSecondary,
            filled: iconColor != null,
          ),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: p.text,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Overview extends StatelessWidget {
  const _Overview({required this.course});

  final CourseDetail course;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final bio = course.instructor?.bio;
    final about = course.about;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (course.descriptionHtml.trim().isEmpty)
          Text(
            context.l10n.noDescription,
            style: TextStyle(color: p.textSecondary),
          )
        else
          HtmlContent(html: course.descriptionHtml),
        for (final (title, lines, icon) in [
          (l10n.courseLearn, about.learn, AppIcons.checkCircle),
          (l10n.courseIncludes, about.includes, AppIcons.check),
          (l10n.courseRequirements, about.requirements, null),
          (l10n.courseAudience, about.audience, null),
        ])
          if (lines.isNotEmpty) ...[
            const SizedBox(height: 20),
            _AboutList(title: title, lines: lines, icon: icon),
          ],
        if (bio != null && bio.trim().isNotEmpty) ...[
          const SizedBox(height: 20),
          SectionHeader(title: context.l10n.aboutInstructor, size: 16),
          const SizedBox(height: 8),
          Text(
            bio,
            style: TextStyle(fontSize: 15, height: 1.6, color: p.textBody),
          ),
        ],
      ],
    );
  }
}

/// 30 One of the course's lists (what you'll learn, requirements...): a
/// heading, then one line per item with a tick or a bullet.
class _AboutList extends StatelessWidget {
  const _AboutList({required this.title, required this.lines, this.icon});

  final String title;
  final List<String> lines;

  /// The mark before each line; a bullet without one.
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final style = TextStyle(fontSize: 15, height: 1.5, color: p.textBody);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SectionHeader(title: title, size: 16),
        const SizedBox(height: 8),
        for (final line in lines)
          Padding(
            padding: const EdgeInsets.only(bottom: 6),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 24,
                  child: icon == null
                      ? Text('•', style: style.copyWith(color: p.textSecondary))
                      : Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: AppIcon(icon!, size: 18, color: p.success),
                        ),
                ),
                Expanded(child: Text(line, style: style)),
              ],
            ),
          ),
      ],
    );
  }
}

/// The curriculum the way the LMS groups it: one card per topic (Tutor LMS
/// topics, LearnPress and LearnDash sections, modules), each opening to its
/// lessons, quizzes and assignments (50).
class _Curriculum extends ConsumerWidget {
  const _Curriculum({
    required this.topics,
    required this.courseId,
    required this.enrolled,
    required this.open,
    required this.onToggle,
  });

  final AsyncValue<List<Topic>> topics;
  final int courseId;
  final bool enrolled;

  /// 50 The open topics, by position.
  final Set<int> open;
  final ValueChanged<int> onToggle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    return switch (topics) {
      AsyncData(:final value) when value.isEmpty => Padding(
        padding: const EdgeInsets.all(16),
        child: Text(
          context.l10n.curriculumEmpty,
          textAlign: TextAlign.center,
          style: TextStyle(color: p.textSecondary),
        ),
      ),
      AsyncData(:final value) => Column(
        children: [
          for (final (i, topic) in value.indexed) ...[
            if (i > 0) const SizedBox(height: 12),
            _TopicCard(
              key: ValueKey('topic-$i'),
              topic: topic,
              courseId: courseId,
              enrolled: enrolled,
              open: open.contains(i),
              onToggle: () => onToggle(i),
            ),
          ],
        ],
      ),
      AsyncError(:final error) => ErrorView(
        error: error,
        onRetry: () => ref.invalidate(curriculumProvider(courseId)),
      ),
      _ => SkeletonList(
        layout: SkeletonLayout.text,
        count: 3,
        padding: EdgeInsets.zero,
        label: context.l10n.loadingCurriculum,
      ),
    };
  }
}

class _TopicCard extends StatelessWidget {
  const _TopicCard({
    super.key,
    required this.topic,
    required this.courseId,
    required this.enrolled,
    required this.open,
    required this.onToggle,
  });

  final Topic topic;
  final int courseId;
  final bool enrolled;

  /// 50 Whether the topic shows its items; its header toggles it.
  final bool open;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final lessons = topic.items
        .where((i) => i.type == CurriculumItemType.lesson)
        .toList();
    final minutes = topic.items.fold<int>(
      0,
      (sum, i) => sum + (i.durationMinutes ?? 0),
    );
    final done = lessons.where((i) => i.completed).length;
    final finished = enrolled && lessons.isNotEmpty && done == lessons.length;
    final facts = [
      enrolled && lessons.isNotEmpty
          ? l10n.lessonsDone(done, lessons.length)
          : l10n.lessonCount(lessons.length),
      if (minutes > 0) formatMinutes(minutes),
    ].join(' · ');
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            expanded: open,
            label: '${topic.title}, $facts',
            excludeSemantics: true,
            child: Material(
              color: p.surfaceMuted,
              child: InkWell(
                onTap: onToggle,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 56),
                  child: Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      16,
                      12,
                      12,
                      12,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                topic.title,
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: p.text,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                facts,
                                style: TextStyle(
                                  fontSize: 12,
                                  color: p.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                        if (finished) ...[
                          AppIcon(
                            AppIcons.checkCircle,
                            size: 20,
                            color: p.success,
                            filled: true,
                          ),
                          const SizedBox(width: 8),
                        ],
                        AnimatedRotation(
                          turns: open ? 0.5 : 0,
                          duration: const Duration(milliseconds: 200),
                          child: AppIcon(
                            AppIcons.expand,
                            size: 24,
                            color: p.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          if (open)
            for (final item in topic.items) ...[
              Divider(height: 1, color: p.divider),
              _CurriculumRow(item: item, courseId: courseId),
            ],
        ],
      ),
    );
  }
}

class _CurriculumRow extends StatelessWidget {
  const _CurriculumRow({required this.item, required this.courseId});

  final CurriculumItem item;
  final int courseId;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final icon = item.locked
        ? AppIcons.lock
        : item.completed
        ? AppIcons.checkCircle
        : switch (item.type) {
            CurriculumItemType.quiz => AppIcons.quiz,
            CurriculumItemType.assignment => AppIcons.assignment,
            CurriculumItemType.live => AppIcons.live,
            CurriculumItemType.lesson => AppIcons.playCircle,
          };
    final color = item.locked
        ? p.textSecondary
        : (item.completed ? p.success : p.text);
    final trailing =
        item.type == CurriculumItemType.quiz && item.questionCount != null
        ? context.l10n.questionCount(item.questionCount!)
        : (item.durationMinutes != null
              ? formatMinutes(item.durationMinutes!)
              : null);
    final freePreview = item.preview && !item.locked;
    return Semantics(
      button: !item.locked,
      label: [
        item.title,
        if (freePreview) context.l10n.freePreviewLower,
        if (item.locked) context.l10n.lockedLower,
        if (item.completed) context.l10n.completedLower,
        ?trailing,
      ].join(', '),
      excludeSemantics: true,
      child: InkWell(
        onTap: item.locked
            ? null
            : () => openCurriculumItem(context, item, courseId: courseId),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 48),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                AppIcon(icon, size: 22, color: color, filled: item.completed),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    item.title,
                    style: TextStyle(
                      fontSize: 14,
                      color: item.locked ? p.textSecondary : p.text,
                    ),
                  ),
                ),
                if (freePreview)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: p.successSoft,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      context.l10n.freePreview,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: p.success,
                      ),
                    ),
                  )
                else if (trailing != null)
                  Text(
                    trailing,
                    style: TextStyle(fontSize: 12, color: p.textSecondary),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CtaBar extends StatelessWidget {
  const _CtaBar({
    required this.course,
    required this.cta,
    required this.busy,
    required this.finished,
    required this.onReview,
    required this.onContinue,
    required this.onEnrollFree,
    required this.onCheckout,
  });

  final CourseDetail course;
  final CourseCta cta;
  final bool busy;

  /// 45 Every lesson is done: "Review course" opens the curriculum.
  final bool finished;
  final VoidCallback onReview;
  final VoidCallback onContinue;
  final VoidCallback onEnrollFree;
  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    switch (cta) {
      case CourseCta.continueLearning when finished:
        return BottomActionBar(
          child: PrimaryButton(
            key: const ValueKey('cta-review'),
            label: context.l10n.reviewCourse,
            icon: AppIcons.review,
            height: 54,
            onPressed: onReview,
          ),
        );
      case CourseCta.continueLearning:
        return BottomActionBar(
          child: PrimaryButton(
            key: const ValueKey('cta-continue'),
            label: context.l10n.continueLearning,
            icon: AppIcons.play,
            height: 54,
            onPressed: onContinue,
          ),
        );
      case CourseCta.enrollFree:
        return BottomActionBar(
          child: Row(
            children: [
              _PriceColumn(price: course.price),
              const SizedBox(width: 16),
              Expanded(
                child: PrimaryButton(
                  key: const ValueKey('cta-enroll-free'),
                  label: context.l10n.enrollForFree,
                  height: 54,
                  loading: busy,
                  onPressed: onEnrollFree,
                ),
              ),
            ],
          ),
        );
      case CourseCta.checkout:
        return BottomActionBar(
          child: Row(
            children: [
              _PriceColumn(price: course.price),
              const SizedBox(width: 16),
              Expanded(
                child: PrimaryButton(
                  key: const ValueKey('cta-checkout'),
                  label: context.l10n.enrollNow,
                  icon: AppIcons.cart,
                  height: 54,
                  loading: busy,
                  onPressed: onCheckout,
                ),
              ),
            ],
          ),
        );
      case CourseCta.unavailable:
        return BottomActionBar(
          key: const ValueKey('cta-unavailable'),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 22),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: p.divider,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: AppIcon(AppIcons.lock, size: 20, color: p.textSecondary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  context.l10n.errorPurchaseNotAllowed,
                  style: TextStyle(
                    fontSize: 14,
                    height: 1.5,
                    color: p.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        );
    }
  }
}

class _PriceColumn extends StatelessWidget {
  const _PriceColumn({required this.price});

  final Price price;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          context.l10n.coursePrice,
          style: TextStyle(fontSize: 12, color: p.textSecondary),
        ),
        PriceLabel(price, size: 20),
      ],
    );
  }
}

/// 45 "You've completed this course", with the date when known and the
/// certificate where the LMS has one.
class CourseCompletedBanner extends StatelessWidget {
  const CourseCompletedBanner({
    super.key,
    this.completedAt,
    this.certificateUrl,
  });

  final DateTime? completedAt;
  final String? certificateUrl;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final date = completedAt;
    final certificate = certificateUrl;
    return Container(
      key: const ValueKey('course-completed'),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: p.successSoft,
        borderRadius: BorderRadius.circular(context.shapes.r(14)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            container: true,
            child: Row(
              children: [
                AppIcon(
                  AppIcons.checkCircle,
                  size: 24,
                  color: p.success,
                  filled: true,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.courseCompletedTitle,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                      Text(
                        date == null
                            ? l10n.completed
                            : l10n.courseCompletedOn(shortDate(date)),
                        style: TextStyle(fontSize: 13, color: p.textBody),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (certificate != null) ...[
            const SizedBox(height: 12),
            SecondaryButton(
              key: const ValueKey('course-certificate'),
              label: l10n.viewCertificate,
              icon: AppIcons.certificate,
              height: 46,
              onPressed: () => openExternal(certificate),
            ),
          ],
        ],
      ),
    );
  }
}
