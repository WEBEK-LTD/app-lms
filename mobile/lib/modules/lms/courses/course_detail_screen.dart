import 'course_questions.dart';
import 'premium_course_parts.dart';
import 'course_reviews.dart';
import 'store_purchase_bars.dart';

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/purchase/purchase_rules.dart';
import '../../../core/purchase/store_billing.dart';
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
import '../downloads/progress_queue.dart';
import '../lesson/content/html_content.dart';
import '../navigation.dart';
import '../teachers/teachers_providers.dart';
import '../learning/course_learning.dart';
import '../widgets/bundle_cards.dart';
import '../cart/course_cart.dart';
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
    // 123 The premium academy's cart: the course joins the cart, which pays
    // for every course in it at once.
    final gate = ref.read(appGateProvider);
    if (ref.read(appConfigProvider).purchases.cart &&
        gate is GateReady &&
        (gate.config.screens?.has(ScreenLookKey.cart) ?? false)) {
      if (!ref.read(courseCartProvider.notifier).add(course.id)) {
        showMessage(context, context.l10n.cartFull);
        return;
      }
      await context.push(Paths.courseCart);
      if (mounted) invalidateCourse(ref, course.id);
      return;
    }
    // 112.5 A coupon first, when the academy takes them.
    String? coupon;
    if (course.takesCoupons) {
      final asked = await showModalBottomSheet<({String? code})>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (_) => CouponSheet(courseId: course.id),
      );
      if (asked == null || !mounted) return;
      coupon = asked.code;
    }
    setState(() => _busy = true);
    try {
      final link = await ref
          .read(yallappApiProvider)
          .createCheckoutLink(course.id, coupon: coupon);
      if (!mounted) return;
      // 113.1 A coupon made it free: enrolled already, nothing to pay.
      if (link.enrolled) {
        invalidateCourse(ref, course.id);
        showMessage(context, context.l10n.enrolledMessage);
        return;
      }
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

  /// 73 "Start the course again": asks first, clears the student's progress
  /// on the server (and what waits to be sent from this phone), then opens
  /// the first lesson.
  Future<void> _restart(CourseDetail course) async {
    final l10n = context.l10n;
    final confirmed = await confirmAction(
      context,
      title: l10n.startCourseAgainTitle,
      message: l10n.startCourseAgainMessage,
      confirmLabel: l10n.startCourseAgainConfirm,
    );
    if (!confirmed || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(yallappApiProvider).restartCourse(course.id);
      final before =
          ref.read(curriculumProvider(course.id)).value ?? const <Topic>[];
      await ref.read(progressQueueProvider).forgetLessons([
        for (final topic in before) ...topic.items.map((item) => item.id),
      ]);
      if (!mounted) return;
      invalidateCourse(ref, course.id);
      _openTopics = null;
      final topics = await ref.read(curriculumProvider(course.id).future);
      if (!mounted) return;
      final first = nextItemToOpen(topics);
      if (first != null) {
        openCurriculumItem(context, first, courseId: course.id);
      }
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

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
    // 100 Courses and memberships bought through Google Play or the App Store.
    final storeBilling = ref.watch(storeClientProvider) != null;
    final cta = resolveCourseCta(
      serverAction: course.purchaseAction,
      platform: env.platform,
      rules: config.purchases,
      enrolled: course.enrolled,
      storeBilling: storeBilling,
      storeProductId: course.storeProductId,
    );
    final wishlisted = _wishlisted ?? course.wishlisted;
    // 45 A finished course says so, and its button reviews the curriculum.
    final finished = courseFinished(course, topics.value);
    // Q&A is for enrolled students, when the site and the course have it on.
    final showQna =
        config.features.qna && (course.qna ?? true) && course.enrolled;
    final l10n = context.l10n;
    // 122 The page as the owner designed it in Studio.
    final look = config.screens?.coursePage ?? const CoursePageLook();
    final fullCover = look.cover == CoursePageCover.full;
    // 123 The premium academy's page: the curriculum first, as chips.
    final premium = look.premium;
    final tabs = [
      if (!premium) _CourseTab.overview,
      _CourseTab.curriculum,
      if (premium) _CourseTab.overview,
      if (config.features.reviews && look.shows(CoursePageFact.reviews))
        _CourseTab.reviews,
      if (showQna) _CourseTab.qna,
    ];
    // 30 Students start on the curriculum; visitors on the overview when it
    // says what the course teaches (122 or the tab the owner chose).
    final curriculumAt = tabs.indexOf(_CourseTab.curriculum);
    final overviewAt = tabs.indexOf(_CourseTab.overview);
    final first = course.enrolled || course.about.isEmpty
        ? curriculumAt
        : look.firstTab == 'curriculum'
        ? curriculumAt
        : look.firstTab == 'overview'
        ? overviewAt
        : premium
        ? curriculumAt
        : overviewAt;
    final tab = (_tab ?? first).clamp(0, tabs.length - 1);

    final glass = look.bar == CoursePageBar.glass;
    final page = <Widget>[
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
            // 122 Under a glass bar the page scrolls on beneath it.
            padding: EdgeInsets.only(bottom: glass ? 120 : 0),
            children: [
              SizedBox(
                key: ValueKey(
                  fullCover ? 'course-cover-full' : 'course-cover-classic',
                ),
                height:
                    (fullCover ? 340 : 220) + MediaQuery.paddingOf(context).top,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    AppNetworkImage(
                      url: course.introVideo?.posterUrl ?? course.imageUrl,
                      seed: course.id,
                    ),
                    const HeroScrim(),
                    // 122 The course's name and facts on the picture.
                    if (fullCover) ...[
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [Color(0x00000000), Color(0xD9000000)],
                            stops: [0.35, 1],
                          ),
                        ),
                      ),
                      PositionedDirectional(
                        start: 20,
                        end: 20,
                        bottom: 22,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // 123 Its subject and its certificate, over its name.
                            if (premium &&
                                (course.categories.isNotEmpty ||
                                    (course.hasCertificate &&
                                        look.shows(
                                          CoursePageFact.certificate,
                                        )))) ...[
                              Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                children: [
                                  if (course.categories.isNotEmpty)
                                    _CoverTag(
                                      course.categories.first.name,
                                      gold: true,
                                    ),
                                  if (course.hasCertificate &&
                                      look.shows(CoursePageFact.certificate))
                                    _CoverTag(l10n.certifiedCertificate),
                                ],
                              ),
                              const SizedBox(height: 10),
                            ],
                            Semantics(
                              header: true,
                              child: Text(
                                course.title,
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 26,
                                  fontWeight: FontWeight.w800,
                                  height: 1.25,
                                  color: Color(0xFFFFFFFF),
                                ),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text.rich(
                              TextSpan(
                                children: [
                                  // The star drawn as an icon: not every font has the character.
                                  if (course.rating != null &&
                                      course.ratingCount > 0) ...[
                                    const WidgetSpan(
                                      alignment: PlaceholderAlignment.middle,
                                      child: Padding(
                                        padding: EdgeInsetsDirectional.only(
                                          end: 4,
                                        ),
                                        child: Icon(
                                          AppIcons.star,
                                          size: 15,
                                          fill: 1,
                                          color: Color(0xFFF5C451),
                                        ),
                                      ),
                                    ),
                                    TextSpan(
                                      text: premium
                                          ? '${course.rating!.toStringAsFixed(1)} (${course.ratingCount})  ·  '
                                          : '${course.rating!.toStringAsFixed(1)}  ·  ',
                                    ),
                                  ],
                                  TextSpan(
                                    text: [
                                      l10n.lessonCount(course.lessonCount),
                                      if (course.durationMinutes != null &&
                                          look.shows(CoursePageFact.duration))
                                        formatMinutes(course.durationMinutes!),
                                      if ((course.studentCount ?? 0) > 0 &&
                                          look.shows(CoursePageFact.students))
                                        l10n.studentCount(course.studentCount!),
                                    ].join('  ·  '),
                                  ),
                                ],
                              ),
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: Color(0xEBFFFFFF),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    PositionedDirectional(
                      top: MediaQuery.paddingOf(context).top + 16,
                      start: 20,
                      child: premium
                          ? _CoverCircle(
                              icon: AppIcons.back,
                              label: l10n.back,
                              gold: true,
                              onPressed: () => context.canPop()
                                  ? context.pop()
                                  : context.go(Paths.home),
                            )
                          : const AppBackButton(),
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
                            onImage: premium,
                            size: premium ? 40 : 44,
                            background: premium ? _dim : null,
                            foreground: premium ? Colors.white : null,
                          ),
                          if (config.features.wishlist) ...[
                            SizedBox(width: premium ? 8 : 4),
                            SquareIconButton(
                              icon: AppIcons.favorite,
                              filled: wishlisted,
                              size: premium ? 40 : 44,
                              radius: premium ? 20 : 12,
                              background: premium ? _dim : null,
                              foreground: wishlisted
                                  ? (premium ? const Color(0xFFFF4D67) : p.link)
                                  : (premium ? Colors.white : p.text),
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
                    if (!fullCover)
                      Semantics(
                        header: true,
                        child: Text(
                          course.title,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ),
                    if (course.instructor != null && premium)
                      TeacherCard(
                        instructor: course.instructor!,
                        onTap:
                            ref.watch(teachersOnProvider) &&
                                course.instructor!.id > 0
                            ? () => context.push(
                                Paths.teacherPage(course.instructor!.id),
                              )
                            : null,
                      )
                    else if (course.instructor != null) ...[
                      const SizedBox(height: 14),
                      _InstructorRow(
                        instructor: course.instructor!,
                        // 105.3 A teacher's course opens the teacher's page.
                        onTap:
                            ref.watch(teachersOnProvider) &&
                                course.instructor!.id > 0
                            ? () => context.push(
                                Paths.teacherPage(course.instructor!.id),
                              )
                            : null,
                      ),
                    ],
                    const SizedBox(height: 14),
                    // 123 On the premium page the facts are on the cover.
                    if (!premium || course.cohort != null)
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          if (!premium &&
                              course.rating != null &&
                              course.ratingCount > 0)
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
                          if (course.durationMinutes != null &&
                              look.shows(CoursePageFact.duration))
                            _MetaChip(
                              formatMinutes(course.durationMinutes!),
                              icon: AppIcons.schedule,
                            ),
                          if ((course.studentCount ?? 0) > 0 &&
                              look.shows(CoursePageFact.students))
                            _MetaChip(
                              l10n.studentCount(course.studentCount!),
                              icon: AppIcons.group,
                            ),
                          if (course.level != null &&
                              course.level!.isNotEmpty &&
                              look.shows(CoursePageFact.level))
                            _MetaChip(course.level!, icon: AppIcons.level),
                          if (course.hasCertificate &&
                              look.shows(CoursePageFact.certificate))
                            _MetaChip(
                              l10n.certificate,
                              icon: AppIcons.certificate,
                            ),
                          // 112.5 The student's cohort and its first day.
                          if (course.cohort != null)
                            _MetaChip(
                              l10n.cohortStarts(
                                course.cohort!.name,
                                shortDate(course.cohort!.startsAt),
                              ),
                              icon: AppIcons.group,
                            ),
                        ],
                      ),
                    // 113.1 The bundles it's in, while one isn't the student's.
                    if (course.bundles.any((b) => !b.owned)) ...[
                      const SizedBox(height: 16),
                      Text(
                        l10n.bundleAlsoIn,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                      const SizedBox(height: 8),
                      for (final bundle in course.bundles.where(
                        (b) => !b.owned,
                      )) ...[
                        BundleCard(bundle: bundle),
                        const SizedBox(height: 8),
                      ],
                    ],
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
                    // 113.7 The courses to finish first, the final
                    // score, the leaderboard and the student's notes.
                    if (!course.enrolled &&
                        course.prerequisites.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      CoursePrerequisites(course: course),
                    ],
                    if (course.enrolled) ...[
                      if (course.progress?.finalScore case final score?) ...[
                        const SizedBox(height: 10),
                        Text(
                          course.progress!.minFinalScore == null
                              ? l10n.finalScore(score)
                              : l10n.finalScoreNeeded(
                                  score,
                                  course.progress!.minFinalScore!,
                                ),
                          key: const ValueKey('course-final-score'),
                          style: TextStyle(
                            fontSize: 14,
                            color: context.palette.textSecondary,
                          ),
                        ),
                      ],
                      CourseLearningLinks(courseId: course.id),
                    ],
                    const SizedBox(height: 16),
                    if (premium)
                      InkChips(
                        labels: [
                          for (final t in tabs)
                            switch (t) {
                              _CourseTab.overview => l10n.aboutCourse,
                              _CourseTab.curriculum => l10n.curriculum,
                              _CourseTab.reviews => l10n.reviews,
                              _CourseTab.qna => l10n.courseQuestions,
                            },
                        ],
                        selected: tab,
                        onChanged: (i) => setState(() => _tab = i),
                      )
                    else
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
                      _CourseTab.qna => CourseQuestionsTab(courseId: course.id),
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
      // 62 A course with a password on the website: no password in the app.
      if (course.passwordProtected && !course.enrolled)
        _PasswordBar(course: course, platform: env.platform)
      // 100 Its membership's subscriptions, sold in the app.
      else if (course.membership case final membership?
          when !membership.hasAccess &&
              !course.enrolled &&
              storeBilling &&
              membership.storeProductIds.isNotEmpty)
        StoreMembershipBar(membership: membership, onSignIn: _signIn)
      // 90.3 A course that needs a membership the student doesn't have.
      else if (course.membership case final membership?
          when !membership.hasAccess && !course.enrolled)
        _MembershipBar(
          course: course,
          membership: membership,
          // 100 No way to the website's memberships where the app sells
          // in the app (the stores' rule for digital content).
          websiteLink: !storeBilling && env.platform != DevicePlatform.ios,
        )
      // 100 A paid course bought through the store.
      else if (cta == CourseCta.store)
        StoreCourseBar(productId: course.storeProductId!, onSignIn: _signIn)
      else
        _CtaBar(
          course: course,
          cta: cta,
          busy: _busy,
          finished: finished,
          onReview: () =>
              setState(() => _tab = tabs.indexOf(_CourseTab.curriculum)),
          onContinue: () => _continue(topics.value, course),
          onRestart: () => _restart(course),
          onEnrollFree: () => _enrollFree(course),
          onCheckout: () => _checkout(course),
        ),
    ];
    // 123 The premium page's purchase in gold, the price with its saving.
    Widget gilded(Widget child) => premium
        ? GoldButtons(
            color: Theme.of(context).colorScheme.secondary,
            child: PremiumPrice(child: child),
          )
        : child;
    if (!glass) return Scaffold(body: gilded(Column(children: page)));
    // 122 The purchase bar frosted over the page.
    return Scaffold(
      body: GlassBottomBars(
        child: gilded(
          Stack(
            children: [
              Positioned.fill(child: (page.first as Expanded).child),
              PositionedDirectional(
                start: 0,
                end: 0,
                bottom: 0,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: page.sublist(1),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _InstructorRow extends StatelessWidget {
  const _InstructorRow({required this.instructor, this.onTap});

  final Instructor instructor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final row = Row(
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
    if (onTap == null) return row;
    return InkWell(
      key: const ValueKey('course-instructor'),
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: row,
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
    // 90.1 A lesson that opens later shows the day it opens; 112.5 an item
    // after one not done yet says so, an assignment its due date, a live
    // class when it starts.
    final opens = item.locked ? item.availableAt : null;
    final trailing = opens != null
        ? context.l10n.opensOn(shortDate(opens))
        : item.lockedReason == LockedReason.previousNotDone
        ? context.l10n.afterPrevious
        : item.type == CurriculumItemType.live && item.startsAt != null
        ? dayAndTime(item.startsAt!)
        : item.type == CurriculumItemType.assignment &&
              item.dueAt != null &&
              !item.completed
        ? context.l10n.homeworkDueOn(shortDate(item.dueAt!))
        : item.type == CurriculumItemType.quiz && item.questionCount != null
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
        // 112.5 An item after one not done yet says why it's closed.
        onTap: item.locked && item.lockedReason != LockedReason.previousNotDone
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
    required this.onRestart,
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

  /// 73 "Start the course again", when the course allows it.
  final VoidCallback onRestart;
  final VoidCallback onEnrollFree;
  final VoidCallback onCheckout;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    switch (cta) {
      // 73 A finished course the student can take again: reviewing stays beside it.
      case CourseCta.continueLearning when finished && course.canRestart:
        return BottomActionBar(
          child: Row(
            children: [
              Expanded(
                child: SecondaryButton(
                  key: const ValueKey('cta-review'),
                  label: context.l10n.reviewCourse,
                  icon: AppIcons.review,
                  onPressed: busy ? null : onReview,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: PrimaryButton(
                  key: const ValueKey('cta-restart'),
                  label: context.l10n.startCourseAgain,
                  icon: AppIcons.restart,
                  height: 54,
                  loading: busy,
                  onPressed: onRestart,
                ),
              ),
            ],
          ),
        );
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
                  // 123 On the premium page: "Join now" with a bag.
                  label: PremiumPrice.of(context)
                      ? context.l10n.joinNow
                      : context.l10n.enrollNow,
                  icon: PremiumPrice.of(context)
                      ? Symbols.shopping_bag_rounded
                      : AppIcons.cart,
                  height: 54,
                  loading: busy,
                  onPressed: onCheckout,
                ),
              ),
            ],
          ),
        );
      // 100 Shown by StoreCourseBar instead.
      case CourseCta.store:
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

/// 62 The course page's bar for a course the website protects with a
/// password, for a student who isn't in it yet: the app never asks for the
/// password; "Open on the website" opens the course's page there. On iPhone
/// a paid course gets no link to the website (no way to buy outside the
/// App Store's rules).
class _PasswordBar extends StatelessWidget {
  const _PasswordBar({required this.course, required this.platform});

  final CourseDetail course;
  final DevicePlatform platform;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final website = course.websiteUrl;
    final link =
        website != null &&
        (platform != DevicePlatform.ios || course.price.isFree);
    return BottomActionBar(
      key: const ValueKey('cta-password'),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 22),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.coursePasswordTitle,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      link
                          ? l10n.coursePasswordWebsite
                          : l10n.coursePasswordInApp,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.5,
                        color: p.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (link) ...[
            const SizedBox(height: 12),
            PrimaryButton(
              key: const ValueKey('cta-open-website'),
              label: l10n.courseOpenOnWebsite,
              icon: AppIcons.openInNew,
              height: 54,
              onPressed: () => openExternal(website),
            ),
          ],
        ],
      ),
    );
  }
}

/// 90.3 The course comes with a membership on the website. On iOS the app
/// only says so: no link to where it's sold.
class _MembershipBar extends StatelessWidget {
  const _MembershipBar({
    required this.course,
    required this.membership,
    required this.websiteLink,
  });

  final CourseDetail course;
  final CourseMembership membership;

  /// "See memberships on the website": never on iOS, nor where the app
  /// sells in the app.
  final bool websiteLink;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final website = course.websiteUrl;
    final link = website != null && websiteLink;
    return BottomActionBar(
      key: const ValueKey('cta-membership'),
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 22),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: p.divider,
                  borderRadius: BorderRadius.circular(12),
                ),
                alignment: Alignment.center,
                child: AppIcon(
                  AppIcons.membership,
                  size: 20,
                  color: p.textSecondary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      l10n.courseMembershipTitle,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: p.text,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      membership.plans.isEmpty
                          ? l10n.courseMembershipAny
                          : l10n.courseMembershipPlans(
                              membership.plans.join(', '),
                            ),
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.5,
                        color: p.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (link) ...[
            const SizedBox(height: 12),
            PrimaryButton(
              key: const ValueKey('cta-memberships-website'),
              label: l10n.courseMembershipWebsite,
              icon: AppIcons.openInNew,
              height: 54,
              onPressed: () => openExternal(website),
            ),
          ],
        ],
      ),
    );
  }
}

class _PriceColumn extends StatelessWidget {
  const _PriceColumn({required this.price});

  final Price price;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (PremiumPrice.of(context)) return PremiumPriceColumn(price: price);
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

/// 112.5 Before a paid course's checkout (113.1 or a bundle's): a coupon
/// checked (with the price it leaves), or none. Pops `(code: …)`; null when
/// closed. 113.1 One that takes the whole price says so, and "Enroll for
/// free" goes on without a payment.
class CouponSheet extends ConsumerStatefulWidget {
  const CouponSheet({super.key, this.courseId, this.bundleId})
    : assert((courseId == null) != (bundleId == null));

  final int? courseId;
  final int? bundleId;

  @override
  ConsumerState<CouponSheet> createState() => _CouponSheetState();
}

class _CouponSheetState extends ConsumerState<CouponSheet> {
  final _code = TextEditingController();
  CouponCheck? _check;
  bool _busy = false;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _apply() async {
    final code = _code.text.trim();
    if (code.isEmpty) return;
    setState(() => _busy = true);
    try {
      final api = ref.read(yallappApiProvider);
      final check = widget.bundleId != null
          ? await api.checkBundleCoupon(widget.bundleId!, code)
          : await api.checkCourseCoupon(widget.courseId!, code);
      if (mounted) setState(() => _check = check);
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final check = _check;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                l10n.couponHave,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      key: const ValueKey('coupon-code'),
                      controller: _code,
                      textCapitalization: TextCapitalization.characters,
                      decoration: InputDecoration(hintText: l10n.couponCode),
                      onChanged: (_) {
                        if (_check != null) setState(() => _check = null);
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  SizedBox(
                    width: 112,
                    child: SecondaryButton(
                      key: const ValueKey('coupon-apply'),
                      label: l10n.couponApply,
                      height: 48,
                      onPressed: _busy ? null : _apply,
                    ),
                  ),
                ],
              ),
              if (check != null) ...[
                const SizedBox(height: 8),
                Text(
                  check.applied && check.free
                      ? l10n.couponFree
                      : check.applied
                      ? l10n.couponSaves(check.discount ?? '', check.total)
                      : (check.message ?? ''),
                  style: TextStyle(
                    fontSize: 14,
                    color: check.applied ? p.success : p.danger,
                  ),
                ),
              ],
              const SizedBox(height: 16),
              PrimaryButton(
                key: const ValueKey('coupon-continue'),
                label: check?.applied == true && check!.free
                    ? l10n.couponEnrollFree
                    : check?.applied == true
                    ? l10n.couponContinue
                    : l10n.couponWithout,
                height: 52,
                onPressed: () => Navigator.of(context)
                    .pop((code: check?.applied == true ? check!.code : null)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 123 A dimmed circle on the premium cover.
const _dim = Color(0x40000000);

/// 123 A tag over the course's name on its premium cover: its subject in
/// gold, its certificate frosted.
class _CoverTag extends StatelessWidget {
  const _CoverTag(this.text, {this.gold = false});

  final String text;
  final bool gold;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
    decoration: BoxDecoration(
      color: gold
          ? Theme.of(context).colorScheme.secondary
          : const Color(0x2EFFFFFF),
      borderRadius: BorderRadius.circular(9),
    ),
    child: Text(
      text,
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.w800,
        color: gold ? const Color(0xFF2A1D05) : Colors.white,
      ),
    ),
  );
}

/// 123 The way back on the premium cover: a round button in the second
/// colour's light.
class _CoverCircle extends StatelessWidget {
  const _CoverCircle({
    required this.icon,
    required this.label,
    required this.onPressed,
    this.gold = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onPressed;
  final bool gold;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: label,
      child: InkWell(
        key: const ValueKey('course-cover-back'),
        customBorder: const CircleBorder(),
        onTap: onPressed,
        child: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: gold
                ? Theme.of(context).colorScheme.secondary
                      .withValues(alpha: 0.55)
                : _dim,
          ),
          // Turned to the reading direction by the icon itself.
          child: Icon(
            Symbols.arrow_back_rounded,
            color: Colors.white,
            size: 22,
          ),
        ),
      ),
    );
  }
}
