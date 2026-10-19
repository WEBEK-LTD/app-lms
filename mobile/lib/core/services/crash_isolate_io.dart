import 'dart:isolate';

/// 46 Errors of the main isolate that no zone caught.
void listenToIsolateErrors(
  void Function(Object error, StackTrace? stack) onError,
) {
  final port = RawReceivePort((Object? pair) {
    if (pair is List && pair.length == 2) {
      final trace = pair[1];
      onError(
        pair[0] ?? 'Unknown error',
        trace is String && trace.isNotEmpty
            ? StackTrace.fromString(trace)
            : null,
      );
    }
  });
  Isolate.current.addErrorListener(port.sendPort);
}
