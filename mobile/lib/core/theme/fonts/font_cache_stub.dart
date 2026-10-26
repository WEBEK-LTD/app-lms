import 'dart:typed_data';

import 'font_cache.dart';

FontCache createFontCache() => const NoFontCache();

/// The web build keeps nothing itself.
class NoFontCache implements FontCache {
  const NoFontCache();

  @override
  Future<Uint8List?> read(String key) async => null;

  @override
  Future<void> write(String key, Uint8List bytes) async {}
}
