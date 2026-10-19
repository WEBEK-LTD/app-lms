import 'dart:convert';

import 'package:cryptography/cryptography.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'chunk_cipher.dart';

/// 45 The key saved lessons are encrypted with. It stays in the platform's
/// key store (Android Keystore through encrypted storage, the iOS Keychain,
/// this device only), never next to the files, so a copy of the app's files
/// can't be read elsewhere.
abstract class DownloadKeyStore {
  /// The key, made the first time.
  Future<SecretKey> key();

  /// Forgets the key: every saved file becomes unreadable.
  Future<void> forget();
}

/// The key in flutter_secure_storage.
class SecureDownloadKeyStore implements DownloadKeyStore {
  SecureDownloadKeyStore([FlutterSecureStorage? storage])
    : _storage =
          storage ??
          const FlutterSecureStorage(
            iOptions: IOSOptions(
              accessibility: KeychainAccessibility.first_unlock_this_device,
            ),
          );

  static const _name = 'yallapp.downloads.key';
  final FlutterSecureStorage _storage;
  SecretKey? _key;

  @override
  Future<SecretKey> key() async {
    final known = _key;
    if (known != null) return known;
    final saved = await _storage.read(key: _name);
    List<int>? bytes;
    if (saved != null) {
      try {
        bytes = base64Decode(saved);
      } on FormatException {
        bytes = null;
      }
    }
    if (bytes == null || bytes.length != 32) {
      bytes = ChunkCipher.newKey();
      await _storage.write(key: _name, value: base64Encode(bytes));
    }
    return _key = SecretKey(bytes);
  }

  @override
  Future<void> forget() async {
    _key = null;
    await _storage.delete(key: _name);
  }
}

/// A key held in memory, for tests.
class MemoryDownloadKeyStore implements DownloadKeyStore {
  MemoryDownloadKeyStore([List<int>? bytes])
    : _bytes = bytes ?? ChunkCipher.newKey();

  List<int>? _bytes;
  int reads = 0;

  @override
  Future<SecretKey> key() async {
    reads++;
    return SecretKey(_bytes ??= ChunkCipher.newKey());
  }

  @override
  Future<void> forget() async => _bytes = null;
}
