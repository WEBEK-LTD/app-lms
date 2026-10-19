import 'icu.dart';

/// 43 The owner's translations of the app's strings in one language (a
/// string pack from `Config.languages.list`), checked before use: a string
/// that doesn't parse, uses a placeholder the app doesn't pass, or makes a
/// plural of something that isn't a number is ignored, and the app's own
/// string shows instead. The platform refuses such strings too; this keeps
/// a broken pack from ever breaking a screen.
class StringOverlay {
  StringOverlay(Map<String, String> strings, {required this.locale})
    : _strings = Map.unmodifiable(strings);

  static final empty = StringOverlay(const {}, locale: 'en');

  final Map<String, String> _strings;

  /// For plural rules (`one`, `few`…).
  final String locale;

  final Map<String, List<IcuNode>?> _parsed = {};

  /// Keys whose string was ignored, for tests and debugging.
  final Set<String> rejected = {};

  bool get isEmpty => _strings.isEmpty;

  /// The owner's string for a key without placeholders, or null.
  String? text(String key) => format(key, const {});

  /// The owner's string for [key] with [args] filled in, or null.
  String? format(String key, Map<String, Object> args) {
    final raw = _strings[key];
    if (raw == null || raw.trim().isEmpty) return null;
    final nodes = _parsed.putIfAbsent(key, () => _check(key, raw, args));
    if (nodes == null) return null;
    return formatIcu(nodes, args, locale);
  }

  List<IcuNode>? _check(String key, String raw, Map<String, Object> args) {
    try {
      final nodes = parseIcu(raw);
      if (!_valid(nodes, args)) {
        rejected.add(key);
        return null;
      }
      return nodes;
    } on IcuException {
      rejected.add(key);
      return null;
    }
  }

  bool _valid(List<IcuNode> nodes, Map<String, Object> args) {
    for (final node in nodes) {
      switch (node) {
        case IcuText():
          break;
        case IcuArgument(:final name):
          if (!args.containsKey(name)) return false;
        case IcuChoice(:final name, :final plural, :final options):
          if (!args.containsKey(name)) return false;
          if (plural && args[name] is! num) return false;
          for (final option in options.values) {
            if (!_valid(option, args)) return false;
          }
      }
    }
    return true;
  }
}
