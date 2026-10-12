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
import '../../../core/theme/palette.dart';
import '../../../core/web/web_page_screen.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../data/lms_providers.dart';
import '../lesson/content/html_content.dart';
import '../navigation.dart';

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
      showMessage(context, "You're enrolled. Happy learning!");
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
          extra: WebPageArgs(url: link.url, title: 'Checkout'),
        );
        if (mounted) invalidateCourse(ref, course.id);
      } else {
        _awaitingCheckout = true;
        final opened = await openExternal(link.url);
        if (!opened && mounted) {
          _awaitingCheckout = false;
          showMessage(context, "The checkout couldn't be opened.");
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
      _ => const Scaffold(body: LoadingView(label: 'Loading course')),
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
    final tabs = [
      'Overview',
      'Curriculum',
      if (config.features.reviews) 'Reviews',
      if (showQna) 'Q&A',
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
                        Positioned(
                          top: MediaQuery.paddingOf(context).top + 16,
                          left: 20,
                          child: const AppBackButton(),
                        ),
                        if (config.features.wishlist)
                          Positioned(
                            top: MediaQuery.paddingOf(context).top + 16,
                            right: 20,
                            child: SquareIconButton(
                              icon: AppIcons.favorite,
                              filled: wishlisted,
                              foreground: wishlisted ? p.link : p.text,
                              bordered: false,
                              label: wishlisted
                                  ? 'Remove from wishlist'
                                  : 'Add to wishlist',
                              onPressed: () => _toggleWishlist(course),
                            ),
                          ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(20),
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
                            _MetaChip(plural(course.lessonCount, 'lesson')),
                            if (course.durationMinutes != null)
                              _MetaChip(formatMinutes(course.durationMinutes!)),
                            if (course.level != null &&
                                course.level!.isNotEmpty)
                              _MetaChip(course.level!),
                            if (course.hasCertificate)
                              const _MetaChip('Certificate'),
                          ],
                        ),
                        const SizedBox(height: 16),
                        SegmentedTabs(
                          labels: tabs,
                          selected: tab,
                          onChanged: (i) => setState(() => _tab = i),
                        ),
                        const SizedBox(height: 16),
                        switch (tabs[tab]) {
                          'Overview' => _Overview(course: course),
                          'Reviews' => CourseReviewsTab(courseId: course.id),
                          'Q&A' => CourseQuestionsTab(courseId: course.id),
                          _ => _Curriculum(topics: topics, courseId: course.id),
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
        ClipOval(
          child: AppNetworkImage(
            url: instructor.avatarUrl,
            seed: 2,
            width: 36,
            height: 36,
          ),
        ),
        const SizedBox(width: 10),
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
              'Instructor',
              style: TextStyle(fontSize: 12, color: p.textSecondary),
            ),
          ],
        ),
      ],
    );
  }
}

class _MetaChip extends StatelessWidget {
  const _MetaChip(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Container(
      height: 32,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: p.surface,
        border: Border.all(color: p.border),
        borderRadius: BorderRadius.circular(16),
      ),
      alignment: Alignment.center,
      child: Text(label, style: TextStyle(fontSize: 13, color: p.text)),
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
          Text('No description yet.', style: TextStyle(color: p.textSecondary))
        else
          HtmlContent(html: course.descriptionHtml),
        if (bio != null && bio.trim().isNotEmpty) ...[
          const SizedBox(height: 20),
          const SectionHeader(title: 'About the instructor', size: 16),
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
          'The curriculum will appear here.',
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
      _ => const LoadingView(label: 'Loading curriculum'),
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
                  plural(lessons, 'lesson'),
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
        ? plural(item.questionCount!, 'question')
        : (item.durationMinutes != null
              ? formatMinutes(item.durationMinutes!)
              : null);
    final freePreview = item.preview && !item.locked;
    return Semantics(
      button: !item.locked,
      label: [
        item.title,
        if (freePreview) 'free preview',
        if (item.locked) 'locked',
        if (item.completed) 'completed',
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
                      'Free preview',
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
            label: 'Continue learning',
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
                  label: 'Enroll for free',
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
                  label: 'Enroll now',
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
                  "This course isn't available on your account yet.",
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
          'Course price',
          style: TextStyle(fontSize: 12, color: p.textSecondary),
        ),
        PriceLabel(price, size: 20),
      ],
    );
  }
}
