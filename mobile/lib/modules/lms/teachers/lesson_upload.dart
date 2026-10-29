import 'package:file_picker/file_picker.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/providers.dart';
import '../../chat/data/chat_api.dart';
import '../../chat/data/chat_media.dart';

/// 105.3 What a teacher's lesson takes: videos (MP4, MOV, WebM) and PDFs,
/// as the academy's Media library does.
const lessonFileTypes = <String, String>{
  'mp4': 'video/mp4',
  'm4v': 'video/mp4',
  'mov': 'video/quicktime',
  'webm': 'video/webm',
  'pdf': 'application/pdf',
};

/// The largest lesson file: videos 5 GB, PDFs 200 MB.
int lessonMaxBytes(String type) =>
    type == 'application/pdf' ? 200 * 1024 * 1024 : 5 * 1024 * 1024 * 1024;

/// A video or a PDF from the phone for a lesson. Replaced in tests.
abstract class LessonFilePicker {
  /// Null when the person changed their mind.
  Future<ChatPick?> pick();
}

class DeviceLessonFilePicker implements LessonFilePicker {
  @override
  Future<ChatPick?> pick() async {
    final file = (await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: lessonFileTypes.keys.toList(),
    )).firstOrNull?.xFile;
    if (file == null) return null;
    final dot = file.name.lastIndexOf('.');
    final type = dot < 0
        ? null
        : lessonFileTypes[file.name.substring(dot + 1).toLowerCase()];
    if (type == null) return const ChatPickUnsupported();
    return ChatPicked(
      PickedChatFile(
        file,
        name: file.name,
        size: await file.length(),
        type: type,
      ),
    );
  }
}

final lessonFilePickerProvider = Provider<LessonFilePicker>(
  (ref) => DeviceLessonFilePicker(),
);

/// The teacher's uploads: started on the API (`/teacher/uploads`), sent
/// in chunks to the media gate, as chat files are.
class TeacherUploads implements ChunkedUploads {
  TeacherUploads(this._api, this._gate);

  final YallappApi _api;
  final MediaGate _gate;

  @override
  Future<ChatUpload> startUpload({
    required String name,
    required int size,
    required String type,
    int? durationSeconds,
  }) => _api.startTeacherUpload(name: name, size: size, type: type);

  @override
  Future<ChatUpload> resumeUpload(String uploadId) =>
      _api.resumeTeacherUpload(uploadId);

  @override
  Future<void> completeUpload(String uploadId) =>
      _api.completeTeacherUpload(uploadId);

  @override
  Future<int> uploadOffset(String uploadUrl) => _gate.uploadOffset(uploadUrl);

  @override
  Future<int> sendChunk(String uploadUrl, int offset, List<int> bytes) =>
      _gate.sendChunk(uploadUrl, offset, bytes);
}

final teacherUploadsProvider = Provider<ChunkedUploads>(
  (ref) =>
      TeacherUploads(ref.watch(yallappApiProvider), MediaGate.standalone()),
);
