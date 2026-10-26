import 'dart:io';
import 'dart:typed_data';

import 'package:path_provider/path_provider.dart';

import 'font_cache.dart';

FontCache createFontCache() => FileFontCache();

/// Font files in the app's support folder, private to the app.
class FileFontCache implements FontCache {
  FileFontCache({Directory? root}) : _rootOverride = root;

  final Directory? _rootOverride;

  Future<File> _file(String key) async {
    final base = _rootOverride ?? await getApplicationSupportDirectory();
    return File('${base.path}/yallapp_fonts/$key');
  }

  @override
  Future<Uint8List?> read(String key) async {
    try {
      final file = await _file(key);
      return await file.exists() ? await file.readAsBytes() : null;
    } on Object {
      return null;
    }
  }

  @override
  Future<void> write(String key, Uint8List bytes) async {
    try {
      final file = await _file(key);
      await file.parent.create(recursive: true);
      // Written whole, then renamed: a font is never read half written.
      final part = File('${file.path}.part');
      await part.writeAsBytes(bytes, flush: true);
      await part.rename(file.path);
    } on Object {
      // Not kept: downloaded again next time.
    }
  }
}
