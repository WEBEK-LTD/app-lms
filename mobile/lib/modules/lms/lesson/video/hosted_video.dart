import 'package:flutter/foundation.dart';
import 'package:html/parser.dart' as html_parser;

/// 40 The video sites a lesson video can be hosted on.
enum VideoHost { youtube, vimeo, bunny, wistia, dailymotion, loom }

/// 40 A video on a video site, read from its page link, player link or
/// embed code.
///
/// 72 By default every site plays in its normal player, with its controls and
/// branding. When the owner hides the branding (`Config.app.hide_video_branding`,
/// at their own risk), YouTube, Vimeo and Bunny Stream play behind the app's
/// own controls (see `brandlessPlayerHtml`) and the others keep their own
/// controls with their branding turned off where the site allows it.
@immutable
class HostedVideo {
  const HostedVideo({
    required this.host,
    required this.id,
    this.hash,
    this.library,
    this.query = const {},
    this.vertical = false,
  });

  final VideoHost host;
  final String id;

  /// Vimeo: the private link's hash (`h`) of an unlisted video.
  final String? hash;

  /// Bunny Stream: the video library.
  final String? library;

  /// Bunny Stream: the player link's own query (signed links keep `token`
  /// and `expires`).
  final Map<String, String> query;

  /// YouTube Shorts: a portrait video.
  final bool vertical;

  /// The site's player has a JavaScript API the app follows (watch tracking,
  /// resume, the end): played with the app's controls when the branding is
  /// hidden, else with the site's own.
  bool get ownControls =>
      host == VideoHost.youtube ||
      host == VideoHost.vimeo ||
      host == VideoHost.bunny;

  /// Width divided by height, as far as the link tells.
  double get aspectRatio => vertical ? 9 / 16 : 16 / 9;

  /// Reads a link to a video page or player; null when it isn't one.
  static HostedVideo? parse(String url) {
    final uri = Uri.tryParse(url.trim());
    if (uri == null || !(uri.scheme == 'https' || uri.scheme == 'http')) {
      return null;
    }
    final host = _bareHost(uri.host);
    final segments = uri.pathSegments.where((s) => s.isNotEmpty).toList();
    String? at(int i) => i < segments.length ? segments[i] : null;

    if (host == 'youtu.be') {
      return _youtube(at(0));
    }
    if (host == 'youtube.com' || host == 'youtube-nocookie.com') {
      if (segments.isEmpty) return null;
      if (segments.first == 'watch') return _youtube(uri.queryParameters['v']);
      if (const {'embed', 'shorts', 'live', 'v'}.contains(segments.first)) {
        return _youtube(at(1), vertical: segments.first == 'shorts');
      }
      return null;
    }
    if (host == 'vimeo.com' || host == 'player.vimeo.com') {
      final index = segments.indexWhere((s) => RegExp(r'^\d+$').hasMatch(s));
      if (index < 0) return null;
      final next = at(index + 1);
      final hash =
          uri.queryParameters['h'] ??
          (next != null && RegExp(r'^[0-9a-f]{6,}$').hasMatch(next)
              ? next
              : null);
      return HostedVideo(
        host: VideoHost.vimeo,
        id: segments[index],
        hash: hash,
      );
    }
    if (host == 'iframe.mediadelivery.net' ||
        host == 'player.mediadelivery.net') {
      if ((at(0) == 'embed' || at(0) == 'play') &&
          at(1) != null &&
          at(2) != null) {
        return HostedVideo(
          host: VideoHost.bunny,
          library: at(1),
          id: at(2)!,
          query: {
            for (final key in const ['token', 'expires'])
              if (uri.queryParameters[key] != null)
                key: uri.queryParameters[key]!,
          },
        );
      }
      return null;
    }
    if (host.endsWith('wistia.net') ||
        host.endsWith('wistia.com') ||
        host == 'wi.st') {
      final index = segments.indexWhere((s) => s == 'iframe' || s == 'medias');
      final id = index < 0 ? null : at(index + 1);
      return id == null ? null : HostedVideo(host: VideoHost.wistia, id: id);
    }
    if (host == 'dai.ly') {
      final id = at(0);
      return id == null
          ? null
          : HostedVideo(host: VideoHost.dailymotion, id: id);
    }
    if (host.endsWith('dailymotion.com')) {
      final id =
          uri.queryParameters['video'] ??
          (segments.contains('video')
              ? at(segments.indexOf('video') + 1)
              : null);
      return id == null
          ? null
          : HostedVideo(host: VideoHost.dailymotion, id: id.split('_').first);
    }
    if (host == 'loom.com') {
      if ((at(0) == 'share' || at(0) == 'embed') && at(1) != null) {
        return HostedVideo(host: VideoHost.loom, id: at(1)!);
      }
      return null;
    }
    return null;
  }

  /// Reads the first player frame in embed code.
  static HostedVideo? fromEmbedHtml(String html) {
    final frames = html_parser.parseFragment(html).querySelectorAll('iframe');
    for (final frame in frames) {
      final video = parse(frame.attributes['src'] ?? '');
      if (video != null) return video;
    }
    return null;
  }

  static HostedVideo? _youtube(String? id, {bool vertical = false}) {
    if (id == null || !RegExp(r'^[A-Za-z0-9_-]{6,}$').hasMatch(id)) {
      return null;
    }
    return HostedVideo(host: VideoHost.youtube, id: id, vertical: vertical);
  }

  /// The site's player. 72 With [hideBranding] false (the default for apps,
  /// `Config.app.hide_video_branding`), its normal player with its own
  /// controls and branding; with it true, everything the site lets us turn
  /// off turned off (roadmap 40).
  ///
  /// YouTube's `origin` is added by the page itself (its own address).
  Uri playerUrl({int startSeconds = 0, bool hideBranding = true}) =>
      hideBranding ? _brandlessUrl(startSeconds) : _siteUrl(startSeconds);

  /// 72 Each site's normal player: only what the app needs (inline play on
  /// iPhone, the JavaScript API, the start), nothing of the site's hidden.
  Uri _siteUrl(int startSeconds) => switch (host) {
    VideoHost.youtube => Uri.https('www.youtube.com', '/embed/$id', {
      'enablejsapi': '1',
      'playsinline': '1',
      'autoplay': '0',
      if (startSeconds > 0) 'start': '$startSeconds',
    }),
    VideoHost.vimeo => Uri.https('player.vimeo.com', '/video/$id', {
      'h': ?hash,
      'playsinline': '1',
      'autopause': '0',
    }),
    VideoHost.bunny => Uri.https(
      'iframe.mediadelivery.net',
      '/embed/$library/$id',
      {...query, 'autoplay': 'false', 'preload': 'true'},
    ),
    VideoHost.wistia => Uri.https('fast.wistia.net', '/embed/iframe/$id', {
      'playsinline': 'true',
      if (startSeconds > 0) 'time': '$startSeconds',
    }),
    VideoHost.dailymotion => Uri.https(
      'www.dailymotion.com',
      '/embed/video/$id',
      {'playsinline': '1', if (startSeconds > 0) 'start': '$startSeconds'},
    ),
    VideoHost.loom => Uri.https('www.loom.com', '/embed/$id', {
      if (startSeconds > 0) 't': '${startSeconds}s',
    }),
  };

  Uri _brandlessUrl(int startSeconds) => switch (host) {
    VideoHost.youtube => Uri.https('www.youtube.com', '/embed/$id', {
      'enablejsapi': '1',
      'controls': '0',
      'rel': '0',
      'iv_load_policy': '3',
      'disablekb': '1',
      'fs': '0',
      'playsinline': '1',
      'modestbranding': '1',
      'cc_load_policy': '0',
      'autoplay': '0',
      if (startSeconds > 0) 'start': '$startSeconds',
    }),
    VideoHost.vimeo => Uri.https('player.vimeo.com', '/video/$id', {
      'h': ?hash,
      'title': '0',
      'byline': '0',
      'portrait': '0',
      'badge': '0',
      'controls': '0',
      'dnt': '1',
      'transparent': '0',
      'pip': '0',
      'autopause': '0',
      'playsinline': '1',
      'keyboard': '0',
      'vimeo_logo': '0',
      'airplay': '0',
      'chromecast': '0',
      'watch_full_video': '0',
    }),
    VideoHost.bunny => Uri.https(
      'iframe.mediadelivery.net',
      '/embed/$library/$id',
      {
        ...query,
        'autoplay': 'false',
        'preload': 'true',
        'responsive': 'false',
        'loop': 'false',
      },
    ),
    VideoHost.wistia => Uri.https('fast.wistia.net', '/embed/iframe/$id', {
      'playsinline': 'true',
      'fullscreenButton': 'false',
      'copyLinkAndThumbnailEnabled': 'false',
      'doNotTrack': 'true',
      'seo': 'false',
      if (startSeconds > 0) 'time': '$startSeconds',
    }),
    VideoHost.dailymotion => Uri.https(
      'www.dailymotion.com',
      '/embed/video/$id',
      {
        'ui-logo': '0',
        'ui-start-screen-info': '0',
        'sharing-enable': '0',
        'queue-enable': '0',
        'queue-autoplay-next': '0',
        'endscreen-enable': '0',
        'playsinline': '1',
        if (startSeconds > 0) 'start': '$startSeconds',
      },
    ),
    VideoHost.loom => Uri.https('www.loom.com', '/embed/$id', {
      'hide_owner': 'true',
      'hide_share': 'true',
      'hide_title': 'true',
      'hideEmbedTopBar': 'true',
      if (startSeconds > 0) 't': '${startSeconds}s',
    }),
  };

  @override
  bool operator ==(Object other) =>
      other is HostedVideo &&
      other.host == host &&
      other.id == id &&
      other.hash == hash &&
      other.library == library;

  @override
  int get hashCode => Object.hash(host, id, hash, library);
}

String _bareHost(String host) {
  var h = host.toLowerCase();
  for (final prefix in const ['www.', 'm.', 'music.']) {
    if (h.startsWith(prefix)) h = h.substring(prefix.length);
  }
  return h;
}

/// 40 What a web view showing a video may load. The page itself is [page]
/// (the address it was loaded with) and nothing else may replace it: links,
/// `window.open` and `target="_blank"` from the player go nowhere, so a tap
/// never opens the video site, its app or a browser. Frames may load
/// anything but the video sites' own pages (only their players), and no
/// app links (`intent:`, `vnd.youtube:` and the like).
bool videoNavigationAllowed(Uri uri, bool mainFrame, {required Uri page}) {
  final scheme = uri.scheme.toLowerCase();
  if (scheme == 'about' || scheme == 'data' || scheme == 'blob') {
    return true;
  }
  if (scheme != 'https' && scheme != 'http') return false;
  if (mainFrame) {
    return uri.host.toLowerCase() == page.host.toLowerCase() &&
        uri.port == page.port &&
        (uri.path.isEmpty ? '/' : uri.path) ==
            (page.path.isEmpty ? '/' : page.path) &&
        uri.query == page.query;
  }
  return !isVideoSitePage(uri);
}

/// 40 A page on a video site other than its player: the watch page, the
/// channel, sign-in, sharing, the short links.
bool isVideoSitePage(Uri uri) {
  final host = _bareHost(uri.host);
  final path = uri.path;
  bool under(String domain) => host == domain || host.endsWith('.$domain');
  if (under('youtube.com') || under('youtube-nocookie.com')) {
    return !(host == 'youtube.com' || host == 'youtube-nocookie.com') ||
        !path.startsWith('/embed/');
  }
  if (host == 'youtu.be' || host == 'dai.ly' || host == 'wi.st') return true;
  if (under('vimeo.com')) {
    return !(host == 'player.vimeo.com' && path.startsWith('/video/'));
  }
  if (under('dailymotion.com')) {
    return !((host == 'dailymotion.com' && path.startsWith('/embed/')) ||
        (host == 'geo.dailymotion.com' && path.startsWith('/player')));
  }
  if (under('wistia.com') || under('wistia.net')) {
    return !(host.startsWith('fast.wistia.') && path.startsWith('/embed/'));
  }
  if (under('loom.com')) return !path.startsWith('/embed/');
  if (under('mediadelivery.net')) {
    return !(path.startsWith('/embed/') || path.startsWith('/play/'));
  }
  if (under('bunny.net')) return true;
  return false;
}
