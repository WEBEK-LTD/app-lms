/// Small, strict-but-forgiving JSON readers shared by the API models.
///
/// The contract (`docs/api/openapi.yaml`) is the source of truth. Readers
/// throw [FormatException] when a required field is missing or has the wrong
/// type, and fall back to `null` or a default for optional fields.
library;

typedef Json = Map<String, dynamic>;

Json asJson(Object? value, [String field = 'value']) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return value.cast<String, dynamic>();
  throw FormatException('Expected an object for "$field"', value);
}

Object? _req(Json json, String key) {
  if (!json.containsKey(key) || json[key] == null) {
    throw FormatException('Missing required field "$key"', json);
  }
  return json[key];
}

String reqString(Json json, String key) {
  final value = _req(json, key);
  if (value is String) return value;
  if (value is num) return value.toString();
  throw FormatException('Field "$key" must be a string', value);
}

String? optString(Json json, String key) {
  final value = json[key];
  if (value == null) return null;
  if (value is String) return value;
  if (value is num) return value.toString();
  return null;
}

int reqInt(Json json, String key) {
  final value = _req(json, key);
  final parsed = _toInt(value);
  if (parsed == null) {
    throw FormatException('Field "$key" must be an integer', value);
  }
  return parsed;
}

int? optInt(Json json, String key) => _toInt(json[key]);

int intOr(Json json, String key, int fallback) => _toInt(json[key]) ?? fallback;

int? _toInt(Object? value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}

double? optDouble(Json json, String key) {
  final value = json[key];
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

bool reqBool(Json json, String key) {
  final value = _req(json, key);
  if (value is bool) return value;
  throw FormatException('Field "$key" must be a boolean', value);
}

bool boolOr(Json json, String key, bool fallback) {
  final value = json[key];
  return value is bool ? value : fallback;
}

DateTime? optDate(Json json, String key) {
  final value = json[key];
  if (value is! String || value.isEmpty) return null;
  return DateTime.tryParse(value)?.toUtc();
}

DateTime reqDate(Json json, String key) {
  final value = reqString(json, key);
  final parsed = DateTime.tryParse(value);
  if (parsed == null) {
    throw FormatException('Field "$key" must be an ISO 8601 date', value);
  }
  return parsed.toUtc();
}

List<T> listOf<T>(Json json, String key, T Function(Json item) parse) {
  final value = json[key];
  if (value is! List) return <T>[];
  return [for (final item in value) parse(asJson(item, key))];
}

List<T> reqListOf<T>(Json json, String key, T Function(Json item) parse) {
  final value = _req(json, key);
  if (value is! List) throw FormatException('Field "$key" must be an array');
  return [for (final item in value) parse(asJson(item, key))];
}

List<String> stringList(Json json, String key) {
  final value = json[key];
  if (value is! List) return const [];
  return [
    for (final item in value)
      if (item is String) item,
  ];
}

T? optObject<T>(Json json, String key, T Function(Json item) parse) {
  final value = json[key];
  if (value == null) return null;
  if (value is Map) return parse(asJson(value, key));
  return null;
}

/// Maps a wire string to an enum value, with a fallback for values added to
/// the contract later.
T enumFrom<T extends Enum>(List<T> values, Object? wire, T fallback) {
  if (wire is! String) return fallback;
  for (final value in values) {
    if (value.name == wire) return value;
  }
  return fallback;
}

/// Converts a camelCase enum name to the snake_case wire name.
String snake(Enum value) => value.name.replaceAllMapped(
  RegExp('[A-Z]'),
  (m) => '_${m.group(0)!.toLowerCase()}',
);

/// Maps a snake_case wire string to an enum whose names are camelCase.
T enumFromSnake<T extends Enum>(List<T> values, Object? wire, T fallback) {
  if (wire is! String) return fallback;
  for (final value in values) {
    if (snake(value) == wire) return value;
  }
  return fallback;
}
