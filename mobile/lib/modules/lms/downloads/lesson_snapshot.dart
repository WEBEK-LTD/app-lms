import '../../../core/api/models/models.dart';
import 'download_models.dart';

/// 45 Attachments saved on the phone open from here, not from the web.
const savedFileScheme = 'yallapp-saved';

/// The lesson as JSON in the contract's shape, kept (encrypted) with its
/// files so it opens without a connection. The video's signed link isn't
/// kept: the saved file plays instead.
Map<String, dynamic> lessonToJson(Lesson lesson) => {
  'id': lesson.id,
  'course_id': lesson.courseId,
  'title': lesson.title,
  'render_mode': lesson.renderMode.name,
  'html': lesson.html,
  'webview_url': null,
  'embeds': [
    for (final e in lesson.embeds)
      {
        'placeholder': e.placeholder,
        'src': e.src,
        'provider': switch (e.provider) {
          EmbedProvider.sameSite => 'same_site',
          _ => e.provider.name,
        },
        'width': e.width,
        'height': e.height,
        'aspect_ratio': e.aspectRatio,
        'allow_fullscreen': e.allowFullscreen,
      },
  ],
  'embed_height': null,
  if (lesson.video != null)
    'video': {
      'source': lesson.video!.source.name,
      'url': null,
      'expires_at': null,
      'embed_html': null,
      'duration_seconds': lesson.video!.durationSeconds,
      'poster_url': lesson.video!.posterUrl,
    },
  'attachments': [
    for (final a in lesson.attachments)
      {
        'name': a.name,
        'url': a.url,
        'size_bytes': a.sizeBytes,
        'mime_type': a.mimeType,
      },
  ],
  'completed': lesson.completed,
  'position_seconds': lesson.positionSeconds,
  'previous_id': lesson.previousId,
  'next_id': lesson.nextId,
};

/// The lesson with its saved files in place of the web's: the video plays
/// from [served] (the saved video's local address), images in the text come
/// from their saved copies, and attachments open the saved file.
Lesson localizeLesson(
  Lesson lesson,
  SavedLesson saved,
  Map<String, String> served,
) {
  final video = saved.video;
  final local = video == null ? null : served[video.name];
  var html = lesson.html;
  if (html != null) {
    for (final file in saved.files) {
      final source = file.sourceUrl;
      final address = served[file.name];
      if (file.kind != DownloadFileKind.image ||
          source == null ||
          address == null) {
        continue;
      }
      html = html!
          .replaceAll(source, address)
          .replaceAll(source.replaceAll('&', '&amp;'), address);
    }
  }
  final attachments = [
    for (final a in lesson.attachments)
      () {
        final file = saved.files
            .where(
              (f) =>
                  f.kind == DownloadFileKind.attachment && f.sourceUrl == a.url,
            )
            .firstOrNull;
        return file == null
            ? a
            : Attachment(
                name: a.name,
                url: '$savedFileScheme:${file.name}',
                sizeBytes: a.sizeBytes ?? file.bytes,
                mimeType: a.mimeType ?? file.mimeType,
              );
      }(),
  ];
  return Lesson(
    id: lesson.id,
    courseId: lesson.courseId,
    title: lesson.title,
    renderMode: lesson.renderMode,
    html: html,
    webviewUrl: lesson.webviewUrl,
    embeds: lesson.embeds,
    embedHeight: lesson.embedHeight,
    video: lesson.video == null
        ? null
        : local == null
        ? lesson.video
        : Video(
            source: VideoSource.upload,
            url: local,
            durationSeconds: lesson.video!.durationSeconds,
            posterUrl: lesson.video!.posterUrl,
          ),
    attachments: attachments,
    completed: lesson.completed,
    positionSeconds: lesson.positionSeconds,
    previousId: lesson.previousId,
    nextId: lesson.nextId,
    offline: lesson.offline,
  );
}
