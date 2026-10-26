import 'dart:typed_data';

import 'package:flutter/material.dart' show Brightness;
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:yallapp/core/api/models/models.dart';
import 'package:yallapp/core/theme/app_look.dart';
import 'package:yallapp/core/theme/fonts/font_cache.dart';
import 'package:yallapp/core/theme/fonts/remote_fonts.dart';

import '../support/fixtures.dart';
import '../support/test_app.dart';

/// 97.1 Free fonts: downloaded from Yallapp once, kept on the phone, shown
/// once ready, the bundled font until then.

Uint8List ttf([int fill = 7]) =>
    Uint8List.fromList([0, 1, 0, 0, ...List.filled(60, fill)]);

class MemoryFontCache implements FontCache {
  final files = <String, Uint8List>{};

  @override
  Future<Uint8List?> read(String key) async => files[key];

  @override
  Future<void> write(String key, Uint8List bytes) async => files[key] = bytes;
}

class FakeFonts {
  FakeFonts({this.bytes});

  Uint8List? Function(Uri url)? bytes;
  final fetched = <Uri>[];
  final registered = <String, int>{};
  final cache = MemoryFontCache();

  RemoteFontDeps get deps => RemoteFontDeps(
    fetch: (url) async {
      fetched.add(url);
      return (bytes ?? (_) => ttf())(url);
    },
    cache: cache,
    register: (family, files) async => registered[family] = files.length,
  );
}

const cairo = [
  FontFileRef(
    url: 'https://yallapp.example/api/v1/fonts/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf',
  ),
];

const tajawal = [
  FontFileRef(
    url: 'https://yallapp.example/api/v1/fonts/ofl/tajawal/Tajawal-Regular.ttf',
    weight: 400,
  ),
  FontFileRef(
    url: 'https://yallapp.example/api/v1/fonts/ofl/tajawal/Tajawal-Medium.ttf',
    weight: 500,
  ),
];

Map<String, dynamic> withFonts() => {
  ...appearanceJson(),
  'font': 'DM Sans',
  'font_family': 'Cairo',
  'font_files': [
    {'url': cairo.first.url, 'weight': null},
  ],
  'arabic_font': 'Tajawal',
  'arabic_font_files': [
    for (final f in tajawal) {'url': f.url, 'weight': f.weight},
  ],
};

void main() {
  test('Config.appearance reads the free fonts and their files', () {
    final a = Appearance.fromJson(withFonts());
    expect(a.font, 'DM Sans');
    expect(a.fontFamily, 'Cairo');
    expect(a.fontFiles.single.url, cairo.first.url);
    expect(a.fontFiles.single.weight, isNull);
    expect(a.arabicFont, 'Tajawal');
    expect(a.arabicFontFiles.map((f) => f.weight), [400, 500]);
    // An older dashboard sends none.
    final old = Appearance.fromJson(appearanceJson());
    expect(old.fontFamily, isNull);
    expect(old.fontFiles, isEmpty);
  });

  test('the bundled font shows until the free one is on the phone', () {
    final config = AppConfig.fromJson(configJson(appearance: withFonts()));
    final before = AppLook.resolve(testBuild, config);
    expect(before.font, 'DM Sans');
    expect(before.fallback, ['Readex Pro']);
    final after = AppLook.resolve(
      testBuild,
      config,
      ready: {'Cairo', 'Tajawal'},
    );
    expect(after.font, 'Cairo');
    expect(after.fallback, ['Tajawal', 'Readex Pro']);
    expect(
      after.theme(Brightness.light).textTheme.bodyMedium?.fontFamily,
      'Cairo',
    );
    // Readex Pro is bundled: it needs no download.
    final readex = AppLook.resolve(
      testBuild,
      AppConfig.fromJson(
        configJson(
          appearance: {...appearanceJson(), 'font_family': 'Readex Pro'},
        ),
      ),
    );
    expect(readex.font, 'Readex Pro');
  });

  test(
    'a font is downloaded once, kept, and read from the phone after',
    () async {
      final fake = FakeFonts();
      final container = ProviderContainer(
        overrides: [remoteFontDepsProvider.overrideWithValue(fake.deps)],
      );
      addTearDown(container.dispose);
      final fonts = container.read(remoteFontsProvider.notifier);
      await fonts.ensure('Tajawal', tajawal);
      await fonts.ensure('Tajawal', tajawal);
      expect(fake.fetched, hasLength(2));
      expect(fake.registered, {'Tajawal': 2});
      expect(container.read(remoteFontsProvider), {'Tajawal'});
      expect(fake.cache.files.keys, [
        for (final f in tajawal) fontCacheKey(f.url),
      ]);

      // The next start: read from the phone, nothing downloaded.
      final next = FakeFonts()..cache.files.addAll(fake.cache.files);
      final again = ProviderContainer(
        overrides: [remoteFontDepsProvider.overrideWithValue(next.deps)],
      );
      addTearDown(again.dispose);
      await again.read(remoteFontsProvider.notifier).ensure('Tajawal', tajawal);
      expect(next.fetched, isEmpty);
      expect(again.read(remoteFontsProvider), {'Tajawal'});
    },
  );

  test('a file that is not a font, or not there, leaves the bundled font and is tried again', () async {
    final fake = FakeFonts(
      bytes: (_) =>
          Uint8List.fromList('<html><body>missing</body></html>'.codeUnits),
    );
    final container = ProviderContainer(
      overrides: [remoteFontDepsProvider.overrideWithValue(fake.deps)],
    );
    addTearDown(container.dispose);
    final fonts = container.read(remoteFontsProvider.notifier);
    await fonts.ensure('Cairo', cairo);
    expect(container.read(remoteFontsProvider), isEmpty);
    expect(fake.cache.files, isEmpty);
    fake.bytes = (_) => null;
    await fonts.ensure('Cairo', cairo);
    expect(fake.fetched, hasLength(2));
    fake.bytes = (_) => ttf();
    await fonts.ensure('Cairo', cairo);
    expect(container.read(remoteFontsProvider), {'Cairo'});
  });

  test('only font files are taken, and each address keeps one name', () {
    expect(looksLikeFont(ttf()), isTrue);
    expect(
      looksLikeFont(
        Uint8List.fromList([...'OTTO'.codeUnits, ...List.filled(20, 0)]),
      ),
      isTrue,
    );
    expect(
      looksLikeFont(Uint8List.fromList('{"code":"x"}'.codeUnits)),
      isFalse,
    );
    expect(
      looksLikeFont(Uint8List(5 * 1024 * 1024 + 1)..setAll(0, [0, 1, 0, 0])),
      isFalse,
    );
    expect(fontCacheKey(cairo.first.url), fontCacheKey(cairo.first.url));
    expect(
      fontCacheKey(cairo.first.url),
      isNot(fontCacheKey(tajawal.first.url)),
    );
  });
}
