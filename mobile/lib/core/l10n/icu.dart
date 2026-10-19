import 'package:intl/intl.dart' as intl;

/// 43 The message format of the app's strings (the ARB files, ICU as
/// gen-l10n reads them), for the owner's translations that arrive at
/// runtime in a string pack: text, `{name}` placeholders and
/// `{count, plural, =1{…} other{…}}` or `{code, select, A{…} other{…}}`.
/// Apostrophes and `#` are plain text. The platform checks strings with the
/// same rules before it serves them (platform/web/src/lib/i18n/icu.ts).
sealed class IcuNode {
  const IcuNode();
}

class IcuText extends IcuNode {
  const IcuText(this.text);
  final String text;
}

class IcuArgument extends IcuNode {
  const IcuArgument(this.name);
  final String name;
}

class IcuChoice extends IcuNode {
  const IcuChoice(this.name, this.plural, this.options);
  final String name;

  /// A plural (`=1`, `one`, `few`…) or a select (any word).
  final bool plural;
  final Map<String, List<IcuNode>> options;
}

class IcuException implements Exception {
  const IcuException(this.message);
  final String message;
  @override
  String toString() => 'IcuException: $message';
}

final _name = RegExp(r'^[A-Za-z_][A-Za-z0-9_]*$');
final _pluralKey = RegExp(r'^(=\d+|zero|one|two|few|many|other)$');
final _selectKey = RegExp(r'^[A-Za-z0-9_-]+$');

/// Parses a message, or throws an [IcuException].
List<IcuNode> parseIcu(String message) {
  var pos = 0;

  late List<IcuNode> Function(bool nested) nodes;

  IcuNode argument() {
    pos += 1;
    final close = message.indexOf('}', pos);
    final comma = message.indexOf(',', pos);
    if (close == -1) throw const IcuException('A { has no } after it.');
    if (comma == -1 || comma > close) {
      final name = message.substring(pos, close).trim();
      if (!_name.hasMatch(name)) throw IcuException('{$name} is not a name.');
      pos = close + 1;
      return IcuArgument(name);
    }
    final name = message.substring(pos, comma).trim();
    if (!_name.hasMatch(name)) throw IcuException('{$name} is not a name.');
    pos = comma + 1;
    final next = message.indexOf(',', pos);
    if (next == -1) throw const IcuException('Expected plural or select.');
    final kind = message.substring(pos, next).trim();
    if (kind != 'plural' && kind != 'select') {
      throw IcuException('$kind is not supported.');
    }
    pos = next + 1;
    final options = <String, List<IcuNode>>{};
    while (true) {
      while (pos < message.length && message[pos].trim().isEmpty) {
        pos += 1;
      }
      if (pos >= message.length) throw const IcuException('No closing }.');
      if (message[pos] == '}') {
        pos += 1;
        break;
      }
      final open = message.indexOf('{', pos);
      if (open == -1) throw const IcuException('A choice has no text.');
      final key = message.substring(pos, open).trim();
      final valid = kind == 'plural' ? _pluralKey : _selectKey;
      if (!valid.hasMatch(key) || options.containsKey(key)) {
        throw IcuException('"$key" is not a valid choice.');
      }
      pos = open + 1;
      options[key] = nodes(true);
      if (pos >= message.length || message[pos] != '}') {
        throw IcuException('The choice "$key" has no closing }.');
      }
      pos += 1;
    }
    if (!options.containsKey('other')) {
      throw const IcuException('An "other" choice is needed.');
    }
    return IcuChoice(name, kind == 'plural', options);
  }

  nodes = (nested) {
    final out = <IcuNode>[];
    final text = StringBuffer();
    while (pos < message.length) {
      final c = message[pos];
      if (c == '}') {
        if (!nested) throw const IcuException('A } has no { before it.');
        break;
      }
      if (c == '{') {
        if (text.isNotEmpty) out.add(IcuText(text.toString()));
        text.clear();
        out.add(argument());
        continue;
      }
      text.write(c);
      pos += 1;
    }
    if (text.isNotEmpty) out.add(IcuText(text.toString()));
    return out;
  };

  return nodes(false);
}

/// The placeholder names a parsed message uses.
Set<String> icuArguments(List<IcuNode> nodes, [Set<String>? into]) {
  final out = into ?? <String>{};
  for (final node in nodes) {
    switch (node) {
      case IcuText():
        break;
      case IcuArgument(:final name):
        out.add(name);
      case IcuChoice(:final name, :final options):
        out.add(name);
        for (final option in options.values) {
          icuArguments(option, out);
        }
    }
  }
  return out;
}

/// Formats a parsed message with [args], plurals by the rules of [locale].
String formatIcu(List<IcuNode> nodes, Map<String, Object> args, String locale) {
  final out = StringBuffer();
  for (final node in nodes) {
    switch (node) {
      case IcuText(:final text):
        out.write(text);
      case IcuArgument(:final name):
        out.write('${args[name] ?? ''}');
      case IcuChoice(:final name, :final plural, :final options):
        final value = args[name];
        final chosen = plural
            ? _pluralChoice(options, value is num ? value : 0, locale)
            : (options['$value'] ?? options['other']!);
        out.write(formatIcu(chosen, args, locale));
    }
  }
  return out.toString();
}

List<IcuNode> _pluralChoice(
  Map<String, List<IcuNode>> options,
  num count,
  String locale,
) {
  final exact = options['=$count'];
  if (exact != null) return exact;
  return intl.Intl.pluralLogic<List<IcuNode>>(
    count,
    locale: locale,
    zero: options['zero'],
    one: options['one'],
    two: options['two'],
    few: options['few'],
    many: options['many'],
    other: options['other']!,
  );
}
