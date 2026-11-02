import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/providers.dart';
import '../../chat/data/chat_api.dart';

/// 112.5 Assignments and live classes of courses managed in Yallapp: each
/// one, the student's live classes, and the files handed in.

final assignmentProvider = FutureProvider.autoDispose.family<Assignment, int>(
  (ref, id) => ref.watch(yallappApiProvider).getAssignment(id),
);

final liveSessionProvider = FutureProvider.autoDispose.family<LiveSession, int>(
  (ref, id) => ref.watch(yallappApiProvider).getLiveSession(id),
);

/// The first page of coming live classes, or past ones.
final myLiveSessionsProvider = FutureProvider.autoDispose
    .family<List<LiveSession>, bool>(
      (ref, past) async =>
          (await ref.watch(yallappApiProvider).listMyLiveSessions(past: past))
              .items,
    );

/// Files handed in for assignments: started on the API (`/course-uploads`),
/// sent in chunks to the media gate, as chat files are.
class CourseUploads implements ChunkedUploads {
  CourseUploads(this._api, this._gate);

  final YallappApi _api;
  final MediaGate _gate;

  @override
  Future<ChatUpload> startUpload({
    required String name,
    required int size,
    required String type,
    int? durationSeconds,
  }) => _api.startCourseUpload(name: name, size: size, type: type);

  @override
  Future<ChatUpload> resumeUpload(String uploadId) =>
      _api.resumeCourseUpload(uploadId);

  @override
  Future<void> completeUpload(String uploadId) =>
      _api.completeCourseUpload(uploadId);

  @override
  Future<int> uploadOffset(String uploadUrl) => _gate.uploadOffset(uploadUrl);

  @override
  Future<int> sendChunk(String uploadUrl, int offset, List<int> bytes) =>
      _gate.sendChunk(uploadUrl, offset, bytes);
}

final courseUploadsProvider = Provider<ChunkedUploads>(
  (ref) => CourseUploads(ref.watch(yallappApiProvider), MediaGate.standalone()),
);
