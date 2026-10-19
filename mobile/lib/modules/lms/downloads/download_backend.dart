import 'dart:typed_data';

import 'download_backend_stub.dart'
    if (dart.library.io) 'download_backend_io.dart'
    as platform;
import 'download_keys.dart';

/// 45 One file to download.
class TransferRequest {
  const TransferRequest({
    required this.id,
    required this.url,
    required this.wifiOnly,
    required this.title,
    this.notifyWhenDone = false,
  });

  /// Also the temporary file's name.
  final String id;
  final String url;
  final bool wifiOnly;

  /// Shown in the system's download notification.
  final String title;

  /// The last file of a batch: its notification says the lessons are saved.
  final bool notifyWhenDone;
}

sealed class TransferEvent {
  const TransferEvent();
}

/// Bytes arriving: [fraction] from 0 to 1, or null when the size is unknown.
class TransferProgress extends TransferEvent {
  const TransferProgress(this.fraction);
  final double? fraction;
}

class TransferPaused extends TransferEvent {
  const TransferPaused();
}

/// The file is downloaded, unencrypted, at [path] (the app's private cache).
class TransferDone extends TransferEvent {
  const TransferDone(this.path);
  final String path;
}

/// Failed. [expired]: the server refused the link (403 or 404), so a new
/// link may work; otherwise the connection or the server failed.
class TransferFailed extends TransferEvent {
  const TransferFailed({this.expired = false});
  final bool expired;
}

class TransferCanceled extends TransferEvent {
  const TransferCanceled();
}

/// 45 What the download manager needs from the phone: transfers that go on
/// in the background where the system allows (Android's WorkManager, iOS's
/// background sessions) with their notification, encrypted storage in the
/// app's private folder, and a way to play and open saved files. The web
/// build (the app preview) has none of it: [supported] is false.
abstract class DownloadBackend {
  bool get supported;

  /// Downloads a file to the app's private cache, with progress, pausing and
  /// resuming. The stream ends after [TransferDone], [TransferFailed] or
  /// [TransferCanceled].
  Stream<TransferEvent> transfer(TransferRequest request);
  Future<bool> pause(String id);
  Future<bool> resume(String id);
  Future<void> cancel(String id);

  /// Stops transfers left from an earlier run (the app saves again from the
  /// start of the file, with new links).
  Future<void> reset();

  /// Encrypts the downloaded file at [path] into storage as [name] and deletes
  /// the unencrypted copy. Returns the plain size in bytes.
  Future<int> sealFile(String path, String name);
  Future<void> sealBytes(String name, Uint8List bytes);
  Future<Uint8List?> openBytes(String name);
  Future<void> delete(String name);

  /// Deletes every saved file and the index.
  Future<void> deleteAll();
  Future<String?> readIndex();
  Future<void> writeIndex(String json);

  /// A local address that plays a saved file, decrypting as it is read (the
  /// video player and the lesson's images use it). Only this app can use it.
  Future<String?> serve(String name, {String? mimeType});

  /// Opens a saved attachment with the phone's viewer, from a temporary
  /// decrypted copy in the app's cache that's deleted the next time the app
  /// starts.
  Future<bool> openFile(String name, String fileName, String? mimeType);
}

/// The phone's backend, or the unsupported one on the web.
DownloadBackend createDownloadBackend(DownloadKeyStore keys) =>
    platform.createBackend(keys);
