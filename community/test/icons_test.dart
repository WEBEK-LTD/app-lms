import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// The design's icons are Material Symbols Rounded only. In
/// material_symbols_icons, `Symbols.home` is the Outlined family and
/// `Symbols.home_rounded` the Rounded one; Material's `Icons` are neither.
void main() {
  test('every icon is Material Symbols Rounded', () {
    final wrong = <String>[];
    for (final f in Directory(
      'lib',
    ).listSync(recursive: true).whereType<File>()) {
      if (!f.path.endsWith('.dart')) continue;
      final source = f.readAsStringSync();
      for (final m in RegExp(r'\bSymbols\.([a-z0-9_]+)\b').allMatches(source)) {
        if (!m.group(1)!.endsWith('_rounded')) wrong.add('${f.path}: ${m[0]}');
      }
      for (final m in RegExp(r'\bIcons\.[a-z0-9_]+').allMatches(source)) {
        wrong.add('${f.path}: ${m[0]}');
      }
    }
    expect(wrong, isEmpty);
  });
}
