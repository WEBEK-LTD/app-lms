import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/session.dart';
import '../../core/theme/icons.dart';
import '../../core/widgets/l10n.dart';
import '../../core/widgets/states.dart';
import '../media/media_screen.dart';
import '../media/uploads.dart';
import 'catalog_screen.dart';

final _videosProvider = FutureProvider.autoDispose<List<MediaFile>>((
  ref,
) async {
  final list = await ref
      .watch(apiProvider)
      .media(ref.watch(appIdProvider), kind: 'video');
  return list.items.where((m) => m.ready).toList();
});

/// 59 Add a lesson to a course's section: a title, a video from Media (or
/// one recorded or picked now and uploaded), text, minutes and whether it's
/// a free preview (the dashboard's lesson rules).
class AddLessonScreen extends ConsumerStatefulWidget {
  const AddLessonScreen({
    super.key,
    required this.courseId,
    required this.topicId,
  });

  final int courseId;
  final int topicId;

  @override
  ConsumerState<AddLessonScreen> createState() => _AddLessonScreenState();
}

class _AddLessonScreenState extends ConsumerState<AddLessonScreen> {
  final _title = TextEditingController();
  final _text = TextEditingController();
  final _minutes = TextEditingController();
  MediaFile? _video;
  bool _preview = false;
  bool _busy = false;
  bool _uploading = false;
  Map<String, String> _errors = const {};

  @override
  void dispose() {
    _title.dispose();
    _text.dispose();
    _minutes.dispose();
    super.dispose();
  }

  Future<void> _chooseFromMedia() async {
    final l10n = context.l10n;
    final picked = await showModalBottomSheet<MediaFile>(
      context: context,
      isScrollControlled: true,
      builder: (sheet) => Consumer(
        builder: (context, ref, _) {
          final videos = ref.watch(_videosProvider);
          return SizedBox(
            height: MediaQuery.sizeOf(context).height * 0.6,
            child: AsyncBody(
              value: videos,
              onRetry: () => ref.invalidate(_videosProvider),
              builder: (items) => items.isEmpty
                  ? EmptyState(icon: AppIcons.movie, title: l10n.noVideos)
                  : ListView(
                      children: [
                        for (final v in items)
                          ListTile(
                            leading: const Icon(AppIcons.movie),
                            title: Text(v.name),
                            subtitle: Text(formatBytes(v.sizeBytes)),
                            onTap: () => Navigator.pop(sheet, v),
                          ),
                      ],
                    ),
            ),
          );
        },
      ),
    );
    if (picked != null) setState(() => _video = picked);
  }

  Future<void> _recordOrPick() async {
    setState(() => _uploading = true);
    final media = await pickAndUpload(context, ref, videoOnly: true);
    if (!mounted) return;
    setState(() {
      _uploading = false;
      if (media != null && media.kind == 'video') _video = media;
    });
  }

  Future<void> _save() async {
    final l10n = context.l10n;
    final title = _title.text.trim();
    final minutesText = _minutes.text.trim();
    final minutes = int.tryParse(minutesText);
    final errors = <String, String>{
      if (title.length < 2 || title.length > 120) 'title': l10n.lessonTitleRule,
      if (minutesText.isNotEmpty &&
          (minutes == null || minutes < 1 || minutes > 600))
        'duration_minutes': l10n.lessonMinutesRule,
      if (_video == null && _text.text.trim().isEmpty)
        'video': l10n.lessonNeedsContent,
    };
    if (errors.isNotEmpty) {
      setState(() => _errors = errors);
      return;
    }
    setState(() {
      _busy = true;
      _errors = const {};
    });
    try {
      await ref
          .read(apiProvider)
          .addLesson(
            ref.read(appIdProvider),
            widget.courseId,
            widget.topicId,
            LessonRequest(
              title: title,
              videoMediaId: _video?.id,
              text: _text.text.trim(),
              durationMinutes: minutes,
              preview: _preview,
            ),
          );
      ref.invalidate(coursesProvider);
      if (!mounted) return;
      showMessage(context, l10n.lessonAdded(title));
      Navigator.pop(context);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _errors = e.fieldErrors);
      if (e.fieldErrors.isEmpty) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);
    final jobs = ref
        .watch(uploadsProvider)
        .values
        .where((j) => j.status == UploadStatus.uploading);
    return Scaffold(
      appBar: AppBar(title: Text(l10n.addLesson)),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
        children: [
          TextField(
            controller: _title,
            maxLength: 120,
            decoration: InputDecoration(
              labelText: l10n.lessonTitle,
              errorText: _errors['title'],
            ),
          ),
          const SizedBox(height: 8),
          Text(l10n.video, style: theme.textTheme.titleSmall),
          const SizedBox(height: 8),
          Panel(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_video != null)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const Icon(AppIcons.movie),
                    title: Text(_video!.name),
                    trailing: IconButton(
                      tooltip: l10n.removeVideo,
                      icon: const Icon(AppIcons.close),
                      onPressed: () => setState(() => _video = null),
                    ),
                  )
                else
                  Text(l10n.noVideoChosen, style: theme.textTheme.bodySmall),
                for (final job in jobs) ...[
                  const SizedBox(height: 8),
                  Text(
                    l10n.uploadingFile(job.name),
                    style: theme.textTheme.bodySmall,
                  ),
                  const SizedBox(height: 4),
                  LinearProgressIndicator(
                    value: job.progress,
                  ),
                ],
                if (_errors['video'] != null ||
                    _errors['video_media_id'] != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      _errors['video'] ?? _errors['video_media_id']!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.error,
                      ),
                    ),
                  ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    OutlinedButton.icon(
                      onPressed: _uploading ? null : _chooseFromMedia,
                      icon: const Icon(AppIcons.media),
                      label: Text(l10n.chooseFromMedia),
                    ),
                    OutlinedButton.icon(
                      onPressed: _uploading ? null : _recordOrPick,
                      icon: const Icon(AppIcons.video),
                      label: Text(l10n.recordOrUpload),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _text,
            minLines: 3,
            maxLines: 8,
            maxLength: 20000,
            decoration: InputDecoration(
              labelText: l10n.lessonText,
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _minutes,
            keyboardType: TextInputType.number,
            decoration: InputDecoration(
              labelText: l10n.lessonMinutes,
              errorText: _errors['duration_minutes'],
            ),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            value: _preview,
            onChanged: (v) => setState(() => _preview = v),
            title: Text(l10n.freePreview),
            subtitle: Text(l10n.freePreviewHelp),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy || _uploading ? null : _save,
            child: Text(l10n.addLesson),
          ),
        ],
      ),
    );
  }
}
