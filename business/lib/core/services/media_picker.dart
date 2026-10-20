import 'dart:io';

import 'package:image_picker/image_picker.dart';

/// 59 A file chosen for Media, read in chunks so a 5 GB video never sits in
/// memory.
abstract class PickedFile {
  String get path;
  String get name;
  int get size;
  String get type;
  Future<List<int>> read(int start, int end);
}

enum PickSource { cameraPhoto, cameraVideo, gallery }

abstract class MediaPicker {
  Future<PickedFile?> pick(PickSource source);

  /// The file of an upload that was left unfinished, if it's still there.
  Future<PickedFile?> reopen(String path, String name, int size, String type);
}

class DiskFile implements PickedFile {
  DiskFile(this.path, this.name, this.size, this.type);

  @override
  final String path;
  @override
  final String name;
  @override
  final int size;
  @override
  final String type;

  @override
  Future<List<int>> read(int start, int end) async {
    final file = await File(path).open();
    try {
      await file.setPosition(start);
      return await file.read(end - start);
    } finally {
      await file.close();
    }
  }
}

/// The content type the media gate takes, from the file's name.
String? mediaTypeOf(String name) {
  final ext = name.split('.').last.toLowerCase();
  return switch (ext) {
    'jpg' || 'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'webp' => 'image/webp',
    'gif' => 'image/gif',
    'mp4' || 'm4v' => 'video/mp4',
    'mov' => 'video/quicktime',
    'webm' => 'video/webm',
    'pdf' => 'application/pdf',
    _ => null,
  };
}

class ImagePickerMediaPicker implements MediaPicker {
  final _picker = ImagePicker();

  @override
  Future<PickedFile?> pick(PickSource source) async {
    final XFile? file = switch (source) {
      PickSource.cameraPhoto => await _picker.pickImage(
        source: ImageSource.camera,
        imageQuality: 90,
      ),
      PickSource.cameraVideo => await _picker.pickVideo(
        source: ImageSource.camera,
      ),
      PickSource.gallery => await _picker.pickMedia(),
    };
    if (file == null) return null;
    final type = file.mimeType ?? mediaTypeOf(file.name) ?? '';
    return DiskFile(file.path, file.name, await file.length(), type);
  }

  @override
  Future<PickedFile?> reopen(
    String path,
    String name,
    int size,
    String type,
  ) async {
    final file = File(path);
    if (!await file.exists() || await file.length() != size) return null;
    return DiskFile(path, name, size, type);
  }
}
