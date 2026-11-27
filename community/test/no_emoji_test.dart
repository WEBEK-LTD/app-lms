import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// The interface's own words carry no emoji (#527's look); what members
/// write keeps theirs.
void main() {
  test('no emoji in the app\'s strings', () {
    final emoji = RegExp(
      r'[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}]',
      unicode: true,
    );
    final found = <String>[];
    for (final f in Directory('lib/l10n').listSync().whereType<File>()) {
      if (!f.path.endsWith('.arb')) continue;
      final arb = jsonDecode(f.readAsStringSync()) as Map<String, dynamic>;
      arb.forEach((k, v) {
        if (v is String && emoji.hasMatch(v)) found.add('${f.path}: $k');
      });
    }
    expect(found, isEmpty);
  });
}
