/// 104 The coordinates written in a maps link or a text ("30.0444, 31.2357"),
/// read on the phone first; the server reads short links
/// (`POST /delivery/locate`). The same patterns as
/// platform/web/src/lib/delivery/locate.ts.
({double lat, double lng})? coordinatesIn(String text) {
  const n = r'(-?\d{1,3}(?:\.\d+)?)';
  final patterns = [
    RegExp('@$n,$n'),
    RegExp('!3d$n!4d$n'),
    RegExp(
      '[?&](?:q|ll|sll|daddr|destination|coordinate|query|center)=(?:loc:)?$n(?:,|%2C)\\s*$n',
      caseSensitive: false,
    ),
    RegExp('^geo:$n,$n', caseSensitive: false),
    RegExp('^\\s*$n\\s*,\\s*$n\\s*\$'),
  ];
  String decoded;
  try {
    decoded = Uri.decodeComponent(text);
  } catch (_) {
    decoded = text;
  }
  for (final source in [text.trim(), decoded.trim()]) {
    for (final pattern in patterns) {
      final match = pattern.firstMatch(source);
      if (match == null) continue;
      final lat = double.tryParse(match.group(1)!);
      final lng = double.tryParse(match.group(2)!);
      if (lat == null ||
          lng == null ||
          lat.abs() > 90 ||
          lng.abs() > 180 ||
          (lat == 0 && lng == 0)) {
        continue;
      }
      return (lat: lat, lng: lng);
    }
  }
  return null;
}

/// A link the server may read: Google Maps or Apple Maps.
bool isMapsLink(String text) {
  final uri = Uri.tryParse(text.trim());
  if (uri == null || uri.scheme != 'https') return false;
  final host = uri.host.toLowerCase();
  return host == 'maps.app.goo.gl' ||
      host == 'goo.gl' ||
      host == 'maps.apple.com' ||
      RegExp(r'^(www\.|maps\.)?google\.[a-z]{2,3}(\.[a-z]{2})?$')
          .hasMatch(host);
}
