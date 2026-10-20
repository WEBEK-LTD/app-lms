/// 59 Small helpers that read the Owner API's JSON strictly enough to catch
/// a wrong shape, and leniently enough that a new field never breaks the app.
typedef Json = Map<String, dynamic>;

Json asJson(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return value.map((k, v) => MapEntry('$k', v));
  throw FormatException('Expected an object, got ${value.runtimeType}');
}

List<Json> jsonList(Json json, String key) {
  final value = json[key];
  if (value is! List) return const [];
  return [
    for (final item in value)
      if (item is Map) asJson(item),
  ];
}

List<T> listOf<T>(Json json, String key, T Function(Json) parse) => [
  for (final item in jsonList(json, key)) parse(item),
];

String str(Json json, String key, [String fallback = '']) {
  final value = json[key];
  if (value == null) return fallback;
  return '$value';
}

String? optStr(Json json, String key) {
  final value = json[key];
  if (value == null) return null;
  final text = '$value';
  return text.isEmpty ? null : text;
}

int integer(Json json, String key, [int fallback = 0]) =>
    optInt(json, key) ?? fallback;

int? optInt(Json json, String key) {
  final value = json[key];
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}

double number(Json json, String key, [double fallback = 0]) =>
    optNumber(json, key) ?? fallback;

double? optNumber(Json json, String key) {
  final value = json[key];
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

bool boolean(Json json, String key, [bool fallback = false]) {
  final value = json[key];
  return value is bool ? value : fallback;
}

DateTime date(Json json, String key) =>
    optDate(json, key) ?? DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);

DateTime? optDate(Json json, String key) {
  final value = json[key];
  if (value is! String || value.isEmpty) return null;
  return DateTime.tryParse(value);
}

List<String> strings(Json json, String key) {
  final value = json[key];
  if (value is! List) return const [];
  return [for (final item in value) '$item'];
}

Json? optObject(Json json, String key) {
  final value = json[key];
  return value is Map ? asJson(value) : null;
}
