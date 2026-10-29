import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/providers.dart';
import '../../../core/routing/paths.dart';
import '../../../core/services/external_links.dart';
import '../../../core/services/screen_security.dart';
import '../../../core/storage/local_settings.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/web/web_view.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/file_viewer.dart';
import '../data/lms_providers.dart';
import '../downloads/download_manager.dart';
import '../downloads/download_widgets.dart';
import '../downloads/lesson_snapshot.dart';
import '../downloads/progress_queue.dart';
import '../navigation.dart';
import 'content/html_content.dart';
import 'embeds/inline_embed.dart';
import 'video/lesson_video_player.dart';
import 'video/watermark.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/services/review_prompt.dart';

/// Where a lesson sits in its course.
class LessonPosition {
  const LessonPosition({
    this.index,
    this.total,
    this.topic,
    this.previous,
    this.next,
    this.siblings = const [],
  });

  /// Works out the position from the curriculum, falling back to the
  /// lesson's own previous and next IDs.
  factory LessonPosition.of(Lesson lesson, List<Topic>? topics) {
    CurriculumItem lessonItem(int id) => CurriculumItem(
      id: id,
      type: CurriculumItemType.lesson,
      title: '',
      locked: false,
      completed: false,
    );
    final fallback = LessonPosition(
      previous: lesson.previousId == null
          ? null
          : lessonItem(lesson.previousId!),
      next: lesson.nextId == null ? null : lessonItem(lesson.nextId!),
    );
    if (topics == null) return fallback;
    final flat = [for (final t in topics) ...t.items];
    final i = flat.indexWhere(
      (item) => item.type == CurriculumItemType.lesson && item.id == lesson.id,
    );
    if (i < 0) return fallback;
    final topic = topics.firstWhere(
      (t) => t.items.any((it) => identical(it, flat[i])),
    );
    final lessons = flat
        .where((it) => it.type == CurriculumItemType.lesson)
        .toList();
    return LessonPosition(
      index: lessons.indexWhere((it) => it.id == lesson.id) + 1,
      total: lessons.length,
      topic: topic,
      previous: i > 0 ? flat[i - 1] : null,
      next: i < flat.length - 1 ? flat[i + 1] : null,
      siblings: topic.items,
    );
  }

  final int? index;
  final int? total;
  final Topic? topic;
  final CurriculumItem? previous;
  final CurriculumItem? next;
  final List<CurriculumItem> siblings;
}

/// A lesson: video (design: Lesson), HTML with code and embeds (designs:
/// TextLesson, EmbedLesson) or a web view.
class LessonScreen extends ConsumerStatefulWidget {
  const LessonScreen({super.key, required this.lessonId});

  final int lessonId;

  @override
  ConsumerState<LessonScreen> createState() => _LessonScreenState();
}

class _LessonScreenState extends ConsumerState<LessonScreen> {
  bool? _completedOverride;
  bool _completing = false;

  /// 40 Read once: the video player saves its place when it closes, after
  /// this screen has left the tree.
  late final _api = ref.read(yallappApiProvider);
  late final _signedIn = ref.read(authControllerProvider).isSignedIn;

  @override
  void initState() {
    super.initState();
    _api;
    _signedIn;
    _queue;
  }

  Future<Video?> _reloadVideo() async {
    try {
      // Fetched directly: refreshing the provider would rebuild the player.
      final lesson = await ref
          .read(yallappApiProvider)
          .getLesson(widget.lessonId);
      return lesson.video;
    } on Object {
      return null;
    }
  }

  /// 45 Read once, like the API: the player saves its place after this
  /// screen has left the tree.
  late final _queue = ref.read(progressQueueProvider);

  void _saveProgress(int position, double percent) {
    if (!_signedIn) return;
    final lessonId = widget.lessonId;
    final queue = _queue;
    unawaited(
      _api
          .saveLessonProgress(
            lessonId,
            positionSeconds: position,
            watchedPercent: percent,
          )
          .catchError((Object e) {
            // 45 Offline: sent when the app is back online.
            if (e is ApiException && e.isOffline) {
              return queue.addProgress(
                lessonId,
                positionSeconds: position,
                watchedPercent: percent,
              );
            }
          }),
    );
  }

  Future<void> _complete(Lesson lesson) async {
    if (_completing) return;
    setState(() => _completing = true);
    try {
      final progress = await ref
          .read(yallappApiProvider)
          .completeLesson(lesson.id);
      if (!mounted) return;
      setState(() => _completedOverride = true);
      invalidateCourse(ref, lesson.courseId);
      showMessage(
        context,
        progress.courseCompleted
            ? context.l10n.courseComplete
            : context.l10n.lessonComplete(progress.percent),
      );
      // 46 A good moment to ask for a rating.
      reportGoodMoment(ref, GoodMoment.lessonCompleted);
    } on ApiException catch (e) {
      if (!mounted) return;
      if (e.isOffline) {
        // 45 Completed offline: sent when the app is back online.
        await _queue.addComplete(lesson.id);
        if (!mounted) return;
        setState(() => _completedOverride = true);
        showMessage(context, context.l10n.lessonCompleteOffline);
      } else if (e.code == ApiException.watchRequirementNotMet) {
        final percent = ref
            .read(appConfigProvider)
            .content
            .requiredWatchPercent;
        await showDialog<void>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(context.l10n.keepWatching),
            content: Text(
              percent == null
                  ? context.l10n.watchMore
                  : context.l10n.watchAtLeast(percent),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(context.l10n.ok),
              ),
            ],
          ),
        );
      } else {
        showMessage(context, e.message);
      }
    } finally {
      if (mounted) setState(() => _completing = false);
    }
  }

  void _go(CurriculumItem? item, int courseId) {
    if (item == null) return;
    openCurriculumItem(context, item, courseId: courseId, replace: true);
  }

  @override
  Widget build(BuildContext context) {
    final lessonAsync = ref.watch(lessonProvider(widget.lessonId));
    return switch (lessonAsync) {
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
              Expanded(child: _lessonError(error)),
            ],
          ),
        ),
      ),
      _ => Scaffold(body: LoadingView(label: context.l10n.loadingLesson)),
    };
  }

  Widget _lessonError(Object error) {
    if (error is ApiException &&
        (error.statusCode == 403 || error.isUnauthorized)) {
      final signedIn = ref.read(authControllerProvider).isSignedIn;
      return MessageView(
        icon: AppIcons.lock,
        title: context.l10n.lessonLocked,
        message: signedIn
            ? context.l10n.lessonLockedEnroll
            : context.l10n.lessonLockedSignIn,
        actionLabel: signedIn ? null : context.l10n.signIn,
        onAction: signedIn
            ? null
            : () => context.push(
                Uri(
                  path: Paths.signIn,
                  queryParameters: {'from': Paths.lesson(widget.lessonId)},
                ).toString(),
              ),
      );
    }
    return ErrorView(
      error: error,
      onRetry: () => ref.invalidate(lessonProvider(widget.lessonId)),
    );
  }

  Widget _build(BuildContext context, Lesson lesson) {
    final topics = ref.watch(curriculumProvider(lesson.courseId)).value;
    final course = ref.watch(courseDetailProvider(lesson.courseId)).value;
    final position = LessonPosition.of(lesson, topics);
    final completed = _completedOverride ?? lesson.completed;
    final footer = _LessonFooter(
      completed: completed,
      completing: _completing,
      signedIn: ref.watch(authControllerProvider).isSignedIn,
      onPrevious: position.previous == null
          ? null
          : () => _go(position.previous, lesson.courseId),
      onNext: position.next == null
          ? null
          : () => _go(position.next, lesson.courseId),
      onComplete: () => _complete(lesson),
      onSignIn: () => context.push(
        Uri(
          path: Paths.signIn,
          queryParameters: {'from': Paths.lesson(lesson.id)},
        ).toString(),
      ),
    );
    final subtitle = [?course?.title, ?position.topic?.title].join(' · ');
    // 45 Save for offline.
    final download = LessonDownloadButton(
      lesson: lesson,
      courseTitle: course?.title ?? '',
      courseImage: course?.imageUrl,
    );

    if (lesson.video != null) {
      return _VideoLesson(
        lesson: lesson,
        download: download,
        subtitle: subtitle,
        position: position,
        footer: footer,
        // 53 Paused and covered while a protected lesson is recorded (iOS);
        // the route is under ProtectedContent (lms_routes.dart).
        captured:
            ref.watch(screenProtectedProvider) &&
            (ref.watch(screenCaptureProvider).value ?? false),
        reloadVideo: _reloadVideo,
        onProgress: _saveProgress,
        onEnded: () {
          final next = position.next;
          if (next != null && ref.read(localSettingsProvider).autoplayNext) {
            _go(next, lesson.courseId);
          }
        },
      );
    }

    final header = _LessonHeader(
      subtitle: subtitle,
      counter: position.index != null && position.total != null
          ? context.l10n.lessonPosition(position.index!, position.total!)
          : context.l10n.lesson,
      trailing: download,
    );

    if (lesson.renderMode == RenderMode.webview && lesson.webviewUrl != null) {
      return Scaffold(
        backgroundColor: context.palette.surface,
        body: Column(
          children: [
            header,
            Expanded(
              child: ref.watch(webViewBuilderProvider)(
                WebViewRequest(
                  url: Uri.parse(lesson.webviewUrl!),
                  debugLabel: 'lesson',
                ),
              ),
            ),
            footer,
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: context.palette.surface,
      body: LessonChrome(
        height: 170,
        child: Column(
          children: [
            header,
            Expanded(
              child: ListView(
                key: const ValueKey('lesson-article'),
                padding: readablePadding(context, top: 20, bottom: 20),
                children: [
                  // 110 In the direction of the lesson's text.
                  ContentTitle(
                    title: lesson.title,
                    html: lesson.html ?? '',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 14),
                  if ((lesson.html ?? '').trim().isNotEmpty ||
                      lesson.embeds.isNotEmpty)
                    HtmlContent(
                      html: lesson.html ?? '',
                      embeds: lesson.embeds,
                      title: lesson.title,
                      embedHeight: lesson.embedHeight,
                    ),
                  if (lesson.attachments.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    SectionHeader(title: context.l10n.attachments, size: 17),
                    const SizedBox(height: 8),
                    _Attachments(attachments: lesson.attachments),
                  ],
                ],
              ),
            ),
            footer,
          ],
        ),
      ),
    );
  }
}

class _LessonHeader extends StatelessWidget {
  const _LessonHeader({
    required this.subtitle,
    required this.counter,
    this.trailing,
  });

  final String subtitle;
  final String counter;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: p.surface,
        border: Border(bottom: BorderSide(color: p.divider)),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
          child: Row(
            children: [
              AppBackButton(onPressed: () => Navigator.of(context).maybePop()),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (subtitle.isNotEmpty)
                      Text(
                        subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 12, color: p.textSecondary),
                      ),
                    Text(
                      counter,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: p.text,
                      ),
                    ),
                  ],
                ),
              ),
              if (trailing != null) ...[const SizedBox(width: 12), trailing!],
            ],
          ),
        ),
      ),
    );
  }
}

class _LessonFooter extends StatelessWidget {
  const _LessonFooter({
    required this.completed,
    required this.completing,
    required this.signedIn,
    required this.onPrevious,
    required this.onNext,
    required this.onComplete,
    required this.onSignIn,
  });

  final bool completed;
  final bool completing;
  final bool signedIn;
  final VoidCallback? onPrevious;
  final VoidCallback? onNext;
  final VoidCallback onComplete;
  final VoidCallback onSignIn;

  @override
  Widget build(BuildContext context) => BottomActionBar(
    child: Row(
      children: [
        StepIconButton(
          icon: AppIcons.back,
          label: context.l10n.previousLesson,
          onPressed: onPrevious,
        ),
        const SizedBox(width: 10),
        Expanded(
          child: !signedIn
              ? PrimaryButton(
                  label: context.l10n.signInToTrack,
                  height: 54,
                  onPressed: onSignIn,
                )
              : PrimaryButton(
                  label: completed
                      ? context.l10n.completed
                      : context.l10n.markComplete,
                  // 110 On a small phone the words get the room.
                  icon: MediaQuery.sizeOf(context).width < 360
                      ? null
                      : completed
                      ? AppIcons.checkCircle
                      : AppIcons.check,
                  height: 54,
                  loading: completing,
                  onPressed: completed ? null : onComplete,
                ),
        ),
        const SizedBox(width: 10),
        StepIconButton(
          icon: AppIcons.forward,
          label: context.l10n.nextLesson,
          onPressed: onNext,
        ),
      ],
    ),
  );
}

class _VideoLesson extends ConsumerStatefulWidget {
  const _VideoLesson({
    required this.lesson,
    required this.download,
    required this.subtitle,
    required this.position,
    required this.footer,
    required this.captured,
    required this.reloadVideo,
    required this.onProgress,
    required this.onEnded,
  });

  final Lesson lesson;

  /// 45 The "Save for offline" button.
  final Widget download;
  final String subtitle;
  final LessonPosition position;
  final Widget footer;
  final bool captured;
  final Future<Video?> Function() reloadVideo;
  final void Function(int, double) onProgress;
  final VoidCallback onEnded;

  @override
  ConsumerState<_VideoLesson> createState() => _VideoLessonState();
}

class _VideoLessonState extends ConsumerState<_VideoLesson> {
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final lesson = widget.lesson;
    final config = ref.watch(appConfigProvider);
    final user = ref.watch(authControllerProvider).user;
    final hasNotes = (lesson.html ?? '').trim().isNotEmpty;
    final l10n = context.l10n;
    final tabs = [if (hasNotes) 'notes', 'lessons', 'attachments'];
    final current = tabs[_tab.clamp(0, tabs.length - 1)];

    return Scaffold(
      body: Column(
        children: [
          ColoredBox(
            color: BrandColors.midnight,
            child: SafeArea(
              bottom: false,
              child: LessonVideoPlayer(
                key: ValueKey('video-${lesson.id}'),
                video: lesson.video!,
                startSeconds: lesson.positionSeconds,
                reloadVideo: widget.reloadVideo,
                watermark: watermarkText(config.content.watermark, user),
                captured: widget.captured,
                onProgress: widget.onProgress,
                onEnded: widget.onEnded,
                overlay: AppBackButton(
                  onDark: true,
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
              children: [
                if (widget.subtitle.isNotEmpty)
                  Text(
                    widget.subtitle,
                    style: TextStyle(fontSize: 12, color: p.textSecondary),
                  ),
                const SizedBox(height: 4),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      // 110 In the direction of the lesson's notes.
                      child: ContentTitle(
                        title: lesson.title,
                        html: lesson.html ?? '',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                    ),
                    widget.download,
                  ],
                ),
                const SizedBox(height: 14),
                SegmentedTabs(
                  labels: [
                    for (final t in tabs)
                      switch (t) {
                        'notes' => l10n.notes,
                        'attachments' => l10n.attachments,
                        _ => l10n.lessons,
                      },
                  ],
                  selected: _tab.clamp(0, tabs.length - 1),
                  onChanged: (i) => setState(() => _tab = i),
                ),
                const SizedBox(height: 14),
                switch (current) {
                  'notes' => HtmlContent(
                    html: lesson.html!,
                    embeds: lesson.embeds,
                    title: lesson.title,
                    embedHeight: lesson.embedHeight,
                  ),
                  'attachments' =>
                    lesson.attachments.isEmpty
                        ? Padding(
                            padding: const EdgeInsets.all(16),
                            child: Text(
                              l10n.noAttachments,
                              textAlign: TextAlign.center,
                              style: TextStyle(color: p.textSecondary),
                            ),
                          )
                        : _Attachments(attachments: lesson.attachments),
                  _ => _TopicItems(
                    items: widget.position.siblings,
                    currentId: lesson.id,
                    courseId: lesson.courseId,
                  ),
                },
              ],
            ),
          ),
          widget.footer,
        ],
      ),
    );
  }
}

class _TopicItems extends StatelessWidget {
  const _TopicItems({
    required this.items,
    required this.currentId,
    required this.courseId,
  });

  final List<CurriculumItem> items;
  final int currentId;
  final int courseId;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    if (items.isEmpty) return const SizedBox.shrink();
    return AppCard(
      child: Column(
        children: [
          for (final (i, item) in items.indexed) ...[
            if (i > 0) Divider(height: 1, color: p.divider),
            _TopicItemRow(
              item: item,
              current:
                  item.type == CurriculumItemType.lesson &&
                  item.id == currentId,
              onTap: () => openCurriculumItem(
                context,
                item,
                courseId: courseId,
                replace: true,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _TopicItemRow extends StatelessWidget {
  const _TopicItemRow({
    required this.item,
    required this.current,
    required this.onTap,
  });

  final CurriculumItem item;
  final bool current;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final Widget marker;
    if (item.completed) {
      marker = Container(
        width: 24,
        height: 24,
        decoration: BoxDecoration(color: p.success, shape: BoxShape.circle),
        child: const AppIcon(AppIcons.check, size: 14, color: Colors.white),
      );
    } else if (current) {
      marker = Container(
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: p.text, width: 2),
        ),
        alignment: Alignment.center,
        child: Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(color: p.text, shape: BoxShape.circle),
        ),
      );
    } else if (item.locked) {
      marker = AppIcon(AppIcons.lock, size: 22, color: p.textSecondary);
    } else {
      marker = Container(
        width: 24,
        height: 24,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: p.inputBorder, width: 2),
        ),
      );
    }
    final trailing =
        item.type == CurriculumItemType.quiz && item.questionCount != null
        ? context.l10n.questionCount(item.questionCount!)
        : (item.durationMinutes != null
              ? formatMinutes(item.durationMinutes!)
              : null);
    return Semantics(
      selected: current,
      button: !current,
      label: [
        item.title,
        if (item.completed) context.l10n.completedLower,
        if (item.locked) context.l10n.lockedLower,
        if (current) context.l10n.playingNow,
      ].join(', '),
      excludeSemantics: true,
      child: InkWell(
        onTap: current ? null : onTap,
        child: Container(
          color: current ? p.accentSoft : null,
          constraints: const BoxConstraints(minHeight: 48),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              marker,
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  item.title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: current ? FontWeight.w700 : FontWeight.w400,
                    color: item.completed && !current
                        ? p.textSecondary
                        : p.text,
                  ),
                ),
              ),
              if (trailing != null)
                Text(
                  trailing,
                  style: TextStyle(fontSize: 12, color: p.textSecondary),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Attachments extends ConsumerWidget {
  const _Attachments({required this.attachments});

  final List<Attachment> attachments;

  /// 45 A saved attachment opens from the phone; the others from the web.
  /// 53 While screen protection is on, both open only in the app's own
  /// viewer: no other app gets the file, and nothing offers to share, save
  /// or print it.
  Future<void> _open(BuildContext context, WidgetRef ref, Attachment a) async {
    final url = a.url;
    final saved = url.startsWith('$savedFileScheme:');
    if (ref.read(attachmentsInAppProvider)) {
      final downloads = ref.read(downloadManagerProvider.notifier);
      final fetch = ref.read(attachmentFetcherProvider);
      await openInViewer(
        context,
        name: a.name,
        mimeType: a.mimeType,
        load: () => saved ? downloads.savedBytes(url) : fetch(url),
      );
      return;
    }
    if (!saved) {
      await openExternal(url);
      return;
    }
    final opened = await ref
        .read(downloadManagerProvider.notifier)
        .openSaved(url);
    if (!opened && context.mounted) {
      showMessage(context, context.l10n.downloadFailed);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => AppCard(
    child: Column(
      children: [
        for (final (i, a) in attachments.indexed) ...[
          if (i > 0) Divider(height: 1, color: context.palette.divider),
          SettingsTile(
            icon: AppIcons.attachment,
            title: a.name,
            value: a.sizeBytes == null ? null : _size(a.sizeBytes!),
            trailing: AppIcon(
              AppIcons.download,
              size: 20,
              color: context.palette.textSecondary,
            ),
            onTap: () => _open(context, ref, a),
          ),
        ],
      ],
    ),
  );
}

String _size(int bytes) {
  if (bytes < 1024) return currentL10n.sizeBytes(bytes);
  if (bytes < 1024 * 1024) {
    return currentL10n.sizeKilobytes((bytes / 1024).toStringAsFixed(0));
  }
  return currentL10n.sizeMegabytes((bytes / (1024 * 1024)).toStringAsFixed(1));
}
