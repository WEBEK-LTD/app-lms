import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/data/paged_controller.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../courses/community_widgets.dart';
import '../navigation.dart';
import '../widgets/course_cards.dart';
import 'teachers_providers.dart';

/// 105.3 The academy's teachers: search by name or subject, or pick a
/// subject; featured teachers first.
class TeachersScreen extends ConsumerStatefulWidget {
  const TeachersScreen({super.key});

  @override
  ConsumerState<TeachersScreen> createState() => _TeachersScreenState();
}

class _TeachersScreenState extends ConsumerState<TeachersScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  TeacherQuery _query = (search: '', subject: null);

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _onSearch(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      setState(() => _query = (search: value.trim(), subject: _query.subject));
    });
  }

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final state = ref.watch(teachersProvider(_query));
    final notifier = ref.read(teachersProvider(_query).notifier);
    final subjects = notifier.subjects;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.teachersTitle)),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
            child: TextField(
              key: const ValueKey('teachers-search'),
              controller: _search,
              textInputAction: TextInputAction.search,
              onChanged: _onSearch,
              decoration: InputDecoration(
                hintText: l10n.teachersSearch,
                prefixIcon: AppIcon(
                  AppIcons.search,
                  size: 20,
                  color: p.textSecondary,
                ),
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide(color: p.border),
                ),
              ),
            ),
          ),
          if (subjects.isNotEmpty)
            SizedBox(
              height: chipRowHeight(context),
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                children: [
                  PillChip(
                    label: l10n.teachersAllSubjects,
                    selected: _query.subject == null,
                    onTap: () => setState(
                      () => _query = (search: _query.search, subject: null),
                    ),
                  ),
                  for (final subject in subjects) ...[
                    const SizedBox(width: 8),
                    PillChip(
                      label: subject,
                      selected: _query.subject == subject,
                      onTap: () => setState(
                        () =>
                            _query = (search: _query.search, subject: subject),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          const SizedBox(height: 8),
          Expanded(child: _list(context, state, notifier)),
        ],
      ),
    );
  }

  Widget _list(
    BuildContext context,
    PagedState<TeacherSummary> state,
    TeachersController notifier,
  ) {
    if (state.isInitialLoading) {
      return SkeletonList(
        layout: SkeletonLayout.text,
        label: context.l10n.loadingEllipsis,
      );
    }
    if (state.error != null && state.items.isEmpty) {
      return ErrorView(error: state.error!, onRetry: notifier.retry);
    }
    if (state.items.isEmpty) {
      return MessageView(
        icon: AppIcons.teacher,
        title: context.l10n.teachersEmpty,
      );
    }
    return RefreshIndicator(
      onRefresh: notifier.refresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: (n) {
          if (n.metrics.extentAfter < 300 && state.hasMore) notifier.loadMore();
          return false;
        },
        child: ListView.separated(
          key: const ValueKey('teachers-list'),
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
          itemCount: state.items.length,
          separatorBuilder: (_, _) => const SizedBox(height: 10),
          itemBuilder: (context, i) => TeacherTile(
            teacher: state.items[i],
            onTap: () => context.push(Paths.teacherPage(state.items[i].id)),
          ),
        ),
      ),
    );
  }
}

/// A teacher in a list: picture, name, what they teach, rating and courses.
class TeacherTile extends StatelessWidget {
  const TeacherTile({super.key, required this.teacher, required this.onTap});

  final TeacherSummary teacher;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final about = teacher.headline ?? teacher.subjects.join(' · ');
    return AppCard(
      key: ValueKey('teacher-${teacher.id}'),
      onTap: onTap,
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          InitialsAvatar(
            name: teacher.name,
            imageUrl: teacher.avatarUrl,
            size: 52,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        teacher.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: p.text,
                        ),
                      ),
                    ),
                    if (teacher.featured) ...[
                      const SizedBox(width: 6),
                      AppIcon(
                        AppIcons.star,
                        size: 16,
                        color: p.star,
                        filled: true,
                        semanticLabel: l10n.teacherFeatured,
                      ),
                    ],
                  ],
                ),
                if (about.isNotEmpty)
                  Text(
                    about,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, color: p.textSecondary),
                  ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    if (teacher.rating != null) ...[
                      RatingLabel(teacher.rating!, count: teacher.ratingCount),
                      const SizedBox(width: 10),
                    ],
                    Flexible(
                      child: Text(
                        l10n.teacherCourseCount(teacher.courseCount),
                        style: TextStyle(fontSize: 12, color: p.textSecondary),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// 105.3 A teacher's page: who they are, their courses and what students
/// say. Students follow a teacher to hear of their new courses, and rate
/// them once they joined one of their courses.
class TeacherScreen extends ConsumerStatefulWidget {
  const TeacherScreen({super.key, required this.teacherId});

  final int teacherId;

  @override
  ConsumerState<TeacherScreen> createState() => _TeacherScreenState();
}

class _TeacherScreenState extends ConsumerState<TeacherScreen> {
  bool? _following;
  bool _busy = false;

  Future<void> _follow(TeacherDetail teacher) async {
    final l10n = context.l10n;
    if (!ref.read(authControllerProvider).isSignedIn) {
      context.push(
        Uri(
          path: Paths.signIn,
          queryParameters: {'from': Paths.teacherPage(teacher.id)},
        ).toString(),
      );
      return;
    }
    final follow = !(_following ?? teacher.following);
    setState(() => _busy = true);
    try {
      await ref
          .read(yallappApiProvider)
          .followTeacher(teacher.id, follow: follow);
      if (!mounted) return;
      setState(() => _following = follow);
      if (follow) showMessage(context, l10n.teacherFollowed(teacher.name));
    } on ApiException catch (e) {
      if (mounted) showMessage(context, e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _rate(TeacherDetail teacher) {
    final mine = teacher.myReview;
    final rating = ValueNotifier<int>(mine?.rating ?? 0);
    return showTextSheet(
      context,
      title: context.l10n.teacherRate(teacher.name),
      hint: context.l10n.reviewHint,
      sendLabel: context.l10n.postReview,
      initial: mine?.text ?? '',
      allowEmpty: true,
      header: ValueListenableBuilder<int>(
        valueListenable: rating,
        builder: (context, value, _) => StarRow(
          rating: value.toDouble(),
          size: 32,
          onChanged: (v) => rating.value = v,
        ),
      ),
      onSend: (text) async {
        if (rating.value == 0) {
          showMessage(context, context.l10n.chooseRating);
          return false;
        }
        try {
          await ref
              .read(yallappApiProvider)
              .rateTeacher(teacher.id, rating: rating.value, text: text);
          ref
            ..invalidate(teacherProvider(teacher.id))
            ..invalidate(teacherReviewsProvider(teacher.id));
          if (mounted) {
            showMessage(context, context.l10n.teacherRated(teacher.name));
          }
          return true;
        } on ApiException catch (e) {
          if (mounted) showMessage(context, e.message);
          return false;
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(teacherProvider(widget.teacherId));
    return Scaffold(
      appBar: AppBar(title: Text(async.value?.name ?? '')),
      body: switch (async) {
        AsyncValue(value: final t?) => RefreshIndicator(
          onRefresh: () async {
            setState(() => _following = null);
            ref
              ..invalidate(teacherProvider(widget.teacherId))
              ..invalidate(teacherReviewsProvider(widget.teacherId));
          },
          child: _view(context, t),
        ),
        AsyncValue(error: final e?) => ErrorView(
          error: e,
          onRetry: () => ref.invalidate(teacherProvider(widget.teacherId)),
        ),
        _ => const Center(child: CircularProgressIndicator()),
      },
    );
  }

  Widget _view(BuildContext context, TeacherDetail t) {
    final p = context.palette;
    final l10n = context.l10n;
    final following = _following ?? t.following;
    final followers =
        t.followerCount + (following ? 1 : 0) - (t.following ? 1 : 0);
    final reviews = ref.watch(teacherReviewsProvider(t.id));
    final others = [
      for (final r in reviews.items)
        if (!r.mine) r,
    ];
    return ListView(
      key: const ValueKey('teacher-page'),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        Row(
          children: [
            InitialsAvatar(name: t.name, imageUrl: t.avatarUrl, size: 72),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    t.name,
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: p.text,
                    ),
                  ),
                  if (t.subjects.isNotEmpty)
                    Text(
                      t.subjects.join(' · '),
                      style: TextStyle(fontSize: 14, color: p.textSecondary),
                    ),
                  if (t.rating != null) ...[
                    const SizedBox(height: 4),
                    RatingLabel(t.rating!, count: t.ratingCount),
                  ],
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          [
            l10n.teacherCourseCount(t.courseCount),
            l10n.teacherStudentCount(t.studentCount),
            l10n.teacherFollowerCount(followers),
          ].join(' · '),
          key: const ValueKey('teacher-counts'),
          style: TextStyle(fontSize: 13, color: p.textSecondary),
        ),
        const SizedBox(height: 12),
        following
            ? SecondaryButton(
                key: const ValueKey('teacher-follow'),
                label: l10n.teacherFollowing,
                icon: AppIcons.check,
                height: 48,
                onPressed: _busy ? null : () => _follow(t),
              )
            : PrimaryButton(
                key: const ValueKey('teacher-follow'),
                label: l10n.teacherFollow,
                height: 48,
                loading: _busy,
                onPressed: () => _follow(t),
              ),
        if (t.bio.isNotEmpty) ...[
          const SizedBox(height: 20),
          _Heading(l10n.aboutInstructor),
          const SizedBox(height: 6),
          Text(
            t.bio,
            style: TextStyle(fontSize: 15, height: 1.5, color: p.textBody),
          ),
        ],
        const SizedBox(height: 20),
        _Heading(l10n.teacherCoursesTitle(t.name)),
        const SizedBox(height: 8),
        if (t.courses.isEmpty)
          Text(
            l10n.teacherCourseCount(0),
            style: TextStyle(color: p.textSecondary),
          ),
        for (final course in t.courses) ...[
          CourseListCard(
            course: course,
            onTap: () => openCourse(context, course.id),
          ),
          const SizedBox(height: 10),
        ],
        const SizedBox(height: 10),
        _Heading(l10n.reviews),
        const SizedBox(height: 8),
        if (t.canReview || t.myReview != null)
          t.myReview == null
              ? SecondaryButton(
                  key: const ValueKey('teacher-rate'),
                  label: l10n.teacherRate(t.name),
                  height: 50,
                  onPressed: () => _rate(t),
                )
              : _TeacherReviewCard(review: t.myReview!, onEdit: () => _rate(t))
        else if (ref.watch(authControllerProvider).isSignedIn)
          Text(
            l10n.teacherRateHint,
            style: TextStyle(fontSize: 13, color: p.textSecondary),
          ),
        const SizedBox(height: 10),
        if (!reviews.isInitialLoading && others.isEmpty && t.ratingCount == 0)
          Padding(
            padding: const EdgeInsets.all(12),
            child: Text(
              l10n.noReviews,
              textAlign: TextAlign.center,
              style: TextStyle(color: p.textSecondary),
            ),
          ),
        for (final review in others) ...[
          _TeacherReviewCard(review: review),
          const SizedBox(height: 10),
        ],
        if (reviews.hasMore)
          Center(
            child: TextButton(
              onPressed: reviews.loading
                  ? null
                  : ref.read(teacherReviewsProvider(t.id).notifier).loadMore,
              child: Text(
                reviews.loading ? l10n.loadingEllipsis : l10n.showMoreReviews,
              ),
            ),
          ),
      ],
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Semantics(
    header: true,
    child: Text(
      text,
      style: TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.w700,
        color: context.palette.text,
      ),
    ),
  );
}

class _TeacherReviewCard extends StatelessWidget {
  const _TeacherReviewCard({required this.review, this.onEdit});

  final TeacherReview review;
  final VoidCallback? onEdit;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return AppCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          PersonLine(
            person: review.author,
            time: review.createdAt,
            you: review.mine,
          ),
          const SizedBox(height: 8),
          StarRow(rating: review.rating.toDouble(), size: 16),
          if (review.text.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(
              review.text,
              style: TextStyle(fontSize: 14, height: 1.5, color: p.textBody),
            ),
          ],
          if (review.hidden) ...[
            const SizedBox(height: 6),
            Text(
              context.l10n.reviewHiddenNote,
              style: TextStyle(fontSize: 12, color: p.textSecondary),
            ),
          ],
          if (onEdit != null)
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton(
                onPressed: onEdit,
                child: Text(context.l10n.editReview),
              ),
            ),
        ],
      ),
    );
  }
}
