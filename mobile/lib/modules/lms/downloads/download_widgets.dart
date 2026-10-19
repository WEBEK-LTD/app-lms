import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/api/models/models.dart';
import '../../../core/auth/auth_controller.dart';
import '../../../core/gate/app_gate.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/routing/paths.dart';
import '../../../core/theme/app_icons.dart';
import '../../../core/theme/palette.dart';
import '../../../core/widgets/buttons.dart';
import '../../../core/widgets/common.dart';
import 'download_manager.dart';
import 'download_models.dart';

/// "120 MB", "1.4 GB".
String formatBytes(int bytes) {
  final l10n = currentL10n;
  if (bytes < 1024) return l10n.sizeBytes(bytes);
  if (bytes < 1024 * 1024) {
    return l10n.sizeKilobytes((bytes / 1024).toStringAsFixed(0));
  }
  if (bytes < 1024 * 1024 * 1024) {
    return l10n.sizeMegabytes((bytes / (1024 * 1024)).toStringAsFixed(1));
  }
  return l10n.sizeGigabytes((bytes / (1024 * 1024 * 1024)).toStringAsFixed(1));
}

/// 45 Whether this app saves lessons here: the app's plan and owner allow it,
/// the phone can (not the web preview), and a student is signed in.
bool downloadsOffered(WidgetRef ref) {
  final gate = ref.watch(appGateProvider);
  if (gate is! GateReady || !gate.config.features.downloads) return false;
  if (!ref.watch(downloadManagerProvider.select((s) => s.supported))) {
    return false;
  }
  return ref.watch(authControllerProvider.select((s) => s.isSignedIn));
}

/// The words for a saved lesson's state.
String savedLessonStatus(BuildContext context, SavedLesson lesson) =>
    switch (lesson.status) {
      SavedStatus.done => context.l10n.downloadSaved,
      SavedStatus.queued => context.l10n.downloadQueued,
      SavedStatus.downloading => context.l10n.downloadSavingLesson(
        (lesson.progress * 100).round(),
      ),
      SavedStatus.paused => context.l10n.downloadPaused,
      SavedStatus.failed => lesson.error ?? context.l10n.downloadFailed,
    };

/// 45 The lesson's "Save for offline" button. A lesson that needs the
/// internet (a video site's video, a web page) keeps the button, which says
/// why when tapped.
class LessonDownloadButton extends ConsumerWidget {
  const LessonDownloadButton({
    super.key,
    required this.lesson,
    required this.courseTitle,
    this.courseImage,
    this.onDark = false,
  });

  final Lesson lesson;
  final String courseTitle;
  final String? courseImage;
  final bool onDark;

  Future<void> _tap(
    BuildContext context,
    WidgetRef ref,
    SavedLesson? saved,
  ) async {
    final manager = ref.read(downloadManagerProvider.notifier);
    final l10n = context.l10n;
    if (saved == null || saved.status == SavedStatus.failed) {
      try {
        await manager.saveLesson(
          lesson,
          courseTitle: courseTitle,
          courseImage: courseImage,
        );
        if (context.mounted) showMessage(context, l10n.downloadStarted);
      } on DownloadRefused catch (e) {
        if (context.mounted) showMessage(context, e.message);
      }
      return;
    }
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheet) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: Text(lesson.title),
              subtitle: Text(savedLessonStatus(sheet, saved)),
            ),
            if (saved.active)
              ListTile(
                leading: const AppIcon(AppIcons.pause),
                title: Text(l10n.downloadPause),
                onTap: () {
                  Navigator.of(sheet).pop();
                  manager.pause(lesson.id);
                },
              ),
            if (saved.status == SavedStatus.paused)
              ListTile(
                leading: const AppIcon(AppIcons.play),
                title: Text(l10n.downloadResume),
                onTap: () {
                  Navigator.of(sheet).pop();
                  manager.resume(lesson.id);
                },
              ),
            ListTile(
              leading: AppIcon(AppIcons.delete, color: sheet.palette.danger),
              title: Text(
                saved.done ? l10n.downloadDelete : l10n.downloadCancel,
                style: TextStyle(color: sheet.palette.danger),
              ),
              onTap: () {
                Navigator.of(sheet).pop();
                manager.delete(lesson.id);
              },
            ),
            ListTile(
              leading: const AppIcon(AppIcons.downloads),
              title: Text(l10n.downloads),
              onTap: () {
                Navigator.of(sheet).pop();
                context.push(Paths.downloads);
              },
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!downloadsOffered(ref)) return const SizedBox.shrink();
    final saved = ref.watch(
      downloadManagerProvider.select((s) => s.lesson(lesson.id)),
    );
    final p = context.palette;
    final available = lesson.offline?.available ?? false;
    final icon = switch (saved?.status) {
      SavedStatus.done => AppIcons.downloadDone,
      SavedStatus.queued || SavedStatus.downloading => AppIcons.downloading,
      SavedStatus.paused => AppIcons.pause,
      _ => available ? AppIcons.download : AppIcons.downloadOff,
    };
    final label = saved == null
        ? (available
              ? context.l10n.downloadLesson
              : offlineBlockerMessage(lesson.offline?.reason))
        : savedLessonStatus(context, saved);
    final button = SquareIconButton(
      key: const ValueKey('lesson-download'),
      icon: icon,
      label: label,
      filled: saved?.done ?? false,
      foreground: onDark
          ? Colors.white
          : (saved?.done ?? false)
          ? p.success
          : (available ? p.text : p.textSecondary),
      background: onDark ? Colors.black.withValues(alpha: 0.35) : null,
      bordered: !onDark,
      onPressed: () => _tap(context, ref, saved),
    );
    if (saved == null || !saved.active) return button;
    return Stack(
      alignment: Alignment.center,
      children: [
        button,
        IgnorePointer(
          child: SizedBox(
            width: 40,
            height: 40,
            child: CircularProgressIndicator(
              value: saved.status == SavedStatus.queued ? null : saved.progress,
              strokeWidth: 2.5,
              color: onDark ? Colors.white : p.link,
            ),
          ),
        ),
      ],
    );
  }
}

/// 45 "Save course for offline" on the course page, with how far it got.
class CourseDownloadButton extends ConsumerWidget {
  const CourseDownloadButton({
    super.key,
    required this.course,
    required this.topics,
  });

  final CourseDetail course;
  final List<Topic>? topics;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!downloadsOffered(ref) || !course.enrolled) {
      return const SizedBox.shrink();
    }
    final status = ref.watch(
      downloadManagerProvider.select((s) => s.course(course.id)),
    );
    final l10n = context.l10n;
    final p = context.palette;
    final String text;
    final IconData icon;
    if (status.total == 0) {
      text = l10n.downloadCourse;
      icon = AppIcons.download;
    } else if (status.active) {
      text = l10n.downloadSaving(status.saved, status.total);
      icon = AppIcons.downloading;
    } else {
      text = l10n.downloadCourseSaved(status.saved);
      icon = AppIcons.downloadDone;
    }
    return Semantics(
      button: true,
      label: text,
      excludeSemantics: true,
      child: Material(
        color: p.surface,
        shape: RoundedRectangleBorder(
          side: BorderSide(color: p.border),
          borderRadius: BorderRadius.circular(12),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          key: const ValueKey('course-download'),
          onTap: () async {
            if (status.total > 0 && !status.active) {
              await context.push(Paths.downloads);
              return;
            }
            final list = topics;
            if (list == null) return;
            final added = await ref
                .read(downloadManagerProvider.notifier)
                .saveCourse(course, list);
            if (context.mounted) {
              showMessage(context, l10n.downloadCourseStarted(added));
            }
          },
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                children: [
                  AppIcon(
                    icon,
                    size: 20,
                    color: status.total > 0 && !status.active
                        ? p.success
                        : p.text,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      text,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: p.text,
                      ),
                    ),
                  ),
                  if (status.bytes > 0)
                    Text(
                      formatBytes(status.bytes),
                      style: TextStyle(fontSize: 12, color: p.textSecondary),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
