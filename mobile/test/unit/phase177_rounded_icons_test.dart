import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// 177 Material Symbols Rounded only: the marketplace's and the vendor's
/// screens drew 76 outlined symbols (`Symbols.storefront`,
/// `Symbols.two_wheeler`…) beside the app's rounded ones.
void main() {
  test('every Material Symbol the app draws is a rounded one', () {
    final outlined = <String>[];
    final symbol = RegExp(r'\bSymbols\.([a-z0-9_]+)');
    for (final file in Directory('lib').listSync(recursive: true)) {
      if (file is! File || !file.path.endsWith('.dart')) continue;
      final lines = file.readAsLinesSync();
      for (final (i, line) in lines.indexed) {
        for (final m in symbol.allMatches(line)) {
          if (!m.group(1)!.endsWith('_rounded')) {
            outlined.add('${file.path}:${i + 1} ${m.group(0)}');
          }
        }
      }
    }
    expect(outlined, isEmpty);
  });
}
