import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:material_symbols_icons/symbols.dart';

import '../l10n/l10n.dart';

/// 124.14 What a page's file field asks for: the types it takes (`accept`,
/// as MIME types or extensions), one file or several, and whether it asks
/// for the camera straight away (`capture`).
typedef WebFileAsk = ({List<String> accept, bool multiple, bool capture});

/// 124.14 Answers a page's file field: the files' addresses on the phone,
/// or none when the person changed their mind.
typedef WebFileHandler = Future<List<String>> Function(WebFileAsk ask);

/// Where a file for a page comes from.
enum WebFileSource { camera, video, gallery, file }

bool _takes(List<String> accept, String kind) {
  final types = accept
      .map((t) => t.trim().toLowerCase())
      .where((t) => t.isNotEmpty);
  if (types.isEmpty) return true;
  return types.any(
    (t) =>
        t == '*/*' ||
        t.startsWith('$kind/') ||
        (kind == 'image' &&
            const ['.jpg', '.jpeg', '.png', '.heic', '.webp'].contains(t)) ||
        (kind == 'video' && const ['.mp4', '.mov', '.webm'].contains(t)),
  );
}

/// 124.14 The ways the person may answer [ask]: the camera first when the
/// field asks for it, else the camera, the photos and the files for a field
/// that takes pictures, and the files for any other.
List<WebFileSource> webFileSources(WebFileAsk ask) {
  final images = _takes(ask.accept, 'image');
  final videos = _takes(ask.accept, 'video');
  if (ask.capture) {
    if (images) return const [WebFileSource.camera];
    if (videos) return const [WebFileSource.video];
  }
  return [
    if (images) WebFileSource.camera,
    if (images || videos) WebFileSource.gallery,
    WebFileSource.file,
  ];
}

/// The phone's camera, photos and files. Replaced in tests.
abstract interface class WebFilePicker {
  /// Paths of the files chosen; empty when the person changed their mind.
  Future<List<String>> pick(WebFileSource source, {required bool multiple});
}

class DeviceWebFilePicker implements WebFilePicker {
  final _images = ImagePicker();

  @override
  Future<List<String>> pick(
    WebFileSource source, {
    required bool multiple,
  }) async {
    switch (source) {
      case WebFileSource.camera:
        final photo = await _images.pickImage(
          source: ImageSource.camera,
          imageQuality: 85,
        );
        return [?photo?.path];
      case WebFileSource.video:
        final video = await _images.pickVideo(source: ImageSource.camera);
        return [?video?.path];
      case WebFileSource.gallery:
        if (multiple) {
          return [
            for (final f in await _images.pickMultipleMedia(imageQuality: 85))
              f.path,
          ];
        }
        final media = await _images.pickMedia(imageQuality: 85);
        return [?media?.path];
      case WebFileSource.file:
        final files = [for (final f in await FilePicker.pickFiles()) ?f.path];
        return multiple ? files : files.take(1).toList();
    }
  }
}

final webFilePickerProvider = Provider<WebFilePicker>(
  (ref) => DeviceWebFilePicker(),
);

/// 124.14 How a page of the app answers its file fields (an identity check's
/// "Upload a document" or "Take a photo"): the camera, the photos or the
/// files, chosen in a sheet when there is more than one way.
WebFileHandler pageFileChooser(BuildContext context, WidgetRef ref) =>
    (ask) async {
      final sources = webFileSources(ask);
      WebFileSource? source = sources.length == 1 ? sources.single : null;
      if (source == null) {
        if (!context.mounted) return const [];
        final l10n = context.l10n;
        source = await showModalBottomSheet<WebFileSource>(
          context: context,
          useRootNavigator: true,
          builder: (sheet) => SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final s in sources)
                  ListTile(
                    key: ValueKey('web-file-${s.name}'),
                    leading: Icon(switch (s) {
                      WebFileSource.camera => Symbols.photo_camera_rounded,
                      WebFileSource.video => Symbols.videocam_rounded,
                      WebFileSource.gallery => Symbols.photo_library_rounded,
                      WebFileSource.file => Symbols.description_rounded,
                    }),
                    title: Text(switch (s) {
                      WebFileSource.camera => l10n.chatTakePhoto,
                      WebFileSource.video => l10n.chatRecordVideo,
                      WebFileSource.gallery => l10n.chatGallery,
                      WebFileSource.file => l10n.chatChooseFile,
                    }),
                    onTap: () => Navigator.of(sheet).pop(s),
                  ),
              ],
            ),
          ),
        );
      }
      if (source == null) return const [];
      try {
        final paths = await ref
            .read(webFilePickerProvider)
            .pick(source, multiple: ask.multiple);
        return [for (final p in paths) Uri.file(p).toString()];
      } catch (_) {
        return const [];
      }
    };
