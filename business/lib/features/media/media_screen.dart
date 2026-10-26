import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/services/media_picker.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/theme/theme.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import 'uploads.dart';

class _Kind extends Notifier<String?> {
  @override
  String? build() => null;
  void set(String? kind) => state = kind;
}

final mediaKindProvider = NotifierProvider<_Kind, String?>(_Kind.new);

final mediaProvider = FutureProvider.autoDispose<MediaList>(
  (ref) => ref
      .watch(apiProvider)
      .media(ref.watch(appIdProvider), kind: ref.watch(mediaKindProvider)),
);

/// "1.2 MB" for a size in bytes.
String formatBytes(int bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  var value = bytes.toDouble();
  var unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return '${value.toStringAsFixed(value >= 10 || unit == 0 ? 0 : 1)} ${units[unit]}';
}

/// Asks where the file comes from and starts its upload. Returns the file
/// once it's in Media.
Future<MediaFile?> pickAndUpload(
  BuildContext context,
  WidgetRef ref, {
  bool videoOnly = false,
}) async {
  final l10n = context.l10n;
  final source = await showModalBottomSheet<PickSource>(
    context: context,
    builder: (sheet) => SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!videoOnly)
            ListTile(
              leading: const Icon(AppIcons.photo),
              title: Text(l10n.takePhoto),
              onTap: () => Navigator.pop(sheet, PickSource.cameraPhoto),
            ),
          ListTile(
            leading: const Icon(AppIcons.video),
            title: Text(l10n.recordVideo),
            onTap: () => Navigator.pop(sheet, PickSource.cameraVideo),
          ),
          ListTile(
            leading: const Icon(AppIcons.gallery),
            title: Text(l10n.chooseFromGallery),
            onTap: () => Navigator.pop(sheet, PickSource.gallery),
          ),
        ],
      ),
    ),
  );
  if (source == null) return null;
  final file = await ref.read(mediaPickerProvider).pick(source);
  if (file == null || !context.mounted) return null;
  if (mediaTypeOf(file.name) == null && file.type.isEmpty) {
    showMessage(context, l10n.fileTypeNotAllowed);
    return null;
  }
  try {
    final media = await ref
        .read(uploadsProvider.notifier)
        .start(ref.read(appIdProvider), file);
    if (context.mounted && media != null) {
      showMessage(context, l10n.uploaded(media.name));
    }
    return media;
  } on Object catch (e) {
    if (context.mounted) showError(context, e);
    return null;
  }
}

/// 59 The Media library: the storage meter (read-only, packs are on
/// yallapp.com.tr), the files, and uploads from the camera or the gallery.
class MediaScreen extends ConsumerWidget {
  const MediaScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final media = ref.watch(mediaProvider);
    final kind = ref.watch(mediaKindProvider);
    final jobs = ref.watch(uploadsProvider);
    ref.listen(uploadsProvider, (previous, next) {
      final finished = next.values.any(
        (j) =>
            j.status == UploadStatus.done &&
            previous?[j.id]?.status != UploadStatus.done,
      );
      if (finished) ref.invalidate(mediaProvider);
    });
    final full = media.value?.storage.full ?? false;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.media)),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: full
            ? () => showMessage(context, l10n.storageFull)
            : () async {
                await pickAndUpload(context, ref);
                ref.invalidate(mediaProvider);
              },
        icon: const Icon(AppIcons.upload),
        label: Text(l10n.upload),
      ),
      body: RefreshIndicator(
        onRefresh: pullToRefresh(
          context,
          () => ref.refresh(mediaProvider.future),
        ),
        child: AsyncBody(
          value: media,
          onRetry: () => ref.invalidate(mediaProvider),
          builder: (list) {
            final active = jobs.values
                .where((j) => j.status != UploadStatus.done)
                .toList();
            final uploading = {for (final j in jobs.values) j.id};
            final files = list.items
                .where((m) => m.ready || !uploading.contains(m.id))
                .toList();
            return ListView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
              children: [
                _StorageMeter(storage: list.storage),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final (value, label) in [
                      (null, l10n.allFiles),
                      ('video', l10n.videos),
                      ('image', l10n.pictures),
                      ('pdf', l10n.pdfs),
                    ])
                      ChoiceChip(
                        label: Text(label),
                        selected: kind == value,
                        onSelected: (_) =>
                            ref.read(mediaKindProvider.notifier).set(value),
                      ),
                  ],
                ),
                if (active.isNotEmpty) ...[
                  SectionTitle(l10n.uploading),
                  for (final job in active) _JobTile(job: job),
                ],
                const SizedBox(height: 8),
                if (files.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 48),
                    child: Text(l10n.noMedia, textAlign: TextAlign.center),
                  ),
                for (final file in files)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 10),
                    child: _FileTile(file: file),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _StorageMeter extends ConsumerWidget {
  const _StorageMeter({required this.storage});

  final Storage storage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final share = storage.share;
    return Panel(
      color: storage.full ? context.yb.warningBg : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(l10n.storage, style: theme.textTheme.titleSmall),
          const SizedBox(height: 6),
          Text(
            storage.limit == null
                ? l10n.storageUsedNoPlan(storage.used)
                : l10n.storageUsed(storage.used, storage.limit!),
            style: theme.textTheme.bodyMedium,
          ),
          if (share != null) ...[
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: share,
              minHeight: 8,
              borderRadius: BorderRadius.circular(8),
              semanticsLabel: l10n.storage,
            ),
          ],
          if (storage.full) ...[
            const SizedBox(height: 8),
            Text(l10n.storageFull),
          ],
          // 65 Not on iOS: no way to buy storage outside the App Store.
          if (defaultTargetPlatform != TargetPlatform.iOS)
            TextButton.icon(
              onPressed: () => openLink(context, ref, storage.manageUrl),
              icon: const DirectionalIcon(AppIcons.web, size: 18),
              label: Text(l10n.manageOnWebsite),
            ),
        ],
      ),
    );
  }
}

class _JobTile extends ConsumerWidget {
  const _JobTile({required this.job});

  final UploadJob job;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final uploads = ref.read(uploadsProvider.notifier);
    final error = job.error;
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    job.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(context.percent(job.progress)),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(
              value: job.progress,
              minHeight: 6,
              borderRadius: BorderRadius.circular(6),
              semanticsLabel: l10n.uploadingFile(job.name),
            ),
            const SizedBox(height: 6),
            Text(switch (job.status) {
              UploadStatus.paused => l10n.uploadPaused,
              UploadStatus.failed =>
                error == null
                    ? l10n.uploadFailed
                    : errorMessage(context, error),
              _ => '${formatBytes(job.sent)} / ${formatBytes(job.size)}',
            }, style: Theme.of(context).textTheme.bodySmall),
            Wrap(
              alignment: WrapAlignment.end,
              children: [
                if (job.status == UploadStatus.uploading)
                  TextButton.icon(
                    onPressed: () => uploads.pause(job.id),
                    icon: const Icon(AppIcons.pause),
                    label: Text(l10n.pause),
                  )
                else
                  TextButton.icon(
                    onPressed: () => uploads.resume(job.appId, job.id),
                    icon: const Icon(AppIcons.play),
                    label: Text(l10n.resume),
                  ),
                TextButton(
                  onPressed: () =>
                      uploads.cancel(job.appId, job.id).catchError((Object e) {
                        if (context.mounted) showError(context, e);
                      }),
                  child: Text(l10n.cancelUpload),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FileTile extends ConsumerWidget {
  const _FileTile({required this.file});

  final MediaFile file;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final uploads = ref.read(uploadsProvider.notifier);
    final appId = ref.read(appIdProvider);
    Future<void> delete() async {
      final ok = await confirm(
        context,
        title: l10n.deleteFileTitle(file.name),
        text: l10n.deleteFileText,
        action: l10n.delete,
        destructive: true,
      );
      if (!ok) return;
      try {
        await ref.read(apiProvider).deleteMedia(appId, file.id);
        ref.invalidate(mediaProvider);
      } on Object catch (e) {
        if (context.mounted) showError(context, e);
      }
    }

    return Panel(
      padding: const EdgeInsets.fromLTRB(14, 10, 4, 10),
      child: Row(
        children: [
          Icon(switch (file.kind) {
            'video' => AppIcons.movie,
            'pdf' => AppIcons.pdf,
            _ => AppIcons.image,
          }),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  file.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.titleSmall,
                ),
                Text(
                  '${formatBytes(file.sizeBytes)} · ${context.date(file.createdAt)}',
                  style: theme.textTheme.bodySmall,
                ),
                if (!file.ready) ...[
                  const SizedBox(height: 4),
                  StatusChip(l10n.unfinishedUpload, tone: Tone.warn),
                ],
              ],
            ),
          ),
          if (!file.ready && uploads.canResume(file.id))
            TextButton(
              onPressed: () async {
                try {
                  await uploads.resume(appId, file.id);
                } on ApiException catch (e) {
                  if (context.mounted) {
                    showMessage(
                      context,
                      e.code == 'file_missing'
                          ? l10n.fileMissing
                          : errorMessage(context, e),
                    );
                  }
                }
              },
              child: Text(l10n.resume),
            ),
          PopupMenuButton<String>(
            tooltip: l10n.moreActions,
            onSelected: (action) async {
              if (action == 'copy') {
                await Clipboard.setData(ClipboardData(text: file.link));
                if (context.mounted) showMessage(context, l10n.linkCopied);
              } else {
                await delete();
              }
            },
            itemBuilder: (_) => [
              if (file.ready)
                PopupMenuItem(value: 'copy', child: Text(l10n.copyLink)),
              PopupMenuItem(
                value: 'delete',
                child: Text(file.ready ? l10n.delete : l10n.cancelUpload),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
