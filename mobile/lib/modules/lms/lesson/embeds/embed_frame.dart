import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/api/models/models.dart';
import '../../../../core/providers.dart';
import 'framing.dart';

/// Builds the page that hosts an embed inside an inline web view.
///
/// The page is loaded with the site as its origin, so:
/// - YouTube and Vimeo receive the site as the referrer;
/// - a same-site frame can be measured directly (`measure`), with a
///   ResizeObserver for later changes;
/// - heights posted by the embedded page (iframe-resizer `[iFrameSizer]`
///   messages, `{"height": n}` or `{"type": "resize", "height": n}`) are
///   forwarded to Flutter through the `YallappHeight` channel.
String embedWrapperHtml({required String src, required bool measure}) {
  final srcAttr = const HtmlEscape(HtmlEscapeMode.attribute).convert(src);
  return '''
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: transparent; }
iframe { border: 0; display: block; width: 100%; height: 100%; }
</style>
</head>
<body>
<iframe id="yallapp-frame" src="$srcAttr"
  allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
  allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>
<script>
(function () {
  var frame = document.getElementById('yallapp-frame');
  var last = 0;
  function send(h) {
    h = Math.ceil(Number(h));
    if (!(h > 0) || Math.abs(h - last) < 2) return;
    last = h;
    if (window.YallappHeight) YallappHeight.postMessage(String(h));
  }
  function measure() {
    try {
      var d = frame.contentDocument || frame.contentWindow.document;
      if (!d || !d.documentElement) return;
      var b = d.body, e = d.documentElement;
      send(Math.max(b ? b.scrollHeight : 0, e.scrollHeight, b ? b.offsetHeight : 0, e.offsetHeight));
    } catch (err) { /* cross-origin: not measurable */ }
  }
  if (${measure ? 'true' : 'false'}) {
    frame.addEventListener('load', function () {
      measure();
      try { new ResizeObserver(measure).observe(frame.contentDocument.documentElement); } catch (err) {}
      setTimeout(measure, 400);
      setTimeout(measure, 1500);
    });
  }
  window.addEventListener('message', function (event) {
    var data = event.data, h = null;
    if (typeof data === 'string') {
      if (data.indexOf('[iFrameSizer]') === 0) {
        h = parseFloat(data.substr(13).split(':')[1]);
      } else {
        try { data = JSON.parse(data); } catch (err) { return; }
      }
    }
    if (h === null && data && typeof data === 'object') {
      h = parseFloat(data.height || data.frameHeight || (data.type === 'resize' ? data.value : null));
    }
    if (h > 0) send(h);
  });
})();
</script>
</body>
</html>
''';
}

/// Converts YouTube and Vimeo page links to their embeddable player URLs.
String embeddableVideoUrl(String url) {
  final uri = Uri.tryParse(url);
  if (uri == null) return url;
  final host = uri.host.replaceFirst('www.', '').replaceFirst('m.', '');
  String? youtubeId;
  if (host == 'youtu.be' && uri.pathSegments.isNotEmpty) {
    youtubeId = uri.pathSegments.first;
  } else if (host.endsWith('youtube.com') ||
      host.endsWith('youtube-nocookie.com')) {
    if (uri.path == '/watch') youtubeId = uri.queryParameters['v'];
    final segments = uri.pathSegments;
    if (segments.length >= 2 &&
        (segments.first == 'embed' ||
            segments.first == 'shorts' ||
            segments.first == 'live')) {
      youtubeId = segments[1];
    }
  }
  if (youtubeId != null && youtubeId.isNotEmpty) {
    return 'https://www.youtube.com/embed/$youtubeId?playsinline=1&rel=0';
  }
  if (host == 'vimeo.com' && uri.pathSegments.isNotEmpty) {
    final id = uri.pathSegments.firstWhere(
      (s) => RegExp(r'^\d+$').hasMatch(s),
      orElse: () => '',
    );
    if (id.isNotEmpty) {
      return 'https://player.vimeo.com/video/$id?playsinline=1';
    }
  }
  return url;
}

/// Checks whether an embed URL allows being framed by the site.
typedef FramingCheck = Future<bool> Function(Uri embed);

/// Fetches the embed's headers once per URL. Network failures count as
/// allowed: the frame then simply tries to load.
final framingCheckProvider = Provider<FramingCheck>((ref) {
  final site = Uri.parse(ref.watch(appEnvironmentProvider).siteUrl);
  final cache = <String, Future<bool>>{};
  final dio = Dio(
    BaseOptions(
      connectTimeout: const Duration(seconds: 8),
      receiveTimeout: const Duration(seconds: 8),
      followRedirects: true,
      validateStatus: (_) => true,
      responseType: ResponseType.stream,
    ),
  );
  ref.onDispose(dio.close);
  return (embed) => cache.putIfAbsent(embed.toString(), () async {
    try {
      final response = await dio.getUri<ResponseBody>(embed);
      response.data?.stream.listen(null).cancel();
      return framingAllowed(
        headers: response.headers.map,
        embedUrl: response.realUri,
        parentOrigin: site,
      );
    } on Object {
      return true;
    }
  });
});

/// Providers known to allow framing (no header check needed).
bool knownFrameable(Embed embed) =>
    embed.provider == EmbedProvider.youtube ||
    embed.provider == EmbedProvider.vimeo;
