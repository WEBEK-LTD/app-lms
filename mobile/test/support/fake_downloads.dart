import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:yallapp/modules/lms/downloads/chunk_cipher.dart';
import 'package:yallapp/modules/lms/downloads/download_backend.dart';
import 'package:yallapp/modules/lms/downloads/download_keys.dart';

/// 45 A [DownloadBackend] in memory: transfers "download" [contents] (or a
/// few default bytes), files are sealed with the real [ChunkCipher] and a
/// [MemoryDownloadKeyStore], and served addresses are made up. With [hold],
/// transfers wait until [release]; [pause] and [resume] behave as on a phone.
class FakeDownloadBackend implements DownloadBackend {
  FakeDownloadBackend({this.supported = true, DownloadKeyStore? keys})
    : keys = keys ?? MemoryDownloadKeyStore();

  @override
  final bool supported;
  final DownloadKeyStore keys;
  final cipher = ChunkCipher(chunkSize: 64);

  /// What each address downloads.
  final contents = <String, List<int>>{};

  /// Addresses that fail: true when the link expired.
  final failing = <String, bool>{};

  /// Stored (sealed) files by name.
  final stored = <String, Uint8List>{};
  final _temp = <String, List<int>>{};
  final requests = <TransferRequest>[];
  final opened = <String>[];
  bool hold = false;
  int resets = 0;
  final _held = <String, Completer<void>>{};
  final _streams = <String, StreamController<TransferEvent>>{};

  /// Lets held transfers finish.
  void release() {
    hold = false;
    for (final c in _held.values) {
      if (!c.isCompleted) c.complete();
    }
  }

  @override
  Stream<TransferEvent> transfer(TransferRequest request) {
    requests.add(request);
    final controller = StreamController<TransferEvent>();
    _streams[request.id] = controller;
    unawaited(_run(request, controller));
    return controller.stream;
  }

  Future<void> _run(
    TransferRequest request,
    StreamController<TransferEvent> controller,
  ) async {
    await Future<void>.delayed(Duration.zero);
    controller.add(const TransferProgress(0.5));
    if (hold) {
      final gate = _held[request.id] = Completer<void>();
      await gate.future;
    }
    if (controller.isClosed) return;
    final failure = failing.remove(request.url);
    if (failure != null) {
      controller.add(TransferFailed(expired: failure));
    } else {
      final path = 'tmp/${request.id}';
      _temp[path] = contents[request.url] ?? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      controller.add(const TransferProgress(1));
      controller.add(TransferDone(path));
    }
    await controller.close();
  }

  @override
  Future<bool> pause(String id) async {
    _streams[id]?.add(const TransferPaused());
    return true;
  }

  @override
  Future<bool> resume(String id) async {
    _streams[id]?.add(const TransferProgress(0.6));
    return true;
  }

  @override
  Future<void> cancel(String id) async {
    final controller = _streams.remove(id);
    if (controller == null || controller.isClosed) return;
    controller.add(const TransferCanceled());
    await controller.close();
    final gate = _held.remove(id);
    if (gate != null && !gate.isCompleted) gate.complete();
  }

  @override
  Future<void> reset() async => resets++;

  @override
  Future<int> sealFile(String path, String name) async {
    final plain = _temp.remove(path)!;
    stored[name] = await cipher.seal(await keys.key(), plain);
    return plain.length;
  }

  @override
  Future<void> sealBytes(String name, Uint8List bytes) async {
    stored[name] = await cipher.seal(await keys.key(), bytes);
  }

  @override
  Future<Uint8List?> openBytes(String name) async {
    final sealed = stored[name];
    if (sealed == null) return null;
    return cipher.open(await keys.key(), sealed);
  }

  @override
  Future<void> delete(String name) async => stored.remove(name);

  @override
  Future<void> deleteAll() async => stored.clear();

  @override
  Future<String?> readIndex() async {
    final bytes = await openBytes('index.bin');
    return bytes == null ? null : utf8.decode(bytes);
  }

  @override
  Future<void> writeIndex(String json) =>
      sealBytes('index.bin', Uint8List.fromList(utf8.encode(json)));

  @override
  Future<String?> serve(String name, {String? mimeType}) async =>
      stored.containsKey(name) ? 'http://127.0.0.1:9/saved/$name' : null;

  @override
  Future<bool> openFile(String name, String fileName, String? mimeType) async {
    opened.add(fileName);
    return stored.containsKey(name);
  }
}
