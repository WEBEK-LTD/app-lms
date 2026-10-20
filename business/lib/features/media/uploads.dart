import 'dart:async';
import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/api/models.dart';
import '../../core/providers.dart';
import '../../core/services/media_picker.dart';
import '../../core/services/settings.dart';

enum UploadStatus { uploading, paused, failed, done }

class UploadJob {
  const UploadJob({
    required this.id,
    required this.appId,
    required this.name,
    required this.size,
    required this.sent,
    required this.status,
    this.error,
  });

  final String id;
  final String appId;
  final String name;
  final int size;
  final int sent;
  final UploadStatus status;
  final Object? error;

  double get progress => size == 0 ? 0 : (sent / size).clamp(0, 1).toDouble();

  UploadJob copyWith({int? sent, UploadStatus? status, Object? error}) =>
      UploadJob(
        id: id,
        appId: appId,
        name: name,
        size: size,
        sent: sent ?? this.sent,
        status: status ?? this.status,
        error: error,
      );
}

/// 59 Uploads to Media from the phone: in chunks of `chunk_bytes` to the
/// media gate's signed link, with progress, pause and resume. An upload
/// left unfinished (app closed, connection lost) is remembered with its
/// file and carries on from the offset the gate has.
class UploadController extends Notifier<Map<String, UploadJob>> {
  final _files = <String, PickedFile>{};
  final _pause = <String>{};

  /// Waits before trying a chunk again after a dropped connection.
  static Duration retryDelay = const Duration(seconds: 2);

  /// 64b Fresh links in a row on 403/410 before the upload counts as refused.
  static const freshLinksInARow = 2;

  @override
  Map<String, UploadJob> build() => const {};

  LocalSettings get _settings => ref.read(settingsProvider);

  void _set(UploadJob job) => state = {...state, job.id: job};

  /// Whether this phone still has the file of an unfinished upload.
  bool canResume(String mediaId) =>
      _files.containsKey(mediaId) ||
      _settings.pendingUploads.any((p) => p.mediaId == mediaId);

  Future<MediaFile?> start(String appId, PickedFile file) async {
    final upload = await ref
        .read(apiProvider)
        .startUpload(appId, name: file.name, size: file.size, type: file.type);
    _files[upload.id] = file;
    await _remember(
      PendingUpload(
        appId: appId,
        mediaId: upload.id,
        path: file.path,
        name: file.name,
        size: file.size,
        type: file.type,
      ),
    );
    _set(
      UploadJob(
        id: upload.id,
        appId: appId,
        name: file.name,
        size: file.size,
        sent: 0,
        status: UploadStatus.uploading,
      ),
    );
    return _run(appId, upload, file);
  }

  Future<MediaFile?> resume(String appId, String mediaId) async {
    var file = _files[mediaId];
    if (file == null) {
      final pending = _settings.pendingUploads
          .where((p) => p.mediaId == mediaId)
          .firstOrNull;
      if (pending != null) {
        file = await ref
            .read(mediaPickerProvider)
            .reopen(pending.path, pending.name, pending.size, pending.type);
      }
    }
    if (file == null) {
      throw const ApiException(code: 'file_missing');
    }
    _files[mediaId] = file;
    final current = state[mediaId];
    _set(
      (current ??
              UploadJob(
                id: mediaId,
                appId: appId,
                name: file.name,
                size: file.size,
                sent: 0,
                status: UploadStatus.uploading,
              ))
          .copyWith(status: UploadStatus.uploading),
    );
    try {
      final upload = await ref.read(apiProvider).resumeUpload(appId, mediaId);
      return await _run(appId, upload, file);
    } on Object catch (e) {
      _set(state[mediaId]!.copyWith(status: UploadStatus.failed, error: e));
      return null;
    }
  }

  void pause(String mediaId) => _pause.add(mediaId);

  Future<void> cancel(String appId, String mediaId) async {
    _pause.add(mediaId);
    await ref.read(apiProvider).deleteMedia(appId, mediaId);
    await _forget(mediaId);
    state = {...state}..remove(mediaId);
  }

  Future<MediaFile?> _run(String appId, Upload upload, PickedFile file) async {
    final transport = ref.read(uploadTransportProvider);
    final id = upload.id;
    _pause.remove(id);
    var failures = 0;
    var fresh = 0;
    var link = upload;
    try {
      var offset = await transport.offset(link.uploadUrl);
      _set(state[id]!.copyWith(sent: offset, status: UploadStatus.uploading));
      while (offset < file.size) {
        if (_pause.remove(id)) {
          _set(state[id]!.copyWith(status: UploadStatus.paused));
          return null;
        }
        final end = min(offset + upload.chunkBytes, file.size);
        final bytes = await file.read(offset, end);
        try {
          offset = await transport.send(link.uploadUrl, offset, bytes);
          failures = 0;
          fresh = 0;
        } on ApiException catch (e) {
          // 64b The link expired (a long pause): a fresh one, at most twice
          // in a row; refused again means a firewall or another secret.
          if ((e.statusCode == 403 || e.statusCode == 410) &&
              fresh < freshLinksInARow) {
            fresh += 1;
            link = await ref.read(apiProvider).resumeUpload(appId, id);
            offset = await transport.offset(link.uploadUrl);
            continue;
          }
          if (!e.isOffline || failures >= 3) rethrow;
          failures += 1;
          await Future<void>.delayed(retryDelay * failures);
          offset = await transport.offset(link.uploadUrl);
        }
        _set(state[id]!.copyWith(sent: offset));
      }
      final media = await ref.read(apiProvider).completeUpload(appId, id);
      await _forget(id);
      _set(state[id]!.copyWith(sent: file.size, status: UploadStatus.done));
      return media;
    } on Object catch (e) {
      _set(state[id]!.copyWith(status: UploadStatus.failed, error: e));
      return null;
    }
  }

  Future<void> _remember(PendingUpload upload) => _settings.setPendingUploads([
    ..._settings.pendingUploads.where((p) => p.mediaId != upload.mediaId),
    upload,
  ]);

  Future<void> _forget(String mediaId) async {
    _files.remove(mediaId);
    await _settings.setPendingUploads([
      ..._settings.pendingUploads.where((p) => p.mediaId != mediaId),
    ]);
  }

  /// Clears finished uploads from the list.
  void clearDone() => state = {
    for (final e in state.entries)
      if (e.value.status != UploadStatus.done) e.key: e.value,
  };
}

final uploadsProvider =
    NotifierProvider<UploadController, Map<String, UploadJob>>(
      UploadController.new,
    );
