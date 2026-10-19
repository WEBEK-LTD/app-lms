import 'dart:typed_data';

import 'download_backend.dart';
import 'download_keys.dart';

DownloadBackend createBackend(DownloadKeyStore keys) =>
    const UnsupportedDownloadBackend();

/// 45 The web build (the app preview): lessons can't be saved, so the app
/// shows no download buttons.
class UnsupportedDownloadBackend implements DownloadBackend {
  const UnsupportedDownloadBackend();

  @override
  bool get supported => false;

  @override
  Stream<TransferEvent> transfer(TransferRequest request) =>
      Stream.value(const TransferFailed());

  @override
  Future<bool> pause(String id) async => false;

  @override
  Future<bool> resume(String id) async => false;

  @override
  Future<void> cancel(String id) async {}

  @override
  Future<void> reset() async {}

  @override
  Future<int> sealFile(String path, String name) =>
      throw UnsupportedError('Downloads work in the app on a phone.');

  @override
  Future<void> sealBytes(String name, Uint8List bytes) async {}

  @override
  Future<Uint8List?> openBytes(String name) async => null;

  @override
  Future<void> delete(String name) async {}

  @override
  Future<void> deleteAll() async {}

  @override
  Future<String?> readIndex() async => null;

  @override
  Future<void> writeIndex(String json) async {}

  @override
  Future<String?> serve(String name, {String? mimeType}) async => null;

  @override
  Future<bool> openFile(String name, String fileName, String? mimeType) async =>
      false;
}
