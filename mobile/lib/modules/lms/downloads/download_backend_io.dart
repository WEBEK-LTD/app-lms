import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:isolate';
import 'dart:math';
import 'dart:typed_data';

import 'package:background_downloader/background_downloader.dart';
import 'package:cryptography/cryptography.dart';
import 'package:path_provider/path_provider.dart';

import '../../../core/l10n/l10n.dart';
import 'chunk_cipher.dart';
import 'download_backend.dart';
import 'download_keys.dart';

DownloadBackend createBackend(DownloadKeyStore keys) => IoDownloadBackend(keys);

/// 45 Saved lessons on a phone: transfers through background_downloader
/// (WorkManager on Android, a background URLSession on iOS: they go on when
/// the app is in the background, wait for Wi-Fi when asked, pause and resume),
/// files sealed with [ChunkCipher] in the app's support folder (private to
/// the app, never in the gallery or the Files app), and a loopback server
/// that decrypts as the video player reads.
class IoDownloadBackend implements DownloadBackend {
  IoDownloadBackend(
    this._keys, {
    Directory? root,
    Directory? cache,
    ChunkCipher? cipher,
  }) : _rootOverride = root,
       _cacheOverride = cache,
       _cipher = cipher ?? ChunkCipher();

  static const _folder = 'yallapp_downloads';
  static const _group = 'yallapp-downloads';
  static const _indexName = 'index.bin';

  final DownloadKeyStore _keys;
  final Directory? _rootOverride;
  final Directory? _cacheOverride;
  final ChunkCipher _cipher;
  Directory? _root;
  Directory? _cache;
  bool _cleaned = false;
  bool _asked = false;
  HttpServer? _server;
  final _served = <String, ({String name, String? mimeType})>{};
  final _token = List.generate(
    16,
    (_) => Random.secure().nextInt(256).toRadixString(16).padLeft(2, '0'),
  ).join();

  @override
  bool get supported => true;

  Future<Directory> _rootDir() async {
    final known = _root;
    if (known != null) return known;
    final base = _rootOverride ?? await getApplicationSupportDirectory();
    final dir = _rootOverride ?? Directory('${base.path}/$_folder');
    await dir.create(recursive: true);
    // iOS: not in iCloud or iTunes backups (the key isn't either).
    return _root = dir;
  }

  /// Unencrypted files waiting to be sealed, and attachments being opened.
  Future<Directory> _cacheDir() async {
    final known = _cache;
    if (known != null) return known;
    final base = _cacheOverride ?? await getTemporaryDirectory();
    final dir = _cacheOverride ?? Directory('${base.path}/$_folder');
    await dir.create(recursive: true);
    if (!_cleaned) {
      _cleaned = true;
      // Opened attachments from an earlier run.
      final opened = Directory('${dir.path}/open');
      if (await opened.exists()) await opened.delete(recursive: true);
    }
    return _cache = dir;
  }

  File _file(Directory root, String name) =>
      File('${root.path}/${_safeName(name)}');

  static String _safeName(String name) =>
      name.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');

  // Transfers

  Future<void> _askOnce() async {
    if (_asked) return;
    _asked = true;
    try {
      await FileDownloader().permissions.request(PermissionType.notifications);
    } on Object {
      // Without permission the downloads still run, without notifications.
    }
  }

  @override
  Stream<TransferEvent> transfer(TransferRequest request) {
    final controller = StreamController<TransferEvent>();
    unawaited(_run(request, controller));
    return controller.stream;
  }

  Future<void> _run(
    TransferRequest request,
    StreamController<TransferEvent> controller,
  ) async {
    try {
      await _askOnce();
      await _cacheDir();
      final task = DownloadTask(
        taskId: request.id,
        url: request.url,
        filename: _safeName(request.id),
        baseDirectory: BaseDirectory.temporary,
        directory: _folder,
        group: _group,
        updates: Updates.statusAndProgress,
        requiresWiFi: request.wifiOnly,
        retries: 3,
        allowPause: true,
        displayName: request.title,
      );
      final l10n = currentL10n;
      FileDownloader().configureNotificationForTask(
        task,
        running: TaskNotification(
          l10n.downloadsNotificationRunning,
          '{displayName}',
        ),
        paused: TaskNotification(
          l10n.downloadsNotificationPaused,
          '{displayName}',
        ),
        complete: request.notifyWhenDone
            ? TaskNotification(
                l10n.downloadsNotificationDone,
                l10n.downloadsNotificationDoneBody,
              )
            : null,
        error: TaskNotification(
          l10n.downloadsNotificationFailed,
          '{displayName}',
        ),
        progressBar: true,
      );
      final result = await FileDownloader().download(
        task,
        onProgress: (p) {
          if (p >= 0 && p <= 1) controller.add(TransferProgress(p));
        },
        onStatus: (status) {
          if (status == TaskStatus.paused) {
            controller.add(const TransferPaused());
          }
        },
      );
      switch (result.status) {
        case TaskStatus.complete:
          controller.add(TransferDone(await task.filePath()));
        case TaskStatus.canceled:
          controller.add(const TransferCanceled());
        case TaskStatus.notFound:
          controller.add(const TransferFailed(expired: true));
        default:
          final code = result.responseStatusCode;
          controller.add(
            TransferFailed(expired: code == 403 || code == 404 || code == 410),
          );
      }
    } on Object {
      controller.add(const TransferFailed());
    } finally {
      await controller.close();
    }
  }

  @override
  Future<bool> pause(String id) async {
    final task = await FileDownloader().taskForId(id);
    return task is DownloadTask && await FileDownloader().pause(task);
  }

  @override
  Future<bool> resume(String id) async {
    final task = await FileDownloader().taskForId(id);
    return task is DownloadTask && await FileDownloader().resume(task);
  }

  @override
  Future<void> cancel(String id) async {
    await FileDownloader().cancelTaskWithId(id);
  }

  @override
  Future<void> reset() async {
    try {
      await FileDownloader().reset(group: _group);
    } on Object {
      // Nothing was running.
    }
    final cache = await _cacheDir();
    await for (final entry in cache.list()) {
      if (entry is File) await entry.delete();
    }
  }

  // Storage

  @override
  Future<int> sealFile(String path, String name) async {
    final target = _file(await _rootDir(), name);
    final key = await (await _keys.key()).extractBytes();
    final chunkSize = _cipher.chunkSize;
    final size = await Isolate.run(
      () => sealFileSync(path, target.path, key, chunkSize),
    );
    return size;
  }

  @override
  Future<void> sealBytes(String name, Uint8List bytes) async {
    final file = _file(await _rootDir(), name);
    final sealed = await _cipher.seal(await _keys.key(), bytes);
    final part = File('${file.path}.part');
    await part.writeAsBytes(sealed, flush: true);
    await part.rename(file.path);
  }

  @override
  Future<Uint8List?> openBytes(String name) async {
    final file = _file(await _rootDir(), name);
    if (!await file.exists()) return null;
    try {
      return await _cipher.open(await _keys.key(), await file.readAsBytes());
    } on SecretBoxAuthenticationError {
      return null;
    }
  }

  @override
  Future<void> delete(String name) async {
    final file = _file(await _rootDir(), name);
    if (await file.exists()) await file.delete();
    _served.removeWhere((_, v) => v.name == name);
  }

  @override
  Future<void> deleteAll() async {
    _served.clear();
    final root = await _rootDir();
    if (await root.exists()) await root.delete(recursive: true);
    _root = null;
    final cache = await _cacheDir();
    if (await cache.exists()) await cache.delete(recursive: true);
    _cache = null;
  }

  @override
  Future<String?> readIndex() async {
    final bytes = await openBytes(_indexName);
    if (bytes == null) return null;
    try {
      return utf8.decode(bytes);
    } on FormatException {
      return null;
    }
  }

  @override
  Future<void> writeIndex(String json) =>
      sealBytes(_indexName, Uint8List.fromList(utf8.encode(json)));

  // Playing and opening

  @override
  Future<String?> serve(String name, {String? mimeType}) async {
    final file = _file(await _rootDir(), name);
    if (!await file.exists()) return null;
    final server = _server ??= await _startServer();
    final id = _safeName(name);
    _served[id] = (name: name, mimeType: mimeType);
    return 'http://${server.address.address}:${server.port}/$_token/$id';
  }

  Future<HttpServer> _startServer() async {
    final server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    server.listen((request) => unawaited(_answer(request)));
    return server;
  }

  Future<void> _answer(HttpRequest request) async {
    final response = request.response;
    try {
      final parts = request.uri.pathSegments;
      final entry = parts.length == 2 && parts[0] == _token
          ? _served[parts[1]]
          : null;
      if (entry == null ||
          request.method != 'GET' && request.method != 'HEAD') {
        response.statusCode = HttpStatus.notFound;
        return;
      }
      final file = _file(await _rootDir(), entry.name);
      final handle = await file.open();
      try {
        await _send(handle, request, entry.mimeType);
      } finally {
        await handle.close();
      }
    } on Object {
      if (response.connectionInfo != null) {
        try {
          response.statusCode = HttpStatus.internalServerError;
        } on StateError {
          // Headers already sent: the player sees a short read.
        }
      }
    } finally {
      try {
        await response.close();
      } on Object {
        // The player went away.
      }
    }
  }

  Future<void> _send(
    RandomAccessFile handle,
    HttpRequest request,
    String? mimeType,
  ) async {
    final response = request.response;
    final head = await handle.read(ChunkCipher.headerLength);
    final info = ChunkCipher.readHeader(head);
    if (info == null) {
      response.statusCode = HttpStatus.notFound;
      return;
    }
    final total = info.plainLength;
    var start = 0;
    var end = total - 1;
    final range = RegExp(r'^bytes=(\d*)-(\d*)$')
        .firstMatch(request.headers.value(HttpHeaders.rangeHeader) ?? '');
    if (range != null) {
      final from = range.group(1)!;
      final to = range.group(2)!;
      if (from.isEmpty && to.isNotEmpty) {
        start = max(0, total - int.parse(to));
      } else if (from.isNotEmpty) {
        start = int.parse(from);
        if (to.isNotEmpty) end = min(int.parse(to), total - 1);
      }
      if (start > end || start >= total) {
        response.statusCode = HttpStatus.requestedRangeNotSatisfiable;
        response.headers.set(HttpHeaders.contentRangeHeader, 'bytes */$total');
        return;
      }
      response.statusCode = HttpStatus.partialContent;
      response.headers.set(
        HttpHeaders.contentRangeHeader,
        'bytes $start-$end/$total',
      );
    }
    response.headers
      ..set(HttpHeaders.acceptRangesHeader, 'bytes')
      ..set(HttpHeaders.cacheControlHeader, 'no-store')
      ..contentLength = total == 0 ? 0 : end - start + 1;
    if (mimeType != null) {
      response.headers.set(HttpHeaders.contentTypeHeader, mimeType);
    }
    if (request.method == 'HEAD' || total == 0) return;
    final key = await _keys.key();
    final size = info.chunkSize;
    for (var index = start ~/ size; index <= end ~/ size; index++) {
      final plainLength = min(size, total - index * size);
      await handle.setPosition(ChunkCipher.chunkOffset(index, size));
      final sealed = await handle.read(
        ChunkCipher.nonceLength + plainLength + ChunkCipher.tagLength,
      );
      final plain = await _cipher.openChunk(key, head, index, sealed);
      final from = index == start ~/ size ? start - index * size : 0;
      final to = index == end ~/ size ? end - index * size + 1 : plainLength;
      response.add(plain.sublist(from, to));
      await response.flush();
    }
  }

  @override
  Future<bool> openFile(String name, String fileName, String? mimeType) async {
    final file = _file(await _rootDir(), name);
    if (!await file.exists()) return false;
    final plain = await _cipher.open(
      await _keys.key(),
      await file.readAsBytes(),
    );
    final folder = Directory('${(await _cacheDir()).path}/open');
    await folder.create(recursive: true);
    final copy = File('${folder.path}/${_safeName(fileName)}');
    await copy.writeAsBytes(plain, flush: true);
    return FileDownloader().openFile(filePath: copy.path, mimeType: mimeType);
  }
}

/// Seals a file in chunks, in a background isolate: [ChunkCipher]'s format,
/// written beside the target and renamed when complete. Deletes [source].
/// Returns the plain size.
Future<int> sealFileSync(
  String source,
  String target,
  List<int> keyBytes,
  int chunkSize,
) async {
  final cipher = ChunkCipher(chunkSize: chunkSize);
  final key = SecretKey(keyBytes);
  final input = File(source);
  final length = await input.length();
  final head = cipher.header(length);
  final part = File('$target.part');
  final reader = await input.open();
  final writer = await part.open(mode: FileMode.write);
  try {
    await writer.writeFrom(head);
    for (var index = 0; index * chunkSize < length; index++) {
      final chunk = await reader.read(chunkSize);
      await writer.writeFrom(await cipher.sealChunk(key, head, index, chunk));
    }
    await writer.flush();
  } finally {
    await reader.close();
    await writer.close();
  }
  await part.rename(target);
  await input.delete();
  return length;
}
