import 'dart:math';
import 'dart:typed_data';

import 'package:cryptography/cryptography.dart';

/// 45 How saved lessons are kept on the phone: AES-256-GCM in chunks, so a
/// video plays from any second without decrypting the whole file.
///
/// A sealed file is a 16-byte header (`YAD1`, the chunk size, the plain
/// length) and then each chunk as its 12-byte nonce, the cipher text and the
/// 16-byte tag. Every chunk's associated data is the header and its index, so
/// chunks can't be swapped, dropped or moved to another file unnoticed. The
/// key lives in the platform's key store (`DownloadKeyStore`), never in the
/// files.
class ChunkCipher {
  ChunkCipher({this.chunkSize = defaultChunkSize});

  static const defaultChunkSize = 256 * 1024;
  static const headerLength = 16;
  static const nonceLength = 12;
  static const tagLength = 16;
  static const _magic = [0x59, 0x41, 0x44, 0x31]; // YAD1

  final int chunkSize;
  final _aes = AesGcm.with256bits();
  final _random = Random.secure();

  /// A new random 256-bit key.
  static List<int> newKey() {
    final random = Random.secure();
    return List<int>.generate(32, (_) => random.nextInt(256));
  }

  /// The header of a file of [plainLength] bytes.
  Uint8List header(int plainLength) {
    final data = ByteData(headerLength);
    for (var i = 0; i < 4; i++) {
      data.setUint8(i, _magic[i]);
    }
    data.setUint32(4, chunkSize);
    data.setUint64(8, plainLength);
    return data.buffer.asUint8List();
  }

  /// The chunk size and plain length a header says, or null when it isn't one.
  static ({int chunkSize, int plainLength})? readHeader(List<int> bytes) {
    if (bytes.length < headerLength) return null;
    for (var i = 0; i < 4; i++) {
      if (bytes[i] != _magic[i]) return null;
    }
    final data = ByteData.sublistView(Uint8List.fromList(bytes.sublist(0, 16)));
    final size = data.getUint32(4);
    if (size <= 0) return null;
    return (chunkSize: size, plainLength: data.getUint64(8));
  }

  /// Bytes of a sealed file of [plainLength] bytes.
  static int sealedLength(int plainLength, int chunkSize) {
    final chunks = (plainLength / chunkSize).ceil();
    return headerLength + plainLength + chunks * (nonceLength + tagLength);
  }

  /// Where chunk [index] starts in a sealed file.
  static int chunkOffset(int index, int chunkSize) =>
      headerLength + index * (chunkSize + nonceLength + tagLength);

  List<int> _aad(List<int> header, int index) {
    final position = ByteData(8)..setUint64(0, index);
    return [...header, ...position.buffer.asUint8List()];
  }

  /// One sealed chunk: nonce, cipher text, tag.
  Future<Uint8List> sealChunk(
    SecretKey key,
    List<int> header,
    int index,
    List<int> plain,
  ) async {
    final nonce = List<int>.generate(nonceLength, (_) => _random.nextInt(256));
    final box = await _aes.encrypt(
      plain,
      secretKey: key,
      nonce: nonce,
      aad: _aad(header, index),
    );
    return Uint8List.fromList([...nonce, ...box.cipherText, ...box.mac.bytes]);
  }

  /// The plain bytes of a sealed chunk. Throws [SecretBoxAuthenticationError]
  /// when it was changed, moved or sealed with another key.
  Future<Uint8List> openChunk(
    SecretKey key,
    List<int> header,
    int index,
    List<int> sealed,
  ) async {
    if (sealed.length < nonceLength + tagLength) {
      throw SecretBoxAuthenticationError();
    }
    final box = SecretBox(
      sealed.sublist(nonceLength, sealed.length - tagLength),
      nonce: sealed.sublist(0, nonceLength),
      mac: Mac(sealed.sublist(sealed.length - tagLength)),
    );
    final plain = await _aes.decrypt(
      box,
      secretKey: key,
      aad: _aad(header, index),
    );
    return Uint8List.fromList(plain);
  }

  /// Seals bytes held in memory (a lesson's text, a small file).
  Future<Uint8List> seal(SecretKey key, List<int> plain) async {
    final head = header(plain.length);
    final out = BytesBuilder(copy: false)..add(head);
    for (var i = 0, index = 0; i < plain.length; i += chunkSize, index++) {
      final end = min(i + chunkSize, plain.length);
      out.add(await sealChunk(key, head, index, plain.sublist(i, end)));
    }
    return out.takeBytes();
  }

  /// Opens bytes sealed by [seal] (or a sealed file read whole).
  Future<Uint8List> open(SecretKey key, List<int> sealed) async {
    final info = readHeader(sealed);
    if (info == null) throw SecretBoxAuthenticationError();
    final head = sealed.sublist(0, headerLength);
    final out = BytesBuilder(copy: false);
    var offset = headerLength;
    var left = info.plainLength;
    for (var index = 0; left > 0; index++) {
      final plain = min(info.chunkSize, left);
      final end = offset + nonceLength + plain + tagLength;
      if (end > sealed.length) throw SecretBoxAuthenticationError();
      out.add(await openChunk(key, head, index, sealed.sublist(offset, end)));
      offset = end;
      left -= plain;
    }
    if (offset != sealed.length) throw SecretBoxAuthenticationError();
    return out.takeBytes();
  }
}
