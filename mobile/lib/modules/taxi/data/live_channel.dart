import 'dart:async';
import 'dart:convert';

import 'package:dio/dio.dart';

/// 105.9 The company's Firebase Realtime Database, over its REST API: the
/// app signs in with the custom token Yallapp gives it
/// (`POST /taxi/live-token`), listens to paths as Server-Sent Events and
/// writes a driver's position. Plain HTTP, so no Firebase plugin is added
/// to every app built from this code.

// Cells

const _base32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/// The geohash of a position, [precision] letters (5: about 5 km × 5 km).
String geohash(double lat, double lng, {int precision = 5}) {
  var latMin = -90.0, latMax = 90.0, lngMin = -180.0, lngMax = 180.0;
  final out = StringBuffer();
  var bit = 0, ch = 0;
  var even = true;
  while (out.length < precision) {
    if (even) {
      final mid = (lngMin + lngMax) / 2;
      if (lng >= mid) {
        ch = (ch << 1) | 1;
        lngMin = mid;
      } else {
        ch <<= 1;
        lngMax = mid;
      }
    } else {
      final mid = (latMin + latMax) / 2;
      if (lat >= mid) {
        ch = (ch << 1) | 1;
        latMin = mid;
      } else {
        ch <<= 1;
        latMax = mid;
      }
    }
    even = !even;
    if (++bit == 5) {
      out.write(_base32[ch]);
      bit = 0;
      ch = 0;
    }
  }
  return out.toString();
}

/// The cell a position is in and the eight around it: a rider listens to
/// these for the free taxis near them.
List<String> cellsAround(double lat, double lng, {int precision = 5}) {
  // A cell's size at this precision, from the bits each axis gets.
  final lngBits = (precision * 5 + 1) ~/ 2;
  final latBits = precision * 5 ~/ 2;
  final dLat = 180 / (1 << latBits);
  final dLng = 360 / (1 << lngBits);
  final cells = <String>{};
  for (final y in const [-1, 0, 1]) {
    for (final x in const [-1, 0, 1]) {
      final la = (lat + y * dLat).clamp(-89.999999, 89.999999);
      var ln = lng + x * dLng;
      if (ln >= 180) ln -= 360;
      if (ln < -180) ln += 360;
      cells.add(geohash(la, ln, precision: precision));
    }
  }
  return cells.toList();
}

// Server-Sent Events

/// One event of a Realtime Database stream: `put` replaces the value at
/// [path] (below the listened place), `patch` merges children into it.
class LiveEvent {
  const LiveEvent(this.kind, this.path, this.data);

  /// `put`, `patch`, `keep-alive`, `cancel` or `auth_revoked`.
  final String kind;
  final String path;
  final Object? data;
}

/// Turns a stream's text into its events.
class EventSplitter {
  final _buffer = StringBuffer();

  List<LiveEvent> add(String chunk) {
    _buffer.write(chunk);
    final text = _buffer.toString().replaceAll('\r\n', '\n');
    final blocks = text.split('\n\n');
    _buffer
      ..clear()
      ..write(blocks.removeLast());
    final events = <LiveEvent>[];
    for (final block in blocks) {
      String? kind;
      final data = StringBuffer();
      for (final line in block.split('\n')) {
        if (line.startsWith('event:')) kind = line.substring(6).trim();
        if (line.startsWith('data:')) data.write(line.substring(5).trim());
      }
      if (kind == null) continue;
      if (kind != 'put' && kind != 'patch') {
        events.add(LiveEvent(kind, '/', null));
        continue;
      }
      try {
        final body = jsonDecode(data.toString());
        if (body is Map<String, dynamic>) {
          events.add(
            LiveEvent(kind, body['path'] as String? ?? '/', body['data']),
          );
        }
      } on FormatException {
        // A broken event is skipped; the next put brings the state.
      }
    }
    return events;
  }
}

/// The value at a listened place, kept up to date from its events.
class LiveTree {
  Object? value;

  void apply(LiveEvent event) {
    final parts = event.path.split('/').where((p) => p.isNotEmpty).toList();
    if (event.kind == 'put') {
      value = _put(value, parts, event.data);
    } else if (event.kind == 'patch' && event.data is Map) {
      for (final entry in (event.data as Map).entries) {
        value = _put(value, [
          ...parts,
          ...'${entry.key}'.split('/'),
        ], entry.value);
      }
    }
  }

  static Object? _put(Object? node, List<String> path, Object? data) {
    if (path.isEmpty) return data;
    final map = node is Map
        ? Map<String, Object?>.from(node)
        : <String, Object?>{};
    final child = _put(map[path.first], path.sublist(1), data);
    if (child == null) {
      map.remove(path.first);
    } else {
      map[path.first] = child;
    }
    return map.isEmpty ? null : map;
  }
}

// The database

/// Signed in to the company's Firebase with a custom token.
class LiveSession {
  LiveSession({required this.idToken, required this.until});

  final String idToken;
  final DateTime until;

  bool get valid => DateTime.now().isBefore(until);
}

class LiveDatabase {
  LiveDatabase({
    required this.databaseUrl,
    required this.root,
    required this.apiKey,
    Dio? dio,
  }) : _dio =
           dio ?? Dio(BaseOptions(connectTimeout: const Duration(seconds: 10)));

  final String databaseUrl;
  final String root;

  /// The app's Firebase web API key (its google-services.json's).
  final String apiKey;
  final Dio _dio;
  LiveSession? _session;

  bool get signedIn => _session?.valid ?? false;

  /// Trades Yallapp's custom token for a Firebase ID token.
  Future<void> signIn(String customToken) async {
    final response = await _dio.post<Map<String, dynamic>>(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken',
      queryParameters: {'key': apiKey},
      data: {'token': customToken, 'returnSecureToken': true},
    );
    final body = response.data ?? const {};
    final idToken = body['idToken'] as String?;
    if (idToken == null) throw StateError('Firebase sign-in failed');
    final seconds = int.tryParse('${body['expiresIn']}') ?? 3600;
    // A minute early, so a write never goes out with an expired token.
    _session = LiveSession(
      idToken: idToken,
      until: DateTime.now().add(Duration(seconds: seconds - 60)),
    );
  }

  String _url(String path) => '$databaseUrl/$root/$path.json';

  Map<String, String> get _auth => {'auth': _session?.idToken ?? ''};

  Future<void> put(String path, Object? value) => _dio.put<void>(
    _url(path),
    queryParameters: _auth,
    data: jsonEncode(value),
  );

  Future<void> remove(String path) =>
      _dio.delete<void>(_url(path), queryParameters: _auth);

  /// Several places at once (a driver's position and their cell); null
  /// removes one.
  Future<void> update(Map<String, Object?> values) => _dio.patch<void>(
    '$databaseUrl/$root.json',
    queryParameters: _auth,
    data: jsonEncode(values),
  );

  /// The value at [path] whenever it changes, until the stream is
  /// cancelled. Ends with an error when the database closes it (a new
  /// token is then needed).
  Stream<Object?> listen(String path) {
    late StreamController<Object?> controller;
    CancelToken? cancel;
    controller = StreamController<Object?>(
      onListen: () async {
        cancel = CancelToken();
        final tree = LiveTree();
        final splitter = EventSplitter();
        try {
          final response = await _dio.get<ResponseBody>(
            _url(path),
            queryParameters: _auth,
            options: Options(
              responseType: ResponseType.stream,
              headers: {'accept': 'text/event-stream'},
              receiveTimeout: const Duration(minutes: 2),
            ),
            cancelToken: cancel,
          );
          await for (final chunk
              in response.data!.stream.cast<List<int>>().transform(
                utf8.decoder,
              )) {
            for (final event in splitter.add(chunk)) {
              if (event.kind == 'cancel' || event.kind == 'auth_revoked') {
                throw StateError('The live database closed the stream');
              }
              if (event.kind == 'put' || event.kind == 'patch') {
                tree.apply(event);
                controller.add(tree.value);
              }
            }
          }
          if (!controller.isClosed) {
            controller.addError(StateError('The live stream ended'));
          }
        } catch (e) {
          if (!controller.isClosed && !(cancel?.isCancelled ?? false)) {
            controller.addError(e);
          }
        }
      },
      onCancel: () => cancel?.cancel(),
    );
    return controller.stream;
  }
}
