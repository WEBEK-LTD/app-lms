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
import '../data/lms_providers.dart';
import '../lesson/content/html_content.dart';
import '../navigation.dart';
import '../../../core/l10n/l10n.dart';

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
  int _tab = 1;
  bool? _wishlisted;
  bool _busy = false;
  bool _awaitingCheckout = false;

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

  void _continue(List<Topic>? topics, CourseDetail course) {
    final items = [for (final t in topics ?? const <Topic>[]) ...t.items];
    final next =
        items.where((i) => !i.completed && !i.locked).firstOrNull ??
        items.where((i) => !i.locked).firstOrNull;
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
    final tab = _tab.clamp(0, tabs.length - 1);

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
                        if (config.features.wishlist)
                          PositionedDirectional(
                            top: MediaQuery.paddingOf(context).top + 16,
                            end: 20,
                            child: SquareIconButton(
                              icon: AppIcons.favorite,
                              filled: wishlisted,
                              foreground: wishlisted ? p.link : p.text,
                              bordered: false,
                              label: wishlisted
                                  ? l10n.removeFromWishlist
                                  : l10n.addToWishlist,
                              onPressed: () => _toggleWishlist(course),
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
    final bio = course.instructor?.bio;
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

class _Curriculum extends ConsumerWidget {
  const _Curriculum({required this.topics, required this.courseId});

  final AsyncValue<List<Topic>> topics;
  final int courseId;

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
            _TopicCard(topic: topic, courseId: courseId),
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
  const _TopicCard({required this.topic, required this.courseId});

  final Topic topic;
  final int courseId;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final lessons = topic.items
        .where((i) => i.type == CurriculumItemType.lesson)
        .length;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            color: p.surfaceMuted,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text(
                      topic.title,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                  ),
                ),
                Text(
                  context.l10n.lessonCount(lessons),
                  style: TextStyle(fontSize: 12, color: p.textSecondary),
                ),
              ],
            ),
          ),
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
    required this.onContinue,
    required this.onEnrollFree,
    required this.onCheckout,
  });

  final CourseDetail course;
  final CourseCta cta;
  final bool busy;
  final VoidCallback onContinue;
  final VoidCallback onEnrollFree;
  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    switch (cta) {
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
