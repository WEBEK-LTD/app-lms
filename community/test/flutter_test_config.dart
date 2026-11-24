import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// Loads the app's real fonts (and the icon font) so that layouts in tests,
/// and the comparison screenshots, measure text as a phone does.
Future<void> testExecutable(FutureOr<void> Function() testMain) async {
  TestWidgetsFlutterBinding.ensureInitialized();
  Future<void> load(String family, List<String> files) async {
    final loader = FontLoader(family);
    for (final f in files) {
      loader.addFont(
        Future.value(ByteData.sublistView(File(f).readAsBytesSync())),
      );
    }
    await loader.load();
  }

  await load('Inter', ['assets/fonts/inter/Inter-Variable.ttf']);
  await load('Readex Pro', ['assets/fonts/readexpro/ReadexPro-Variable.ttf']);
  await load('IBM Plex Sans Arabic', [
    for (final w in ['Regular', 'Medium', 'SemiBold', 'Bold'])
      'assets/fonts/ibmplexsansarabic/IBMPlexSansArabic-$w.ttf',
  ]);
  final config = jsonDecode(
    File('.dart_tool/package_config.json').readAsStringSync(),
  );
  final root = (config['packages'] as List)
      .cast<Map<String, dynamic>>()
      .firstWhere((p) => p['name'] == 'material_symbols_icons')['rootUri'];
  final symbols = File.fromUri(
    Uri.parse('.dart_tool/')
        .resolve('$root/')
        .resolve('lib/fonts/MaterialSymbolsRounded.ttf'),
  );
  if (symbols.existsSync()) {
    await load('packages/material_symbols_icons/MaterialSymbolsRounded', [
      symbols.path,
    ]);
  }
  // Emoji in colour, where the machine has the font (the shots).
  for (final path in [
    '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf',
    '/opt/flutter/engine/src/flutter/txt/third_party/fonts/NotoColorEmoji.ttf',
  ]) {
    if (File(path).existsSync()) {
      await load('Noto Color Emoji', [path]);
      break;
    }
  }
  await testMain();
}
