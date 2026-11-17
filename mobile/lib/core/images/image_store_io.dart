import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart' show NetworkImageLoadException;
import 'package:path_provider/path_provider.dart';

import 'image_store.dart';

ImageStore createImageStore() => FileImageStore();

/// Pictures kept in the app's cache folder (the phone may empty it when it
/// runs out of room), each in a file named after its address.
///
/// A kept picture shows at once, with no network: one older than
/// [freshFor] is downloaded again in the background for the next time, and
/// still shows meanwhile (and offline). Without a folder (tests), each
/// picture is downloaded, as Flutter's NetworkImage does.
class FileImageStore implements ImageStore {
  FileImageStore({
    Future<Directory?>? folder,
    HttpClient Function()? client,
    DateTime Function()? now,
    this.maxBytes = 200 * 1024 * 1024,
  }) : _givenFolder = folder,
       _newClient = client,
       _now = now ?? DateTime.now;

  /// When the folder holds more than this, the pictures used least lately
  /// go, down to three quarters of it.
  final int maxBytes;

  final Future<Directory?>? _givenFolder;
  late final Future<Directory?> _folder = _givenFolder ?? _cacheFolder();
  final HttpClient Function()? _newClient;
  final DateTime Function() _now;

  late final HttpClient _http =
      _newClient?.call() ?? (HttpClient()..autoUncompress = false);

  /// One download per picture at a time, however many boxes show it.
  final _loading = <String, Future<Uint8List>>{};
  final _refreshing = <String>{};
  var _written = 0;
  var _trimmed = false;
  var _parts = 0;

  /// Yallapp's own picture addresses never change what they show (a new
  /// picture gets a new address); others are checked again after a day.
  static final _ours = RegExp(
    r'/(?:api/v1/assets|m|v/[0-9a-f-]{36})/[0-9a-f]{8}-[0-9a-f]{4}-',
  );

  static Duration freshFor(String url) =>
      _ours.hasMatch(url) ? const Duration(days: 30) : const Duration(days: 1);

  @override
  Future<Uint8List> load(String url, String key, {ImageProgress? onProgress}) =>
      // (A block: returning the removed future would wait on itself.)
      _loading[key] ??= _load(url, key, onProgress).whenComplete(() {
        _loading.remove(key);
      });

  Future<Uint8List> _load(
    String url,
    String key,
    ImageProgress? onProgress,
  ) async {
    final file = await _file(key);
    if (file != null) {
      final kept = await _read(file);
      if (kept != null) {
        if (_now().difference(kept.modified) > freshFor(url)) {
          unawaited(_refresh(url, key, file));
        }
        return kept.bytes;
      }
    }
    final bytes = await _download(url, onProgress);
    if (file != null) unawaited(_keep(file, bytes));
    return bytes;
  }

  @override
  Future<void> forget(String key) async {
    try {
      await (await _file(key))?.delete();
    } on Object {
      // Already gone.
    }
  }

  Future<Directory?> _directory() => _folder;

  static Future<Directory?> _cacheFolder() async {
    try {
      final base = await getApplicationCacheDirectory();
      final folder = Directory('${base.path}/yallapp_images');
      await folder.create(recursive: true);
      return folder;
    } on Object {
      return null;
    }
  }

  Future<File?> _file(String key) async {
    final folder = await _directory();
    return folder == null ? null : File('${folder.path}/${fileNameFor(key)}');
  }

  /// The file a picture is kept in: two 32-bit FNV-1a hashes of its key.
  @visibleForTesting
  static String fileNameFor(String key) {
    final bytes = utf8.encode(key);
    int fnv(int seed) {
      var hash = seed;
      for (final b in bytes) {
        hash = ((hash ^ b) * 0x01000193) & 0xFFFFFFFF;
      }
      return hash;
    }

    final first = fnv(0x811C9DC5);
    final second = fnv(first ^ 0x5BD1E995 ^ bytes.length);
    String hex(int v) => v.toRadixString(16).padLeft(8, '0');
    return '${hex(first)}${hex(second)}';
  }

  Future<({Uint8List bytes, DateTime modified})?> _read(File file) async {
    try {
      final stat = await file.stat();
      if (stat.type != FileSystemEntityType.file || stat.size == 0) {
        return null;
      }
      final bytes = await file.readAsBytes();
      // Used now: kept longer when the folder is trimmed.
      final now = _now();
      if (now.difference(stat.accessed) > const Duration(hours: 1)) {
        unawaited(file.setLastAccessed(now).catchError((Object _) {}));
      }
      return (bytes: bytes, modified: stat.modified);
    } on Object {
      return null;
    }
  }

  Future<Uint8List> _download(String url, ImageProgress? onProgress) async {
    final uri = Uri.base.resolve(url);
    final request = await _http.getUrl(uri);
    final response = await request.close();
    if (response.statusCode != HttpStatus.ok) {
      await response.drain<List<int>>(<int>[]);
      throw NetworkImageLoadException(
        statusCode: response.statusCode,
        uri: uri,
      );
    }
    final bytes = await consolidateHttpClientResponseBytes(
      response,
      onBytesReceived: onProgress,
    );
    if (bytes.lengthInBytes == 0) {
      throw NetworkImageLoadException(
        statusCode: response.statusCode,
        uri: uri,
      );
    }
    return bytes;
  }

  Future<void> _refresh(String url, String key, File file) async {
    if (!_refreshing.add(key)) return;
    try {
      await _keep(file, await _download(url, null));
    } on Object {
      // Offline, or the address answers no more: the kept copy stays.
    } finally {
      _refreshing.remove(key);
    }
  }

  Future<void> _keep(File file, Uint8List bytes) async {
    try {
      // Written whole, then renamed: a picture is never read half written.
      final part = File('${file.path}.${_parts++}.part');
      await part.writeAsBytes(bytes);
      await part.rename(file.path);
      _written += bytes.length;
      if (!_trimmed || _written > maxBytes ~/ 8) {
        _trimmed = true;
        _written = 0;
        await trim();
      }
    } on Object {
      // Not kept: downloaded again next time.
    }
  }

  /// Removes the pictures used least lately while the folder holds more
  /// than [maxBytes], and files left half written.
  @visibleForTesting
  Future<void> trim() async {
    final folder = await _directory();
    if (folder == null) return;
    final now = _now();
    final kept = <({File file, FileStat stat})>[];
    var total = 0;
    try {
      await for (final entry in folder.list()) {
        if (entry is! File) continue;
        final stat = await entry.stat();
        if (entry.path.endsWith('.part')) {
          if (now.difference(stat.modified) > const Duration(hours: 1)) {
            await entry.delete();
          }
          continue;
        }
        kept.add((file: entry, stat: stat));
        total += stat.size;
      }
      if (total <= maxBytes) return;
      DateTime used(FileStat s) =>
          s.accessed.isAfter(s.modified) ? s.accessed : s.modified;
      kept.sort((a, b) => used(a.stat).compareTo(used(b.stat)));
      for (final k in kept) {
        if (total <= maxBytes * 3 ~/ 4) break;
        await k.file.delete();
        total -= k.stat.size;
      }
    } on Object {
      // Tried again after the next pictures are kept.
    }
  }
}
