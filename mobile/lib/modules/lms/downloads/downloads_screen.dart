import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/l10n/l10n.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import '../navigation.dart';
import 'download_manager.dart';
import 'download_models.dart';
import 'download_widgets.dart';

/// 45 Account › Downloads: what's saved for offline viewing, by course, with
/// the space it takes, the transfers under way (pause, resume, cancel), the
/// Wi-Fi only setting, and deleting a course or everything.
class DownloadsScreen extends ConsumerStatefulWidget {
  const DownloadsScreen({super.key});

  @override
  ConsumerState<DownloadsScreen> createState() => _DownloadsScreenState();
}

class _DownloadsScreenState extends ConsumerState<DownloadsScreen> {
  String? _notice;

  @override
  void initState() {
    super.initState();
    // Shown once.
    Future.microtask(() {
      if (!mounted) return;
      final notice = ref.read(downloadManagerProvider).notice;
      if (notice != null) {
        setState(() => _notice = notice);
        ref.read(downloadManagerProvider.notifier).clearNotice();
      }
    });
  }

  Future<void> _deleteAll() async {
    final ok = await confirmAction(
      context,
      title: context.l10n.downloadsDeleteAll,
      message: context.l10n.downloadsDeleteAllConfirm,
      confirmLabel: context.l10n.delete,
      destructive: true,
    );
    if (ok) await ref.read(downloadManagerProvider.notifier).deleteAll();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(downloadManagerProvider);
    final p = context.palette;
    final l10n = context.l10n;
    final index = state.index;
    final courses = [
      for (final course in index.courses.values)
        if (index.lessonsOf(course.courseId).isNotEmpty) course,
    ];
    final now = DateTime.now();
    return Scaffold(
      appBar: AppBar(
        leading: const AppBarBackButton(),
        title: Text(l10n.downloads),
      ),
      body: !state.supported
          ? MessageView(
              icon: AppIcons.downloads,
              title: l10n.downloads,
              message: l10n.downloadsUnsupported,
            )
          : ListView(
              padding: readablePadding(context, top: 8, bottom: 32),
              children: [
                if (_notice != null) ...[
                  _Notice(text: _notice!),
                  const SizedBox(height: 16),
                ],
                AppCard(
                  child: Column(
                    children: [
                      SettingsTile(
                        key: const ValueKey('downloads-storage'),
                        icon: AppIcons.storage,
                        title: l10n.downloadsStorage,
                        value: formatBytes(index.bytes),
                        chevron: false,
                      ),
                      Divider(height: 1, color: p.divider),
                      SettingsTile(
                        icon: AppIcons.wifi,
                        title: l10n.downloadsWifiOnly,
                        subtitle: l10n.downloadsWifiOnlyHint,
                        chevron: false,
                        trailing: Switch(
                          key: const ValueKey('downloads-wifi-only'),
                          value: index.wifiOnly,
                          onChanged: (on) => ref
                              .read(downloadManagerProvider.notifier)
                              .setWifiOnly(on),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                if (courses.isEmpty)
                  MessageView(
                    icon: AppIcons.downloads,
                    title: l10n.downloadsEmptyTitle,
                    message: l10n.downloadsEmptyMessage,
                  )
                else ...[
                  for (final course in courses) ...[
                    _CourseDownloads(course: course, index: index),
                    const SizedBox(height: 12),
                  ],
                  const SizedBox(height: 8),
                  SecondaryButton(
                    key: const ValueKey('downloads-delete-all'),
                    label: l10n.downloadsDeleteAll,
                    icon: AppIcons.delete,
                    onPressed: _deleteAll,
                  ),
                ],
                const SizedBox(height: 20),
                Text(
                  [
                    l10n.downloadsNote(index.keepDays),
                    if (!index.isEmpty && index.checkedAt != null)
                      l10n.downloadsKeptFor(index.daysLeft(now)),
                  ].join(' '),
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    color: p.textSecondary,
                  ),
                ),
              ],
            ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    return Semantics(
      liveRegion: true,
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: p.accentSoft,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            AppIcon(AppIcons.info, size: 20, color: p.text),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                text,
                style: TextStyle(fontSize: 14, height: 1.5, color: p.text),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CourseDownloads extends ConsumerWidget {
  const _CourseDownloads({required this.course, required this.index});

  final SavedCourse course;
  final DownloadIndex index;

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final ok = await confirmAction(
      context,
      title: course.title,
      message: context.l10n.downloadsDeleteCourseConfirm,
      confirmLabel: context.l10n.delete,
      destructive: true,
    );
    if (ok) {
      await ref
          .read(downloadManagerProvider.notifier)
          .deleteCourse(course.courseId);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = context.palette;
    final l10n = context.l10n;
    final lessons = index.lessonsOf(course.courseId);
    final saved = lessons.where((l) => l.done).length;
    final manager = ref.read(downloadManagerProvider.notifier);
    return AppCard(
      key: ValueKey('downloads-course-${course.courseId}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => openCourse(context, course.courseId),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(14, 14, 6, 14),
              child: Row(
                children: [
                  AppNetworkImage(
                    url: course.imageUrl,
                    seed: course.courseId,
                    width: 52,
                    height: 52,
                    radius: 10,
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
                            color: p.text,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          l10n.downloadCourseSize(
                            l10n.downloadCourseSaved(saved),
                            formatBytes(index.bytesOf(course.courseId)),
                          ),
                          style: TextStyle(
                            fontSize: 12,
                            color: p.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  SquareIconButton(
                    key: ValueKey('downloads-delete-${course.courseId}'),
                    icon: AppIcons.delete,
                    label: l10n.downloadDelete,
                    bordered: false,
                    foreground: p.danger,
                    onPressed: () => _delete(context, ref),
                  ),
                ],
              ),
            ),
          ),
          for (final lesson in lessons) ...[
            Divider(height: 1, color: p.divider),
            _LessonRow(lesson: lesson, manager: manager),
          ],
        ],
      ),
    );
  }
}

class _LessonRow extends StatelessWidget {
  const _LessonRow({required this.lesson, required this.manager});

  final SavedLesson lesson;
  final DownloadManager manager;

  @override
  Widget build(BuildContext context) {
    final p = context.palette;
    final l10n = context.l10n;
    final status = savedLessonStatus(context, lesson);
    return Semantics(
      label: '${lesson.title}, $status',
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 10, 6, 10),
        child: Row(
          children: [
            AppIcon(
              lesson.done
                  ? AppIcons.downloadDone
                  : lesson.status == SavedStatus.failed
                  ? AppIcons.error
                  : AppIcons.downloading,
              size: 20,
              color: lesson.done
                  ? p.success
                  : lesson.status == SavedStatus.failed
                  ? p.danger
                  : p.textSecondary,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: ExcludeSemantics(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      lesson.title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontSize: 14, color: p.text),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      lesson.done ? formatBytes(lesson.bytes) : status,
                      style: TextStyle(
                        fontSize: 12,
                        color: lesson.status == SavedStatus.failed
                            ? p.danger
                            : p.textSecondary,
                      ),
                    ),
                    if (lesson.status == SavedStatus.downloading ||
                        lesson.status == SavedStatus.paused) ...[
                      const SizedBox(height: 6),
                      ProgressTrack(
                        percent: (lesson.progress * 100).round(),
                        height: 4,
                      ),
                    ],
                  ],
                ),
              ),
            ),
            if (lesson.active)
              SquareIconButton(
                key: ValueKey('download-pause-${lesson.lessonId}'),
                icon: AppIcons.pause,
                label: l10n.downloadPause,
                bordered: false,
                onPressed: () => manager.pause(lesson.lessonId),
              )
            else if (lesson.status == SavedStatus.paused ||
                lesson.status == SavedStatus.failed)
              SquareIconButton(
                key: ValueKey('download-resume-${lesson.lessonId}'),
                icon: lesson.status == SavedStatus.failed
                    ? AppIcons.refresh
                    : AppIcons.play,
                label: lesson.status == SavedStatus.failed
                    ? l10n.downloadRetry
                    : l10n.downloadResume,
                bordered: false,
                onPressed: () => manager.resume(lesson.lessonId),
              ),
            SquareIconButton(
              key: ValueKey('download-remove-${lesson.lessonId}'),
              icon: lesson.done ? AppIcons.delete : AppIcons.close,
              label: lesson.done ? l10n.downloadDelete : l10n.downloadCancel,
              bordered: false,
              foreground: p.textSecondary,
              onPressed: () => manager.delete(lesson.lessonId),
            ),
          ],
        ),
      ),
    );
  }
}
