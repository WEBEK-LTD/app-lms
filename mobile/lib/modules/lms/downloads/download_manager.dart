import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_exception.dart';
import '../../../core/api/models/models.dart';
import '../../../core/api/yallapp_api.dart';
import '../../../core/l10n/l10n.dart';
import '../../../core/providers.dart';
import 'download_backend.dart';
import 'download_keys.dart';
import 'download_models.dart';
import 'lesson_snapshot.dart';

final downloadKeysProvider = Provider<DownloadKeyStore>(
  (ref) => SecureDownloadKeyStore(),
);

final downloadBackendProvider = Provider<DownloadBackend>(
  (ref) => createDownloadBackend(ref.watch(downloadKeysProvider)),
);

/// The time, replaceable in tests.
final downloadClockProvider = Provider<DateTime Function()>(
  (ref) => DateTime.now,
);

final downloadManagerProvider =
    NotifierProvider<DownloadManager, DownloadsState>(DownloadManager.new);

/// 45 What's saved for offline viewing and what's being saved.
@immutable
class DownloadsState {
  const DownloadsState({
    required this.supported,
    this.loaded = false,
    this.index = const DownloadIndex(),
    this.notice,
  });

  /// False on the web (the app preview).
  final bool supported;
  final bool loaded;
  final DownloadIndex index;

  /// Something the student should know (lessons removed when access ended,
  /// lessons a course download skipped); shown once on the Downloads screen.
  final String? notice;

  SavedLesson? lesson(int lessonId) => index.lessons[lessonId];
  bool isSaved(int lessonId) => index.lessons[lessonId]?.done ?? false;

  /// The course's lessons on the phone: saved, all asked for, and whether
  /// some are still on their way.
  ({int saved, int total, bool active, int bytes}) course(int courseId) {
    final lessons = index.lessonsOf(courseId);
    return (
      saved: lessons.where((l) => l.done).length,
      total: lessons.length,
      active: lessons.any((l) => l.active || l.status == SavedStatus.paused),
      bytes: lessons.fold(0, (sum, l) => sum + l.bytes),
    );
  }

  DownloadsState copyWith({
    bool? loaded,
    DownloadIndex? index,
    String? notice,
    bool clearNotice = false,
  }) => DownloadsState(
    supported: supported,
    loaded: loaded ?? this.loaded,
    index: index ?? this.index,
    notice: clearNotice ? null : (notice ?? this.notice),
  );
}

/// Why a lesson can't be saved, in the student's words.
class DownloadRefused implements Exception {
  const DownloadRefused(this.message);
  final String message;

  @override
  String toString() => message;
}

/// The words for a lesson that can't be saved.
String offlineBlockerMessage(OfflineBlocker? reason) => switch (reason) {
  OfflineBlocker.videoSite => currentL10n.downloadNeedsInternetVideo,
  OfflineBlocker.webPage => currentL10n.downloadNeedsInternetPage,
  OfflineBlocker.disabled => currentL10n.downloadsOff,
  _ => currentL10n.downloadNotAvailable,
};

/// 45 Saves lessons and courses for offline viewing, one lesson at a time:
/// the lesson (`GET /lessons/{id}`, kept encrypted), then short-lived links
/// to its files (`POST /lessons/{id}/download`), each downloaded (in the
/// background where the phone allows, on Wi-Fi only when the student asks)
/// and sealed with the device's key. Checks at each start online whether the
/// student may keep them (`POST /me/downloads/check`) and deletes what they
/// can't, and everything after `keep_days` days without a check.
class DownloadManager extends Notifier<DownloadsState> {
  final _ready = Completer<void>();
  Future<void> _writing = Future.value();
  bool _running = false;

  /// The lesson being downloaded and its current transfer.
  int? _activeLesson;
  String? _activeTransfer;
  int _attempt = 0;

  /// Lessons asked for since the queue was last empty, and skipped ones.
  int _skipped = 0;

  DownloadBackend get _backend => ref.read(downloadBackendProvider);
  YallappApi get _api => ref.read(yallappApiProvider);
  DateTime _now() => ref.read(downloadClockProvider)();

  @override
  DownloadsState build() {
    final backend = ref.watch(downloadBackendProvider);
    if (backend.supported) {
      Future.microtask(_load);
    } else if (!_ready.isCompleted) {
      _ready.complete();
    }
    return DownloadsState(supported: backend.supported);
  }

  /// Done loading the index.
  Future<void> get ready => _ready.future;

  Future<void> _load() async {
    var index = const DownloadIndex();
    try {
      final raw = await _backend.readIndex();
      if (raw != null) {
        index = DownloadIndex.fromJson(
          Map<String, dynamic>.from(jsonDecode(raw) as Map),
        );
      }
      // Transfers of an earlier run start again with new links.
      await _backend.reset();
    } on Object {
      index = const DownloadIndex();
    }
    final restarted = {
      for (final e in index.lessons.entries)
        e.key: e.value.status == SavedStatus.downloading
            ? e.value.copyWith(status: SavedStatus.queued, progress: 0)
            : e.value,
    };
    if (!ref.mounted) return;
    state = state.copyWith(
      loaded: true,
      index: index.copyWith(lessons: restarted),
    );
    if (!_ready.isCompleted) _ready.complete();
  }

  void _set(DownloadIndex index, {String? notice}) {
    if (!ref.mounted) return;
    state = state.copyWith(index: index, notice: notice);
    final json = jsonEncode(index.toJson());
    _writing = _writing
        .then((_) => _backend.writeIndex(json))
        .catchError((_) {});
  }

  void _update(int lessonId, SavedLesson Function(SavedLesson) change) {
    final lesson = state.index.lessons[lessonId];
    if (lesson == null) return;
    _set(state.index.withLesson(change(lesson)));
  }

  /// Waits for the index to be written (tests, deleting everything).
  Future<void> flushWrites() => _writing;

  void clearNotice() {
    if (state.notice != null) state = state.copyWith(clearNotice: true);
  }

  // Asking

  /// Saves one lesson. Throws [DownloadRefused] when it can't be saved.
  Future<void> saveLesson(
    Lesson lesson, {
    required String courseTitle,
    String? courseImage,
  }) async {
    await ready;
    if (!state.supported) return;
    final offline = lesson.offline;
    if (offline == null || !offline.available) {
      throw DownloadRefused(offlineBlockerMessage(offline?.reason));
    }
    final known = state.index.lessons[lesson.id];
    if (known != null && known.status != SavedStatus.failed) return;
    _set(
      _withCourse(lesson.courseId, courseTitle, courseImage).withLesson(
        SavedLesson(
          lessonId: lesson.id,
          courseId: lesson.courseId,
          title: lesson.title,
          status: SavedStatus.queued,
        ),
      ),
    );
    unawaited(_pump());
  }

  /// Saves every lesson of a course the student can open. Returns how many
  /// were added; lessons that turn out to need the internet are skipped.
  Future<int> saveCourse(CourseDetail course, List<Topic> topics) async {
    await ready;
    if (!state.supported) return 0;
    var index = _withCourse(course.id, course.title, course.imageUrl);
    var added = 0;
    for (final topic in topics) {
      for (final item in topic.items) {
        if (item.type != CurriculumItemType.lesson || item.locked) continue;
        final known = index.lessons[item.id];
        if (known != null && known.status != SavedStatus.failed) continue;
        index = index.withLesson(
          SavedLesson(
            lessonId: item.id,
            courseId: course.id,
            title: item.title,
            status: SavedStatus.queued,
          ),
        );
        added++;
      }
    }
    _set(index);
    unawaited(_pump());
    return added;
  }

  DownloadIndex _withCourse(int courseId, String title, String? imageUrl) {
    final index = state.index;
    return index.copyWith(
      courses: {
        ...index.courses,
        courseId: SavedCourse(
          courseId: courseId,
          title: title,
          imageUrl: imageUrl,
        ),
      },
    );
  }

  // The queue

  SavedLesson? _next() {
    for (final id in state.index.order) {
      final lesson = state.index.lessons[id];
      if (lesson?.status == SavedStatus.queued) return lesson;
    }
    return null;
  }

  bool _isLastQueued(int lessonId) =>
      state.index.order
          .where((id) => state.index.lessons[id]?.status == SavedStatus.queued)
          .isEmpty &&
      _activeLesson == lessonId;

  Future<void> _pump() async {
    if (_running) return;
    _running = true;
    try {
      while (ref.mounted) {
        final next = _next();
        if (next == null) break;
        await _save(next);
      }
    } finally {
      _running = false;
      _activeLesson = null;
      _activeTransfer = null;
    }
    if (_skipped > 0 && ref.mounted) {
      final skipped = _skipped;
      _skipped = 0;
      state = state.copyWith(notice: currentL10n.downloadsSkipped(skipped));
    }
  }

  Future<void> _save(SavedLesson saved) async {
    final id = saved.lessonId;
    _activeLesson = id;
    _update(
      id,
      (l) => l.copyWith(
        status: SavedStatus.downloading,
        progress: 0,
        clearError: true,
      ),
    );
    try {
      final lesson = await _api.getLesson(id);
      if (lesson.offline?.available != true) {
        // A video site's lesson in a course download: it needs the internet.
        _skipped++;
        _set(state.index.without([id]));
        return;
      }
      var package = await _api.downloadLesson(id);
      final files = <SavedFile>[];
      for (var i = 0; i < package.files.length; i++) {
        if (!_stillWanted(id)) return;
        var file = package.files[i];
        SavedFile? sealed;
        for (var tries = 0; sealed == null; tries++) {
          final outcome = await _transfer(
            lesson,
            file,
            'l${id}_$i',
            fileIndex: i,
            fileCount: package.files.length,
            last: i == package.files.length - 1,
          );
          if (outcome == null) return; // Cancelled.
          if (outcome is SavedFile) {
            sealed = outcome;
          } else if (outcome == _Outcome.expired && tries == 0) {
            // The links last 15 minutes: ask for new ones once.
            package = await _api.downloadLesson(id);
            file = package.files[i];
          } else {
            throw DownloadRefused(currentL10n.downloadFailed);
          }
        }
        files.add(sealed);
      }
      if (!_stillWanted(id)) return;
      await _backend.sealBytes(
        _snapshotName(id),
        Uint8List.fromList(utf8.encode(jsonEncode(lessonToJson(lesson)))),
      );
      final now = _now();
      _set(
        state.index
            .withLesson(
              state.index.lessons[id]!.copyWith(
                status: SavedStatus.done,
                progress: 1,
                files: files,
                savedAt: now,
                title: lesson.title,
              ),
            )
            .copyWith(checkedAt: now, keepDays: package.keepDays),
      );
    } on ApiException catch (e) {
      _fail(
        id,
        e.isOffline ? currentL10n.downloadWaitsForConnection : e.message,
      );
    } on DownloadRefused catch (e) {
      _fail(id, e.message);
    } on Object {
      _fail(id, currentL10n.downloadFailed);
    }
  }

  bool _stillWanted(int lessonId) =>
      ref.mounted && state.index.lessons.containsKey(lessonId);

  void _fail(int lessonId, String message) {
    if (!_stillWanted(lessonId)) return;
    _update(
      lessonId,
      (l) =>
          l.copyWith(status: SavedStatus.failed, progress: 0, error: message),
    );
  }

  /// One file: a [SavedFile] when it's saved, [_Outcome.expired] when the
  /// link no longer works, [_Outcome.failed], or null when cancelled.
  Future<Object?> _transfer(
    Lesson lesson,
    DownloadFile file,
    String name, {
    required int fileIndex,
    required int fileCount,
    required bool last,
  }) async {
    final id = lesson.id;
    final transferId = 'yallapp-$id-$fileIndex-${_attempt++}';
    _activeTransfer = transferId;
    final request = TransferRequest(
      id: transferId,
      url: file.url,
      wifiOnly: state.index.wifiOnly,
      title: lesson.title,
      notifyWhenDone: last && _isLastQueued(id),
    );
    Object? outcome = _Outcome.failed;
    await for (final event in _backend.transfer(request)) {
      switch (event) {
        case TransferProgress(:final fraction):
          if (fraction != null && _stillWanted(id)) {
            _update(
              id,
              (l) => l.copyWith(
                status: l.status == SavedStatus.paused
                    ? SavedStatus.downloading
                    : l.status,
                progress: ((fileIndex + fraction) / fileCount).clamp(0, 1),
              ),
            );
          }
        case TransferPaused():
          if (_stillWanted(id)) {
            _update(id, (l) => l.copyWith(status: SavedStatus.paused));
          }
        case TransferDone(:final path):
          if (!_stillWanted(id)) {
            outcome = null;
            break;
          }
          final bytes = await _backend.sealFile(path, name);
          outcome = SavedFile(
            name: name,
            kind: file.kind,
            bytes: bytes,
            sourceUrl: file.sourceUrl,
            fileName: file.name,
            mimeType: file.mimeType,
          );
        case TransferFailed(:final expired):
          outcome = expired ? _Outcome.expired : _Outcome.failed;
        case TransferCanceled():
          outcome = null;
      }
    }
    _activeTransfer = null;
    if (!_stillWanted(id)) return null;
    return outcome;
  }

  static String _snapshotName(int lessonId) => 'l$lessonId.json';

  // The student's controls

  Future<void> pause(int lessonId) async {
    final lesson = state.index.lessons[lessonId];
    if (lesson == null || !lesson.active) return;
    if (_activeLesson == lessonId && _activeTransfer != null) {
      await _backend.pause(_activeTransfer!);
    }
    _update(lessonId, (l) => l.copyWith(status: SavedStatus.paused));
  }

  Future<void> resume(int lessonId) async {
    final lesson = state.index.lessons[lessonId];
    if (lesson == null) return;
    if (_activeLesson == lessonId && _activeTransfer != null) {
      if (await _backend.resume(_activeTransfer!)) {
        _update(lessonId, (l) => l.copyWith(status: SavedStatus.downloading));
        return;
      }
    }
    if (lesson.status == SavedStatus.paused ||
        lesson.status == SavedStatus.failed) {
      _update(
        lessonId,
        (l) => l.copyWith(status: SavedStatus.queued, clearError: true),
      );
      unawaited(_pump());
    }
  }

  /// Pauses or resumes every unfinished lesson of a course.
  Future<void> pauseCourse(int courseId) async {
    for (final l in state.index.lessonsOf(courseId)) {
      if (l.active) await pause(l.lessonId);
    }
  }

  Future<void> resumeCourse(int courseId) async {
    for (final l in state.index.lessonsOf(courseId)) {
      if (l.status == SavedStatus.paused || l.status == SavedStatus.failed) {
        await resume(l.lessonId);
      }
    }
  }

  /// Stops saving a lesson, or deletes it once saved.
  Future<void> delete(int lessonId) => _remove([lessonId]);

  Future<void> deleteCourse(int courseId) =>
      _remove([for (final l in state.index.lessonsOf(courseId)) l.lessonId]);

  Future<void> deleteAll({String? notice}) async {
    await ready;
    if (_activeTransfer != null) await _backend.cancel(_activeTransfer!);
    _set(
      const DownloadIndex().copyWith(wifiOnly: state.index.wifiOnly),
      notice: notice,
    );
    await _writing;
    await _backend.deleteAll();
    // The empty index again, after the folder went.
    _set(state.index);
    await _writing;
  }

  Future<void> _remove(List<int> lessonIds) async {
    await ready;
    if (lessonIds.isEmpty) return;
    final files = [
      for (final id in lessonIds) ...?state.index.lessons[id]?.files,
    ];
    if (lessonIds.contains(_activeLesson) && _activeTransfer != null) {
      await _backend.cancel(_activeTransfer!);
    }
    _set(state.index.without(lessonIds));
    for (final file in files) {
      await _backend.delete(file.name);
    }
    for (final id in lessonIds) {
      await _backend.delete(_snapshotName(id));
    }
  }

  void setWifiOnly(bool on) => _set(state.index.copyWith(wifiOnly: on));

  // Opening

  /// The lesson with its saved files in place, for a lesson opened online.
  Future<Lesson> localize(Lesson lesson) async {
    final saved = state.index.lessons[lesson.id];
    if (saved == null || !saved.done) return lesson;
    return localizeLesson(lesson, saved, await _served(saved));
  }

  /// The saved lesson, without a connection; null when it isn't saved, or
  /// when it went unchecked for too long (then everything saved is deleted).
  Future<Lesson?> offlineLesson(int lessonId) async {
    await ready;
    final saved = state.index.lessons[lessonId];
    if (saved == null || !saved.done) return null;
    if (state.index.expired(_now())) {
      await deleteAll(
        notice: currentL10n.downloadsExpired(state.index.keepDays),
      );
      return null;
    }
    final bytes = await _backend.openBytes(_snapshotName(lessonId));
    if (bytes == null) return null;
    final lesson = Lesson.fromJson(
      Map<String, dynamic>.from(jsonDecode(utf8.decode(bytes)) as Map),
    );
    return localizeLesson(lesson, saved, await _served(saved));
  }

  Future<Map<String, String>> _served(SavedLesson saved) async => {
    for (final file in saved.files)
      if (file.kind != DownloadFileKind.attachment)
        file.name: ?await _backend.serve(file.name, mimeType: file.mimeType),
  };

  /// 53 A saved attachment's content, decrypted in memory for the app's own
  /// viewer (`yallapp-saved:<name>`); null when it isn't saved.
  Future<Uint8List?> savedBytes(String url) async {
    final name = url.substring(savedFileScheme.length + 1);
    for (final lesson in state.index.lessons.values) {
      for (final file in lesson.files) {
        if (file.name == name) return _backend.openBytes(file.name);
      }
    }
    return null;
  }

  /// Opens a saved attachment (`yallapp-saved:<name>`).
  Future<bool> openSaved(String url) async {
    final name = url.substring(savedFileScheme.length + 1);
    for (final lesson in state.index.lessons.values) {
      for (final file in lesson.files) {
        if (file.name == name) {
          return _backend.openFile(
            file.name,
            file.fileName ?? file.name,
            file.mimeType,
          );
        }
      }
    }
    return false;
  }

  // Access

  /// At start: whether the student may keep what's saved. [downloadsOn] is
  /// `features.downloads` from `/config`. Without a connection, lessons stay
  /// until `keep_days` days have passed since the last check.
  Future<void> verify({required bool downloadsOn}) async {
    await ready;
    if (!state.supported || state.index.isEmpty) return;
    if (!downloadsOn) {
      await deleteAll(notice: currentL10n.downloadsTurnedOff);
      return;
    }
    final ids = state.index.lessons.keys.toList();
    final refused = <int>[];
    var keepDays = state.index.keepDays;
    try {
      for (var i = 0; i < ids.length; i += 500) {
        final batch = ids.sublist(
          i,
          i + 500 > ids.length ? ids.length : i + 500,
        );
        final check = await _api.checkDownloads(batch);
        if (!check.downloads) {
          await deleteAll(notice: currentL10n.downloadsTurnedOff);
          return;
        }
        refused.addAll(check.refused);
        keepDays = check.keepDays;
      }
    } on ApiException catch (e) {
      if (e.isOffline && state.index.expired(_now())) {
        await deleteAll(
          notice: currentL10n.downloadsExpired(state.index.keepDays),
        );
      }
      return;
    }
    if (refused.isNotEmpty) await _remove(refused);
    _set(
      state.index.copyWith(checkedAt: _now(), keepDays: keepDays),
      notice: refused.isEmpty
          ? null
          : currentL10n.downloadsAccessEnded(refused.length),
    );
    // Lessons that waited for a connection.
    if (state.index.lessons.values.any((l) => l.status == SavedStatus.queued)) {
      unawaited(_pump());
    }
  }
}

enum _Outcome { expired, failed }
