import 'dart:typed_data';

import 'font_cache_stub.dart'
    if (dart.library.io) 'font_cache_io.dart'
    as platform;

/// 97.1 Where downloaded fonts are kept: the app's support folder on a phone,
/// nothing on the web (the app preview; the browser keeps the files).
abstract class FontCache {
  Future<Uint8List?> read(String key);
  Future<void> write(String key, Uint8List bytes);
}

FontCache createFontCache() => platform.createFontCache();
