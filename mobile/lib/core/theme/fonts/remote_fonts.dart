import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../api/models/config_models.dart' show FontFileRef;
import 'font_cache.dart';

/// 97.1 Free fonts chosen in the dashboard that the app doesn't bundle:
/// downloaded once from Yallapp, kept on the phone, and registered with
/// Flutter under their own name. Until a font is ready the app shows the
/// bundled font the dashboard named with it.

/// Gets a font file's bytes; null when it can't.
typedef FontFetcher = Future<Uint8List?> Function(Uri url);

/// Adds a font's files to Flutter under [family].
typedef FontRegistrar = Future<void> Function(
  String family,
  List<Uint8List> files,
);

const _maxFontBytes = 5 * 1024 * 1024;

FontFetcher dioFontFetcher([Dio? client]) {
  final dio =
      client ??
      Dio(
        BaseOptions(
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 30),
          responseType: ResponseType.bytes,
          validateStatus: (_) => true,
        ),
      );
  return (url) async {
    try {
      final response = await dio.getUri<List<int>>(url);
      final data = response.data;
      return response.statusCode == 200 && data != null
          ? Uint8List.fromList(data)
          : null;
    } on Object {
      return null;
    }
  };
}

Future<void> flutterFontRegistrar(String family, List<Uint8List> files) {
  final loader = FontLoader(family);
  for (final bytes in files) {
    loader.addFont(Future.value(ByteData.sublistView(bytes)));
  }
  return loader.load();
}

/// TrueType and OpenType files, by their first bytes.
bool looksLikeFont(Uint8List bytes) {
  if (bytes.length < 12 || bytes.length > _maxFontBytes) return false;
  final tag = String.fromCharCodes(bytes.sublist(0, 4));
  return (bytes[0] == 0 && bytes[1] == 1 && bytes[2] == 0 && bytes[3] == 0) ||
      tag == 'true' ||
      tag == 'OTTO';
}

/// The name a file is kept under: a hash of its address (which never changes
/// for one file).
String fontCacheKey(String url) {
  // Two 32-bit FNV-1a hashes (the web build has no 64-bit integers).
  int fnv(int seed) {
    var hash = seed;
    for (final unit in url.codeUnits) {
      hash = (hash ^ unit) & 0xFFFFFFFF;
      // hash * 16777619, kept within 32 bits.
      hash = (((hash << 24) & 0xFFFFFFFF) + hash * 403) & 0xFFFFFFFF;
    }
    return hash;
  }

  String hex(int value) => value.toRadixString(16).padLeft(8, '0');
  return '${hex(fnv(0x811c9dc5))}${hex(fnv(0x050c5d1f))}.font';
}

class RemoteFontDeps {
  const RemoteFontDeps({
    required this.fetch,
    required this.cache,
    required this.register,
  });

  final FontFetcher fetch;
  final FontCache cache;
  final FontRegistrar register;
}

final remoteFontDepsProvider = Provider<RemoteFontDeps>(
  (ref) => RemoteFontDeps(
    fetch: dioFontFetcher(),
    cache: createFontCache(),
    register: flutterFontRegistrar,
  ),
);

/// The free fonts ready to use, by family.
class RemoteFonts extends Notifier<Set<String>> {
  final _started = <String>{};

  @override
  Set<String> build() => const {};

  /// Makes [family] ready from [files], once: from the phone when kept,
  /// else downloaded and kept. Nothing happens when a file can't be had;
  /// the next start tries again.
  Future<void> ensure(String family, List<FontFileRef> files) async {
    if (files.isEmpty || !_started.add(family)) return;
    final deps = ref.read(remoteFontDepsProvider);
    final loaded = <Uint8List>[];
    for (final file in files) {
      final url = Uri.tryParse(file.url);
      if (url == null || url.scheme != 'https' && url.scheme != 'http') {
        _started.remove(family);
        return;
      }
      final key = fontCacheKey(file.url);
      var bytes = await deps.cache.read(key);
      if (bytes == null || !looksLikeFont(bytes)) {
        bytes = await deps.fetch(url);
        if (bytes == null || !looksLikeFont(bytes)) {
          _started.remove(family);
          return;
        }
        await deps.cache.write(key, bytes);
      }
      loaded.add(bytes);
    }
    try {
      await deps.register(family, loaded);
    } on Object {
      _started.remove(family);
      return;
    }
    if (!ref.mounted) return;
    state = {...state, family};
  }
}

final remoteFontsProvider = NotifierProvider<RemoteFonts, Set<String>>(
  RemoteFonts.new,
);
