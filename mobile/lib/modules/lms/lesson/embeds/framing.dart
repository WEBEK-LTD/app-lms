/// Whether a page may be shown inside an iframe of [parentOrigin], from its
/// `X-Frame-Options` and `Content-Security-Policy` response headers.
///
/// Pages that refuse framing are shown as an "Open" card that opens them
/// full screen instead.
bool framingAllowed({
  required Map<String, List<String>> headers,
  required Uri embedUrl,
  required Uri parentOrigin,
}) {
  String? header(String name) {
    for (final entry in headers.entries) {
      if (entry.key.toLowerCase() == name) return entry.value.join(',');
    }
    return null;
  }

  final sameOrigin =
      embedUrl.scheme == parentOrigin.scheme &&
      embedUrl.host.toLowerCase() == parentOrigin.host.toLowerCase() &&
      _port(embedUrl) == _port(parentOrigin);

  final csp = header('content-security-policy');
  if (csp != null) {
    for (final directive in csp.split(';')) {
      final parts = directive.trim().split(RegExp(r'\s+'));
      if (parts.isEmpty || parts.first.toLowerCase() != 'frame-ancestors') {
        continue;
      }
      // CSP frame-ancestors takes precedence over X-Frame-Options.
      return _ancestorsAllow(
        parts.skip(1).toList(),
        embedUrl,
        parentOrigin,
        sameOrigin,
      );
    }
  }

  final xfo = header('x-frame-options')?.trim().toLowerCase();
  if (xfo == null || xfo.isEmpty) return true;
  if (xfo.contains('deny')) return false;
  if (xfo.contains('sameorigin')) return sameOrigin;
  // ALLOW-FROM is obsolete and ignored by browsers.
  return true;
}

bool _ancestorsAllow(
  List<String> sources,
  Uri embedUrl,
  Uri parent,
  bool sameOrigin,
) {
  for (final raw in sources) {
    final source = raw.toLowerCase().replaceAll('"', '');
    if (source == "'none'") return false;
    if (source == '*') return true;
    if (source == "'self'") {
      if (sameOrigin) return true;
      continue;
    }
    if (source == 'https:' && parent.scheme == 'https') return true;
    final pattern = Uri.tryParse(
      source.contains('://') ? source : 'https://$source',
    );
    if (pattern == null || pattern.host.isEmpty) continue;
    final host = pattern.host;
    final parentHost = parent.host.toLowerCase();
    final matches = host.startsWith('*.')
        ? parentHost.endsWith(host.substring(1))
        : parentHost == host;
    if (matches) return true;
  }
  return false;
}

int _port(Uri uri) =>
    uri.hasPort ? uri.port : (uri.scheme == 'http' ? 80 : 443);
